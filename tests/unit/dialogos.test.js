// Diálogos próprios (#17) e avisos de gravação recusada (#44):
// src/utils/dialogos.js (o provider ui/Dialogos.jsx só desenha).
import { describe, it, expect } from "vitest";
import { enfileirarDialogo, removerDialogo, mensagemDeRecusa, resumoDoBackup } from "../../src/utils/dialogos.js";
import { resolverGravacao } from "../../src/utils/persistencia.js";
import { appData, periodo, cadeira, afazer } from "../fixtures/fabricas.js";

describe("fila de diálogos", () => {
  it("enfileira na ordem de chegada", () => {
    let { fila } = enfileirarDialogo([], { id: 1, tipo: "aviso", chave: "a" });
    ({ fila } = enfileirarDialogo(fila, { id: 2, tipo: "confirmar" }));
    expect(fila.map((d) => d.id)).toEqual([1, 2]);
  });

  it("aviso repetido (mesma chave) não entra de novo e aponta o existente", () => {
    const { fila } = enfileirarDialogo([], { id: 1, chave: "aviso|x" });
    const r = enfileirarDialogo(fila, { id: 2, chave: "aviso|x" });
    expect(r.fila).toBe(fila);
    expect(r.duplicado.id).toBe(1);
  });

  it("confirmações (sem chave) nunca são deduplicadas", () => {
    const { fila } = enfileirarDialogo([], { id: 1, texto: "Excluir?" });
    const r = enfileirarDialogo(fila, { id: 2, texto: "Excluir?" });
    expect(r.duplicado).toBeNull();
    expect(r.fila).toHaveLength(2);
  });

  it("removerDialogo tira só o respondido, sem mutar", () => {
    const fila = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(removerDialogo(fila, 2).map((d) => d.id)).toEqual([1, 3]);
    expect(fila).toHaveLength(3);
  });
});

describe("mensagemDeRecusa (#44)", () => {
  it("tem texto para toda recusa do persist()", () => {
    for (const motivo of ["parece-vazio", "versao-futura", "carregando"]) {
      expect(mensagemDeRecusa(motivo)).toEqual(expect.any(String));
    }
  });

  it("não avisa quando gravou ou não havia mudança", () => {
    expect(mensagemDeRecusa(null)).toBeNull();
    expect(mensagemDeRecusa("sem-mudanca")).toBeNull();
    expect(mensagemDeRecusa(undefined)).toBeNull();
  });

  // Regressão do #44: com só o período padrão "p1", excluir a última cadeira
  // é recusado pela trava — e isso agora vira um aviso na tela.
  it("excluir a última cadeira com só o período padrão gera aviso", () => {
    const c = cadeira({ periodoId: "p1" });
    const atual = appData({ periodos: [periodo({ id: "p1" })], periodoAtivoId: "p1", cadeiras: [c] });
    const r = resolverGravacao(atual, (d) => ({ ...d, cadeiras: d.cadeiras.filter((x) => x.id !== c.id) }));
    expect(r.ok).toBe(false);
    expect(mensagemDeRecusa(r.motivo)).toMatch(/proteção contra perda de dados/);
  });
});

describe("resumoDoBackup (lista de Restaurar da nuvem)", () => {
  it("conta cadeiras, compromissos e afazeres com plural certo", () => {
    const payload = appData({ cadeiras: [cadeira(), cadeira()], afazeres: [afazer()] });
    expect(resumoDoBackup(payload)).toBe("2 cadeiras · 0 compromissos · 1 afazer");
  });

  it("aguenta payload ausente ou malformado", () => {
    expect(resumoDoBackup(undefined)).toBe("0 cadeiras · 0 compromissos · 0 afazeres");
    expect(resumoDoBackup({ cadeiras: "x" })).toBe("0 cadeiras · 0 compromissos · 0 afazeres");
  });
});
