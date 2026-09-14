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

// Cada célula: { dia, ano, mes, foraDoMes }. Preenche o início/fim da grade
// com os dias reais dos meses vizinhos (em vez de células vazias/null), para
// o calendário nunca ter "buracos" — clicar numa célula fora do mês navega
// automaticamente para o mês correspondente (ver VisaoGeral.jsx).
export function gerarCelulasMes(ano, mes) {
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const offset = (primeiroDia.getDay() + 6) % 7;
  const total = ultimoDia.getDate();

  const celulas = [];

  const mesAnteriorUltimoDia = new Date(ano, mes, 0).getDate();
  for (let i = offset - 1; i >= 0; i--) {
    const dia = mesAnteriorUltimoDia - i;
    const data = new Date(ano, mes - 1, dia);
    celulas.push({ dia, ano: data.getFullYear(), mes: data.getMonth(), foraDoMes: true });
  }

  for (let dia = 1; dia <= total; dia++) {
    celulas.push({ dia, ano, mes, foraDoMes: false });
  }

  const restante = (7 - (celulas.length % 7)) % 7;
  for (let dia = 1; dia <= restante; dia++) {
    const data = new Date(ano, mes + 1, dia);
    celulas.push({ dia, ano: data.getFullYear(), mes: data.getMonth(), foraDoMes: true });
  }

  return celulas;
}

export function cadeiraEstaAtivaNaData(cadeira, dataISO, periodos = []) {
  const periodo = periodos.find((p) => p.id === cadeira.periodoId);
  if (!periodo) return true;
  if (periodo.dataInicio && dataISO < periodo.dataInicio) return false;
  if (periodo.dataFim && dataISO > periodo.dataFim) return false;
  return true;
}