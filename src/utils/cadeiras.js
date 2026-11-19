// src/utils/cadeiras.js
//
// Resumo de uma cadeira para o card e o cabeçalho do drawer (#21): próxima
// aula, próxima avaliação e progresso da vigência. Tudo PURO (recebe "agora"
// e "hoje" de fora) para ser testável; os componentes só formatam.

import { DIAS } from "../constants.js";
import { toISO, parseISO } from "./afazeres.js";
import { cadeiraEstaAtivaNaData, vigenciaDaCadeira } from "./calendario.js";
import { chaveAula } from "./projecao.js";

const MS_DIA = 24 * 60 * 60 * 1000;

// Dias inteiros entre duas datas "YYYY-MM-DD" (b - a). Pelo meio-dia, para
// não errar na virada do horário de verão (Recife não tem, mas o teste roda
// em qualquer fuso).
export function diasEntre(aISO, bISO) {
  const a = parseISO(aISO);
  const b = parseISO(bISO);
  a.setHours(12, 0, 0, 0);
  b.setHours(12, 0, 0, 0);
  return Math.round((b - a) / MS_DIA);
}

const horaDe = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/**
 * Próxima aula a partir de `agora` (Date), dentro da vigência e pulando as
 * ocorrências removidas da agenda (`eventosExcluidos`). Uma aula em
 * andamento (início ≤ agora < fim) conta, com `emAndamento: true`.
 * Devolve { data, horario, emAndamento } ou null (sem horários, ou a
 * vigência já acabou).
 */
export function proximaAula(cadeira, agora = new Date(), eventosExcluidos = []) {
  const horarios = (cadeira?.horarios || []).filter((h) => h && h.inicio);
  if (horarios.length === 0) return null;
  const excluidos = new Set(eventosExcluidos);
  const hojeISO = toISO(agora);
  const horaAgora = horaDe(agora);
  const { inicio, fim } = vigenciaDaCadeira(cadeira);

  // Começa hoje (ou no início da vigência, se ainda não começou) e procura
  // por 8 semanas: cobre semanas inteiras de aulas removidas (feriado, greve).
  const partida = parseISO(inicio && inicio > hojeISO ? inicio : hojeISO);
  for (let i = 0; i < 7 * 8; i++) {
    const dia = new Date(partida);
    dia.setDate(partida.getDate() + i);
    const dataISO = toISO(dia);
    if (fim && dataISO > fim) return null;
    const diaSemana = (dia.getDay() + 6) % 7;
    const doDia = horarios
      .filter((h) => h.dia === diaSemana)
      .filter((h) => !excluidos.has(chaveAula(dataISO, cadeira, h)))
      // Hoje: só as que ainda não terminaram.
      .filter((h) => dataISO !== hojeISO || (h.fim || h.inicio) > horaAgora)
      .sort((a, b) => a.inicio.localeCompare(b.inicio));
    if (doDia.length > 0) {
      const horario = doDia[0];
      return { data: dataISO, horario, emAndamento: dataISO === hojeISO && horario.inicio <= horaAgora };
    }
  }
  return null;
}

/**
 * Próxima avaliação (datas importantes) de hoje em diante, dentro da
 * vigência. Devolve { avaliacao, dias } (dias = 0 hoje, 1 amanhã…) ou null.
 */
export function proximaAvaliacao(cadeira, hojeISO) {
  const futuras = (cadeira?.datas || [])
    .filter((d) => d && d.data && d.data >= hojeISO && cadeiraEstaAtivaNaData(cadeira, d.data))
    .sort((a, b) => a.data.localeCompare(b.data) || (a.hora || "").localeCompare(b.hora || ""));
  if (futuras.length === 0) return null;
  return { avaliacao: futuras[0], dias: diasEntre(hojeISO, futuras[0].data) };
}

/**
 * Quanto da vigência já passou (0 a 1). Só existe com início E fim.
 * Antes do início = 0; depois do fim = 1.
 */
export function progressoVigencia(cadeira, hojeISO) {
  const { inicio, fim } = vigenciaDaCadeira(cadeira);
  if (!inicio || !fim || fim < inicio) return null;
  const total = diasEntre(inicio, fim);
  if (total <= 0) return hojeISO >= inicio ? 1 : 0;
  return Math.min(1, Math.max(0, diasEntre(inicio, hojeISO) / total));
}

// "hoje" / "amanhã" / "em 8d" — rótulo curto de quanto falta.
export function rotuloDias(dias) {
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  return `em ${dias}d`;
}

// Texto da próxima aula: "agora", "hoje 10:00", "amanhã 08:00", "Qua 10:00"
// (até 6 dias) ou "12/12 10:00" (mais longe), + " · local".
export function textoProximaAula(prox, hojeISO) {
  if (!prox) return "";
  const { data, horario, emAndamento } = prox;
  const dias = diasEntre(hojeISO, data);
  let quando;
  if (emAndamento) quando = `agora (até ${horario.fim})`;
  else if (dias === 0) quando = `hoje ${horario.inicio}`;
  else if (dias === 1) quando = `amanhã ${horario.inicio}`;
  else if (dias < 7) quando = `${DIAS[(parseISO(data).getDay() + 6) % 7]} ${horario.inicio}`;
  else quando = `${data.slice(8, 10)}/${data.slice(5, 7)} ${horario.inicio}`;
  return horario.local ? `${quando} · ${horario.local}` : quando;
}

// Texto da próxima avaliação: "P2 · 27/11 (em 8d)".
export function textoProximaAvaliacao(prox) {
  if (!prox) return "";
  const { avaliacao, dias } = prox;
  const data = `${avaliacao.data.slice(8, 10)}/${avaliacao.data.slice(5, 7)}`;
  return `${avaliacao.titulo} · ${data} (${rotuloDias(dias)})`;
}
