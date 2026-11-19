// src/hooks/useFecharAoClicarFora.js
// Fecha um popover (seletor de data, menu "+") ao tocar/clicar fora dele ou
// apertar Esc. Só escuta enquanto está aberto.
import { useEffect } from "react";

export default function useFecharAoClicarFora(ref, aberto, fechar) {
  useEffect(() => {
    if (!aberto) return undefined;
    const aoTocar = (e) => {
      if (ref.current && !ref.current.contains(e.target)) fechar();
    };
    const aoTeclar = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        fechar();
      }
    };
    document.addEventListener("pointerdown", aoTocar);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("pointerdown", aoTocar);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [ref, aberto, fechar]);
}
