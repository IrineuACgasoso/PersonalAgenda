// src/utils/migracoes.js
//
// Versionamento do schema do AppData. Toda mudança ESTRUTURAL nos dados
// (renomear campo, mover dados de um lugar pra outro, trocar formato de
// chave) precisa de uma migração aqui — não basta mudar o código, porque o
// documento no Firestore e os backups .json antigos continuam no formato
// velho.
//
// COMO ADICIONAR UMA MIGRAÇÃO:
//   1. Incremente VERSAO_ATUAL.
//   2. Adicione MIGRACOES[nova] = (dados na versão anterior) => dados novos.
//      - Função PURA: nunca mutar a entrada; devolva objetos novos.
//      - Deve tolerar campos ausentes (backups antigos são incompletos);
//        o sanitizarDados roda DEPOIS e completa os padrões.
//   3. Teste em tests/unit/migracoes.test.js (entrada antiga → saída nova).
//
// Campos que só ganham um valor padrão NÃO precisam de migração: basta
// registrá-los no sanitizarDados.

export const VERSAO_ATUAL = 3;

export const MIGRACOES = {
  // v0 → v1: baseline. Todos os dados anteriores a 2026-11 (sem `versao`)
  // já estão no formato v1; a migração só passa a marcar a versão.
  1: (dados) => ({ ...dados }),

  // v1 → v2 (#10): chaves de evento por id em vez de nome/título.
  //   aulas|ISO|nomeCadeira|inicio        → aulas|ISO|idCadeira|idHorario
  //   compromissos|ISO|nome|inicio        → compromissos|ISO|idCompromisso|idHorario
  //   avaliacoes|ISO|titulo|hora          → avaliacoes|idCadeira|idAvaliacao
  // Chaves de afazeres já usavam id e passam intactas.
  2: (dados) => ({
    ...dados,
    eventosConcluidos: converterChavesV1(dados.eventosConcluidos, dados),
    eventosExcluidos: converterChavesV1(dados.eventosExcluidos, dados),
  }),

  // v2 → v3 (#14): ocorrências de afazer passam a ser identificadas pela
  // data NATURAL (a origem em `excecoesData`), não pela data para onde
  // foram arrastadas. Vale para `datasConcluidas` e para as chaves
  // "afazeres|id|data" de eventosExcluidos. Para não mudar nada do que
  // aparece na tela, a data de destino é MANTIDA e a origem é adicionada
  // (antes, a marca no destino valia para tudo que caía naquele dia).
  3: (dados) => {
    const porId = new Map(objetos(dados.afazeres).map((a) => [a.id, a]));
    return {
      ...dados,
      afazeres: Array.isArray(dados.afazeres)
        ? dados.afazeres.map((a) => {
            if (!a || typeof a !== "object" || !Array.isArray(a.datasConcluidas)) return a;
            const extras = a.datasConcluidas.flatMap((d) => origensMovidasPara(a, d));
            return extras.length ? { ...a, datasConcluidas: [...new Set([...a.datasConcluidas, ...extras])] } : a;
          })
        : dados.afazeres,
      eventosExcluidos: Array.isArray(dados.eventosExcluidos)
        ? [
            ...new Set(
              dados.eventosExcluidos.flatMap((chave) => {
                const partes = typeof chave === "string" ? chave.split("|") : [];
                if (partes[0] !== "afazeres" || partes.length !== 3) return [chave];
                const [, id, data] = partes;
                return [chave, ...origensMovidasPara(porId.get(id), data).map((o) => `afazeres|${id}|${o}`)];
              })
            ),
          ]
        : dados.eventosExcluidos,
    };
  },
};

/* ---- v2 → v3 ---- */

// Datas naturais (origens) das ocorrências que foram arrastadas para `data`.
function origensMovidasPara(afazer, data) {
  const excecoes = afazer?.excecoesData;
  if (!excecoes || typeof excecoes !== "object" || Array.isArray(excecoes)) return [];
  return Object.entries(excecoes)
    .filter(([origem, destino]) => destino === data && origem !== data)
    .map(([origem]) => origem);
}

