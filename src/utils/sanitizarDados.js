// src/utils/sanitizarDados.js
//
// Fonte única de verdade para sanitização de dados persistidos.
// Antes existiam DUAS versões desta função (uma aqui, sem uso em nenhum
// lugar do app, e outra duplicada dentro de usePersistedData.js). Isso é
// perigoso: qualquer novo código que importasse "a errada" perderia a
// proteção contra dados ausentes/corrompidos. Agora só existe esta.

export const DADOS_PADRAO = {
  periodos: [{ id: "p1", nome: "2026.1" }],
  cadeiras: [],
  compromissos: [],
  afazeres: [],
  eventosConcluidos: [],
  periodoAtivoId: "p1",
};

export function sanitizarDados(raw) {
  if (!raw || typeof raw !== "object") return { ...DADOS_PADRAO };

  return {
    ...DADOS_PADRAO,
    ...raw,
    periodos:
      Array.isArray(raw.periodos) && raw.periodos.length > 0
        ? raw.periodos
        : DADOS_PADRAO.periodos,
    cadeiras: Array.isArray(raw.cadeiras) ? raw.cadeiras : [],
    compromissos: Array.isArray(raw.compromissos) ? raw.compromissos : [],
    eventosConcluidos: Array.isArray(raw.eventosConcluidos) ? raw.eventosConcluidos : [],
    afazeres: Array.isArray(raw.afazeres)
      ? raw.afazeres.map((a) => ({
          ...a,
          feito: !!a.feito,
          datasConcluidas: Array.isArray(a.datasConcluidas) ? a.datasConcluidas : [],
          rotina: {
            tipo: a.rotina?.tipo || "nenhuma",
            intervaloDias: a.rotina?.intervaloDias || 1,
            totalRepeticoes: a.rotina?.totalRepeticoes || "",
          },
        }))
      : [],
  };
}

// Considera os dados "vazios/insignificantes" (equivalentes ao estado
// padrão de um app novo). Usado como trava extra: nunca sobrescrevemos um
// documento remoto que tenha conteúdo real com algo que sanitiza para isso.
export function pareceVazio(dados) {
  if (!dados) return true;
  const semCadeiras = !dados.cadeiras || dados.cadeiras.length === 0;
  const semCompromissos = !dados.compromissos || dados.compromissos.length === 0;
  const semAfazeres = !dados.afazeres || dados.afazeres.length === 0;
  const periodosPadrao =
    !dados.periodos ||
    dados.periodos.length === 0 ||
    (dados.periodos.length === 1 && dados.periodos[0]?.id === "p1");
  return semCadeiras && semCompromissos && semAfazeres && periodosPadrao;
}