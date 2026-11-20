// src/utils/zoomAgenda.js
// Zoom da Agenda da semana (#24): no celular a grade cabe inteira na largura
// (sem arrastar para o lado) e o usuário amplia com pinça, Ctrl+roda ou os
// botões − / +. Zoom 1 = 100% (a semana inteira na tela). Funções puras; os
// eventos ficam em hooks/useZoomAgenda.js.

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;
export const PASSO_ZOOM = 0.25;

/** Zoom válido entre 100% e 300%, arredondado em centésimos. Lixo → 100%. */
export function limitarZoom(z) {
  const n = typeof z === "string" ? parseFloat(z) : z;
  if (typeof n !== "number" || !Number.isFinite(n)) return ZOOM_MIN;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(n * 100) / 100));
}

/** Pinça: o zoom acompanha a razão entre a distância atual e a inicial dos dedos. */
export function zoomDaPinca(zoomInicial, distanciaInicial, distanciaAtual) {
  if (!(distanciaInicial > 0) || !(distanciaAtual > 0)) return limitarZoom(zoomInicial);
  return limitarZoom(zoomInicial * (distanciaAtual / distanciaInicial));
}

/**
 * Botões − / +: vai para o próximo múltiplo de 25% (depois de uma pinça em
 * 137%, "+" leva a 150% e "−" a 125%, não a 162%/112%).
 */
export function zoomNoPasso(z, direcao) {
  const atual = limitarZoom(z);
  const passos = atual / PASSO_ZOOM;
  const alvo = direcao > 0 ? (Math.floor(passos + 1e-9) + 1) * PASSO_ZOOM : (Math.ceil(passos - 1e-9) - 1) * PASSO_ZOOM;
  return limitarZoom(alvo);
}

/**
 * Quanto rolar para o ponto sob os dedos continuar no mesmo lugar depois do
 * zoom. `posicao` = distância do ponto até o início da grade (em px, já
 * contando a rolagem). A grade cresce proporcionalmente ao zoom.
 */
export function deslocamentoParaFoco(posicao, zoomAntigo, zoomNovo) {
  if (!(zoomAntigo > 0) || !Number.isFinite(posicao)) return 0;
  return posicao * (zoomNovo / zoomAntigo - 1);
}

export function textoZoom(z) {
  return `${Math.round(limitarZoom(z) * 100)}%`;
}
