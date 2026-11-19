// Decisões do persist(): src/utils/persistencia.js (usePersistedData.js usa).
// #6 (updater funcional sem race) e #39 (status só "sincronizado" com o
// servidor confirmando).
import { describe, it, expect } from "vitest";
import { resolverGravacao, statusDoSnapshot } from "../../src/utils/persistencia.js";
import { sanitizarDados } from "../../src/utils/sanitizarDados.js";
import { VERSAO_ATUAL } from "../../src/utils/migracoes.js";
import { appData, cadeira, horario, afazer } from "../fixtures/fabricas.js";

// Simula o dataRef do hook: cada persist() lê o resultado do anterior.
function simularPersists(inicial, ...entradas) {
  let atual = inicial;
  for (const entrada of entradas) {
    const r = resolverGravacao(atual, entrada);
    if (r.dados) atual = r.dados;
  }
  return atual;
}

describe("resolverGravacao", () => {
  it("aceita updater e passa o estado atual", () => {
    const atual = sanitizarDados(appData());
    const r = resolverGravacao(atual, (d) => ({ ...d, periodoAtivoId: "p2" }));
    expect(r).toMatchObject({ ok: true, motivo: null });
    expect(r.dados.periodoAtivoId).toBe("p2");
  });

  it("aceita objeto completo (importar/restaurar backup)", () => {
    const atual = sanitizarDados(appData());
    const novo = appData({ cadeiras: [cadeira({ nome: "Restaurada" })] });
    const r = resolverGravacao(atual, novo);
    expect(r.ok).toBe(true);
    expect(r.dados.cadeiras[0].nome).toBe("Restaurada");
  });

  it("regressão #6: blur do nome + clique em 'Adicionar' no mesmo tick não se sobrescrevem", () => {
    const c = cadeira({ id: "c1", nome: "Antigo", horarios: [] });
    const inicial = sanitizarDados(appData({ cadeiras: [c] }));
    const atualizarCadeira = (id, patch) => (d) => ({
      ...d,
      cadeiras: d.cadeiras.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    });
    // O drawer monta o patch do clique com a cadeira do render velho.
    const final = simularPersists(
      inicial,
      atualizarCadeira("c1", { nome: "Novo" }),
      atualizarCadeira("c1", { horarios: [...c.horarios, horario()] })
    );
    expect(final.cadeiras[0].nome).toBe("Novo");
    expect(final.cadeiras[0].horarios).toHaveLength(1);
  });

  it("duas criações seguidas não se perdem", () => {
    const inicial = sanitizarDados(appData({ afazeres: [] }));
    const criar = (nome) => (d) => ({ ...d, afazeres: [...d.afazeres, afazer({ nome })] });
    const final = simularPersists(inicial, criar("A"), criar("B"));
    expect(final.afazeres.map((a) => a.nome)).toEqual(["A", "B"]);
  });

  it("updater que devolve o próprio estado não grava nada", () => {
    const atual = sanitizarDados(appData());
    expect(resolverGravacao(atual, (d) => d)).toEqual({ ok: true, motivo: "sem-mudanca" });
    expect(resolverGravacao(atual, () => undefined)).toEqual({ ok: true, motivo: "sem-mudanca" });
  });

  it("recusa gravar 'vazio' por cima de dados com conteúdo", () => {
    const atual = sanitizarDados(appData());
    const r = resolverGravacao(atual, (d) => ({ ...d, cadeiras: [], compromissos: [], afazeres: [], periodos: [] }));
    expect(r).toEqual({ ok: false, motivo: "parece-vazio" });
  });

  it("recusa dados de versão futura (no estado atual ou no novo)", () => {
    const atual = sanitizarDados(appData());
    const futuro = { ...appData(), versao: VERSAO_ATUAL + 1 };
    expect(resolverGravacao(atual, futuro)).toEqual({ ok: false, motivo: "versao-futura" });
    expect(resolverGravacao(futuro, (d) => ({ ...d, periodoAtivoId: "x" }))).toEqual({
      ok: false,
      motivo: "versao-futura",
    });
  });
});

describe("statusDoSnapshot (#39)", () => {
  it("escrita local ainda não confirmada NÃO conta como sincronizada", () => {
    expect(statusDoSnapshot({ fromCache: false, hasPendingWrites: true }, true)).toEqual({
      status: "saving",
      sincronizado: false,
    });
    expect(statusDoSnapshot({ fromCache: false, hasPendingWrites: true }, false).status).toBe("offline");
  });

  it("só sincroniza com fromCache=false e hasPendingWrites=false", () => {
    expect(statusDoSnapshot({ fromCache: false, hasPendingWrites: false }, true)).toEqual({
      status: "saved",
      sincronizado: true,
    });
  });

  it("snapshot do cache = offline", () => {
    expect(statusDoSnapshot({ fromCache: true, hasPendingWrites: false }, true)).toEqual({
      status: "offline",
      sincronizado: false,
    });
  });
});
