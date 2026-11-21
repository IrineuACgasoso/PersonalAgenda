// O que aparece em cada dia do calendário geral: src/utils/projecao.js
import { describe, it, expect } from "vitest";
import {
  projetarEventos,
  compararEventosDoDia,
  ordenarEventosDoDia,
  eventoConcluido,
  textoDistanciaDeHoje,
  subtituloEvento,
  itensAtrasados,
  textoAtrasados,
  projetarMarcosVigencia,
  marcadoresDoDia,
  resumirMarcadores,
} from "../../src/utils/projecao.js";
import { cadeira, rotina, compromisso, afazer, horario } from "../fixtures/fabricas.js";

const NOV = { inicioISO: "2026-11-01", fimISO: "2026-11-30", hojeISO: "2026-11-18" };
const titulos = (mapa, dia) => (mapa[dia] || []).map((e) => e.titulo);

describe("aulas", () => {
  const c = cadeira({
    id: "c1",
    periodoId: "p",
    nome: "IP",
    horarios: [horario({ id: "h1", dia: 0, inicio: "08:00" })],
  });

  it("aparecem só no dia da semana do horário (segundas de novembro)", () => {
    const m = projetarEventos({ ...NOV, cadeiras: [c] });
    const dias = Object.keys(m).filter((d) => m[d].some((e) => e.tipo === "aulas"));
    expect(dias).toEqual(["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"]);
  });

  it("respeitam a vigência da própria cadeira (#19)", () => {
    const m = projetarEventos({ ...NOV, cadeiras: [{ ...c, dataInicio: "2026-11-05", dataFim: "2026-11-20" }] });
    expect(titulos(m, "2026-11-02")).toEqual([]);
    expect(titulos(m, "2026-11-09")).toEqual(["IP"]);
    expect(titulos(m, "2026-11-16")).toEqual(["IP"]);
    expect(titulos(m, "2026-11-23")).toEqual([]);
  });

  it("ocorrência excluída some só naquele dia", () => {
    const m = projetarEventos({ ...NOV, cadeiras: [c], eventosExcluidos: ["aulas|2026-11-09|c1|h1"] });
    expect(titulos(m, "2026-11-09")).toEqual([]);
    expect(titulos(m, "2026-11-16")).toEqual(["IP"]);
  });

  it("filtro desligado remove as aulas", () => {
    const m = projetarEventos({
      ...NOV,
      cadeiras: [c],
      filtros: { aulas: false, avaliacoes: true, rotinas: true, compromissos: true, afazeres: true },
    });
    expect(titulos(m, "2026-11-02")).toEqual([]);
  });
});

describe("marcos de vigência (#19)", () => {
  it("início e fim de cada cadeira no dia certo, só dentro da janela", () => {
    const a = cadeira({ id: "a", nome: "IP", cor: "#f00", dataInicio: "2026-11-03", dataFim: "2027-03-01" });
    const b = cadeira({ id: "b", nome: "Cálculo", cor: "#0f0", dataInicio: "2026-11-03", dataFim: "2026-11-27" });
    const m = projetarMarcosVigencia([a, b, cadeira()], NOV.inicioISO, NOV.fimISO);
    expect(Object.keys(m).sort()).toEqual(["2026-11-03", "2026-11-27"]);
    expect(m["2026-11-03"]).toEqual([
      { tipo: "inicio", idCadeira: "a", nome: "IP", cor: "#f00" },
      { tipo: "inicio", idCadeira: "b", nome: "Cálculo", cor: "#0f0" },
    ]);
    expect(m["2026-11-27"]).toEqual([{ tipo: "fim", idCadeira: "b", nome: "Cálculo", cor: "#0f0" }]);
  });
  it("avaliação fora da vigência não aparece", () => {
    const c = cadeira({
      dataFim: "2026-11-15",
      datas: [
        { id: "d1", titulo: "P1", data: "2026-11-10" },
        { id: "d2", titulo: "Final", data: "2026-11-20" },
      ],
    });
    const m = projetarEventos({ ...NOV, cadeiras: [c] });
    expect(titulos(m, "2026-11-10")).toEqual(["P1"]);
    expect(titulos(m, "2026-11-20")).toEqual([]);
  });
});

