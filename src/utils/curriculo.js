// src/utils/curriculo.js
//
// PURO. Currículo (VisaoCurriculo): módulos e campos, sanitização, edição das
// listas e o "documento" (o que de fato entra no currículo, já em texto).
// Desenho da página em curriculoLayout.js; dicas em curriculoRevisao.js.
//
// O formato é o usual em vagas de computação: uma página, uma coluna, sem
// foto/idade/CPF, texto selecionável (os sistemas de triagem, ATS, leem o PDF
// de cima para baixo) e o mais recente primeiro.
//
// Modelo (AppData.curriculo):
//   { dados: { nome, cargo, ... }, resumo, secoes: { [idModulo]: item[] }, ordem: idModulo[] }
//   item: { id, oculto?: true, ...campos do módulo (sempre string) }
// Campo novo num módulo ⇒ basta declará-lo em MODULOS (a sanitização e o
// formulário leem daqui).
import { normalizarUrl } from "./links.js";
import { reinserirPorId, separarRemovidos } from "./desfazer.js";

/* ---------- campos ---------- */
// tipo: texto | longo | pontos (um por linha) | mes ("YYYY-MM") | link | opcoes

export const CAMPOS_DADOS = [
  { id: "nome", rotulo: "Nome completo", tipo: "texto", obrigatorio: true, exemplo: "ex: Maria Souza Lima" },
  { id: "cargo", rotulo: "Título / vaga desejada", tipo: "texto", exemplo: "ex: Estágio em Desenvolvimento Back-end" },
  { id: "local", rotulo: "Cidade", tipo: "texto", exemplo: "ex: Recife, PE" },
  { id: "telefone", rotulo: "Telefone", tipo: "texto", modo: "tel", exemplo: "ex: (81) 99999-9999" },
  { id: "email", rotulo: "E-mail", tipo: "texto", modo: "email", exemplo: "ex: maria@email.com" },
  { id: "linkedin", rotulo: "LinkedIn", tipo: "link", exemplo: "ex: linkedin.com/in/maria" },
  { id: "github", rotulo: "GitHub", tipo: "link", exemplo: "ex: github.com/maria" },
  { id: "site", rotulo: "Portfólio / site", tipo: "link", exemplo: "ex: maria.dev" },
];

export const CAMPOS_RESUMO = [
  {
    id: "resumo",
    rotulo: "Resumo",
    tipo: "longo",
    largo: true,
    exemplo:
      "ex: Estudante de Ciência da Computação na UFPE com foco em back-end. Experiência com Java, Spring e PostgreSQL em projetos acadêmicos e monitoria. Busco estágio em desenvolvimento.",
  },
];

export const DICAS_FIXAS = {
  dados: "Só o necessário para falarem com você. Foto, idade, CPF, endereço completo e estado civil ficam de fora.",
  resumo: "2 ou 3 linhas: quem você é, no que é bom e o que procura. Opcional: se não acrescentar, deixe vazio.",
};

const NIVEIS_IDIOMA = ["Básico", "Intermediário", "Avançado", "Fluente", "Nativo"];

const DICA_PONTOS =
  "Um por linha: verbo de ação + o que fez + tecnologia + resultado. Ex.: “Reduzi em 40% o tempo das consultas criando índices no PostgreSQL”.";

const campoInicio = { id: "inicio", rotulo: "Início", tipo: "mes" };
const campoFim = { id: "fim", rotulo: "Fim", tipo: "mes", ajuda: "Vazio = até hoje" };
const campoPontos = { id: "pontos", rotulo: "O que você fez", tipo: "pontos", largo: true, ajuda: DICA_PONTOS };

