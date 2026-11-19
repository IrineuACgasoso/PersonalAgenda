// Versionamento do schema: src/utils/migracoes.js (+ integração com sanitizarDados)
import { describe, it, expect } from "vitest";
import { VERSAO_ATUAL, MIGRACOES, versaoDos, ehVersaoFutura, migrarDados } from "../../src/utils/migracoes.js";
import { sanitizarDados } from "../../src/utils/sanitizarDados.js";
import { projetarEventos } from "../../src/utils/projecao.js";
import { appData, backupAntigo, cadeira, compromisso, horario, afazer } from "../fixtures/fabricas.js";

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
    expect(Object.keys(MIGRACOES).map(Number).filter((v) => v > VERSAO_ATUAL)).toEqual([]);
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
    expect(resto).toEqual(backupAntigo());
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
  const academia = compromisso({ id: "k1", nome: "Academia", horarios: [horario({ id: "hk", dia: 4, inicio: "18:00" })] });
  const v1 = (extra) => appData({ versao: 1, cadeiras: [ip], compromissos: [academia], ...extra });
  const migrar = (d) => MIGRACOES[2](d);

  it("aulas, compromissos e avaliações viram chaves por id (título com '|' incluso)", () => {
    const d = migrar(
      v1({
        eventosConcluidos: ["aulas|2026-11-09|IP|08:00", "compromissos|2026-11-06|Academia|18:00", "avaliacoes|2026-11-20|Prova | 1|10:00"],
        eventosExcluidos: ["aulas|2026-11-16|IP|08:00"],
      })
    );
    expect(d.eventosConcluidos).toEqual(["aulas|2026-11-09|c1|h1", "compromissos|2026-11-06|k1|hk", "avaliacoes|c1|d1"]);
    expect(d.eventosExcluidos).toEqual(["aulas|2026-11-16|c1|h1"]);
  });

  it("usa o dia da semana da data para escolher o horário certo", () => {
    // h1 (seg) e h2 (qua) começam às 08:00; 09/11 é segunda ⇒ só h1.
    expect(migrar(v1({ eventosConcluidos: ["aulas|2026-11-09|IP|08:00"] })).eventosConcluidos).toEqual(["aulas|2026-11-09|c1|h1"]);
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
    const d = migrar(v1({ eventosConcluidos: ["aulas|2026-11-09|Apagada|08:00", "aulas|2026-11-09|IP|08:00", "aulas|2026-11-09|IP|08:00"] }));
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
    const novo = sanitizarDados(v1({ eventosExcluidos: ["aulas|2026-11-16|IP|08:00", "avaliacoes|2026-11-20|Prova | 1|10:00"] }));
    expect(novo.versao).toBe(VERSAO_ATUAL);
    const m = projetarEventos({ inicioISO: "2026-11-01", fimISO: "2026-11-30", cadeiras: novo.cadeiras, eventosExcluidos: novo.eventosExcluidos });
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
    afazer({ id: "r1", rotina: { tipo: "dias_especificos", diasSemana: [2] }, excecoesData: { "2026-11-11": "2026-11-12" }, ...extra });

  it("concluída pela data de destino ganha também a data natural (destino mantido)", () => {
    const d = migrar(appData({ versao: 2, afazeres: [rotina({ datasConcluidas: ["2026-11-12", "2026-11-04"] })] }));
    expect(d.afazeres[0].datasConcluidas).toEqual(["2026-11-12", "2026-11-04", "2026-11-11"]);
  });

  it("chave de exclusão pela data de destino ganha também a chave da data natural", () => {
    const d = migrar(appData({ versao: 2, afazeres: [rotina()], eventosExcluidos: ["afazeres|r1|2026-11-12", "aulas|2026-11-09|c1|h1"] }));
    expect(d.eventosExcluidos).toEqual(["afazeres|r1|2026-11-12", "afazeres|r1|2026-11-11", "aulas|2026-11-09|c1|h1"]);
  });

  it("sem exceções, nada muda", () => {
    const entrada = appData({ versao: 2, afazeres: [afazer({ id: "a", datasConcluidas: ["2026-11-05"] })], eventosExcluidos: ["afazeres|a|2026-11-05"] });
    const d = migrar(entrada);
    expect(d.afazeres).toEqual(entrada.afazeres);
    expect(d.eventosExcluidos).toEqual(entrada.eventosExcluidos);
  });

  it("tolera dados incompletos e não muta a entrada", () => {
    expect(() => migrar({})).not.toThrow();
    expect(() => migrar({ afazeres: [null, { id: "x" }], eventosExcluidos: ["afazeres|zz|2026-01-01", 5] })).not.toThrow();
    expect(() => migrar(congelar(appData({ afazeres: [rotina({ datasConcluidas: ["2026-11-12"] })] })))).not.toThrow();
  });

  it("ponta a ponta: a ocorrência concluída antes da migração continua concluída", () => {
    const novo = sanitizarDados(appData({ versao: 2, afazeres: [rotina({ datasConcluidas: ["2026-11-12"] })] }));
    const [ev] = projetarEventos({ inicioISO: "2026-11-01", fimISO: "2026-11-30", afazeres: novo.afazeres })["2026-11-12"];
    expect(ev.feito).toBe(true);
  });
});
