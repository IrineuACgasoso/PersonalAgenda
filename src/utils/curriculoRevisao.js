// src/utils/curriculoRevisao.js
//
// PURO. Revisão do currículo pelo que recrutadores e sistemas de triagem
// (ATS) costumam olhar em vagas de computação. Só avisa: nada impede de
// baixar o PDF. Itens ocultos não contam (não estão no documento).
import { documentoDoCurriculo, ehEmail, sanitizarCurriculo } from "./curriculo.js";

const MAX_RESUMO = 450;
const MAX_PONTO = 220;
const MAX_PONTOS = 6;

// Começos que descrevem o cargo em vez do que a pessoa fez. Sem \b: em JS ele
// não reconhece letra acentuada ("responsável").
const INICIO_FRACO =
  /^(eu|fui|era|fiz parte|respons[aá]vel|ajud(ei|ava|ando)|particip(ei|ava|ando|ação)|auxili(ei|ava|ando)|trabalh(ei|ava|ando))(?=[\s,.:;]|$)/i;

const curto = (t) => (t.length > 45 ? `${t.slice(0, 44).trimEnd()}…` : t);

/**
 * @param {object} curriculo
 * @param {{ paginas?: number, perdidos?: string[], mesAtual?: string }} pagina
 *   resultado do layout (curriculoLayout.js)
 * @returns {{ id, nivel: "essencial"|"melhoria", texto }[]} essenciais primeiro
 */
export function revisarCurriculo(curriculo, { paginas = 1, perdidos = [], mesAtual } = {}) {
  const c = sanitizarCurriculo(curriculo);
  const doc = documentoDoCurriculo(c, mesAtual);
  const secao = (id) => doc.secoes.find((s) => s.id === id)?.blocos || [];
  const tem = (campo) => !!c.dados[campo].trim();
  const avisos = [];
  const essencial = (id, texto) => avisos.push({ id, nivel: "essencial", texto });
  const melhoria = (id, texto) => avisos.push({ id, nivel: "melhoria", texto });

  if (!doc.nome) essencial("nome", "Preencha o seu nome.");
  if (!tem("email")) essencial("email", "Coloque um e-mail: é por ele que chamam para a entrevista.");
  else if (!ehEmail(c.dados.email.trim())) essencial("email", "O e-mail parece incompleto.");
  if (!tem("telefone")) essencial("telefone", "Coloque um telefone com DDD.");
  if (!tem("github")) essencial("github", "Coloque o GitHub: em computação é o que mais olham depois da experiência.");
  if (!tem("linkedin")) melhoria("linkedin", "Coloque o LinkedIn.");
  if (!tem("cargo")) melhoria("cargo", "Diga a vaga que procura logo abaixo do nome.");
  if (!tem("local")) melhoria("local", "Coloque a cidade (só cidade e estado).");

  if (secao("formacao").length === 0) essencial("formacao", "Adicione a sua formação, com a previsão de conclusão.");
  if (secao("habilidades").length === 0) {
    essencial("habilidades", "Adicione as habilidades técnicas: os filtros automáticos procuram essas palavras.");
  }
  const projetos = secao("projetos");
  const experiencias = secao("experiencia");
  if (projetos.length === 0 && experiencias.length === 0) {
    essencial("pratica", "Adicione pelo menos uma experiência ou um projeto.");
  } else if (projetos.length < 2 && experiencias.length === 0) {
    melhoria("projetos", "Sem experiência profissional, mostre 2 ou 3 projetos.");
  }
  if (projetos.length > 0 && projetos.every((p) => !p.complementoUrl)) {
    melhoria("linkProjetos", "Coloque o link de pelo menos um projeto.");
  }

  const resumo = c.resumo.trim();
  if (resumo.length > MAX_RESUMO) {
    melhoria("resumo", `O resumo está longo (${resumo.length} letras). Tente ficar em 3 linhas.`);
  }

  const descritos = [...experiencias, ...projetos, ...secao("atividades")];
  for (const [i, b] of descritos.entries()) {
    const id = `item${i}`;
    const nome = curto(b.titulo);
    if (b.pontos.length === 0) melhoria(`${id}|semPontos`, `“${nome}”: descreva o que você fez em 2 a 5 pontos.`);
    if (b.pontos.length > MAX_PONTOS) melhoria(`${id}|muitos`, `“${nome}”: são muitos pontos, deixe os 5 mais fortes.`);
    const fraco = b.pontos.find((p) => INICIO_FRACO.test(p));
    if (fraco) {
      melhoria(
        `${id}|fraco`,
        `“${nome}”: comece com um verbo de ação (desenvolvi, implementei, automatizei) em vez de “${curto(fraco)}”.`,
      );
    }
    const longo = b.pontos.find((p) => p.length > MAX_PONTO);
    if (longo) melhoria(`${id}|longo`, `“${nome}”: encurte o ponto “${curto(longo)}” (até 2 linhas).`);
  }
  const pontos = descritos.flatMap((b) => b.pontos);
  if (pontos.length > 0 && !pontos.some((p) => /\d/.test(p))) {
    melhoria("numeros", "Nenhum ponto tem números. Mostre o impacto: usuários, tempo economizado, % de melhora, nota.");
  }

  if (paginas > 1) {
    melhoria(
      "paginas",
      `Está em ${paginas} páginas. Para estágio e júnior o ideal é 1: esconda os itens menos relevantes.`,
    );
  }
  if (perdidos.length > 0) {
    melhoria("caracteres", `Estes caracteres não saem no PDF: ${perdidos.join(" ")}`);
  }

  return avisos.sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === "essencial" ? -1 : 1));
}
