/* Utilidades para lidar com recorrência de afazeres. */

import { DIAS } from "../constants.js";

function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const ehISO = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

// Soma dias pelo calendário (não por milissegundos): nunca escorrega de
// dia numa virada de horário de verão.
function somarDias(date, dias) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + dias);
}

// Dias inteiros de a até b (b - a), pelo meio-dia.
function diasEntreDatas(a, b) {
  const x = new Date(a.getFullYear(), a.getMonth(), a.getDate(), 12);
  const y = new Date(b.getFullYear(), b.getMonth(), b.getDate(), 12);
  return Math.round((y - x) / 86400000);
}

// Passo em dias das repetições de intervalo fixo (mensal não tem passo fixo).
function passoEmDias(afazer, tipo) {
  if (tipo === "semanal") return 7;
  if (tipo === "quinzenal") return 15;
  if (tipo === "personalizada") return Math.max(1, Number(afazer.rotina?.intervaloDias) || 1);
  return 1; // diaria
}

// Data de fim da repetição (Fase 5): o último dia em que a regra ainda gera
// ocorrência. Substitui o antigo "número de repetições" (migração v5).
// Vazio = repete para sempre.
export function dataFimDaRotina(afazer) {
  const fim = afazer?.rotina?.dataFim;
  return ehISO(fim) ? fim : "";
}

/**
 * Dias "naturais" da regra de um afazer dentro de [inicioISO, fimISO]
 * (inclusivo), SEM olhar a data de fim nem as exceções de drag. É o que o
 * seletor de data de fim usa para mostrar só os dias possíveis.
 * - Sem repetição: a própria data (se houver).
 * - Dias específicos: os dias da semana marcados, a partir da data-base
 *   (opcional: sem ela, a regra vale em qualquer semana).
 * - Diária/semanal/15 dias/mensal/personalizada: a partir da data-base
 *   (obrigatória — sem ela não gera nada).
 */
export function datasDaRegra(afazer, inicioISO, fimISO) {
  if (!ehISO(inicioISO) || !ehISO(fimISO) || inicioISO > fimISO) return [];
  const tipo = afazer?.rotina?.tipo || "nenhuma";
  const base = ehISO(afazer?.data) ? afazer.data : "";
  const inicio = parseISO(inicioISO);
  const fim = parseISO(fimISO);
  const datas = [];

  if (tipo === "nenhuma") {
    if (base && base >= inicioISO && base <= fimISO) datas.push(base);
    return datas;
  }

  if (tipo === "dias_especificos") {
    const dias = Array.isArray(afazer.rotina?.diasSemana) ? afazer.rotina.diasSemana : [];
    if (dias.length === 0) return datas;
    let cursor = base && base > inicioISO ? parseISO(base) : inicio;
    while (cursor <= fim) {
      if (dias.includes((cursor.getDay() + 6) % 7)) datas.push(toISO(cursor));
      cursor = somarDias(cursor, 1);
    }
    return datas;
  }

  if (!base || base > fimISO) return datas;
  const dataBase = parseISO(base);

  // Mensal (#12): a n-ésima ocorrência é calculada a partir da data-base,
  // não da anterior, limitada ao último dia do mês (31/jan → 28/fev → 31/mar).
  if (tipo === "mensal") {
    const mesesAteInicio =
      (inicio.getFullYear() - dataBase.getFullYear()) * 12 + inicio.getMonth() - dataBase.getMonth();
    for (let n = Math.max(0, mesesAteInicio - 1); ; n++) {
      const d = mesmoDiaMesesDepois(dataBase, n);
      if (d > fim) break;
      if (d >= inicio) datas.push(toISO(d));
    }
    return datas;
  }

  // Intervalo fixo: pula direto para a primeira ocorrência da janela (sem
  // iterar desde uma data-base antiga).
  const passo = passoEmDias(afazer, tipo);
  const atraso = diasEntreDatas(dataBase, inicio);
  let cursor = atraso > 0 ? somarDias(dataBase, Math.ceil(atraso / passo) * passo) : dataBase;
  while (cursor <= fim) {
    datas.push(toISO(cursor));
    cursor = somarDias(cursor, passo);
  }
  return datas;
}

// A data cai num dia da regra? (valida a data de fim escolhida)
export function ehDataDaRegra(afazer, dataISO) {
  return datasDaRegra(afazer, dataISO, dataISO).length > 0;
}

/**
 * Gera as ocorrências de um afazer dentro do intervalo [inicioISO, fimISO]
 * (inclusivo), respeitando a data de fim da repetição.
 *
 * Retorna uma lista de objetos { data, dataOriginal }:
 * - `data` é o dia em que a ocorrência deve de fato aparecer no calendário
 *   (já considerando instâncias que o usuário arrastou para outro dia).
 * - `dataOriginal` é o dia "natural" da regra de recorrência (o que teria
 *   sido usado se a instância nunca tivesse sido movida). É essa chave que
 *   identifica a ocorrência de forma estável, mesmo depois de um drag.
 */
