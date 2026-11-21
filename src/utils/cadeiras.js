// src/utils/cadeiras.js
//
// Resumo de uma cadeira para o card e o cabeçalho do drawer (#21): próxima
// aula, próxima avaliação e progresso da vigência. Tudo PURO (recebe "agora"
// e "hoje" de fora) para ser testável; os componentes só formatam.

import { DIAS } from "../constants.js";
import { toISO, parseISO } from "./afazeres.js";
import { cadeiraEstaAtivaNaData, vigenciaDaCadeira } from "./calendario.js";
import { chaveAula } from "./projecao.js";

const MS_DIA = 24 * 60 * 60 * 1000;

// Dias inteiros entre duas datas "YYYY-MM-DD" (b - a). Pelo meio-dia, para
// não errar na virada do horário de verão (Recife não tem, mas o teste roda
// em qualquer fuso).
export function diasEntre(aISO, bISO) {
  const a = parseISO(aISO);
  const b = parseISO(bISO);
  a.setHours(12, 0, 0, 0);
  b.setHours(12, 0, 0, 0);
  return Math.round((b - a) / MS_DIA);
}

const horaDe = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/**
 * Próximo horário de uma lista de horários SEMANAIS ({ dia, inicio, fim })
 * a partir de `agora` (Date). Serve para aulas (#21) e rotinas (Fase 5).
 * - `inicio`/`fim` ("YYYY-MM-DD", opcionais): janela em que os horários valem.
 * - `excluida(dataISO, horario)`: ocorrência removida da agenda (pula).
 * Um horário em andamento (início ≤ agora < fim) conta, com `emAndamento`.
 * Procura por 8 semanas: cobre semanas inteiras removidas (feriado, greve).
 * Devolve { data, horario, emAndamento } ou null.
 */
export function proximoHorarioSemanal(horariosBrutos, agora = new Date(), { inicio = "", fim = "", excluida } = {}) {
  const horarios = (horariosBrutos || []).filter((h) => h && h.inicio);
  if (horarios.length === 0) return null;
  const hojeISO = toISO(agora);
  const horaAgora = horaDe(agora);
  const partida = parseISO(inicio && inicio > hojeISO ? inicio : hojeISO);
  for (let i = 0; i < 7 * 8; i++) {
    const dia = new Date(partida);
    dia.setDate(partida.getDate() + i);
    const dataISO = toISO(dia);
    if (fim && dataISO > fim) return null;
    const diaSemana = (dia.getDay() + 6) % 7;
    const doDia = horarios
      .filter((h) => h.dia === diaSemana)
      .filter((h) => !excluida?.(dataISO, h))
      // Hoje: só os que ainda não terminaram.
      .filter((h) => dataISO !== hojeISO || (h.fim || h.inicio) > horaAgora)
      .sort((a, b) => a.inicio.localeCompare(b.inicio));
    if (doDia.length > 0) {
      const horario = doDia[0];
      return { data: dataISO, horario, emAndamento: dataISO === hojeISO && horario.inicio <= horaAgora };
    }
  }
  return null;
}

/**
 * Próxima aula a partir de `agora` (Date), dentro da vigência e pulando as
 * ocorrências removidas da agenda (`eventosExcluidos`). Uma aula em
 * andamento (início ≤ agora < fim) conta, com `emAndamento: true`.
 * Devolve { data, horario, emAndamento } ou null (sem horários, ou a
 * vigência já acabou).
 */
export function proximaAula(cadeira, agora = new Date(), eventosExcluidos = []) {
  const excluidos = new Set(eventosExcluidos);
  const { inicio, fim } = vigenciaDaCadeira(cadeira);
  return proximoHorarioSemanal(cadeira?.horarios, agora, {
    inicio,
    fim,
    excluida: (dataISO, h) => excluidos.has(chaveAula(dataISO, cadeira, h)),
  });
}

// Avaliação a até 7 dias fica em destaque no resumo.
export const DIAS_DESTAQUE_AVALIACAO = 7;

/**
 * Avaliações (datas importantes) de hoje em diante, dentro da vigência,
 * da mais próxima para a mais distante. Cada item: { avaliacao, dias,
 * destaque } (dias = 0 hoje, 1 amanhã…; destaque = até 7 dias).
 */
