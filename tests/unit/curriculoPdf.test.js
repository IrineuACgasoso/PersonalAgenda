// Currículo: diagramação e PDF (src/utils/curriculoLayout.js, fontesPdf.js, pdf.js).
import { describe, it, expect } from "vitest";
import { documentoDoCurriculo } from "../../src/utils/curriculo.js";
import { PAGINA, montarPaginas, quebrarLinhas } from "../../src/utils/curriculoLayout.js";
import { codigoNaFonte, larguraDoTexto, textoParaPdf } from "../../src/utils/fontesPdf.js";
import { pdfDeTexto } from "../../src/utils/pdf.js";
import { curriculo } from "../fixtures/fabricas.js";

const paginasDe = (c) => montarPaginas(documentoDoCurriculo(c, "2026-11"));
const textos = (pagina) => pagina.filter((o) => o.tipo === "texto");
const experiencias = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `e${i}`,
    cargo: `Cargo ${i}`,
    empresa: "Empresa",
    inicio: "2024-01",
    fim: "2024-02",
    pontos: "Desenvolvi 3 serviços com testes automatizados\nReduzi 20% do tempo de resposta\nDocumentei 12 rotas",
  }));

describe("fontes", () => {
  it("todo o português cabe na fonte e tem largura", () => {
    const pt = "áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇªº–—“”‘’•…€°";
    expect(textoParaPdf(pt)).toEqual({ texto: pt, perdidos: [] });
    [...pt].forEach((c) => expect(larguraDoTexto(c, 10)).toBeGreaterThan(0));
    expect(codigoNaFonte("é")).toBe(0xe9);
    expect(codigoNaFonte("•")).toBe(0x95);
  });

  it("larguras oficiais da Helvetica", () => {
    expect(larguraDoTexto("Hello World", 1000)).toBe(722 + 556 + 222 + 222 + 556 + 278 + 944 + 556 + 333 + 222 + 556);
    expect(larguraDoTexto("Ação", 1000)).toBe(larguraDoTexto("Acao", 1000));
    expect(larguraDoTexto("Mil", 1000, "negrito")).toBe(833 + 278 + 278);
    expect(larguraDoTexto("abc", 12, "italico")).toBe(larguraDoTexto("abc", 12));
  });

  it("troca o que tem equivalente, avisa o que perde e junta acento decomposto", () => {
    expect(textoParaPdf("a → b ≥ c").texto).toBe("a -> b >= c");
    expect(textoParaPdf("oi 😀\n日").perdidos).toEqual(["😀", "日"]);
    const decomposto = "á".normalize("NFD");
    const espacoDuro = String.fromCharCode(0xa0);
    const larguraZero = String.fromCharCode(0x200b);
    expect(textoParaPdf(`${decomposto}${espacoDuro}b${larguraZero}c`).texto).toBe("á bc");
    expect(textoParaPdf(`❤${String.fromCharCode(0xfe0f)}`).perdidos).toEqual(["❤"]);
    expect(textoParaPdf(undefined)).toEqual({ texto: "", perdidos: [] });
  });
});

describe("quebrarLinhas", () => {
  const estilo = { tamanho: 10, fonte: "normal", tom: 0 };

  it("nenhuma linha passa da largura, nem com palavra gigante", () => {
    const linhas = quebrarLinhas([{ ...estilo, texto: `texto comum ${"x".repeat(300)} fim` }], 200);
    linhas.forEach((l) => {
      const total = l.reduce((n, t) => n + larguraDoTexto(t.texto, t.tamanho, t.fonte), 0);
      expect(total).toBeLessThanOrEqual(200);
    });
    const tudo = linhas
      .flat()
      .map((t) => t.texto)
      .join("");
    expect(tudo.replaceAll(" ", "")).toBe(`textocomum${"x".repeat(300)}fim`);
  });

  it("estilos diferentes na mesma linha continuam separados, com o espaço entre eles", () => {
    const trechos = [
      { ...estilo, fonte: "negrito", texto: "Linguagens:" },
      { ...estilo, texto: "Python, C" },
    ];
    const [linha] = quebrarLinhas(trechos, 400);
    expect(linha.map((t) => t.texto)).toEqual(["Linguagens: ", "Python, C"]);
  });
});

