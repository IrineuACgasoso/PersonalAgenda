// #32 Conflito de horário entre aulas e rotinas: src/utils/conflitos.js
import { describe, it, expect } from "vitest";
import {
  horariosSeSobrepoem,
  vigenciasSeCruzam,
  fontesDeHorarios,
  conflitosDoHorario,
  avisoDeConflitos,
  distribuirEmColunas,
} from "../../src/utils/conflitos.js";
import { cadeira, rotina, horario } from "../fixtures/fabricas.js";

describe("horariosSeSobrepoem", () => {
  it("mesmo dia e intervalos que se cruzam", () => {
    expect(
      horariosSeSobrepoem(horario({ inicio: "08:00", fim: "10:00" }), horario({ inicio: "09:30", fim: "11:00" })),
    ).toBe(true);
    expect(
      horariosSeSobrepoem(horario({ inicio: "08:00", fim: "12:00" }), horario({ inicio: "09:00", fim: "10:00" })),
    ).toBe(true);
  });

  it("encostar não é conflito; dia diferente também não", () => {
    expect(
      horariosSeSobrepoem(horario({ inicio: "08:00", fim: "10:00" }), horario({ inicio: "10:00", fim: "12:00" })),
    ).toBe(false);
    expect(horariosSeSobrepoem(horario({ dia: 0 }), horario({ dia: 1 }))).toBe(false);
  });

  it("horário inválido nunca conflita", () => {
    expect(horariosSeSobrepoem(horario({ inicio: "" }), horario())).toBe(false);
    expect(horariosSeSobrepoem(null, horario())).toBe(false);
  });
});

describe("vigenciasSeCruzam", () => {
  it("sem datas = sempre", () => {
    expect(vigenciasSeCruzam({}, { dataInicio: "2026-08-01", dataFim: "2026-12-01" })).toBe(true);
  });
  it("uma acaba antes da outra começar", () => {
    expect(vigenciasSeCruzam({ dataFim: "2026-07-31" }, { dataInicio: "2026-08-01" })).toBe(false);
    expect(vigenciasSeCruzam({ dataInicio: "2026-08-01" }, { dataFim: "2026-07-31" })).toBe(false);
  });
  it("mesmo dia na ponta conta", () => {
    expect(vigenciasSeCruzam({ dataFim: "2026-08-01" }, { dataInicio: "2026-08-01" })).toBe(true);
  });
});

describe("conflitosDoHorario", () => {
  const aulaCalc = horario({ dia: 0, inicio: "08:00", fim: "10:00" });
  const calc = cadeira({ id: "calc", nome: "Cálculo", horarios: [aulaCalc] });
  const treino = horario({ dia: 0, inicio: "09:00", fim: "10:30" });
  const academia = rotina({ id: "acad", nome: "Academia", horarios: [treino] });
  const fontes = fontesDeHorarios([calc], [academia]);

  it("aula × rotina nos dois sentidos", () => {
    const daAula = conflitosDoHorario(aulaCalc, { tipo: "cadeira", id: "calc" }, fontes);
    expect(daAula.map((c) => c.nome)).toEqual(["Academia"]);
    const daRotina = conflitosDoHorario(treino, { tipo: "rotina", id: "acad" }, fontes);
    expect(daRotina.map((c) => c.nome)).toEqual(["Cálculo"]);
  });

  it("ignora o próprio horário (editar sem mudar não acusa)", () => {
    const so = fontesDeHorarios([calc], []);
    expect(conflitosDoHorario(aulaCalc, { tipo: "cadeira", id: "calc" }, so)).toEqual([]);
  });

  it("rascunho sem id (formulário) também é checado", () => {
    const rascunho = { dia: 0, inicio: "07:00", fim: "08:30" };
    const achados = conflitosDoHorario(rascunho, { tipo: "rotina", id: "nova" }, fontes);
    expect(achados.map((c) => c.nome)).toEqual(["Cálculo"]);
  });

  it("outro horário do mesmo dono que se sobrepõe conta (marcado mesmoDono)", () => {
    const duplicado = horario({ dia: 0, inicio: "09:00", fim: "11:00" });
    const c = cadeira({ id: "c2", horarios: [aulaCalc, duplicado] });
    const achados = conflitosDoHorario(duplicado, { tipo: "cadeira", id: "c2" }, fontesDeHorarios([c], []));
    expect(achados).toHaveLength(1);
    expect(achados[0].mesmoDono).toBe(true);
    expect(avisoDeConflitos(achados, "outro horário desta cadeira")).toBe(
      "Choca com outro horário desta cadeira (Seg 08:00–10:00)",
    );
  });

  it("vigências que não se cruzam não conflitam", () => {
    const antiga = rotina({ id: "velha", nome: "Inglês", dataFim: "2026-07-31", horarios: [treino] });
    const nova = cadeira({ id: "nova", dataInicio: "2026-08-10", horarios: [aulaCalc] });
    const f = fontesDeHorarios([nova], [antiga]);
    expect(conflitosDoHorario(aulaCalc, { tipo: "cadeira", id: "nova" }, f)).toEqual([]);
  });

  it("texto do aviso", () => {
    const achados = conflitosDoHorario(aulaCalc, { tipo: "cadeira", id: "calc" }, fontes);
    expect(avisoDeConflitos(achados)).toBe("Choca com Academia (Seg 09:00–10:30)");
    expect(avisoDeConflitos([])).toBe("");
  });
});

describe("distribuirEmColunas (Agenda da semana)", () => {
  const b = (inicio, fim) => ({ inicio, fim });

  it("sem sobreposição: uma coluna, sem conflito", () => {
    const x = b("08:00", "10:00");
    const y = b("10:00", "12:00");
    const pos = distribuirEmColunas([x, y]);
    expect(pos.get(x)).toEqual({ coluna: 0, colunas: 1, conflito: false });
    expect(pos.get(y)).toEqual({ coluna: 0, colunas: 1, conflito: false });
  });

  it("dois que se cruzam ficam lado a lado", () => {
    const x = b("08:00", "10:00");
    const y = b("09:00", "11:00");
    const pos = distribuirEmColunas([y, x]);
    expect(pos.get(x)).toEqual({ coluna: 0, colunas: 2, conflito: true });
    expect(pos.get(y)).toEqual({ coluna: 1, colunas: 2, conflito: true });
  });

  it("reaproveita a coluna livre dentro do mesmo cacho", () => {
    const longo = b("08:00", "12:00");
    const cedo = b("08:00", "09:00");
    const tarde = b("10:00", "11:00");
    const pos = distribuirEmColunas([longo, cedo, tarde]);
    expect(pos.get(longo).coluna).toBe(0);
    expect(pos.get(cedo).coluna).toBe(1);
    expect(pos.get(tarde).coluna).toBe(1);
    expect(pos.get(tarde).colunas).toBe(2);
  });
});
