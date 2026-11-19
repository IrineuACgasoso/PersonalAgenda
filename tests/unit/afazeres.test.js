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
  datasDaRegra,
  ehDataDaRegra,
  textoRepeticao,
  descreverAfazer,
  secoesDosAfazeres,
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
  it("data de fim é respeitada (inclusiva)", () => {
    const r = datas(afazer({ data: "2026-11-02", rotina: { tipo: "diaria", dataFim: "2026-11-04" } }));
    expect(r).toEqual(["2026-11-02", "2026-11-03", "2026-11-04"]);
  });
  it("data de fim antes da janela: nada aparece", () => {
    const r = datas(afazer({ data: "2026-10-01", rotina: { tipo: "semanal", dataFim: "2026-10-15" } }));
    expect(r).toEqual([]);
  });
  it("sem data de fim, repete para sempre (anos depois)", () => {
    const r = datas(afazer({ data: "2020-01-01", rotina: { tipo: "diaria" } }), "2030-05-30", "2030-06-01");
    expect(r).toEqual(["2030-05-30", "2030-05-31", "2030-06-01"]);
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
  it("mensal respeita a data de fim mesmo com meses curtos", () => {
    const r = datas(
      afazer({ data: "2026-01-31", rotina: { tipo: "mensal", dataFim: "2026-02-28" } }),
      "2026-01-01",
      "2026-06-30",
    );
    expect(r).toEqual(["2026-01-31", "2026-02-28"]);
  });
  it("mensal começando bem antes da janela", () => {
    const r = datas(afazer({ data: "2025-03-31", rotina: { tipo: "mensal" } }), "2026-11-01", "2026-12-31");
    expect(r).toEqual(["2026-11-30", "2026-12-31"]);
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
  it("com data-base e data de fim", () => {
    const r = datas(
      afazer({ data: "2026-11-01", rotina: { tipo: "dias_especificos", diasSemana: [4], dataFim: "2026-11-13" } }),
    );
    expect(r).toEqual(["2026-11-06", "2026-11-13"]);
  });
  it("sem data-base e com data de fim (Academia sem domingo até 10/11)", () => {
    const r = datas(
      afazer({ rotina: { tipo: "dias_especificos", diasSemana: [0, 1, 2, 3, 4, 5], dataFim: "2026-11-10" } }),
      "2026-11-07",
      "2026-11-30",
    );
    expect(r).toEqual(["2026-11-07", "2026-11-09", "2026-11-10"]);
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
  it("fim encurtado depois do drag: ocorrência movida de depois do fim some", () => {
    const af = afazer({
      data: "2026-11-02",
      rotina: { tipo: "semanal", dataFim: "2026-11-09" },
      excecoesData: { "2026-11-16": "2026-11-17", "2026-11-09": "2026-11-10" },
    });
    expect(datas(af)).toEqual(["2026-11-02", "2026-11-10"]);
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

  it("repetição que já terminou (data de fim passou) não tem ocorrência atual", () => {
    expect(
      ocorrenciaAtual(afazer({ data: "2026-11-01", rotina: { tipo: "diaria", dataFim: "2026-11-03" } }), "2026-11-18"),
    ).toBeNull();
  });
});

describe("rotina sem data-base (#40)", () => {
  const hoje = "2026-11-18";
  it("rotina diária/semanal/... salva sem data começa hoje", () => {
    for (const rotinaTipo of ["diaria", "semanal", "quinzenal", "mensal", "personalizada"]) {
      expect(dataAoSalvarAfazer({ rotinaTipo, data: "" }, hoje)).toBe(hoje);
    }
  });
  it("data escolhida é respeitada; afazer comum e dias específicos podem ficar sem data", () => {
    expect(dataAoSalvarAfazer({ rotinaTipo: "semanal", data: "2026-12-01" }, hoje)).toBe("2026-12-01");
    expect(dataAoSalvarAfazer({ rotinaTipo: "nenhuma", data: "2026-12-01" }, hoje)).toBe("2026-12-01");
    expect(dataAoSalvarAfazer({ rotinaTipo: "nenhuma", data: "" }, hoje)).toBe("");
    expect(dataAoSalvarAfazer({ rotinaTipo: "dias_especificos", data: "" }, hoje)).toBe("");
  });
  it("rotina salva assim aparece no calendário a partir de hoje", () => {
    const data = dataAoSalvarAfazer({ rotinaTipo: "semanal", data: "" }, hoje);
    expect(datas(afazer({ data, rotina: { tipo: "semanal" } }))).toEqual(["2026-11-18", "2026-11-25"]);
  });
  it("rotinas antigas sem data são detectadas para o aviso na lista", () => {
    expect(rotinaSemDataBase(afazer({ rotina: { tipo: "semanal" } }))).toBe(true);
    expect(rotinaSemDataBase(afazer({ data: hoje, rotina: { tipo: "semanal" } }))).toBe(false);
    expect(rotinaSemDataBase(afazer({ rotina: { tipo: "dias_especificos", diasSemana: [1] } }))).toBe(false);
    expect(rotinaSemDataBase(afazer())).toBe(false);
  });
});

// Fase 5: o seletor de data de fim só deixa escolher dias da repetição.
describe("datas possíveis de fim (datasDaRegra / ehDataDaRegra)", () => {
  const semanal = afazer({ data: "2026-11-18", rotina: { tipo: "semanal", dataFim: "2026-11-25" } });

  it("diária: todos os dias a partir do início", () => {
    const af = afazer({ data: "2026-11-18", rotina: { tipo: "diaria" } });
    expect(datasDaRegra(af, "2026-11-16", "2026-11-20")).toEqual(["2026-11-18", "2026-11-19", "2026-11-20"]);
  });
  it("semanal: só o mesmo dia da semana, ignorando a data de fim atual", () => {
    expect(datasDaRegra(semanal, "2026-11-01", "2026-12-10")).toEqual([
      "2026-11-18",
      "2026-11-25",
      "2026-12-02",
      "2026-12-09",
    ]);
  });
  it("15 dias e personalizada respeitam o passo", () => {
    const quinzenal = afazer({ data: "2026-11-01", rotina: { tipo: "quinzenal" } });
    expect(datasDaRegra(quinzenal, "2026-11-01", "2026-12-31")).toEqual([
      "2026-11-01",
      "2026-11-16",
      "2026-12-01",
      "2026-12-16",
      "2026-12-31",
    ]);
    const cada3 = afazer({ data: "2026-11-01", rotina: { tipo: "personalizada", intervaloDias: 3 } });
    expect(datasDaRegra(cada3, "2026-11-05", "2026-11-12")).toEqual(["2026-11-07", "2026-11-10"]);
  });
  it("dias específicos: só os dias marcados (Academia: tudo menos domingo)", () => {
    const academia = afazer({ rotina: { tipo: "dias_especificos", diasSemana: [0, 1, 2, 3, 4, 5] } });
    expect(datasDaRegra(academia, "2026-11-14", "2026-11-17")).toEqual(["2026-11-14", "2026-11-16", "2026-11-17"]);
  });
  it("ehDataDaRegra valida a data de fim", () => {
    expect(ehDataDaRegra(semanal, "2026-12-02")).toBe(true);
    expect(ehDataDaRegra(semanal, "2026-12-03")).toBe(false);
    expect(ehDataDaRegra(semanal, "2026-11-11")).toBe(false); // antes do início
  });
  it("janela invertida ou inválida não gera nada", () => {
    expect(datasDaRegra(semanal, "2026-12-01", "2026-11-01")).toEqual([]);
    expect(datasDaRegra(semanal, "", "2026-11-01")).toEqual([]);
  });
});

describe("textos do formulário de afazer", () => {
  it("textoRepeticao", () => {
    expect(textoRepeticao({ tipo: "nenhuma" })).toBeNull();
    expect(textoRepeticao({ tipo: "diaria" })).toBe("Todo dia");
    expect(textoRepeticao({ tipo: "dias_especificos", diasSemana: [4, 0, 2] })).toBe("Seg, Qua, Sex");
    expect(textoRepeticao({ tipo: "dias_especificos", diasSemana: [0, 1, 2, 3, 4, 5, 6] })).toBe("Todo dia");
    expect(textoRepeticao({ tipo: "personalizada", intervaloDias: 3 })).toBe("A cada 3 dias");
  });
  it("descreverAfazer: exemplos do pedido", () => {
    const hoje = "2026-11-18";
    // estudo diário até a véspera da prova
    expect(descreverAfazer({ data: hoje, rotina: { tipo: "diaria", dataFim: "2026-11-24" } }, hoje)).toBe(
      "Todo dia, a partir de hoje, até 24/11.",
    );
    // duolingo eterno
    expect(descreverAfazer({ data: hoje, rotina: { tipo: "diaria", dataFim: "" } }, hoje)).toBe(
      "Todo dia, a partir de hoje, para sempre.",
    );
    // academia sem domingo, sem início
    expect(
      descreverAfazer({ data: "", rotina: { tipo: "dias_especificos", diasSemana: [0, 1, 2, 3, 4, 5] } }, hoje),
    ).toBe("Seg, Ter, Qua, Qui, Sex, Sáb, toda semana, para sempre.");
    expect(descreverAfazer({ data: "", rotina: { tipo: "nenhuma" } }, hoje)).toMatch(/^Sem data/);
    expect(descreverAfazer({ data: "2026-11-21", rotina: { tipo: "nenhuma" } }, hoje)).toBe("Só no dia 21/11.");
  });
});

describe("seções da aba Afazeres (secoesDosAfazeres)", () => {
  const hoje = "2026-11-18";
  const ids = (lista) => lista.map((x) => x.afazer.id);

  it("distribui cada afazer na seção certa", () => {
    const atrasado = afazer({ id: "a", data: "2026-11-15" });
    const deHoje = afazer({ id: "h", data: hoje });
    const futuro = afazer({ id: "p", data: "2026-11-30" });
    const semData = afazer({ id: "s" });
    const recorrente = afazer({ id: "r", data: "2026-11-02", rotina: { tipo: "diaria" } });
    const feito = afazer({ id: "f", data: "2026-11-10", feito: true });
    const s = secoesDosAfazeres([atrasado, deHoje, futuro, semData, recorrente, feito], hoje);
    expect(ids(s.atrasados)).toEqual(["a"]);
    expect(s.atrasados[0].diasAtraso).toBe(3);
    expect(ids(s.hoje)).toEqual(["h"]);
    expect(ids(s.proximos)).toEqual(["p"]);
    expect(ids(s.semData)).toEqual(["s"]);
    expect(ids(s.recorrentes)).toEqual(["r"]);
    expect(s.recorrentes[0].ocorrencia.data).toBe(hoje);
    expect(ids(s.concluidos)).toEqual(["f"]);
  });

  it("ordem: data e depois urgência; recorrentes terminados no fim; concluídos mais recentes primeiro", () => {
    const s = secoesDosAfazeres(
      [
        afazer({ id: "p2", data: "2026-11-25", urgencia: 1 }),
        afazer({ id: "p1", data: "2026-11-20", urgencia: 1 }),
        afazer({ id: "p3", data: "2026-11-25", urgencia: 3 }),
        afazer({ id: "fim", data: "2026-11-01", rotina: { tipo: "diaria", dataFim: "2026-11-05" } }),
        afazer({ id: "sem", data: "2026-11-01", rotina: { tipo: "semanal" } }), // próx.: 22/11
        afazer({ id: "dia", data: "2026-11-01", rotina: { tipo: "diaria" } }), // hoje
        afazer({ id: "c1", feito: true, concluidoEm: 100 }),
        afazer({ id: "c2", feito: true, concluidoEm: 200 }),
      ],
      hoje,
    );
    expect(ids(s.proximos)).toEqual(["p1", "p3", "p2"]);
    expect(ids(s.recorrentes)).toEqual(["dia", "sem", "fim"]);
    expect(s.recorrentes[2].ocorrencia).toBeNull();
    expect(ids(s.concluidos)).toEqual(["c2", "c1"]);
  });

  it("recorrente nunca vai para concluídos, mesmo com feito antigo", () => {
    const s = secoesDosAfazeres([afazer({ id: "r", data: hoje, rotina: { tipo: "diaria" }, feito: true })], hoje);
    expect(ids(s.recorrentes)).toEqual(["r"]);
    expect(s.concluidos).toEqual([]);
  });
});
