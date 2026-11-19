// src/utils/projecao.js
//
// Projeção PURA dos eventos do calendário (sem React): recebe os dados e um
// intervalo [inicioISO, fimISO] e devolve a lista de eventos. O hook
// useEventosCalendario só memoiza chamadas a estas funções — separar assim
// permite testar a lógica do calendário em tests/ sem montar componentes.

import { DIAS_FULL } from "../constants.js";
import { toISO, parseISO, ocorrenciasNoIntervalo } from "./afazeres.js";
import { cadeiraEstaAtivaNaData, vigenciaDaCadeira, estaAtivoNaData, corVisivel } from "./calendario.js";

// Cores quase pretas são clareadas só na exibição (corVisivel, #55).
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
// Rotinas (ex-"compromissos" semanais, migração v5).
export const chaveRotina = (dataISO, rotina, horario) => `rotinas|${dataISO}|${rotina.id}|${idDoHorario(horario)}`;
// Compromisso pontual (v5): acontece uma vez, a chave é só o id. A conclusão
// fica no próprio item (`feito`), não em eventosConcluidos.
export const chaveCompromisso = (compromisso) => `compromissos|${compromisso.id}`;
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

// 1. Avaliações (datas importantes das cadeiras, dentro da vigência — #19)
export function projetarAvaliacoes(cadeiras, inicioISO, fimISO) {
  return cadeiras.flatMap((c) =>
    (c.datas || [])
      .filter((d) => d.data >= inicioISO && d.data <= fimISO)
      .filter((d) => cadeiraEstaAtivaNaData(c, d.data))
      .map((d) => ({
        tipo: "avaliacoes",
        data: d.data,
        hora: d.hora,
        titulo: d.titulo,
        cor: corVisivel(c.cor),
        origem: c.nome,
        chave: chaveAvaliacao(c, d),
      })),
  );
}

// 2. Aulas recorrentes (horários semanais das cadeiras, dentro da vigência — #19)
export function projetarAulas(cadeiras, inicioISO, fimISO) {
  const lista = [];
  paraCadaDia(inicioISO, fimISO, (dataISO, diaSemana) => {
    cadeiras.forEach((c) => {
      if (!cadeiraEstaAtivaNaData(c, dataISO)) return;
      (c.horarios || [])
        .filter((h) => h.dia === diaSemana)
        .forEach((h) => {
          lista.push({
            tipo: "aulas",
            data: dataISO,
            hora: h.inicio,
            titulo: c.nome,
            cor: corVisivel(c.cor),
            origem: h.local || DIAS_FULL[diaSemana],
            chave: chaveAula(dataISO, c, h),
          });
        });
    });
  });
  return lista;
}

// 2b. Marcos de vigência (#19): início e fim de cada cadeira com datas
// próprias. NÃO são eventos (não se concluem nem se excluem, não viram
// ponto no calendário): o calendário desenha um marcador na célula e uma
// linha no topo da lista do dia. Devolve { "YYYY-MM-DD": marco[] }, com
// marco = { tipo: "inicio" | "fim", idCadeira, nome, cor }.
export function projetarMarcosVigencia(cadeiras, inicioISO, fimISO) {
  const mapa = {};
  const adicionar = (data, marco) => {
    if (!data || data < inicioISO || data > fimISO) return;
    (mapa[data] ||= []).push(marco);
  };
  cadeiras.forEach((c) => {
    const { inicio, fim } = vigenciaDaCadeira(c);
    const base = { idCadeira: c.id, nome: c.nome, cor: corVisivel(c.cor) };
    adicionar(inicio, { ...base, tipo: "inicio" });
    adicionar(fim, { ...base, tipo: "fim" });
  });
  return mapa;
}

// 3. Rotinas (horários semanais). Vigência própria opcional (#56, v6):
// fora de dataInicio/dataFim a rotina não aparece; sem datas, vale sempre.
export function projetarRotinas(rotinas, inicioISO, fimISO) {
  const lista = [];
  paraCadaDia(inicioISO, fimISO, (dataISO, diaSemana) => {
    rotinas.forEach((r) => {
      if (!estaAtivoNaData(r, dataISO)) return;
      (r.horarios || [])
        .filter((h) => h.dia === diaSemana)
        .forEach((h) => {
          lista.push({
            tipo: "rotinas",
            data: dataISO,
            hora: h.inicio,
            titulo: r.nome,
            cor: corVisivel(r.cor),
            origem: h.local || `Rotina · até ${h.fim}`,
            chave: chaveRotina(dataISO, r, h),
          });
        });
    });
  });
  return lista;
}

