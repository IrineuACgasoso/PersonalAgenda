// tests/fixtures/fabricas.js
// Construtores de dados de exemplo no formato real do AppData.
// Use os overrides para montar só o que o teste precisa.
//
// Calendário de referência — novembro/2026:
//   Seg: 2, 9, 16, 23, 30 · Qua: 4, 11, 18, 25 · Sex: 6, 13, 20, 27
//   01/11 é domingo. "Hoje" nos testes = 18/11/2026 (quarta).

let seq = 0;
const id = (prefixo) => `${prefixo}${++seq}`;

export function periodo(overrides = {}) {
  return { id: id("per"), nome: "2026.2", ...overrides };
}

export function horario(overrides = {}) {
  return { id: id("h"), dia: 0, inicio: "08:00", fim: "10:00", local: "", ...overrides };
}

export function cadeira(overrides = {}) {
  return {
    id: id("cad"),
    periodoId: "per-x",
    nome: "Cálculo II",
    cor: "#3b82f6",
    horarios: [],
    links: [],
    datas: [],
    ...overrides,
  };
}

// Rotina = bloco semanal com horários (era o "compromisso" até a v4).
export function rotina(overrides = {}) {
  return { id: id("rot"), periodoId: "per-x", nome: "Academia", cor: "#10b981", horarios: [], ...overrides };
}

// Compromisso pontual (v5): data + início (fim opcional).
export function compromisso(overrides = {}) {
  return {
    id: id("comp"),
    nome: "Dentista",
    cor: "#f59e0b",
    data: "2026-11-20",
    inicio: "14:00",
    feito: false,
    ...overrides,
  };
}

export function afazer(overrides = {}) {
  const { rotina, ...resto } = overrides;
  return {
    id: id("af"),
    nome: "Afazer",
    data: "",
    cor: "#221e1e",
    urgencia: 1,
    feito: false,
    datasConcluidas: [],
    excecoesData: {},
    rotina: { tipo: "nenhuma", intervaloDias: 1, dataFim: "", diasSemana: [], ...(rotina || {}) },
    ...resto,
  };
}

export function appData(overrides = {}) {
  const p = periodo({ id: "per-x" });
  return {
    periodos: [p],
    periodoAtivoId: p.id,
    cadeiras: [],
    rotinas: [],
    compromissos: [],
    afazeres: [],
    eventosConcluidos: [],
    eventosExcluidos: [],
    ...overrides,
  };
}

// Backup .json no formato antigo (antes de compromissos/rotinas/eventos* existirem).
export function backupAntigo() {
  return {
    periodos: [{ id: "a1", nome: "2025.2" }],
    periodoAtivoId: "a1",
    cadeiras: [{ id: "c1", periodoId: "a1", nome: "IP", cor: "#fff", horarios: [], links: [], datas: [] }],
    afazeres: [{ id: "f1", nome: "Velho", feito: false, rotina: { tipo: "semanal" } }],
  };
}
