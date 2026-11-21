// src/utils/conflitos.js
// Conflito de horário (#32) entre aulas (horários das cadeiras) e rotinas.
// Só AVISA: nada aqui impede salvar — às vezes o choque é proposital (ex.:
// academia no horário de uma aula que você não vai assistir).
import { DIAS } from "../constants.js";
import { vigenciaDe } from "./calendario.js";

const minutos = (hhmm) => {
  const [h, m] = String(hhmm || "")
    .split(":")
    .map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN;
};

// Mesmo dia da semana e intervalos que se cruzam. Encostar (um termina às
// 10:00 e o outro começa às 10:00) NÃO é conflito.
export function horariosSeSobrepoem(a, b) {
  if (!a || !b || a.dia !== b.dia) return false;
  const [ia, fa, ib, fb] = [minutos(a.inicio), minutos(a.fim), minutos(b.inicio), minutos(b.fim)];
  if ([ia, fa, ib, fb].some(Number.isNaN)) return false;
  return ia < fb && ib < fa;
}

// As vigências (dataInicio/dataFim opcionais; vazio = sem limite) têm algum
// dia em comum? Uma rotina que acabou em agosto não conflita com a cadeira
// que começa em setembro.
export function vigenciasSeCruzam(x, y) {
  const a = vigenciaDe(x);
  const b = vigenciaDe(y);
  if (a.fim && b.inicio && a.fim < b.inicio) return false;
  if (b.fim && a.inicio && b.fim < a.inicio) return false;
  return true;
}

// Todos os donos de horário semanal numa lista só.
// `cadeiras` = as do período ativo (as de períodos antigos sem vigência
// "valeriam para sempre" e acusariam conflitos que não existem mais).
export function fontesDeHorarios(cadeiras = [], rotinas = []) {
  const fonte = (tipo) => (item) => ({
    tipo,
    id: item.id,
    nome: item.nome,
    cor: item.cor,
    dataInicio: item.dataInicio || "",
    dataFim: item.dataFim || "",
    horarios: Array.isArray(item.horarios) ? item.horarios.filter(Boolean) : [],
  });
  return [...cadeiras.filter(Boolean).map(fonte("cadeira")), ...rotinas.filter(Boolean).map(fonte("rotina"))];
}

// Com quem `horario` (do dono { tipo, id }) choca? Serve também para o
// rascunho do formulário (horário ainda sem id). O próprio horário é ignorado;
// outro horário do MESMO dono que se sobrepõe conta (cadastro duplicado).
// Devolve [{ tipo, id, nome, cor, horario, mesmoDono }].
export function conflitosDoHorario(horario, dono, fontes = []) {
  const donoFonte = fontes.find((f) => f.tipo === dono?.tipo && f.id === dono?.id) || {};
  const achados = [];
  for (const f of fontes) {
    const mesmoDono = f.tipo === dono?.tipo && f.id === dono?.id;
    if (!mesmoDono && !vigenciasSeCruzam(donoFonte, f)) continue;
    for (const h of f.horarios) {
      if (mesmoDono && horario?.id && h.id === horario.id) continue;
      if (horariosSeSobrepoem(horario, h)) {
        achados.push({ tipo: f.tipo, id: f.id, nome: f.nome, cor: f.cor, horario: h, mesmoDono });
      }
    }
  }
  return achados;
}

// "Cálculo 1 (Seg 08:00–10:00)" · "esta cadeira (…)" para o mesmo dono.
export function textoConflito(c, rotuloMesmoDono = "outro horário daqui") {
  const nome = c.mesmoDono ? rotuloMesmoDono : c.nome || "(sem nome)";
  return `${nome} (${DIAS[c.horario.dia] ?? "?"} ${c.horario.inicio}–${c.horario.fim})`;
}

export function avisoDeConflitos(conflitos, rotuloMesmoDono) {
  if (!conflitos?.length) return "";
  return `Choca com ${conflitos.map((c) => textoConflito(c, rotuloMesmoDono)).join(", ")}`;
}

// Agenda da semana: blocos do MESMO dia que se sobrepõem ficam lado a lado
// em vez de um por cima do outro. Agrupa em "cachos" (blocos ligados por
// sobreposição) e, dentro de cada cacho, põe cada bloco na 1ª coluna livre.
// Devolve Map(bloco → { coluna, colunas, conflito }).
export function distribuirEmColunas(blocos = []) {
  const ordenados = [...blocos].sort(
    (a, b) => minutos(a.inicio) - minutos(b.inicio) || minutos(b.fim) - minutos(a.fim),
  );
  const resultado = new Map();
  let cacho = [];
  let fimDoCacho = -Infinity;
  let fimDasColunas = [];

  const fecharCacho = () => {
    const colunas = fimDasColunas.length;
    cacho.forEach((b) => {
      const pos = resultado.get(b);
      resultado.set(b, { ...pos, colunas, conflito: colunas > 1 });
    });
    cacho = [];
    fimDasColunas = [];
    fimDoCacho = -Infinity;
  };

  for (const b of ordenados) {
    const ini = minutos(b.inicio);
    const fim = minutos(b.fim);
    if (ini >= fimDoCacho) fecharCacho();
    let coluna = fimDasColunas.findIndex((f) => f <= ini);
    if (coluna === -1) coluna = fimDasColunas.length;
    fimDasColunas[coluna] = fim;
    fimDoCacho = Math.max(fimDoCacho, fim);
    cacho.push(b);
    resultado.set(b, { coluna });
  }
  fecharCacho();
  return resultado;
}
