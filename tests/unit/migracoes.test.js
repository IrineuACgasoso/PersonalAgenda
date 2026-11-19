// Versionamento do schema: src/utils/migracoes.js (+ integração com sanitizarDados)
import { describe, it, expect } from "vitest";
import { VERSAO_ATUAL, MIGRACOES, versaoDos, ehVersaoFutura, migrarDados } from "../../src/utils/migracoes.js";
import { sanitizarDados } from "../../src/utils/sanitizarDados.js";
import { projetarEventos } from "../../src/utils/projecao.js";
import { appData, backupAntigo, cadeira, rotina, horario, afazer, periodo } from "../fixtures/fabricas.js";

// Congela recursivamente: qualquer mutação da entrada lança erro.
function congelar(o) {
  Object.values(o).forEach((v) => v && typeof v === "object" && congelar(v));
  return Object.freeze(o);
}

describe("registro de migrações", () => {
  it("existe uma migração para cada versão de 1 até VERSAO_ATUAL", () => {
    for (let v = 1; v <= VERSAO_ATUAL; v++) expect(typeof MIGRACOES[v]).toBe("function");
  });
  it("não existe migração além da versão atual (esqueceu de subir VERSAO_ATUAL?)", () => {
    expect(
      Object.keys(MIGRACOES)
        .map(Number)
        .filter((v) => v > VERSAO_ATUAL),
    ).toEqual([]);
  });
});

describe("versaoDos / ehVersaoFutura", () => {
  it("sem versão ou inválida = 0", () => {
    expect(versaoDos({})).toBe(0);
    expect(versaoDos({ versao: "2" })).toBe(0);
    expect(versaoDos({ versao: -1 })).toBe(0);
    expect(versaoDos(null)).toBe(0);
  });
  it("versão futura é detectada", () => {
    expect(ehVersaoFutura({ versao: VERSAO_ATUAL + 1 })).toBe(true);
    expect(ehVersaoFutura({ versao: VERSAO_ATUAL })).toBe(false);
    expect(ehVersaoFutura({})).toBe(false);
  });
});

describe("migrarDados", () => {
  it("dados pré-versionamento (v0) chegam na versão atual", () => {
    expect(migrarDados(backupAntigo()).versao).toBe(VERSAO_ATUAL);
  });
  it("não muta a entrada", () => {
    const entrada = congelar(backupAntigo());
    expect(() => migrarDados(entrada)).not.toThrow();
  });
  it("dados já atuais são devolvidos como estão", () => {
    const d = appData({ versao: VERSAO_ATUAL });
    expect(migrarDados(d)).toBe(d);
  });
  it("dados de versão futura não são tocados", () => {
    const d = { ...appData(), versao: VERSAO_ATUAL + 5, formatoNovo: true };
    expect(migrarDados(d)).toBe(d);
  });
  it("v0 → v1 preserva todo o conteúdo (baseline)", () => {
    const { versao, ...resto } = MIGRACOES[1](backupAntigo());
    expect(resto).toEqual(backupAntigo());
  });
  it("v0 → atual preserva o conteúdo de um backup antigo sem eventos", () => {
    const { versao, ...resto } = migrarDados(backupAntigo());
    // v5 só acrescenta as listas novas (vazias: o backup não tinha compromissos).
    expect(resto).toEqual({ ...backupAntigo(), rotinas: [], compromissos: [] });
  });
});

