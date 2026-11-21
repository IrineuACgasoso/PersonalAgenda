import { describe, expect, it } from "vitest";
import { faixaDeHoras, percentualNaGrade, MIN_HORAS_GRADE } from "../../src/utils/agendaSemanal.js";
import { HORA_FIM, HORA_INICIO } from "../../src/constants.js";

const bloco = (inicio, fim) => ({ inicio, fim });

describe("faixaDeHoras (Agenda da semana)", () => {
  it("sem blocos ⇒ grade inteira 06h–23h", () => {
    expect(faixaDeHoras([])).toEqual({ inicio: HORA_INICIO, fim: HORA_FIM });
    expect(faixaDeHoras(undefined)).toEqual({ inicio: HORA_INICIO, fim: HORA_FIM });
  });

  it("corta manhãs e noites vazias, em horas cheias", () => {
    expect(faixaDeHoras([bloco("07:30", "09:10"), bloco("13:00", "16:50")])).toEqual({ inicio: 7, fim: 17 });
  });

  it("garante o mínimo de horas, crescendo primeiro para o fim do dia", () => {
    expect(faixaDeHoras([bloco("08:00", "10:00")])).toEqual({ inicio: 8, fim: 8 + MIN_HORAS_GRADE });
    // Perto das 23h não dá para crescer para baixo: cresce para cima.
    expect(faixaDeHoras([bloco("21:00", "22:30")])).toEqual({ inicio: HORA_FIM - MIN_HORAS_GRADE, fim: HORA_FIM });
  });

  it("fica dentro de 06h–23h mesmo com horários fora", () => {
    expect(faixaDeHoras([bloco("05:00", "23:59")])).toEqual({ inicio: HORA_INICIO, fim: HORA_FIM });
  });

  it("ignora horários inválidos", () => {
    expect(faixaDeHoras([bloco("", "x"), bloco("09:00", "18:00")])).toEqual({ inicio: 9, fim: 18 });
    expect(faixaDeHoras([bloco("", "")])).toEqual({ inicio: HORA_INICIO, fim: HORA_FIM });
  });
});

describe("percentualNaGrade", () => {
  it("posiciona proporcionalmente à faixa", () => {
    expect(percentualNaGrade("08:00", 8, 18)).toBe(0);
    expect(percentualNaGrade("13:00", 8, 18)).toBe(50);
    expect(percentualNaGrade("18:00", 8, 18)).toBe(100);
  });

  it("limita a 0–100% e trata lixo como 0", () => {
    expect(percentualNaGrade("06:00", 8, 18)).toBe(0);
    expect(percentualNaGrade("23:00", 8, 18)).toBe(100);
    expect(percentualNaGrade("", 8, 18)).toBe(0);
  });
});
