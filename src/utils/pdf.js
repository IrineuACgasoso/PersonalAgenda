// src/utils/pdf.js
//
// PURO. PDF mínimo de uma página com uma imagem JPEG (certificado que é uma
// foto/print → "Baixar como PDF"). O JPEG entra no PDF como está (DCTDecode),
// então não é preciso nenhuma biblioteca. Espera JPEG RGB, que é o que o
// canvas produz (ver imagemEmPdf em src/arquivos.js).

// Lado maior do A4, em pontos (1/72 pol). A página tem a proporção da imagem:
// sem margem branca nem corte.
const LADO_MAIOR = 842;

export function tamanhoDaPagina(largura, altura) {
  const escala = LADO_MAIOR / Math.max(largura, altura);
  return [largura, altura].map((n) => Math.max(1, Math.round(n * escala)));
}

/** Uint8Array do JPEG + dimensões em pixels → Uint8Array do PDF. */
export function pdfDeJpeg(jpeg, largura, altura) {
  const codificador = new TextEncoder();
  const partes = [];
  const posicoes = []; // byte em que cada objeto começa (tabela xref)
  let tamanho = 0;
  const por = (dado) => {
    const bytes = typeof dado === "string" ? codificador.encode(dado) : dado;
    partes.push(bytes);
    tamanho += bytes.length;
  };
  const objeto = (...conteudo) => {
    posicoes.push(tamanho);
    por(`${posicoes.length} 0 obj\n`);
    conteudo.forEach(por);
    por("\nendobj\n");
  };

  const [l, a] = tamanhoDaPagina(largura, altura);
  const desenho = `q ${l} 0 0 ${a} 0 0 cm /Im0 Do Q`;

  por("%PDF-1.4\n");
  // Bytes > 127 num comentário: avisa os leitores que o arquivo é binário.
  por(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
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

  const inicioXref = tamanho;
  const linhas = posicoes.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("");
  por(`xref\n0 ${posicoes.length + 1}\n0000000000 65535 f \n${linhas}`);
  por(`trailer\n<< /Size ${posicoes.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`);

  const pdf = new Uint8Array(tamanho);
  let posicao = 0;
  for (const p of partes) {
    pdf.set(p, posicao);
    posicao += p.length;
  }
  return pdf;
}
