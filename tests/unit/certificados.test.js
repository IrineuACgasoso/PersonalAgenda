// Certificados: src/utils/certificados.js (registro, tags, lixeira de arquivos)
import { describe, it, expect } from "vitest";
import {
  DIAS_LIXEIRA,
  TAMANHO_MAXIMO,
  arquivosVencidos,
  caminhoDoArquivo,
  certificadosDoBackup,
  devolverTag,
  erroDaTag,
  erroDoArquivo,
  erroDoCertificado,
  excluirCertificado,
  excluirTag,
  filtrarCertificados,
  mensagemErroArquivo,
  resumoDoArquivo,
  salvarCertificado,
  tagsDoCertificado,
  textoTamanho,
  tipoDoArquivo,
  tirarDaLixeira,
} from "../../src/utils/certificados.js";
import { sanitizarDados, pareceVazio } from "../../src/utils/sanitizarDados.js";
import { resumoDoBackup } from "../../src/utils/dialogos.js";
import { appData, certificado } from "../fixtures/fabricas.js";

const DIA = 24 * 60 * 60 * 1000;
const AGORA = Date.now();
const arquivo = (caminho) => ({
  caminho,
  url: `https://x/${caminho}`,
  nome: "a.pdf",
  tipo: "application/pdf",
  tamanho: 9,
});

describe("arquivo escolhido", () => {
  it("aceita PDF, imagem e documento, pela extensão (o type do aparelho pode vir vazio)", () => {
    expect(erroDoArquivo({ name: "Certificado.PDF", size: 10, type: "" })).toBeNull();
    expect(erroDoArquivo({ name: "foto.jpeg", size: 10 })).toBeNull();
    expect(tipoDoArquivo("foto.JPG")).toBe("image/jpeg");
  });

  it("recusa formato que executa script, sem extensão, vazio ou grande demais", () => {
    expect(erroDoArquivo({ name: "x.svg", size: 10 })).toMatch(/Formato não aceito/);
    expect(erroDoArquivo({ name: "x.html", size: 10 })).toMatch(/Formato não aceito/);
    expect(erroDoArquivo({ name: "pdf", size: 10 })).toMatch(/Formato não aceito/);
    expect(erroDoArquivo({ name: "x.pdf", size: 0 })).toMatch(/vazio/);
    expect(erroDoArquivo({ name: "x.pdf", size: TAMANHO_MAXIMO })).toBeNull();
    expect(erroDoArquivo({ name: "x.pdf", size: TAMANHO_MAXIMO + 1024 * 1024 })).toBe(
      "O arquivo tem 21 MB; o máximo é 20 MB.",
    );
    expect(erroDoArquivo(null)).toMatch(/Escolha/);
  });

  it("textos de tamanho e resumo", () => {
    expect(textoTamanho(100)).toBe("1 KB");
    expect(textoTamanho(320 * 1024)).toBe("320 KB");
    expect(textoTamanho(1.44 * 1024 * 1024)).toBe("1,4 MB");
    expect(resumoDoArquivo({ nome: "a.pdf", tamanho: 320 * 1024 })).toBe("PDF · 320 KB");
    expect(resumoDoArquivo(undefined)).toBe("sem arquivo");
  });

  it("caminho no Storage: dentro do usuário, sem o nome original", () => {
    expect(caminhoDoArquivo("u1", "id9", "Meu Cert/../x.PDF")).toBe("users/u1/certificados/id9.pdf");
  });
});

describe("sanitização", () => {
  it("os campos sobrevivem ao sanitizarDados e os ausentes viram listas", () => {
    const c = certificado({ tags: ["t1"] });
    const d = sanitizarDados(
      appData({
        certificados: [c],
        tagsCertificados: [{ id: "t1", nome: "Monitoria" }],
        arquivosParaApagar: [{ caminho: "p", desde: 5 }],
      }),
    );
    expect(d.certificados).toEqual([c]);
    expect(d.tagsCertificados).toEqual([{ id: "t1", nome: "Monitoria" }]);
    expect(d.arquivosParaApagar).toEqual([{ caminho: "p", desde: 5 }]);
    const vazio = sanitizarDados(appData());
    expect([vazio.certificados, vazio.tagsCertificados, vazio.arquivosParaApagar]).toEqual([[], [], []]);
  });

  it("descarta lixo; url que não é https derruba só o arquivo, não o certificado", () => {
    const d = sanitizarDados(
      appData({
        certificados: [
          null,
          "x",
          certificado({ titulo: 3, tags: ["a", "a", 1], arquivo: { caminho: "p", url: "javascript:alert(1)" } }),
        ],
        tagsCertificados: [{ id: "t", nome: "  " }, { nome: "sem id" }, { id: "ok", nome: "Idiomas" }],
        arquivosParaApagar: [{ caminho: "p" }, { caminho: "q", desde: 1 }, { caminho: "q", desde: 2 }, null],
      }),
    );
    expect(d.certificados).toHaveLength(1);
    expect(d.certificados[0]).toMatchObject({ titulo: "", tags: ["a"] });
    expect("arquivo" in d.certificados[0]).toBe(false);
    expect(d.tagsCertificados).toEqual([{ id: "ok", nome: "Idiomas" }]);
    expect(d.arquivosParaApagar).toEqual([{ caminho: "q", desde: 1 }]);
  });

  it("só certificados já conta como dado real (trava anti-sobrescrita)", () => {
    const base = { periodos: [{ id: "p1", nome: "2026.1" }] };
    expect(pareceVazio(base)).toBe(true);
    expect(pareceVazio({ ...base, certificados: [certificado()] })).toBe(false);
  });
});

