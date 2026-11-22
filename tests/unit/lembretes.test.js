// Lembretes programados (#23): src/utils/lembretes.js (mesma lógica que a
// Cloud Function usa — functions/compartilhado/lembretes.js é uma cópia).
import { describe, it, expect } from "vitest";
import {
  LEMBRETES_PADRAO,
  JANELA_MS,
  RETENCAO_ENVIADOS_MS,
  sanitizarListaLembretes,
  sanitizarPreferenciasLembretes,
  textoAntecedencia,
  rotuloAntecedencia,
  textoListaLembretes,
  instanteLocal,
  partesLocais,
  chaveAvaliacaoLembrete,
  listarLembretes,
  montarNotificacao,
  podarEnviados,
  lembretesPendentes,
  lembretesDaAvaliacao,
  antecedenciaPersonalizada,
} from "../../src/utils/lembretes.js";
import { chaveAvaliacao } from "../../src/utils/projecao.js";
import { estadoDoAparelho, descreverAparelho } from "../../src/utils/aparelho.js";
import { appData, cadeira, compromisso } from "../fixtures/fabricas.js";

const MIN = 60000;
// 18/11/2026 10:00 em Recife (UTC-3) = 13:00 UTC — o "agora" do tests/setup.js.
const AGORA = Date.UTC(2026, 10, 18, 13, 0);

// Janela "todo o mês" para listar sem se preocupar com o recorte.
const TUDO = { desdeMs: Date.UTC(2026, 9, 1), ateMs: Date.UTC(2027, 0, 1) };

describe("sanitização", () => {
  it("lista: inteiros 0..30 dias, sem repetição, ordenada, no máx. 5", () => {
    expect(sanitizarListaLembretes([60, 15, 15, "30", -1, 1.5, 99999999, null, 0])).toEqual([0, 15, 30, 60]);
    expect(sanitizarListaLembretes([1, 2, 3, 4, 5, 6, 7])).toEqual([1, 2, 3, 4, 5]);
  });
  it("lista: [] = sem lembrete (fica); não-lista = undefined (usa o padrão)", () => {
    expect(sanitizarListaLembretes([])).toEqual([]);
    expect(sanitizarListaLembretes(undefined)).toBeUndefined();
    expect(sanitizarListaLembretes("15")).toBeUndefined();
  });
  it("preferências: sempre completas, campo ruim volta ao padrão", () => {
    expect(sanitizarPreferenciasLembretes(undefined)).toEqual(LEMBRETES_PADRAO);
    expect(sanitizarPreferenciasLembretes({ compromissos: [30, 5] })).toEqual({
      compromissos: [5, 30],
      avaliacoes: LEMBRETES_PADRAO.avaliacoes,
    });
    expect(sanitizarPreferenciasLembretes({ compromissos: [], avaliacoes: "x" })).toEqual({
      compromissos: [],
      avaliacoes: LEMBRETES_PADRAO.avaliacoes,
    });
  });
  it("não devolve as listas do padrão por referência (mutação não vaza)", () => {
    const p = sanitizarPreferenciasLembretes({});
    p.compromissos.push(999);
    expect(LEMBRETES_PADRAO.compromissos).toEqual([15]);
  });
});

describe("textos", () => {
  it("antecedência", () => {
    expect(textoAntecedencia(0)).toBe("na hora");
    expect(textoAntecedencia(15)).toBe("15 min antes");
    expect(textoAntecedencia(120)).toBe("2 h antes");
    expect(textoAntecedencia(1440)).toBe("1 dia antes");
    expect(textoAntecedencia(2880)).toBe("2 dias antes");
    expect(textoAntecedencia(10080)).toBe("1 semana antes");
    expect(rotuloAntecedencia(0)).toBe("Na hora");
    expect(rotuloAntecedencia(60)).toBe("1 h");
    expect(textoListaLembretes([])).toBe("sem lembrete");
    expect(textoListaLembretes([15, 1440])).toBe("15 min antes, 1 dia antes");
  });
});

describe("tempo (Recife = UTC-3 fixo)", () => {
  it("instanteLocal converte data/hora locais para epoch", () => {
    expect(instanteLocal("2026-11-18", "10:00")).toBe(AGORA);
    expect(instanteLocal("2026-11-18", "10:00")).toBe(new Date(2026, 10, 18, 10, 0).getTime()); // TZ dos testes
    expect(instanteLocal("2026-11-18", "")).toBeNull();
    expect(instanteLocal("18/11/2026", "10:00")).toBeNull();
    expect(instanteLocal("2026-11-18", "25:00")).toBeNull();
  });
  it("partesLocais volta para data/hora/dia da semana locais (0 = Seg)", () => {
    expect(partesLocais(AGORA)).toEqual({ dataISO: "2026-11-18", hora: "10:00", diaSemana: 2 });
    // 23:30 em Recife ainda é o mesmo dia, mesmo já sendo o dia seguinte em UTC.
    expect(partesLocais(instanteLocal("2026-11-18", "23:30")).dataISO).toBe("2026-11-18");
  });
});

