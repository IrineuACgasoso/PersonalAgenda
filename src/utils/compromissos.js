// src/utils/compromissos.js
//
// Compromissos pontuais (Fase 5): evento com data e hora marcadas.
// Modelo: { id, nome, cor, data "YYYY-MM-DD", inicio "HH:MM", fim? "HH:MM",
// feito, concluidoEm? }. Funções PURAS para a aba e o formulário.

import { DIAS } from "../constants.js";
import { parseISO } from "./afazeres.js";
import { diasEntre } from "./cadeiras.js";

const ehISO = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const ehHora = (v) => typeof v === "string" && /^\d{2}:\d{2}$/.test(v);

// Validação do formulário: devolve a mensagem do primeiro problema ou null.
export function erroDoCompromisso({ nome, data, inicio, fim }) {
  if (!String(nome || "").trim()) return "Dê um nome para o compromisso.";
  if (!ehISO(data)) return "Escolha a data do compromisso.";
  if (!ehHora(inicio)) return "Informe a hora de início.";
  if (fim && !ehHora(fim)) return "A hora de fim é inválida.";
  if (fim && fim <= inicio) return "O fim precisa ser depois do início.";
  return null;
}

const porDataEHora = (a, b) =>
  (a.data || "").localeCompare(b.data || "") || (a.inicio || "").localeCompare(b.inicio || "");

/**
 * Seções da aba: hoje e próximos (do mais cedo ao mais tarde) e passados
 * (o mais recente primeiro). Concluídos continuam na seção da data deles.
 */
export function secoesDosCompromissos(compromissos, hojeISO) {
  const hoje = [];
  const proximos = [];
  const passados = [];
  (compromissos || []).forEach((c) => {
    if (c.data === hojeISO) hoje.push(c);
    else if (ehISO(c.data) && c.data > hojeISO) proximos.push(c);
    else passados.push(c);
  });
  hoje.sort(porDataEHora);
  proximos.sort(porDataEHora);
  passados.sort((a, b) => porDataEHora(b, a));
  return { hoje, proximos, passados };
}

// "14:00" / "14:00–15:30"
export function textoHorarioCompromisso(c) {
  return c.fim ? `${c.inicio}–${c.fim}` : c.inicio || "";
}

// "Sex, 21/11" — dia da semana + data curta.
export function textoDataComSemana(iso) {
  if (!ehISO(iso)) return "";
  return `${DIAS[(parseISO(iso).getDay() + 6) % 7]}, ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

// "hoje" / "amanhã" / "em 3d" / "ontem" / "há 5d"
export function rotuloRelativo(dataISO, hojeISO) {
  const dias = diasEntre(hojeISO, dataISO);
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias === -1) return "ontem";
  return dias > 0 ? `em ${dias}d` : `há ${-dias}d`;
}