describe("avaliações", () => {
  it("aparecem na data, com a cor da cadeira", () => {
    const c = cadeira({
      nome: "IP",
      cor: "#f00",
      datas: [{ id: "d", titulo: "Prova 1", data: "2026-11-20", hora: "10:00" }],
    });
    const [ev] = projetarEventos({ ...NOV, cadeiras: [c] })["2026-11-20"];
    expect(ev).toMatchObject({ tipo: "avaliacoes", titulo: "Prova 1", cor: "#f00", origem: "IP" });
  });
});

describe("rotinas (ex-compromissos semanais, v5)", () => {
  it("projetadas semanalmente", () => {
    const r = rotina({ nome: "Academia", horarios: [horario({ dia: 4, inicio: "18:00" })] });
    const m = projetarEventos({ ...NOV, rotinas: [r] });
    expect(titulos(m, "2026-11-06")).toEqual(["Academia"]);
    expect(titulos(m, "2026-11-07")).toEqual([]);
    expect(m["2026-11-06"][0]).toMatchObject({ tipo: "rotinas", hora: "18:00" });
  });
  it("filtro de rotinas desliga só elas", () => {
    const r = rotina({ horarios: [horario({ dia: 4 })] });
    const c = compromisso({ data: "2026-11-06" });
    const m = projetarEventos({
      ...NOV,
      rotinas: [r],
      compromissos: [c],
      filtros: { rotinas: false, compromissos: true },
    });
    expect(m["2026-11-06"].map((e) => e.tipo)).toEqual(["compromissos"]);
  });
  it("vigência própria (#56): fora de dataInicio/dataFim não aparece", () => {
    // Sextas de novembro/2026: 06, 13, 20, 27.
    const r = rotina({ horarios: [horario({ dia: 4 })], dataInicio: "2026-11-10", dataFim: "2026-11-20" });
    const m = projetarEventos({ ...NOV, rotinas: [r] });
    const dias = Object.keys(m).filter((d) => m[d].some((e) => e.tipo === "rotinas"));
    expect(dias.sort()).toEqual(["2026-11-13", "2026-11-20"]);
  });
  it("só início ou só fim limita só daquele lado", () => {
    const so = (extra) => {
      const m = projetarEventos({ ...NOV, rotinas: [rotina({ horarios: [horario({ dia: 4 })], ...extra })] });
      return Object.keys(m)
        .filter((d) => m[d].some((e) => e.tipo === "rotinas"))
        .sort();
    };
    expect(so({ dataInicio: "2026-11-14" })).toEqual(["2026-11-20", "2026-11-27"]);
    expect(so({ dataFim: "2026-11-06" })).toEqual(["2026-11-06"]);
  });
});

describe("compromissos pontuais (v5)", () => {
  it("aparecem só na data, com hora de início e conclusão do próprio item", () => {
    const c = compromisso({
      id: "k1",
      nome: "Dentista",
      data: "2026-11-20",
      inicio: "14:00",
      fim: "15:00",
      feito: true,
    });
    const m = projetarEventos({ ...NOV, compromissos: [c] });
    expect(m["2026-11-20"]).toHaveLength(1);
    expect(m["2026-11-20"][0]).toMatchObject({
      tipo: "compromissos",
      hora: "14:00",
      titulo: "Dentista",
      feito: true,
      id: "k1",
      chave: "compromissos|k1",
      origem: "Compromisso · até 15:00",
    });
    expect(Object.keys(m)).toEqual(["2026-11-20"]);
  });
  it("fora da janela ou sem data não aparece", () => {
    const m = projetarEventos({
      ...NOV,
      compromissos: [compromisso({ data: "2026-12-01" }), compromisso({ data: "" })],
    });
    expect(m).toEqual({});
  });
});

