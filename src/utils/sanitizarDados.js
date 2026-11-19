// src/utils/sanitizarDados.js
//
// Fonte única de verdade para sanitização de dados persistidos.
// Antes existiam DUAS versões desta função (uma aqui, sem uso em nenhum
// lugar do app, e outra duplicada dentro de usePersistedData.js). Isso é
// perigoso: qualquer novo código que importasse "a errada" perderia a
// proteção contra dados ausentes/corrompidos. Agora só existe esta.
//
// Ordem: primeiro migra o schema (utils/migracoes.js) até a versão atual,
// depois completa/normaliza os campos.

import { VERSAO_ATUAL, migrarDados, versaoDos } from "./migracoes.js";
import { ehDataISO } from "./calendario.js";
import { LEMBRETES_PADRAO, sanitizarListaLembretes, sanitizarPreferenciasLembretes } from "./lembretes.js";

export const DADOS_PADRAO = {
  versao: VERSAO_ATUAL,
  periodos: [{ id: "p1", nome: "2026.1" }],
  cadeiras: [],
  rotinas: [],
  compromissos: [],
  afazeres: [],
  eventosConcluidos: [],
  eventosExcluidos: [],
  periodoAtivoId: "p1",
  // Padrões dos lembretes (#23): minutos de antecedência. Opcional no doc
  // (sem migração nem Rules): ausente ⇒ estes valores.
  lembretes: LEMBRETES_PADRAO,
};

// Mantém só os itens que são objetos de verdade. Um `null`/string perdido
// numa lista (backup editado à mão, dado corrompido) quebraria qualquer
// `.map((x) => x.id)` da UI; descartar o lixo é melhor que travar a tela.
function listaDeObjetos(valor) {
  return Array.isArray(valor) ? valor.filter((item) => item && typeof item === "object" && !Array.isArray(item)) : [];
}

// Cadeiras e rotinas: a UI acessa `c.horarios.length`, `c.links.map`
// etc. sem checar, então as listas internas precisam existir sempre. Um
// backup antigo/incompleto sem `links` derrubava a VisaoCadeiras inteira.
// ATENÇÃO: lista interna nova numa cadeira/rotina ⇒ registrar aqui.
function sanitizarCadeira(c) {
  return {
    ...c,
    horarios: listaDeObjetos(c.horarios),
    links: listaDeObjetos(c.links),
    // Avaliações: `lembretes` opcional por item (#23); ausente = padrão global.
    datas: listaDeObjetos(c.datas).map((d) => ({ ...d, lembretes: sanitizarListaLembretes(d.lembretes) })),
    // Vigência própria (#19), opcional: só "YYYY-MM-DD" válido sobrevive
    // (undefined é removido por removerUndefined; "" = sem limite).
    dataInicio: ehDataISO(c.dataInicio) ? c.dataInicio : undefined,
    dataFim: ehDataISO(c.dataFim) ? c.dataFim : undefined,
  };
}

// Rotina (ex-"compromisso" semanal, v5): lista de horários + vigência
// opcional (#56, v6 — não pertence mais a período). Mesmas regras da
// vigência da cadeira: só "YYYY-MM-DD" válido sobrevive.
function sanitizarRotina(r) {
  return {
    ...r,
    horarios: listaDeObjetos(r.horarios),
    dataInicio: ehDataISO(r.dataInicio) ? r.dataInicio : undefined,
    dataFim: ehDataISO(r.dataFim) ? r.dataFim : undefined,
  };
}

const HORA = /^\d{2}:\d{2}$/;

// Compromisso pontual (v5): data e início são obrigatórios na UI; aqui só
// garantimos os tipos (lixo vira "" e o fim inválido some).
function sanitizarCompromisso(c) {
  return {
    ...c,
    data: ehDataISO(c.data) ? c.data : "",
    inicio: HORA.test(c.inicio) ? c.inicio : "",
    fim: HORA.test(c.fim) ? c.fim : undefined,
    feito: !!c.feito,
    // Lembretes (#23): lista de minutos de antecedência; ausente = padrão
    // global, [] = sem lembrete.
    lembretes: sanitizarListaLembretes(c.lembretes),
  };
}

