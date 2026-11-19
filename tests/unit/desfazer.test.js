// "Desfazer" depois de excluir (#18): src/utils/desfazer.js.
import { describe, it, expect } from "vitest";
import { reinserirPorId, reinserirVarios, separarRemovidos } from "../../src/utils/desfazer.js";

const itens = (...ids) => ids.map((id) => ({ id }));
const ids = (lista) => lista.map((x) => x.id);

describe("reinserirPorId", () => {
  it("devolve o item na posição original", () => {
    expect(ids(reinserirPorId(itens("a", "c"), { id: "b" }, 1))).toEqual(["a", "b", "c"]);
    expect(ids(reinserirPorId(itens("b"), { id: "a" }, 0))).toEqual(["a", "b"]);
  });

  it("limita o índice ao tamanho atual (a lista pode ter encolhido)", () => {
    expect(ids(reinserirPorId(itens("a"), { id: "z" }, 10))).toEqual(["a", "z"]);
    expect(ids(reinserirPorId(itens("a"), { id: "z" }, -3))).toEqual(["z", "a"]);
  });

  it("não duplica se o item já voltou (ex.: dois cliques em Desfazer)", () => {
    const lista = itens("a", "b");
    expect(reinserirPorId(lista, { id: "b" }, 0)).toBe(lista);
  });

  it("lista ausente vira lista nova; não muta a original", () => {
    expect(ids(reinserirPorId(undefined, { id: "a" }, 0))).toEqual(["a"]);
    const lista = itens("a");
    reinserirPorId(lista, { id: "b" }, 0);
    expect(ids(lista)).toEqual(["a"]);
  });
});

describe("separarRemovidos + reinserirVarios", () => {
  it("separa guardando o índice original", () => {
    const { restantes, removidos } = separarRemovidos(itens("a", "b", "c", "d"), (x) => x.id === "b" || x.id === "d");
    expect(ids(restantes)).toEqual(["a", "c"]);
    expect(removidos.map((r) => [r.item.id, r.indice])).toEqual([
      ["b", 1],
      ["d", 3],
    ]);
  });

  it("excluir e desfazer volta à lista original (mesma ordem)", () => {
    const original = itens("a", "b", "c", "d", "e");
    const { restantes, removidos } = separarRemovidos(original, (x) => ["a", "c", "e"].includes(x.id));
    expect(ids(reinserirVarios(restantes, removidos))).toEqual(ids(original));
    // a ordem em que os removidos chegam não importa
    expect(ids(reinserirVarios(restantes, [...removidos].reverse()))).toEqual(ids(original));
  });

  it("item criado entre excluir e desfazer é mantido", () => {
    const { restantes, removidos } = separarRemovidos(itens("a", "b"), (x) => x.id === "a");
    const depois = [...restantes, { id: "novo" }];
    expect(ids(reinserirVarios(depois, removidos))).toEqual(["a", "b", "novo"]);
  });
});
