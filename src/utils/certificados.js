// src/utils/certificados.js
// PURO. Tela de Certificados: validação, filtro, tags e o ciclo de vida dos
// arquivos.
//
// O ARQUIVO (PDF, imagem…) nunca entra no AppData: ele fica no Firebase
// Storage (src/arquivos.js) e aqui só existe um registro leve dele
// ({ caminho, url, nome, tipo, tamanho }, ~400 bytes). Assim o documento do
// Firestore, o cache offline, os backups e a abertura do app não crescem com
// os arquivos, e abrir um certificado é só abrir um link.
//
//   certificados[]       { id, titulo, cor, tags: idTag[], arquivo, criadoEm }
//   tagsCertificados[]   { id, nome }
//   arquivosParaApagar[] { caminho, desde }  ← lixeira de arquivos (ver abaixo)
//
// Lixeira: excluir um certificado (ou trocar o arquivo dele) não apaga o
// arquivo na hora. Ele espera DIAS_LIXEIRA dias, para o "Desfazer" e os
// backups da nuvem ainda o encontrarem; depois useFaxinaArquivos o apaga. Um
// arquivo que algum certificado usa nunca é apagado, mesmo que esteja na lista.

export const TAMANHO_MAXIMO = 20 * 1024 * 1024; // igual ao storage.rules
export const DIAS_LIXEIRA = 30;

// Extensão → tipo. O tipo vem da extensão, e não de `file.type`, que alguns
// aparelhos devolvem vazio. Igual à lista do storage.rules (integridade.test).
// SVG e HTML ficam de fora de propósito: executam script ao abrir.
export const TIPOS_POR_EXTENSAO = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
};

// Para o atributo `accept` do campo de arquivo.
export const ACEITOS = Object.keys(TIPOS_POR_EXTENSAO)
  .map((e) => `.${e}`)
  .join(",");

export function extensaoDe(nome) {
  const m = /\.([a-z0-9]+)$/i.exec(String(nome || "").trim());
  return m ? m[1].toLowerCase() : "";
}

export const tipoDoArquivo = (nome) => TIPOS_POR_EXTENSAO[extensaoDe(nome)] || "";

/** "320 KB", "1,4 MB". */
export function textoTamanho(bytes) {
  const n = Number(bytes);
  if (!(n > 0)) return "";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  const mb = Math.round((n / (1024 * 1024)) * 10) / 10;
  return `${String(mb).replace(".", ",")} MB`;
}

/** Motivo para recusar o arquivo escolhido (`{ name, size }`), ou null. */
export function erroDoArquivo(arquivo) {
  if (!arquivo) return "Escolha o arquivo do certificado.";
  if (!tipoDoArquivo(arquivo.name)) {
    return "Formato não aceito. Use PDF, imagem (PNG, JPG, WEBP), Word, PowerPoint ou ODT.";
  }
  if (!(arquivo.size > 0)) return "Esse arquivo está vazio.";
  if (arquivo.size > TAMANHO_MAXIMO) {
    return `O arquivo tem ${textoTamanho(arquivo.size)}; o máximo é ${textoTamanho(TAMANHO_MAXIMO)}.`;
  }
  return null;
}

/** "PDF · 320 KB" (linha do certificado). */
export function resumoDoArquivo(arquivo) {
  if (!arquivo) return "sem arquivo";
  return [extensaoDe(arquivo.nome).toUpperCase() || "Arquivo", textoTamanho(arquivo.tamanho)]
    .filter(Boolean)
    .join(" · ");
}

/** Caminho no Storage. Nome aleatório: trocar o arquivo nunca sobrescreve o antigo. */
export const caminhoDoArquivo = (uid, idArquivo, nome) => `users/${uid}/certificados/${idArquivo}.${extensaoDe(nome)}`;

/* ---------- sanitização (sanitizarDados.js) ---------- */

const ehObjeto = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const listaDeObjetos = (v) => (Array.isArray(v) ? v.filter(ehObjeto) : []);

