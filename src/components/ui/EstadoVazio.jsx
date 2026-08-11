import React from "react";

export default function EstadoVazio({ texto, onAcao, acaoTexto, pequeno }) {
  return (
    <div className={`vazio ${pequeno ? "pequeno" : ""}`}>
      <span className="subtle">{texto}</span>
      {onAcao && (
        <button className="btn-primario" onClick={onAcao} style={{ marginTop: 12 }}>
          + {acaoTexto}
        </button>
      )}
    </div>
  );
}