describe("listarLembretes — compromissos", () => {
  it("usa o padrão global (15 min antes) quando o item não tem lembretes", () => {
    const c = compromisso({ id: "c1", data: "2026-11-18", inicio: "14:00" });
    const [l, ...resto] = listarLembretes(appData({ compromissos: [c] }), TUDO);
    expect(resto).toEqual([]);
    expect(l).toMatchObject({
      tipo: "compromisso",
      id: "c1",
      antecedencia: 15,
      disparoMs: instanteLocal("2026-11-18", "13:45"),
      chave: "compromisso|c1|2026-11-18T14:00|15",
    });
  });
  it("padrão global alterado vale para todos", () => {
    const c = compromisso({ data: "2026-11-18", inicio: "14:00" });
    const d = appData({ compromissos: [c], lembretes: { compromissos: [0, 60] } });
    expect(listarLembretes(d, TUDO).map((l) => l.antecedencia)).toEqual([60, 0]); // ordem de disparo
  });
  it("lista própria sobrescreve o padrão; [] = sem lembrete", () => {
    const a = compromisso({ data: "2026-11-18", inicio: "14:00", lembretes: [1440] });
    const b = compromisso({ data: "2026-11-18", inicio: "15:00", lembretes: [] });
    const r = listarLembretes(appData({ compromissos: [a, b] }), TUDO);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ id: a.id, antecedencia: 1440 });
  });
  it("compromisso feito ou sem data/hora válida não lembra", () => {
    const feito = compromisso({ data: "2026-11-18", inicio: "14:00", feito: true });
    const semHora = compromisso({ data: "2026-11-18", inicio: "" });
    const semData = compromisso({ data: "", inicio: "14:00" });
    expect(listarLembretes(appData({ compromissos: [feito, semHora, semData] }), TUDO)).toEqual([]);
  });
  it("janela é (desde, até]: exatamente no limite de cima entra, no de baixo não", () => {
    const c = compromisso({ data: "2026-11-18", inicio: "10:15" }); // dispara 10:00 = AGORA
    const d = appData({ compromissos: [c] });
    expect(listarLembretes(d, { desdeMs: AGORA - MIN, ateMs: AGORA })).toHaveLength(1);
    expect(listarLembretes(d, { desdeMs: AGORA, ateMs: AGORA + MIN })).toHaveLength(0);
  });
  it("remarcar muda a chave (o lembrete do novo horário não fica bloqueado)", () => {
    const antes = listarLembretes(appData({ compromissos: [compromisso({ id: "x", inicio: "14:00" })] }), TUDO);
    const depois = listarLembretes(appData({ compromissos: [compromisso({ id: "x", inicio: "16:00" })] }), TUDO);
    expect(antes[0].chave).not.toBe(depois[0].chave);
  });
});

