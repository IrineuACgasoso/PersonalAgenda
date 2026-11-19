// src/utils/lembretes.js
//
// Lembretes programados (#23) — lógica PURA, sem nenhum import.
//
// Este arquivo é usado em DOIS lugares:
//   1. no app (sanitizarDados, textos dos seletores e do modal);
//   2. na Cloud Function agendada (functions/index.js), que roda a cada
//      minuto no servidor, calcula quais lembretes "venceram" e manda o push.
// A função só enxerga o que está em functions/, então existe uma CÓPIA em
// functions/compartilhado/lembretes.js (`npm run funcoes:sincronizar`, que o
// predeploy também roda). integridade.test.js garante que as duas são iguais.
// Por isso: nada de import aqui, nem de outros utils do app.
//
// Modelo de dados (campos opcionais, sem migração — só valor padrão):
//   lembretes                       { compromissos: number[], avaliacoes: number[] }  ← padrões globais
//   compromissos[].lembretes?       number[]  ← sobrescreve o padrão ([] = sem lembrete)
//   cadeiras[].datas[].lembretes?   number[]  ← idem, por avaliação
// Cada número = antecedência em MINUTOS antes do início (0 = na hora).
// Ausente (undefined) = usa o padrão global.

// Recife não tem horário de verão desde 2019: UTC-3 fixo. A função roda em
// UTC, então converte "YYYY-MM-DD" + "HH:MM" locais com este fuso.
export const FUSO_RECIFE_MIN = -180;

// Avaliação sem hora: o lembrete conta a partir das 08:00 do dia
// (ex.: "1 dia antes" = 08:00 da véspera).
export const HORA_AVALIACAO_SEM_HORA = "08:00";

export const LEMBRETES_PADRAO = { compromissos: [15], avaliacoes: [1440] };

const MAX_ANTECEDENCIA_MIN = 30 * 1440; // 30 dias
const MAX_LEMBRETES_POR_ITEM = 5;

// Opções oferecidas na UI (cada contexto mostra as que fazem sentido).
export const OPCOES_LEMBRETE = {
  compromissos: [0, 5, 15, 30, 60, 120, 1440],
  avaliacoes: [60, 180, 720, 1440, 2880, 10080],
};

// Janela que a função olha para trás a cada execução. Como roda a cada
// minuto, 10 min cobrem atrasos/falhas pontuais do agendador; a deduplicação
// (`enviados`) impede mandar o mesmo lembrete duas vezes.
export const JANELA_MS = 10 * 60 * 1000;
// Por quanto tempo a função lembra o que já mandou.
export const RETENCAO_ENVIADOS_MS = 3 * 24 * 60 * 60 * 1000;

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/* ------------------------------ sanitização ------------------------------ */

// Lista de antecedências de UM item. Não-lista ⇒ undefined (= usa o padrão).
// Inteiros entre 0 e 30 dias, sem repetição, ordenados, no máx. 5.
export function sanitizarListaLembretes(valor) {
  if (!Array.isArray(valor)) return undefined;
  const validos = valor
    .map((v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v))
    .filter((v) => Number.isInteger(v) && v >= 0 && v <= MAX_ANTECEDENCIA_MIN);
  return [...new Set(validos)].sort((a, b) => a - b).slice(0, MAX_LEMBRETES_POR_ITEM);
}

// Padrões globais: sempre um objeto completo (campo ausente ⇒ padrão).
export function sanitizarPreferenciasLembretes(valor) {
  const v = valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {};
  return {
    compromissos: sanitizarListaLembretes(v.compromissos) ?? [...LEMBRETES_PADRAO.compromissos],
    avaliacoes: sanitizarListaLembretes(v.avaliacoes) ?? [...LEMBRETES_PADRAO.avaliacoes],
  };
}

/* --------------------------------- textos -------------------------------- */

export function textoAntecedencia(min) {
  if (min === 0) return "na hora";
  if (min % 10080 === 0) return min === 10080 ? "1 semana antes" : `${min / 10080} semanas antes`;
  if (min % 1440 === 0) return min === 1440 ? "1 dia antes" : `${min / 1440} dias antes`;
  if (min % 60 === 0) return `${min / 60} h antes`;
  return `${min} min antes`;
}

// Rótulo curto dos chips ("15 min", "1 dia", "Na hora").
export function rotuloAntecedencia(min) {
  return min === 0 ? "Na hora" : textoAntecedencia(min).replace(/ antes$/, "");
}

export function textoListaLembretes(lista) {
  if (!lista || lista.length === 0) return "sem lembrete";
  return lista.map(textoAntecedencia).join(", ");
}

/* --------------------------------- tempo --------------------------------- */

