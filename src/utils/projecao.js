// src/utils/projecao.js
//
// Projeção PURA dos eventos do calendário (sem React): recebe os dados e um
// intervalo [inicioISO, fimISO] e devolve a lista de eventos. O hook
// useEventosCalendario só memoiza chamadas a estas funções — separar assim
// permite testar a lógica do calendário em tests/ sem montar componentes.

import { DIAS_FULL } from "../constants.js";
import { toISO, parseISO, ocorrenciasNoIntervalo } from "./afazeres.js";
import { cadeiraEstaAtivaNaData } from "./calendario.js";

const COR_PADRAO_AFAZER_CALENDARIO = "#8b5cf6";

// Chaves de evento (#10): identificam a ocorrência pelos IDS, nunca pelo
// nome/título. Antes eram "aulas|data|nomeDaCadeira|inicio": renomear a
// cadeira perdia todos os concluídos/excluídos e duas cadeiras com o mesmo
// nome compartilhavam o check. São gravadas em eventosConcluidos/
// eventosExcluidos ⇒ mudar o formato exige migração (utils/migracoes.js).
// Itens sem id (não deveria existir: tudo nasce com uid()) caem num
// substituto estável para não colidirem entre si.
const idDoHorario = (h) => h.id || `@${h.inicio || ""}`;
const idDaAvaliacao = (d) => d.id || `@${d.data}|${d.hora || ""}|${d.titulo}`;

export const chaveAula = (dataISO, cadeira, horario) => `aulas|${dataISO}|${cadeira.id}|${idDoHorario(horario)}`;
export const chaveCompromisso = (dataISO, compromisso, horario) =>
  `compromissos|${dataISO}|${compromisso.id}|${idDoHorario(horario)}`;
// Avaliação acontece uma vez só: a chave não leva a data, então mudar a data
// da prova mantém o "concluído"/"removido da agenda".
export const chaveAvaliacao = (cadeira, avaliacao) => `avaliacoes|${cadeira.id}|${idDaAvaliacao(avaliacao)}`;

// Itera dia a dia (inclusivo) chamando fn(dataISO, diaSemana 0=Seg..6=Dom).
function paraCadaDia(inicioISO, fimISO, fn) {
  const fim = parseISO(fimISO);
  for (let d = parseISO(inicioISO); d <= fim; d.setDate(d.getDate() + 1)) {
    fn(toISO(d), (d.getDay() + 6) % 7);
  }
}

// 1. Avaliações (datas importantes das cadeiras)
export function projetarAvaliacoes(cadeiras, periodos, inicioISO, fimISO) {
  return cadeiras.flatMap((c) =>
    (c.datas || [])
      .filter((d) => d.data >= inicioISO && d.data <= fimISO)
      .filter((d) => cadeiraEstaAtivaNaData(c, d.data, periodos))
      .map((d) => ({
        tipo: "avaliacoes",
        data: d.data,
        hora: d.hora,
        titulo: d.titulo,
        cor: c.cor,
        origem: c.nome,
        chave: chaveAvaliacao(c, d),
      })),
  );
}

// 2. Aulas recorrentes (horários semanais das cadeiras, dentro da vigência)
export function projetarAulas(cadeiras, periodos, inicioISO, fimISO) {
  const lista = [];
  paraCadaDia(inicioISO, fimISO, (dataISO, diaSemana) => {
    cadeiras.forEach((c) => {
      if (!cadeiraEstaAtivaNaData(c, dataISO, periodos)) return;
      (c.horarios || [])
        .filter((h) => h.dia === diaSemana)
        .forEach((h) => {
          lista.push({
            tipo: "aulas",
            data: dataISO,
            hora: h.inicio,
            titulo: c.nome,
            cor: c.cor,
            origem: h.local || DIAS_FULL[diaSemana],
            chave: chaveAula(dataISO, c, h),
          });
        });
    });
  });
  return lista;
}

// 3. Compromissos (horários semanais, sem checagem de vigência)
export function projetarCompromissos(compromissos, inicioISO, fimISO) {
  const lista = [];
  paraCadaDia(inicioISO, fimISO, (dataISO, diaSemana) => {
    compromissos.forEach((c) => {
      (c.horarios || [])
        .filter((h) => h.dia === diaSemana)
        .forEach((h) => {
          lista.push({
            tipo: "compromissos",
            data: dataISO,
            hora: h.inicio,
            titulo: c.nome,
            cor: c.cor,
            origem: h.local || DIAS_FULL[diaSemana],
            chave: chaveCompromisso(dataISO, c, h),
          });
        });
    });
  });
  return lista;
}