// `ordenacao`: "data" = mais recente primeiro, automático; "manual" = ↑/↓.
// `bloco(item, mesAtual)` = como o item aparece no documento.
export const MODULOS = [
  {
    id: "formacao",
    titulo: "Formação acadêmica",
    novo: "Nova formação",
    ordenacao: "data",
    dica: "Enquanto você é estudante, fica no topo. Ensino médio só se for técnico na área.",
    campos: [
      {
        id: "curso",
        rotulo: "Curso",
        tipo: "texto",
        obrigatorio: true,
        exemplo: "ex: Bacharelado em Ciência da Computação",
      },
      {
        id: "instituicao",
        rotulo: "Instituição",
        tipo: "texto",
        obrigatorio: true,
        exemplo: "ex: Universidade Federal de Pernambuco (UFPE)",
      },
      { id: "local", rotulo: "Local", tipo: "texto", exemplo: "ex: Recife, PE" },
      campoInicio,
      { ...campoFim, rotulo: "Fim ou previsão" },
      {
        id: "pontos",
        rotulo: "Destaques",
        tipo: "pontos",
        largo: true,
        ajuda: "Um por linha. Ex.: média (se for boa), disciplinas relevantes para a vaga, intercâmbio.",
      },
    ],
    bloco: (i, mesAtual) => ({
      tipo: "item",
      titulo: i.curso,
      direita: textoPeriodo(i.inicio, i.fim, mesAtual),
      subtitulo: i.instituicao,
      complemento: i.local,
      pontos: listaDePontos(i.pontos),
    }),
  },
  {
    id: "experiencia",
    titulo: "Experiência profissional",
    novo: "Nova experiência",
    ordenacao: "data",
    dica: "Estágio, emprego, freelance, empresa júnior. De 2 a 5 pontos por experiência.",
    campos: [
      {
        id: "cargo",
        rotulo: "Cargo",
        tipo: "texto",
        obrigatorio: true,
        exemplo: "ex: Estagiário(a) de Desenvolvimento",
      },
      { id: "empresa", rotulo: "Empresa", tipo: "texto", obrigatorio: true },
      { id: "local", rotulo: "Local", tipo: "texto", exemplo: "ex: Recife, PE · Remoto" },
      campoInicio,
      campoFim,
      campoPontos,
      {
        id: "tecnologias",
        rotulo: "Tecnologias",
        tipo: "texto",
        largo: true,
        exemplo: "ex: Java, Spring Boot, PostgreSQL",
      },
    ],
    bloco: (i, mesAtual) => ({
      tipo: "item",
      titulo: i.cargo,
      direita: textoPeriodo(i.inicio, i.fim, mesAtual),
      subtitulo: i.empresa,
      complemento: i.local,
      pontos: listaDePontos(i.pontos),
      rodape: i.tecnologias ? { rotulo: "Tecnologias:", texto: i.tecnologias } : null,
    }),
  },
  {
    id: "projetos",
    titulo: "Projetos",
    novo: "Novo projeto",
    ordenacao: "manual",
    dica: "Os 2 a 4 melhores, com o mais relevante para a vaga no topo. Link do repositório com README ajuda muito.",
    campos: [
      { id: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true, exemplo: "ex: Minha Agenda (PWA)" },
      { id: "link", rotulo: "Link", tipo: "link", exemplo: "ex: github.com/maria/agenda" },
      {
        id: "tecnologias",
        rotulo: "Tecnologias",
        tipo: "texto",
        largo: true,
        exemplo: "ex: React, Firebase, Vitest",
      },
      campoInicio,
      campoFim,
      campoPontos,
    ],
    bloco: (i, mesAtual) => ({
      tipo: "item",
      titulo: i.nome,
      direita: textoPeriodo(i.inicio, i.fim, mesAtual),
      subtitulo: i.tecnologias,
      complemento: textoDoLink(i.link),
      complementoUrl: urlDoLink(i.link),
      pontos: listaDePontos(i.pontos),
    }),
  },
  {
    id: "habilidades",
    titulo: "Habilidades técnicas",
    novo: "Novo grupo de habilidades",
    ordenacao: "manual",
    dica: "Um grupo por linha (Linguagens, Frameworks, Bancos de dados, Ferramentas). Só o que você defenderia numa entrevista: nada de barrinhas ou porcentagens.",
    campos: [
      { id: "grupo", rotulo: "Grupo", tipo: "texto", obrigatorio: true, exemplo: "ex: Linguagens" },
      {
        id: "itens",
        rotulo: "Habilidades",
        tipo: "texto",
        obrigatorio: true,
        largo: true,
        exemplo: "ex: Python, Java, C, JavaScript",
      },
    ],
    bloco: (i) => ({ tipo: "linha", rotulo: `${i.grupo.replace(/\s*:\s*$/, "")}:`, texto: i.itens }),
  },
  {
    id: "atividades",
    titulo: "Atividades acadêmicas",
    novo: "Nova atividade",
    ordenacao: "data",
    dica: "Monitoria, iniciação científica, extensão, liga, maratona de programação. Conta como experiência para quem está começando.",
    campos: [
      { id: "papel", rotulo: "Atividade", tipo: "texto", obrigatorio: true, exemplo: "ex: Monitoria de Algoritmos" },
      { id: "organizacao", rotulo: "Organização", tipo: "texto", exemplo: "ex: Centro de Informática, UFPE" },
      { id: "local", rotulo: "Local", tipo: "texto", exemplo: "ex: Recife, PE" },
      campoInicio,
      campoFim,
      campoPontos,
    ],
    bloco: (i, mesAtual) => ({
      tipo: "item",
      titulo: i.papel,
      direita: textoPeriodo(i.inicio, i.fim, mesAtual),
      subtitulo: i.organizacao,
      complemento: i.local,
      pontos: listaDePontos(i.pontos),
    }),
  },
  {
    id: "certificacoes",
    titulo: "Certificações e cursos",
    novo: "Nova certificação ou curso",
    ordenacao: "data",
    dica: "Só os que têm a ver com a vaga. O link da credencial permite conferir.",
    campos: [
      { id: "titulo", rotulo: "Título", tipo: "texto", obrigatorio: true, exemplo: "ex: AWS Cloud Practitioner" },
      { id: "emissor", rotulo: "Emissor", tipo: "texto", exemplo: "ex: Amazon Web Services" },
      { id: "data", rotulo: "Data", tipo: "mes" },
      { id: "link", rotulo: "Link da credencial", tipo: "link" },
    ],
    bloco: (i) => ({
      tipo: "linha",
      rotulo: i.titulo,
      texto: i.emissor ? `– ${i.emissor}` : "",
      direita: textoMes(i.data),
      url: urlDoLink(i.link),
    }),
  },
  {
    id: "premios",
    titulo: "Prêmios e publicações",
    novo: "Novo prêmio ou publicação",
    ordenacao: "data",
    dica: "Olimpíadas, hackathons, bolsas, artigos.",
    campos: [
      {
        id: "titulo",
        rotulo: "Título",
        tipo: "texto",
        obrigatorio: true,
        exemplo: "ex: 2º lugar no Hackathon do CIn",
      },
      { id: "organizacao", rotulo: "Organização / evento", tipo: "texto" },
      { id: "data", rotulo: "Data", tipo: "mes" },
      { id: "link", rotulo: "Link", tipo: "link" },
    ],
    bloco: (i) => ({
      tipo: "linha",
      rotulo: i.titulo,
      texto: i.organizacao ? `– ${i.organizacao}` : "",
      direita: textoMes(i.data),
      url: urlDoLink(i.link),
    }),
  },
  {
    id: "idiomas",
    titulo: "Idiomas",
    novo: "Novo idioma",
    ordenacao: "manual",
    // Todos numa linha só: economiza espaço para caber em uma página.
    juntar: true,
    dica: "Nível real: é comum a entrevista mudar para inglês. Teste de proficiência vai na observação.",
    campos: [
      { id: "idioma", rotulo: "Idioma", tipo: "texto", obrigatorio: true, exemplo: "ex: Inglês" },
      { id: "nivel", rotulo: "Nível", tipo: "opcoes", opcoes: NIVEIS_IDIOMA, obrigatorio: true },
      { id: "obs", rotulo: "Observação", tipo: "texto", exemplo: "ex: TOEFL ITP 590" },
    ],
    bloco: (i) => ({
      tipo: "linha",
      rotulo: i.idioma,
      texto: `(${[i.nivel, i.obs].filter(Boolean).join(", ")})`,
    }),
  },
];

