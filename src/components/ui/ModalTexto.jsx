import { useState } from "react";
import { Check } from "lucide-react";
import { Modal } from "./Dialogos";

// Modal com um campo de texto (ex.: "Novo período"). Usa a casca comum dos
// diálogos (#17): centralizado, Esc fecha, foco preso no modal.
export default function ModalTexto({ titulo, placeholder, valorInicial = "", onConfirmar, onCancelar }) {
  const [valor, setValor] = useState(valorInicial);

  const confirmar = () => {
    const v = valor.trim();
    if (v) onConfirmar(v);
  };

  return (
    <Modal titulo={titulo} rotuloId="modal-texto-titulo" onFechar={onCancelar}>
      <input
        className="input"
        data-autofoco=""
        placeholder={placeholder}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && confirmar()}
      />
      <div className="modal-acoes">
        <button className="btn-secundario" onClick={onCancelar}>
          Cancelar
        </button>
        <button className="btn-primario" onClick={confirmar}>
          <Check size={15} /> Salvar
        </button>
      </div>
    </Modal>
  );
}
