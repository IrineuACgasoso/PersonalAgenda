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

export const VERSAO_ATUAL = 6;

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
              }),
            ),
          ]
        : dados.eventosExcluidos,
    };
  },

  // v3 → v4 (#19/#20): a vigência sai do PERÍODO e vai para cada CADEIRA.
  // Cada cadeira herda `dataInicio`/`dataFim` do seu período (campo a
  // campo, sem sobrescrever o que ela já tiver) e o período perde as datas
  // — a UI de "Duração do período" foi removida e a vigência passou a ser
  // só da cadeira (utils/calendario.js → cadeiraEstaAtivaNaData). Assim o
  // calendário mostra exatamente as mesmas aulas/avaliações de antes.
  4: (dados) => {
    const periodos = Array.isArray(dados.periodos) ? dados.periodos : null;
    const porId = new Map(objetos(periodos).map((p) => [p.id, p]));
    return {
      ...dados,
      cadeiras: Array.isArray(dados.cadeiras)
        ? dados.cadeiras.map((c) => {
            if (!c || typeof c !== "object") return c;
            const p = porId.get(c.periodoId);
            const novo = { ...c };
            if (!novo.dataInicio && p?.dataInicio) novo.dataInicio = p.dataInicio;
            if (!novo.dataFim && p?.dataFim) novo.dataFim = p.dataFim;
            return novo;
          })
        : dados.cadeiras,
      periodos: periodos
        ? periodos.map((p) => {
            if (!p || typeof p !== "object" || !("dataInicio" in p || "dataFim" in p)) return p;
            return Object.fromEntries(Object.entries(p).filter(([k]) => k !== "dataInicio" && k !== "dataFim"));
          })
        : dados.periodos,
    };
  },

  // v4 → v5 (Fase 5, #22): três tipos de item na agenda.
  //  - Os "compromissos" semanais (com horários) viram `rotinas`, e as
  //    chaves "compromissos|ISO|id|idHorario" viram "rotinas|ISO|id|idHorario".
  //  - `compromissos` passa a ser a lista de eventos PONTUAIS com data e hora.
  //    Os afazeres SEM repetição que tinham data + hora viram compromissos
  //    (mesmo id, nome, cor, data, hora → início, feito/concluidoEm).
  //  - Afazer não tem mais hora: os que sobram perdem o campo `hora`.
  //  - "Número de repetições" (`rotina.totalRepeticoes`) vira data de fim
  //    (`rotina.dataFim` = dia da última ocorrência). Sem como calcular (sem
  //    data-base), a repetição fica sem fim — que era o efeito antes.
  5: (dados) => {
    const afazeres = Array.isArray(dados.afazeres) ? dados.afazeres : null;
    const viramCompromisso = (afazeres || []).filter(afazerViraCompromissoV5);
    return {
      ...dados,
      rotinas: [
        ...(Array.isArray(dados.rotinas) ? dados.rotinas : []),
        ...(Array.isArray(dados.compromissos) ? dados.compromissos : []),
      ],
      compromissos: viramCompromisso.map(afazerParaCompromissoV5),
      afazeres: afazeres ? afazeres.filter((a) => !afazerViraCompromissoV5(a)).map(afazerV5) : dados.afazeres,
      eventosConcluidos: renomearChavesV5(dados.eventosConcluidos),
      eventosExcluidos: renomearChavesV5(dados.eventosExcluidos),
    };
  },

  // v5 → v6 (#56): a rotina deixa de pertencer a um período. Ela perde
  // `periodoId` e ganha `dataInicio`/`dataFim` opcionais (vigência própria,
  // como a cadeira). Decisão do usuário: a rotina HERDA a vigência do seu
  // período = menor início e maior fim entre as cadeiras daquele período
  // que têm a data. Sem isso, as rotinas de períodos antigos (que ficavam
  // escondidas quando o período não estava ativo) reapareceriam para sempre.
  // Período sem datas (ou datas incoerentes) ⇒ rotina sem limites.
  6: (dados) => {
    if (!Array.isArray(dados.rotinas)) return { ...dados };
    const cadeiras = objetos(dados.cadeiras);
    return {
      ...dados,
      rotinas: dados.rotinas.map((r) => {
        if (!r || typeof r !== "object") return r;
        const novo = Object.fromEntries(Object.entries(r).filter(([k]) => k !== "periodoId"));
        if (r.periodoId === undefined || r.periodoId === null) return novo;
        const doPeriodo = cadeiras.filter((c) => c.periodoId === r.periodoId);
        const inicios = doPeriodo
          .map((c) => c.dataInicio)
          .filter(ehISOV5)
          .sort();
        const fins = doPeriodo
          .map((c) => c.dataFim)
          .filter(ehISOV5)
          .sort();
        const inicio = inicios[0] || "";
        const fim = fins[fins.length - 1] || "";
        if (inicio && fim && fim < inicio) return novo;
        if (!ehISOV5(novo.dataInicio) && inicio) novo.dataInicio = inicio;
        if (!ehISOV5(novo.dataFim) && fim) novo.dataFim = fim;
        return novo;
      }),
    };
  },
};

