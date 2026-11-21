// src/hooks/useCaixaModal.js
// Comportamento comum de caixas modais (#17 diálogos, #51 drawers): Esc
// fecha, Tab fica preso dentro da caixa e, ao fechar, o foco volta para quem
// o tinha antes. Devolve o onKeyDown a ligar na própria caixa.
//
// focoInicial:
//   "primeiro" → [data-autofoco] ou o primeiro focável (diálogos);
//   "caixa"    → a própria caixa (tabIndex -1). Usado nos drawers: focar o
//                campo do nome abriria o teclado do celular a cada abertura.
//
// Popovers dentro da caixa (seletor de data, menu "+") tratam o Esc na fase
// de captura (useFecharAoClicarFora), então o Esc fecha só o popover.
import { useEffect, useRef } from "react";

const SELETOR_FOCAVEL =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export default function useCaixaModal(caixaRef, onFechar, { focoInicial = "primeiro" } = {}) {
  const onFecharRef = useRef(onFechar);
  useEffect(() => {
    onFecharRef.current = onFechar;
  });

  useEffect(() => {
    const anterior = document.activeElement;
    const caixa = caixaRef.current;
    const alvo =
      focoInicial === "caixa"
        ? caixa
        : caixa?.querySelector("[data-autofoco]") || caixa?.querySelector(SELETOR_FOCAVEL);
    alvo?.focus({ preventScroll: true });
    return () => {
      if (anterior && typeof anterior.focus === "function") anterior.focus({ preventScroll: true });
    };
    // Só ao abrir/fechar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onFecharRef.current?.();
      return;
    }
    if (e.key !== "Tab") return;
    const focaveis = [...(caixaRef.current?.querySelectorAll(SELETOR_FOCAVEL) || [])].filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
    if (focaveis.length === 0) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    const atual = document.activeElement;
    if (e.shiftKey && (atual === primeiro || atual === caixaRef.current)) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && atual === ultimo) {
      e.preventDefault();
      primeiro.focus();
    }
  };
}
