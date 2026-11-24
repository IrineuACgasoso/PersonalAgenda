// Baixar certificado: opções e nome (utils/certificados.js), PDF a partir de
// imagem (utils/pdf.js) e o fetch (src/arquivos.js).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/firebase", () => ({ app: {} }));

import { baixarArquivo } from "../../src/arquivos.js";
import { mensagemErroDownload, nomeParaBaixar, opcoesDeDownload } from "../../src/utils/certificados.js";
import { pdfDeJpeg, tamanhoDaPagina } from "../../src/utils/pdf.js";

describe("opções de download", () => {
  const rotulos = (nome) => opcoesDeDownload({ nome, caminho: "users/u/certificados/x" }).map((o) => o.rotulo);

  it("PDF: um botão, sem conversão", () => {
    expect(opcoesDeDownload({ nome: "a.PDF" })).toEqual([{ id: "original", rotulo: "Baixar PDF", extensao: "pdf" }]);
  });

  it("imagem: como PDF (convertida) e a própria imagem", () => {
    expect(rotulos("foto.JPG")).toEqual(["Baixar como PDF", "Baixar imagem (JPG)"]);
    expect(opcoesDeDownload({ nome: "a.png" })[0]).toMatchObject({ extensao: "pdf", converter: true });
    expect(opcoesDeDownload({ nome: "a.png" })[1]).toMatchObject({ extensao: "png" });
  });

  it("Word/PowerPoint/ODT: só o original", () => {
    expect(rotulos("a.docx")).toEqual(["Baixar DOCX"]);
    expect(rotulos("a.pptx")).toEqual(["Baixar PPTX"]);
  });

  it("sem nome no registro (backup antigo), usa a extensão do caminho", () => {
    expect(opcoesDeDownload({ nome: "", caminho: "users/u/certificados/x.pdf" })[0].rotulo).toBe("Baixar PDF");
  });
});

describe("nome do arquivo baixado", () => {
  it("vem do título, sem caracteres proibidos, com acento preservado", () => {
    expect(nomeParaBaixar("Monitoria: Cálculo 2026/1", "pdf")).toBe("Monitoria Cálculo 2026 1.pdf");
    expect(nomeParaBaixar("..\\..\\a\nb...", "pdf")).toBe("a b.pdf");
  });

  it("título vazio ou só símbolos não gera nome vazio", () => {
    expect(nomeParaBaixar("", "pdf")).toBe("certificado.pdf");
    expect(nomeParaBaixar("???", "")).toBe("certificado");
  });
});

describe("PDF a partir de JPEG", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 1, 2, 3, 0x0a, 0xff, 0xd9]);
  const pdf = pdfDeJpeg(jpeg, 1600, 800);
  // latin1: um caractere por byte, então índice na string = posição no arquivo.
  const texto = Buffer.from(pdf).toString("latin1");

  it("a tabela xref aponta para o começo de cada objeto", () => {
    expect(texto.startsWith("%PDF-1.4")).toBe(true);
    const inicio = Number(texto.match(/startxref\n(\d+)/)[1]);
    expect(texto.slice(inicio, inicio + 8)).toBe("xref\n0 6");
    const posicoes = [...texto.slice(inicio).matchAll(/(\d{10}) 00000 n /g)].map((m) => Number(m[1]));
    expect(posicoes).toHaveLength(5);
    posicoes.forEach((p, i) => expect(texto.slice(p, p + 7)).toBe(`${i + 1} 0 obj`));
  });

  it("o JPEG entra byte a byte, com as dimensões dele", () => {
    const ini = texto.lastIndexOf("stream\n", texto.lastIndexOf("endstream") - 1) + "stream\n".length;
    expect([...pdf.slice(ini, ini + jpeg.length)]).toEqual([...jpeg]);
    expect(texto).toContain(`/Length ${jpeg.length} >>`);
    expect(texto).toContain("/Width 1600 /Height 800");
  });

  it("a página tem a proporção da imagem, no tamanho do A4", () => {
    expect(tamanhoDaPagina(1600, 800)).toEqual([842, 421]);
    expect(tamanhoDaPagina(800, 1600)).toEqual([421, 842]);
    expect(texto).toContain("/MediaBox [0 0 842 421]");
  });
});

describe("baixarArquivo", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("navigator", { onLine: true });
  });
  afterEach(() => vi.unstubAllGlobals());
  const comFetch = (fn) => {
    const f = vi.fn(fn);
    vi.stubGlobal("fetch", f);
    return f;
  };

  it("devolve o conteúdo, sem usar o cache (resposta antiga sem CORS)", async () => {
    const f = comFetch(async () => new Response("abc"));
    const r = await baixarArquivo("https://x");
    expect(r.ok).toBe(true);
    expect(await r.blob.text()).toBe("abc");
    expect(f.mock.calls[0][1]).toMatchObject({ cache: "no-store", credentials: "omit" });
  });

  it("falhas viram motivo, nunca exceção", async () => {
    comFetch(async () => new Response("", { status: 404 }));
    expect(await baixarArquivo("https://x")).toEqual({ ok: false, motivo: "naoExiste" });
    comFetch(async () => new Response("", { status: 500 }));
    expect(await baixarArquivo("https://x")).toEqual({ ok: false, motivo: "outro" });
    comFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await baixarArquivo("https://x")).toEqual({ ok: false, motivo: "bloqueado" });
    vi.stubGlobal("navigator", { onLine: false });
    expect(await baixarArquivo("https://x")).toEqual({ ok: false, motivo: "offline" });
  });

  it("fechar a caixa no meio cancela", async () => {
    const controle = new AbortController();
    comFetch(async () => {
      controle.abort();
      throw new DOMException("", "AbortError");
    });
    expect(await baixarArquivo("https://x", controle.signal)).toEqual({ ok: false, motivo: "cancelado" });
  });

  it("toda falha tem mensagem; a do CORS diz o que fazer", () => {
    for (const m of ["offline", "naoExiste", "bloqueado", "conversao", "outro"]) {
      expect(mensagemErroDownload(m).length).toBeGreaterThan(10);
    }
    expect(mensagemErroDownload("bloqueado")).toMatch(/storage\.cors\.json/);
  });
});
