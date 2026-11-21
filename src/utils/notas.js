// src/utils/notas.js
// Notas e média por cadeira (#35). PURO.
//
// `cadeira.notas` é uma ÁRVORE de itens. Cada item é uma NOTA (0–10, vazia
// até sair) ou um GRUPO de itens, e entra no item de cima de um de 2 modos:
//   - "peso":  média ponderada (qualquer número: 1/1, 60/30/10, 0,6…; divide
//              pela soma dos pesos);
//   - "bonus": soma até `valor` pontos, proporcional à nota (10 ⇒ +valor),
//              com o resultado limitado a 10.
// Ex. (Lógica): Prova 1 = grupo{ P1 peso 1, MP1 bônus +0,5, MP2 bônus +0,5 }.
// `nota.dataId` (opcional) liga a nota a uma "data importante" da cadeira.
//
// Regra da UFPE (confirmada pelo usuário): média ≥ 7 passa direto; ≥ 3 vai
// para a final e precisa de (média + final) / 2 ≥ 5; abaixo de 3 reprova.

export const MEDIA_APROVACAO = 7;
export const MEDIA_MINIMA_FINAL = 3;
export const MEDIA_APOS_FINAL = 5;
export const NOTA_MAXIMA = 10;
export const MAX_PROFUNDIDADE = 3; // grupo › grupo › nota
const EPS = 1e-9;

/* ---------------- sanitização (chamada pelo sanitizarDados) ---------------- */

const numeroOuNada = (v) => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
};

export function sanitizarNota(v) {
  const n = numeroOuNada(v);
  return n === undefined ? undefined : Math.min(NOTA_MAXIMA, Math.max(0, n));
}

// Lista de itens sempre válida: tipo/modo conhecidos, `valor` ≥ 0, nota em
// 0–10 (ou ausente), `itens` só em grupo e no máximo MAX_PROFUNDIDADE níveis.
export function sanitizarItensNota(lista, profundidade = 1) {
  if (!Array.isArray(lista)) return [];
  return lista
    .filter((x) => x && typeof x === "object" && !Array.isArray(x))
    .map((x, i) => {
      const tipo = x.tipo === "grupo" && profundidade < MAX_PROFUNDIDADE ? "grupo" : "nota";
      const valor = numeroOuNada(x.valor);
      return {
        id: typeof x.id === "string" && x.id ? x.id : `@${i}`,
        titulo: typeof x.titulo === "string" ? x.titulo : "",
        tipo,
        modo: x.modo === "bonus" ? "bonus" : "peso",
        valor: valor !== undefined && valor >= 0 ? valor : 1,
        nota: tipo === "nota" ? sanitizarNota(x.nota) : undefined,
        itens: tipo === "grupo" ? sanitizarItensNota(x.itens, profundidade + 1) : undefined,
        dataId: typeof x.dataId === "string" && x.dataId ? x.dataId : undefined,
      };
    });
}

/* ---------------- cálculo ---------------- */

// Valor (0–10) de uma lista de itens, como se fosse um grupo. `pendente(item,
// emBonus)` decide o que vale uma nota que ainda não saiu (null = ignorar).
// Pesos sem valor conhecido ficam fora da média (média parcial); bônus sem
// valor somam 0.
function valorDaLista(itens, pendente, emBonus = false) {
  let somaPesos = 0;
  let somaPonderada = 0;
  let bonus = 0;
  let temPeso = false;
  let bonusConhecido = false;
  for (const item of itens || []) {
    if (item.modo !== "bonus" && item.valor > 0) temPeso = true;
    const bonusAqui = emBonus || item.modo === "bonus";
    // Grupo VAZIO (ex.: "Prova 2" criado antes das notas) vale como uma nota
    // pendente: senão ficaria fora da média e daria "Aprovado" antes da hora.
    const grupoCheio = item.tipo === "grupo" && item.itens?.length > 0;
    const v = grupoCheio
      ? valorDaLista(item.itens, pendente, bonusAqui)
      : item.tipo === "grupo"
        ? pendente(item, bonusAqui)
        : (item.nota ?? pendente(item, bonusAqui));
    if (v === null || v === undefined) continue;
    if (item.modo === "bonus") {
      bonus += (item.valor * v) / NOTA_MAXIMA;
      bonusConhecido = true;
    } else if (item.valor > 0) {
      somaPesos += item.valor;
      somaPonderada += item.valor * v;
    }
  }
  // Tem nota de peso mas nenhuma saiu: o grupo ainda não tem valor (o bônus
  // sozinho não vira "média 0,4"). Grupo só de bônus vale a soma deles.
  if (temPeso ? somaPesos === 0 : !bonusConhecido) return null;
  const base = somaPesos > 0 ? somaPonderada / somaPesos : 0;
  return Math.min(NOTA_MAXIMA, base + bonus);
}