describe("listarLembretes — avaliações", () => {
  // Lembretes de avaliação são ligados POR DATA (v7); ausente = desligado.
  const prova = (o = {}) => ({
    id: "av1",
    titulo: "Prova 1",
    data: "2026-11-25",
    hora: "10:00",
    lembretesAtivos: true,
    ...o,
  });

  it("desligados por padrão: sem `lembretesAtivos` (ou false) não lembra nada", () => {
    const sem = cadeira({ datas: [prova({ lembretesAtivos: undefined })] });
    const desligada = cadeira({ datas: [prova({ lembretesAtivos: false, lembretes: [60] })] });
    expect(listarLembretes(appData({ cadeiras: [sem] }), TUDO)).toEqual([]);
    expect(listarLembretes(appData({ cadeiras: [desligada] }), TUDO)).toEqual([]);
  });
  it("lembretesDaAvaliacao: null desligada; lista própria ou o padrão", () => {
    expect(lembretesDaAvaliacao({})).toBe(null);
    expect(lembretesDaAvaliacao({ lembretesAtivos: true })).toEqual([1440]);
    expect(lembretesDaAvaliacao({ lembretesAtivos: true }, [60, 2880])).toEqual([60, 2880]);
    expect(lembretesDaAvaliacao({ lembretesAtivos: true, lembretes: [180] }, [60])).toEqual([180]);
    expect(lembretesDaAvaliacao({ lembretesAtivos: true, lembretes: [] })).toEqual([]);
  });

  it("padrão: 1 dia antes, com o nome da cadeira", () => {
    const cad = cadeira({ id: "cad1", nome: "Cálculo", datas: [prova()] });
    const [l] = listarLembretes(appData({ cadeiras: [cad] }), TUDO);
    expect(l).toMatchObject({
      tipo: "avaliacao",
      titulo: "Prova 1",
      origem: "Cálculo",
      antecedencia: 1440,
      disparoMs: instanteLocal("2026-11-24", "10:00"),
    });
  });
  it("sem hora: conta a partir das 08:00", () => {
    const cad = cadeira({ datas: [prova({ hora: "" })] });
    const [l] = listarLembretes(appData({ cadeiras: [cad] }), TUDO);
    expect(l.disparoMs).toBe(instanteLocal("2026-11-24", "08:00"));
    expect(l.semHora).toBe(true);
  });
  it("removida da agenda ou concluída não lembra (mesma chave do calendário)", () => {
    const cad = cadeira({ datas: [prova()] });
    expect(chaveAvaliacaoLembrete(cad, cad.datas[0])).toBe(chaveAvaliacao(cad, cad.datas[0]));
    const chave = chaveAvaliacao(cad, cad.datas[0]);
    expect(listarLembretes(appData({ cadeiras: [cad], eventosExcluidos: [chave] }), TUDO)).toEqual([]);
    expect(listarLembretes(appData({ cadeiras: [cad], eventosConcluidos: [chave] }), TUDO)).toEqual([]);
  });
  it("fora da vigência da cadeira não lembra (igual ao calendário)", () => {
    const cad = cadeira({ dataFim: "2026-11-20", datas: [prova()] });
    expect(listarLembretes(appData({ cadeiras: [cad] }), TUDO)).toEqual([]);
  });
  it("lista própria na avaliação sobrescreve o padrão", () => {
    const cad = cadeira({ datas: [prova({ lembretes: [10080, 60] })] });
    expect(listarLembretes(appData({ cadeiras: [cad] }), TUDO).map((l) => l.antecedencia)).toEqual([10080, 60]);
  });
  it("dados quebrados não derrubam a função", () => {
    expect(listarLembretes(null, TUDO)).toEqual([]);
    expect(listarLembretes({ compromissos: [null, "x"], cadeiras: [{ datas: [null] }, null] }, TUDO)).toEqual([]);
  });
});

describe("montarNotificacao", () => {
  it("compromisso: quanto falta de verdade + dia + horário", () => {
    const c = compromisso({ id: "c1", nome: "Dentista", data: "2026-11-18", inicio: "10:15", fim: "11:00" });
    const [l] = listarLembretes(appData({ compromissos: [c] }), TUDO);
    expect(montarNotificacao(l, AGORA)).toEqual({
      titulo: "★ Dentista",
      corpo: "Começa em 15 min · hoje, 10:15–11:00",
      tag: l.chave,
    });
    // Chegou atrasado (função atrasou): o texto diz o que falta no envio.
    expect(montarNotificacao(l, AGORA + 10 * MIN).corpo).toBe("Começa em 5 min · hoje, 10:15–11:00");
    expect(montarNotificacao(l, AGORA + 15 * MIN).corpo).toBe("Começando agora · 10:15–11:00");
  });
  it("compromisso amanhã / em outro dia (sem repetir o dia)", () => {
    const quase = compromisso({ data: "2026-11-19", inicio: "09:00", lembretes: [1440] });
    const amanha = compromisso({ data: "2026-11-19", inicio: "11:00", lembretes: [1440] });
    const sexta = compromisso({ data: "2026-11-27", inicio: "09:00", lembretes: [1440] });
    const ls = listarLembretes(appData({ compromissos: [quase, amanha, sexta] }), TUDO);
    const corpo = (c) =>
      montarNotificacao(
        ls.find((l) => l.id === c.id),
        AGORA,
      ).corpo;
    expect(corpo(quase)).toBe("Começa em 23 h · amanhã, 09:00");
    expect(corpo(amanha)).toBe("Amanhã, 11:00");
    expect(corpo(sexta)).toBe("Sex, 27/11, 09:00 (em 9 dias)");
  });
  it("avaliação com e sem hora", () => {
    const cad = cadeira({
      nome: "Cálculo",
      datas: [
        { id: "a", titulo: "Prova 1", data: "2026-11-19", hora: "14:00", lembretesAtivos: true },
        { id: "b", titulo: "Lista", data: "2026-11-19", hora: "", lembretesAtivos: true },
      ],
    });
    const ls = listarLembretes(appData({ cadeiras: [cad] }), TUDO);
    const comHora = ls.find((l) => l.titulo === "Prova 1");
    const semHora = ls.find((l) => l.titulo === "Lista");
    expect(montarNotificacao(comHora, AGORA)).toMatchObject({
      titulo: "📚 Prova 1 — Cálculo",
      corpo: "Amanhã às 14:00",
    });
    expect(montarNotificacao(comHora, AGORA + 24 * 60 * MIN).corpo).toBe("Hoje às 14:00 (em 4 h)");
    expect(montarNotificacao(semHora, AGORA).corpo).toBe("Amanhã");
    const semana = { ...semHora, dataISO: "2026-11-25" };
    expect(montarNotificacao(semana, AGORA).corpo).toBe("Qua, 25/11 (em 7 dias)");
  });
});