// 4. Afazeres com data e/ou rotina (uma entrada por ocorrência)
export function projetarAfazeres(afazeres, inicioISO, fimISO) {
  const lista = [];
  afazeres.forEach((a) => {
    const ehRotina = a.rotina && a.rotina.tipo !== "nenhuma";
    ocorrenciasNoIntervalo(a, inicioISO, fimISO).forEach(({ data, dataOriginal }) => {
      // Conclusão por ocorrência guardada pela data NATURAL (#14): assim
      // arrastar uma ocorrência concluída para outro dia mantém o check.
      const concluido = ehRotina
        ? Array.isArray(a.datasConcluidas) && a.datasConcluidas.includes(dataOriginal)
        : !!a.feito;

      lista.push({
        tipo: "afazeres",
        data,
        // data "natural" da ocorrência (antes de qualquer drag): é essa
        // que identifica a instância de forma estável para mover/excluir
        // só ela, sem afetar as outras ocorrências da rotina.
        dataOriginal,
        hora: a.hora,
        titulo: a.nome,
        cor: a.cor || COR_PADRAO_AFAZER_CALENDARIO,
        origem: concluido ? "concluído" : "pendente",
        feito: concluido,
        datasConcluidas: a.datasConcluidas || [],
        urgencia: a.urgencia || 1,
        id: a.id,
        // Também pela data natural (#14): excluir e depois mover não
        // "ressuscita" a ocorrência, e a chave não muda ao arrastar.
        chave: `afazeres|${a.id}|${dataOriginal}`,
        rotina: a.rotina,
      });
    });
  });
  return lista;
}

// 5. Afazeres SEM data alguma: como não têm validade própria, são sempre
// projetados no dia de "hoje" (só quando hoje cai dentro da janela pedida),
// enquanto ainda estiverem pendentes.
export function projetarAfazeresSemData(afazeres, inicioISO, fimISO, hojeISO) {
  if (hojeISO < inicioISO || hojeISO > fimISO) return [];
  return (
    afazeres
      // Só entra aqui quem realmente não tem regra de recorrência nenhuma.
      // Rotinas sem data-base (ex: "dias específicos" sem data inicial)
      // já geram suas próprias ocorrências em ocorrenciasNoIntervalo, então
      // não devem também cair aqui — senão apareceriam duplicados.
      .filter((a) => !a.data && !a.feito && (!a.rotina || a.rotina.tipo === "nenhuma"))
      .map((a) => ({
        tipo: "afazeres",
        data: hojeISO,
        dataOriginal: hojeISO,
        hora: a.hora,
        titulo: a.nome,
        cor: a.cor || COR_PADRAO_AFAZER_CALENDARIO,
        origem: "pendente",
        feito: false,
        datasConcluidas: [],
        urgencia: a.urgencia || 1,
        id: a.id,
        chave: `afazeres-semdata|${a.id}`,
        rotina: a.rotina,
        semData: true,
      }))
  );
}

// Prioridade dentro do dia: eventos com horário definido vêm primeiro
// (ordenados pelo horário); em seguida, afazeres sem horário são
// ordenados por urgência — e entre "irmãos" de mesma urgência, os que
// têm uma data real (não projetados por falta de data) ficam à frente
// dos afazeres sem data que só estão ali por padrão em "hoje".
export function compararEventosDoDia(a, b) {
  const aHora = a.hora || "";
  const bHora = b.hora || "";
  if (aHora && bHora) return aHora.localeCompare(bHora);
  if (!!aHora !== !!bHora) return aHora ? -1 : 1;
  if (a.tipo === "afazeres" && b.tipo === "afazeres") {
    const ua = a.urgencia || 1;
    const ub = b.urgencia || 1;
    if (ua !== ub) return ub - ua;
    if (!!a.semData !== !!b.semData) return a.semData ? 1 : -1;
  }
  return 0;
}

// Remove ocorrências excluídas e agrupa por dia: { "YYYY-MM-DD": evento[] }.
export function agruparPorDia(eventos, eventosExcluidos = []) {
  const excluidos = new Set(eventosExcluidos);
  const mapa = {};
  eventos
    .filter((ev) => !excluidos.has(ev.chave))
    .forEach((ev) => {
      if (!mapa[ev.data]) mapa[ev.data] = [];
      mapa[ev.data].push(ev);
    });
  Object.values(mapa).forEach((lista) => lista.sort(compararEventosDoDia));
  return mapa;
}

// Atalho que monta o mapa completo de uma janela — usado nos testes e útil
// para futuras telas (ex: "Hoje"). `filtros` ausente = tudo ligado.
export function projetarEventos({
  cadeiras = [],
  compromissos = [],
  afazeres = [],
  periodos = [],
  eventosExcluidos = [],
  inicioISO,
  fimISO,
  hojeISO = toISO(new Date()),
  filtros = { aulas: true, avaliacoes: true, compromissos: true, afazeres: true },
}) {
  const eventos = [
    ...(filtros.aulas ? projetarAulas(cadeiras, periodos, inicioISO, fimISO) : []),
    ...(filtros.avaliacoes ? projetarAvaliacoes(cadeiras, periodos, inicioISO, fimISO) : []),
    ...(filtros.compromissos ? projetarCompromissos(compromissos, inicioISO, fimISO) : []),
    ...(filtros.afazeres ? projetarAfazeres(afazeres, inicioISO, fimISO) : []),
    ...(filtros.afazeres ? projetarAfazeresSemData(afazeres, inicioISO, fimISO, hojeISO) : []),
  ];
  return agruparPorDia(eventos, eventosExcluidos);
}