export const valorDoGrupo = (grupo) => valorDaLista(grupo.itens, () => null);

// Só com o que já saiu.
export const mediaParcial = (itens) => valorDaLista(itens, () => null);

// Notas que ainda não saíram e que contam na média (as de bônus não entram:
// se não vierem, a média só não ganha o extra).
export function notasPendentes(itens, emBonus = false) {
  return (itens || []).flatMap((item) => {
    const bonusAqui = emBonus || item.modo === "bonus";
    if (item.tipo === "grupo" && item.itens?.length > 0) return notasPendentes(item.itens, bonusAqui);
    return item.nota === undefined && !bonusAqui ? [item] : [];
  });
}

// Média final supondo `x` em TODA nota pendente de peso e 0 nos bônus
// pendentes (conservador: não conta com extra que ainda não veio).
const mediaSupondo = (itens, x) => valorDaLista(itens, (_, emBonus) => (emBonus ? 0 : x)) ?? 0;

// Menor nota (a mesma em cada pendente) para a média chegar a `alvo`.
// 0 = já garantido · Infinity = impossível · null = nada pendente.
export function notaNecessaria(itens, alvo) {
  if (notasPendentes(itens).length === 0) return null;
  if (mediaSupondo(itens, 0) >= alvo - EPS) return 0;
  if (mediaSupondo(itens, NOTA_MAXIMA) < alvo - EPS) return Infinity;
  let lo = 0;
  let hi = NOTA_MAXIMA;
  for (let i = 0; i < 40; i++) {
    const meio = (lo + hi) / 2;
    if (mediaSupondo(itens, meio) >= alvo - EPS) hi = meio;
    else lo = meio;
  }
  // Arredonda PARA CIMA em décimos (notas saem com 1 casa) e confere.
  const passo = Math.ceil(hi * 10 - EPS) / 10;
  return mediaSupondo(itens, passo) >= alvo - EPS ? passo : Math.min(NOTA_MAXIMA, passo + 0.1);
}

// Situação da cadeira.
//   { estado: "sem-notas" }
//   { estado: "andamento", parcial, pendentes, paraPassar, paraFinal }
//   { estado: "aprovado" | "reprovado", media, final?, mediaFinal? }
//   { estado: "final", media, precisaNaFinal }
export function situacaoDasNotas(itens, notaFinal) {
  if (!itens || itens.length === 0) return { estado: "sem-notas" };
  const pendentes = notasPendentes(itens);
  if (pendentes.length > 0) {
    return {
      estado: "andamento",
      parcial: mediaParcial(itens),
      pendentes: pendentes.length,
      paraPassar: notaNecessaria(itens, MEDIA_APROVACAO),
      paraFinal: notaNecessaria(itens, MEDIA_MINIMA_FINAL),
    };
  }
  const media = mediaSupondo(itens, 0);
  if (media >= MEDIA_APROVACAO - EPS) return { estado: "aprovado", media };
  if (media < MEDIA_MINIMA_FINAL - EPS) return { estado: "reprovado", media };
  const final = sanitizarNota(notaFinal);
  if (final === undefined) {
    return { estado: "final", media, precisaNaFinal: Math.max(0, 2 * MEDIA_APOS_FINAL - media) };
  }
  const mediaFinal = (media + final) / 2;
  return { estado: mediaFinal >= MEDIA_APOS_FINAL - EPS ? "aprovado" : "reprovado", media, final, mediaFinal };
}

