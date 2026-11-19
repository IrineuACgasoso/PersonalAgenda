// Grade do mês, vigência e helpers: src/utils/calendario.js + formatarData.js
import { describe, it, expect } from "vitest";
import { gerarCelulasMes, getIntervaloMes, cadeiraEstaAtivaNaData, hexParaRgb } from "../../src/utils/calendario.js";
import { formatarData } from "../../src/utils/formatarData.js";
import { cadeira, periodo } from "../fixtures/fabricas.js";

describe("gerarCelulasMes", () => {
  it("novembro/2026 começa na segunda com 6 dias de outubro e fecha a semana com dezembro", () => {
    const c = gerarCelulasMes(2026, 10);
    expect(c.length % 7).toBe(0);
    expect(c.length).toBe(42);
    expect(c[0]).toEqual({ dia: 26, ano: 2026, mes: 9, foraDoMes: true });
    expect(c[6]).toEqual({ dia: 1, ano: 2026, mes: 10, foraDoMes: false });
    expect(c.at(-1)).toEqual({ dia: 6, ano: 2026, mes: 11, foraDoMes: true });
    expect(c.filter((x) => !x.foraDoMes)).toHaveLength(30);
  });
  it("vira o ano corretamente (dezembro → janeiro)", () => {
    const c = gerarCelulasMes(2026, 11);
    expect(c.at(-1).ano).toBe(2027);
    expect(c.at(-1).mes).toBe(0);
  });
  it("mês que começa na segunda não tem células do mês anterior", () => {
    expect(gerarCelulasMes(2026, 5)[0]).toMatchObject({ dia: 1, foraDoMes: false }); // 01/06/2026 = seg
  });
});

describe("getIntervaloMes", () => {
  it("fevereiro de ano não bissexto", () => {
    expect(getIntervaloMes(2026, 1)).toMatchObject({ inicioISO: "2026-02-01", fimISO: "2026-02-28" });
  });
  it("fevereiro bissexto", () => {
    expect(getIntervaloMes(2028, 1).fimISO).toBe("2028-02-29");
  });
});

describe("cadeiraEstaAtivaNaData", () => {
  const p = periodo({ id: "p", dataInicio: "2026-08-01", dataFim: "2026-12-15" });
  const c = cadeira({ periodoId: "p" });
  it("dentro da vigência do período", () => expect(cadeiraEstaAtivaNaData(c, "2026-11-18", [p])).toBe(true));
  it("limites são inclusivos", () => {
    expect(cadeiraEstaAtivaNaData(c, "2026-08-01", [p])).toBe(true);
    expect(cadeiraEstaAtivaNaData(c, "2026-12-15", [p])).toBe(true);
  });
  it("fora da vigência", () => {
    expect(cadeiraEstaAtivaNaData(c, "2026-07-31", [p])).toBe(false);
    expect(cadeiraEstaAtivaNaData(c, "2026-12-16", [p])).toBe(false);
  });
  it("período sem datas = sempre ativa", () => {
    expect(cadeiraEstaAtivaNaData(c, "1999-01-01", [periodo({ id: "p" })])).toBe(true);
  });
  it("período inexistente = sempre ativa", () => expect(cadeiraEstaAtivaNaData(c, "2026-11-18", [])).toBe(true));
});

describe("hexParaRgb", () => {
  it("hex de 6 e de 3 dígitos", () => {
    expect(hexParaRgb("#10b981")).toBe("16, 185, 129");
    expect(hexParaRgb("#fff")).toBe("255, 255, 255");
  });
  it("inválido cai no cinza neutro", () => {
    expect(hexParaRgb("azul")).toBe("148, 148, 158");
    expect(hexParaRgb(undefined)).toBe("148, 148, 158");
  });
});

describe("formatarData", () => {
  it("ISO → DD/MM/AAAA", () => expect(formatarData("2026-11-18")).toBe("18/11/2026"));
  it("vazio → string vazia", () => expect(formatarData("")).toBe(""));
});
