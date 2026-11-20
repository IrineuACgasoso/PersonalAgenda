// Resumo da cadeira para o card e o drawer (#21): src/utils/cadeiras.js
// "Agora" nos testes = quarta 18/11/2026 10:00 (tests/setup.js).
import { describe, it, expect } from "vitest";
import {
  datasImportantes,
  diasEntre,
  proximaAula,
  proximasAvaliacoes,
  progressoVigencia,
  rotuloDias,
  textoProximaAula,
  textoQuandoAvaliacao,
} from "../../src/utils/cadeiras.js";
import { cadeira, horario } from "../fixtures/fabricas.js";

const HOJE = "2026-11-18";
const agora = (hora = "10:00") => new Date(`2026-11-18T${hora}:00`);

describe("diasEntre", () => {
  it("conta dias inteiros, inclusive virando o mês", () => {
    expect(diasEntre("2026-11-18", "2026-11-18")).toBe(0);
    expect(diasEntre("2026-11-18", "2026-12-01")).toBe(13);
    expect(diasEntre("2026-11-18", "2026-11-10")).toBe(-8);
  });
});

describe("proximaAula", () => {
  const seg = horario({ id: "seg", dia: 0, inicio: "08:00", fim: "10:00" });
  const qua = horario({ id: "qua", dia: 2, inicio: "14:00", fim: "16:00", local: "E201" });

  it("sem horários ⇒ null", () => {
    expect(proximaAula(cadeira(), agora())).toBeNull();
  });

  it("hoje, mais tarde", () => {
    const p = proximaAula(cadeira({ horarios: [seg, qua] }), agora());
    expect(p).toMatchObject({ data: HOJE, emAndamento: false });
    expect(p.horario.id).toBe("qua");
  });

  it("aula em andamento conta, com emAndamento", () => {
    const p = proximaAula(cadeira({ horarios: [qua] }), agora("15:00"));
    expect(p).toMatchObject({ data: HOJE, emAndamento: true });
  });

  it("aula de hoje que já acabou passa para a próxima semana", () => {
    const p = proximaAula(cadeira({ horarios: [qua] }), agora("16:00"));
    expect(p.data).toBe("2026-11-25");
  });

  it("pula a ocorrência removida da agenda", () => {
    const c = cadeira({ id: "c", horarios: [seg] });
    const p = proximaAula(c, agora(), ["aulas|2026-11-23|c|seg"]);
    expect(p.data).toBe("2026-11-30");
  });

  it("respeita a vigência: começa no início e para no fim", () => {
    const futura = cadeira({ horarios: [seg], dataInicio: "2027-03-01" });
    expect(proximaAula(futura, agora()).data).toBe("2027-03-01"); // segunda
    const acabando = cadeira({ horarios: [seg], dataFim: "2026-11-20" });
    expect(proximaAula(acabando, agora())).toBeNull();
  });
});

describe("proximasAvaliacoes", () => {
  const c = cadeira({
    datas: [
      { id: "a", titulo: "P1", data: "2026-10-10" },
      { id: "b", titulo: "P2", data: "2026-11-26" },
      { id: "c", titulo: "Lista", data: "2026-11-18", hora: "23:59" },
      { id: "d", titulo: "Final", data: "2026-12-10" },
    ],
  });
  it("todas de hoje em diante, da mais próxima para a mais distante", () => {
    expect(proximasAvaliacoes(c, HOJE).map((x) => [x.avaliacao.titulo, x.dias])).toEqual([
      ["Lista", 0],
      ["P2", 8],
      ["Final", 22],
    ]);
  });
  it("destaque só para as de até 7 dias", () => {
    const comMeio = { ...c, datas: [...c.datas, { id: "e", titulo: "Seminário", data: "2026-11-25" }] };
    const destaque = Object.fromEntries(proximasAvaliacoes(comMeio, HOJE).map((x) => [x.avaliacao.titulo, x.destaque]));
    expect(destaque).toEqual({ Lista: true, Seminário: true, P2: false, Final: false });
  });
  it("ignora as que estão fora da vigência", () => {
    expect(proximasAvaliacoes({ ...c, dataFim: "2026-11-30" }, HOJE).map((x) => x.avaliacao.titulo)).toEqual([
      "Lista",
      "P2",
    ]);
  });
  it("sem futuras ⇒ lista vazia", () => {
    expect(proximasAvaliacoes(cadeira({ datas: [{ id: "x", titulo: "P1", data: "2026-01-01" }] }), HOJE)).toEqual([]);
  });
});

