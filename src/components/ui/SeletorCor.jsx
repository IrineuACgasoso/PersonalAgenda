// src/components/ui/SeletorCor.jsx
import React, { useEffect, useState } from "react";

const HEX_VALIDO = /^#([0-9a-fA-F]{6})$/;

/**
 * Seletor de cor livre: um color-picker nativo (roda de cores do sistema)
 * acoplado a um campo de texto para digitar/colar o hexadecimal direto.
 * Sempre controlado por `valor` (hex de 6 dígitos, ex: "#6366f1").
 */
export default function SeletorCor({ valor, onChange, label }) {
  const [texto, setTexto] = useState(valor || "#6366f1");

  // Mantém o campo de texto sincronizado quando o valor muda de fora
  // (ex: trocar de item selecionado para edição).
  useEffect(() => {
    setTexto(valor || "#6366f1");
  }, [valor]);

  const aplicarTexto = (v) => {
    let limpo = v.trim();
    if (limpo && !limpo.startsWith("#")) limpo = `#${limpo}`;
    setTexto(limpo);
    if (HEX_VALIDO.test(limpo)) onChange(limpo);
  };

  return (
    <div className="seletor-cor">
      {label && (
        <span className="subtle" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
          {label}
        </span>
      )}
      <div className="seletor-cor-linha">
        <input
          type="color"
          className="seletor-cor-swatch"
          value={HEX_VALIDO.test(texto) ? texto : valor || "#6366f1"}
          onChange={(e) => aplicarTexto(e.target.value)}
          title="Escolher cor"
        />
        <input
          type="text"
          className="input seletor-cor-hex"
          value={texto}
          onChange={(e) => aplicarTexto(e.target.value)}
          onBlur={() => setTexto(HEX_VALIDO.test(texto) ? texto : valor || "#6366f1")}
          placeholder="#6366f1"
          maxLength={7}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
