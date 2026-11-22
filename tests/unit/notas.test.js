// #35 Notas e média por cadeira: src/utils/notas.js
// Os dois casos reais do usuário: Lógica (provas + MPs como bônus) e a cadeira
// por unidades (60% prova, 30% projeto, 10% questionários).
import { describe, it, expect } from "vitest";
import {
  sanitizarItensNota,
  mediaParcial,
  notasPendentes,
  notaNecessaria,
  situacaoDasNotas,
  formatarNota,
  textoNecessaria,
  acharItem,
  profundidadeDe,
  inserirItem,
  editarItem,
  removerItem,
  duplicarItem,
  proximoTitulo,
  notasPorData,
  valorDoGrupo,
  moverItem,
  destinosPossiveis,
  resumoCurtoDasNotas,
  boletimDasNotas,
  tomDaSituacao,
} from "../../src/utils/notas.js";

const nota = (id, modo, valor, n, extra = {}) => ({ id, titulo: id, tipo: "nota", modo, valor, nota: n, ...extra });
const grupo = (id, modo, valor, itens) => ({ id, titulo: id, tipo: "grupo", modo, valor, itens });

// Lógica: Prova 1 = P1 + (MP1 + MP2 valem +1 juntas); Prova 2 = P2 + MP3 (+1).
// Desde a v7 o ponto extra guarda os PONTOS que somou (8 numa MP de 0,5 ⇒ 0,4).
const logica = ({ p1, mp1, mp2, p2, mp3 } = {}) => [
  grupo("Prova 1", "peso", 1, [
    nota("P1", "peso", 1, p1),
    nota("MP1", "bonus", 0.5, mp1),
    nota("MP2", "bonus", 0.5, mp2),
  ]),
  grupo("Prova 2", "peso", 1, [nota("P2", "peso", 1, p2), nota("MP3", "bonus", 1, mp3)]),
];

// Unidades: 60/30/10.
const unidade = (n, { prova, projeto, quest } = {}) =>
  grupo(`Unidade ${n}`, "peso", 1, [
    nota(`Prova ${n}`, "peso", 60, prova),
    nota(`Projeto ${n}`, "peso", 30, projeto),
    nota(`Questionários ${n}`, "peso", 10, quest),
  ]);

describe("cálculo — Lógica (bônus nas provas)", () => {
  it("as MPs somam no grupo sem bagunçar a média", () => {
    const itens = logica({ p1: 6, mp1: 0.4, mp2: 0.5, p2: 7, mp3: 1 });
    expect(valorDoGrupo(itens[0])).toBeCloseTo(6.9);
    expect(valorDoGrupo(itens[1])).toBeCloseTo(8);
    expect(situacaoDasNotas(itens)).toMatchObject({ estado: "aprovado" });
    expect(situacaoDasNotas(itens).media).toBeCloseTo(7.45);
  });

  it("ponto extra soma o valor lançado, mesmo passando de 1 ponto", () => {
    const itens = [grupo("Prova", "peso", 1, [nota("P", "peso", 1, 6), nota("Lista", "bonus", 1, 1.5)])];
    expect(valorDoGrupo(itens[0])).toBeCloseTo(7.5);
    // O `valor` do item de bônus não entra mais na conta.
    const comValor = [grupo("Prova", "peso", 1, [nota("P", "peso", 1, 6), nota("Lista", "bonus", 0.5, 1.5)])];
    expect(valorDoGrupo(comValor[0])).toBeCloseTo(7.5);
  });

  it("bônus nunca passa de 10", () => {
    const itens = logica({ p1: 10, mp1: 0.5, mp2: 0.5, p2: 10, mp3: 1 });
    expect(valorDoGrupo(itens[0])).toBe(10);
  });

  it("quanto precisa na P2: MP3 pendente conta como 0 (conservador)", () => {
    const itens = logica({ p1: 6, mp1: 0.4, mp2: 0.5 });
    expect(notasPendentes(itens).map((x) => x.id)).toEqual(["P2"]); // MP3 é bônus: não entra
    expect(notaNecessaria(itens, 7)).toBeCloseTo(7.1);
    // Com a MP3 = 10 já lançada, precisa de 1 ponto a menos.
    expect(notaNecessaria(logica({ p1: 6, mp1: 0.4, mp2: 0.5, mp3: 1 }), 7)).toBeCloseTo(6.1);
  });

  it("grupo vazio conta como pendente (não dá 'Aprovado' antes da hora)", () => {
    const itens = [logica({ p1: 6, mp1: 0.4, mp2: 0.5 })[0], grupo("Prova 2", "peso", 1, [])];
    expect(notasPendentes(itens).map((x) => x.id)).toEqual(["Prova 2"]);
    const s = situacaoDasNotas(itens);
    expect(s.estado).toBe("andamento");
    expect(s.paraPassar).toBeCloseTo(7.1);
  });

  it("parcial: grupo sem a prova ainda não tem valor (o bônus sozinho não vira média)", () => {
    const itens = logica({ mp1: 0.5, mp2: 0.5, p2: 8 });
    expect(valorDoGrupo(itens[0])).toBe(null);
    expect(mediaParcial(itens)).toBeCloseTo(8);
  });
});

