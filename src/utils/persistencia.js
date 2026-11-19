// src/utils/persistencia.js
// Decisões puras do persist() (usePersistedData.js), separadas do hook para
// serem testáveis sem Firebase/React.
import { sanitizarDados, pareceVazio } from "./sanitizarDados";
import { ehVersaoFutura } from "./migracoes";

/**
 * Decide o que o persist() vai gravar.
 *
 * `entrada` pode ser:
 *  - uma função `(atual) => novo` (forma preferida): recebe SEMPRE o estado
 *    mais recente, inclusive o de um persist() feito no mesmo tick. É isso que
 *    evita a race do #6 — com o `data` do closure, duas ações seguidas (ex:
 *    blur do nome + clique em "Adicionar") faziam a segunda gravar por cima da
 *    primeira com o estado velho.
 *  - um objeto com os dados completos (importar/restaurar backup).
 *
 * Se a função devolver o próprio `atual` (ou null/undefined), não há o que
 * gravar: evita um setDoc do documento inteiro à toa.
 *
 * @returns {{ ok: boolean, motivo: string|null, dados?: object }}
 *   motivo: null | "sem-mudanca" | "versao-futura" | "parece-vazio"
 */
export function resolverGravacao(atual, entrada) {
  const novo = typeof entrada === "function" ? entrada(atual) : entrada;
  if (novo == null || novo === atual) return { ok: true, motivo: "sem-mudanca" };

  // Esta versão do app não entende dados de schema mais novo: gravar por
  // cima destruiria campos/formatos que ela desconhece.
  if (ehVersaoFutura(atual) || ehVersaoFutura(novo)) return { ok: false, motivo: "versao-futura" };

  const dados = sanitizarDados(novo);

  // Nunca gravamos algo que sanitiza para "vazio" por cima de um estado que
  // claramente tinha conteúdo — isso indicaria bug no chamador (ex: limpou o
  // state sem querer) em vez de uma ação real do usuário.
  if (pareceVazio(dados) && !pareceVazio(atual)) return { ok: false, motivo: "parece-vazio" };

  return { ok: true, motivo: null, dados };
}

/**
 * Status a mostrar para um snapshot do onSnapshot (#39).
 *
 * Toda escrita local dispara um snapshot com `fromCache=false` mas
 * `hasPendingWrites=true` — o servidor ainda NÃO confirmou. Só dá para dizer
 * "sincronizado" quando as duas flags estão falsas.
 *
 * @returns {{ status: "offline"|"saving"|"saved", sincronizado: boolean }}
 */
export function statusDoSnapshot(metadata, online) {
  if (metadata.fromCache) return { status: "offline", sincronizado: false };
  if (metadata.hasPendingWrites) return { status: online ? "saving" : "offline", sincronizado: false };
  return { status: "saved", sincronizado: true };
}

/**
 * Despachante das gravações do persist() (#54).
 *
 * Cada `enviar(gravar)` chama `gravar()` NA HORA — não espera a gravação
 * anterior terminar. Antes havia uma fila que só mandava o próximo `setDoc`
 * depois do anterior resolver; offline, o `setDoc` só resolve quando o
 * servidor confirma, então da 2ª edição em diante tudo ficava preso na
 * memória e era perdido se o app fechasse sem rede. Chamando na hora, cada
 * escrita entra logo na fila persistente do próprio Firestore (IndexedDB),
 * que sobrevive a reload e já garante a ordem: as escritas de um cliente são
 * aplicadas no servidor na mesma ordem em que foram feitas.
 *
 * A promise de cada envio serve só para status/contagem:
 *  - `pendentes`: quantos envios ainda não terminaram (o onSnapshot é
 *    ignorado enquanto > 0 — o estado local está à frente do snapshot);
 *  - `ultima`: true só para o envio mais recente — só ele decide o status
 *    mostrado na tela, para uma resposta antiga não sobrescrever a nova.
 *
 * Nunca rejeita: devolve `{ ok, erro, ultima }`.
 */
export function criarDespachante() {
  let versao = 0;
  let pendentes = 0;
  return {
    get pendentes() {
      return pendentes;
    },
    enviar(gravar) {
      const minha = ++versao;
      pendentes += 1;
      let promessa;
      try {
        promessa = Promise.resolve(gravar());
      } catch (erro) {
        // ex: localStorage cheio (deslogado) lança de forma síncrona
        promessa = Promise.reject(erro);
      }
      return promessa
        .then(
          () => ({ ok: true, erro: null }),
          (erro) => ({ ok: false, erro }),
        )
        .then((r) => {
          pendentes -= 1;
          return { ...r, ultima: minha === versao };
        });
    },
  };
}