describe("afazeres", () => {
  it("sem data e pendente aparece em 'hoje'", () => {
    const m = projetarEventos({ ...NOV, afazeres: [afazer({ nome: "Ler" })] });
    expect(titulos(m, "2026-11-18")).toEqual(["Ler"]);
    expect(m["2026-11-18"][0].semData).toBe(true);
  });
  it("sem data e concluído não aparece", () => {
    expect(projetarEventos({ ...NOV, afazeres: [afazer({ feito: true })] })).toEqual({});
  });
  it("sem data não aparece se 'hoje' está fora da janela", () => {
    expect(projetarEventos({ ...NOV, hojeISO: "2026-12-01", afazeres: [afazer()] })).toEqual({});
  });
  it("rotina de dias específicos sem data não duplica em 'hoje'", () => {
    const af = afazer({ nome: "Treino", rotina: { tipo: "dias_especificos", diasSemana: [2] } });
    expect(titulos(projetarEventos({ ...NOV, afazeres: [af] }), "2026-11-18")).toEqual(["Treino"]);
  });
  it("conclusão por ocorrência em rotina", () => {
    const af = afazer({ rotina: { tipo: "dias_especificos", diasSemana: [2] }, datasConcluidas: ["2026-11-11"] });
    const m = projetarEventos({ ...NOV, afazeres: [af] });
    expect(m["2026-11-11"][0].feito).toBe(true);
    expect(m["2026-11-18"][0].feito).toBe(false);
  });
  it("ocorrência concluída e depois arrastada continua concluída (#14)", () => {
    const af = afazer({
      id: "r1",
      rotina: { tipo: "dias_especificos", diasSemana: [2] },
      datasConcluidas: ["2026-11-11"],
      excecoesData: { "2026-11-11": "2026-11-12" },
    });
    const [ev] = projetarEventos({ ...NOV, afazeres: [af] })["2026-11-12"];
    expect(ev).toMatchObject({ feito: true, dataOriginal: "2026-11-11", chave: "afazeres|r1|2026-11-11" });
  });
  it("ocorrência excluída não volta ao ser arrastada: a chave usa a data natural (#14)", () => {
    const af = afazer({
      id: "r1",
      rotina: { tipo: "dias_especificos", diasSemana: [2] },
      excecoesData: { "2026-11-11": "2026-11-12" },
    });
    const m = projetarEventos({ ...NOV, afazeres: [af], eventosExcluidos: ["afazeres|r1|2026-11-11"] });
    expect(m["2026-11-12"]).toBeUndefined();
    expect(titulos(m, "2026-11-18")).toHaveLength(1);
  });
  it("chave estável usada para excluir instância", () => {
    const af = afazer({ id: "a1", data: "2026-11-05" });
    const m = projetarEventos({ ...NOV, afazeres: [af], eventosExcluidos: ["afazeres|a1|2026-11-05"] });
    expect(m["2026-11-05"]).toBeUndefined();
  });
});

