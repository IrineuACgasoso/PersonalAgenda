// src/utils/calendario.js
import { toISO } from "./afazeres.js";

export const NOME_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function getIntervaloMes(ano, mes) {
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  return {
    primeiroDia,
    ultimoDia,
    inicioISO: toISO(primeiroDia),
    fimISO: toISO(ultimoDia),
  };
}

export function gerarCelulasMes(ano, mes) {
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const offset = (primeiroDia.getDay() + 6) % 7;
  const total = ultimoDia.getDate();

  const dias = [];
  for (let i = 0; i < offset; i++) dias.push(null);
  for (let dia = 1; dia <= total; dia++) dias.push(dia);
  return dias;
}

export function cadeiraEstaAtivaNaData(cadeira, dataISO, periodos = []) {
  const periodo = periodos.find((p) => p.id === cadeira.periodoId);
  if (!periodo) return true;
  if (periodo.dataInicio && dataISO < periodo.dataInicio) return false;
  if (periodo.dataFim && dataISO > periodo.dataFim) return false;
  return true;
}