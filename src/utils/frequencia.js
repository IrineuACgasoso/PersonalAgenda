// src/utils/frequencia.js
// Controle de faltas por cadeira (#34). PURO.
//
// Regra combinada com o usuário: concluir a aula (check) = presença — vale
// também para aula cancelada, APS, aula sem chamada ("todo mundo ganhou
// presença"). O ✗ ao lado da lixeira registra FALTA, e a aula também conta
// como concluída. Aula não marcada não conta nada.
//
// Onde fica: a chave da aula (`aulas|ISO|idCadeira|idHorario`, a mesma de
// `eventosConcluidos`) vai para `cadeira.faltas[]`. Ficar dentro da cadeira
// faz a falta sumir/voltar junto com ela (excluir/desfazer) sem chave órfã.
// Uma chave nunca está nas duas listas ao mesmo tempo.
//
// Limite: 25% da carga horária, contado em HORAS (duração de cada aula).
import { cadeiraEstaAtivaNaData, vigenciaDaCadeira } from "./calendario.js";
import { parseISO } from "./afazeres.js";

export const LIMITE_FALTAS = 0.25;

// "aulas|2026-11-18|cad1|h1" → { data, idCadeira, idHorario } (null se não for aula).
export function partesDaChaveAula(chave) {
  const partes = String(chave || "").split("|");
  if (partes[0] !== "aulas" || partes.length < 4) return null;
  const [, data, idCadeira, ...resto] = partes;
  return { data, idCadeira, idHorario: resto.join("|") };
}

const minutos = (hhmm) => {
  const [h, m] = String(hhmm || "")
    .split(":")
    .map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN;
};

export function horasDoHorario(h) {
  const dur = minutos(h?.fim) - minutos(h?.inicio);
  return Number.isFinite(dur) && dur > 0 ? dur / 60 : 0;
}

// Mesmo critério de `idDoHorario` (projecao.js): id, ou "@inicio" nos antigos.
const idDoHorario = (h) => h.id || `@${h.inicio || ""}`;

export function ehFalta(cadeiras = [], chave) {
  return cadeiras.some((c) => Array.isArray(c.faltas) && c.faltas.includes(chave));
}

// ✗: registra a falta (e tira um eventual check de presença). Atômico: um
// `.map()` por id na cadeira dona da chave.
export function marcarFalta(dados, chave) {
  const partes = partesDaChaveAula(chave);
  if (!partes) return dados;
  const cadeira = dados.cadeiras.find((c) => c.id === partes.idCadeira);
  if (!cadeira || (cadeira.faltas || []).includes(chave)) return dados;
  return {
    ...dados,
    cadeiras: dados.cadeiras.map((c) =>
      c.id === partes.idCadeira ? { ...c, faltas: [...(c.faltas || []), chave] } : c,
    ),
    eventosConcluidos: (dados.eventosConcluidos || []).filter((k) => k !== chave),
  };
}

// Check da lista do dia. Aula com falta: desmarcar = tirar a falta (volta a
// "não marcada"). Qualquer outro evento: alterna em `eventosConcluidos`.
export function alternarConclusaoEvento(dados, chave) {
  if (ehFalta(dados.cadeiras, chave)) {
    return {
      ...dados,
      cadeiras: dados.cadeiras.map((c) =>
        (c.faltas || []).includes(chave) ? { ...c, faltas: c.faltas.filter((k) => k !== chave) } : c,
      ),
    };
  }
  const concluidos = dados.eventosConcluidos || [];
  return {
    ...dados,
    eventosConcluidos: concluidos.includes(chave) ? concluidos.filter((k) => k !== chave) : [...concluidos, chave],
  };
}