export function ocorrenciasNoIntervalo(afazer, inicioISO, fimISO) {
  const tipo = afazer.rotina?.tipo || "nenhuma";
  const fimDaRegra = tipo === "nenhuma" ? "" : dataFimDaRotina(afazer);
  const excecoes =
    afazer.excecoesData && typeof afazer.excecoesData === "object" && !Array.isArray(afazer.excecoesData)
      ? afazer.excecoesData
      : {};
  const resultado = [];

  // Instâncias que foram arrastadas para outro dia: entram no resultado pela
  // data de destino, independente de onde a data "natural" da regra caia —
  // é assim que uma ocorrência de quarta adiada pra quinta continua visível
  // mesmo que a regra em si não tenha mudado. Se a repetição terminou antes
  // da data natural (fim encurtado depois do drag), a ocorrência não existe mais.
  Object.entries(excecoes).forEach(([origem, destino]) => {
    if (!destino) return; // reservado para "instância removida", se algum dia precisar
    if (fimDaRegra && origem > fimDaRegra) return;
    if (destino >= inicioISO && destino <= fimISO) resultado.push({ data: destino, dataOriginal: origem });
  });

  const fimNaturais = fimDaRegra && fimDaRegra < fimISO ? fimDaRegra : fimISO;
  datasDaRegra(afazer, inicioISO, fimNaturais).forEach((d) => {
    // foi movida (ou removida) — não duplica na data natural
    if (Object.prototype.hasOwnProperty.call(excecoes, d)) return;
    resultado.push({ data: d, dataOriginal: d });
  });

  resultado.sort((a, b) => a.data.localeCompare(b.data));
  return resultado;
}

export function ehRotina(afazer) {
  return !!afazer?.rotina?.tipo && afazer.rotina.tipo !== "nenhuma";
}

// "Concluído" como um todo (aba Afazeres, "Apagar concluídos"): só afazeres
// comuns. Rotina nunca é concluída inteira — a conclusão é por ocorrência,
// em `datasConcluidas` (#11). Antes, o check da aba marcava `feito` na
// rotina e "Apagar concluídos" apagava a rotina toda. Um `feito: true`
// antigo numa rotina passa a ser ignorado.
export function afazerConcluido(afazer) {
  return !ehRotina(afazer) && !!afazer?.feito;
}

// Ocorrência a que o check da aba Afazeres se refere numa rotina (#11): a de
// hoje, se houver; senão, a próxima (procura até ~2 anos à frente). Devolve
// { data, dataOriginal, concluida } ou null (rotina sem ocorrências futuras).
// A conclusão é guardada pela `dataOriginal` (#14), igual ao calendário.
export function ocorrenciaAtual(afazer, hojeISO, diasAFrente = 731) {
  const fim = parseISO(hojeISO);
  fim.setDate(fim.getDate() + diasAFrente);
  const [primeira] = ocorrenciasNoIntervalo(afazer, hojeISO, toISO(fim));
  if (!primeira) return null;
  const concluidas = Array.isArray(afazer.datasConcluidas) ? afazer.datasConcluidas : [];
  return { ...primeira, concluida: concluidas.includes(primeira.dataOriginal) };
}

// Rotinas que só existem a partir de uma data-base (ocorrenciasNoIntervalo
// devolve [] sem ela). "Dias específicos" funciona sem data.
export const ROTINAS_COM_DATA_BASE = ["diaria", "semanal", "quinzenal", "mensal", "personalizada"];

// Data-base efetiva de um afazer no formulário/ao salvar (#40). Uma
// repetição dessas salva SEM data começa hoje (antes nunca aparecia no
// calendário). Sem repetição e sem data = afazer "sem data" (aparece em
// hoje até ser concluído); dias específicos sem data valem em toda semana.
export function dataAoSalvarAfazer({ rotinaTipo, data }, hojeISO) {
  if (ehISO(data)) return data;
  return ROTINAS_COM_DATA_BASE.includes(rotinaTipo) ? hojeISO : "";
}

// Rotina antiga gravada sem data-base (antes do #40): a lista avisa para
// editar e salvar de novo.
export function rotinaSemDataBase(afazer) {
  return ROTINAS_COM_DATA_BASE.includes(afazer?.rotina?.tipo) && !afazer.data;
}

// Mesmo dia do mês `meses` meses depois de `base`; se o mês de destino for
// mais curto, cai no último dia dele (dia 31 → 30/abr, 28 ou 29/fev).
export function mesmoDiaMesesDepois(base, meses) {
  const ano = base.getFullYear();
  const mes = base.getMonth() + meses;
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  return new Date(ano, mes, Math.min(base.getDate(), ultimoDia));
}

/* ---- Textos e seções da aba Afazeres (Fase 5) ---- */

