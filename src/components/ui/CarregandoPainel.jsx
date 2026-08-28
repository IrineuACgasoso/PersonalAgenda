// src/components/ui/CarregandoPainel.jsx
import React from "react";

/**
 * Tela de "boot" exibida enquanto os dados do app ainda não carregaram
 * (ver App.jsx, enquanto `data` é null). É só CSS/SVG: o capacete fica
 * parado no centro e partículas de "dados" orbitam ao redor dele em
 * anéis, como um HUD de sci-fi. Nada de vídeo — leve e cacheia junto
 * com o resto do app no PWA.
 */
export default function CarregandoPainel({ texto = "Carregando seu painel..." }) {
  return (
    <div className="loading-wrap">
      <div className="painel-carregando">
        <div className="fluxo-dados">
          {/* anéis orbitais tracejados, girando em velocidades/sentidos diferentes */}
          <svg className="fluxo-anel fluxo-anel-1" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="94" />
          </svg>
          <svg className="fluxo-anel fluxo-anel-2" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="78" />
          </svg>
          <svg className="fluxo-anel fluxo-anel-3" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="62" />
          </svg>

          {/* partículas de dados viajando pelas órbitas */}
          <span className="fluxo-particula fluxo-p1" />
          <span className="fluxo-particula fluxo-p2" />
          <span className="fluxo-particula fluxo-p3" />
          <span className="fluxo-particula fluxo-p4" />
          <span className="fluxo-particula fluxo-p5" />
          <span className="fluxo-particula fluxo-p6" />

          <img
            className="fluxo-capacete"
            src="/capacete-carregando.png"
            alt=""
            draggable="false"
          />
        </div>
        <span className="painel-carregando-texto">{texto}</span>
      </div>
    </div>
  );
}