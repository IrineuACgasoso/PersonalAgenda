// Currículo: módulos, sanitização, edição e revisão (src/utils/curriculo.js, curriculoRevisao.js).
import { describe, it, expect } from "vitest";
import {
  CAMPOS_DADOS,
  CURRICULO_PADRAO,
  MODULOS,
  alternarOculto,
  curriculoDoBackup,
  curriculoVazio,
  devolverItem,
  documentoDoCurriculo,
  erroDoRascunho,
  excluirItem,
  limparRascunho,
  listaDePontos,
  moduloPorId,
  moverItem,
  moverModulo,
  nomeDoArquivo,
  normalizarMes,
  resumoDoItem,
  salvarDados,
  salvarItem,
  salvarResumo,
  sanitizarCurriculo,
  textoDoLink,
  textoPeriodo,
  urlDoLink,
} from "../../src/utils/curriculo.js";
import { revisarCurriculo } from "../../src/utils/curriculoRevisao.js";
import { resolverGravacao } from "../../src/utils/persistencia.js";
import { pareceVazio, sanitizarDados } from "../../src/utils/sanitizarDados.js";
import { resumoDoBackup } from "../../src/utils/dialogos.js";
import { appData, cadeira, curriculo } from "../fixtures/fabricas.js";

const HOJE = "2026-11";
const secao = (c, id) => documentoDoCurriculo(c, HOJE).secoes.find((s) => s.id === id)?.blocos;

describe("sanitizarCurriculo", () => {
  it("entrada ausente ou corrompida vira o currículo vazio completo", () => {
    [null, undefined, "lixo", [], { dados: 1, secoes: [], ordem: "x" }].forEach((bruto) => {
      const c = sanitizarCurriculo(bruto);
      expect(c.dados).toEqual(CURRICULO_PADRAO.dados);
      expect(c.ordem).toEqual(MODULOS.map((m) => m.id));
      expect(Object.keys(c.secoes)).toEqual(MODULOS.map((m) => m.id));
    });
  });

  it("todos os campos de todos os módulos sobrevivem ao persist (nada some ao salvar)", () => {
    const c = { dados: {}, resumo: "r", secoes: {} };
    CAMPOS_DADOS.forEach((f) => (c.dados[f.id] = `d-${f.id}`));
    MODULOS.forEach((m) => {
      const item = { id: "1", oculto: true };
      m.campos.forEach((f) => (item[f.id] = f.tipo === "mes" ? "2025-03" : `v-${f.id}`));
      c.secoes[m.id] = [item];
    });
    const r = resolverGravacao(sanitizarDados(appData({ cadeiras: [cadeira()] })), (d) => ({ ...d, curriculo: c }));
    expect(r.ok).toBe(true);
    expect(r.dados.curriculo).toEqual({ ...c, ordem: MODULOS.map((m) => m.id) });
  });

  it("é idempotente e nunca deixa undefined (o Firestore recusa)", () => {
    const uma = sanitizarCurriculo(curriculo());
    expect(sanitizarCurriculo(uma)).toEqual(uma);
    expect(JSON.parse(JSON.stringify(uma))).toStrictEqual(uma);
  });

  it("descarta lixo nas listas, mas mantém item sem id e campo desconhecido", () => {
    const c = sanitizarCurriculo({
      secoes: { projetos: [null, "x", { nome: "A", futuro: 1, pontos: 5, inicio: "ontem" }] },
    });
    expect(c.secoes.projetos).toHaveLength(1);
    expect(c.secoes.projetos[0]).toMatchObject({ nome: "A", futuro: 1, pontos: "", inicio: "" });
    expect(c.secoes.projetos[0].id).toBeTruthy();
  });

  it("ordem: ignora módulo desconhecido e repetido; módulo novo entra no fim", () => {
    const { ordem } = sanitizarCurriculo({ ordem: ["projetos", "naoExiste", "projetos", "idiomas"] });
    expect(ordem.slice(0, 2)).toEqual(["projetos", "idiomas"]);
    expect([...ordem].sort()).toEqual(MODULOS.map((m) => m.id).sort());
  });
});

