// src/hooks/useFiltrosCalendario.js
import { useState } from "react";

const FILTROS_KEY = "painel-academico-filtros-calendario";
const FILTROS_PADRAO = { aulas: true, avaliacoes: true, afazeres: true, compromissos: true };

function lerFiltrosIniciais() {
  try {
    const raw = localStorage.getItem(FILTROS_KEY);
    // O merge garante que usuários com filtros salvos antes da adição de
    // "compromissos" continuem vendo esse filtro ativado por padrão.
    return raw ? { ...FILTROS_PADRAO, ...JSON.parse(raw) } : { ...FILTROS_PADRAO };
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