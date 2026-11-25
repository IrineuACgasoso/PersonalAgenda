// src/utils/curriculoLayout.js
//
// PURO. Diagrama o documento do currículo (curriculo.js) em páginas A4. O
// resultado serve para a prévia na tela (SVG) E para o PDF (pdf.js): por isso
// a prévia é exatamente o arquivo baixado.
//
// Unidade: pontos (1/72 pol), origem no canto de cima, y = linha de base.
// Página = lista de { tipo: "texto", x, y, tamanho, fonte, texto, largura, tom, url? }
//                  ou { tipo: "traco", x, y, largura, tom }.
// Tom: 0 (preto) a 1 (branco).
import { larguraDoTexto, textoParaPdf } from "./fontesPdf.js";

export const PAGINA = { largura: 595, altura: 842 };
const MARGEM = { lado: 48, topo: 44, base: 42 };
const UTIL = PAGINA.largura - 2 * MARGEM.lado;
const LIMITE = PAGINA.altura - MARGEM.base;

// Tamanho do texto corrido. Tenta o confortável e vai apertando até caber em
// UMA página; menos que 9,5 fica ruim de ler, então aí vai para a segunda.
const TAMANHOS = [10.5, 10, 9.5];
const TAMANHO_VARIAS_PAGINAS = 10;

const PRETO = 0;
const CINZA = 0.27;
const ENTRELINHA = 1.28;

/* ---------- quebra de linha ---------- */

const largura = (p) => larguraDoTexto(p.texto, p.tamanho, p.fonte);
const mesmoEstilo = (a, b) => a.fonte === b.fonte && a.tamanho === b.tamanho && a.tom === b.tom && a.url === b.url;

// Palavra que não cabe nem sozinha na linha (URL enorme): corta por letra.
function partirPalavra(palavra, max) {
  const partes = [];
  let atual = "";
  for (const c of palavra.texto) {
    if (atual && largura({ ...palavra, texto: atual + c }) > max) {
      partes.push({ ...palavra, texto: atual });
      atual = "";
    }
    atual += c;
  }
  return [...partes, { ...palavra, texto: atual }];
}

/** Trechos com estilo → linhas; cada linha é uma lista de trechos já juntados. */
export function quebrarLinhas(trechos, max) {
  const palavras = trechos
    .flatMap((t) =>
      t.texto
        .split(" ")
        .filter(Boolean)
        .map((texto) => ({ ...t, texto })),
    )
    .flatMap((p) => (largura(p) > max ? partirPalavra(p, max) : [p]));
  const linhas = [];
  let usada = 0;
  for (const p of palavras) {
    const linha = linhas.at(-1);
    const anterior = linha?.at(-1);
    const espaco = anterior ? larguraDoTexto(" ", anterior.tamanho, anterior.fonte) : 0;
    const total = largura(p);
    if (!linha || usada + espaco + total > max) {
      linhas.push([{ ...p }]);
      usada = total;
      continue;
    }
    usada += espaco + total;
    if (mesmoEstilo(anterior, p)) anterior.texto += ` ${p.texto}`;
    else {
      anterior.texto += " ";
      linha.push({ ...p });
    }
  }
  return linhas;
}

/* ---------- linhas prontas ---------- */

// Trechos lado a lado a partir de x → operações (y relativo à linha de base).
function operacoes(trechos, x) {
  let pos = x;
  return trechos.map((t) => {
    const op = { tipo: "texto", ...t, x: pos, y: 0, largura: largura(t) };
    pos += op.largura;
    return op;
  });
}

// "|" que sobrou no fim da linha porque o resto desceu.
const semBarraSolta = (trechos) => (trechos.at(-1)?.texto.trim() === "|" ? trechos.slice(0, -1) : trechos);

const larguraDaLinha = (trechos) => trechos.reduce((n, t) => n + largura(t), 0);

// { altura, antes (espaço acima, some no topo da página), colar (não separar da próxima), ops }
const linha = (tamanho, ops, { antes = 0, colar = false } = {}) => ({
  tamanho,
  altura: tamanho * ENTRELINHA,
  antes,
  colar,
  ops,
});

