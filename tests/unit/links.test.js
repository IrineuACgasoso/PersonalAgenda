// Links das cadeiras: src/utils/links.js
import { describe, it, expect } from "vitest";
import { normalizarUrl, hrefSeguro, moverParaPosicao, ehClassroom } from "../../src/utils/links.js";

describe("normalizarUrl", () => {
  it("adiciona https quando falta o esquema", () => {
    expect(normalizarUrl("ava.ufpe.br")).toBe("https://ava.ufpe.br");
    expect(normalizarUrl("http://x.com")).toBe("http://x.com");
  });
});

describe("hrefSeguro (#50)", () => {
  it("aceita http(s)", () => {
    expect(hrefSeguro("https://ava.ufpe.br/curso")).toBe("https://ava.ufpe.br/curso");
    expect(hrefSeguro("HTTP://x.com")).toBe("HTTP://x.com");
  });
  it("recusa javascript:, data: e variações (backup adulterado)", () => {
    for (const url of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      " javascript:alert(1)",
      "\tjavascript:alert(1)",
      "data:text/html,<script>",
      "vbscript:x",
      "//evil.com",
      "",
      null,
      undefined,
      42,
    ]) {
      expect(hrefSeguro(url)).toBeUndefined();
    }
  });
});

describe("moverParaPosicao (arrastar links no drawer)", () => {
  const lista = ["a", "b", "c", "d"].map((id) => ({ id }));
  const ids = (l) => l.map((x) => x.id).join("");

  it("leva o item para a posição do alvo, para baixo ou para cima", () => {
    expect(ids(moverParaPosicao(lista, "a", "c"))).toBe("bcad");
    expect(ids(moverParaPosicao(lista, "d", "b"))).toBe("adbc");
    expect(ids(moverParaPosicao(lista, "b", "a"))).toBe("bacd");
  });
  it("id inexistente ou igual devolve a mesma lista; não muta", () => {
    expect(moverParaPosicao(lista, "x", "a")).toBe(lista);
    expect(moverParaPosicao(lista, "a", "a")).toBe(lista);
    moverParaPosicao(lista, "a", "d");
    expect(ids(lista)).toBe("abcd");
  });
  it("ehClassroom: flag ou código (itens antigos)", () => {
    expect(ehClassroom({ isClassroom: true })).toBe(true);
    expect(ehClassroom({ codigoClassroom: "abc" })).toBe(true);
    expect(ehClassroom({ url: "https://x" })).toBe(false);
    expect(ehClassroom(null)).toBe(false);
  });
});
