// src/hooks/useEventosCalendario.js
//
// Só memoiza a projeção do mês visível. Toda a lógica (o que aparece em
// cada dia, chaves, ordenação) vive em utils/projecao.js, que é pura e
// coberta por tests/.
import { useMemo } from "react";
import { toISO } from "../utils/afazeres.js";
import { getIntervaloMes } from "../utils/calendario.js";
import {
  projetarAvaliacoes,
  projetarAulas,
  projetarCompromissos,
  projetarAfazeres,
  projetarAfazeresSemData,
  agruparPorDia,
} from "../utils/projecao.js";

export function useEventosCalendario({
  cadeiras = [],
  compromissos = [],
  afazeres = [],
  periodos = [],
  ano,
  mes,
  filtros,
  eventosExcluidos = [],
}) {
  const { inicioISO, fimISO } = useMemo(() => getIntervaloMes(ano, mes), [ano, mes]);

  const avaliacoes = useMemo(
    () => (filtros.avaliacoes ? projetarAvaliacoes(cadeiras, periodos, inicioISO, fimISO) : []),
    [cadeiras, periodos, filtros.avaliacoes, inicioISO, fimISO],
  );

  const aulas = useMemo(
    () => (filtros.aulas ? projetarAulas(cadeiras, periodos, inicioISO, fimISO) : []),
    [cadeiras, periodos, filtros.aulas, inicioISO, fimISO],
  );

  const eventosCompromissos = useMemo(
    () => (filtros.compromissos ? projetarCompromissos(compromissos, inicioISO, fimISO) : []),
    [compromissos, filtros.compromissos, inicioISO, fimISO],
  );

  const eventosAfazeres = useMemo(
    () => (filtros.afazeres ? projetarAfazeres(afazeres, inicioISO, fimISO) : []),
    [afazeres, filtros.afazeres, inicioISO, fimISO],
  );

  const eventosAfazeresSemData = useMemo(
    () => (filtros.afazeres ? projetarAfazeresSemData(afazeres, inicioISO, fimISO, toISO(new Date())) : []),
    [afazeres, filtros.afazeres, inicioISO, fimISO],
  );

  return useMemo(
    () =>
      agruparPorDia(
        [...aulas, ...avaliacoes, ...eventosCompromissos, ...eventosAfazeres, ...eventosAfazeresSemData],
        eventosExcluidos,
      ),
    [aulas, avaliacoes, eventosCompromissos, eventosAfazeres, eventosAfazeresSemData, eventosExcluidos],
  );
}