describe("v1 → v2: chaves de evento por id (#10)", () => {
  // 09/11/2026 e 16/11/2026 são segundas; 06/11/2026 é sexta.
  const ip = cadeira({
    id: "c1",
    nome: "IP",
    horarios: [horario({ id: "h1", dia: 0, inicio: "08:00" }), horario({ id: "h2", dia: 2, inicio: "08:00" })],
    datas: [{ id: "d1", titulo: "Prova | 1", data: "2026-11-20", hora: "10:00" }],
  });
  // Até a v4, "compromisso" era o bloco semanal (hoje: rotina).
  const academia = rotina({
    id: "k1",
    nome: "Academia",
    horarios: [horario({ id: "hk", dia: 4, inicio: "18:00" })],
  });
  const v1 = (extra) => appData({ versao: 1, cadeiras: [ip], compromissos: [academia], ...extra });
  const migrar = (d) => MIGRACOES[2](d);

  it("aulas, compromissos e avaliações viram chaves por id (título com '|' incluso)", () => {
    const d = migrar(
      v1({
        eventosConcluidos: [
          "aulas|2026-11-09|IP|08:00",
          "compromissos|2026-11-06|Academia|18:00",
          "avaliacoes|2026-11-20|Prova | 1|10:00",
        ],
        eventosExcluidos: ["aulas|2026-11-16|IP|08:00"],
      }),
    );
    expect(d.eventosConcluidos).toEqual([
      "aulas|2026-11-09|c1|h1",
      "compromissos|2026-11-06|k1|hk",
      "avaliacoes|c1|d1",
    ]);
    expect(d.eventosExcluidos).toEqual(["aulas|2026-11-16|c1|h1"]);
  });

  it("usa o dia da semana da data para escolher o horário certo", () => {
    // h1 (seg) e h2 (qua) começam às 08:00; 09/11 é segunda ⇒ só h1.
    expect(migrar(v1({ eventosConcluidos: ["aulas|2026-11-09|IP|08:00"] })).eventosConcluidos).toEqual([
      "aulas|2026-11-09|c1|h1",
    ]);
  });

  it("chaves de afazeres passam intactas", () => {
    const chaves = ["afazeres|a1|2026-11-05", "afazeres-semdata|a2"];
    expect(migrar(v1({ eventosExcluidos: chaves })).eventosExcluidos).toEqual(chaves);
  });

  it("nome repetido: a chave antiga valia para todas, então vira uma por cadeira", () => {
    const outra = cadeira({ id: "c2", nome: "IP", horarios: [horario({ id: "hx", dia: 0, inicio: "08:00" })] });
    const d = migrar(appData({ cadeiras: [ip, outra], eventosConcluidos: ["aulas|2026-11-09|IP|08:00"] }));
    expect(d.eventosConcluidos).toEqual(["aulas|2026-11-09|c1|h1", "aulas|2026-11-09|c2|hx"]);
  });

  it("chave órfã (item apagado/renomeado) é descartada; duplicadas viram uma", () => {
    const d = migrar(
      v1({
        eventosConcluidos: ["aulas|2026-11-09|Apagada|08:00", "aulas|2026-11-09|IP|08:00", "aulas|2026-11-09|IP|08:00"],
      }),
    );
    expect(d.eventosConcluidos).toEqual(["aulas|2026-11-09|c1|h1"]);
  });

  it("tolera dados incompletos (backup antigo sem listas)", () => {
    expect(migrar({ eventosConcluidos: ["aulas|2026-11-09|IP|08:00"] }).eventosConcluidos).toEqual([]);
    expect(migrar({}).eventosConcluidos).toBeUndefined();
  });

  it("não muta a entrada", () => {
    const entrada = congelar(v1({ eventosConcluidos: ["aulas|2026-11-09|IP|08:00"] }));
    expect(() => migrar(entrada)).not.toThrow();
  });

  it("ponta a ponta (sanitizar → projetar): o que estava excluído continua excluído", () => {
    const novo = sanitizarDados(
      v1({ eventosExcluidos: ["aulas|2026-11-16|IP|08:00", "avaliacoes|2026-11-20|Prova | 1|10:00"] }),
    );
    expect(novo.versao).toBe(VERSAO_ATUAL);
    const m = projetarEventos({
      inicioISO: "2026-11-01",
      fimISO: "2026-11-30",
      cadeiras: novo.cadeiras,
      eventosExcluidos: novo.eventosExcluidos,
    });
    expect(m["2026-11-16"]).toBeUndefined();
    expect(m["2026-11-20"]).toBeUndefined();
    expect(m["2026-11-09"].map((e) => e.chave)).toEqual(["aulas|2026-11-09|c1|h1"]);
  });
});

describe("integração com sanitizarDados", () => {
  it("dados sem versão saem marcados com a versão atual", () => {
    expect(sanitizarDados(backupAntigo()).versao).toBe(VERSAO_ATUAL);
  });
  it("estado padrão já nasce versionado", () => {
    expect(sanitizarDados(null).versao).toBe(VERSAO_ATUAL);
  });
  it("nunca rebaixa a versão de dados futuros", () => {
    expect(sanitizarDados({ ...appData(), versao: VERSAO_ATUAL + 1 }).versao).toBe(VERSAO_ATUAL + 1);
  });
  it("re-sanitizar dados atuais mantém a versão (idempotente)", () => {
    const uma = sanitizarDados(backupAntigo());
    expect(sanitizarDados(uma)).toEqual(uma);
  });
});

