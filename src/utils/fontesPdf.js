// src/utils/fontesPdf.js
//
// PURO. Texto nas fontes padrão do PDF (Helvetica, negrito e itálico): todo
// leitor já as tem, então nada é embutido e o texto sai selecionável. Cobre
// só o que existe no Windows-1252 (todo o português).
//
// Larguras oficiais (AFM da Adobe), em milésimos do tamanho da fonte. O
// itálico tem as mesmas larguras da normal.

// Posições 32 a 126 da tabela ASCII.
const ASCII_NORMAL = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833,
  722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556,
  556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334,
  260, 334, 584,
];
const ASCII_NEGRITO = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833,
  722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611,
  556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389,
  280, 389, 584,
];

// Símbolos fora do ASCII: [caractere, largura normal, largura negrito].
// Letras acentuadas não entram: têm a largura da letra sem acento.
const SIMBOLOS = [
  ["€", 556, 556],
  ["‚", 222, 278],
  ["ƒ", 556, 556],
  ["„", 333, 500],
  ["…", 1000, 1000],
  ["†", 556, 556],
  ["‡", 556, 556],
  ["ˆ", 333, 333],
  ["‰", 1000, 1000],
  ["‹", 333, 333],
  ["Œ", 1000, 1000],
  ["‘", 222, 278],
  ["’", 222, 278],
  ["“", 333, 500],
  ["”", 333, 500],
  ["•", 350, 350],
  ["–", 556, 556],
  ["—", 1000, 1000],
  ["˜", 333, 333],
  ["™", 1000, 1000],
  ["›", 333, 333],
  ["œ", 944, 944],
  ["¡", 333, 333],
  ["¢", 556, 556],
  ["£", 556, 556],
  ["¤", 556, 556],
  ["¥", 556, 556],
  ["¦", 260, 280],
  ["§", 556, 556],
  ["¨", 333, 333],
  ["©", 737, 737],
  ["ª", 370, 370],
  ["«", 556, 556],
  ["¬", 584, 584],
  ["®", 737, 737],
  ["¯", 333, 333],
  ["°", 400, 400],
  ["±", 584, 584],
  ["²", 333, 333],
  ["³", 333, 333],
  ["´", 333, 333],
  ["µ", 556, 611],
  ["¶", 537, 556],
  ["·", 278, 278],
  ["¸", 333, 333],
  ["¹", 333, 333],
  ["º", 365, 365],
  ["»", 556, 556],
  ["¼", 834, 834],
  ["½", 834, 834],
  ["¾", 834, 834],
  ["¿", 611, 611],
  ["Æ", 1000, 1000],
  ["Ð", 722, 722],
  ["×", 584, 584],
  ["Ø", 778, 778],
  ["Þ", 667, 667],
  ["ß", 611, 611],
  ["æ", 889, 889],
  ["ð", 556, 611],
  ["÷", 584, 584],
  ["ø", 611, 611],
  ["þ", 556, 611],
  // i com acento: a Helvetica normal usa o i sem pingo, mais largo que o "i".
  ["ì", 278, 278],
  ["í", 278, 278],
  ["î", 278, 278],
  ["ï", 278, 278],
];
const LARGURA_SIMBOLO = new Map(SIMBOLOS.map(([c, normal, negrito]) => [c, { normal, negrito }]));

// Windows-1252: 0x80–0x9F são próprios; 0xA0–0xFF = Latin-1.
const CP1252_ALTOS = "€\0‚ƒ„…†‡ˆ‰Š‹Œ\0Ž\0\0‘’“”•–—˜™š›œ\0žŸ";
const CODIGO = new Map();
for (let c = 32; c < 127; c++) CODIGO.set(String.fromCharCode(c), c);
[...CP1252_ALTOS].forEach((c, i) => c !== "\0" && CODIGO.set(c, 0x80 + i));
for (let c = 0xa1; c <= 0xff; c++) if (c !== 0xad) CODIGO.set(String.fromCharCode(c), c);

/** Byte do caractere na codificação da fonte (WinAnsi), ou undefined. */
export const codigoNaFonte = (caractere) => CODIGO.get(caractere);

// O que tem equivalente legível; o resto perde o acento ou sai.
const TROCAS = {
  "→": "->",
  "←": "<-",
  "⇒": "=>",
  "≥": ">=",
  "≤": "<=",
  "≠": "!=",
  "≈": "~",
  "−": "-",
  "‐": "-",
  "‑": "-",
  "‒": "–",
  "―": "—",
  "▪": "•",
  "●": "•",
  "◦": "•",
  "‣": "•",
  "′": "'",
  "″": '"',
};
// Invisíveis que vêm de texto colado (hífen opcional, largura zero, variação de emoji).
const INVISIVEIS = /[\p{Cf}\p{Variation_Selector}]/gu;

/**
 * Texto que a fonte consegue escrever, numa linha só.
 * @returns {{ texto: string, perdidos: string[] }} perdidos = o que ficou de fora
 */
export function textoParaPdf(entrada) {
  const perdidos = new Set();
  const limpo = String(entrada ?? "")
    .normalize("NFC")
    .replace(INVISIVEIS, "")
    .replace(/\s+/g, " ");
  let texto = "";
  for (const c of limpo) {
    if (CODIGO.has(c)) {
      texto += c;
      continue;
    }
    const troca = TROCAS[c] ?? c.normalize("NFKD").replace(/\p{M}/gu, "");
    if (troca && [...troca].every((x) => CODIGO.has(x))) texto += troca;
    else perdidos.add(c);
  }
  return { texto, perdidos: [...perdidos] };
}

function larguraDoCaractere(c, negrito) {
  const simbolo = LARGURA_SIMBOLO.get(c);
  if (simbolo) return negrito ? simbolo.negrito : simbolo.normal;
  // "ã" → "a", "Ç" → "C".
  const base = c.normalize("NFD").charCodeAt(0);
  const tabela = negrito ? ASCII_NEGRITO : ASCII_NORMAL;
  return tabela[base - 32] ?? 556;
}

// Larguras já prontas por caractere: a diagramação mede cada palavra várias
// vezes (até três tamanhos de letra), a cada edição.
const tabelaDeLarguras = (negrito) => new Map([...CODIGO.keys()].map((c) => [c, larguraDoCaractere(c, negrito)]));
const LARGURAS = { normal: tabelaDeLarguras(false), negrito: tabelaDeLarguras(true) };

/** Largura em pontos. fonte: "normal" | "negrito" | "italico". */
export function larguraDoTexto(texto, tamanho, fonte = "normal") {
  const tabela = fonte === "negrito" ? LARGURAS.negrito : LARGURAS.normal;
  let total = 0;
  for (const c of texto) total += tabela.get(c) ?? 556;
  return (total * tamanho) / 1000;
}