const MODULO_POR_ID = Object.fromEntries(MODULOS.map((m) => [m.id, m]));
export const moduloPorId = (id) => MODULO_POR_ID[id];

/* ---------- sanitização ---------- */

const ehObjeto = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const objeto = (v) => (ehObjeto(v) ? v : {});
const texto = (v) => (typeof v === "string" ? v : "");

const MES = /^\d{4}-(0[1-9]|1[0-2])$/;
export const ehMes = (v) => MES.test(v);

/** "2025-03", "03/2025" ou "3/2025" → "2025-03"; "" → ""; resto → null (navegador sem campo de mês). */
export function normalizarMes(digitado) {
  const t = texto(digitado).trim();
  if (!t) return "";
  if (ehMes(t)) return t;
  const m = t.match(/^(\d{1,2})\s*[/-]\s*(\d{4})$/);
  const mes = m && `${m[2]}-${m[1].padStart(2, "0")}`;
  return mes && ehMes(mes) ? mes : null;
}

function sanitizarItem(modulo, bruto, indice) {
  const item = { ...bruto, id: texto(bruto.id) || `${modulo.id}-${indice}` };
  for (const campo of modulo.campos) {
    const valor = texto(bruto[campo.id]);
    item[campo.id] = campo.tipo === "mes" ? normalizarMes(valor) || "" : valor;
  }
  // Fora do currículo sem apagar; ausente = aparece.
  if (bruto.oculto === true) item.oculto = true;
  else delete item.oculto;
  return item;
}

