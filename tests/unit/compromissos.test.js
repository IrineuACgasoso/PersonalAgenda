// Compromissos pontuais (Fase 5): src/utils/compromissos.js
import { describe, it, expect } from "vitest";
import {
  erroDoCompromisso,
  secoesDosCompromissos,
  textoHorarioCompromisso,
  textoDataComSemana,
  rotuloRelativo,
} from "../../src/utils/compromissos.js";
import { compromisso } from "../fixtures/fabricas.js";

const hoje = "2026-11-18";

describe("erroDoCompromisso (validação do formulário)", () => {
  const ok = { nome: "Dentista", data: "2026-11-20", inicio: "14:00", fim: "" };
  it("válido sem fim e com fim depois do início", () => {
    expect(erroDoCompromisso(ok)).toBeNull();
    expect(erroDoCompromisso({ ...ok, fim: "15:00" })).toBeNull();
  });
  it("nome, data e início são obrigatórios", () => {
    expect(erroDoCompromisso({ ...ok, nome: "  " })).toMatch(/nome/);
    expect(erroDoCompromisso({ ...ok, data: "" })).toMatch(/data/);
    expect(erroDoCompromisso({ ...ok, inicio: "" })).toMatch(/início/);
  });
  it("fim igual ou antes do início é recusado", () => {
    expect(erroDoCompromisso({ ...ok, fim: "14:00" })).toMatch(/depois do início/);
    expect(erroDoCompromisso({ ...ok, fim: "13:00" })).toMatch(/depois do início/);
  });
});

describe("secoesDosCompromissos", () => {
  it("hoje e próximos por data/hora; passados do mais recente; concluído fica na seção da data", () => {
    const lista = [
      compromisso({ id: "p2", data: "2026-11-25", inicio: "09:00" }),
      compromisso({ id: "h2", data: hoje, inicio: "16:00" }),
      compromisso({ id: "p1", data: "2026-11-20", inicio: "14:00", feito: true }),
      compromisso({ id: "h1", data: hoje, inicio: "08:00" }),
      compromisso({ id: "v1", data: "2026-11-01" }),
      compromisso({ id: "v2", data: "2026-11-15" }),
    ];
    const s = secoesDosCompromissos(lista, hoje);
    expect(s.hoje.map((c) => c.id)).toEqual(["h1", "h2"]);
    expect(s.proximos.map((c) => c.id)).toEqual(["p1", "p2"]);
    expect(s.passados.map((c) => c.id)).toEqual(["v2", "v1"]);
  });
});

describe("textos", () => {
  it("horário com e sem fim", () => {
    expect(textoHorarioCompromisso({ inicio: "14:00" })).toBe("14:00");
    expect(textoHorarioCompromisso({ inicio: "14:00", fim: "15:30" })).toBe("14:00–15:30");
  });
  it("data com dia da semana", () => {
    expect(textoDataComSemana("2026-11-20")).toBe("Sex, 20/11");
    expect(textoDataComSemana("")).toBe("");
  });
  it("rótulo relativo", () => {
    expect(rotuloRelativo(hoje, hoje)).toBe("hoje");
    expect(rotuloRelativo("2026-11-19", hoje)).toBe("amanhã");
    expect(rotuloRelativo("2026-11-21", hoje)).toBe("em 3d");
    expect(rotuloRelativo("2026-11-17", hoje)).toBe("ontem");
    expect(rotuloRelativo("2026-11-13", hoje)).toBe("há 5d");
  });
});
