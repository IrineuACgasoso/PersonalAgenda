import { describe, expect, it } from "vitest";
import { devolverChaves, donoDaChave, limparChavesOrfas } from "../../src/utils/chavesOrfas.js";
import { chaveAula, chaveAvaliacao, chaveCompromisso, chaveRotina } from "../../src/utils/projecao.js";

const cadeira = { id: "c1", horarios: [{ id: "h1" }], datas: [{ id: "d1" }] };
const rotina = { id: "r1", horarios: [{ id: "h2" }] };

describe("donoDaChave (#52)", () => {
  it("reconhece os formatos montados pela projeção", () => {
    expect(donoDaChave(chaveAula("2026-11-20", cadeira, cadeira.horarios[0]))).toEqual({ lista: "cadeiras", id: "c1" });
    expect(donoDaChave(chaveRotina("2026-11-20", rotina, rotina.horarios[0]))).toEqual({ lista: "rotinas", id: "r1" });
    expect(donoDaChave(chaveAvaliacao(cadeira, cadeira.datas[0]))).toEqual({ lista: "cadeiras", id: "c1" });
    expect(donoDaChave(chaveCompromisso({ id: "k1" }))).toEqual({ lista: "compromissos", id: "k1" });
    expect(donoDaChave("afazeres|a1|2026-11-20")).toEqual({ lista: "afazeres", id: "a1" });
    expect(donoDaChave("afazeres-semdata|a1")).toEqual({ lista: "afazeres", id: "a1" });
  });

  it("avaliação sem id (substituto com '|') ainda aponta para a cadeira", () => {
    expect(donoDaChave(chaveAvaliacao(cadeira, { data: "2026-12-01", titulo: "P1" }))).toEqual({
      lista: "cadeiras",
      id: "c1",
    });
  });

  it("formato desconhecido ⇒ null (a chave é mantida)", () => {
    expect(donoDaChave("aulas|2026-11-20")).toBeNull();
    expect(donoDaChave("compromissos|2026-11-20|k1|h1")).toBeNull();
    expect(donoDaChave("outra|coisa")).toBeNull();
    expect(donoDaChave(42)).toBeNull();
  });
});

describe("limparChavesOrfas / devolverChaves (#52)", () => {
  const base = {
    cadeiras: [cadeira],
    rotinas: [rotina],
    compromissos: [{ id: "k1" }],
    afazeres: [{ id: "a1" }],
    eventosConcluidos: ["aulas|2026-11-20|c1|h1", "aulas|2026-11-20|cX|h9", "afazeres|aX|2026-11-20", "legado"],
    eventosExcluidos: [
      "rotinas|2026-11-20|r1|h2",
      "rotinas|2026-11-20|rX|h2",
      "compromissos|kX",
      "afazeres-semdata|a1",
    ],
  };

  it("tira só as chaves de itens que não existem mais", () => {
    const { dados, removidas } = limparChavesOrfas(base);
    expect(dados.eventosConcluidos).toEqual(["aulas|2026-11-20|c1|h1", "legado"]);
    expect(dados.eventosExcluidos).toEqual(["rotinas|2026-11-20|r1|h2", "afazeres-semdata|a1"]);
    expect(removidas).toEqual({
      eventosConcluidos: ["aulas|2026-11-20|cX|h9", "afazeres|aX|2026-11-20"],
      eventosExcluidos: ["rotinas|2026-11-20|rX|h2", "compromissos|kX"],
    });
  });

  it("sem órfãs ⇒ mesmo objeto (nada a gravar)", () => {
    const limpo = { ...base, eventosConcluidos: ["aulas|2026-11-20|c1|h1"], eventosExcluidos: [] };
    const r = limparChavesOrfas(limpo);
    expect(r.dados).toBe(limpo);
    expect(r.removidas).toEqual({});
  });

  it("excluir a cadeira leva as chaves dela; o Desfazer devolve sem duplicar", () => {
    const semCadeira = { ...base, cadeiras: [] };
    const { dados, removidas } = limparChavesOrfas(semCadeira);
    expect(dados.eventosConcluidos).not.toContain("aulas|2026-11-20|c1|h1");
    const desfeito = devolverChaves({ ...dados, cadeiras: [cadeira] }, removidas);
    expect(desfeito.eventosConcluidos).toEqual(expect.arrayContaining(base.eventosConcluidos));
    expect(devolverChaves(desfeito, removidas).eventosConcluidos).toHaveLength(desfeito.eventosConcluidos.length);
  });

  it("não muta a entrada e aguenta listas ausentes", () => {
    const copia = structuredClone(base);
    limparChavesOrfas(base);
    expect(base).toEqual(copia);
    expect(limparChavesOrfas({ eventosConcluidos: ["afazeres|a1|2026-11-20"] }).dados.eventosConcluidos).toEqual([]);
    expect(devolverChaves({ x: 1 }, {})).toEqual({ x: 1 });
  });
});
