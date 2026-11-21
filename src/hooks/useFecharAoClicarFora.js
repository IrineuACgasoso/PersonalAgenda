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
    // Captura (#51): o Esc fecha só o popover, antes de chegar ao drawer
    // em volta (que fecharia junto no onKeyDown do React).
    document.addEventListener("keydown", aoTeclar, true);
    return () => {
      document.removeEventListener("pointerdown", aoTocar);
      document.removeEventListener("keydown", aoTeclar, true);
    };
  }, [ref, aberto, fechar]);
}
