// src/utils/curriculoIdiomas.js
//
// PURO. Textos fixos do currículo em cada língua (#59). O que a pessoa escreve
// é traduzido por ela (campo `en` de cada item, ver curriculo.js); aqui só o
// que o app escreve sozinho: meses, "Atual", títulos e níveis de idioma.

export const IDIOMAS = [
  { id: "pt", rotulo: "Português" },
  { id: "en", rotulo: "Inglês" },
];

export const TEXTOS = {
  pt: {
    meses: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
    atual: "Atual",
    previsao: "previsão",
    resumo: "Resumo",
    tecnologias: "Tecnologias:",
    documento: "Currículo",
    arquivo: "Curriculo",
    lang: "pt-BR",
  },
  en: {
    meses: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    atual: "Present",
    previsao: "expected",
    resumo: "Summary",
    tecnologias: "Technologies:",
    documento: "Resume",
    arquivo: "Resume",
    lang: "en-US",
  },
};

const NIVEIS_EN = {
  Básico: "Basic",
  Intermediário: "Intermediate",
  Avançado: "Advanced",
  Fluente: "Fluent",
  Nativo: "Native",
};

export const NIVEIS_IDIOMA = Object.keys(NIVEIS_EN);

// Os mais comuns; fora da lista a pessoa traduz.
const LINGUAS_EN = {
  português: "Portuguese",
  inglês: "English",
  espanhol: "Spanish",
  francês: "French",
  alemão: "German",
  italiano: "Italian",
  japonês: "Japanese",
  chinês: "Chinese",
  mandarim: "Mandarin",
  coreano: "Korean",
  russo: "Russian",
  libras: "Brazilian Sign Language (Libras)",
};

const proprio = (mapa, chave) => (Object.hasOwn(mapa, chave) ? mapa[chave] : "");

/** Tradução automática, ou "" quando não há. */
export const nivelEmIngles = (nivel) => proprio(NIVEIS_EN, nivel.trim());
export const linguaEmIngles = (lingua) => proprio(LINGUAS_EN, lingua.trim().toLowerCase());
