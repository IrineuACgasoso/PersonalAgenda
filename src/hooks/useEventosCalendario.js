import { useMemo } from "react";
import { DIAS_FULL } from "../constants.js";
import { toISO, ocorrenciasNoIntervalo } from "../utils/afazeres.js";
import { getIntervaloMes, cadeiraEstaAtivaNaData } from "../utils/calendario.js";

export function useEventosCalendario({ cadeiras = [], compromissos = [], afazeres = [], periodos = [], ano, mes, filtros, eventosExcluidos = [] }) {
  const { primeiroDia, ultimoDia, inicioISO, fimISO } = useMemo(
    () => getIntervaloMes(ano, mes),
    [ano, mes]
  );

  // 1. Avaliações
  const avaliacoes = useMemo(() => {
    if (!filtros.avaliacoes) return [];
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
          chave: `avaliacoes|${d.data}|${d.titulo}|${d.hora || ""}`,
        }))
    );
  }, [cadeiras, periodos, filtros.avaliacoes, inicioISO, fimISO]);

  // 2. Aulas recorrentes
  const aulas = useMemo(() => {
    if (!filtros.aulas) return [];
    const lista = [];
    for (let d = new Date(primeiroDia); d <= ultimoDia; d.setDate(d.getDate() + 1)) {
      const diaSemana = (d.getDay() + 6) % 7;
      const dataISO = toISO(d);

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
              chave: `aulas|${dataISO}|${c.nome}|${h.inicio || ""}`,
            });
          });
      });
    }
    return lista;
  }, [cadeiras, periodos, filtros.aulas, primeiroDia, ultimoDia]);

  // 3. Compromissos
  const eventosCompromissos = useMemo(() => {
    if (!filtros.compromissos) return [];
    const lista = [];
    for (let d = new Date(primeiroDia); d <= ultimoDia; d.setDate(d.getDate() + 1)) {
      const diaSemana = (d.getDay() + 6) % 7;
      const dataISO = toISO(d);

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
              chave: `compromissos|${dataISO}|${c.nome}|${h.inicio || ""}`,
            });
          });
      });
    }
    return lista;
  }, [compromissos, filtros.compromissos, primeiroDia, ultimoDia]);

  // 4. Afazeres (agora com checagem pontual por data)
  const eventosAfazeres = useMemo(() => {
    if (!filtros.afazeres) return [];
    const lista = [];
    afazeres.forEach((a) => {
      const ocorrencias = ocorrenciasNoIntervalo(a, inicioISO, fimISO);
      ocorrencias.forEach((data) => {
        const ehRotina = a.rotina && a.rotina.tipo !== "nenhuma";
        const concluido = ehRotina
          ? Array.isArray(a.datasConcluidas) && a.datasConcluidas.includes(data)
          : !!a.feito;

        lista.push({
          tipo: "afazeres",
          data,
          hora: a.hora,
          titulo: a.nome,
          cor: a.cor || "#8b5cf6",
          origem: concluido ? "concluído" : "pendente",
          feito: concluido,
          datasConcluidas: a.datasConcluidas || [],
          urgencia: a.urgencia || 1,
          id: a.id,
          chave: `afazeres|${a.id}|${data}`,
          rotina: a.rotina,
        });
      });
    });
    return lista;
  }, [afazeres, filtros.afazeres, inicioISO, fimISO]);

  // 5. Afazeres SEM data alguma: como não têm validade própria, são sempre
  // projetados no dia de "hoje" (só quando hoje cai dentro do mês visível),
  // enquanto ainda estiverem pendentes.
  const eventosAfazeresSemData = useMemo(() => {
    if (!filtros.afazeres) return [];
    const hojeISO = toISO(new Date());
    if (hojeISO < inicioISO || hojeISO > fimISO) return [];

    return afazeres
      .filter((a) => !a.data && !a.feito)
      .map((a) => ({
        tipo: "afazeres",
        data: hojeISO,
        hora: a.hora,
        titulo: a.nome,
        cor: a.cor || "#8b5cf6",
        origem: "pendente",
        feito: false,
        datasConcluidas: [],
        urgencia: a.urgencia || 1,
        id: a.id,
        chave: `afazeres-semdata|${a.id}`,
        rotina: a.rotina,
        semData: true,
      }));
  }, [afazeres, filtros.afazeres, inicioISO, fimISO]);

  return useMemo(() => {
    const excluidos = new Set(eventosExcluidos);
    const todos = [...aulas, ...avaliacoes, ...eventosCompromissos, ...eventosAfazeres, ...eventosAfazeresSemData].filter(
      (ev) => !excluidos.has(ev.chave)
    );
    const mapa = {};

    todos.forEach((ev) => {
      if (!mapa[ev.data]) mapa[ev.data] = [];
      mapa[ev.data].push(ev);
    });

    // Prioridade dentro do dia: eventos com horário definido vêm primeiro
    // (ordenados pelo horário); em seguida, afazeres sem horário são
    // ordenados por urgência — e entre "irmãos" de mesma urgência, os que
    // têm uma data real (não projetados por falta de data) ficam à frente
    // dos afazeres sem data que só estão ali por padrão em "hoje".
    Object.values(mapa).forEach((lista) =>
      lista.sort((a, b) => {
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
      })
    );

    return mapa;
  }, [aulas, avaliacoes, eventosCompromissos, eventosAfazeres, eventosAfazeresSemData, eventosExcluidos]);
}