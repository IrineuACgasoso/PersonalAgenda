// Links das cadeiras: src/utils/links.js
import { describe, it, expect } from "vitest";
import { normalizarUrl, hrefSeguro } from "../../src/utils/links.js";

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
