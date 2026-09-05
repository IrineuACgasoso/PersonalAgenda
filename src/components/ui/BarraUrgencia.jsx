import React from "react";
import { URGENCIA_CORES, URGENCIA_LABELS } from "../../constants.js";

export default function BarraUrgencia({ nivel }) {
  const cor = URGENCIA_CORES[nivel] || URGENCIA_CORES[1];
  return (
    <div className="urgencia-bateria" title={`Urgência: ${URGENCIA_LABELS[nivel]}`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className="urgencia-segmento"
          style={{
            background: i <= nivel ? cor : "transparent",
            borderColor: cor,
          }}
        />
      ))}
    </div>
  );
}