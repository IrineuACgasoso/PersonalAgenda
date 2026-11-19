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
  projetarRotinas,
  projetarCompromissos,
  projetarAfazeres,
  projetarAfazeresSemData,
  projetarMarcosVigencia,
  agruparPorDia,
} from "../utils/projecao.js";

export function useEventosCalendario({
  cadeiras = [],
  rotinas = [],
  compromissos = [],
  afazeres = [],
  ano,
  mes,
  filtros,
  eventosExcluidos = [],
}) {
  const { inicioISO, fimISO } = useMemo(() => getIntervaloMes(ano, mes), [ano, mes]);

  const avaliacoes = useMemo(
    () => (filtros.avaliacoes ? projetarAvaliacoes(cadeiras, inicioISO, fimISO) : []),
    [cadeiras, filtros.avaliacoes, inicioISO, fimISO],
  );

  const aulas = useMemo(
    () => (filtros.aulas ? projetarAulas(cadeiras, inicioISO, fimISO) : []),
    [cadeiras, filtros.aulas, inicioISO, fimISO],
  );

  const eventosRotinas = useMemo(
    () => (filtros.rotinas ? projetarRotinas(rotinas, inicioISO, fimISO) : []),
    [rotinas, filtros.rotinas, inicioISO, fimISO],
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

  // Marcos de início/fim das cadeiras (#19): seguem o filtro de aulas.
  const marcosVigencia = useMemo(
    () => (filtros.aulas ? projetarMarcosVigencia(cadeiras, inicioISO, fimISO) : {}),
    [cadeiras, filtros.aulas, inicioISO, fimISO],
  );

  const eventosPorDia = useMemo(
    () =>
      agruparPorDia(
        [
          ...aulas,
          ...avaliacoes,
          ...eventosRotinas,
          ...eventosCompromissos,
          ...eventosAfazeres,
          ...eventosAfazeresSemData,
        ],
        eventosExcluidos,
      ),
    [aulas, avaliacoes, eventosRotinas, eventosCompromissos, eventosAfazeres, eventosAfazeresSemData, eventosExcluidos],
  );

  return { eventosPorDia, marcosVigencia };
}