describe("v2 → v3: ocorrências de afazer pela data natural (#14)", () => {
  const migrar = (d) => MIGRACOES[3](d);
  // Quarta 11/11 arrastada para quinta 12/11.
  const rotina = (extra) =>
    afazer({
      id: "r1",
      rotina: { tipo: "dias_especificos", diasSemana: [2] },
      excecoesData: { "2026-11-11": "2026-11-12" },
      ...extra,
    });

  it("concluída pela data de destino ganha também a data natural (destino mantido)", () => {
    const d = migrar(appData({ versao: 2, afazeres: [rotina({ datasConcluidas: ["2026-11-12", "2026-11-04"] })] }));
    expect(d.afazeres[0].datasConcluidas).toEqual(["2026-11-12", "2026-11-04", "2026-11-11"]);
  });

  it("chave de exclusão pela data de destino ganha também a chave da data natural", () => {
    const d = migrar(
      appData({
        versao: 2,
        afazeres: [rotina()],
        eventosExcluidos: ["afazeres|r1|2026-11-12", "aulas|2026-11-09|c1|h1"],
      }),
    );
    expect(d.eventosExcluidos).toEqual(["afazeres|r1|2026-11-12", "afazeres|r1|2026-11-11", "aulas|2026-11-09|c1|h1"]);
  });

  it("sem exceções, nada muda", () => {
    const entrada = appData({
      versao: 2,
      afazeres: [afazer({ id: "a", datasConcluidas: ["2026-11-05"] })],
      eventosExcluidos: ["afazeres|a|2026-11-05"],
    });
    const d = migrar(entrada);
    expect(d.afazeres).toEqual(entrada.afazeres);
    expect(d.eventosExcluidos).toEqual(entrada.eventosExcluidos);
  });

  it("tolera dados incompletos e não muta a entrada", () => {
    expect(() => migrar({})).not.toThrow();
    expect(() =>
      migrar({ afazeres: [null, { id: "x" }], eventosExcluidos: ["afazeres|zz|2026-01-01", 5] }),
    ).not.toThrow();
    expect(() => migrar(congelar(appData({ afazeres: [rotina({ datasConcluidas: ["2026-11-12"] })] })))).not.toThrow();
  });

  it("ponta a ponta: a ocorrência concluída antes da migração continua concluída", () => {
    const novo = sanitizarDados(appData({ versao: 2, afazeres: [rotina({ datasConcluidas: ["2026-11-12"] })] }));
    const [ev] = projetarEventos({ inicioISO: "2026-11-01", fimISO: "2026-11-30", afazeres: novo.afazeres })[
      "2026-11-12"
    ];
    expect(ev.feito).toBe(true);
  });
});

describe("v3 → v4: vigência sai do período e vai para as cadeiras (#19/#20)", () => {
  const migrar = (d) => MIGRACOES[4](d);
  const comDatas = periodo({ id: "p", dataInicio: "2026-08-01", dataFim: "2026-12-15" });

  it("cadeira sem datas herda as do período; o período perde as datas", () => {
    const d = migrar(appData({ versao: 3, periodos: [comDatas], cadeiras: [cadeira({ id: "c", periodoId: "p" })] }));
    expect(d.cadeiras[0]).toMatchObject({ dataInicio: "2026-08-01", dataFim: "2026-12-15" });
    expect(d.periodos[0]).toEqual({ id: "p", nome: comDatas.nome });
  });

  it("não sobrescreve a data que a cadeira já tem (campo a campo)", () => {
    const c = cadeira({ id: "c", periodoId: "p", dataFim: "2027-01-10" });
    const d = migrar(appData({ versao: 3, periodos: [comDatas], cadeiras: [c] }));
    expect(d.cadeiras[0]).toMatchObject({ dataInicio: "2026-08-01", dataFim: "2027-01-10" });
  });

  it("período sem datas (ou cadeira órfã) não ganha campo nenhum", () => {
    const d = migrar(
      appData({
        versao: 3,
        periodos: [periodo({ id: "p" })],
        cadeiras: [cadeira({ id: "c", periodoId: "p" }), cadeira({ id: "o", periodoId: "sumiu" })],
      }),
    );
    expect("dataInicio" in d.cadeiras[0]).toBe(false);
    expect("dataFim" in d.cadeiras[1]).toBe(false);
  });

  it("tolera dados incompletos e não muta a entrada", () => {
    expect(() => migrar({})).not.toThrow();
    expect(() => migrar({ periodos: [null, 3], cadeiras: [null, { id: "x" }] })).not.toThrow();
    expect(() =>
      migrar(congelar(appData({ periodos: [comDatas], cadeiras: [cadeira({ periodoId: "p" })] }))),
    ).not.toThrow();
  });

  it("ponta a ponta: o calendário mostra as mesmas aulas de antes da migração", () => {
    const c = cadeira({ id: "c", periodoId: "p", nome: "IP", horarios: [horario({ id: "h", dia: 0 })] });
    const novo = sanitizarDados(
      appData({ versao: 3, periodos: [{ ...comDatas, dataFim: "2026-11-10" }], cadeiras: [c] }),
    );
    expect(novo.versao).toBe(VERSAO_ATUAL);
    const m = projetarEventos({ inicioISO: "2026-11-01", fimISO: "2026-11-30", cadeiras: novo.cadeiras });
    expect(Object.keys(m).sort()).toEqual(["2026-11-02", "2026-11-09"]);
  });
});

