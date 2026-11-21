// src/utils/agendaSemanal.js
// Grade da Agenda da semana (VisaoAgenda). Funções puras.
import { HORA_FIM, HORA_INICIO } from "../constants.js";

// Com poucas horas a grade ficaria com blocos gigantes; abaixo disso ela
// cresce para os lados (primeiro para o fim do dia).
export const MIN_HORAS_GRADE = 8;

function horaDecimal(hhmm) {
  const casou = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? "").trim());
  return casou ? Number(casou[1]) + Number(casou[2]) / 60 : NaN;
}

/**
 * Faixa de horas mostrada: só do primeiro início ao último fim (em horas
 * cheias), dentro de 06h–23h. Antes eram sempre as 17 horas, e no celular
 * deitado (grade girada) isso dava ~19px por hora; cortando as manhãs e
 * noites vazias, os blocos ficam maiores sem deformar a semana.
 * Sem blocos (ou horários inválidos) ⇒ 06h–23h.
 */
export function faixaDeHoras(blocos) {
  let ini = Infinity;
  let fim = -Infinity;
  for (const b of blocos || []) {
    const i = horaDecimal(b.inicio);
    const f = horaDecimal(b.fim);
    if (Number.isFinite(i)) ini = Math.min(ini, i);
    if (Number.isFinite(f)) fim = Math.max(fim, f);
  }
  if (!Number.isFinite(ini) || !Number.isFinite(fim)) return { inicio: HORA_INICIO, fim: HORA_FIM };
  let inicio = Math.max(HORA_INICIO, Math.min(HORA_FIM - 1, Math.floor(ini)));
  let final = Math.min(HORA_FIM, Math.max(inicio + 1, Math.ceil(fim)));
  const falta = Math.min(MIN_HORAS_GRADE, HORA_FIM - HORA_INICIO) - (final - inicio);
  if (falta > 0) {
    const depois = Math.min(falta, HORA_FIM - final);
    final += depois;
    inicio -= falta - depois;
  }
  return { inicio, fim: final };
}

/** Posição vertical (0–100%) de "HH:MM" numa grade de `inicio` a `fim` horas. */
export function percentualNaGrade(hhmm, inicio, fim) {
  const frac = (horaDecimal(hhmm) - inicio) / (fim - inicio);
  return Number.isFinite(frac) ? Math.max(0, Math.min(1, frac)) * 100 : 0;
}
