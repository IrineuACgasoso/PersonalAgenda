// Recorrência de afazeres: src/utils/afazeres.js
import { describe, it, expect } from "vitest";
import { ocorrenciasNoIntervalo, toISO, parseISO } from "../../src/utils/afazeres.js";
import { afazer } from "../fixtures/fabricas.js";

const datas = (af, ini = "2026-11-01", fim = "2026-11-30") =>
  ocorrenciasNoIntervalo(af, ini, fim).map((o) => o.data);

describe("toISO / parseISO", () => {
  it("ida e volta sem deslocar fuso", () => {
    expect(toISO(parseISO("2026-11-18"))).toBe("2026-11-18");
    expect(toISO(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("ocorrenciasNoIntervalo — sem rotina", () => {
  it("afazer com data dentro da janela aparece uma vez", () => {
    expect(datas(afazer({ data: "2026-11-10" }))).toEqual(["2026-11-10"]);
  });
  it("afazer com data fora da janela não aparece", () => {
    expect(datas(afazer({ data: "2026-12-01" }))).toEqual([]);
  });
  it("afazer sem data não gera ocorrência (é tratado em projecao.js)", () => {
    expect(datas(afazer())).toEqual([]);
  });
});

describe("ocorrenciasNoIntervalo — rotinas com data-base", () => {
  it("diária", () => {
    const r = datas(afazer({ data: "2026-11-28", rotina: { tipo: "diaria" } }));
    expect(r).toEqual(["2026-11-28", "2026-11-29", "2026-11-30"]);
  });
  it("semanal começando antes da janela (fast-forward)", () => {
    const r = datas(afazer({ data: "2026-01-07", rotina: { tipo: "semanal" } })); // quarta
    expect(r).toEqual(["2026-11-04", "2026-11-11", "2026-11-18", "2026-11-25"]);
  });
  it("quinzenal (15 dias)", () => {
    expect(datas(afazer({ data: "2026-11-01", rotina: { tipo: "quinzenal" } }))).toEqual(["2026-11-01", "2026-11-16"]);
  });
  it("personalizada a cada 10 dias", () => {
    const r = datas(afazer({ data: "2026-11-01", rotina: { tipo: "personalizada", intervaloDias: 10 } }));
    expect(r).toEqual(["2026-11-01", "2026-11-11", "2026-11-21"]);
  });
  it("mensal em dia comum mantém o dia", () => {
    const r = datas(afazer({ data: "2026-01-15", rotina: { tipo: "mensal" } }), "2026-01-01", "2026-04-30");
    expect(r).toEqual(["2026-01-15", "2026-02-15", "2026-03-15", "2026-04-15"]);
  });
  it("limite de repetições é respeitado", () => {
    const r = datas(afazer({ data: "2026-11-02", rotina: { tipo: "diaria", totalRepeticoes: 3 } }));
    expect(r).toEqual(["2026-11-02", "2026-11-03", "2026-11-04"]);
  });
  it("limite contado desde a data-base, mesmo com janela posterior", () => {
    const r = datas(afazer({ data: "2026-10-01", rotina: { tipo: "semanal", totalRepeticoes: 3 } }));
    expect(r).toEqual([]);
  });
  it("rotina sem data-base (exceto dias específicos) não gera nada", () => {
    expect(datas(afazer({ rotina: { tipo: "semanal" } }))).toEqual([]);
  });
  it("data-base depois da janela não gera nada", () => {
    expect(datas(afazer({ data: "2026-12-05", rotina: { tipo: "diaria" } }))).toEqual([]);
  });

  // BUG CONHECIDO (todo.md): dia 31 "escorrega" e pula meses
  // (hoje gera 31/jan → 03/mar → 01/mai; fevereiro e abril somem).
  // Quando for corrigido, este teste passa a falhar: troque it.fails por it.
  it.fails("mensal no dia 31 cai no último dia dos meses curtos", () => {
    const r = datas(afazer({ data: "2026-01-31", rotina: { tipo: "mensal" } }), "2026-01-01", "2026-04-30");
    expect(r).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });
});

describe("ocorrenciasNoIntervalo — dias específicos", () => {
  it("sem data-base: projeta em toda a janela (Seg/Qua)", () => {
    const r = datas(afazer({ rotina: { tipo: "dias_especificos", diasSemana: [0, 2] } }), "2026-11-01", "2026-11-12");
    expect(r).toEqual(["2026-11-02", "2026-11-04", "2026-11-09", "2026-11-11"]);
  });
  it("com data-base: só a partir dela", () => {
    const r = datas(afazer({ data: "2026-11-10", rotina: { tipo: "dias_especificos", diasSemana: [0, 2] } }), "2026-11-01", "2026-11-17");
    expect(r).toEqual(["2026-11-11", "2026-11-16"]);
  });
  it("com data-base e limite de repetições", () => {
    const r = datas(afazer({ data: "2026-11-01", rotina: { tipo: "dias_especificos", diasSemana: [4], totalRepeticoes: 2 } }));
    expect(r).toEqual(["2026-11-06", "2026-11-13"]);
  });
  it("lista de dias vazia não gera nada", () => {
    expect(datas(afazer({ rotina: { tipo: "dias_especificos", diasSemana: [] } }))).toEqual([]);
  });
});

describe("ocorrenciasNoIntervalo — exceções (drag de uma ocorrência)", () => {
  const rotina = { tipo: "dias_especificos", diasSemana: [2] }; // quartas

  it("ocorrência movida aparece no destino e some da origem", () => {
    const af = afazer({ rotina, excecoesData: { "2026-11-11": "2026-11-12" } });
    const r = ocorrenciasNoIntervalo(af, "2026-11-01", "2026-11-30");
    expect(r.map((o) => o.data)).toEqual(["2026-11-04", "2026-11-12", "2026-11-18", "2026-11-25"]);
    expect(r.find((o) => o.data === "2026-11-12").dataOriginal).toBe("2026-11-11");
  });
  it("destino fora da janela não aparece, origem continua escondida", () => {
    const af = afazer({ rotina, excecoesData: { "2026-11-25": "2026-12-02" } });
    expect(datas(af)).toEqual(["2026-11-04", "2026-11-11", "2026-11-18"]);
  });
  it("vale também para rotinas com data-base (semanal)", () => {
    const af = afazer({ data: "2026-11-02", rotina: { tipo: "semanal" }, excecoesData: { "2026-11-09": "2026-11-10" } });
    expect(datas(af)).toEqual(["2026-11-02", "2026-11-10", "2026-11-16", "2026-11-23", "2026-11-30"]);
  });
  it("afazer avulso não duplica quando há exceção apontando para ele", () => {
    const af = afazer({ data: "2026-11-05", excecoesData: { "2026-11-05": "2026-11-06" } });
    expect(datas(af)).toEqual(["2026-11-06"]);
  });
});
