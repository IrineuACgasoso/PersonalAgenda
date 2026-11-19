// Camada de proteção dos dados persistidos: src/utils/sanitizarDados.js
// Estes testes protegem contra PERDA DE DADOS — não afrouxe sem motivo.
import { describe, it, expect } from "vitest";
import { sanitizarDados, pareceVazio, DADOS_PADRAO } from "../../src/utils/sanitizarDados.js";
import { appData, afazer, cadeira, backupAntigo } from "../fixtures/fabricas.js";

describe("sanitizarDados", () => {
  it("entrada nula/inválida vira o padrão", () => {
    expect(sanitizarDados(null)).toEqual(DADOS_PADRAO);
    expect(sanitizarDados("lixo")).toEqual(DADOS_PADRAO);
  });

  it("é idempotente", () => {
    const d = appData({ afazeres: [afazer({ rotina: { tipo: "dias_especificos", diasSemana: [1, 3] } })] });
    const uma = sanitizarDados(d);
    expect(sanitizarDados(uma)).toEqual(uma);
  });

  it("preserva campos de rotina que já causaram bug (diasSemana)", () => {
    const d = sanitizarDados(appData({ afazeres: [afazer({ rotina: { tipo: "dias_especificos", diasSemana: [0, 4] } })] }));
    expect(d.afazeres[0].rotina.diasSemana).toEqual([0, 4]);
  });

  it("preserva excecoesData e datasConcluidas", () => {
    const af = afazer({ excecoesData: { "2026-11-04": "2026-11-05" }, datasConcluidas: ["2026-11-11"] });
    const d = sanitizarDados(appData({ afazeres: [af] }));
    expect(d.afazeres[0].excecoesData).toEqual({ "2026-11-04": "2026-11-05" });
    expect(d.afazeres[0].datasConcluidas).toEqual(["2026-11-11"]);
  });

  it("preserva campos desconhecidos de topo e de afazer (não apaga dado novo)", () => {
    const d = sanitizarDados({ ...appData({ afazeres: [{ ...afazer(), extra: 1 }] }), campoNovo: "x" });
    expect(d.campoNovo).toBe("x");
    expect(d.afazeres[0].extra).toBe(1);
  });

  it("excecoesData inválido (array) vira objeto vazio", () => {
    const d = sanitizarDados(appData({ afazeres: [{ ...afazer(), excecoesData: ["x"] }] }));
    expect(d.afazeres[0].excecoesData).toEqual({});
  });

  it("backup antigo ganha os arrays que faltam", () => {
    const d = sanitizarDados(backupAntigo());
    expect(d.compromissos).toEqual([]);
    expect(d.eventosConcluidos).toEqual([]);
    expect(d.eventosExcluidos).toEqual([]);
    expect(d.afazeres[0].rotina).toMatchObject({ tipo: "semanal", diasSemana: [] });
    expect(d.afazeres[0].datasConcluidas).toEqual([]);
  });

  it("lista de períodos vazia volta ao período padrão", () => {
    expect(sanitizarDados({ periodos: [] }).periodos).toEqual(DADOS_PADRAO.periodos);
  });

  // BUG CONHECIDO (todo.md): arrays internos de cadeira não são normalizados;
  // um backup sem `links` quebra `c.links.length` em VisaoCadeiras.
  it.fails("normaliza horarios/links/datas ausentes nas cadeiras", () => {
    const { links, ...semLinks } = cadeira();
    const d = sanitizarDados(appData({ cadeiras: [semLinks] }));
    expect(d.cadeiras[0].links).toEqual([]);
  });
});

describe("pareceVazio (trava anti-sobrescrita)", () => {
  it("padrão é vazio", () => expect(pareceVazio(DADOS_PADRAO)).toBe(true));
  it("null é vazio", () => expect(pareceVazio(null)).toBe(true));
  it("qualquer cadeira, compromisso ou afazer = não vazio", () => {
    expect(pareceVazio({ ...DADOS_PADRAO, cadeiras: [cadeira()] })).toBe(false);
    expect(pareceVazio({ ...DADOS_PADRAO, afazeres: [afazer()] })).toBe(false);
    expect(pareceVazio({ ...DADOS_PADRAO, compromissos: [{ id: "c" }] })).toBe(false);
  });
  it("período criado pelo usuário = não vazio", () => {
    expect(pareceVazio({ ...DADOS_PADRAO, periodos: [{ id: "abc", nome: "2027.1" }] })).toBe(false);
  });
});