// 3b. Compromissos pontuais (v5): um evento na data, com início e fim opcional.
export function projetarCompromissos(compromissos, inicioISO, fimISO) {
  return compromissos
    .filter((c) => c.data && c.data >= inicioISO && c.data <= fimISO)
    .map((c) => ({
      tipo: "compromissos",
      data: c.data,
      hora: c.inicio || "",
      fim: c.fim || "",
      titulo: c.nome,
      cor: corVisivel(c.cor || COR_PADRAO_AFAZER_CALENDARIO),
      origem: c.fim ? `Compromisso · até ${c.fim}` : "Compromisso",
      feito: !!c.feito,
      id: c.id,
      chave: chaveCompromisso(c),
    }));
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
        titulo: a.nome,
        cor: corVisivel(a.cor || COR_PADRAO_AFAZER_CALENDARIO),
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
        titulo: a.nome,
        cor: corVisivel(a.cor || COR_PADRAO_AFAZER_CALENDARIO),
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

// Marcadores no canto da célula do calendário (Fase 5): ★ compromisso,
// livro = avaliação (data importante de cadeira), bandeiras = início/fim de
// vigência. Um marcador por TIPO (vários do mesmo tipo = 1 ícone com
// `quantidade`), na cor do primeiro item do dia, nesta ordem de importância.
export const ORDEM_MARCADORES = ["compromisso", "avaliacao", "inicio", "fim"];

export function marcadoresDoDia(eventos = [], marcos = []) {
  const grupos = {};
  const adicionar = (tipo, cor, titulo) => {
    const g = (grupos[tipo] ||= { tipo, cor, quantidade: 0, titulos: [] });
    g.quantidade += 1;
    g.titulos.push(titulo);
  };
  eventos.forEach((ev) => {
    if (ev.tipo === "compromissos") adicionar("compromisso", ev.cor, ev.titulo);
    else if (ev.tipo === "avaliacoes") adicionar("avaliacao", ev.cor, ev.titulo);
  });
  marcos.forEach((m) => adicionar(m.tipo, m.cor, m.nome));
  return ORDEM_MARCADORES.filter((t) => grupos[t]).map((t) => grupos[t]);
}

// Cabem `max` ícones na célula. Passou disso, mostra os max-1 mais
// importantes + "+N" (N = tipos escondidos), para o "+" caber no lugar do último.
export function resumirMarcadores(marcadores, max = 3) {
  if (marcadores.length <= max) return { visiveis: marcadores, ocultos: 0 };
  return { visiveis: marcadores.slice(0, max - 1), ocultos: marcadores.length - (max - 1) };
}

// Atalho que monta o mapa completo de uma janela — usado nos testes e útil
// para futuras telas (ex: "Hoje"). `filtros` ausente = tudo ligado.
export const FILTROS_TODOS = { aulas: true, avaliacoes: true, rotinas: true, compromissos: true, afazeres: true };

export function projetarEventos({
  cadeiras = [],
  rotinas = [],
  compromissos = [],
  afazeres = [],
  eventosExcluidos = [],
  inicioISO,
  fimISO,
  hojeISO = toISO(new Date()),
  filtros = FILTROS_TODOS,
}) {
  const eventos = [
    ...(filtros.aulas ? projetarAulas(cadeiras, inicioISO, fimISO) : []),
    ...(filtros.avaliacoes ? projetarAvaliacoes(cadeiras, inicioISO, fimISO) : []),
    ...(filtros.rotinas ? projetarRotinas(rotinas, inicioISO, fimISO) : []),
    ...(filtros.compromissos ? projetarCompromissos(compromissos, inicioISO, fimISO) : []),
    ...(filtros.afazeres ? projetarAfazeres(afazeres, inicioISO, fimISO) : []),
    ...(filtros.afazeres ? projetarAfazeresSemData(afazeres, inicioISO, fimISO, hojeISO) : []),
  ];
  return agruparPorDia(eventos, eventosExcluidos);
}
