import React, { useState, useEffect, useRef } from "react";
import { Check } from "lucide-react";

export  default function ModalTexto({ titulo, placeholder, valorInicial = "", onConfirmar, onCancelar }) {
  const [valor, setValor] = useState(valorInicial);
  const ref = useRef(null);
  useEffect(() => ref.current?.focus(), []);

  const confirmar = () => {
    const v = valor.trim();
    if (v) onConfirmar(v);
  };

  return (
    <div className="overlay" onClick={onCancelar}>
      <div className="modal-pequeno" onClick={(e) => e.stopPropagation()}>
        <h2 className="titulo-secao">{titulo}</h2>
        <input
          ref={ref}
          className="input"
          style={{ marginTop: 12 }}
          placeholder={placeholder}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && confirmar()}
        />
        <div className="modal-acoes">
          <button className="btn-secundario" onClick={onCancelar}>Cancelar</button>
          <button className="btn-primario" onClick={confirmar}><Check size={15} /> Salvar</button>
        </div>
      </div>
    </div>
  );
}