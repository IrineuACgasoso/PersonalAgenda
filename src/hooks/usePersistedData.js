import { useState, useEffect, useRef, useCallback } from "react";
import { STORAGE_KEY } from "../constants.js";
import { dadosVazios } from "../utils/data.js";

/**
 * Carrega e salva o estado do app no localStorage do navegador,
 * com debounce para não escrever a cada tecla digitada.
 */
export default function usePersistedData() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | saved | saving | error
  const saveTimeout = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setData(raw ? JSON.parse(raw) : dadosVazios());
    } catch {
      setData(dadosVazios());
    }
    setStatus("saved");
  }, []);

  const persist = useCallback((next) => {
    setData(next);
    setStatus("saving");
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, 300);
  }, []);

  return { data, persist, status };
}