describe("proteção dos dados", () => {
  it("só o currículo preenchido já não parece vazio; o padrão parece", () => {
    const d = sanitizarDados(null);
    expect(pareceVazio(d)).toBe(true);
    expect(pareceVazio(salvarResumo(d, "oi"))).toBe(false);
    expect(pareceVazio(salvarItem(d, "idiomas", { id: "i", idioma: "Inglês" }))).toBe(false);
    expect(curriculoVazio(undefined)).toBe(true);
    expect(curriculoVazio({ resumo: "  " })).toBe(true);
  });

  it("backup anterior à tela mantém o currículo atual; um que tem, substitui", () => {
    const atual = { curriculo: curriculo() };
    expect(curriculoDoBackup({ cadeiras: [] }, atual).curriculo).toBe(atual.curriculo);
    expect(curriculoDoBackup({ curriculo: { resumo: "b" } }, atual).curriculo).toEqual({ resumo: "b" });
    // Backup sem o campo E app sem currículo: cai no padrão, sem quebrar.
    expect(sanitizarDados(curriculoDoBackup({}, {})).curriculo).toEqual(CURRICULO_PADRAO);
  });

  it("a lista de restaurar mostra quando o backup tem currículo", () => {
    expect(resumoDoBackup(appData({ curriculo: curriculo() }))).toMatch(/· currículo$/);
    expect(resumoDoBackup(appData())).not.toMatch(/currículo/);
  });
});

