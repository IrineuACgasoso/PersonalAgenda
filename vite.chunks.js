// Divisão do bundle em chunks (#25), usada em vite.config.js (manualChunks).
//
// Por que não "lazy load do Firestore/Auth": o app é offline-first e, logado,
// os dados vêm do Firestore (cache IndexedDB) já na abertura — adiar o SDK só
// atrasaria a primeira tela com dados e mexeria no usePersistedData (crítico).
// O ganho real está em separar o que quase nunca muda (Firebase, React) do
// código do app: num deploy comum só o chunk do app (~130 kB) muda, então o
// service worker baixa só ele, e os chunks grandes seguem no cache.
//
// Firebase inteiro (app + auth + firestore) num chunk SÓ: separar auth e
// firestore criou ciclo entre chunks (os wrappers `firebase/*` caíam num e os
// `@firebase/*` noutro) e o app abria em branco ("Cannot access … before
// initialization"). O plugin `semCiclosEntreChunks` (abaixo) faz o build
// falhar se isso voltar a acontecer — o deploy nunca sai em branco.
//
// O `firebase/messaging` (lembretes, #23) é carregado por import() em
// src/notificacoes.js. Se ele (ou o wrapper `firebase/messaging`) caísse num
// chunk inicial, voltaria a ser baixado em toda abertura — por isso fica de
// fora (undefined = o Rollup decide, e ele mantém o chunk sob demanda).

const SOB_DEMANDA = /[\\/](?:@firebase|firebase)[\\/](?:messaging|installations)[\\/]/;

export function nomeDoChunk(id) {
  if (!/[\\/]node_modules[\\/]/.test(id)) return undefined;
  if (SOB_DEMANDA.test(id)) return undefined;
  // re2js e webchannel-wrapper são dependências internas do Firestore; idb, do app/heartbeat.
  if (/[\\/](?:@firebase|firebase|re2js|idb)[\\/]/.test(id)) return "firebase";
  if (/[\\/](?:react|react-dom|scheduler)[\\/]/.test(id)) return "react";
  return "vendor";
}

/**
 * Primeiro ciclo de imports estáticos entre chunks, ou null.
 * `grafo`: { arquivo: [arquivos que ele importa] }. Ciclo = lista de
 * arquivos começando e terminando no mesmo (ex.: [a, b, a]).
 */
export function cicloEntreChunks(grafo) {
  const estado = {}; // undefined = não visto, 1 = na pilha, 2 = resolvido
  const pilha = [];
  const visitar = (no) => {
    estado[no] = 1;
    pilha.push(no);
    for (const prox of grafo[no] || []) {
      if (estado[prox] === 1) return [...pilha.slice(pilha.indexOf(prox)), prox];
      if (!estado[prox]) {
        const ciclo = visitar(prox);
        if (ciclo) return ciclo;
      }
    }
    pilha.pop();
    estado[no] = 2;
    return null;
  };
  for (const no of Object.keys(grafo)) {
    if (!estado[no]) {
      const ciclo = visitar(no);
      if (ciclo) return ciclo;
    }
  }
  return null;
}

// Plugin do Vite: aborta o build se os chunks se importarem em ciclo.
export function semCiclosEntreChunks() {
  return {
    name: "sem-ciclos-entre-chunks",
    generateBundle(_opcoes, bundle) {
      const grafo = {};
      for (const [arquivo, saida] of Object.entries(bundle)) {
        if (saida.type === "chunk") grafo[arquivo] = saida.imports;
      }
      const ciclo = cicloEntreChunks(grafo);
      if (ciclo) this.error(`Ciclo entre chunks (o app abriria em branco): ${ciclo.join(" → ")}`);
    },
  };
}
