// #34 Controle de faltas: src/utils/frequencia.js
// Check = presença; ✗ = falta (também conclui a aula); sem marca = nada.
import { describe, it, expect } from "vitest";
import {
  partesDaChaveAula,
  horasDoHorario,
  marcarFalta,
  alternarConclusaoEvento,
  ehFalta,
  cargaHorariaEstimada,
  resumoFaltas,
  textoFaltas,
  textoDepoisDaFalta,
  aulasQueAindaPodeFaltar,
} from "../../src/utils/frequencia.js";
import { projetarAulas, eventoConcluido, subtituloEvento, chaveAula } from "../../src/utils/projecao.js";
import { cadeira, horario, appData } from "../fixtures/fabricas.js";

const h = horario({ id: "h1", dia: 0, inicio: "08:00", fim: "10:00" }); // segunda, 2h
const calc = (extra = {}) => cadeira({ id: "calc", nome: "Cálculo", horarios: [h], ...extra });
const chave = (iso) => `aulas|${iso}|calc|h1`;

describe("chave e duração", () => {
  it("partesDaChaveAula", () => {
    expect(partesDaChaveAula(chave("2026-11-16"))).toEqual({ data: "2026-11-16", idCadeira: "calc", idHorario: "h1" });
    expect(partesDaChaveAula("rotinas|2026-11-16|r|h")).toBe(null);
  });
  it("horasDoHorario", () => {
    expect(horasDoHorario(h)).toBe(2);
    expect(horasDoHorario({ inicio: "10:00", fim: "08:00" })).toBe(0);
  });
});

describe("marcar falta / check", () => {
  it("✗ grava a falta na cadeira e tira o check de presença", () => {
    const dados = appData({ cadeiras: [calc()], eventosConcluidos: [chave("2026-11-16")] });
    const r = marcarFalta(dados, chave("2026-11-16"));
    expect(r.cadeiras[0].faltas).toEqual([chave("2026-11-16")]);
    expect(r.eventosConcluidos).toEqual([]);
    expect(ehFalta(r.cadeiras, chave("2026-11-16"))).toBe(true);
    // Repetir não duplica (devolve o mesmo objeto = nada a gravar).
    expect(marcarFalta(r, chave("2026-11-16"))).toBe(r);
  });

  it("desmarcar uma aula com falta tira a falta (não vira presença)", () => {
    const dados = appData({ cadeiras: [calc({ faltas: [chave("2026-11-16")] })] });
    const r = alternarConclusaoEvento(dados, chave("2026-11-16"));
    expect(r.cadeiras[0].faltas).toEqual([]);
    expect(r.eventosConcluidos).toEqual([]);
  });

  it("check normal continua alternando em eventosConcluidos", () => {
    const dados = appData({ cadeiras: [calc()] });
    const r = alternarConclusaoEvento(dados, chave("2026-11-16"));
    expect(r.eventosConcluidos).toEqual([chave("2026-11-16")]);
    expect(alternarConclusaoEvento(r, chave("2026-11-16")).eventosConcluidos).toEqual([]);
  });
});

describe("projeção: aula com falta", () => {
  it("vem concluída e com 'Falta' embaixo do nome", () => {
    const c = calc({ faltas: [chave("2026-11-16")] });
    const [ev] = projetarAulas([c], "2026-11-16", "2026-11-16");
    expect(ev.chave).toBe(chaveAula("2026-11-16", c, h));
    expect(ev.falta).toBe(true);
    expect(eventoConcluido(ev, [])).toBe(true);
    expect(subtituloEvento(ev, "2026-11-18", true)).toBe("Falta");
  });
});

describe("resumo de faltas", () => {
  it("carga estimada pelos horários × vigência", () => {
    // 02/11 a 30/11: 5 segundas × 2h = 10h
    expect(cargaHorariaEstimada(calc({ dataInicio: "2026-11-01", dataFim: "2026-11-30" }))).toBe(10);
    expect(cargaHorariaEstimada(calc())).toBe(null);
  });

  it("conta horas e compara com 25% da carga informada", () => {
    const c = calc({ cargaHoraria: 60, faltas: [chave("2026-11-02"), chave("2026-11-09"), chave("2026-11-16")] });
    const r = resumoFaltas(c);
    expect(r).toMatchObject({ quantidade: 3, horas: 6, carga: 60, cargaEstimada: false, limiteHoras: 15 });
    expect(r.nivel).toBe("ok");
    expect(textoFaltas(r)).toBe("6h de 15h");
    expect(textoDepoisDaFalta("Cálculo", r)).toBe("Falta em Cálculo · 6h de 15h (pode faltar mais 9h)");
  });

  it("níveis: atenção ≥ 50%, perigo ≥ 75%, estourou > 100%", () => {
    const comFaltas = (n) =>
      resumoFaltas(calc({ cargaHoraria: 16, faltas: Array.from({ length: n }, (_, i) => chave(`2026-0${i + 1}-05`)) }));
    expect(comFaltas(1).nivel).toBe("atencao"); // 2h de 4h
    expect(comFaltas(2).nivel).toBe("perigo"); // 4h de 4h: no limite, ainda não reprovou
    expect(comFaltas(3).nivel).toBe("estourou"); // 6h de 4h
  });

  it("não conta falta de horário apagado, aula removida do dia ou fora da vigência", () => {
    const c = calc({
      cargaHoraria: 60,
      dataInicio: "2026-08-01",
      faltas: ["aulas|2026-11-16|calc|apagado", chave("2026-11-09"), chave("2026-07-27"), chave("2026-11-02")],
    });
    const r = resumoFaltas(c, [chave("2026-11-02")]);
    expect(r.quantidade).toBe(1);
  });

  it("sem carga horária: só a contagem", () => {
    const r = resumoFaltas(calc({ faltas: [chave("2026-11-16")] }));
    expect(r.nivel).toBe(null);
    expect(textoFaltas(r)).toBe("1 falta (2h)");
    expect(textoFaltas(resumoFaltas(calc()))).toBe("Nenhuma falta");
  });
});

describe("aulasQueAindaPodeFaltar (tela da cadeira)", () => {
  it("sobra do limite ÷ duração média das aulas, para baixo", () => {
    const c = calc({ cargaHoraria: 60 }); // limite 15h, aulas de 2h
    expect(aulasQueAindaPodeFaltar(c, resumoFaltas(c))).toBe(7);
    const comFaltas = calc({ cargaHoraria: 60, faltas: [chave("2026-11-16"), chave("2026-11-09")] });
    expect(aulasQueAindaPodeFaltar(comFaltas, resumoFaltas(comFaltas))).toBe(5); // 11h ÷ 2h
  });
  it("sem limite conhecido ⇒ null; estourou ⇒ 0", () => {
    const semCarga = calc();
    expect(aulasQueAindaPodeFaltar(semCarga, resumoFaltas(semCarga))).toBe(null);
    const c = calc({ cargaHoraria: 4 }); // limite 1h
    expect(aulasQueAindaPodeFaltar(c, { ...resumoFaltas(c), horas: 2 })).toBe(0);
  });
});