describe("busca e filtro", () => {
  const lista = [
    certificado({ id: "a", titulo: "Monitoria de Cálculo", tags: ["m"], criadoEm: 1 }),
    certificado({ id: "b", titulo: "Curso de Inglês", tags: ["i", "c"], criadoEm: 3 }),
    certificado({ id: "c", titulo: "Semana do CIn", tags: [], criadoEm: 2 }),
  ];
  const ids = (opcoes) => filtrarCertificados(lista, opcoes).map((c) => c.id);

  it("sem filtro: todos, mais novos primeiro", () => expect(ids()).toEqual(["b", "c", "a"]));

  it("busca só no título, sem acento/caixa e com palavras em qualquer ordem", () => {
    expect(ids({ busca: "calculo" })).toEqual(["a"]);
    expect(ids({ busca: "  INGLES curso " })).toEqual(["b"]);
    expect(ids({ busca: "m" })).toEqual(["c", "a"]); // a tag "m" não conta
  });

  it("várias tags: quem tem pelo menos uma; combina com a busca", () => {
    expect(ids({ tags: ["m", "c"] })).toEqual(["b", "a"]);
    expect(ids({ tags: ["m", "c"], busca: "curso" })).toEqual(["b"]);
    expect(ids({ tags: ["zzz"] })).toEqual([]);
  });

  it("não muda a lista original", () => {
    ids();
    expect(lista.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });
});

describe("tags", () => {
  const tags = [
    { id: "m", nome: "Monitoria" },
    { id: "i", nome: "Idiomas" },
  ];

  it("não aceita vazia nem repetida (sem acento/caixa)", () => {
    expect(erroDaTag(tags, "  ")).toMatch(/Digite/);
    expect(erroDaTag(tags, "MONITÓRIA")).toMatch(/já existe/);
    expect(erroDaTag(tags, "Eventos")).toBeNull();
  });

  it("excluir tira de todos os certificados; desfazer devolve tudo no lugar", () => {
    const d = appData({
      tagsCertificados: tags,
      certificados: [certificado({ id: "a", tags: ["m", "i"] }), certificado({ id: "b", tags: ["i"] })],
    });
    const { dados, removida } = excluirTag(d, "m");
    expect(dados.tagsCertificados.map((t) => t.id)).toEqual(["i"]);
    expect(dados.certificados.map((c) => c.tags)).toEqual([["i"], ["i"]]);
    const volta = devolverTag(dados, removida);
    expect(volta.tagsCertificados).toEqual(tags);
    expect(volta.certificados[0].tags.sort()).toEqual(["i", "m"]);
    expect(volta.certificados[1].tags).toEqual(["i"]);
    expect(devolverTag(volta, removida)).toBe(volta); // 2 cliques não duplicam
  });

  it("tag inexistente não muda nada; ids órfãos não aparecem", () => {
    const d = appData({ tagsCertificados: tags });
    expect(excluirTag(d, "zzz")).toEqual({ dados: d, removida: null });
    expect(tagsDoCertificado({ tags: ["i", "sumiu"] }, tags)).toEqual([tags[1]]);
  });
});

describe("salvar / excluir e a lixeira de arquivos", () => {
  it("título e arquivo são obrigatórios", () => {
    expect(erroDoCertificado({ titulo: " ", arquivo: {} })).toMatch(/título/);
    expect(erroDoCertificado({ titulo: "x" })).toMatch(/arquivo/);
    expect(erroDoCertificado({ titulo: "x", arquivo: {} })).toBeNull();
  });

  it("cria com criadoEm", () => {
    const d = salvarCertificado(appData(), { id: "a", titulo: "T", arquivo: arquivo("p1") }, AGORA);
    expect(d.certificados).toEqual([{ id: "a", titulo: "T", arquivo: arquivo("p1"), criadoEm: AGORA }]);
  });

  it("editar sem trocar o arquivo não põe nada na lixeira e mantém a posição", () => {
    const d = appData({
      certificados: [certificado({ id: "a", criadoEm: 7, arquivo: arquivo("p1") }), certificado({ id: "b" })],
    });
    const novo = salvarCertificado(d, { id: "a", titulo: "Novo", arquivo: arquivo("p1") }, AGORA);
    expect(novo.certificados.map((c) => c.id)).toEqual(["a", "b"]);
    expect(novo.certificados[0]).toMatchObject({ titulo: "Novo", criadoEm: 7 });
    expect(novo.arquivosParaApagar).toEqual([]);
  });

  it("trocar o arquivo manda o antigo para a lixeira", () => {
    const d = appData({ certificados: [certificado({ id: "a", arquivo: arquivo("p1") })] });
    const novo = salvarCertificado(d, { id: "a", arquivo: arquivo("p2") }, AGORA);
    expect(novo.certificados[0].arquivo.caminho).toBe("p2");
    expect(novo.arquivosParaApagar).toEqual([{ caminho: "p1", desde: AGORA }]);
  });

  it("excluir → lixeira; o arquivo só vence depois do prazo", () => {
    const d = appData({ certificados: [certificado({ id: "a", arquivo: arquivo("p1") })] });
    const { dados, removido } = excluirCertificado(d, "a", AGORA);
    expect(removido).toMatchObject({ indice: 0, item: { id: "a" } });
    expect(dados.certificados).toEqual([]);
    expect(arquivosVencidos(dados, AGORA + (DIAS_LIXEIRA - 1) * DIA)).toEqual([]);
    expect(arquivosVencidos(dados, AGORA + DIAS_LIXEIRA * DIA)).toEqual(["p1"]);
    expect(excluirCertificado(d, "zzz", AGORA)).toEqual({ dados: d, removido: null });
  });

  // A garantia que mais importa: nunca apagar um arquivo em uso.
  it("arquivo em uso nunca vence, mesmo velho na lixeira (Desfazer, backup restaurado)", () => {
    const d = appData({
      certificados: [certificado({ arquivo: arquivo("p1") })],
      arquivosParaApagar: [
        { caminho: "p1", desde: 1 },
        { caminho: "p2", desde: 1 },
      ],
    });
    expect(arquivosVencidos(d, AGORA)).toEqual(["p2"]);
  });

  it("tirarDaLixeira devolve o mesmo objeto se não havia nada (não grava à toa)", () => {
    const d = appData({ arquivosParaApagar: [{ caminho: "p1", desde: 1 }] });
    expect(tirarDaLixeira(d, ["x", undefined])).toBe(d);
    expect(tirarDaLixeira(d, ["p1"]).arquivosParaApagar).toEqual([]);
  });
});

describe("importar/restaurar backup", () => {
  const atual = appData({
    certificados: [certificado({ id: "a", arquivo: arquivo("p1") }), certificado({ id: "b", arquivo: arquivo("p2") })],
    tagsCertificados: [{ id: "t", nome: "T" }],
    arquivosParaApagar: [{ caminho: "p0", desde: 5 }],
  });

  it("backup anterior à tela (sem o campo) mantém os certificados atuais", () => {
    expect(certificadosDoBackup({ periodos: [] }, atual, AGORA)).toEqual({
      certificados: atual.certificados,
      tagsCertificados: atual.tagsCertificados,
      arquivosParaApagar: atual.arquivosParaApagar,
    });
  });

  it("os que saem vão para a lixeira e os que voltam saem dela", () => {
    const backup = {
      certificados: [
        certificado({ id: "a", arquivo: arquivo("p1") }),
        certificado({ id: "z", arquivo: arquivo("p0") }),
      ],
    };
    const r = certificadosDoBackup(backup, atual, AGORA);
    expect(r.certificados.map((c) => c.id)).toEqual(["a", "z"]);
    expect(r.tagsCertificados).toEqual([]);
    expect(r.arquivosParaApagar).toEqual([{ caminho: "p2", desde: AGORA }]);
  });

  it("resumo do backup conta certificados só quando há", () => {
    expect(resumoDoBackup(atual)).toMatch(/· 2 certificados$/);
    expect(resumoDoBackup(appData())).not.toMatch(/certificado/);
  });
});

describe("mensagens de erro do Storage", () => {
  it("regra recusou × sem conexão × desconhecido", () => {
    expect(mensagemErroArquivo("storage/unauthorized")).toMatch(/regras/);
    expect(mensagemErroArquivo("storage/retry-limit-exceeded")).toMatch(/internet/);
    expect(mensagemErroArquivo(undefined)).toMatch(/Tente de novo/);
  });
});