// "YYYY-MM-DD" + "HH:MM" no fuso dado → milissegundos (epoch UTC).
export function instanteLocal(dataISO, hora, fusoMin = FUSO_RECIFE_MIN) {
  if (!DATA_ISO.test(dataISO || "") || !HORA.test(hora || "")) return null;
  const [a, m, d] = dataISO.split("-").map(Number);
  const [h, min] = hora.split(":").map(Number);
  return Date.UTC(a, m - 1, d, h, min) - fusoMin * 60000;
}

// Data e hora locais (no fuso dado) de um instante: { dataISO, hora, diaSemana 0=Seg..6=Dom }.
export function partesLocais(ms, fusoMin = FUSO_RECIFE_MIN) {
  const d = new Date(ms + fusoMin * 60000);
  const p = (n) => String(n).padStart(2, "0");
  return {
    dataISO: `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`,
    hora: `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`,
    diaSemana: (d.getUTCDay() + 6) % 7,
  };
}

function diasEntreISO(deISO, ateISO) {
  const [a1, m1, d1] = deISO.split("-").map(Number);
  const [a2, m2, d2] = ateISO.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
}

/* ------------------------------- projeção -------------------------------- */

// MESMO formato de chaveAvaliacao em utils/projecao.js (testado): é assim
// que "removida da agenda"/"concluída" fica gravado em eventosExcluidos/
// eventosConcluidos.
export function chaveAvaliacaoLembrete(cadeira, avaliacao) {
  const idAval = avaliacao.id || `@${avaliacao.data}|${avaliacao.hora || ""}|${avaliacao.titulo}`;
  return `avaliacoes|${cadeira.id}|${idAval}`;
}

// Mesma regra de cadeiraEstaAtivaNaData (utils/calendario.js): avaliação
// fora da vigência da cadeira não aparece no calendário ⇒ não lembra.
function dentroDaVigencia(cadeira, dataISO) {
  const ini = DATA_ISO.test(cadeira.dataInicio || "") ? cadeira.dataInicio : null;
  const fim = DATA_ISO.test(cadeira.dataFim || "") ? cadeira.dataFim : null;
  return (!ini || dataISO >= ini) && (!fim || dataISO <= fim);
}

// Todos os lembretes cujo disparo cai em (desdeMs, ateMs].
// Cada um: { chave, tipo, id, titulo, origem?, dataISO, hora, fim?, antecedencia, eventoMs, disparoMs }.
// `chave` inclui data/hora do evento: remarcar o compromisso gera lembretes novos.
export function listarLembretes(dados, { desdeMs, ateMs, fusoMin = FUSO_RECIFE_MIN }) {
  if (!dados || typeof dados !== "object") return [];
  const prefs = sanitizarPreferenciasLembretes(dados.lembretes);
  const ocultas = new Set([
    ...(Array.isArray(dados.eventosExcluidos) ? dados.eventosExcluidos : []),
    ...(Array.isArray(dados.eventosConcluidos) ? dados.eventosConcluidos : []),
  ]);
  const saida = [];

  const adicionar = (base, antecedencias) => {
    const eventoMs = instanteLocal(base.dataISO, base.hora, fusoMin);
    if (eventoMs === null) return;
    antecedencias.forEach((antecedencia) => {
      const disparoMs = eventoMs - antecedencia * 60000;
      if (disparoMs <= desdeMs || disparoMs > ateMs) return;
      saida.push({
        ...base,
        chave: `${base.tipo}|${base.id}|${base.dataISO}T${base.hora}|${antecedencia}`,
        antecedencia,
        eventoMs,
        disparoMs,
      });
    });
  };

  (Array.isArray(dados.compromissos) ? dados.compromissos : []).forEach((c) => {
    if (!c || typeof c !== "object" || c.feito) return;
    adicionar(
      { tipo: "compromisso", id: c.id, titulo: c.nome || "Compromisso", dataISO: c.data, hora: c.inicio, fim: c.fim },
      sanitizarListaLembretes(c.lembretes) ?? prefs.compromissos,
    );
  });

  (Array.isArray(dados.cadeiras) ? dados.cadeiras : []).forEach((cad) => {
    if (!cad || typeof cad !== "object") return;
    (Array.isArray(cad.datas) ? cad.datas : []).forEach((d) => {
      if (!d || typeof d !== "object" || !DATA_ISO.test(d.data || "")) return;
      if (!dentroDaVigencia(cad, d.data)) return;
      if (ocultas.has(chaveAvaliacaoLembrete(cad, d))) return;
      adicionar(
        {
          tipo: "avaliacao",
          id: `${cad.id}|${d.id}`,
          titulo: d.titulo || "Avaliação",
          origem: cad.nome,
          dataISO: d.data,
          hora: HORA.test(d.hora || "") ? d.hora : HORA_AVALIACAO_SEM_HORA,
          semHora: !HORA.test(d.hora || ""),
        },
        sanitizarListaLembretes(d.lembretes) ?? prefs.avaliacoes,
      );
    });
  });

  return saida.sort((a, b) => a.disparoMs - b.disparoMs);
}