describe("chaves de evento por id (#10)", () => {
  const chavesDoDia = (m, dia) => (m[dia] || []).map((e) => e.chave);

  it("renomear a cadeira não muda a chave (concluídos/excluídos continuam valendo)", () => {
    const h = horario({ id: "h1", dia: 0, inicio: "08:00" });
    const antes = projetarEventos({ ...NOV, cadeiras: [cadeira({ id: "c1", nome: "IP", horarios: [h] })] });
    const depois = projetarEventos({
      ...NOV,
      cadeiras: [cadeira({ id: "c1", nome: "Introdução à Prog.", horarios: [h] })],
    });
    expect(chavesDoDia(depois, "2026-11-09")).toEqual(chavesDoDia(antes, "2026-11-09"));
  });

  it("duas cadeiras com o mesmo nome e horário não compartilham a chave", () => {
    const a = cadeira({ id: "ca", nome: "IP", horarios: [horario({ id: "ha", dia: 0, inicio: "08:00" })] });
    const b = cadeira({ id: "cb", nome: "IP", horarios: [horario({ id: "hb", dia: 0, inicio: "08:00" })] });
    const m = projetarEventos({ ...NOV, cadeiras: [a, b], eventosExcluidos: ["aulas|2026-11-09|ca|ha"] });
    expect(chavesDoDia(m, "2026-11-09")).toEqual(["aulas|2026-11-09|cb|hb"]);
  });

  it("rotinas: chave por id da rotina e do horário", () => {
    const r = rotina({
      id: "k1",
      nome: "Academia",
      horarios: [horario({ id: "hk", dia: 4, inicio: "18:00" })],
    });
    const m = projetarEventos({ ...NOV, rotinas: [r] });
    expect(chavesDoDia(m, "2026-11-06")).toEqual(["rotinas|2026-11-06|k1|hk"]);
  });

  it("avaliação: mudar data ou título mantém a chave", () => {
    const prova = { id: "d1", titulo: "Prova 1", data: "2026-11-20", hora: "10:00" };
    const c1 = cadeira({ id: "c1", datas: [prova] });
    const c2 = cadeira({ id: "c1", datas: [{ ...prova, titulo: "P1", data: "2026-11-25" }] });
    expect(chavesDoDia(projetarEventos({ ...NOV, cadeiras: [c1] }), "2026-11-20")).toEqual(["avaliacoes|c1|d1"]);
    expect(chavesDoDia(projetarEventos({ ...NOV, cadeiras: [c2] }), "2026-11-25")).toEqual(["avaliacoes|c1|d1"]);
  });

  it("horários sem id (dado antigo) ainda geram chaves distintas", () => {
    const c = cadeira({
      id: "c1",
      horarios: [
        { dia: 0, inicio: "08:00" },
        { dia: 0, inicio: "14:00" },
      ],
    });
    const chaves = chavesDoDia(projetarEventos({ ...NOV, cadeiras: [c] }), "2026-11-09");
    expect(new Set(chaves).size).toBe(2);
  });
});

describe("ordenação dentro do dia", () => {
  it("horário primeiro (qualquer tipo), depois afazeres do dia por urgência, depois sem data por urgência", () => {
    const evs = [
      { tipo: "afazeres", titulo: "semdata-alta", urgencia: 3, semData: true },
      { tipo: "afazeres", titulo: "media", urgencia: 2 },
      { tipo: "aulas", titulo: "10h", hora: "10:00" },
      { tipo: "afazeres", titulo: "semdata-baixa", urgencia: 1, semData: true },
      { tipo: "compromissos", titulo: "09h", hora: "09:00" },
      { tipo: "afazeres", titulo: "alta", urgencia: 3 },
      { tipo: "avaliacoes", titulo: "prova 08h", hora: "08:00" },
    ];
    // Um afazer com data, mesmo de urgência menor, vem antes de qualquer sem data.
    expect([...evs].sort(compararEventosDoDia).map((e) => e.titulo)).toEqual([
      "prova 08h",
      "09h",
      "10h",
      "alta",
      "media",
      "semdata-alta",
      "semdata-baixa",
    ]);
  });

  it("avaliação sem hora fica depois dos horários e antes dos afazeres", () => {
    const evs = [
      { tipo: "afazeres", titulo: "afazer", urgencia: 3 },
      { tipo: "avaliacoes", titulo: "prova" },
      { tipo: "aulas", titulo: "aula", hora: "14:00" },
    ];
    expect([...evs].sort(compararEventosDoDia).map((e) => e.titulo)).toEqual(["aula", "prova", "afazer"]);
  });

  it("ocorrência de afazer repetido conta como afazer do dia (acima dos sem data)", () => {
    const mapa = projetarEventos({
      ...NOV,
      afazeres: [
        afazer({ id: "s", nome: "Sem data", urgencia: 3 }),
        afazer({ id: "r", nome: "Academia", data: "2026-11-02", urgencia: 1, rotina: { tipo: "diaria" } }),
      ],
    });
    expect(titulos(mapa, "2026-11-18")).toEqual(["Academia", "Sem data"]);
  });

  it("afazer de data única vem antes dos repetidos, mesmo com urgência menor", () => {
    const mapa = projetarEventos({
      ...NOV,
      afazeres: [
        afazer({ id: "r", nome: "Academia", data: "2026-11-02", urgencia: 3, rotina: { tipo: "diaria" } }),
        afazer({ id: "u", nome: "Entregar lista", data: "2026-11-18", urgencia: 1 }),
        afazer({ id: "s", nome: "Sem data", urgencia: 3 }),
        afazer({ id: "u2", nome: "Pagar conta", data: "2026-11-18", urgencia: 2 }),
      ],
    });
    expect(titulos(mapa, "2026-11-18")).toEqual(["Pagar conta", "Entregar lista", "Academia", "Sem data"]);
  });

  it("ordenarEventosDoDia: concluídos vão para o fim, mantendo a ordem entre si", () => {
    const evs = [
      { tipo: "aulas", titulo: "aula 08h", hora: "08:00", chave: "a1" },
      { tipo: "afazeres", titulo: "feito", urgencia: 3, feito: true },
      { tipo: "aulas", titulo: "aula 10h", hora: "10:00", chave: "a2" },
      { tipo: "afazeres", titulo: "pendente", urgencia: 1 },
    ];
    expect(ordenarEventosDoDia(evs, ["a1"]).map((e) => e.titulo)).toEqual([
      "aula 10h",
      "pendente",
      "aula 08h",
      "feito",
    ]);
  });
});

