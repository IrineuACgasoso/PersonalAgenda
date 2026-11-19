// Resumo da rotina (Fase 5): src/utils/rotinas.js
// Hoje nos testes = 18/11/2026 (quarta), 10:00.
import { describe, it, expect } from "vitest";
import {
  diasAtivosDaRotina,
  minutosPorSemana,
  textoDuracao,
  proximaOcorrenciaRotina,
  rotinaEncerrada,
  horariosNaSemana,
} from "../../src/utils/rotinas.js";
import { chaveRotina } from "../../src/utils/projecao.js";
import { rotina, horario } from "../fixtures/fabricas.js";

const agora = (hora = "10:00") => new Date(`2026-11-18T${hora}:00`);

describe("faixa da semana e horas", () => {
  const academia = rotina({
    horarios: [
      horario({ dia: 0, inicio: "07:00", fim: "08:30" }),
      horario({ dia: 2, inicio: "07:00", fim: "08:30" }),
      horario({ dia: 4, inicio: "18:00", fim: "19:30" }),
    ],
  });

  it("dias ativos (0 = Seg … 6 = Dom)", () => {
    expect([...diasAtivosDaRotina(academia)].sort()).toEqual([0, 2, 4]);
    expect(diasAtivosDaRotina(rotina()).size).toBe(0);
  });

  it("soma a duração dos horários; horário inválido não conta", () => {
    expect(minutosPorSemana(academia)).toBe(270);
    expect(minutosPorSemana(rotina({ horarios: [horario({ inicio: "10:00", fim: "09:00" }), { dia: 1 }] }))).toBe(0);
  });

  it("textoDuracao", () => {
    expect(textoDuracao(270)).toBe("4h30");
    expect(textoDuracao(120)).toBe("2h");
    expect(textoDuracao(45)).toBe("45min");
    expect(textoDuracao(0)).toBe("0h");
    expect(textoDuracao(65)).toBe("1h05");
  });
});

describe("proximaOcorrenciaRotina", () => {
  const r = rotina({
    id: "r1",
    horarios: [
      horario({ id: "qua", dia: 2, inicio: "18:00", fim: "19:00" }),
      horario({ id: "sex", dia: 4, inicio: "07:00", fim: "08:00" }),
    ],
  });

  it("hoje mais tarde", () => {
    expect(proximaOcorrenciaRotina(r, agora())).toMatchObject({ data: "2026-11-18", emAndamento: false });
  });
  it("em andamento conta", () => {
    expect(proximaOcorrenciaRotina(r, agora("18:30"))).toMatchObject({ data: "2026-11-18", emAndamento: true });
  });
  it("depois do fim de hoje vai para a próxima", () => {
    expect(proximaOcorrenciaRotina(r, agora("19:30"))?.data).toBe("2026-11-20");
  });
  it("pula ocorrência removida da agenda", () => {
    const excluida = chaveRotina("2026-11-18", r, r.horarios[0]);
    expect(proximaOcorrenciaRotina(r, agora(), [excluida])?.data).toBe("2026-11-20");
  });
  it("sem horários = null", () => {
    expect(proximaOcorrenciaRotina(rotina(), agora())).toBeNull();
  });
  it("respeita a vigência (#56): começa no início futuro, para no fim", () => {
    expect(proximaOcorrenciaRotina({ ...r, dataInicio: "2026-12-01" }, agora())?.data).toBe("2026-12-02");
    expect(proximaOcorrenciaRotina({ ...r, dataFim: "2026-11-19" }, agora("19:30"))).toBeNull();
    expect(proximaOcorrenciaRotina({ ...r, dataFim: "2026-11-20" }, agora("19:30"))?.data).toBe("2026-11-20");
  });
});

describe("vigência da rotina (#56)", () => {
  it("rotinaEncerrada: só com fim antes de hoje", () => {
    expect(rotinaEncerrada(rotina(), "2026-11-18")).toBe(false);
    expect(rotinaEncerrada(rotina({ dataFim: "2026-11-18" }), "2026-11-18")).toBe(false);
    expect(rotinaEncerrada(rotina({ dataFim: "2026-11-17" }), "2026-11-18")).toBe(true);
    expect(rotinaEncerrada(rotina({ dataInicio: "2020-01-01" }), "2026-11-18")).toBe(false);
  });

  it("horariosNaSemana: cada horário checado na data do seu dia nesta semana", () => {
    // Semana de 18/11/2026 (quarta): seg 16 … dom 22.
    const seg = horario({ id: "seg", dia: 0 });
    const sex = horario({ id: "sex", dia: 4 });
    const r = rotina({ horarios: [seg, sex] });
    const ids = (extra) => horariosNaSemana({ ...r, ...extra }, "2026-11-18").map((h) => h.id);
    expect(ids({})).toEqual(["seg", "sex"]);
    expect(ids({ dataInicio: "2026-11-19" })).toEqual(["sex"]);
    expect(ids({ dataFim: "2026-11-19" })).toEqual(["seg"]);
    expect(ids({ dataFim: "2026-11-01" })).toEqual([]);
    // Domingo pertence à semana que começou na segunda anterior.
    expect(horariosNaSemana({ ...r, dataInicio: "2026-11-20" }, "2026-11-22").map((h) => h.id)).toEqual(["sex"]);
  });
});
