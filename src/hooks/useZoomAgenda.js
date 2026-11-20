// src/hooks/useZoomAgenda.js
// Zoom da Agenda da semana (#24): pinça com dois dedos, Ctrl+roda (inclui a
// pinça do touchpad no desktop) e botões. O ponto sob os dedos/cursor fica
// parado enquanto a grade cresce. O zoom fica salvo no aparelho (preferência
// de exibição, não é dado do app → não passa pelo persist()).
//
// Os listeners são nativos e não passivos: o React registra touchmove/wheel
// como passivos, e aí o preventDefault não impediria o zoom da página inteira.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ZOOM_AGENDA_KEY } from "../constants.js";
import { deslocamentoParaFoco, limitarZoom, zoomDaPinca, zoomNoPasso } from "../utils/zoomAgenda.js";

function lerZoomSalvo() {
  try {
    return limitarZoom(localStorage.getItem(ZOOM_AGENDA_KEY));
  } catch {
    return 1;
  }
}

// Quem rola na vertical: a própria grade (celular, com altura máxima) ou o
// .main (overflow-y: auto) — nunca a janela.
function ancestralRolavelY(el) {
  for (let p = el; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    if ((overflowY === "auto" || overflowY === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return document.scrollingElement;
}

export default function useZoomAgenda() {
  // Callback ref: a grade só existe quando há horários; os listeners se
  // ligam quando ela aparece.
  const [area, definirArea] = useState(null);
  const [zoom, setZoom] = useState(lerZoomSalvo);
  const zoomRef = useRef(zoom);
  const focoRef = useRef(null); // { x, y, antigo } a compensar depois do render

  // Muda o zoom guardando o ponto (coordenadas da tela) que deve ficar parado.
  const aplicarRef = useRef(null);
  aplicarRef.current = (novo, telaX, telaY) => {
    const antigo = zoomRef.current;
    novo = limitarZoom(novo);
    if (novo === antigo) return;
    if (area && telaX != null) {
      const r = area.getBoundingClientRect();
      focoRef.current = { x: area.scrollLeft + (telaX - r.left), y: telaY - r.top, antigo };
    } else {
      focoRef.current = null;
    }
    zoomRef.current = novo;
    setZoom(novo);
  };

  // Depois do render com a grade já no tamanho novo: rola para manter o foco.
  useLayoutEffect(() => {
    const foco = focoRef.current;
    focoRef.current = null;
    if (area && foco) {
      area.scrollLeft += deslocamentoParaFoco(foco.x, foco.antigo, zoom);
      ancestralRolavelY(area)?.scrollBy(0, deslocamentoParaFoco(foco.y, foco.antigo, zoom));
    }
    try {
      localStorage.setItem(ZOOM_AGENDA_KEY, String(zoom));
    } catch {
      /* ignora erros de storage */
    }
  }, [zoom, area]);

  useEffect(() => {
    if (!area) return undefined;
    let pinca = null; // { distancia, zoom }
    const distancia = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    const aoTocar = (e) => {
      if (e.touches.length === 2) pinca = { distancia: distancia(e.touches), zoom: zoomRef.current };
    };
    const aoMover = (e) => {
      if (e.touches.length !== 2 || !pinca) return;
      e.preventDefault(); // nem zoom da página nem rolagem durante a pinça
      const [a, b] = e.touches;
      aplicarRef.current(
        zoomDaPinca(pinca.zoom, pinca.distancia, distancia(e.touches)),
        (a.clientX + b.clientX) / 2,
        (a.clientY + b.clientY) / 2,
      );
    };
    const aoSoltar = (e) => {
      if (e.touches.length < 2) pinca = null;
    };
    const aoRolar = (e) => {
      if (!e.ctrlKey) return; // roda normal continua rolando
      e.preventDefault();
      aplicarRef.current(zoomRef.current * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
    };

    area.addEventListener("touchstart", aoTocar, { passive: true });
    area.addEventListener("touchmove", aoMover, { passive: false });
    area.addEventListener("touchend", aoSoltar);
    area.addEventListener("touchcancel", aoSoltar);
    area.addEventListener("wheel", aoRolar, { passive: false });
    return () => {
      area.removeEventListener("touchstart", aoTocar);
      area.removeEventListener("touchmove", aoMover);
      area.removeEventListener("touchend", aoSoltar);
      area.removeEventListener("touchcancel", aoSoltar);
      area.removeEventListener("wheel", aoRolar);
    };
  }, [area]);

  return {
    definirArea,
    zoom,
    aumentar: () => aplicarRef.current(zoomNoPasso(zoomRef.current, 1)),
    diminuir: () => aplicarRef.current(zoomNoPasso(zoomRef.current, -1)),
    redefinir: () => aplicarRef.current(1),
  };
}
