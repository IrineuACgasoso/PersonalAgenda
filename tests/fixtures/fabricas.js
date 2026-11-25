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
  return { id: id("rot"), nome: "Academia", cor: "#10b981", horarios: [], ...overrides };
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

// Certificado: registro leve; o arquivo em si fica no Storage.
export function certificado(overrides = {}) {
  return {
    id: id("cert"),
    titulo: "Monitoria de Cálculo",
    cor: "#10b981",
    tags: [],
    arquivo: {
      caminho: "users/u1/certificados/x.pdf",
      url: "https://firebasestorage.googleapis.com/v0/b/b/o/x.pdf?alt=media",
      nome: "monitoria.pdf",
      tipo: "application/pdf",
      tamanho: 1024,
    },
    criadoEm: 1,
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

// Currículo completo, sem nenhum aviso na revisão. `secoes` troca módulos inteiros.
export function curriculo(secoes = {}) {
  return {
    dados: {
      nome: "Maria Conceição",
      cargo: "Estágio em Back-end",
      local: "Recife, PE",
      telefone: "(81) 99999-9999",
      email: "maria@example.com",
      linkedin: "linkedin.com/in/maria",
      github: "github.com/maria",
      site: "",
    },
    resumo: "Estudante de Ciência da Computação.",
    secoes: {
      formacao: [{ id: "f1", curso: "Ciência da Computação", instituicao: "UFPE", inicio: "2024-03", fim: "2028-12" }],
      experiencia: [
        { id: "e1", cargo: "Estágio", empresa: "Empresa", inicio: "2026-02", pontos: "Desenvolvi 12 rotas REST" },
      ],
      projetos: [
        { id: "p1", nome: "Agenda", link: "github.com/maria/agenda", tecnologias: "React", pontos: "Construí um PWA" },
        { id: "p2", nome: "Compilador", tecnologias: "C", pontos: "Implementei o analisador léxico" },
      ],
      habilidades: [{ id: "h1", grupo: "Linguagens", itens: "Python, Java" }],
      atividades: [{ id: "a1", papel: "Monitoria", organizacao: "CIn", inicio: "2025-03", pontos: "Atendi 60 alunos" }],
      certificacoes: [{ id: "c1", titulo: "AWS", emissor: "Amazon", data: "2026-05" }],
      idiomas: [
        { id: "i1", idioma: "Português", nivel: "Nativo" },
        { id: "i2", idioma: "Inglês", nivel: "Avançado", obs: "TOEFL 590" },
      ],
      ...secoes,
    },
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