describe("eventoConcluido", () => {
  it("afazer repetido: pela data natural da ocorrência", () => {
    const ev = { tipo: "afazeres", rotina: { tipo: "diaria" }, data: "2026-11-19", dataOriginal: "2026-11-18" };
    expect(eventoConcluido({ ...ev, datasConcluidas: ["2026-11-18"] })).toBe(true);
    expect(eventoConcluido({ ...ev, datasConcluidas: ["2026-11-19"] })).toBe(false);
  });
  it("compromisso e afazer avulso: no item; aula: em eventosConcluidos", () => {
    expect(eventoConcluido({ tipo: "compromissos", feito: true })).toBe(true);
    expect(eventoConcluido({ tipo: "afazeres", feito: false })).toBe(false);
    expect(eventoConcluido({ tipo: "aulas", chave: "k" }, ["k"])).toBe(true);
    expect(eventoConcluido({ tipo: "aulas", chave: "k" }, [])).toBe(false);
  });
});

describe("textos da lista do dia (tela Hoje)", () => {
  const HOJE = "2026-11-20";
  it("distância até hoje", () => {
    expect(textoDistanciaDeHoje("2026-11-20", HOJE)).toBe("Hoje");
    expect(textoDistanciaDeHoje("2026-11-19", HOJE)).toBe("1 d atrás");
    expect(textoDistanciaDeHoje("2026-11-03", HOJE)).toBe("17 d atrás");
    expect(textoDistanciaDeHoje("2026-12-01", HOJE)).toBe("Daqui a 11 d");
    expect(textoDistanciaDeHoje("2027-01-01", HOJE)).toBe("Daqui a 42 d");
  });

  it("afazer: Concluído / Pendente (sem data) / distância (com data ou repetido)", () => {
    const af = { tipo: "afazeres", data: "2026-11-20", origem: "Pendente" };
    expect(subtituloEvento(af, HOJE, false)).toBe("Hoje");
    expect(subtituloEvento({ ...af, data: "2026-11-19" }, HOJE, false)).toBe("1 d atrás");
    expect(subtituloEvento({ ...af, data: "2026-12-01" }, HOJE, false)).toBe("Daqui a 11 d");
    expect(subtituloEvento({ ...af, semData: true }, HOJE, false)).toBe("Pendente");
    expect(subtituloEvento(af, HOJE, true)).toBe("Concluído");
  });

  it("outros tipos mostram a origem", () => {
    expect(subtituloEvento({ tipo: "aulas", origem: "Sala 3" }, HOJE, false)).toBe("Sala 3");
  });

  it("projeção usa Pendente/Concluído com maiúscula", () => {
    const mapa = projetarEventos({
      ...NOV,
      afazeres: [
        afazer({ id: "a", nome: "A", data: "2026-11-10" }),
        afazer({ id: "b", nome: "B", data: "2026-11-10", feito: true }),
      ],
    });
    expect(mapa["2026-11-10"].map((e) => e.origem).sort()).toEqual(["Concluído", "Pendente"]);
  });
});