/** Sempre completo e idempotente; campos desconhecidos (versão mais nova) são mantidos. */
export function sanitizarCurriculo(bruto) {
  const c = objeto(bruto);
  const dados = objeto(c.dados);
  const secoes = objeto(c.secoes);
  return {
    ...c,
    dados: { ...dados, ...Object.fromEntries(CAMPOS_DADOS.map(({ id }) => [id, texto(dados[id])])) },
    resumo: texto(c.resumo),
    secoes: {
      ...secoes,
      ...Object.fromEntries(
        MODULOS.map((m) => {
          const itens = Array.isArray(secoes[m.id]) ? secoes[m.id].filter(ehObjeto) : [];
          return [m.id, itens.map((item, i) => sanitizarItem(m, item, i))];
        }),
      ),
    },
    ordem: sanitizarOrdem(c.ordem),
  };
}

function sanitizarOrdem(bruta) {
  const salvos = Array.isArray(bruta) ? bruta.filter((id) => MODULO_POR_ID[id]) : [];
  return [...new Set([...salvos, ...MODULOS.map((m) => m.id)])];
}

export const CURRICULO_PADRAO = sanitizarCurriculo(null);

export function curriculoVazio(curriculo) {
  const c = sanitizarCurriculo(curriculo);
  return (
    !c.resumo.trim() &&
    CAMPOS_DADOS.every(({ id }) => !c.dados[id].trim()) &&
    MODULOS.every((m) => c.secoes[m.id].length === 0)
  );
}

/** Importar/restaurar: backup anterior à tela de Currículo mantém o atual. */
export function curriculoDoBackup(backup, atual) {
  return { curriculo: ehObjeto(backup?.curriculo) ? backup.curriculo : atual?.curriculo };
}

/* ---------- edição (updaters do persist: recebem e devolvem o AppData) ---------- */

const comCurriculo = (d, mudar) => ({ ...d, curriculo: mudar(sanitizarCurriculo(d.curriculo)) });

const comSecao = (d, idModulo, mudar) =>
  comCurriculo(d, (c) => ({ ...c, secoes: { ...c.secoes, [idModulo]: mudar(c.secoes[idModulo]) } }));

export const salvarDados = (d, patch) => comCurriculo(d, (c) => ({ ...c, dados: { ...c.dados, ...patch } }));

export const salvarResumo = (d, resumo) => comCurriculo(d, (c) => ({ ...c, resumo }));