describe("cálculo — unidades 60/30/10", () => {
  it("pesos em porcentagem viram média ponderada", () => {
    const itens = [unidade(1, { prova: 8, projeto: 10, quest: 5 }), unidade(2, { prova: 6, projeto: 9, quest: 10 })];
    // U1 = 4,8 + 3 + 0,5 = 8,3 · U2 = 3,6 + 2,7 + 1 = 7,3 → 7,8
    expect(situacaoDasNotas(itens).media).toBeCloseTo(7.8);
  });

  it("parcial usa só o que saiu (pesos renormalizados)", () => {
    const itens = [unidade(1, { prova: 8 }), unidade(2)];
    expect(mediaParcial(itens)).toBeCloseTo(8);
  });

  it("nota necessária igual em todas as pendentes", () => {
    const itens = [unidade(1, { prova: 8, projeto: 10, quest: 5 }), unidade(2)];
    // (8,3 + x) / 2 ≥ 7 ⇒ x ≥ 5,7
    expect(notaNecessaria(itens, 7)).toBeCloseTo(5.7);
    expect(notaNecessaria(itens, 3)).toBe(0); // já garantido ir à final no mínimo
  });

  it("impossível e nada pendente", () => {
    const ruim = [nota("P1", "peso", 1, 0), nota("P2", "peso", 1, 0), nota("P3", "peso", 1)];
    expect(notaNecessaria(ruim, 7)).toBe(Infinity);
    expect(notaNecessaria([nota("P1", "peso", 1, 5)], 7)).toBe(null);
  });
});

describe("situação (regra da UFPE)", () => {
  it("sem notas / em andamento", () => {
    expect(situacaoDasNotas([])).toEqual({ estado: "sem-notas" });
    const s = situacaoDasNotas(logica({ p1: 6, mp1: 0.4, mp2: 0.5 }));
    expect(s.estado).toBe("andamento");
    expect(s.pendentes).toBe(1);
  });

  it("≥ 7 aprovado · < 3 reprovado", () => {
    expect(situacaoDasNotas([nota("P", "peso", 1, 7)]).estado).toBe("aprovado");
    expect(situacaoDasNotas([nota("P", "peso", 1, 2.9)]).estado).toBe("reprovado");
  });

  it("entre 3 e 7: final precisa de 10 − média; com a final, (média + final)/2 ≥ 5", () => {
    expect(situacaoDasNotas([nota("P", "peso", 1, 6)])).toMatchObject({ estado: "final", precisaNaFinal: 4 });
    expect(situacaoDasNotas([nota("P", "peso", 1, 3)])).toMatchObject({ estado: "final", precisaNaFinal: 7 });
    expect(situacaoDasNotas([nota("P", "peso", 1, 6)], 4)).toMatchObject({ estado: "aprovado", mediaFinal: 5 });
    expect(situacaoDasNotas([nota("P", "peso", 1, 6)], 3.9).estado).toBe("reprovado");
  });
});

describe("textos", () => {
  it("formatarNota corta, não arredonda para cima", () => {
    expect(formatarNota(6.996)).toBe("6,99");
    expect(formatarNota(7)).toBe("7,0");
    expect(formatarNota(7.45)).toBe("7,45");
    expect(formatarNota(6.9)).toBe("6,9");
    expect(formatarNota(null)).toBe("–");
  });
  it("textoNecessaria", () => {
    expect(textoNecessaria(0)).toBe("já garantido");
    expect(textoNecessaria(Infinity)).toBe("não dá mais");
    expect(textoNecessaria(5.7)).toBe("5,7 em cada");
  });
});

describe("resumoCurtoDasNotas (card)", () => {
  it("um texto por situação", () => {
    expect(resumoCurtoDasNotas({ estado: "sem-notas" })).toBe(null);
    expect(resumoCurtoDasNotas(situacaoDasNotas(logica({ p1: 6, mp1: 0.4, mp2: 0.5 })))).toEqual({
      texto: "Média parcial 6,9",
      tom: "neutro",
    });
    expect(resumoCurtoDasNotas(situacaoDasNotas([nota("P", "peso", 1, 6)])).texto).toBe(
      "Média 6,0 · Final: precisa de 4,0",
    );
    expect(resumoCurtoDasNotas(situacaoDasNotas([nota("P", "peso", 1, 6)], 5)).texto).toBe("Média 5,5 · Aprovado");
  });
});

