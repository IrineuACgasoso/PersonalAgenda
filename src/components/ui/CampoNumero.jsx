// src/components/ui/CampoNumero.jsx
// Campo numérico que grava ao SAIR (blur/Enter), não a cada tecla — mesmo
// motivo do nome nos drawers: cada persist() vai para o Firestore. Aceita
// vírgula ("8,5"). Vazio = `undefined` (ex.: nota que ainda não saiu).
// `key` com o valor: se mudar por fora (sync de outro aparelho, Desfazer),
// o campo remonta com o valor novo.
import { forwardRef } from "react";

const textoDoNumero = (v) => (v === undefined || v === null ? "" : String(v).replace(".", ","));

function lerNumero(texto) {
  const t = String(texto).trim().replace(",", ".");
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : null; // null = inválido (volta ao valor atual)
}

const CampoNumero = forwardRef(function CampoNumero(
  { valor, onSalvar, min = 0, max, className = "input", ...props },
  ref,
) {
  const salvar = (e) => {
    const lido = lerNumero(e.target.value);
    if (lido === null || (lido !== undefined && (lido < min || (max !== undefined && lido > max)))) {
      e.target.value = textoDoNumero(valor);
      return;
    }
    if (lido !== valor) onSalvar(lido);
  };
  return (
    <input
      key={textoDoNumero(valor)}
      ref={ref}
      className={className}
      type="text"
      inputMode="decimal"
      defaultValue={textoDoNumero(valor)}
      onBlur={salvar}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      {...props}
    />
  );
});

export default CampoNumero;