// Fase 5: ★ compromisso, livro = avaliação, bandeiras = vigência.
describe("marcadores da célula (marcadoresDoDia / resumirMarcadores)", () => {
  const ev = (tipo, cor, titulo) => ({ tipo, cor, titulo });
  const marco = (tipo, cor, nome) => ({ tipo, cor, nome });

  it("um marcador por tipo, com quantidade e cor do primeiro, na ordem de importância", () => {
    const m = marcadoresDoDia(
      [
        ev("aulas", "#000", "IP"),
        ev("avaliacoes", "#00f", "Prova"),
        ev("compromissos", "#f00", "Dentista"),
        ev("compromissos", "#0f0", "Reunião"),
        ev("afazeres", "#999", "Lavar"),
      ],
      [marco("fim", "#abc", "Cálculo")],
    );
    expect(m.map((x) => [x.tipo, x.quantidade, x.cor])).toEqual([
      ["compromisso", 2, "#f00"],
      ["avaliacao", 1, "#00f"],
      ["fim", 1, "#abc"],
    ]);
    expect(m[0].titulos).toEqual(["Dentista", "Reunião"]);
  });

  it("dia sem compromisso/avaliação/vigência não tem marcador", () => {
    expect(marcadoresDoDia([ev("aulas", "#000", "IP"), ev("rotinas", "#111", "Academia")], [])).toEqual([]);
  });

  it("até 3 cabem; com 4, mostra os 2 mais importantes + '+2'", () => {
    const quatro = marcadoresDoDia(
      [ev("avaliacoes", "#00f", "Prova"), ev("compromissos", "#f00", "Dentista")],
      [marco("inicio", "#111", "A"), marco("fim", "#222", "B")],
    );
    const r = resumirMarcadores(quatro);
    expect(r.visiveis.map((x) => x.tipo)).toEqual(["compromisso", "avaliacao"]);
    expect(r.ocultos).toBe(2);
    expect(resumirMarcadores(quatro.slice(0, 3))).toEqual({ visiveis: quatro.slice(0, 3), ocultos: 0 });
  });
});

describe("aviso de atrasados da tela Hoje", () => {
  const HOJE = "2026-11-20";
  it("afazer avulso e compromisso com data passada e sem check, do mais antigo ao mais novo", () => {
    const itens = itensAtrasados(
      {
        afazeres: [
          afazer({ id: "a1", nome: "Lavar roupa", data: "2026-11-17" }),
          afazer({ id: "a2", nome: "Feito", data: "2026-11-10", feito: true }),
          afazer({ id: "a3", nome: "Hoje", data: HOJE }),
          afazer({ id: "a4", nome: "Sem data" }),
          afazer({ id: "a5", nome: "Academia", data: "2026-11-01", rotina: { tipo: "diaria" } }),
        ],
        compromissos: [
          compromisso({ id: "c1", nome: "Dentista", data: "2026-11-12", inicio: "14:00" }),
          compromisso({ id: "c2", nome: "Marcado", data: "2026-11-12", inicio: "15:00", feito: true }),
          compromisso({ id: "c3", nome: "Hoje cedo", data: HOJE, inicio: "07:00" }),
        ],
      },
      HOJE,
    );
    expect(itens.map((i) => `${i.tipo}:${i.nome}:${i.data}`)).toEqual([
      "compromissos:Dentista:2026-11-12",
      "afazeres:Lavar roupa:2026-11-17",
    ]);
  });

  it("sem dados não quebra", () => {
    expect(itensAtrasados({}, HOJE)).toEqual([]);
  });

  it("texto do aviso", () => {
    const af = { tipo: "afazeres" };
    const co = { tipo: "compromissos" };
    expect(textoAtrasados([])).toBeNull();
    expect(textoAtrasados([af])).toBe("1 afazer atrasado");
    expect(textoAtrasados([co])).toBe("1 compromisso atrasado");
    expect(textoAtrasados([af, af, co])).toBe("2 afazeres e 1 compromisso atrasados");
    expect(textoAtrasados([co, co])).toBe("2 compromissos atrasados");
  });
});