describe("sanitizarItensNota", () => {
  it("normaliza tipo/modo/valor/nota e descarta lixo", () => {
    const r = sanitizarItensNota([null, "x", { id: "a", titulo: "P1", nota: "8,5", valor: -2, modo: "?" }]);
    expect(r).toEqual([
      { id: "a", titulo: "P1", tipo: "nota", modo: "peso", valor: 1, nota: 8.5, itens: undefined, dataId: undefined },
    ]);
    expect(sanitizarItensNota([{ id: "b", nota: 15 }])[0].nota).toBe(10);
    expect(sanitizarItensNota("nada")).toEqual([]);
  });

  it("limita a profundidade a 3 níveis (o 3º vira nota)", () => {
    const fundo = [
      { id: "g1", tipo: "grupo", itens: [{ id: "g2", tipo: "grupo", itens: [{ id: "g3", tipo: "grupo" }] }] },
    ];
    const r = sanitizarItensNota(fundo);
    expect(r[0].itens[0].itens[0].tipo).toBe("nota");
  });

  it("preserva o vínculo com a data importante", () => {
    expect(sanitizarItensNota([{ id: "a", dataId: "d1" }])[0].dataId).toBe("d1");
  });
});

describe("edição da árvore", () => {
  const base = () => logica({ p1: 6 });

  it("acha, mede profundidade, insere e edita em qualquer nível", () => {
    const itens = base();
    expect(acharItem(itens, "MP2").valor).toBe(0.5);
    expect(profundidadeDe(itens, "Prova 1")).toBe(1);
    expect(profundidadeDe(itens, "MP2")).toBe(2);
    const com = inserirItem(itens, "Prova 2", nota("MP4", "bonus", 1));
    expect(acharItem(com, "Prova 2").itens.map((x) => x.id)).toEqual(["P2", "MP3", "MP4"]);
    const editado = editarItem(itens, "P1", { nota: 9 });
    expect(acharItem(editado, "P1").nota).toBe(9);
    expect(acharItem(itens, "P1").nota).toBe(6); // não muta
  });

  it("remover devolve onde estava; inserir no índice desfaz", () => {
    const { itens, removido } = removerItem(base(), "MP1");
    expect(removido).toMatchObject({ idPai: "Prova 1", indice: 1 });
    expect(acharItem(itens, "MP1")).toBe(null);
    const volta = inserirItem(itens, removido.idPai, removido.item, removido.indice);
    expect(acharItem(volta, "Prova 1").itens.map((x) => x.id)).toEqual(["P1", "MP1", "MP2"]);
  });

  it("duplicar grupo: Unidade 1 → Unidade 2, filhos renumerados, notas vazias, sem vínculo", () => {
    let n = 0;
    const itens = [{ ...unidade(1, { prova: 8 }), itens: [nota("Prova 1", "peso", 60, 8, { dataId: "d1" })] }];
    const r = duplicarItem(itens, "Unidade 1", () => `novo${++n}`);
    expect(r.map((x) => x.titulo)).toEqual(["Unidade 1", "Unidade 2"]);
    expect(r[1].itens[0]).toMatchObject({ titulo: "Prova 2", nota: undefined, dataId: undefined, valor: 60 });
    expect(r[1].id).not.toBe("Unidade 1");
  });

  it("mover para outro grupo / para o topo; nunca para dentro de si", () => {
    const itens = base();
    const r = moverItem(itens, "MP3", "Prova 1");
    expect(acharItem(r, "Prova 1").itens.map((x) => x.id)).toEqual(["P1", "MP1", "MP2", "MP3"]);
    expect(acharItem(r, "Prova 2").itens.map((x) => x.id)).toEqual(["P2"]);
    expect(moverItem(itens, "P1", null).map((x) => x.id)).toEqual(["Prova 1", "Prova 2", "P1"]);
    expect(moverItem(itens, "Prova 1", "Prova 1")).toBe(itens);
    expect(moverItem(itens, "P1", "P2")).toBe(itens); // P2 não é grupo
  });

  it("não passa de 3 níveis ao mover", () => {
    const itens = [grupo("A", "peso", 1, [grupo("A1", "peso", 1, [nota("x", "peso", 1)])]), grupo("B", "peso", 1, [])];
    expect(moverItem(itens, "A", "B")).toBe(itens); // A tem 3 níveis; dentro de B seriam 4
    expect(destinosPossiveis(itens, "x").map((d) => d.id)).toEqual(["A", "A1", "B"]);
  });

  it("proximoTitulo", () => {
    expect(proximoTitulo("Unidade 1")).toBe("Unidade 2");
    expect(proximoTitulo("MP 9")).toBe("MP 10");
    expect(proximoTitulo("Questionários")).toBe("Questionários");
    expect(proximoTitulo("Provas", true)).toBe("Provas (cópia)");
  });

  it("notasPorData acha a nota ligada a cada data", () => {
    const itens = [grupo("G", "peso", 1, [nota("P1", "peso", 1, 7, { dataId: "d1" })])];
    expect(notasPorData(itens).d1.id).toBe("P1");
  });
});

