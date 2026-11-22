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

// Classroom (código da turma) × link web. Itens antigos só têm o código.
export const ehClassroom = (l) => !!(l && (l.isClassroom || l.codigoClassroom));

// Arrastar para reordenar (drawer da cadeira): leva `idOrigem` para a posição
// de `idAlvo` na lista INTEIRA (quem estava lá anda uma casa). Devolve a
// mesma lista se algum id não existir ou forem iguais. Gravado num único
// onAtualizar (edição atômica).
export function moverParaPosicao(lista, idOrigem, idAlvo) {
  const de = (lista || []).findIndex((x) => x.id === idOrigem);
  const para = (lista || []).findIndex((x) => x.id === idAlvo);
  if (de === -1 || para === -1 || de === para) return lista;
  const copia = [...lista];
  const [item] = copia.splice(de, 1);
  copia.splice(para, 0, item);
  return copia;
}