// Corta (não arredonda) em 2 casas: 6,996 não pode aparecer como "7,00".
export function formatarNota(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "–";
  const cortado = Math.floor(n * 100 + EPS) / 100;
  const umaCasa = Math.abs(cortado * 10 - Math.round(cortado * 10)) < 1e-6;
  return cortado.toFixed(umaCasa ? 1 : 2).replace(".", ",");
}

export function textoNecessaria(n) {
  if (n === null) return "";
  if (n === 0) return "já garantido";
  if (!Number.isFinite(n)) return "não dá mais";
  return `${formatarNota(n)} em cada`;
}

// Linha curta do card da cadeira (ResumoCadeira) + tom da cor.
export function resumoCurtoDasNotas(s) {
  switch (s.estado) {
    case "andamento":
      return {
        texto: `Média parcial ${formatarNota(s.parcial)}`,
        tom: s.paraPassar === Infinity ? "atencao" : "neutro",
      };
    case "aprovado":
      return { texto: `Média ${formatarNota(s.mediaFinal ?? s.media)} · Aprovado`, tom: "bom" };
    case "final":
      return {
        texto: `Média ${formatarNota(s.media)} · Final: precisa de ${formatarNota(s.precisaNaFinal)}`,
        tom: "atencao",
      };
    case "reprovado":
      return { texto: `Média ${formatarNota(s.mediaFinal ?? s.media)} · Reprovado`, tom: "ruim" };
    default:
      return null;
  }
}

/* ---------------- edição da árvore (sempre devolve listas novas) ---------------- */

export function acharItem(itens, id) {
  for (const item of itens || []) {
    if (item.id === id) return item;
    const dentro = item.tipo === "grupo" ? acharItem(item.itens, id) : null;
    if (dentro) return dentro;
  }
  return null;
}

// Nível do item (1 = topo); 0 se não achar.
export function profundidadeDe(itens, id, nivel = 1) {
  for (const item of itens || []) {
    if (item.id === id) return nivel;
    if (item.tipo === "grupo") {
      const p = profundidadeDe(item.itens, id, nivel + 1);
      if (p) return p;
    }
  }
  return 0;
}

// `idPai` null = topo. Índice opcional (Desfazer devolve na posição original).
export function inserirItem(itens, idPai, novo, indice) {
  const inserir = (lista) => {
    const copia = [...(lista || [])];
    const pos = indice === undefined ? copia.length : Math.min(Math.max(0, indice), copia.length);
    copia.splice(pos, 0, novo);
    return copia;
  };
  if (!idPai) return inserir(itens);
  return (itens || []).map((item) => {
    if (item.id === idPai) return { ...item, itens: inserir(item.itens) };
    return item.tipo === "grupo" ? { ...item, itens: inserirItem(item.itens, idPai, novo, indice) } : item;
  });
}

export function editarItem(itens, id, patch) {
  return (itens || []).map((item) => {
    if (item.id === id) return { ...item, ...patch };
    return item.tipo === "grupo" ? { ...item, itens: editarItem(item.itens, id, patch) } : item;
  });
}

// → { itens, removido: { item, idPai, indice } | null }
export function removerItem(itens, id, idPai = null) {
  const indice = (itens || []).findIndex((x) => x.id === id);
  if (indice !== -1) {
    return { itens: itens.filter((x) => x.id !== id), removido: { item: itens[indice], idPai, indice } };
  }
  let removido = null;
  const novos = (itens || []).map((item) => {
    if (removido || item.tipo !== "grupo") return item;
    const r = removerItem(item.itens, id, item.id);
    if (!r.removido) return item;
    removido = r.removido;
    return { ...item, itens: r.itens };
  });
  return { itens: removido ? novos : itens, removido };
}

