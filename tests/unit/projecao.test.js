// O que aparece em cada dia do calendário geral: src/utils/projecao.js
import { describe, it, expect } from "vitest";
import { projetarEventos, compararEventosDoDia } from "../../src/utils/projecao.js";
import { cadeira, compromisso, afazer, horario, periodo } from "../fixtures/fabricas.js";

const NOV = { inicioISO: "2026-11-01", fimISO: "2026-11-30", hojeISO: "2026-11-18" };
const titulos = (mapa, dia) => (mapa[dia] || []).map((e) => e.titulo);

describe("aulas", () => {
  const c = cadeira({ id: "c1", periodoId: "p", nome: "IP", horarios: [horario({ dia: 0, inicio: "08:00" })] });

  it("aparecem só no dia da semana do horário (segundas de novembro)", () => {
    const m = projetarEventos({ ...NOV, cadeiras: [c], periodos: [periodo({ id: "p" })] });
    const dias = Object.keys(m).filter((d) => m[d].some((e) => e.tipo === "aulas"));
    expect(dias).toEqual(["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"]);
  });

  it("respeitam a vigência do período", () => {
    const p = periodo({ id: "p", dataFim: "2026-11-10" });
    const m = projetarEventos({ ...NOV, cadeiras: [c], periodos: [p] });
    expect(titulos(m, "2026-11-09")).toEqual(["IP"]);
    expect(titulos(m, "2026-11-16")).toEqual([]);
  });

  it("ocorrência excluída some só naquele dia", () => {
    const m = projetarEventos({ ...NOV, cadeiras: [c], periodos: [], eventosExcluidos: ["aulas|2026-11-09|IP|08:00"] });
    expect(titulos(m, "2026-11-09")).toEqual([]);
    expect(titulos(m, "2026-11-16")).toEqual(["IP"]);
  });

  it("filtro desligado remove as aulas", () => {
    const m = projetarEventos({ ...NOV, cadeiras: [c], filtros: { aulas: false, avaliacoes: true, compromissos: true, afazeres: true } });
    expect(titulos(m, "2026-11-02")).toEqual([]);
  });
});

describe("avaliações", () => {
  it("aparecem na data, com a cor da cadeira", () => {
    const c = cadeira({ nome: "IP", cor: "#f00", datas: [{ id: "d", titulo: "Prova 1", data: "2026-11-20", hora: "10:00" }] });
    const [ev] = projetarEventos({ ...NOV, cadeiras: [c] })["2026-11-20"];
    expect(ev).toMatchObject({ tipo: "avaliacoes", titulo: "Prova 1", cor: "#f00", origem: "IP" });
  });
});

describe("compromissos", () => {
  it("projetados semanalmente", () => {
    const comp = compromisso({ nome: "Academia", horarios: [horario({ dia: 4, inicio: "18:00" })] });
    const m = projetarEventos({ ...NOV, compromissos: [comp] });
    expect(titulos(m, "2026-11-06")).toEqual(["Academia"]);
    expect(titulos(m, "2026-11-07")).toEqual([]);
  });
});

describe("afazeres", () => {
  it("sem data e pendente aparece em 'hoje'", () => {
    const m = projetarEventos({ ...NOV, afazeres: [afazer({ nome: "Ler" })] });
    expect(titulos(m, "2026-11-18")).toEqual(["Ler"]);
    expect(m["2026-11-18"][0].semData).toBe(true);
  });
  it("sem data e concluído não aparece", () => {
    expect(projetarEventos({ ...NOV, afazeres: [afazer({ feito: true })] })).toEqual({});
  });
  it("sem data não aparece se 'hoje' está fora da janela", () => {
    expect(projetarEventos({ ...NOV, hojeISO: "2026-12-01", afazeres: [afazer()] })).toEqual({});
  });
  it("rotina de dias específicos sem data não duplica em 'hoje'", () => {
    const af = afazer({ nome: "Treino", rotina: { tipo: "dias_especificos", diasSemana: [2] } });
    expect(titulos(projetarEventos({ ...NOV, afazeres: [af] }), "2026-11-18")).toEqual(["Treino"]);
  });
  it("conclusão por ocorrência em rotina", () => {
    const af = afazer({ rotina: { tipo: "dias_especificos", diasSemana: [2] }, datasConcluidas: ["2026-11-11"] });
    const m = projetarEventos({ ...NOV, afazeres: [af] });
    expect(m["2026-11-11"][0].feito).toBe(true);
    expect(m["2026-11-18"][0].feito).toBe(false);
  });
  it("chave estável usada para excluir instância", () => {
    const af = afazer({ id: "a1", data: "2026-11-05" });
    const m = projetarEventos({ ...NOV, afazeres: [af], eventosExcluidos: ["afazeres|a1|2026-11-05"] });
    expect(m["2026-11-05"]).toBeUndefined();
  });
});

describe("ordenação dentro do dia", () => {
  it("com hora primeiro (por hora), depois urgência, com-data antes de sem-data", () => {
    const evs = [
      { tipo: "afazeres", titulo: "semdata-alta", urgencia: 3, semData: true },
      { tipo: "afazeres", titulo: "media", urgencia: 2 },
      { tipo: "aulas", titulo: "10h", hora: "10:00" },
      { tipo: "afazeres", titulo: "alta", urgencia: 3 },
      { tipo: "aulas", titulo: "08h", hora: "08:00" },
    ];
    expect([...evs].sort(compararEventosDoDia).map((e) => e.titulo)).toEqual(["08h", "10h", "alta", "semdata-alta", "media"]);
  });
});