describe("v4 → v5: rotinas, compromissos pontuais e data de fim (Fase 5)", () => {
  const migrar = (d) => MIGRACOES[5](d);
  // Afazer no formato da v4 (com hora e número de repetições).
  const afazerV4 = (extra = {}) => {
    const { rotina: r, ...resto } = extra;
    return {
      id: "af",
      nome: "Afazer",
      data: "",
      hora: "",
      cor: "#221e1e",
      urgencia: 1,
      feito: false,
      datasConcluidas: [],
      excecoesData: {},
      rotina: { tipo: "nenhuma", intervaloDias: 1, totalRepeticoes: "", diasSemana: [], ...(r || {}) },
      ...resto,
    };
  };
  const academia = {
    id: "k1",
    periodoId: "per-x",
    nome: "Academia",
    cor: "#10b981",
    horarios: [horario({ id: "hk", dia: 4 })],
  };

  it("compromissos semanais viram rotinas e as chaves 'compromissos|' viram 'rotinas|'", () => {
    const d = migrar(
      appData({
        versao: 4,
        compromissos: [academia],
        eventosConcluidos: ["compromissos|2026-11-06|k1|hk", "aulas|2026-11-09|c1|h1"],
        eventosExcluidos: ["compromissos|2026-11-13|k1|hk", "afazeres|af|2026-11-01"],
      }),
    );
    expect(d.rotinas).toEqual([academia]);
    expect(d.compromissos).toEqual([]);
    expect(d.eventosConcluidos).toEqual(["rotinas|2026-11-06|k1|hk", "aulas|2026-11-09|c1|h1"]);
    expect(d.eventosExcluidos).toEqual(["rotinas|2026-11-13|k1|hk", "afazeres|af|2026-11-01"]);
  });

  it("afazer sem repetição com data + hora vira compromisso (mesmo id, feito e concluidoEm)", () => {
    const d = migrar(
      appData({
        versao: 4,
        afazeres: [
          afazerV4({
            id: "x",
            nome: "Dentista",
            data: "2026-11-20",
            hora: "14:30",
            cor: "#f00",
            feito: true,
            concluidoEm: 9,
          }),
          afazerV4({ id: "y", nome: "Sem hora", data: "2026-11-21" }),
        ],
      }),
    );
    expect(d.compromissos).toEqual([
      { id: "x", nome: "Dentista", cor: "#f00", data: "2026-11-20", inicio: "14:30", feito: true, concluidoEm: 9 },
    ]);
    expect(d.afazeres.map((a) => a.id)).toEqual(["y"]);
  });

  it("afazer recorrente com hora continua afazer e perde a hora; todos perdem o campo hora", () => {
    const d = migrar(
      appData({
        versao: 4,
        afazeres: [
          afazerV4({ id: "r", data: "2026-11-02", hora: "07:00", rotina: { tipo: "diaria" } }),
          afazerV4({ id: "s", hora: "08:00" }), // hora sem data: não dá compromisso
        ],
      }),
    );
    expect(d.compromissos).toEqual([]);
    expect(d.afazeres.map((a) => a.id)).toEqual(["r", "s"]);
    d.afazeres.forEach((a) => expect("hora" in a).toBe(false));
  });

  it("número de repetições vira data de fim (dia da última ocorrência)", () => {
    const fimDe = (rotina, data = "2026-11-02") =>
      migrar(appData({ versao: 4, afazeres: [afazerV4({ data, rotina })] })).afazeres[0].rotina;
    expect(fimDe({ tipo: "diaria", totalRepeticoes: 3 })).toEqual({
      tipo: "diaria",
      intervaloDias: 1,
      diasSemana: [],
      dataFim: "2026-11-04",
    });
    expect(fimDe({ tipo: "semanal", totalRepeticoes: 3 }).dataFim).toBe("2026-11-16");
    expect(fimDe({ tipo: "quinzenal", totalRepeticoes: 2 }).dataFim).toBe("2026-11-17");
    expect(fimDe({ tipo: "personalizada", intervaloDias: 10, totalRepeticoes: 3 }).dataFim).toBe("2026-11-22");
    expect(fimDe({ tipo: "mensal", totalRepeticoes: 2 }, "2026-01-31").dataFim).toBe("2026-02-28");
    // 01/11 é domingo; sextas: 06 e 13
    expect(fimDe({ tipo: "dias_especificos", diasSemana: [4], totalRepeticoes: 2 }, "2026-11-01").dataFim).toBe(
      "2026-11-13",
    );
  });

  it("sem como calcular (sem data-base ou sem limite), a repetição fica sem fim", () => {
    const r1 = migrar(
      appData({
        versao: 4,
        afazeres: [afazerV4({ rotina: { tipo: "dias_especificos", diasSemana: [1], totalRepeticoes: 4 } })],
      }),
    );
    expect("dataFim" in r1.afazeres[0].rotina).toBe(false);
    expect("totalRepeticoes" in r1.afazeres[0].rotina).toBe(false);
    const r2 = migrar(appData({ versao: 4, afazeres: [afazerV4({ data: "2026-11-02", rotina: { tipo: "diaria" } })] }));
    expect("dataFim" in r2.afazeres[0].rotina).toBe(false);
  });

  it("tolera dados incompletos e não muta a entrada", () => {
    expect(() => migrar({})).not.toThrow();
    expect(migrar({}).rotinas).toEqual([]);
    expect(() => migrar({ afazeres: [null, 3, { id: "z" }], compromissos: "lixo" })).not.toThrow();
    expect(() =>
      migrar(
        congelar(
          appData({ versao: 4, compromissos: [academia], afazeres: [afazerV4({ data: "2026-11-02", hora: "09:00" })] }),
        ),
      ),
    ).not.toThrow();
  });

  it("ponta a ponta: o que aparecia no calendário continua aparecendo (e marcado)", () => {
    const antes = appData({
      versao: 4,
      compromissos: [academia],
      afazeres: [
        afazerV4({ id: "x", nome: "Dentista", data: "2026-11-20", hora: "14:30" }),
        afazerV4({ id: "d", nome: "Estudar", data: "2026-11-16", rotina: { tipo: "diaria", totalRepeticoes: 5 } }),
      ],
      eventosConcluidos: ["compromissos|2026-11-06|k1|hk"],
    });
    const novo = sanitizarDados(antes);
    expect(novo.versao).toBe(VERSAO_ATUAL);
    const m = projetarEventos({
      inicioISO: "2026-11-01",
      fimISO: "2026-11-30",
      rotinas: novo.rotinas,
      compromissos: novo.compromissos,
      afazeres: novo.afazeres,
    });
    const chaveAcademia = m["2026-11-06"].find((e) => e.tipo === "rotinas").chave;
    expect(novo.eventosConcluidos).toContain(chaveAcademia);
    const compromissosDia20 = m["2026-11-20"].filter((e) => e.tipo === "compromissos");
    expect(compromissosDia20.map((e) => [e.titulo, e.hora])).toEqual([["Dentista", "14:30"]]);
    const diasEstudo = Object.keys(m)
      .filter((d) => m[d].some((e) => e.titulo === "Estudar"))
      .sort();
    expect(diasEstudo).toEqual(["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"]);
  });
});

