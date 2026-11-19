// Recorrência de afazeres: src/utils/afazeres.js
import { describe, it, expect } from "vitest";
import {
  ocorrenciasNoIntervalo,
  toISO,
  parseISO,
  ehRotina,
  afazerConcluido,
  ocorrenciaAtual,
  dataAoSalvarAfazer,
  rotinaSemDataBase,
} from "../../src/utils/afazeres.js";
import { afazer } from "../fixtures/fabricas.js";

const datas = (af, ini = "2026-11-01", fim = "2026-11-30") => ocorrenciasNoIntervalo(af, ini, fim).map((o) => o.data);

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

  // Regressão do #12: dia 31 "escorregava" e pulava meses
  // (gerava 31/jan → 03/mar → 01/mai; fevereiro e abril sumiam).
  it("mensal no dia 31 cai no último dia dos meses curtos", () => {
    const r = datas(afazer({ data: "2026-01-31", rotina: { tipo: "mensal" } }), "2026-01-01", "2026-04-30");
    expect(r).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });
  it("mensal no dia 29 em ano bissexto e virada de ano", () => {
    const r = datas(afazer({ data: "2027-12-29", rotina: { tipo: "mensal" } }), "2027-12-01", "2028-03-31");
    expect(r).toEqual(["2027-12-29", "2028-01-29", "2028-02-29", "2028-03-29"]);
  });
  it("mensal respeita o limite de repetições mesmo com meses curtos", () => {
    const r = datas(
      afazer({ data: "2026-01-31", rotina: { tipo: "mensal", totalRepeticoes: 2 } }),
      "2026-01-01",
      "2026-06-30",
    );
    expect(r).toEqual(["2026-01-31", "2026-02-28"]);
  });
});

describe("ocorrenciasNoIntervalo — dias específicos", () => {
  it("sem data-base: projeta em toda a janela (Seg/Qua)", () => {
    const r = datas(afazer({ rotina: { tipo: "dias_especificos", diasSemana: [0, 2] } }), "2026-11-01", "2026-11-12");
    expect(r).toEqual(["2026-11-02", "2026-11-04", "2026-11-09", "2026-11-11"]);
  });
  it("com data-base: só a partir dela", () => {
    const r = datas(
      afazer({ data: "2026-11-10", rotina: { tipo: "dias_especificos", diasSemana: [0, 2] } }),
      "2026-11-01",
      "2026-11-17",
    );
    expect(r).toEqual(["2026-11-11", "2026-11-16"]);
  });
  it("com data-base e limite de repetições", () => {
    const r = datas(
      afazer({ data: "2026-11-01", rotina: { tipo: "dias_especificos", diasSemana: [4], totalRepeticoes: 2 } }),
    );
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
    const af = afazer({
      data: "2026-11-02",
      rotina: { tipo: "semanal" },
      excecoesData: { "2026-11-09": "2026-11-10" },
    });
    expect(datas(af)).toEqual(["2026-11-02", "2026-11-10", "2026-11-16", "2026-11-23", "2026-11-30"]);
  });
  it("afazer avulso não duplica quando há exceção apontando para ele", () => {
    const af = afazer({ data: "2026-11-05", excecoesData: { "2026-11-05": "2026-11-06" } });
    expect(datas(af)).toEqual(["2026-11-06"]);
  });
});

describe("check de rotina na aba Afazeres (#11)", () => {
  // Hoje nos testes = 18/11/2026 (quarta).
  const semanalQuarta = (extra = {}) => afazer({ data: "2026-11-04", rotina: { tipo: "semanal" }, ...extra });

  it("rotina nunca conta como concluída inteira, mesmo com feito antigo", () => {
    expect(ehRotina(semanalQuarta())).toBe(true);
    expect(afazerConcluido(semanalQuarta({ feito: true }))).toBe(false);
    expect(afazerConcluido(afazer({ feito: true }))).toBe(true);
    expect(afazerConcluido(afazer())).toBe(false);
  });

  it("aponta para a ocorrência de hoje quando existe", () => {
    expect(ocorrenciaAtual(semanalQuarta(), "2026-11-18")).toEqual({
      data: "2026-11-18",
      dataOriginal: "2026-11-18",
      concluida: false,
    });
  });

  it("sem ocorrência hoje, aponta para a próxima", () => {
    expect(ocorrenciaAtual(semanalQuarta(), "2026-11-19")?.data).toBe("2026-11-25");
  });

  it("ocorrência concluída é reconhecida pela data natural, mesmo arrastada (#14)", () => {
    const af = semanalQuarta({ excecoesData: { "2026-11-18": "2026-11-19" }, datasConcluidas: ["2026-11-18"] });
    expect(ocorrenciaAtual(af, "2026-11-19")).toEqual({
      data: "2026-11-19",
      dataOriginal: "2026-11-18",
      concluida: true,
    });
  });

  it("rotina que já terminou (limite de repetições) não tem ocorrência atual", () => {
    expect(
      ocorrenciaAtual(afazer({ data: "2026-11-01", rotina: { tipo: "diaria", totalRepeticoes: 3 } }), "2026-11-18"),
    ).toBeNull();
  });
});

describe("rotina sem data-base (#40)", () => {
  const hoje = "2026-11-18";
  it("rotina diária/semanal/... salva sem data começa hoje", () => {
    for (const rotinaTipo of ["diaria", "semanal", "quinzenal", "mensal", "personalizada"]) {
      expect(dataAoSalvarAfazer({ rotinaTipo, temData: false, data: "" }, hoje)).toBe(hoje);
    }
  });
  it("data escolhida é respeitada; afazer comum e dias específicos podem ficar sem data", () => {
    expect(dataAoSalvarAfazer({ rotinaTipo: "semanal", temData: true, data: "2026-12-01" }, hoje)).toBe("2026-12-01");
    expect(dataAoSalvarAfazer({ rotinaTipo: "nenhuma", temData: false, data: "" }, hoje)).toBe("");
    expect(dataAoSalvarAfazer({ rotinaTipo: "dias_especificos", temData: false, data: "" }, hoje)).toBe("");
    // checkbox desmarcado ignora a data que tinha ficado no campo
    expect(dataAoSalvarAfazer({ rotinaTipo: "nenhuma", temData: false, data: "2026-12-01" }, hoje)).toBe("");
  });
  it("rotina salva assim aparece no calendário a partir de hoje", () => {
    const data = dataAoSalvarAfazer({ rotinaTipo: "semanal", temData: false, data: "" }, hoje);
    expect(datas(afazer({ data, rotina: { tipo: "semanal" } }))).toEqual(["2026-11-18", "2026-11-25"]);
  });
  it("rotinas antigas sem data são detectadas para o aviso na lista", () => {
    expect(rotinaSemDataBase(afazer({ rotina: { tipo: "semanal" } }))).toBe(true);
    expect(rotinaSemDataBase(afazer({ data: hoje, rotina: { tipo: "semanal" } }))).toBe(false);
    expect(rotinaSemDataBase(afazer({ rotina: { tipo: "dias_especificos", diasSemana: [1] } }))).toBe(false);
    expect(rotinaSemDataBase(afazer())).toBe(false);
  });
});
