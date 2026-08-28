// src/utils/calendario.js
import { toISO } from "./afazeres.js";

export const NOME_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Converte um hex ("#10b981" ou "#0b9") para "r, g, b", pra poder montar
// rgba(...) dinamicamente com a cor de cada cadeira (ex: no glow de datas
// importantes do calendário). Em caso de hex inválido, cai num cinza neutro.
export function hexParaRgb(hex) {
  if (!hex || typeof hex !== "string") return "148, 148, 158";
  let h = hex.trim().replace("#", "");
  if (h.length === 3) {
    h = h.split("").map((c) => c + c).join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return "148, 148, 158";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

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