/* ------------------------------ notificação ------------------------------ */

const DIAS_CURTOS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

// "hoje", "amanhã", "sex, 27/11" (relativo ao dia local de `agoraMs`).
function textoDia(dataISO, agoraMs, fusoMin) {
  const hoje = partesLocais(agoraMs, fusoMin).dataISO;
  const dif = diasEntreISO(hoje, dataISO);
  if (dif === 0) return "hoje";
  if (dif === 1) return "amanhã";
  const [, m, d] = dataISO.split("-");
  const diaSemana = partesLocais(instanteLocal(dataISO, "12:00", fusoMin), fusoMin).diaSemana;
  return `${DIAS_CURTOS[diaSemana].toLowerCase()}, ${d}/${m}`;
}

// Quanto falta de verdade no envio, em minutos/horas ("em 15 min",
// "em 2 h 30 min"). null quando já começou ou falta 1 dia ou mais (aí o
// texto do dia já diz tudo).
function faltaCurta(eventoMs, agoraMs) {
  const min = Math.round((eventoMs - agoraMs) / 60000);
  if (min <= 0 || min >= 24 * 60) return null;
  if (min < 60) return `em ${min} min`;
  const h = Math.floor(min / 60);
  const resto = min % 60;
  return resto ? `em ${h} h ${resto} min` : `em ${h} h`;
}

// { titulo, corpo, tag } do push. `tag` = chave do lembrete (o aparelho
// substitui em vez de empilhar se chegar repetido).
//   compromisso: "Começa em 15 min · hoje, 14:10–15:00" · "Amanhã, 09:00" ·
//                "Sex, 27/11, 09:00 (em 9 dias)" · "Começando agora · 14:10"
//   avaliação:   "Amanhã às 14:00" · "Hoje às 14:00 (em 4 h)" · "Qua, 25/11 (em 7 dias)"
export function montarNotificacao(l, agoraMs, fusoMin = FUSO_RECIFE_MIN) {
  const dia = textoDia(l.dataISO, agoraMs, fusoMin);
  const dias = diasEntreISO(partesLocais(agoraMs, fusoMin).dataISO, l.dataISO);
  const emDias = dias >= 2 ? ` (em ${dias} dias)` : "";
  const curta = faltaCurta(l.eventoMs, agoraMs);
  const comecou = l.eventoMs <= agoraMs;

  if (l.tipo === "compromisso") {
    const horario = l.fim ? `${l.hora}–${l.fim}` : l.hora;
    let corpo;
    if (comecou) corpo = `Começando agora · ${horario}`;
    else if (curta) corpo = `Começa ${curta} · ${dia}, ${horario}`;
    else corpo = `${capitalizar(dia)}, ${horario}${emDias}`;
    return { titulo: `★ ${l.titulo}`, corpo, tag: l.chave };
  }

  const titulo = l.origem ? `${l.titulo} — ${l.origem}` : l.titulo;
  let corpo = l.semHora ? capitalizar(dia) : `${capitalizar(dia)} às ${l.hora}`;
  if (!l.semHora && curta && !comecou) corpo += ` (${curta})`;
  else corpo += emDias;
  return { titulo: `📚 ${titulo}`, corpo, tag: l.chave };
}

function capitalizar(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/* ---------------------------- deduplicação ------------------------------- */

// `enviados` = { chave: disparoMs }. Descarta o que é mais velho que a
// retenção (o lembrete já não cai mais na janela de nenhum jeito).
export function podarEnviados(enviados, agoraMs) {
  const saida = {};
  Object.entries(enviados && typeof enviados === "object" ? enviados : {}).forEach(([chave, ms]) => {
    if (typeof ms === "number" && agoraMs - ms <= RETENCAO_ENVIADOS_MS) saida[chave] = ms;
  });
  return saida;
}

// O que mandar agora: na janela e ainda não enviado.
export function lembretesPendentes(dados, enviados, agoraMs, fusoMin = FUSO_RECIFE_MIN) {
  const ja = enviados && typeof enviados === "object" ? enviados : {};
  return listarLembretes(dados, { desdeMs: agoraMs - JANELA_MS, ateMs: agoraMs, fusoMin }).filter(
    (l) => !(l.chave in ja),
  );
}
