// Camada de proteção dos dados persistidos: src/utils/sanitizarDados.js
// Estes testes protegem contra PERDA DE DADOS — não afrouxe sem motivo.
import { describe, it, expect } from "vitest";
import { sanitizarDados, pareceVazio, DADOS_PADRAO, removerUndefined } from "../../src/utils/sanitizarDados.js";
import { appData, afazer, cadeira, rotina, compromisso, horario, backupAntigo } from "../fixtures/fabricas.js";
import { VERSAO_ATUAL } from "../../src/utils/migracoes.js";

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
    const d = sanitizarDados(
      appData({ afazeres: [afazer({ rotina: { tipo: "dias_especificos", diasSemana: [0, 4] } })] }),
    );
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

  // Regressão #5: arrays internos de cadeira não eram normalizados; um backup
  // sem `links` quebrava `c.links.length` em VisaoCadeiras.
  it("normaliza horarios/links/datas ausentes nas cadeiras", () => {
    const { links, ...semLinks } = cadeira();
    const d = sanitizarDados(appData({ cadeiras: [semLinks, { id: "c2", nome: "Só nome" }] }));
    expect(d.cadeiras[0].links).toEqual([]);
    expect(d.cadeiras[1]).toMatchObject({ horarios: [], links: [], datas: [] });
  });

  it("normaliza horarios ausentes/inválidos nas rotinas", () => {
    const d = sanitizarDados(appData({ versao: 5, rotinas: [{ id: "x", nome: "Academia", horarios: "lixo" }] }));
    expect(d.rotinas[0].horarios).toEqual([]);
  });

  it("vigência da rotina (#56): só YYYY-MM-DD sobrevive", () => {
    const d = sanitizarDados(
      appData({
        rotinas: [
          { id: "a", nome: "A", horarios: [], dataInicio: "2026-08-01", dataFim: "2026-12-15" },
          { id: "b", nome: "B", horarios: [], dataInicio: 5, dataFim: "15/12/2026" },
          { id: "c", nome: "C", horarios: [], dataInicio: "" },
        ],
      }),
    );
    expect(d.rotinas[0]).toMatchObject({ dataInicio: "2026-08-01", dataFim: "2026-12-15" });
    expect("dataInicio" in d.rotinas[1] || "dataFim" in d.rotinas[1]).toBe(false);
    expect("dataInicio" in d.rotinas[2]).toBe(false);
  });

  it("preserva o conteúdo e os campos extras de cadeiras/rotinas/compromissos", () => {
    const h = horario();
    const c = cadeira({ horarios: [h], links: [{ id: "l1", url: "https://x.com" }], extra: 7 });
    const r = rotina({ horarios: [h], extra: 8 });
    const comp = compromisso({ fim: "15:00", concluidoEm: 5, extra: 9 });
    const d = sanitizarDados(appData({ versao: 5, cadeiras: [c], rotinas: [r], compromissos: [comp] }));
    expect(d.cadeiras[0]).toEqual(c);
    expect(d.rotinas[0]).toEqual(r);
    expect(d.compromissos[0]).toEqual(comp);
  });

  it("compromisso com data/hora inválidas não quebra (vira vazio; fim inválido some)", () => {
    const d = sanitizarDados(
      appData({ versao: 5, compromissos: [{ id: "k", nome: "X", data: "amanhã", inicio: 9, fim: "x", feito: 1 }] }),
    );
    expect(d.compromissos[0]).toEqual({ id: "k", nome: "X", data: "", inicio: "", feito: true });
  });

  it("data de fim da repetição: só YYYY-MM-DD sobrevive; sem ela = '' (para sempre)", () => {
    const ok = afazer({ rotina: { tipo: "diaria", dataFim: "2026-12-01" } });
    const lixo = afazer({ rotina: { tipo: "diaria", dataFim: "logo" } });
    const d = sanitizarDados(appData({ versao: 5, afazeres: [ok, lixo] }));
    expect(d.afazeres.map((a) => a.rotina.dataFim)).toEqual(["2026-12-01", ""]);
    expect("totalRepeticoes" in d.afazeres[0].rotina).toBe(false);
  });

  it("descarta itens que não são objetos (null, string) em vez de quebrar", () => {
    const c = cadeira({ horarios: [null, horario(), "x"] });
    const d = sanitizarDados(appData({ cadeiras: [null, c], compromissos: [7], afazeres: [null, afazer()] }));
    expect(d.cadeiras).toHaveLength(1);
    expect(d.cadeiras[0].horarios).toHaveLength(1);
    expect(d.compromissos).toEqual([]);
    expect(d.afazeres).toHaveLength(1);
  });
});

describe("pareceVazio (trava anti-sobrescrita)", () => {
  it("padrão é vazio", () => expect(pareceVazio(DADOS_PADRAO)).toBe(true));
  it("null é vazio", () => expect(pareceVazio(null)).toBe(true));
  it("qualquer cadeira, rotina, compromisso ou afazer = não vazio", () => {
    expect(pareceVazio({ ...DADOS_PADRAO, cadeiras: [cadeira()] })).toBe(false);
    expect(pareceVazio({ ...DADOS_PADRAO, rotinas: [rotina()] })).toBe(false);
    expect(pareceVazio({ ...DADOS_PADRAO, afazeres: [afazer()] })).toBe(false);
    expect(pareceVazio({ ...DADOS_PADRAO, compromissos: [{ id: "c" }] })).toBe(false);
  });
  it("período criado pelo usuário = não vazio", () => {
    expect(pareceVazio({ ...DADOS_PADRAO, periodos: [{ id: "abc", nome: "2027.1" }] })).toBe(false);
  });
});