// Carga horária estimada pelos horários × dias da vigência (sem vigência
// completa não dá para estimar ⇒ null). Arredonda para hora cheia.
export function cargaHorariaEstimada(cadeira) {
  const { inicio, fim } = vigenciaDaCadeira(cadeira);
  if (!inicio || !fim || fim < inicio) return null;
  const horasPorDia = Array(7).fill(0);
  (cadeira.horarios || []).forEach((h) => {
    if (h && Number.isInteger(h.dia)) horasPorDia[h.dia] += horasDoHorario(h);
  });
  let total = 0;
  const ultimo = parseISO(fim);
  for (let d = parseISO(inicio); d <= ultimo; d.setDate(d.getDate() + 1)) {
    total += horasPorDia[(d.getDay() + 6) % 7];
  }
  return total > 0 ? Math.round(total) : null;
}

// Resumo para o card/drawer. `nivel`: ok (< 50% do limite) · atencao (≥ 50%)
// · perigo (≥ 75%) · estourou (> 100%). Sem carga horária: nivel null, só a contagem.
export function resumoFaltas(cadeira, eventosExcluidos = []) {
  const excluidas = new Set(eventosExcluidos);
  const porId = new Map((cadeira.horarios || []).filter(Boolean).map((h) => [idDoHorario(h), h]));
  let quantidade = 0;
  let horas = 0;
  (cadeira.faltas || []).forEach((chave) => {
    const p = partesDaChaveAula(chave);
    const h = p && porId.get(p.idHorario);
    // Horário apagado, aula removida do dia ou fora da vigência: não conta.
    if (!h || excluidas.has(chave) || !cadeiraEstaAtivaNaData(cadeira, p.data)) return;
    quantidade += 1;
    horas += horasDoHorario(h);
  });

  const informada = Number(cadeira.cargaHoraria) > 0 ? Number(cadeira.cargaHoraria) : null;
  const carga = informada ?? cargaHorariaEstimada(cadeira);
  const limiteHoras = carga ? carga * LIMITE_FALTAS : null;
  const proporcao = limiteHoras ? horas / limiteHoras : null;
  let nivel = null;
  if (proporcao !== null) {
    if (proporcao > 1) nivel = "estourou";
    else if (proporcao >= 0.75) nivel = "perigo";
    else if (proporcao >= 0.5) nivel = "atencao";
    else nivel = "ok";
  }
  return { quantidade, horas, carga, cargaEstimada: !informada && !!carga, limiteHoras, proporcao, nivel };
}

const numero = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

// "6h de 15h" · "2 faltas (4h)" sem carga horária.
export function textoFaltas(r) {
  if (r.limiteHoras === null) {
    return r.quantidade === 0
      ? "Nenhuma falta"
      : `${r.quantidade} falta${r.quantidade > 1 ? "s" : ""} (${numero(r.horas)}h)`;
  }
  return `${numero(r.horas)}h de ${numero(r.limiteHoras)}h`;
}

// Toast depois do ✗: quanto ainda pode faltar.
export function textoDepoisDaFalta(nome, r) {
  if (r.limiteHoras === null) return `Falta em ${nome} · ${textoFaltas(r)}`;
  if (r.nivel === "estourou") return `Falta em ${nome} · ${textoFaltas(r)}: passou do limite de faltas!`;
  const sobra = r.limiteHoras - r.horas;
  return `Falta em ${nome} · ${textoFaltas(r)} (pode faltar mais ${numero(sobra)}h)`;
}

// Tela da cadeira (aba Geral): quantas AULAS ainda dá para faltar, pela
// duração média das aulas da semana (o limite é em horas). null sem limite
// conhecido ou sem horários; 0 quando já passou.
export function aulasQueAindaPodeFaltar(cadeira, r) {
  if (!r || r.limiteHoras === null) return null;
  const duracoes = (cadeira?.horarios || []).map(horasDoHorario).filter((h) => h > 0);
  if (duracoes.length === 0) return null;
  const media = duracoes.reduce((s, h) => s + h, 0) / duracoes.length;
  return Math.max(0, Math.floor((r.limiteHoras - r.horas) / media + 1e-9));
}
