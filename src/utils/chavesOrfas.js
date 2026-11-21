// src/utils/chavesOrfas.js
// #52: eventosConcluidos/eventosExcluidos guardavam para sempre as chaves de
// itens já apagados (cadeira, rotina, compromisso, afazer). O documento único
// do Firestore tem limite de 1 MB e cada backup copia tudo. Ao excluir um
// item, o App passa o estado novo por aqui e guarda as chaves removidas para
// o "Desfazer" devolver. Funções puras.
//
// Formatos (#10, ver projecao.js):
//   aulas|ISO|idCadeira|idHorario      avaliacoes|idCadeira|idAvaliacao
//   rotinas|ISO|idRotina|idHorario     compromissos|idCompromisso
//   afazeres|idAfazer|ISO              afazeres-semdata|idAfazer
// Conservador: só sai a chave cujo formato é conhecido E cujo item dono não
// existe mais. Formato desconhecido fica (melhor sobrar do que perder um check).
// Horário/avaliação apagados de dentro de uma cadeira continuam com as chaves:
// o "Desfazer" deles não devolveria as chaves se outra exclusão as limpasse.

const CAMPOS = ["eventosConcluidos", "eventosExcluidos"];

/** { lista, id } do item dono da chave, ou null (formato desconhecido). */
export function donoDaChave(chave) {
  if (typeof chave !== "string") return null;
  const p = chave.split("|");
  switch (p[0]) {
    case "aulas":
      return p.length >= 4 && p[2] ? { lista: "cadeiras", id: p[2] } : null;
    case "rotinas":
      return p.length >= 4 && p[2] ? { lista: "rotinas", id: p[2] } : null;
    case "avaliacoes":
      return p.length >= 3 && p[1] ? { lista: "cadeiras", id: p[1] } : null;
    case "compromissos":
      // Até a v4 havia "compromissos|ISO|id|horario" (semanais, viraram
      // rotinas na v5 com a migração das chaves). Só o formato atual conta.
      return p.length === 2 && p[1] ? { lista: "compromissos", id: p[1] } : null;
    case "afazeres":
      return p.length === 3 && p[1] ? { lista: "afazeres", id: p[1] } : null;
    case "afazeres-semdata":
      return p.length === 2 && p[1] ? { lista: "afazeres", id: p[1] } : null;
    default:
      return null;
  }
}

/**
 * Tira as chaves órfãs. Devolve { dados, removidas } — `removidas` tem as
 * chaves que saíram de cada campo (vazio ⇒ `dados` é o mesmo objeto).
 */
export function limparChavesOrfas(dados) {
  const existentes = {};
  for (const lista of ["cadeiras", "rotinas", "compromissos", "afazeres"]) {
    existentes[lista] = new Set((Array.isArray(dados?.[lista]) ? dados[lista] : []).map((x) => x?.id));
  }
  const ehOrfa = (chave) => {
    const dono = donoDaChave(chave);
    return dono !== null && !existentes[dono.lista].has(dono.id);
  };

  const removidas = {};
  const patch = {};
  for (const campo of CAMPOS) {
    const atual = Array.isArray(dados?.[campo]) ? dados[campo] : [];
    const saem = atual.filter(ehOrfa);
    if (saem.length === 0) continue;
    removidas[campo] = saem;
    patch[campo] = atual.filter((c) => !ehOrfa(c));
  }
  if (Object.keys(patch).length === 0) return { dados, removidas: {} };
  return { dados: { ...dados, ...patch }, removidas };
}

/** "Desfazer": devolve as chaves removidas (sem duplicar). */
export function devolverChaves(dados, removidas) {
  if (!removidas || Object.keys(removidas).length === 0) return dados;
  const patch = {};
  for (const campo of CAMPOS) {
    const voltam = removidas[campo];
    if (!voltam?.length) continue;
    const atual = Array.isArray(dados[campo]) ? dados[campo] : [];
    const presentes = new Set(atual);
    patch[campo] = [...atual, ...voltam.filter((c) => !presentes.has(c))];
  }
  return { ...dados, ...patch };
}