// Muda o item de grupo (`idPaiNovo` null = topo), no fim da lista de destino.
// Não deixa entrar em si mesmo/descendente nem passar do limite de níveis.
export function moverItem(itens, id, idPaiNovo) {
  const item = acharItem(itens, id);
  if (!item) return itens;
  if (idPaiNovo && (idPaiNovo === id || acharItem(item.itens, idPaiNovo))) return itens;
  const destino = idPaiNovo ? acharItem(itens, idPaiNovo) : null;
  if (idPaiNovo && destino?.tipo !== "grupo") return itens;
  const nivelDestino = idPaiNovo ? profundidadeDe(itens, idPaiNovo) + 1 : 1;
  if (nivelDestino + alturaDe(item) - 1 > MAX_PROFUNDIDADE) return itens;
  const { itens: sem } = removerItem(itens, id);
  return inserirItem(sem, idPaiNovo, item);
}

// Níveis que o item ocupa (nota = 1; grupo com notas = 2…).
function alturaDe(item) {
  if (item.tipo !== "grupo" || !item.itens?.length) return item.tipo === "grupo" ? 2 : 1;
  return 1 + Math.max(...item.itens.map(alturaDe));
}

// Grupos onde `id` pode entrar (para o seletor "dentro de"): [{ id, titulo, nivel }].
export function destinosPossiveis(itens, id) {
  const lista = [];
  const visitar = (grupoLista, nivel) =>
    (grupoLista || []).forEach((g) => {
      if (g.tipo !== "grupo" || g.id === id) return;
      if (moverItem(itens, id, g.id) !== itens || acharItem(g.itens, id))
        lista.push({ id: g.id, titulo: g.titulo, nivel });
      visitar(g.itens, nivel + 1);
    });
  visitar(itens, 1);
  return lista;
}

// "Unidade 1" → "Unidade 2"; sem número no fim: igual (filhos) ou "(cópia)" (o grupo).
export function proximoTitulo(titulo, copiaSemNumero = false) {
  const m = /^(.*?)(\d+)(\s*)$/.exec(titulo || "");
  if (m) return `${m[1]}${Number(m[2]) + 1}${m[3]}`;
  return copiaSemNumero ? `${titulo || "Grupo"} (cópia)` : titulo;
}

// Duplica um grupo logo abaixo dele (Unidade 1 → Unidade 2): ids novos,
// números do fim dos títulos +1, notas vazias e sem vínculo com datas.
export function duplicarItem(itens, id, gerarId) {
  const copiar = (item, raiz) => ({
    ...item,
    id: gerarId(),
    titulo: proximoTitulo(item.titulo, raiz),
    nota: undefined,
    dataId: undefined,
    itens: item.tipo === "grupo" ? item.itens.map((f) => copiar(f, false)) : undefined,
  });
  const duplicarEm = (lista) => {
    const i = (lista || []).findIndex((x) => x.id === id);
    if (i !== -1) {
      const copia = [...lista];
      copia.splice(i + 1, 0, copiar(lista[i], true));
      return copia;
    }
    return (lista || []).map((item) => (item.tipo === "grupo" ? { ...item, itens: duplicarEm(item.itens) } : item));
  };
  return duplicarEm(itens);
}

// Nota ligada a cada data importante: { dataId: item }.
export function notasPorData(itens) {
  const mapa = {};
  const visitar = (lista) =>
    (lista || []).forEach((item) => {
      if (item.dataId && item.tipo === "nota") mapa[item.dataId] = item;
      if (item.tipo === "grupo") visitar(item.itens);
    });
  visitar(itens);
  return mapa;
}
