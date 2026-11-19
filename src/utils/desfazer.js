// src/utils/desfazer.js
// "Desfazer" depois de excluir (#18). Funções puras usadas pelos updaters do
// persist(): devolvem o item à lista na posição em que estava, sem duplicar
// se ele já tiver voltado (ex.: dois cliques rápidos em "Desfazer", ou o
// mesmo item restaurado por um sync de outro aparelho).

/**
 * Reinsere `item` em `lista` na posição `indice` (limitada ao tamanho
 * atual). Se já existe um item com o mesmo `id`, devolve a própria lista.
 */
export function reinserirPorId(lista, item, indice) {
  const base = Array.isArray(lista) ? lista : [];
  if (!item || base.some((x) => x?.id === item.id)) return base;
  const pos = Math.max(0, Math.min(Number.isInteger(indice) ? indice : base.length, base.length));
  return [...base.slice(0, pos), item, ...base.slice(pos)];
}

/**
 * Reinsere vários itens (cada um com seu índice original). Insere na ordem
 * crescente de índice para as posições baterem com as de antes.
 * @param {{ item: object, indice: number }[]} removidos
 */
export function reinserirVarios(lista, removidos) {
  return [...removidos]
    .sort((a, b) => a.indice - b.indice)
    .reduce((acc, r) => reinserirPorId(acc, r.item, r.indice), lista);
}

/**
 * Separa os itens de `lista` que satisfazem `remover`, guardando o índice
 * original de cada um (para o reinserirVarios).
 * @returns {{ restantes: object[], removidos: { item: object, indice: number }[] }}
 */
export function separarRemovidos(lista, remover) {
  const restantes = [];
  const removidos = [];
  (Array.isArray(lista) ? lista : []).forEach((item, indice) => {
    if (remover(item)) removidos.push({ item, indice });
    else restantes.push(item);
  });
  return { restantes, removidos };
}
