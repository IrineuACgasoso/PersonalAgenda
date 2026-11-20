// src/utils/projecao.js
//
// Projeção PURA dos eventos do calendário (sem React): recebe os dados e um
// intervalo [inicioISO, fimISO] e devolve a lista de eventos. O hook
// useEventosCalendario só memoiza chamadas a estas funções — separar assim
// permite testar a lógica do calendário em tests/ sem montar componentes.

import { DIAS_FULL } from "../constants.js";
import { toISO, parseISO, ocorrenciasNoIntervalo, secoesDosAfazeres } from "./afazeres.js";
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
        origem: concluido ? "Concluído" : "Pendente",
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
        origem: "Pendente",
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

// Prioridade dentro do dia (pedido do usuário, tela Hoje):
//   0. com horário definido — por horário, qualquer tipo (aula, prova,
//      compromisso, rotina);
//   1. sem horário e que não é afazer (ex.: avaliação sem hora: é do dia
//      todo, fica logo depois dos horários e antes dos afazeres);
//   2. afazeres DESTE dia (data marcada ou ocorrência de repetição);
//   3. afazeres sem data (só aparecem em "hoje", por padrão).
// Dentro de 2 e 3 o desempate é sempre a urgência (maior primeiro). O sort
// é estável: empates mantêm a ordem de chegada.
function grupoNoDia(ev) {
  if (ev.hora) return 0;
  if (ev.tipo !== "afazeres") return 1;
  return ev.semData ? 3 : 2;
}

export function compararEventosDoDia(a, b) {
  const ga = grupoNoDia(a);
  const gb = grupoNoDia(b);
  if (ga !== gb) return ga - gb;
  if (ga === 0) return a.hora.localeCompare(b.hora);
  if (ga >= 2) return (b.urgencia || 1) - (a.urgencia || 1);
  return 0;
}

// Ocorrência concluída? Afazer que se repete: pela data natural da
// ocorrência (#14, a mesma usada no arrasto); afazer avulso e compromisso:
// no próprio item; aula/rotina/avaliação: na lista eventosConcluidos.
export function eventoConcluido(ev, eventosConcluidos = []) {
  if (ev.tipo === "afazeres") {
    if (ev.rotina && ev.rotina.tipo !== "nenhuma") {
      return Array.isArray(ev.datasConcluidas) && ev.datasConcluidas.includes(ev.dataOriginal ?? ev.data);
    }
    return !!ev.feito;
  }
  if (ev.tipo === "compromissos") return !!ev.feito;
  return eventosConcluidos.includes(ev.chave);
}

// Identidade de um item arrastável no calendário (afazer e compromisso
// podem ter ids iguais).
export const idArrasto = (ev) => `${ev.tipo}|${ev.id}`;

// Lista do dia (tela Hoje e calendário geral): pendentes na ordem acima,
// concluídos no fim (na mesma ordem entre si).
export function ordenarEventosDoDia(eventos, eventosConcluidos = []) {
  return [...eventos].sort((a, b) => {
    const ca = eventoConcluido(a, eventosConcluidos) ? 1 : 0;
    const cb = eventoConcluido(b, eventosConcluidos) ? 1 : 0;
    return ca - cb || compararEventosDoDia(a, b);
  });
}

// Dias inteiros de aISO até bISO (pelo meio-dia: imune a horário de verão).
// Local para não importar utils/cadeiras.js, que já importa este arquivo.
function diasAte(aISO, bISO) {
  const a = parseISO(aISO);
  const b = parseISO(bISO);
  a.setHours(12, 0, 0, 0);
  b.setHours(12, 0, 0, 0);
  return Math.round((b - a) / 86400000);
}

// Distância de um dia até hoje: "Hoje", "1 d atrás", "Daqui a 11 d".
export function textoDistanciaDeHoje(dataISO, hojeISO) {
  const d = diasAte(hojeISO, dataISO);
  if (d === 0) return "Hoje";
  return d < 0 ? `${-d} d atrás` : `Daqui a ${d} d`;
}

// Linha de baixo do item na lista do dia. Afazer: "Concluído"; sem data:
// "Pendente"; com data ou repetição: a distância até hoje (o afazer está
// sempre na lista do próprio dia, então é a distância do dia escolhido).
// Os demais tipos mostram a origem (cadeira, local, "Compromisso"…).
export function subtituloEvento(ev, hojeISO, concluido) {
  if (ev.tipo !== "afazeres") return ev.origem;
  if (concluido) return "Concluído";
  if (ev.semData) return "Pendente";
  return textoDistanciaDeHoje(ev.data, hojeISO);
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

// Aviso de atrasados da tela Hoje: afazeres SEM repetição e compromissos
// com data antes de hoje e não marcados. Podem ter sido feitos e esquecidos
// de marcar, então a Hoje não os lista: só avisa e leva ao calendário geral,
// onde se marca o check ou se arrasta para outro dia. Afazer que se repete
// não entra (ocorrência perdida de rotina não é "atraso").
// Devolve [{ tipo, id, nome, data, cor }] do mais antigo para o mais novo.
export function itensAtrasados({ afazeres = [], compromissos = [] }, hojeISO) {
  const deAfazeres = secoesDosAfazeres(afazeres, hojeISO).atrasados.map(({ afazer }) => ({
    tipo: "afazeres",
    id: afazer.id,
    nome: afazer.nome,
    data: afazer.data,
    cor: corVisivel(afazer.cor || COR_PADRAO_AFAZER_CALENDARIO),
  }));
  const deCompromissos = compromissos
    .filter((c) => !c.feito && /^\d{4}-\d{2}-\d{2}$/.test(c.data || "") && c.data < hojeISO)
    .map((c) => ({
      tipo: "compromissos",
      id: c.id,
      nome: c.nome,
      data: c.data,
      cor: corVisivel(c.cor || COR_PADRAO_AFAZER_CALENDARIO),
    }));
  return [...deAfazeres, ...deCompromissos].sort((a, b) => a.data.localeCompare(b.data));
}

// "2 afazeres e 1 compromisso atrasados" (null se não há nenhum).
export function textoAtrasados(itens) {
  const af = itens.filter((i) => i.tipo === "afazeres").length;
  const co = itens.length - af;
  if (!itens.length) return null;
  const partes = [];
  if (af) partes.push(`${af} afazer${af > 1 ? "es" : ""}`);
  if (co) partes.push(`${co} compromisso${co > 1 ? "s" : ""}`);
  return `${partes.join(" e ")} atrasado${itens.length > 1 ? "s" : ""}`;
}