describe("progressoVigencia", () => {
  const c = cadeira({ dataInicio: "2026-11-08", dataFim: "2026-11-28" });
  it("fração da vigência que já passou", () => {
    expect(progressoVigencia(c, HOJE)).toBe(0.5);
  });
  it("limitado entre 0 e 1", () => {
    expect(progressoVigencia(c, "2026-01-01")).toBe(0);
    expect(progressoVigencia(c, "2027-01-01")).toBe(1);
  });
  it("só com início e fim", () => {
    expect(progressoVigencia(cadeira({ dataInicio: "2026-11-08" }), HOJE)).toBeNull();
    expect(progressoVigencia(cadeira(), HOJE)).toBeNull();
  });
});

describe("textos do resumo", () => {
  it("rotuloDias", () => {
    expect([0, 1, 8].map(rotuloDias)).toEqual(["hoje", "amanhã", "em 8d"]);
  });
  it("textoProximaAula: agora / hoje / amanhã / dia da semana / data", () => {
    const h = horario({ inicio: "14:00", fim: "16:00", local: "E201" });
    expect(textoProximaAula({ data: HOJE, horario: h, emAndamento: true }, HOJE)).toBe("agora (até 16:00) · E201");
    expect(textoProximaAula({ data: HOJE, horario: h }, HOJE)).toBe("hoje 14:00 · E201");
    expect(textoProximaAula({ data: "2026-11-19", horario: h }, HOJE)).toBe("amanhã 14:00 · E201");
    expect(textoProximaAula({ data: "2026-11-23", horario: { ...h, local: "" } }, HOJE)).toBe("Seg 14:00");
    expect(textoProximaAula({ data: "2026-12-02", horario: { ...h, local: "" } }, HOJE)).toBe("02/12 14:00");
    expect(textoProximaAula(null, HOJE)).toBe("");
  });
  it("textoQuandoAvaliacao", () => {
    expect(textoQuandoAvaliacao({ avaliacao: { titulo: "P2", data: "2026-11-26" }, dias: 8 })).toBe("26/11 · em 8d");
    expect(textoQuandoAvaliacao({ avaliacao: { titulo: "L", data: "2026-11-18" }, dias: 0 })).toBe("18/11 · hoje");
  });
});

describe("datasImportantes (#46)", () => {
  const cadeiras = [
    cadeira({
      id: "c1",
      nome: "Cálculo",
      datas: [
        { id: "a", titulo: "P1", data: "2026-10-10" },
        { id: "b", titulo: "P2", data: "2026-11-26", hora: "10:00" },
        { id: "c", titulo: "Lista", data: "2026-11-18", hora: "08:00" },
      ],
    }),
    cadeira({
      id: "c2",
      nome: "Física",
      datas: [
        { id: "d", titulo: "Relatório", data: "2026-11-17" },
        { id: "e", titulo: "P2 Física", data: "2026-11-26", hora: "08:00" },
        { id: "f", titulo: "Sem data", data: "" },
      ],
    }),
  ];

  it("próximas primeiro, da mais perto para a mais longe (hoje conta como próxima)", () => {
    expect(datasImportantes(cadeiras, HOJE).proximas.map((d) => d.id)).toEqual(["c", "e", "b"]);
  });

  it("anteriores da mais recente para a mais antiga", () => {
    expect(datasImportantes(cadeiras, HOJE).anteriores.map((d) => d.id)).toEqual(["d", "a"]);
  });

  it("cada item leva a cadeira de origem; sem data fica de fora", () => {
    const { proximas, anteriores } = datasImportantes(cadeiras, HOJE);
    expect(proximas[1]).toMatchObject({ titulo: "P2 Física", cadeiraId: "c2", cadeiraNome: "Física" });
    expect([...proximas, ...anteriores].some((d) => d.id === "f")).toBe(false);
  });

  it("aguenta lista vazia e cadeira sem datas", () => {
    expect(datasImportantes([], HOJE)).toEqual({ proximas: [], anteriores: [] });
    expect(datasImportantes([{ id: "x" }], HOJE)).toEqual({ proximas: [], anteriores: [] });
  });
});
