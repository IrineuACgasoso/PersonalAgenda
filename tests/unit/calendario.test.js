// Grade do mês, vigência e helpers: src/utils/calendario.js + formatarData.js
import { describe, it, expect } from "vitest";
import {
  gerarCelulasMes,
  getIntervaloMes,
  cadeiraEstaAtivaNaData,
  hexParaRgb,
  erroDeVigencia,
  dataCompleta,
  ehDataISO,
  textoVigencia,
  vigenciaPadraoParaNovaCadeira,
  corVisivel,
} from "../../src/utils/calendario.js";
import { formatarData } from "../../src/utils/formatarData.js";
import { cadeira } from "../fixtures/fabricas.js";

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

describe("cadeiraEstaAtivaNaData (vigência da própria cadeira, #19)", () => {
  const c = cadeira({ dataInicio: "2026-08-01", dataFim: "2026-12-15" });
  it("dentro da vigência", () => expect(cadeiraEstaAtivaNaData(c, "2026-11-18")).toBe(true));
  it("limites são inclusivos", () => {
    expect(cadeiraEstaAtivaNaData(c, "2026-08-01")).toBe(true);
    expect(cadeiraEstaAtivaNaData(c, "2026-12-15")).toBe(true);
  });
  it("fora da vigência", () => {
    expect(cadeiraEstaAtivaNaData(c, "2026-07-31")).toBe(false);
    expect(cadeiraEstaAtivaNaData(c, "2026-12-16")).toBe(false);
  });
  it("só início ou só fim limita um lado", () => {
    expect(cadeiraEstaAtivaNaData(cadeira({ dataInicio: "2026-08-01" }), "2030-01-01")).toBe(true);
    expect(cadeiraEstaAtivaNaData(cadeira({ dataInicio: "2026-08-01" }), "2026-07-01")).toBe(false);
    expect(cadeiraEstaAtivaNaData(cadeira({ dataFim: "2026-12-15" }), "1999-01-01")).toBe(true);
  });
  it("sem datas = sempre ativa", () => {
    expect(cadeiraEstaAtivaNaData(cadeira(), "1999-01-01")).toBe(true);
    expect(cadeiraEstaAtivaNaData(cadeira({ dataInicio: "", dataFim: "" }), "1999-01-01")).toBe(true);
  });
});

describe("validação e texto da vigência (#19)", () => {
  it("fim antes do início é erro; igual ou só um lado, não", () => {
    expect(erroDeVigencia("2026-08-01", "2026-07-31")).toMatch(/antes/);
    expect(erroDeVigencia("2026-08-01", "2026-08-01")).toBeNull();
    expect(erroDeVigencia("2026-08-01", "")).toBeNull();
    expect(erroDeVigencia("", "")).toBeNull();
  });
  it("dataCompleta ignora os anos intermediários ao digitar no desktop", () => {
    expect(dataCompleta("0202-03-01")).toBe(false);
    expect(dataCompleta("2026-03-01")).toBe(true);
    expect(dataCompleta("")).toBe(false);
  });
  it("ehDataISO só aceita YYYY-MM-DD", () => {
    expect(ehDataISO("2026-03-01")).toBe(true);
    expect(ehDataISO("01/03/2026")).toBe(false);
    expect(ehDataISO(20260301)).toBe(false);
  });
  it("textoVigencia", () => {
    expect(textoVigencia(cadeira({ dataInicio: "2026-08-01", dataFim: "2026-12-15" }))).toBe("01/08/2026 – 15/12/2026");
    expect(textoVigencia(cadeira({ dataInicio: "2026-08-01" }))).toBe("A partir de 01/08/2026");
    expect(textoVigencia(cadeira({ dataFim: "2026-12-15" }))).toBe("Até 15/12/2026");
    expect(textoVigencia(cadeira())).toBe("");
  });
});

describe("vigenciaPadraoParaNovaCadeira (#19)", () => {
  it("copia a vigência da última cadeira do mesmo período que tem datas", () => {
    const lista = [
      cadeira({ periodoId: "p", dataInicio: "2026-03-01", dataFim: "2026-07-01" }),
      cadeira({ periodoId: "p", dataInicio: "2026-08-01", dataFim: "2026-12-15" }),
      cadeira({ periodoId: "p" }),
      cadeira({ periodoId: "outro", dataInicio: "2030-01-01" }),
    ];
    expect(vigenciaPadraoParaNovaCadeira(lista, "p")).toEqual({ dataInicio: "2026-08-01", dataFim: "2026-12-15" });
  });
  it("sem referência no período ⇒ sem datas", () => {
    expect(vigenciaPadraoParaNovaCadeira([cadeira({ periodoId: "outro", dataFim: "2026-12-01" })], "p")).toEqual({});
    expect(vigenciaPadraoParaNovaCadeira([], "p")).toEqual({});
  });
  it("só um lado definido ⇒ copia só ele", () => {
    expect(vigenciaPadraoParaNovaCadeira([cadeira({ periodoId: "p", dataFim: "2026-12-01" })], "p")).toEqual({
      dataFim: "2026-12-01",
    });
  });
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

// #55: o padrão antigo do afazer (#221e1e) sumia no fundo escuro.
describe("corVisivel", () => {
  it("devolve cores normais exatamente como vieram (inclusive hex curto)", () => {
    expect(corVisivel("#f00")).toBe("#f00");
    expect(corVisivel("#8b5cf6")).toBe("#8b5cf6");
    expect(corVisivel("#0c3d00")).toBe("#0c3d00");
  });
  it("clareia cores quase pretas, mantendo um hex de 6 dígitos", () => {
    const c = corVisivel("#221e1e");
    expect(c).toMatch(/^#[0-9a-f]{6}$/);
    expect(c).not.toBe("#221e1e");
    const [r, g, b] = hexParaRgb(c).split(", ").map(Number);
    expect(r).toBeGreaterThan(90);
    expect(r).toBeGreaterThanOrEqual(g); // mantém o leve tom avermelhado
    expect(g).toBe(b);
    expect(corVisivel("#000000")).not.toBe("#000000");
  });
  it("valor inválido passa direto (sem quebrar a tela)", () => {
    expect(corVisivel(undefined)).toBeUndefined();
    expect(corVisivel("")).toBe("");
    expect(corVisivel("azul")).toBe("azul");
  });
});
