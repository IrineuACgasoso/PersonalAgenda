// src/utils/id.js
// Id de item novo (#29). Antes: 8 caracteres de Math.random() (~41 bits,
// sem garantia de unicidade). Agora UUID v4 do navegador. Os ids antigos
// continuam valendo: nada depende do formato (as chaves de exceção usam "|"
// como separador, e o hífen do UUID não atrapalha).
// crypto.randomUUID só existe em contexto seguro (https/localhost); fora
// disso (ex.: abrir pelo IP da rede no `npm run dev`) cai no formato antigo.
export const uid = () => {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {
    /* cai no formato antigo */
  }
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
};
