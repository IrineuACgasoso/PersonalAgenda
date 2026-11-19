// Versionamento do schema: src/utils/migracoes.js (+ integração com sanitizarDados)
import { describe, it, expect } from "vitest";
import { VERSAO_ATUAL, MIGRACOES, versaoDos, ehVersaoFutura, migrarDados } from "../../src/utils/migracoes.js";
import { sanitizarDados } from "../../src/utils/sanitizarDados.js";
import { appData, backupAntigo } from "../fixtures/fabricas.js";

// Congela recursivamente: qualquer mutação da entrada lança erro.
function congelar(o) {
  Object.values(o).forEach((v) => v && typeof v === "object" && congelar(v));
  return Object.freeze(o);
}

describe("registro de migrações", () => {
  it("existe uma migração para cada versão de 1 até VERSAO_ATUAL", () => {
    for (let v = 1; v <= VERSAO_ATUAL; v++) expect(typeof MIGRACOES[v]).toBe("function");
  });
  it("não existe migração além da versão atual (esqueceu de subir VERSAO_ATUAL?)", () => {
    expect(Object.keys(MIGRACOES).map(Number).filter((v) => v > VERSAO_ATUAL)).toEqual([]);
  });
});

describe("versaoDos / ehVersaoFutura", () => {
  it("sem versão ou inválida = 0", () => {
    expect(versaoDos({})).toBe(0);
    expect(versaoDos({ versao: "2" })).toBe(0);
    expect(versaoDos({ versao: -1 })).toBe(0);
    expect(versaoDos(null)).toBe(0);
  });
  it("versão futura é detectada", () => {
    expect(ehVersaoFutura({ versao: VERSAO_ATUAL + 1 })).toBe(true);
    expect(ehVersaoFutura({ versao: VERSAO_ATUAL })).toBe(false);
    expect(ehVersaoFutura({})).toBe(false);
  });
});

describe("migrarDados", () => {
  it("dados pré-versionamento (v0) chegam na versão atual", () => {
    expect(migrarDados(backupAntigo()).versao).toBe(VERSAO_ATUAL);
  });
  it("não muta a entrada", () => {
    const entrada = congelar(backupAntigo());
    expect(() => migrarDados(entrada)).not.toThrow();
  });
  it("dados já atuais são devolvidos como estão", () => {
    const d = appData({ versao: VERSAO_ATUAL });
    expect(migrarDados(d)).toBe(d);
  });
  it("dados de versão futura não são tocados", () => {
    const d = { ...appData(), versao: VERSAO_ATUAL + 5, formatoNovo: true };
    expect(migrarDados(d)).toBe(d);
  });
  it("v0 → v1 preserva todo o conteúdo (baseline)", () => {
    const { versao, ...resto } = migrarDados(backupAntigo());
    expect(resto).toEqual(backupAntigo());
  });
});

describe("integração com sanitizarDados", () => {
  it("dados sem versão saem marcados com a versão atual", () => {
    expect(sanitizarDados(backupAntigo()).versao).toBe(VERSAO_ATUAL);
  });
  it("estado padrão já nasce versionado", () => {
    expect(sanitizarDados(null).versao).toBe(VERSAO_ATUAL);
  });
  it("nunca rebaixa a versão de dados futuros", () => {
    expect(sanitizarDados({ ...appData(), versao: VERSAO_ATUAL + 1 }).versao).toBe(VERSAO_ATUAL + 1);
  });
  it("re-sanitizar dados atuais mantém a versão (idempotente)", () => {
    const uma = sanitizarDados(backupAntigo());
    expect(sanitizarDados(uma)).toEqual(uma);
  });
});