// Texto à esquerda e, na mesma altura, a data à direita.
function linhaDupla(esquerda, direita, opcoes) {
  const tamanho = esquerda[0]?.tamanho || direita.tamanho;
  const lDireita = direita.texto ? largura(direita) : 0;
  const linhas = quebrarLinhas(esquerda, lDireita ? UTIL - lDireita - 12 : UTIL).map((t, i) =>
    linha(tamanho, operacoes(semBarraSolta(t), MARGEM.lado), { antes: i === 0 ? opcoes.antes : 0, colar: true }),
  );
  if (linhas.length === 0) linhas.push(linha(tamanho, [], { antes: opcoes.antes }));
  if (lDireita) linhas[0].ops.push(...operacoes([direita], MARGEM.lado + UTIL - lDireita));
  linhas.at(-1).colar = !!opcoes.colar;
  return linhas;
}

function linhasDoPonto(texto, base, opcoes) {
  const recuo = base * 1.05;
  const estilo = { tamanho: base, fonte: "normal", tom: PRETO };
  return quebrarLinhas([{ ...estilo, texto }], UTIL - recuo).map((t, i) =>
    linha(
      base,
      [
        ...(i === 0 ? operacoes([{ ...estilo, texto: "•" }], MARGEM.lado + base * 0.25) : []),
        ...operacoes(t, MARGEM.lado + recuo),
      ],
      { antes: i === 0 ? opcoes.antes : 0 },
    ),
  );
}

function linhasDoBloco(b, base, primeiro) {
  const normal = { tamanho: base, fonte: "normal", tom: PRETO };
  const antes = primeiro ? base * 0.25 : base * (b.tipo === "item" ? 0.6 : 0.15);
  const t = (texto, estilo) => (texto ? [{ ...normal, ...estilo, texto: textoParaPdf(texto).texto }] : []);

  if (b.tipo === "paragrafo") {
    return quebrarLinhas(t(b.texto), UTIL).map((x, i) =>
      linha(base, operacoes(x, MARGEM.lado), { antes: i === 0 ? antes : 0 }),
    );
  }

  const direita = (texto) => t(texto, { tom: CINZA })[0] || { ...normal, texto: "" };

  if (b.tipo === "linha") {
    const esquerda = [...t(b.rotulo, { fonte: "negrito", url: b.url }), ...t(b.texto)];
    return linhaDupla(esquerda, direita(b.direita), { antes });
  }

  const pontos = b.pontos || [];
  const rodape = b.rodape ? [...t(b.rodape.rotulo, { fonte: "negrito" }), ...t(b.rodape.texto)] : [];
  const temDetalhe = pontos.length > 0 || rodape.length > 0;
  // Na mesma linha, e não à direita: com duas colunas (data e local) alguns
  // leitores de PDF juntam as duas fora da ordem do texto.
  const complemento = [
    ...(b.subtitulo && b.complemento ? t("|", { tom: CINZA }) : []),
    ...t(b.complemento, { url: b.complementoUrl }),
  ];
  const sub = [...t(b.subtitulo, { fonte: "italico" }), ...complemento];
  const temSub = sub.length > 0;
  return [
    ...linhaDupla(t(b.titulo, { fonte: "negrito" }), direita(b.direita), { antes, colar: temSub || temDetalhe }),
    ...(temSub ? linhaDupla(sub, direita(""), { colar: temDetalhe }) : []),
    ...pontos.flatMap((p) => linhasDoPonto(textoParaPdf(p).texto, base, { antes: base * 0.12 })),
    ...quebrarLinhas(rodape, UTIL).map((x, i) =>
      linha(base, operacoes(x, MARGEM.lado), { antes: i === 0 ? base * 0.12 : 0 }),
    ),
  ];
}

function centralizada(trechos, opcoes) {
  return linha(trechos[0].tamanho, operacoes(trechos, MARGEM.lado + (UTIL - larguraDaLinha(trechos)) / 2), opcoes);
}

function linhasDoCabecalho(doc, base) {
  const linhas = [];
  const nome = { tamanho: base * 2, fonte: "negrito", tom: PRETO, texto: textoParaPdf(doc.nome).texto };
  for (const t of quebrarLinhas([nome], UTIL)) linhas.push(centralizada(t));
  const cargo = { tamanho: base * 1.15, fonte: "normal", tom: CINZA, texto: textoParaPdf(doc.cargo).texto };
  for (const t of quebrarLinhas([cargo], UTIL)) linhas.push(centralizada(t));

  return [...linhas, ...linhasDeContato(doc.contatos, base)];
}

