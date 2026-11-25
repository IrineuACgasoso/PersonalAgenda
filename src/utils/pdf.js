// src/utils/pdf.js
//
// PURO. PDFs mínimos, sem nenhuma biblioteca:
// - pdfDeJpeg: uma página com uma imagem (certificado que é uma foto/print →
//   "Baixar como PDF"). O JPEG entra como está (DCTDecode); espera JPEG RGB,
//   que é o que o canvas produz (ver imagemEmPdf em src/arquivos.js).
// - pdfDeTexto: páginas de texto (currículo).
import { codigoNaFonte } from "./fontesPdf.js";

// Lado maior do A4, em pontos (1/72 pol). A página tem a proporção da imagem:
// sem margem branca nem corte.
const LADO_MAIOR = 842;

export function tamanhoDaPagina(largura, altura) {
  const escala = LADO_MAIOR / Math.max(largura, altura);
  return [largura, altura].map((n) => Math.max(1, Math.round(n * escala)));
}

// Escreve os objetos em sequência e fecha o arquivo com a tabela de posições.
function novoPdf() {
  const codificador = new TextEncoder();
  const partes = [];
  const posicoes = []; // byte em que cada objeto começa (tabela xref)
  let tamanho = 0;
  const por = (dado) => {
    const bytes = typeof dado === "string" ? codificador.encode(dado) : dado;
    partes.push(bytes);
    tamanho += bytes.length;
  };
  por("%PDF-1.4\n");
  // Bytes > 127 num comentário: avisa os leitores que o arquivo é binário.
  por(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  return {
    // Os objetos são numerados na ordem em que entram (1, 2, 3...).
    objeto(...conteudo) {
      posicoes.push(tamanho);
      por(`${posicoes.length} 0 obj\n`);
      conteudo.forEach(por);
      por("\nendobj\n");
    },
    // `info`: "n 0 R" do dicionário de informações, se houver. O objeto 1 é o catálogo.
    fechar(info) {
      const inicioXref = tamanho;
      const linhas = posicoes.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("");
      por(`xref\n0 ${posicoes.length + 1}\n0000000000 65535 f \n${linhas}`);
      por(
        `trailer\n<< /Size ${posicoes.length + 1} /Root 1 0 R${info ? ` /Info ${info}` : ""} >>\n` +
          `startxref\n${inicioXref}\n%%EOF\n`,
      );
      const pdf = new Uint8Array(tamanho);
      let posicao = 0;
      for (const p of partes) {
        pdf.set(p, posicao);
        posicao += p.length;
      }
      return pdf;
    },
  };
}

/** Uint8Array do JPEG + dimensões em pixels → Uint8Array do PDF. */
export function pdfDeJpeg(jpeg, largura, altura) {
  const { objeto, fechar } = novoPdf();
  const [l, a] = tamanhoDaPagina(largura, altura);
  const desenho = `q ${l} 0 0 ${a} 0 0 cm /Im0 Do Q`;

  objeto("<< /Type /Catalog /Pages 2 0 R >>");
  objeto("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objeto(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${l} ${a}] ` +
      "/Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>",
  );
  objeto(`<< /Length ${desenho.length} >>\nstream\n${desenho}\nendstream`);
  objeto(
    `<< /Type /XObject /Subtype /Image /Width ${largura} /Height ${altura} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
    jpeg,
    "\nendstream",
  );
  return fechar();
}

/* ---------- PDF de texto (currículo) ---------- */

const FONTES = { normal: "Helvetica", negrito: "Helvetica-Bold", italico: "Helvetica-Oblique" };
const NOME_FONTE = { normal: "F1", negrito: "F2", italico: "F3" };

const numero = (n) => String(Math.round(n * 100) / 100);

// Texto entre parênteses, só com ASCII: o resto vai em octal (é = \351).
function textoLiteral(texto) {
  let saida = "";
  for (const c of texto) {
    const codigo = codigoNaFonte(c);
    if (codigo === undefined) continue;
    if (codigo > 126) saida += `\\${codigo.toString(8)}`;
    else saida += "()\\".includes(c) ? `\\${c}` : c;
  }
  return `(${saida})`;
}

// Título e autor aceitam qualquer caractere, em UTF-16.
function textoUnicode(texto) {
  let hex = "FEFF";
  for (let i = 0; i < texto.length; i++) hex += texto.charCodeAt(i).toString(16).padStart(4, "0");
  return `<${hex}>`;
}

function enderecoLiteral(url) {
  let ascii = "";
  try {
    // encodeURI escaparia de novo o % de um endereço que já veio escapado.
    ascii = encodeURI(url).replace(/%25([0-9a-f]{2})/gi, "%$1");
  } catch {
    /* texto Unicode inválido: fica sem endereço */
  }
  return `(${ascii.replace(/[()\\]/g, (c) => `\\${c}`)})`;
}

/**
 * Páginas do layout (curriculoLayout.js) → Uint8Array do PDF, com texto
 * selecionável (é o que os sistemas de triagem leem) e links clicáveis.
 */
export function pdfDeTexto(paginas, { largura, altura, titulo = "", autor = "" }) {
  const { objeto, fechar } = novoPdf();
  const fontes = Object.keys(FONTES);
  // 1 catálogo, 2 páginas, 3 informações, 4.. fontes, depois página + conteúdo.
  const idPagina = (i) => 4 + fontes.length + i * 2;
  const y = (op) => numero(altura - op.y);

  objeto("<< /Type /Catalog /Pages 2 0 R /Lang (pt-BR) /ViewerPreferences << /DisplayDocTitle true >> >>");
  objeto(
    `<< /Type /Pages /Kids [${paginas.map((_, i) => `${idPagina(i)} 0 R`).join(" ")}] /Count ${paginas.length} >>`,
  );
  objeto(`<< /Title ${textoUnicode(titulo)} /Author ${textoUnicode(autor)} >>`);
  for (const f of fontes) {
    objeto(`<< /Type /Font /Subtype /Type1 /BaseFont /${FONTES[f]} /Encoding /WinAnsiEncoding >>`);
  }
  const recursos = fontes.map((f, i) => `/${NOME_FONTE[f]} ${4 + i} 0 R`).join(" ");

  paginas.forEach((ops, i) => {
    const desenho = ops
      .map((op) =>
        op.tipo === "traco"
          ? `${numero(op.tom)} G 0.6 w ${numero(op.x)} ${y(op)} m ${numero(op.x + op.largura)} ${y(op)} l S`
          : `BT ${numero(op.tom)} g /${NOME_FONTE[op.fonte]} ${numero(op.tamanho)} Tf ` +
            `1 0 0 1 ${numero(op.x)} ${y(op)} Tm ${textoLiteral(op.texto)} Tj ET`,
      )
      .join("\n");
    const links = ops
      .filter((op) => op.url)
      .map((op) => {
        const area = [op.x, altura - op.y - op.tamanho * 0.25, op.x + op.largura, altura - op.y + op.tamanho * 0.8];
        return (
          `<< /Type /Annot /Subtype /Link /Border [0 0 0] /Rect [${area.map(numero).join(" ")}] ` +
          `/A << /S /URI /URI ${enderecoLiteral(op.url)} >> >>`
        );
      })
      .join(" ");
    objeto(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${numero(largura)} ${numero(altura)}] ` +
        `/Resources << /Font << ${recursos} >> >>${links ? ` /Annots [${links}]` : ""} ` +
        `/Contents ${idPagina(i) + 1} 0 R >>`,
    );
    objeto(`<< /Length ${desenho.length} >>\nstream\n${desenho}\nendstream`);
  });
  return fechar("3 0 R");
}
