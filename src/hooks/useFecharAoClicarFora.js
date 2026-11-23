// src/hooks/useFecharAoClicarFora.js
// Fecha um popover (seletor de data, menu "+") ao tocar/clicar fora dele ou
// apertar Esc. Só escuta enquanto está aberto.
//
// `noClique`: para listas que abrem EMPURRANDO o conteúdo (SeletorTags).
// Fechar já no pointerdown encolhe a tela com o dedo ainda apertado, e o
// clique cai fora do botão que o usuário mirou (o "Salvar" não salvava). Na
// captura porque o modal interrompe a propagação do clique.
import { useEffect } from "react";

export default function useFecharAoClicarFora(ref, aberto, fechar, { noClique = false } = {}) {
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
    const evento = noClique ? "click" : "pointerdown";
    document.addEventListener(evento, aoTocar, noClique);
    // Captura (#51): o Esc fecha só o popover, antes de chegar ao drawer
    // em volta (que fecharia junto no onKeyDown do React).
    document.addEventListener("keydown", aoTeclar, true);
    return () => {
      document.removeEventListener(evento, aoTocar, noClique);
      document.removeEventListener("keydown", aoTeclar, true);
    };
  }, [ref, aberto, fechar, noClique]);
}