/** Cria (id novo) ou edita no lugar. */
export const salvarItem = (d, idModulo, item) =>
  comSecao(d, idModulo, (lista) =>
    lista.some((x) => x.id === item.id)
      ? lista.map((x) => (x.id === item.id ? { ...x, ...item } : x))
      : [...lista, item],
  );

export const alternarOculto = (d, idModulo, id) =>
  comSecao(d, idModulo, (lista) => lista.map((x) => (x.id === id ? { ...x, oculto: !x.oculto } : x)));

export function excluirItem(d, idModulo, id) {
  const lista = sanitizarCurriculo(d.curriculo).secoes[idModulo];
  const { restantes, removidos } = separarRemovidos(lista, (x) => x.id === id);
  if (removidos.length === 0) return { dados: d, removido: null };
  return { dados: comSecao(d, idModulo, () => restantes), removido: removidos[0] };
}

export const devolverItem = (d, idModulo, { item, indice }) =>
  comSecao(d, idModulo, (lista) => reinserirPorId(lista, item, indice));

function trocarComVizinho(lista, indice, passo) {
  const alvo = indice + passo;
  if (indice < 0 || alvo < 0 || alvo >= lista.length) return lista;
  const copia = [...lista];
  [copia[indice], copia[alvo]] = [copia[alvo], copia[indice]];
  return copia;
}

/** passo: -1 sobe, +1 desce. */
export const moverItem = (d, idModulo, id, passo) =>
  comSecao(d, idModulo, (lista) =>
    trocarComVizinho(
      lista,
      lista.findIndex((x) => x.id === id),
      passo,
    ),
  );

export const moverModulo = (d, idModulo, passo) =>
  comCurriculo(d, (c) => ({ ...c, ordem: trocarComVizinho(c.ordem, c.ordem.indexOf(idModulo), passo) }));

/** Limpa o que saiu do formulário: espaços das pontas e o mês digitado à mão. */
export function limparRascunho(campos, rascunho) {
  return Object.fromEntries(
    campos.map((c) => {
      const valor = texto(rascunho[c.id]).trim();
      return [c.id, c.tipo === "mes" ? (normalizarMes(valor) ?? valor) : valor];
    }),
  );
}

/** Mensagem do primeiro problema do formulário, ou null. Espera o rascunho já limpo. */
export function erroDoRascunho(campos, rascunho) {
  for (const c of campos) {
    const valor = rascunho[c.id];
    if (c.obrigatorio && !valor) return `Preencha o campo “${c.rotulo}”.`;
    if (c.tipo === "mes" && valor && !ehMes(valor)) return `“${c.rotulo}”: use mês e ano, como 03/2026.`;
    if (c.tipo === "link" && /\s/.test(valor)) return `“${c.rotulo}”: o link não pode ter espaços.`;
    if (c.modo === "email" && valor && !ehEmail(valor)) return "O e-mail parece incompleto.";
  }
  if (rascunho.inicio && rascunho.fim && rascunho.fim < rascunho.inicio) {
    return "O fim não pode ser antes do início.";
  }
  return null;
}

export const ehEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/* ---------- textos ---------- */

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** "2025-03" → "Mar 2025". */
export function textoMes(mes) {
  return ehMes(mes) ? `${MESES[Number(mes.slice(5)) - 1]} ${mes.slice(0, 4)}` : "";
}

/** "Mar 2025 – Atual"; fim no futuro vira previsão (formação). */
export function textoPeriodo(inicio, fim, mesAtual) {
  const de = textoMes(inicio);
  const ate = textoMes(fim);
  const previsao = ate && mesAtual && fim > mesAtual ? " (previsão)" : "";
  if (de && ate) return de === ate ? de : `${de} – ${ate}${previsao}`;
  if (de) return `${de} – Atual`;
  return ate ? `${ate}${previsao}` : "";
}

/** Texto com um ponto por linha → lista, sem o marcador que a pessoa tenha digitado. */
export function listaDePontos(valor) {
  return texto(valor)
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-–—•*·]\s+/, "").trim())
    .filter(Boolean);
}

const semEspacos = (v) => texto(v).trim();

export function urlDoLink(valor) {
  const t = semEspacos(valor);
  return t ? normalizarUrl(t) : undefined;
}

