// Divisão do bundle (#25): vite.chunks.js
import { describe, it, expect } from "vitest";
import { nomeDoChunk, cicloEntreChunks } from "../../vite.chunks.js";

// Caminho no formato do Windows (onde o projeto roda), com barras invertidas.
const nm = (caminho) => ["C:", "proj", "node_modules", ...caminho.split("/")].join("\\");

describe("nomeDoChunk", () => {
  it("código do app fica no chunk principal (Rollup decide)", () => {
    expect(nomeDoChunk(["C:", "proj", "src", "App.jsx"].join("\\"))).toBeUndefined();
    expect(nomeDoChunk("/proj/src/utils/cadeiras.js")).toBeUndefined();
  });

  // Regressão: auth/firestore em chunks separados dos wrappers `firebase/*`
  // criou ciclo entre chunks e o app abriu em branco.
  it("Firebase inteiro (wrappers + @firebase/* + deps internas) num chunk só", () => {
    [
      "firebase/auth/dist/esm/index.esm.js",
      "firebase/node_modules/@firebase/auth/dist/esm/index.js", // vem aninhado no pacote `firebase`
      "firebase/firestore/dist/esm/index.esm.js",
      "@firebase/firestore/dist/index.esm.js",
      "re2js/build/index.esm.js",
      "@firebase/webchannel-wrapper/dist/bloom-blob/esm/bloom_blob_es2018.js",
      "firebase/app/dist/esm/index.esm.js",
      "@firebase/app/dist/esm/index.esm.js",
      "idb/build/index.js",
    ].forEach((caminho) => expect(nomeDoChunk(nm(caminho)), caminho).toBe("firebase"));
  });

  it("React e o resto das dependências", () => {
    expect(nomeDoChunk(nm("react-dom/cjs/react-dom.production.min.js"))).toBe("react");
    expect(nomeDoChunk(nm("scheduler/index.js"))).toBe("react");
    expect(nomeDoChunk(nm("lucide-react/dist/esm/icons/bell.js"))).toBe("vendor");
  });

  // Se o messaging caísse num chunk inicial, voltaria a ser baixado em toda
  // abertura (ele só é carregado por import() ao ativar lembretes, #23).
  it("messaging e installations ficam sob demanda (nem o wrapper entra)", () => {
    expect(nomeDoChunk(nm("@firebase/messaging/dist/esm/index.esm.js"))).toBeUndefined();
    expect(nomeDoChunk(nm("@firebase/installations/dist/esm/index.esm.js"))).toBeUndefined();
    expect(nomeDoChunk(nm("firebase/messaging/dist/esm/index.esm.js"))).toBeUndefined();
    expect(nomeDoChunk("/proj/node_modules/@firebase/messaging/dist/esm/index.esm.js")).toBeUndefined();
  });
});

describe("cicloEntreChunks", () => {
  it("sem ciclo → null (inclusive com dependência compartilhada)", () => {
    expect(cicloEntreChunks({ index: ["firebase", "react"], vendor: ["react"], firebase: [], react: [] })).toBeNull();
    expect(cicloEntreChunks({})).toBeNull();
  });

  it("acha o ciclo que deixou o app em branco", () => {
    expect(cicloEntreChunks({ index: ["firebase", "auth"], firebase: ["auth"], auth: ["firebase"] })).toEqual([
      "firebase",
      "auth",
      "firebase",
    ]);
  });

  it("ciclo mais longo e auto-import", () => {
    expect(cicloEntreChunks({ a: ["b"], b: ["c"], c: ["a"] })).toEqual(["a", "b", "c", "a"]);
    expect(cicloEntreChunks({ a: ["a"] })).toEqual(["a", "a"]);
  });
});