/* ---- v1 → v2 ----
 * O formato das chaves está copiado AQUI de propósito (e não importado de
 * projecao.js): a migração precisa produzir sempre o formato v2, mesmo que
 * o código da projeção mude no futuro (aí entra uma migração v3). */

const objetos = (lista) =>
  Array.isArray(lista) ? lista.filter((x) => x && typeof x === "object") : [];
const idHorarioV2 = (h) => h.id || `@${h.inicio || ""}`;
const idAvaliacaoV2 = (d) => d.id || `@${d.data}|${d.hora || ""}|${d.titulo}`;

// 0 = Segunda … 6 = Domingo, a partir de "YYYY-MM-DD" (data local).
function diaDaSemanaV1(iso) {
  const [a, m, d] = String(iso).split("-").map(Number);
  const data = new Date(a, m - 1, d);
  return Number.isNaN(data.getTime()) ? -1 : (data.getDay() + 6) % 7;
}

// Uma chave antiga pode virar várias novas: com nomes repetidos, a chave por
// nome valia para TODAS as cadeiras com aquele nome — mantemos esse efeito
// para não "desmarcar" nada. Chaves que não batem com item nenhum (item já
// apagado/renomeado) não funcionavam mais e são descartadas (#52).
function converterChaveV1(chave, dados) {
  if (typeof chave !== "string") return [chave];
  const partes = chave.split("|");
  const tipo = partes[0];
  if (!["aulas", "compromissos", "avaliacoes"].includes(tipo) || partes.length < 4) {
    return [chave];
  }
  const iso = partes[1];
  // O nome/título pode conter "|": tudo entre a data e o último campo.
  const nome = partes.slice(2, -1).join("|");
  const ultimo = partes[partes.length - 1];

  if (tipo === "avaliacoes") {
    return objetos(dados.cadeiras).flatMap((c) =>
      objetos(c.datas)
        .filter((d) => d.data === iso && d.titulo === nome && (d.hora || "") === ultimo)
        .map((d) => `avaliacoes|${c.id}|${idAvaliacaoV2(d)}`)
    );
  }

  const dia = diaDaSemanaV1(iso);
  const donos = objetos(tipo === "aulas" ? dados.cadeiras : dados.compromissos);
  return donos
    .filter((c) => c.nome === nome)
    .flatMap((c) =>
      objetos(c.horarios)
        .filter((h) => h.dia === dia && (h.inicio || "") === ultimo)
        .map((h) => `${tipo}|${iso}|${c.id}|${idHorarioV2(h)}`)
    );
}

function converterChavesV1(lista, dados) {
  if (!Array.isArray(lista)) return lista;
  return [...new Set(lista.flatMap((chave) => converterChaveV1(chave, dados)))];
}

// Versão declarada nos dados. Ausente/inválida = 0 (dados pré-versionamento).
export function versaoDos(dados) {
  const v = dados?.versao;
  return Number.isInteger(v) && v >= 0 ? v : 0;
}

// Dados gravados por uma versão MAIS NOVA do app (ex: outro aparelho já
// atualizou e este ainda roda o PWA antigo em cache). Esta versão não sabe
// interpretá-los, então NÃO pode gravar por cima — ver persist() em
// usePersistedData.js.
export function ehVersaoFutura(dados) {
  return versaoDos(dados) > VERSAO_ATUAL;
}

// Leva os dados de qualquer versão antiga até VERSAO_ATUAL, aplicando as
// migrações em sequência. Dados de versão futura são devolvidos intactos.
export function migrarDados(dados) {
  if (!dados || typeof dados !== "object") return dados;
  let versao = versaoDos(dados);
  if (versao >= VERSAO_ATUAL) return dados;

  let atual = dados;
  while (versao < VERSAO_ATUAL) {
    const migrar = MIGRACOES[versao + 1];
    if (typeof migrar !== "function") {
      throw new Error(`Migração ausente para a versão ${versao + 1} do schema.`);
    }
    versao += 1;
    atual = { ...migrar(atual), versao };
  }
  return atual;
}
