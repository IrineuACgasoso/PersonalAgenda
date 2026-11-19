// src/utils/calendario.js
import { toISO } from "./afazeres.js";
import { formatarData } from "./formatarData.js";

export const NOME_MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

// Converte um hex ("#10b981" ou "#0b9") para "r, g, b", pra poder montar
// rgba(...) dinamicamente com a cor de cada cadeira (ex: no glow de datas
// importantes do calendário). Em caso de hex inválido, cai num cinza neutro.
export function hexParaRgb(hex) {
  if (!hex || typeof hex !== "string") return "148, 148, 158";
  let h = hex.trim().replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return "148, 148, 158";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

// Luminância relativa (WCAG) de "r, g, b" → 0 (preto) … 1 (branco).
function luminancia(r, g, b) {
  const canal = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

// Cores quase pretas somem no fundo escuro do app (#55: o padrão antigo do
// afazer, #221e1e, deixava o ponto do calendário e a faixa do item
// invisíveis). Abaixo do limite, mistura com branco até chegar num cinza
// médio, mantendo o matiz. Só para EXIBIÇÃO: a cor gravada não muda, e
// cores normais voltam exatamente como vieram (inclusive "#f00").
export const LUMINANCIA_MINIMA = 0.03;
const LUMINANCIA_ALVO = 0.12;
export function corVisivel(hex) {
  // Hex inválido (ou nem string): devolve como veio, sem mexer.
  if (typeof hex !== "string" || !/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex.trim())) return hex;
  const [r, g, b] = hexParaRgb(hex).split(", ").map(Number);
  if (luminancia(r, g, b) >= LUMINANCIA_MINIMA) return hex;
  const misturar = (v, t) => Math.round(v + (255 - v) * t);
  let t = 0;
  while (t < 1 && luminancia(misturar(r, t), misturar(g, t), misturar(b, t)) < LUMINANCIA_ALVO) t += 0.02;
  const paraHex = (v) => v.toString(16).padStart(2, "0");
  return `#${paraHex(misturar(r, t))}${paraHex(misturar(g, t))}${paraHex(misturar(b, t))}`;
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

// Vigência da cadeira (#19): `dataInicio`/`dataFim` opcionais, na própria
// cadeira ("YYYY-MM-DD"; vazio = sem limite daquele lado). Antes a vigência
// vinha do PERÍODO; a migração v4 (#20) copiou as datas do período para as
// cadeiras, então o período não entra mais nesta conta.
// Rotinas (#56, v6) usam os MESMOS campos e as mesmas funções: qualquer item
// com `dataInicio`/`dataFim` opcionais.
export function vigenciaDaCadeira(cadeira) {
  return { inicio: cadeira?.dataInicio || "", fim: cadeira?.dataFim || "" };
}

export function cadeiraEstaAtivaNaData(cadeira, dataISO) {
  const { inicio, fim } = vigenciaDaCadeira(cadeira);
  if (inicio && dataISO < inicio) return false;
  if (fim && dataISO > fim) return false;
  return true;
}

// Nomes genéricos para quem não é cadeira (rotinas).
export const vigenciaDe = vigenciaDaCadeira;
export const estaAtivoNaData = cadeiraEstaAtivaNaData;

// Texto curto da vigência para o card da cadeira ("" = sem limites).
export function textoVigencia(cadeira) {
  const { inicio, fim } = vigenciaDaCadeira(cadeira);
  if (inicio && fim) return `${formatarData(inicio)} – ${formatarData(fim)}`;
  if (inicio) return `A partir de ${formatarData(inicio)}`;
  if (fim) return `Até ${formatarData(fim)}`;
  return "";
}

// "YYYY-MM-DD" bem formado (o que o sanitizarDados aceita como vigência).
export function ehDataISO(valor) {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

// Data "completa" no <input type="date">: ao digitar o ano no desktop, o
// valor passa por 0002, 0020, 0202… antes de 2026 — não gravar esses.
export function dataCompleta(valor) {
  return ehDataISO(valor) && Number(valor.slice(0, 4)) >= 1900;
}

// Valida a vigência digitada no drawer. Devolve a mensagem de erro ou null.
export function erroDeVigencia(inicio, fim) {
  if (inicio && fim && fim < inicio) return "A data de fim não pode ser antes da data de início.";
  return null;
}

// Vigência sugerida para uma cadeira NOVA do período: a da última cadeira
// do mesmo período que tem alguma data. Mantém o comportamento de antes do
// #20 (cadeira nova já nascia com a duração do período) sem precisar de
// campo no período. Sem nenhuma referência ⇒ sem limites.
export function vigenciaPadraoParaNovaCadeira(cadeiras = [], periodoId) {
  const referencia = [...cadeiras].reverse().find((c) => c?.periodoId === periodoId && (c.dataInicio || c.dataFim));
  const patch = {};
  if (referencia?.dataInicio) patch.dataInicio = referencia.dataInicio;
  if (referencia?.dataFim) patch.dataFim = referencia.dataFim;
  return patch;
}