describe("edição", () => {
  const d = () => appData({ curriculo: curriculo() });

  it("salvarItem cria no fim e edita no lugar, sem duplicar", () => {
    const criado = salvarItem(d(), "projetos", { id: "novo", nome: "C" });
    expect(criado.curriculo.secoes.projetos.map((p) => p.id)).toEqual(["p1", "p2", "novo"]);
    const editado = salvarItem(criado, "projetos", { id: "p1", nome: "Outro" });
    expect(editado.curriculo.secoes.projetos.map((p) => p.nome)).toEqual(["Outro", "Compilador", "C"]);
  });

  it("editar um item oculto não o traz de volta", () => {
    const oculto = alternarOculto(d(), "projetos", "p1");
    const editado = salvarItem(oculto, "projetos", { id: "p1", nome: "X" });
    expect(sanitizarCurriculo(editado.curriculo).secoes.projetos[0]).toMatchObject({ nome: "X", oculto: true });
  });

  it("excluir + desfazer devolve na mesma posição; id inexistente não grava", () => {
    const antes = d();
    const { dados, removido } = excluirItem(antes, "projetos", "p1");
    expect(dados.curriculo.secoes.projetos.map((p) => p.id)).toEqual(["p2"]);
    const volta = devolverItem(dados, "projetos", removido);
    expect(volta.curriculo.secoes.projetos.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(devolverItem(volta, "projetos", removido).curriculo.secoes.projetos).toHaveLength(2);
    expect(excluirItem(antes, "projetos", "nada")).toEqual({ dados: antes, removido: null });
  });

  it("mover troca com o vizinho e para nas pontas", () => {
    expect(moverItem(d(), "projetos", "p2", -1).curriculo.secoes.projetos.map((p) => p.id)).toEqual(["p2", "p1"]);
    expect(moverItem(d(), "projetos", "p1", -1).curriculo.secoes.projetos.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(moverModulo(d(), "experiencia", -1).curriculo.ordem.slice(0, 2)).toEqual(["experiencia", "formacao"]);
    expect(moverModulo(d(), "idiomas", 1).curriculo.ordem.at(-1)).toBe("idiomas");
  });

  it("nada é alterado no lugar e o resto dos dados fica intacto", () => {
    const antes = d();
    const copia = structuredClone(antes);
    const depois = salvarDados(antes, { nome: "Z" });
    moverItem(antes, "projetos", "p1", 1);
    alternarOculto(antes, "projetos", "p1");
    expect(antes).toEqual(copia);
    expect({ ...depois, curriculo: null }).toEqual({ ...antes, curriculo: null });
  });
});

describe("formulário", () => {
  const { campos } = moduloPorId("experiencia");
  const base = { cargo: "Dev", empresa: "X", inicio: "2025-01", fim: "" };
  const erro = (lista, rascunho) => erroDoRascunho(lista, limparRascunho(lista, rascunho));

  it("mês: aceita o campo nativo e o digitado", () => {
    expect(normalizarMes("2025-03")).toBe("2025-03");
    expect(normalizarMes(" 3/2025 ")).toBe("2025-03");
    expect(normalizarMes("")).toBe("");
    expect(normalizarMes("13/2025")).toBeNull();
    expect(normalizarMes("2025-3")).toBeNull();
    expect(normalizarMes("março")).toBeNull();
  });

  it("limpa espaços e aponta o primeiro problema", () => {
    expect(erro(campos, base)).toBeNull();
    expect(erro(campos, { ...base, cargo: "   " })).toContain("Cargo");
    expect(erro(campos, { ...base, fim: "2024-12" })).toContain("antes do início");
    expect(erro(campos, { ...base, inicio: "xx" })).toContain("03/2026");
    expect(erro(CAMPOS_DADOS, { nome: "A", email: "a@b" })).toContain("e-mail");
    expect(erro(CAMPOS_DADOS, { nome: "A", site: "a b" })).toContain("espaços");
  });
});

describe("textos", () => {
  it("período: atual, previsão, mesmo mês e incompleto", () => {
    expect(textoPeriodo("2025-03", "2025-12", HOJE)).toBe("Mar 2025 – Dez 2025");
    expect(textoPeriodo("2025-03", "", HOJE)).toBe("Mar 2025 – Atual");
    expect(textoPeriodo("2024-03", "2028-12", HOJE)).toBe("Mar 2024 – Dez 2028 (previsão)");
    expect(textoPeriodo("2025-03", "2025-03", HOJE)).toBe("Mar 2025");
    expect(textoPeriodo("", "2025-03", HOJE)).toBe("Mar 2025");
    expect(textoPeriodo("", "", HOJE)).toBe("");
  });

  it("pontos: um por linha, sem o marcador digitado, sem comer hífen de palavra", () => {
    const digitado = ["- a", "", "• b", "  * c  ", "-40% de tempo", "pré-venda"];
    const esperado = ["a", "b", "c", "-40% de tempo", "pré-venda"];
    expect(listaDePontos(digitado.join("\n"))).toEqual(esperado);
    expect(listaDePontos(digitado.join("\r\n"))).toEqual(esperado);
  });

  it("links: impressos sem protocolo e nunca com outro esquema", () => {
    expect(textoDoLink("https://www.linkedin.com/in/x/")).toBe("linkedin.com/in/x");
    expect(urlDoLink("github.com/x")).toBe("https://github.com/x");
    expect(urlDoLink("javascript:alert(1)")).toBe("https://javascript:alert(1)");
    expect(urlDoLink("")).toBeUndefined();
  });

  it("nome do arquivo sem acento nem espaço", () => {
    expect(nomeDoArquivo({ dados: { nome: "José da Conceição" } })).toBe("Curriculo_Jose_da_Conceicao.pdf");
    expect(nomeDoArquivo(null)).toBe("Curriculo.pdf");
  });

  it("linha da edição", () => {
    const linha = (id, item) => {
      const c = sanitizarCurriculo({ secoes: { [id]: [item] } });
      return resumoDoItem(moduloPorId(id), c.secoes[id][0], HOJE);
    };
    expect(linha("habilidades", { grupo: "Linguagens", itens: "C" })).toEqual({ titulo: "Linguagens", detalhe: "C" });
    expect(linha("certificacoes", { titulo: "AWS", emissor: "Amazon", data: "2026-05" })).toEqual({
      titulo: "AWS",
      detalhe: "Amazon · Mai 2026",
    });
  });
});

describe("documentoDoCurriculo", () => {
  it("mais recente primeiro: em andamento no topo, sem data no fim", () => {
    const c = curriculo({
      experiencia: [
        { id: "a", cargo: "Antiga", empresa: "E", inicio: "2020-01", fim: "2021-01" },
        { id: "s", cargo: "Sem data", empresa: "E" },
        { id: "n", cargo: "Atual", empresa: "E", inicio: "2022-01" },
        { id: "r", cargo: "Recente", empresa: "E", inicio: "2021-02", fim: "2021-12" },
      ],
    });
    expect(secao(c, "experiencia").map((b) => b.titulo)).toEqual(["Atual", "Recente", "Antiga", "Sem data"]);
  });

  it("projetos seguem a ordem escolhida", () => {
    expect(secao(curriculo(), "projetos").map((b) => b.titulo)).toEqual(["Agenda", "Compilador"]);
  });

  it("módulo vazio ou todo oculto não aparece; a ordem dos módulos é respeitada", () => {
    const d = alternarOculto(alternarOculto(appData({ curriculo: curriculo() }), "projetos", "p1"), "projetos", "p2");
    const ids = documentoDoCurriculo(d.curriculo, HOJE).secoes.map((s) => s.id);
    expect(ids).not.toContain("projetos");
    expect(ids).not.toContain("premios");
    const trocado = moverModulo(appData({ curriculo: curriculo() }), "habilidades", -1);
    const ids2 = documentoDoCurriculo(trocado.curriculo, HOJE).secoes.map((s) => s.id);
    expect(ids2.indexOf("habilidades")).toBeLessThan(ids2.indexOf("projetos"));
    expect(ids2[0]).toBe("resumo");
  });

  it("LinkedIn e GitHub aceitam só o usuário", () => {
    const { contatos } = documentoDoCurriculo({ dados: { linkedin: "maria", github: "@maria" } }, HOJE);
    expect(contatos).toEqual([
      { texto: "linkedin.com/in/maria", url: "https://linkedin.com/in/maria" },
      { texto: "github.com/maria", url: "https://github.com/maria" },
    ]);
  });

  it("idiomas numa linha só", () => {
    expect(secao(curriculo(), "idiomas")).toEqual([
      { tipo: "paragrafo", texto: "Português (Nativo)  |  Inglês (Avançado, TOEFL 590)" },
    ]);
  });
});

describe("revisarCurriculo", () => {
  const ids = (c, pagina) => revisarCurriculo(c, { mesAtual: HOJE, ...pagina }).map((a) => a.id);

  it("currículo completo não tem avisos", () => {
    expect(revisarCurriculo(curriculo(), { paginas: 1, mesAtual: HOJE })).toEqual([]);
  });

  it("vazio: aponta o essencial primeiro", () => {
    const niveis = revisarCurriculo(null, { mesAtual: HOJE }).map((a) => a.nivel);
    expect(niveis.lastIndexOf("essencial")).toBeLessThan(niveis.indexOf("melhoria"));
    expect(ids(null)).toEqual(
      expect.arrayContaining(["nome", "email", "github", "formacao", "habilidades", "pratica"]),
    );
  });

  it("começo fraco, inclusive com acento; palavra parecida não é acusada", () => {
    const com = (pontos) =>
      curriculo({ experiencia: [{ id: "e", cargo: "Dev", empresa: "X", inicio: "2025-01", pontos }] });
    const fraco = (pontos) => ids(com(pontos)).some((id) => id.endsWith("|fraco"));
    expect(fraco("Responsável por 3 sistemas")).toBe(true);
    expect(fraco("Ajudei a equipe em 2 projetos")).toBe(true);
    expect(fraco("Eu desenvolvi 2 APIs")).toBe(true);
    expect(fraco("Desenvolvi 2 APIs")).toBe(false);
    expect(fraco("Europa: lancei o produto em 3 países")).toBe(false);
  });

  it("sem números, sem pontos, pontos demais ou longos", () => {
    const com = (pontos) =>
      curriculo({ projetos: [], atividades: [], experiencia: [{ id: "e", cargo: "Dev", empresa: "X", pontos }] });
    expect(ids(com("Desenvolvi APIs"))).toContain("numeros");
    expect(ids(com("Desenvolvi 2 APIs"))).not.toContain("numeros");
    expect(ids(com("")).some((id) => id.endsWith("semPontos"))).toBe(true);
    expect(ids(com("Fiz 1\n".repeat(7))).some((id) => id.endsWith("muitos"))).toBe(true);
    expect(ids(com(`Criei 1 ${"x".repeat(230)}`)).some((id) => id.endsWith("longo"))).toBe(true);
  });

  it("ids não repetem (são as chaves da lista na tela)", () => {
    const igual = { cargo: "Dev", empresa: "X", pontos: "" };
    const experiencia = [
      { id: "1", ...igual },
      { id: "2", ...igual },
    ];
    const lista = ids(curriculo({ experiencia }));
    expect(new Set(lista).size).toBe(lista.length);
  });

  it("mais de uma página e caracteres fora da fonte", () => {
    expect(ids(curriculo(), { paginas: 2 })).toEqual(["paginas"]);
    expect(ids(curriculo(), { perdidos: ["😀"] })).toEqual(["caracteres"]);
  });
});