/* ---- v4 → v5 ----
 * Regras de recorrência copiadas AQUI (e não importadas de afazeres.js) pelo
 * mesmo motivo das chaves v2: a migração tem que reproduzir o comportamento
 * do "número de repetições" da v4, que não existe mais no código atual. */

const ISO_V5 = /^\d{4}-\d{2}-\d{2}$/;
const HORA_V5 = /^\d{2}:\d{2}$/;
const ehISOV5 = (v) => typeof v === "string" && ISO_V5.test(v);
const isoParaDataV5 = (iso) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d);
};
const dataParaIsoV5 = (dt) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;

function afazerViraCompromissoV5(a) {
  if (!a || typeof a !== "object") return false;
  const tipo = a.rotina?.tipo || "nenhuma";
  return tipo === "nenhuma" && ehISOV5(a.data) && typeof a.hora === "string" && HORA_V5.test(a.hora);
}

function afazerParaCompromissoV5(a) {
  const c = {
    id: a.id,
    nome: a.nome || "Compromisso",
    cor: a.cor || "#8b5cf6",
    data: a.data,
    inicio: a.hora,
    feito: !!a.feito,
  };
  if (a.concluidoEm) c.concluidoEm = a.concluidoEm;
  return c;
}

function afazerV5(a) {
  if (!a || typeof a !== "object") return a;
  const semHora = Object.fromEntries(Object.entries(a).filter(([k]) => k !== "hora"));
  const rotina = semHora.rotina;
  if (!rotina || typeof rotina !== "object") return semHora;
  const novaRotina = Object.fromEntries(Object.entries(rotina).filter(([k]) => k !== "totalRepeticoes"));
  const n = Number(rotina.totalRepeticoes);
  if (Number.isInteger(n) && n > 0 && !ehISOV5(rotina.dataFim)) {
    const fim = ultimaOcorrenciaV4(semHora, n);
    if (fim) novaRotina.dataFim = fim;
  }
  return { ...semHora, rotina: novaRotina };
}

// Dia da n-ésima (última) ocorrência na regra da v4, contada da data-base.
function ultimaOcorrenciaV4(afazer, n) {
  const tipo = afazer.rotina?.tipo || "nenhuma";
  if (!ehISOV5(afazer.data)) return ""; // v4: sem data-base o limite era ignorado
  const base = isoParaDataV5(afazer.data);
  const somar = (dias) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + dias);
  if (tipo === "diaria") return dataParaIsoV5(somar(n - 1));
  if (tipo === "semanal") return dataParaIsoV5(somar(7 * (n - 1)));
  if (tipo === "quinzenal") return dataParaIsoV5(somar(15 * (n - 1)));
  if (tipo === "personalizada") {
    const passo = Math.max(1, Number(afazer.rotina?.intervaloDias) || 1);
    return dataParaIsoV5(somar(passo * (n - 1)));
  }
  if (tipo === "mensal") {
    const mes = base.getMonth() + n - 1;
    const ultimoDia = new Date(base.getFullYear(), mes + 1, 0).getDate();
    return dataParaIsoV5(new Date(base.getFullYear(), mes, Math.min(base.getDate(), ultimoDia)));
  }
  if (tipo === "dias_especificos") {
    const dias = Array.isArray(afazer.rotina?.diasSemana) ? afazer.rotina.diasSemana : [];
    if (dias.length === 0) return "";
    let contador = 0;
    for (let i = 0; i < 3000; i++) {
      const d = somar(i);
      if (dias.includes((d.getDay() + 6) % 7) && ++contador === n) return dataParaIsoV5(d);
    }
  }
  return "";
}

function renomearChavesV5(lista) {
  if (!Array.isArray(lista)) return lista;
  return lista.map((chave) =>
    typeof chave === "string" && chave.startsWith("compromissos|") ? `rotinas|${chave.slice(13)}` : chave,
  );
}

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

const objetos = (lista) => (Array.isArray(lista) ? lista.filter((x) => x && typeof x === "object") : []);
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
        .map((d) => `avaliacoes|${c.id}|${idAvaliacaoV2(d)}`),
    );
  }

  const dia = diaDaSemanaV1(iso);
  const donos = objetos(tipo === "aulas" ? dados.cadeiras : dados.compromissos);
  return donos
    .filter((c) => c.nome === nome)
    .flatMap((c) =>
      objetos(c.horarios)
        .filter((h) => h.dia === dia && (h.inicio || "") === ultimo)
        .map((h) => `${tipo}|${iso}|${c.id}|${idHorarioV2(h)}`),
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