function sanitizarArquivo(a) {
  // Sem caminho não dá para apagar/achar; sem https não vira link (#50).
  if (!ehObjeto(a) || typeof a.caminho !== "string" || !a.caminho) return undefined;
  if (typeof a.url !== "string" || !/^https:\/\//i.test(a.url)) return undefined;
  return {
    caminho: a.caminho,
    url: a.url,
    nome: typeof a.nome === "string" ? a.nome : "",
    tipo: typeof a.tipo === "string" ? a.tipo : "",
    tamanho: Number(a.tamanho) > 0 ? Number(a.tamanho) : 0,
  };
}

export function sanitizarCertificados(valor) {
  return listaDeObjetos(valor).map((c) => ({
    ...c,
    titulo: typeof c.titulo === "string" ? c.titulo : "",
    tags: Array.isArray(c.tags) ? [...new Set(c.tags.filter((t) => typeof t === "string"))] : [],
    arquivo: sanitizarArquivo(c.arquivo),
  }));
}

export const sanitizarTags = (valor) =>
  listaDeObjetos(valor).filter((t) => t.id && typeof t.nome === "string" && t.nome.trim());

export function sanitizarLixeira(valor) {
  const vistos = new Set();
  return listaDeObjetos(valor).filter((e) => {
    if (typeof e.caminho !== "string" || !e.caminho || !(Number(e.desde) > 0) || vistos.has(e.caminho)) return false;
    vistos.add(e.caminho);
    return true;
  });
}

/* ---------- busca e filtro ---------- */

// Sem acento e sem caixa: "cálculo" acha "MONITORIA DE CALCULO".
export function normalizarTexto(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Busca só no título (todas as palavras, em qualquer ordem) e filtro por
 * tags: com várias selecionadas, aparece quem tem PELO MENOS UMA delas.
 * Mais novos primeiro.
 */
export function filtrarCertificados(certificados, { busca = "", tags = [] } = {}) {
  const palavras = normalizarTexto(busca).split(/\s+/).filter(Boolean);
  return (certificados || [])
    .filter((c) => {
      const titulo = normalizarTexto(c.titulo);
      if (!palavras.every((p) => titulo.includes(p))) return false;
      return tags.length === 0 || (c.tags || []).some((t) => tags.includes(t));
    })
    .sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
}

/** Tags do certificado na ordem da lista de tags (ids que não existem mais somem). */
export const tagsDoCertificado = (c, tags) => (tags || []).filter((t) => (c?.tags || []).includes(t.id));

/* ---------- tags ---------- */

export function erroDaTag(tags, nome) {
  const limpo = normalizarTexto(nome);
  if (!limpo) return "Digite o nome da tag.";
  if ((tags || []).some((t) => normalizarTexto(t.nome) === limpo)) return "Essa tag já existe.";
  return null;
}

/** Exclui a tag da lista e de todos os certificados. `removida` alimenta o Desfazer. */
export function excluirTag(dados, idTag) {
  const tags = dados.tagsCertificados || [];
  const indice = tags.findIndex((t) => t.id === idTag);
  if (indice === -1) return { dados, removida: null };
  const certificados = dados.certificados || [];
  const usadaEm = certificados.filter((c) => (c.tags || []).includes(idTag)).map((c) => c.id);
  return {
    removida: { tag: tags[indice], indice, usadaEm },
    dados: {
      ...dados,
      tagsCertificados: tags.filter((t) => t.id !== idTag),
      certificados: certificados.map((c) =>
        usadaEm.includes(c.id) ? { ...c, tags: c.tags.filter((t) => t !== idTag) } : c,
      ),
    },
  };
}

export function devolverTag(dados, { tag, indice, usadaEm }) {
  const tags = dados.tagsCertificados || [];
  if (tags.some((t) => t.id === tag.id)) return dados;
  return {
    ...dados,
    tagsCertificados: [...tags.slice(0, indice), tag, ...tags.slice(indice)],
    certificados: (dados.certificados || []).map((c) =>
      usadaEm.includes(c.id) ? { ...c, tags: [...new Set([...(c.tags || []), tag.id])] } : c,
    ),
  };
}

/* ---------- certificados e lixeira de arquivos ---------- */

export function erroDoCertificado({ titulo, arquivo }) {
  if (!String(titulo || "").trim()) return "Dê um título ao certificado.";
  if (!arquivo) return "Escolha o arquivo do certificado.";
  return null;
}

function porNaLixeira(lixeira, caminho, agora) {
  const base = lixeira || [];
  if (!caminho || base.some((e) => e.caminho === caminho)) return base;
  return [...base, { caminho, desde: agora }];
}

/** Cria (id novo) ou edita (id existente). Arquivo trocado: o antigo vai para a lixeira. */
export function salvarCertificado(dados, certificado, agora) {
  const certificados = dados.certificados || [];
  const antigo = certificados.find((c) => c.id === certificado.id);
  if (!antigo) return { ...dados, certificados: [...certificados, { criadoEm: agora, ...certificado }] };
  const trocado = antigo.arquivo && antigo.arquivo.caminho !== certificado.arquivo?.caminho;
  return {
    ...dados,
    certificados: certificados.map((c) => (c.id === certificado.id ? { ...c, ...certificado } : c)),
    arquivosParaApagar: trocado
      ? porNaLixeira(dados.arquivosParaApagar, antigo.arquivo.caminho, agora)
      : dados.arquivosParaApagar || [],
  };
}

export function excluirCertificado(dados, id, agora) {
  const certificados = dados.certificados || [];
  const indice = certificados.findIndex((c) => c.id === id);
  if (indice === -1) return { dados, removido: null };
  const item = certificados[indice];
  return {
    removido: { item, indice },
    dados: {
      ...dados,
      certificados: certificados.filter((c) => c.id !== id),
      arquivosParaApagar: porNaLixeira(dados.arquivosParaApagar, item.arquivo?.caminho, agora),
    },
  };
}

/** Caminhos que nenhum certificado usa mais e já esperaram DIAS_LIXEIRA dias. */
export function arquivosVencidos(dados, agora) {
  const usados = new Set((dados?.certificados || []).map((c) => c.arquivo?.caminho));
  const limite = agora - DIAS_LIXEIRA * 24 * 60 * 60 * 1000;
  return (dados?.arquivosParaApagar || [])
    .filter((e) => e.desde <= limite && !usados.has(e.caminho))
    .map((e) => e.caminho);
}

/** Tira da lixeira. Devolve o próprio `dados` se não havia nada (não grava à toa). */
export function tirarDaLixeira(dados, caminhos) {
  const atual = dados.arquivosParaApagar || [];
  const resto = atual.filter((e) => !caminhos.includes(e.caminho));
  return resto.length === atual.length ? dados : { ...dados, arquivosParaApagar: resto };
}

/**
 * Importar/restaurar backup. Backup anterior à tela de Certificados não sabe
 * deles: mantém os atuais (senão restaurar um backup antigo sumiria com
 * todos). Num backup que os tem, os arquivos que deixam de ser usados vão
 * para a lixeira, e os que voltam a ser usados saem dela.
 */
export function certificadosDoBackup(backup, atual, agora) {
  const atuais = atual?.certificados || [];
  const lixeiraAtual = atual?.arquivosParaApagar || [];
  if (!Array.isArray(backup?.certificados)) {
    return { certificados: atuais, tagsCertificados: atual?.tagsCertificados || [], arquivosParaApagar: lixeiraAtual };
  }
  const usados = new Set(backup.certificados.map((c) => c?.arquivo?.caminho));
  const lixeira = atuais.reduce(
    (acc, c) => porNaLixeira(acc, c.arquivo?.caminho, agora),
    sanitizarLixeira([...lixeiraAtual, ...sanitizarLixeira(backup.arquivosParaApagar)]),
  );
  return {
    certificados: backup.certificados,
    tagsCertificados: backup.tagsCertificados || [],
    arquivosParaApagar: lixeira.filter((e) => !usados.has(e.caminho)),
  };
}

/* ---------- erros do Storage ---------- */

export function mensagemErroArquivo(codigo) {
  switch (codigo) {
    case "storage/unauthenticated":
    case "storage/unauthorized":
      return (
        "O Storage recusou o arquivo. Confira se você está na sua conta e se as regras foram publicadas " +
        "(firebase deploy --only storage)."
      );
    case "storage/quota-exceeded":
      return "O espaço de arquivos da sua conta do Firebase acabou.";
    case "storage/retry-limit-exceeded":
    case "storage/bucket-not-found":
    case "storage/project-not-found":
      return "Não consegui falar com o Storage. Confira a internet e se o Storage está ativado no console do Firebase.";
    default:
      return "Não foi possível enviar o arquivo. Tente de novo.";
  }
}