// Contatos separados por "|"; um contato só quebra no meio se sozinho não
// couber. Em duas linhas, divide ao meio (nada de um contato solto embaixo).
function linhasDeContato(contatos, base) {
  const estilo = { tamanho: base * 0.95, fonte: "normal", tom: PRETO };
  const separador = { ...estilo, tom: CINZA, texto: "  |  " };
  const trechos = contatos.flatMap((c) =>
    quebrarLinhas([{ ...estilo, url: c.url, texto: textoParaPdf(c.texto).texto }], UTIL).flat(),
  );
  const juntar = (lista) => lista.flatMap((t, i) => (i === 0 ? [t] : [separador, t]));
  const larguraDe = (lista) => larguraDaLinha(juntar(lista));

  let grupos = [];
  for (const t of trechos) {
    const ultimo = grupos.at(-1);
    if (ultimo && larguraDe([...ultimo, t]) <= UTIL) ultimo.push(t);
    else grupos.push([t]);
  }
  if (grupos.length === 2) {
    const cortes = trechos.slice(1).map((_, i) => [trechos.slice(0, i + 1), trechos.slice(i + 1)]);
    const maior = (g) => Math.max(...g.map(larguraDe));
    grupos = cortes.reduce((melhor, g) => (maior(g) < maior(melhor) ? g : melhor));
  }
  return grupos.map((g) => centralizada(juntar(g), { antes: base * 0.15 }));
}

function linhasDaSecao(secao, base) {
  const titulo = {
    tamanho: base * 1.08,
    fonte: "negrito",
    tom: PRETO,
    texto: textoParaPdf(secao.titulo).texto.toUpperCase(),
  };
  const cabecalho = linha(
    titulo.tamanho,
    [
      ...operacoes([titulo], MARGEM.lado),
      { tipo: "traco", x: MARGEM.lado, y: titulo.tamanho * 0.36, largura: UTIL, tom: 0.45 },
    ],
    { antes: base * 0.95, colar: true },
  );
  cabecalho.altura += base * 0.25;
  return [cabecalho, ...secao.blocos.flatMap((b, i) => linhasDoBloco(b, base, i === 0))];
}

/* ---------- páginas ---------- */

// Junta as linhas que não podem se separar (título da seção + 1º item,
// cargo + empresa + 1º ponto): o grupo inteiro vai para a próxima página.
function agrupar(linhas) {
  const grupos = [];
  let colada = false;
  for (const l of linhas) {
    if (colada) grupos.at(-1).push(l);
    else grupos.push([l]);
    colada = l.colar;
  }
  return grupos;
}

function paginar(linhas) {
  const paginas = [[]];
  let y = MARGEM.topo;
  for (const grupo of agrupar(linhas)) {
    const altura = grupo.reduce((n, l, i) => n + l.altura + (i === 0 && y === MARGEM.topo ? 0 : l.antes), 0);
    if (y > MARGEM.topo && y + altura > LIMITE) {
      paginas.push([]);
      y = MARGEM.topo;
    }
    for (const l of grupo) {
      if (y > MARGEM.topo) y += l.antes;
      // Grupo maior que a página inteira: segue na próxima.
      if (y > MARGEM.topo && y + l.altura > LIMITE) {
        paginas.push([]);
        y = MARGEM.topo;
      }
      const baseDaLinha = y + l.tamanho;
      paginas.at(-1).push(...l.ops.map((op) => ({ ...op, y: baseDaLinha + op.y })));
      y += l.altura;
    }
  }
  return paginas;
}

const paginasNoTamanho = (doc, base) =>
  paginar([...linhasDoCabecalho(doc, base), ...doc.secoes.flatMap((s) => linhasDaSecao(s, base))]);

// Caracteres que a fonte não tem, em qualquer texto do documento.
function caracteresPerdidos(valor) {
  if (typeof valor === "string") return textoParaPdf(valor).perdidos;
  if (valor && typeof valor === "object") {
    return Object.entries(valor).flatMap(([k, v]) => (/url$/i.test(k) ? [] : caracteresPerdidos(v)));
  }
  return [];
}

/**
 * @returns {{ paginas: object[][], tamanho: number, perdidos: string[] }}
 *   tamanho = corpo do texto usado (encolhe para caber em uma página)
 */
export function montarPaginas(doc) {
  const perdidos = [...new Set(caracteresPerdidos(doc))];
  for (const tamanho of TAMANHOS) {
    const paginas = paginasNoTamanho(doc, tamanho);
    if (paginas.length === 1) return { paginas, tamanho, perdidos };
  }
  return { paginas: paginasNoTamanho(doc, TAMANHO_VARIAS_PAGINAS), tamanho: TAMANHO_VARIAS_PAGINAS, perdidos };
}
