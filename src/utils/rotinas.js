// src/utils/rotinas.js
//
// Resumo de uma rotina (ex-"compromisso" semanal, Fase 5) para o card e o
// drawer: dias da semana ativos, próxima ocorrência e horas por semana.
// PURO (recebe "agora" de fora) para ser testável.

import { chaveRotina } from "./projecao.js";
import { proximoHorarioSemanal } from "./cadeiras.js";
import { toISO, parseISO } from "./afazeres.js";
import { vigenciaDe, estaAtivoNaData } from "./calendario.js";

const minutosDe = (hhmm) => {
  const [h, m] = String(hhmm || "")
    .split(":")
    .map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

// Dias (0 = Seg … 6 = Dom) em que a rotina tem pelo menos um horário.
export function diasAtivosDaRotina(rotina) {
  return new Set((rotina?.horarios || []).filter((h) => h && Number.isInteger(h.dia)).map((h) => h.dia));
}

// Soma da duração de todos os horários, em minutos (horário inválido = 0).
export function minutosPorSemana(rotina) {
  return (rotina?.horarios || []).reduce((total, h) => {
    const ini = minutosDe(h?.inicio);
    const fim = minutosDe(h?.fim);
    return ini !== null && fim !== null && fim > ini ? total + (fim - ini) : total;
  }, 0);
}

// 270 → "4h30", 120 → "2h", 45 → "45min", 0 → "0h".
export function textoDuracao(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return m ? `${m}min` : "0h";
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

// Próxima ocorrência (ou a em andamento), dentro da vigência (#56) e
// pulando as removidas da agenda.
export function proximaOcorrenciaRotina(rotina, agora = new Date(), eventosExcluidos = []) {
  const excluidos = new Set(eventosExcluidos);
  const { inicio, fim } = vigenciaDe(rotina);
  return proximoHorarioSemanal(rotina?.horarios, agora, {
    inicio,
    fim,
    excluida: (dataISO, h) => excluidos.has(chaveRotina(dataISO, rotina, h)),
  });
}

// Rotina cuja data de fim já passou (o card mostra "Encerrada").
export function rotinaEncerrada(rotina, hojeISO) {
  const { fim } = vigenciaDe(rotina);
  return !!fim && fim < hojeISO;
}

// Horários da rotina que valem na SEMANA de `hojeISO` (seg–dom) — a agenda
// semanal é uma grade sem datas, então cada horário é checado na data do
// seu dia da semana nesta semana (#56: vigência própria da rotina).
export function horariosNaSemana(rotina, hojeISO) {
  const hoje = parseISO(hojeISO);
  const segunda = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - ((hoje.getDay() + 6) % 7));
  const dataDoDia = (dia) => toISO(new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + dia));
  return (rotina?.horarios || []).filter(
    (h) => h && Number.isInteger(h.dia) && estaAtivoNaData(rotina, dataDoDia(h.dia)),
  );
}