/** Como o link aparece impresso: sem protocolo, www nem barra final. */
export function textoDoLink(valor) {
  return semEspacos(valor)
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "");
}

// Aceita só o usuário ("maria" ou "@maria") além do link inteiro.
function perfil(valor, base) {
  const t = semEspacos(valor).replace(/^@/, "");
  return t && !/[./]/.test(t) ? `${base}${t}` : t;
}

/** "Curriculo_Maria_Souza.pdf": sem acento nem espaço, aceito por qualquer formulário de vaga. */
export function nomeDoArquivo(curriculo) {
  const nome = texto(curriculo?.dados?.nome)
    .normalize("NFD")
    .replace(/[^A-Za-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  return nome ? `Curriculo_${nome}.pdf` : "Curriculo.pdf";
}

/* ---------- ordem dos itens e documento ---------- */

// Em andamento (início sem fim) conta como o mais recente de todos.
function chaveDeData(item) {
  const fim = item.fim || item.data || (item.inicio ? "9999-99" : "");
  return [fim, item.inicio || ""];
}

/** Itens na ordem do currículo: por data (mais recente primeiro) ou a ordem salva. */
export function itensEmOrdem(modulo, itens) {
  if (modulo.ordenacao !== "data") return itens;
  return [...itens].sort((a, b) => {
    const [fimA, iniA] = chaveDeData(a);
    const [fimB, iniB] = chaveDeData(b);
    return fimB.localeCompare(fimA) || iniB.localeCompare(iniA);
  });
}

function contatos(dados) {
  const linkedin = perfil(dados.linkedin, "linkedin.com/in/");
  const github = perfil(dados.github, "github.com/");
  const email = semEspacos(dados.email);
  return [
    { texto: semEspacos(dados.local) },
    { texto: semEspacos(dados.telefone) },
    { texto: email, url: email ? `mailto:${email}` : undefined },
    { texto: textoDoLink(linkedin), url: urlDoLink(linkedin) },
    { texto: textoDoLink(github), url: urlDoLink(github) },
    { texto: textoDoLink(dados.site), url: urlDoLink(dados.site) },
  ].filter((c) => c.texto);
}

/**
 * O que entra no currículo: sem módulos vazios nem itens ocultos, na ordem
 * final. `mesAtual` = "YYYY-MM" (previsão de formatura).
 * { nome, cargo, contatos: [{ texto, url? }], secoes: [{ id, titulo, blocos }] }
 */
export function documentoDoCurriculo(curriculo, mesAtual) {
  const c = sanitizarCurriculo(curriculo);
  const secoes = c.ordem.map((id) => {
    const m = MODULO_POR_ID[id];
    const itens = itensEmOrdem(m, c.secoes[id]).filter((i) => !i.oculto);
    const blocos = itens.map((i) => m.bloco(i, mesAtual));
    if (!m.juntar || blocos.length === 0) return { id, titulo: m.titulo, blocos };
    const juntos = blocos.map((b) => `${b.rotulo} ${b.texto}`).join("  |  ");
    return { id, titulo: m.titulo, blocos: [{ tipo: "paragrafo", texto: juntos }] };
  });
  const resumo = c.resumo.trim();
  if (resumo) secoes.unshift({ id: "resumo", titulo: "Resumo", blocos: [{ tipo: "paragrafo", texto: resumo }] });
  return {
    nome: semEspacos(c.dados.nome),
    cargo: semEspacos(c.dados.cargo),
    contatos: contatos(c.dados),
    secoes: secoes.filter((s) => s.blocos.length > 0),
  };
}

/** Linha do item na tela de edição: { titulo, detalhe }. */
export function resumoDoItem(modulo, item, mesAtual) {
  const b = modulo.bloco(item, mesAtual);
  const partes = b.tipo === "item" ? [b.subtitulo, b.direita] : [b.texto?.replace(/^– /, ""), b.direita];
  return { titulo: (b.titulo || b.rotulo || "").replace(/:$/, ""), detalhe: partes.filter(Boolean).join(" · ") };
}