const ddmm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

const ROTULO_REPETICAO = {
  diaria: "Todo dia",
  semanal: "Toda semana",
  quinzenal: "A cada 15 dias",
  mensal: "Todo mês",
};

// "Todo dia", "Seg, Qua, Sex", "A cada 3 dias"… (null = não se repete).
export function textoRepeticao(rotina) {
  const tipo = rotina?.tipo || "nenhuma";
  if (tipo === "nenhuma") return null;
  if (tipo === "personalizada") {
    const n = Math.max(1, Number(rotina.intervaloDias) || 1);
    return n === 1 ? "Todo dia" : `A cada ${n} dias`;
  }
  if (tipo === "dias_especificos") {
    const dias = Array.isArray(rotina.diasSemana) ? [...rotina.diasSemana].sort((a, b) => a - b) : [];
    if (dias.length === 7) return "Todo dia";
    return dias.length ? dias.map((d) => DIAS[d]).join(", ") : "Dias específicos";
  }
  return ROTULO_REPETICAO[tipo] || null;
}

// "até 30/11" / "para sempre" — complemento da repetição.
export function textoFimRepeticao(afazer) {
  const fim = dataFimDaRotina(afazer);
  return fim ? `até ${ddmm(fim)}` : "para sempre";
}

/**
 * Frase que explica, no formulário, como o afazer vai se comportar:
 * "Aparece hoje até você concluir." / "No dia 21/11." /
 * "Todo dia, a partir de 19/11, até 30/11." / "Seg, Qua, toda semana, para sempre."
 * `rascunho` = { data, rotina } já com a data-base efetiva.
 */
export function descreverAfazer(rascunho, hojeISO) {
  const repeticao = textoRepeticao(rascunho.rotina);
  const data = ehISO(rascunho.data) ? rascunho.data : "";
  if (!repeticao) {
    if (!data) return "Sem data: aparece em hoje no calendário até você concluir.";
    return data === hojeISO ? "Só hoje." : `Só no dia ${ddmm(data)}.`;
  }
  const desde = data ? (data === hojeISO ? "a partir de hoje" : `a partir de ${ddmm(data)}`) : "toda semana";
  return `${repeticao}, ${desde}, ${textoFimRepeticao(rascunho)}.`;
}

/**
 * Separa os afazeres nas seções da aba (Fase 5). Cada item: { afazer,
 * ocorrencia (só recorrentes), diasAtraso (só atrasados) }.
 * - atrasados: sem repetição, pendentes, com data antes de hoje (mais antigo primeiro)
 * - hoje / proximos: sem repetição, pendentes, data = hoje / depois de hoje
 * - semData: sem repetição, pendentes, sem data (aparecem em "hoje" no calendário)
 * - recorrentes: pela próxima ocorrência; os que já terminaram vão para o fim
 * - concluidos: sem repetição e feitos, os marcados mais recentemente primeiro
 * Dentro de cada grupo, empate = mais urgente primeiro.
 */
export function secoesDosAfazeres(afazeres, hojeISO) {
  const secoes = { atrasados: [], hoje: [], proximos: [], semData: [], recorrentes: [], concluidos: [] };
  (afazeres || []).forEach((afazer) => {
    if (ehRotina(afazer)) {
      secoes.recorrentes.push({ afazer, ocorrencia: ocorrenciaAtual(afazer, hojeISO) });
    } else if (afazer.feito) {
      secoes.concluidos.push({ afazer });
    } else if (!ehISO(afazer.data)) {
      secoes.semData.push({ afazer });
    } else if (afazer.data < hojeISO) {
      secoes.atrasados.push({ afazer, diasAtraso: diasEntreDatas(parseISO(afazer.data), parseISO(hojeISO)) });
    } else if (afazer.data === hojeISO) {
      secoes.hoje.push({ afazer });
    } else {
      secoes.proximos.push({ afazer });
    }
  });

  const urgencia = (a, b) => (b.afazer.urgencia || 1) - (a.afazer.urgencia || 1);
  const porData = (a, b) => a.afazer.data.localeCompare(b.afazer.data) || urgencia(a, b);
  secoes.atrasados.sort(porData);
  secoes.hoje.sort(urgencia);
  secoes.proximos.sort(porData);
  secoes.semData.sort(urgencia);
  secoes.recorrentes.sort((a, b) => {
    if (!a.ocorrencia !== !b.ocorrencia) return a.ocorrencia ? -1 : 1;
    if (a.ocorrencia && b.ocorrencia && a.ocorrencia.data !== b.ocorrencia.data) {
      return a.ocorrencia.data.localeCompare(b.ocorrencia.data);
    }
    return urgencia(a, b);
  });
  secoes.concluidos.sort((a, b) => (b.afazer.concluidoEm || 0) - (a.afazer.concluidoEm || 0));
  return secoes;
}

export { toISO, parseISO };
