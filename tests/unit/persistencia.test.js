// Decisões do persist(): src/utils/persistencia.js (usePersistedData.js usa).
// #6 (updater funcional sem race), #39 (status só "sincronizado" com o
// servidor confirmando), #54 (gravações despachadas na hora, sem fila).
import { describe, it, expect } from "vitest";
import { resolverGravacao, statusDoSnapshot, criarDespachante } from "../../src/utils/persistencia.js";
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

describe("criarDespachante (#54)", () => {
  // Simula o setDoc offline: só resolve quando "o servidor confirma".
  function gravacaoPendente() {
    let resolver, rejeitar;
    const promessa = new Promise((res, rej) => {
      resolver = res;
      rejeitar = rej;
    });
    return { gravar: () => promessa, resolver, rejeitar };
  }

  it("dispara cada gravação na hora, mesmo com a anterior pendente (offline)", () => {
    const d = criarDespachante();
    const chamadas = [];
    d.enviar(() => { chamadas.push(1); return new Promise(() => {}); }); // nunca confirma
    d.enviar(() => { chamadas.push(2); return new Promise(() => {}); });
    d.enviar(() => { chamadas.push(3); return new Promise(() => {}); });
    // Antes do #54, só a 1ª chegava ao Firestore; as outras ficavam na memória.
    expect(chamadas).toEqual([1, 2, 3]);
    expect(d.pendentes).toBe(3);
  });

  it("conta pendentes até cada gravação terminar (sucesso ou erro)", async () => {
    const d = criarDespachante();
    const a = gravacaoPendente();
    const b = gravacaoPendente();
    const pa = d.enviar(a.gravar);
    const pb = d.enviar(b.gravar);
    expect(d.pendentes).toBe(2);
    a.resolver();
    await pa;
    expect(d.pendentes).toBe(1);
    b.rejeitar(new Error("permission-denied"));
    await pb;
    expect(d.pendentes).toBe(0);
  });

  it("só a gravação mais recente é marcada como `ultima`", async () => {
    const d = criarDespachante();
    const r1 = d.enviar(() => Promise.resolve());
    const r2 = d.enviar(() => Promise.resolve());
    expect(await r1).toMatchObject({ ok: true, ultima: false });
    expect(await r2).toMatchObject({ ok: true, ultima: true });
  });

  it("nunca rejeita: erro (inclusive síncrono, ex. localStorage cheio) vira ok=false", async () => {
    const d = criarDespachante();
    const erro = new Error("QuotaExceededError");
    const r1 = await d.enviar(() => { throw erro; });
    expect(r1).toEqual({ ok: false, erro, ultima: true });
    const r2 = await d.enviar(() => Promise.reject(erro));
    expect(r2).toEqual({ ok: false, erro, ultima: true });
    expect(d.pendentes).toBe(0);
  });

  it("gravação síncrona (deslogado, localStorage) também conta como ok", async () => {
    const d = criarDespachante();
    expect(await d.enviar(() => undefined)).toEqual({ ok: true, erro: null, ultima: true });
  });
});

describe("resolverGravacao nunca entrega undefined ao setDoc (#43)", () => {
  it("desmarcar afazer antigo sem concluidoEm grava sem o campo", () => {
    const atual = sanitizarDados(appData({ afazeres: [{ ...afazer({ id: "a1" }), feito: true }] }));
    delete atual.afazeres[0].concluidoEm;
    const r = resolverGravacao(atual, (d) => ({
      ...d,
      afazeres: d.afazeres.map((a) => ({ ...a, feito: false, concluidoEm: a.concluidoEm })),
    }));
    expect(r.ok).toBe(true);
    expect("concluidoEm" in r.dados.afazeres[0]).toBe(false);
  });
});