describe("v5 → v6: rotina sem período, com vigência herdada (#56)", () => {
  const migrar = (d) => MIGRACOES[6](d);
  const doPeriodo = (periodoId, dataInicio, dataFim) =>
    cadeira({ periodoId, ...(dataInicio ? { dataInicio } : {}), ...(dataFim ? { dataFim } : {}) });

  it("tira periodoId e herda menor início / maior fim das cadeiras do período", () => {
    const d = migrar(
      appData({
        versao: 5,
        cadeiras: [
          doPeriodo("p", "2026-08-10", "2026-12-01"),
          doPeriodo("p", "2026-08-03", "2026-12-15"),
          doPeriodo("p"), // sem datas: não conta
          doPeriodo("outro", "2020-01-01", "2030-01-01"),
        ],
        rotinas: [{ id: "r", periodoId: "p", nome: "Academia", cor: "#fff", horarios: [] }],
      }),
    );
    expect(d.rotinas[0]).toEqual({
      id: "r",
      nome: "Academia",
      cor: "#fff",
      horarios: [],
      dataInicio: "2026-08-03",
      dataFim: "2026-12-15",
    });
  });

  it("período sem datas, sumido ou rotina sem período ⇒ sem limites", () => {
    const d = migrar(
      appData({
        cadeiras: [doPeriodo("p")],
        rotinas: [
          { id: "a", periodoId: "p", horarios: [] },
          { id: "b", periodoId: "sumiu", horarios: [] },
          { id: "c", horarios: [] },
        ],
      }),
    );
    d.rotinas.forEach((r) => {
      expect("periodoId" in r).toBe(false);
      expect("dataInicio" in r || "dataFim" in r).toBe(false);
    });
  });

  it("só um dos lados ⇒ herda só ele; datas incoerentes ⇒ nenhuma", () => {
    const so = migrar(appData({ cadeiras: [doPeriodo("p", "2026-08-03")], rotinas: [{ id: "a", periodoId: "p" }] }));
    expect(so.rotinas[0]).toEqual({ id: "a", dataInicio: "2026-08-03" });
    const incoerente = migrar(
      appData({
        cadeiras: [doPeriodo("p", null, "2026-03-01"), doPeriodo("p", "2026-05-01")],
        rotinas: [{ id: "a", periodoId: "p" }],
      }),
    );
    expect(incoerente.rotinas[0]).toEqual({ id: "a" });
  });

  it("não sobrescreve datas que a rotina já tenha", () => {
    const d = migrar(
      appData({
        cadeiras: [doPeriodo("p", "2026-08-03", "2026-12-15")],
        rotinas: [{ id: "a", periodoId: "p", dataFim: "2026-10-01" }],
      }),
    );
    expect(d.rotinas[0]).toEqual({ id: "a", dataInicio: "2026-08-03", dataFim: "2026-10-01" });
  });

  it("é pura e tolera rotinas ausentes ou com lixo", () => {
    const entrada = congelar(
      appData({ cadeiras: [doPeriodo("p", "2026-08-03")], rotinas: [{ id: "a", periodoId: "p" }] }),
    );
    expect(() => migrar(entrada)).not.toThrow();
    expect(migrar({ periodos: [] }).rotinas).toBeUndefined();
    expect(migrar(appData({ rotinas: [null, 5] })).rotinas).toEqual([null, 5]);
  });

  it("ponta a ponta: rotina de período antigo não reaparece fora da vigência", () => {
    const antes = appData({
      versao: 5,
      periodos: [periodo({ id: "velho" }), periodo({ id: "per-x" })],
      cadeiras: [doPeriodo("velho", "2026-03-01", "2026-07-15")],
      rotinas: [{ id: "r", periodoId: "velho", nome: "Inglês", cor: "#fff", horarios: [horario({ dia: 4 })] }],
    });
    const novo = sanitizarDados(antes);
    expect(novo.versao).toBe(VERSAO_ATUAL);
    const nov = projetarEventos({ inicioISO: "2026-11-01", fimISO: "2026-11-30", rotinas: novo.rotinas });
    expect(
      Object.values(nov)
        .flat()
        .filter((e) => e.tipo === "rotinas"),
    ).toEqual([]);
    const jun = projetarEventos({ inicioISO: "2026-06-01", fimISO: "2026-06-30", rotinas: novo.rotinas });
    expect(
      Object.values(jun)
        .flat()
        .filter((e) => e.tipo === "rotinas").length,
    ).toBe(4);
  });
});
