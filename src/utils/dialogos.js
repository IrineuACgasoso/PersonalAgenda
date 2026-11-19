// src/utils/dialogos.js
// Decisões puras dos diálogos próprios (#17) e dos avisos de gravação
// recusada (#44). O componente (`ui/Dialogos.jsx`) só desenha e resolve
// promises; tudo que dá para testar sem React fica aqui.

/**
 * Põe um diálogo no fim da fila. Um aviso igual a outro que já está na fila
 * (mesmo `chave`) não entra de novo: com o app "desatualizado", por exemplo,
 * cada clique seria recusado e empilharia o mesmo aviso N vezes.
 *
 * @returns {{ fila: object[], duplicado: object|null }} `duplicado` é o
 *   diálogo já existente que tornou este redundante (quem chamou pode
 *   resolver a promise junto com ele).
 */
export function enfileirarDialogo(fila, dialogo) {
  if (dialogo.chave) {
    const existente = fila.find((d) => d.chave === dialogo.chave);
    if (existente) return { fila, duplicado: existente };
  }
  return { fila: [...fila, dialogo], duplicado: null };
}

/** Tira o diálogo `id` da fila (o que estava aberto foi respondido). */
export function removerDialogo(fila, id) {
  return fila.filter((d) => d.id !== id);
}

/**
 * Texto do aviso quando o persist() recusa uma gravação (#44). `null` =
 * nada a avisar (gravou, ou não havia mudança).
 *
 * Antes a recusa só mudava a bolinha de status: o usuário excluía a última
 * cadeira, via ela sumir e voltar, e não sabia por quê.
 */
export function mensagemDeRecusa(motivo) {
  switch (motivo) {
    case "parece-vazio":
      return (
        "Essa alteração deixaria o app totalmente vazio e foi bloqueada pela proteção contra perda de dados " +
        "(ela existe para um erro nunca apagar tudo da nuvem). Nada foi alterado."
      );
    case "versao-futura":
      return (
        "Seus dados foram salvos por uma versão mais nova do app. Recarregue a página para atualizar " +
        "antes de editar — nada foi alterado."
      );
    case "carregando":
      return "Seus dados ainda estão carregando. Espere um instante e tente de novo.";
    default:
      return null;
  }
}

function plural(n, singular, pluralTexto) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

/**
 * Resumo de um backup para a lista de "Restaurar da nuvem" (ex.:
 * "5 cadeiras · 2 compromissos · 12 afazeres"). Ajuda a não restaurar um
 * backup vazio ou muito antigo por engano.
 */
export function resumoDoBackup(payload) {
  const tamanho = (lista) => (Array.isArray(lista) ? lista.length : 0);
  const partes = [
    plural(tamanho(payload?.cadeiras), "cadeira", "cadeiras"),
    plural(tamanho(payload?.compromissos), "compromisso", "compromissos"),
    plural(tamanho(payload?.afazeres), "afazer", "afazeres"),
  ];
  return partes.join(" · ");
}
