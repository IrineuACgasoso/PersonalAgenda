// src/hooks/useFiltrosCalendario.js
import { useState } from "react";

const FILTROS_KEY = "painel-academico-filtros-calendario";
const FILTROS_PADRAO = { aulas: true, avaliacoes: true, rotinas: true, compromissos: true, afazeres: true };

function lerFiltrosIniciais() {
  try {
    const raw = localStorage.getItem(FILTROS_KEY);
    // O merge garante que filtros novos (ex.: "rotinas", Fase 5) nasçam
    // ligados para quem já tinha filtros salvos. "rotinas" herda o valor do
    // antigo "compromissos", que até a v5 controlava os semanais.
    if (!raw) return { ...FILTROS_PADRAO };
    const salvos = JSON.parse(raw);
    const herdado = "rotinas" in salvos || !("compromissos" in salvos) ? {} : { rotinas: salvos.compromissos };
    return { ...FILTROS_PADRAO, ...herdado, ...salvos };
  } catch {
    return { ...FILTROS_PADRAO };
  }
}

export function useFiltrosCalendario() {
  const [filtros, setFiltros] = useState(lerFiltrosIniciais);

  const alternarFiltro = (chave) => {
    setFiltros((prev) => {
      const proximo = { ...prev, [chave]: !prev[chave] };
      try {
        localStorage.setItem(FILTROS_KEY, JSON.stringify(proximo));
      } catch {
        /* ignora erros de storage */
      }
      return proximo;
    });
  };

  return { filtros, alternarFiltro };
}