// #43: o Firestore recusa setDoc com qualquer campo `undefined`, e o valor
// ficava no estado → todas as gravações seguintes falhavam.
describe("removerUndefined / sanitizarDados sem undefined (#43)", () => {
  // Procura qualquer `undefined` em profundidade (o que o Firestore recusaria).
  const temUndefined = (v) =>
    v === undefined ||
    (Array.isArray(v) && v.some(temUndefined)) ||
    (!!v && typeof v === "object" && Object.values(v).some(temUndefined));

  it("afazer desmarcado com concluidoEm: undefined não carrega o campo", () => {
    const d = sanitizarDados(appData({ afazeres: [{ ...afazer(), feito: false, concluidoEm: undefined }] }));
    expect("concluidoEm" in d.afazeres[0]).toBe(false);
    expect(temUndefined(d)).toBe(false);
  });

  it("remove undefined em qualquer nível (topo, cadeira, horário, listas)", () => {
    const c = { ...cadeira(), apelido: undefined, horarios: [{ ...horario(), local: undefined }, undefined] };
    const d = sanitizarDados({ ...appData({ cadeiras: [c] }), campoX: undefined, eventosConcluidos: ["a", undefined] });
    expect(temUndefined(d)).toBe(false);
    expect("campoX" in d).toBe(false);
    expect(d.cadeiras[0].horarios).toHaveLength(1);
    expect(d.eventosConcluidos).toEqual(["a"]);
  });

  it("rotina montada pelo formulário com campos undefined sai limpa", () => {
    const af = {
      ...afazer(),
      rotina: { tipo: "diaria", intervaloDias: undefined, diasSemana: undefined, dataFim: undefined },
    };
    expect(temUndefined(sanitizarDados(appData({ afazeres: [af] })))).toBe(false);
  });

  it("preserva null, false, 0 e string vazia (só undefined sai)", () => {
    expect(removerUndefined({ a: null, b: false, c: 0, d: "", e: undefined })).toEqual({
      a: null,
      b: false,
      c: 0,
      d: "",
    });
  });

  it("não muta a entrada", () => {
    const entrada = { a: undefined, b: [{ c: undefined }] };
    removerUndefined(entrada);
    expect("a" in entrada).toBe(true);
    expect("c" in entrada.b[0]).toBe(true);
  });
});

describe("vigência da cadeira (#19)", () => {
  it("mantém datas válidas e descarta lixo", () => {
    const d = sanitizarDados({
      versao: 4,
      periodos: [{ id: "p", nome: "x" }],
      cadeiras: [
        { id: "a", periodoId: "p", dataInicio: "2026-08-01", dataFim: "2026-12-15" },
        { id: "b", periodoId: "p", dataInicio: 5, dataFim: "15/12/2026" },
        { id: "c", periodoId: "p", dataInicio: "" },
      ],
    });
    expect(d.cadeiras[0]).toMatchObject({ dataInicio: "2026-08-01", dataFim: "2026-12-15" });
    expect("dataInicio" in d.cadeiras[1] || "dataFim" in d.cadeiras[1]).toBe(false);
    expect("dataInicio" in d.cadeiras[2]).toBe(false);
  });
});

// Lembretes (#23): campos opcionais, sem migração — tem que sobreviver ao persist().
describe("lembretes (#23)", () => {
  it("padrões globais sempre completos; valor salvo é mantido", () => {
    expect(sanitizarDados(appData()).lembretes).toEqual({ compromissos: [15], avaliacoes: [1440] });
    expect(sanitizarDados(appData({ lembretes: { compromissos: [], avaliacoes: [60] } })).lembretes).toEqual({
      compromissos: [],
      avaliacoes: [60],
    });
  });
  it("lembretes do compromisso e da avaliação sobrevivem; ausente continua ausente (= padrão)", () => {
    const d = sanitizarDados(
      appData({
        versao: VERSAO_ATUAL, // sem versão, a migração v5 trataria `compromissos` como rotinas
        compromissos: [compromisso({ id: "c1", lembretes: [60, 0] }), compromisso({ id: "c2" })],
        cadeiras: [
          cadeira({
            datas: [
              { id: "a1", titulo: "P1", data: "2026-11-25", lembretes: [] },
              { id: "a2", titulo: "P2", data: "2026-11-26" },
            ],
          }),
        ],
      }),
    );
    expect(d.compromissos[0].lembretes).toEqual([0, 60]);
    expect("lembretes" in d.compromissos[1]).toBe(false);
    expect(d.cadeiras[0].datas[0].lembretes).toEqual([]);
    expect("lembretes" in d.cadeiras[0].datas[1]).toBe(false);
  });
  it("lixo nos lembretes some (vira padrão) sem levar o item junto", () => {
    const d = sanitizarDados(
      appData({ versao: VERSAO_ATUAL, compromissos: [compromisso({ id: "c1", lembretes: "15" })] }),
    );
    expect(d.compromissos[0]).toMatchObject({ id: "c1" });
    expect("lembretes" in d.compromissos[0]).toBe(false);
  });
});