describe("boletim (tela da cadeira)", () => {
  it("uma coluna por grupo: % inteiro no grupo, nota, quanto somou; extras no fim", () => {
    const itens = [
      grupo("Unidade 1", "peso", 1, [
        nota("MP", "bonus", 1, 0.3),
        nota("Prova 1", "peso", 60, 8),
        nota("Projeto 1", "peso", 30, 10),
        nota("Quest 1", "peso", 10),
      ]),
      unidade(2),
    ];
    const [u1, u2] = boletimDasNotas(itens);
    expect(u1).toMatchObject({ titulo: "Unidade 1", percentual: 50, pendente: true });
    expect(u1.linhas.map((l) => l.id)).toEqual(["Prova 1", "Projeto 1", "Quest 1", "MP"]);
    expect(u1.linhas[0]).toMatchObject({ percentual: 60, nota: 8, pendente: false });
    expect(u1.linhas[0].contribuicao).toBeCloseTo(4.8);
    expect(u1.linhas[2]).toMatchObject({ percentual: 10, nota: null, contribuicao: null, pendente: true });
    expect(u1.linhas[3]).toMatchObject({ bonus: true, percentual: null, contribuicao: 0.3 });
    // Parcial do grupo: (4,8 + 3) / 0,9 + 0,3
    expect(u1.valor).toBeCloseTo(8.967, 2);
    expect(u2).toMatchObject({ valor: null, contribuicao: null, pendente: true });
  });

  it("percentuais sem decimais", () => {
    const [col] = boletimDasNotas([
      grupo("G", "peso", 1, [nota("a", "peso", 1, 7), nota("b", "peso", 1, 7), nota("c", "peso", 1, 7)]),
    ]);
    expect(col.linhas.map((l) => l.percentual)).toEqual([33, 33, 33]);
  });

  it("notas soltas no topo vão juntas numa coluna 'Avaliações', com % da média", () => {
    const itens = [
      nota("P1", "peso", 1, 6),
      grupo("Projeto", "peso", 2, [nota("Entrega", "peso", 1, 9)]),
      nota("P2", "peso", 1),
    ];
    const cols = boletimDasNotas(itens);
    expect(cols.map((c) => c.titulo)).toEqual(["Avaliações", "Projeto"]);
    expect(cols[0]).toMatchObject({ soltas: true, percentual: 50, pendente: true });
    expect(cols[0].linhas.map((l) => l.percentual)).toEqual([25, 25]);
    expect(cols[0].contribuicao).toBeCloseTo(1.5);
    expect(cols[1]).toMatchObject({ percentual: 50, valor: 9 });
    expect(cols[1].contribuicao).toBeCloseTo(4.5);
  });

  it("subgrupo abre as suas linhas logo abaixo, um nível para dentro", () => {
    const itens = [
      grupo("U1", "peso", 1, [grupo("Listas", "peso", 1, [nota("L1", "peso", 1, 10)]), nota("P", "peso", 1, 6)]),
    ];
    const [col] = boletimDasNotas(itens);
    expect(col.linhas.map((l) => [l.id, l.nivel, l.grupo])).toEqual([
      ["Listas", 1, true],
      ["L1", 2, false],
      ["P", 1, false],
    ]);
    expect(col.linhas[0]).toMatchObject({ nota: 10, contribuicao: 5, percentual: 50 });
  });

  it("cor da caixa final: verde aprovado/garantido, âmbar faltando nota, vermelho final/reprovado", () => {
    expect(tomDaSituacao(situacaoDasNotas([nota("P", "peso", 1, 8)]))).toBe("aprovado");
    expect(tomDaSituacao(situacaoDasNotas([nota("P", "peso", 1, 6)]))).toBe("reprovado"); // vai para a final
    expect(tomDaSituacao(situacaoDasNotas([nota("P", "peso", 1, 2)]))).toBe("reprovado");
    expect(tomDaSituacao(situacaoDasNotas([nota("P", "peso", 1, 6)], 5))).toBe("aprovado");
    expect(tomDaSituacao(situacaoDasNotas([nota("P1", "peso", 1, 6), nota("P2", "peso", 1)]))).toBe("andamento");
    // Já garantido mesmo com 0 na que falta.
    expect(tomDaSituacao(situacaoDasNotas([nota("P1", "peso", 9, 10), nota("P2", "peso", 1)]))).toBe("aprovado");
    expect(tomDaSituacao(situacaoDasNotas([]))).toBe("neutro");
  });
});
