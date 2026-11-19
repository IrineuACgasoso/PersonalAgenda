// src/utils/links.js
//
// URLs dos links das cadeiras (AbaLinks).

// O que o usuário digita sem esquema ("ava.ufpe.br") vira https.
export const normalizarUrl = (u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

// `href` só para http(s) (#50). A digitação já passa por normalizarUrl, mas
// um backup .json importado/adulterado pode trazer `url: "javascript:..."`,
// que o React 18 renderiza (só avisa no console) e executa no clique.
// Qualquer outra coisa — inclusive espaço antes do esquema — fica sem href
// (o link aparece, mas não abre). Devolve undefined para o React omitir o
// atributo.
export function hrefSeguro(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url) ? url : undefined;
}