export function proximasAvaliacoes(cadeira, hojeISO) {
  return (cadeira?.datas || [])
    .filter((d) => d && d.data && d.data >= hojeISO && cadeiraEstaAtivaNaData(cadeira, d.data))
    .sort((a, b) => a.data.localeCompare(b.data) || (a.hora || "").localeCompare(b.hora || ""))
    .map((avaliacao) => {
      const dias = diasEntre(hojeISO, avaliacao.data);
      return { avaliacao, dias, destaque: dias <= DIAS_DESTAQUE_AVALIACAO };
    });
}

/**
 * Lista "Datas importantes" da Agenda (#46). Antes era uma lista só em ordem
 * crescente, então no fim do semestre as próximas provas ficavam embaixo de
 * todas as que já passaram. Agora:
 * - `proximas`: de hoje em diante, da mais próxima para a mais distante;
 * - `anteriores`: as que já passaram, da mais recente para a mais antiga.
 * Hoje conta como próxima (mesmo que a hora já tenha passado), como no card.
 * Cada item: avaliação + { cadeiraId, cadeiraNome, cor } (cor crua da cadeira).
 */
export function datasImportantes(cadeiras, hojeISO) {
  const momento = (d) => `${d.data}T${d.hora || "00:00"}`;
  const todas = (cadeiras || []).flatMap((c) =>
    (c?.datas || [])
      .filter((d) => d && d.data)
      .map((d) => ({ ...d, cadeiraId: c.id, cadeiraNome: c.nome, cor: c.cor })),
  );
  const proximas = todas.filter((d) => d.data >= hojeISO).sort((a, b) => momento(a).localeCompare(momento(b)));
  const anteriores = todas.filter((d) => d.data < hojeISO).sort((a, b) => momento(b).localeCompare(momento(a)));
  return { proximas, anteriores };
}

/**
 * Quanto da vigência já passou (0 a 1). Só existe com início E fim.
 * Antes do início = 0; depois do fim = 1.
 */
export function progressoVigencia(cadeira, hojeISO) {
  const { inicio, fim } = vigenciaDaCadeira(cadeira);
  if (!inicio || !fim || fim < inicio) return null;
  const total = diasEntre(inicio, fim);
  if (total <= 0) return hojeISO >= inicio ? 1 : 0;
  return Math.min(1, Math.max(0, diasEntre(inicio, hojeISO) / total));
}

// "hoje" / "amanhã" / "em 8d" — rótulo curto de quanto falta.
export function rotuloDias(dias) {
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  return `em ${dias}d`;
}

// Texto da próxima aula: "agora", "hoje 10:00", "amanhã 08:00", "Qua 10:00"
// (até 6 dias) ou "12/12 10:00" (mais longe), + " · local".
export function textoProximaAula(prox, hojeISO) {
  if (!prox) return "";
  const { data, horario, emAndamento } = prox;
  const dias = diasEntre(hojeISO, data);
  let quando;
  if (emAndamento) quando = `agora (até ${horario.fim})`;
  else if (dias === 0) quando = `hoje ${horario.inicio}`;
  else if (dias === 1) quando = `amanhã ${horario.inicio}`;
  else if (dias < 7) quando = `${DIAS[(parseISO(data).getDay() + 6) % 7]} ${horario.inicio}`;
  else quando = `${data.slice(8, 10)}/${data.slice(5, 7)} ${horario.inicio}`;
  return horario.local ? `${quando} · ${horario.local}` : quando;
}

// Quando é a avaliação: "26/11 · em 8d" / "18/11 · hoje".
export function textoQuandoAvaliacao({ avaliacao, dias }) {
  return `${avaliacao.data.slice(8, 10)}/${avaliacao.data.slice(5, 7)} · ${rotuloDias(dias)}`;
}

/**
 * #53: excluir o ÚNICO período deixava a lista vazia e o sanitizarDados
 * recriava em silêncio um "2026.1" (id "p1"). Agora a exclusão é bloqueada
 * com este aviso (null = pode excluir). Arquivar períodos é o #38.
 */
export function motivoParaNaoExcluirPeriodo(periodos, id) {
  const lista = Array.isArray(periodos) ? periodos : [];
  if (!lista.some((p) => p?.id === id)) return null; // já não existe: nada a bloquear
  if (lista.length <= 1) return "Este é o único período. Crie outro antes de excluir este.";
  return null;
}