describe("deduplicação (o que a função manda a cada minuto)", () => {
  it("pendentes = na janela de 10 min e ainda não enviados", () => {
    const c1 = compromisso({ id: "c1", data: "2026-11-18", inicio: "10:10" }); // disparou 09:55
    const c2 = compromisso({ id: "c2", data: "2026-11-18", inicio: "10:05" }); // disparou 09:50 (= limite de baixo)
    const c3 = compromisso({ id: "c3", data: "2026-11-18", inicio: "10:16" }); // dispara 10:01 (futuro)
    const d = appData({ compromissos: [c1, c2, c3] });
    expect(lembretesPendentes(d, {}, AGORA).map((l) => l.id)).toEqual(["c1"]);
    const [l] = lembretesPendentes(d, {}, AGORA);
    expect(lembretesPendentes(d, { [l.chave]: l.disparoMs }, AGORA)).toEqual([]);
    expect(JANELA_MS).toBe(10 * MIN);
  });
  it("podarEnviados descarta o que passou da retenção e lixo", () => {
    const r = podarEnviados({ velho: AGORA - RETENCAO_ENVIADOS_MS - 1, novo: AGORA - MIN, lixo: "x" }, AGORA);
    expect(r).toEqual({ novo: AGORA - MIN });
    expect(podarEnviados(undefined, AGORA)).toEqual({});
  });
});

describe("estado do aparelho (modal de lembretes)", () => {
  const base = {
    logado: true,
    ios: false,
    standalone: false,
    temNotification: true,
    temServiceWorker: true,
    temPush: true,
    permissao: "default",
    ativo: false,
  };
  it("cada situação vira um estado", () => {
    expect(estadoDoAparelho({ ...base, logado: false })).toBe("sem-login");
    expect(estadoDoAparelho({ ...base, ios: true, temPush: false })).toBe("ios-instalar");
    expect(estadoDoAparelho({ ...base, ios: true, standalone: true })).toBe("inativo");
    expect(estadoDoAparelho({ ...base, temPush: false })).toBe("sem-suporte");
    expect(estadoDoAparelho({ ...base, permissao: "denied" })).toBe("bloqueado");
    expect(estadoDoAparelho({ ...base, permissao: "granted", ativo: true })).toBe("ativo");
    // Ativo aqui, mas a permissão foi revogada no navegador: não finge que está ativo.
    expect(estadoDoAparelho({ ...base, permissao: "default", ativo: true })).toBe("inativo");
  });
  it("descreverAparelho", () => {
    expect(descreverAparelho("Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile Safari/537.36")).toBe(
      "Chrome · Android",
    );
    expect(descreverAparelho("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1")).toBe(
      "Safari · iOS",
    );
    expect(descreverAparelho("Mozilla/5.0 (Windows NT 10.0) Chrome/130 Safari/537.36 Edg/130")).toBe("Edge · Windows");
    expect(descreverAparelho()).toBe("Navegador · Outro");
  });
});

describe("antecedenciaPersonalizada (+ Adicionar na data)", () => {
  it("valor | h/dia/semana vira minutos", () => {
    expect(antecedenciaPersonalizada("2", "h")).toBe(120);
    expect(antecedenciaPersonalizada(3, "dia")).toBe(4320);
    expect(antecedenciaPersonalizada("1,5", "dia")).toBe(2160);
    expect(antecedenciaPersonalizada("2", "semana")).toBe(20160);
  });
  it("inválido, zero ou além de 30 dias ⇒ null", () => {
    expect(antecedenciaPersonalizada("", "h")).toBe(null);
    expect(antecedenciaPersonalizada("0", "dia")).toBe(null);
    expect(antecedenciaPersonalizada("-1", "h")).toBe(null);
    expect(antecedenciaPersonalizada("abc", "h")).toBe(null);
    expect(antecedenciaPersonalizada("5", "semana")).toBe(null);
    expect(antecedenciaPersonalizada("2", "ano")).toBe(null);
  });
});
