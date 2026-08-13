// src/hooks/useFiltrosCalendario.js
import { useState } from "react";

const FILTROS_KEY = "painel-academico-filtros-calendario";

function lerFiltrosIniciais() {
  try {
    const raw = localStorage.getItem(FILTROS_KEY);
    return raw ? JSON.parse(raw) : { aulas: true, avaliacoes: true, afazeres: true };
  } catch {
    return { aulas: true, avaliacoes: true, afazeres: true };
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