describe("montarPaginas", () => {
  it("tudo dentro da página, em ordem de leitura (ATS lê de cima para baixo)", () => {
    const { paginas } = paginasDe(curriculo());
    expect(paginas).toHaveLength(1);
    const ops = textos(paginas[0]);
    ops.forEach((o) => {
      expect(o.x).toBeGreaterThanOrEqual(40);
      expect(o.x + o.largura).toBeLessThanOrEqual(PAGINA.largura - 40);
      expect(o.y).toBeLessThanOrEqual(PAGINA.altura - 40);
    });
    ops.slice(1).forEach((o, i) => expect(o.y).toBeGreaterThanOrEqual(ops[i].y));
    expect(ops[0].texto).toBe("Maria Conceição");
  });

  it("currículo vazio não quebra", () => {
    expect(paginasDe(null)).toMatchObject({ paginas: [[]], perdidos: [] });
  });

  it("encolhe até caber em uma página; se não couber, usa várias com letra legível", () => {
    expect(paginasDe(curriculo()).tamanho).toBe(10.5);
    const resultados = [];
    for (let n = 1; n <= 14; n++) resultados.push(paginasDe(curriculo({ experiencia: experiencias(n) })));
    const umaPagina = resultados.filter((r) => r.paginas.length === 1).map((r) => r.tamanho);
    expect(umaPagina).toContain(9.5);
    expect([...umaPagina].sort((a, b) => b - a)).toEqual(umaPagina);
    expect(resultados.at(-1).paginas.length).toBeGreaterThan(1);
    expect(resultados.at(-1).tamanho).toBe(10);
  });

  it("título de seção e cargo nunca ficam sozinhos no pé da página", () => {
    for (let n = 6; n <= 18; n++) {
      const { paginas } = paginasDe(curriculo({ experiencia: experiencias(n) }));
      paginas.slice(0, -1).forEach((p) => {
        const ultima = textos(p).at(-1);
        expect(ultima.texto).not.toMatch(/^[A-ZÇÃÊÉÍ ]+$/);
        expect(ultima.texto).not.toMatch(/^Cargo|^Empresa|^Jan 2024/);
      });
    }
  });

  it("item maior que uma página segue na próxima, sem perder linhas nem sair da folha", () => {
    const pontos = Array.from({ length: 120 }, (_, i) => `Ponto ${i}`).join("\n");
    const { paginas } = paginasDe(curriculo({ experiencia: [{ id: "e", cargo: "Dev", empresa: "X", pontos }] }));
    const todos = paginas.flatMap(textos);
    expect(todos.filter((o) => /^Ponto \d+$/.test(o.texto))).toHaveLength(120);
    todos.forEach((o) => expect(o.y).toBeLessThanOrEqual(PAGINA.altura - 40));
  });

  it("título enorme não invade a data", () => {
    const cargo = "Cargo muito longo ".repeat(12);
    const { paginas } = paginasDe(curriculo({ experiencia: [{ id: "e", cargo, empresa: "X", inicio: "2025-01" }] }));
    const data = textos(paginas[0]).find((o) => o.texto === "Jan 2025 – Atual");
    const mesmaLinha = textos(paginas[0]).filter((o) => o !== data && o.y === data.y);
    expect(mesmaLinha.length).toBeGreaterThan(0);
    mesmaLinha.forEach((o) => expect(o.x + o.largura).toBeLessThan(data.x));
  });

  it("separador '|' não sobra no fim da linha quando o link desce", () => {
    const link = `github.com/maria/${"repositorio-".repeat(7)}`;
    const projetos = [{ id: "p", nome: "P", tecnologias: "C, LLVM", link, pontos: "Fiz 1" }];
    const { paginas } = paginasDe(curriculo({ projetos }));
    const ops = textos(paginas[0]);
    const y = ops.find((o) => o.texto.startsWith("C, LLVM")).y;
    expect(ops.filter((o) => o.y === y).map((o) => o.texto.trim())).toEqual(["C, LLVM"]);
  });
});

describe("pdfDeTexto", () => {
  const { paginas } = paginasDe(curriculo({ experiencia: experiencias(14) }));
  const pdf = pdfDeTexto(paginas, { ...PAGINA, titulo: "Currículo", autor: "José" });
  const texto = new TextDecoder("latin1").decode(pdf);
  const op = { tipo: "texto", x: 0, y: 0, tamanho: 10, fonte: "normal", tom: 0, largura: 1, texto: "x" };
  const pdfCom = (extra) => new TextDecoder("latin1").decode(pdfDeTexto([[{ ...op, ...extra }]], PAGINA));

  it("arquivo bem formado: cada posição da tabela aponta para o objeto certo", () => {
    expect(texto.startsWith("%PDF-1.4")).toBe(true);
    expect(texto.trimEnd().endsWith("%%EOF")).toBe(true);
    const inicio = Number(texto.match(/startxref\n(\d+)/)[1]);
    expect(texto.slice(inicio, inicio + 4)).toBe("xref");
    const posicoes = [...texto.slice(inicio).matchAll(/^(\d{10}) 00000 n /gm)].map((m) => Number(m[1]));
    posicoes.forEach((p, i) => expect(texto.slice(p).startsWith(`${i + 1} 0 obj`)).toBe(true));
    expect(texto).toContain(`/Size ${posicoes.length + 1}`);
  });

  it("uma página por página do layout, com o tamanho declarado do conteúdo", () => {
    expect(paginas.length).toBeGreaterThan(1);
    expect(texto.match(/\/Type \/Page /g)).toHaveLength(paginas.length);
    for (const m of texto.matchAll(/<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/g)) {
      expect(m[2].length).toBe(Number(m[1]));
    }
  });

  it("acentos, parênteses e barras são escapados", () => {
    expect(pdfCom({ texto: "é (a) \\ –" })).toContain("(\\351 \\(a\\) \\\\ \\226) Tj");
  });

  it("links clicáveis, só http(s) e mailto, com os parênteses escapados", () => {
    const urls = [...texto.matchAll(/\/URI \((.*?)\) >>/g)].map((m) => m[1]);
    expect(urls).toEqual(expect.arrayContaining(["mailto:maria@example.com", "https://github.com/maria"]));
    urls.forEach((u) => expect(u).toMatch(/^(https?:\/\/|mailto:)/));
    expect(pdfCom({ url: "https://x/á(1)?a=%20" })).toContain("/URI (https://x/%C3%A1\\(1\\)?a=%20)");
  });
});
