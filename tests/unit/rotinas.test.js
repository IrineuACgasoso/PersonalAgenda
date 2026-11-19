// Resumo da rotina (Fase 5): src/utils/rotinas.js
// Hoje nos testes = 18/11/2026 (quarta), 10:00.
import { describe, it, expect } from "vitest";
import {
  diasAtivosDaRotina,
  minutosPorSemana,
  textoDuracao,
  proximaOcorrenciaRotina,
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
});