// Remove (em profundidade) propriedades `undefined` e itens `undefined` de
// listas (#43). O Firestore REJEITA um `setDoc` com qualquer campo
// `undefined` — e como o valor continuava no estado, TODA gravação seguinte
// também falhava ("Erro ao salvar" permanente). Ex.: desmarcar um afazer
// antigo sem `concluidoEm` gravava `concluidoEm: undefined`.
// Só percorre objetos simples e arrays: o AppData é JSON puro.
export function removerUndefined(valor) {
  if (Array.isArray(valor)) {
    return valor.filter((item) => item !== undefined).map(removerUndefined);
  }
  if (valor && typeof valor === "object") {
    const proto = Object.getPrototypeOf(valor);
    if (proto !== Object.prototype && proto !== null) return valor;
    const limpo = {};
    for (const [chave, v] of Object.entries(valor)) {
      if (v !== undefined) limpo[chave] = removerUndefined(v);
    }
    return limpo;
  }
  return valor;
}

export function sanitizarDados(entrada) {
  if (!entrada || typeof entrada !== "object") return { ...DADOS_PADRAO };

  return removerUndefined(normalizar(migrarDados(entrada)));
}

function normalizar(raw) {
  return {
    ...DADOS_PADRAO,
    ...raw,
    // Atual após a migração; se os dados vierem de uma versão FUTURA do
    // app, mantém a versão deles (nunca "rebaixa").
    versao: versaoDos(raw),
    periodos: Array.isArray(raw.periodos) && raw.periodos.length > 0 ? raw.periodos : DADOS_PADRAO.periodos,
    cadeiras: listaDeObjetos(raw.cadeiras).map(sanitizarCadeira),
    rotinas: listaDeObjetos(raw.rotinas).map(sanitizarRotina),
    compromissos: listaDeObjetos(raw.compromissos).map(sanitizarCompromisso),
    lembretes: sanitizarPreferenciasLembretes(raw.lembretes),
    eventosConcluidos: Array.isArray(raw.eventosConcluidos) ? raw.eventosConcluidos : [],
    eventosExcluidos: Array.isArray(raw.eventosExcluidos) ? raw.eventosExcluidos : [],
    afazeres: Array.isArray(raw.afazeres)
      ? listaDeObjetos(raw.afazeres).map((a) => ({
          ...a,
          feito: !!a.feito,
          datasConcluidas: Array.isArray(a.datasConcluidas) ? a.datasConcluidas : [],
          // instâncias movidas individualmente (drag de uma ocorrência de
          // rotina pra outro dia). Mesma lição do bug do diasSemana: como
          // não está listado aqui manualmente, sumiria a cada persist().
          excecoesData:
            a.excecoesData && typeof a.excecoesData === "object" && !Array.isArray(a.excecoesData)
              ? a.excecoesData
              : {},
          rotina: {
            tipo: a.rotina?.tipo || "nenhuma",
            intervaloDias: a.rotina?.intervaloDias || 1,
            // Fim da repetição (v5, substitui `totalRepeticoes`): "" = para sempre.
            dataFim: ehDataISO(a.rotina?.dataFim) ? a.rotina.dataFim : "",
            // ATENÇÃO: qualquer campo novo de rotina precisa ser listado aqui
            // manualmente, senão ele é apagado silenciosamente a cada save
            // (foi exatamente isso que quebrou a rotina "Dias específicos" —
            // o array `diasSemana` não estava nesta lista e sumia no primeiro
            // persist() depois de criar o afazer).
            diasSemana: Array.isArray(a.rotina?.diasSemana) ? a.rotina.diasSemana : [],
          },
        }))
      : [],
  };
}

// Considera os dados "vazios/insignificantes" (equivalentes ao estado
// padrão de um app novo). Usado como trava extra: nunca sobrescrevemos um
// documento remoto que tenha conteúdo real com algo que sanitiza para isso.
export function pareceVazio(dados) {
  if (!dados) return true;
  const semCadeiras = !dados.cadeiras || dados.cadeiras.length === 0;
  const semRotinas = !dados.rotinas || dados.rotinas.length === 0;
  const semCompromissos = !dados.compromissos || dados.compromissos.length === 0;
  const semAfazeres = !dados.afazeres || dados.afazeres.length === 0;
  const periodosPadrao =
    !dados.periodos || dados.periodos.length === 0 || (dados.periodos.length === 1 && dados.periodos[0]?.id === "p1");
  return semCadeiras && semRotinas && semCompromissos && semAfazeres && periodosPadrao;
}
