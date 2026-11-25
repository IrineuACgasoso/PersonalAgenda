// src/components/curriculo/FormularioCurriculo.jsx
// Modal único de edição do currículo: os campos vêm declarados em
// utils/curriculo.js (dados, resumo e cada módulo). Só grava no "Salvar";
// fechar com algo digitado pergunta antes. Na tradução, cada campo mostra o
// texto em português (`original`).
import { useState } from "react";
import { Modal } from "../ui/Dialogos.jsx";
import useDialogos from "../../hooks/useDialogos";
import { erroDoRascunho, limparRascunho } from "../../utils/curriculo.js";

function Campo({ campo, valor, autofoco, onMudar }) {
  const id = `curriculo-${campo.id}`;
  const comum = {
    id,
    className: "input",
    value: valor,
    onChange: (e) => onMudar(e.target.value),
    "aria-describedby":
      [campo.original && `${id}-original`, campo.ajuda && `${id}-ajuda`].filter(Boolean).join(" ") || undefined,
    "data-autofoco": autofoco ? "" : undefined,
  };
  const multilinha = campo.tipo === "longo" || campo.tipo === "pontos";

  let controle;
  if (campo.tipo === "opcoes") {
    controle = (
      <select {...comum}>
        <option value="">Escolha…</option>
        {/* Valor antigo fora da lista continua escolhido. */}
        {[...new Set([...campo.opcoes, valor])].filter(Boolean).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  } else if (multilinha) {
    controle = (
      <textarea {...comum} className="input curriculo-textarea" rows={5} maxLength={3000} placeholder={campo.exemplo} />
    );
  } else {
    controle = (
      <input
        {...comum}
        type={campo.tipo === "mes" ? "month" : "text"}
        inputMode={campo.modo || (campo.tipo === "link" ? "url" : undefined)}
        maxLength={campo.max || 300}
        // Só aparece onde o navegador não tem campo de mês.
        placeholder={campo.tipo === "mes" ? "MM/AAAA" : campo.exemplo}
      />
    );
  }

  return (
    <div className={`form-campo${campo.largo ? " form-campo-largo" : ""}`}>
      <label className="form-campo-rotulo" htmlFor={id}>
        {campo.rotulo}
        {campo.obrigatorio && " *"}
      </label>
      {campo.original && (
        <span className="curriculo-original" id={`${id}-original`}>
          {campo.original}
        </span>
      )}
      {controle}
      {campo.ajuda && (
        <span className="curriculo-ajuda" id={`${id}-ajuda`}>
          {campo.ajuda}
        </span>
      )}
    </div>
  );
}

// `validar(rascunho)`: regra extra; devolve a mensagem do problema ou null.
export default function FormularioCurriculo({ titulo, dica, campos, valor, validar, onSalvar, onFechar }) {
  const [inicial] = useState(() => Object.fromEntries(campos.map((c) => [c.id, valor?.[c.id] || ""])));
  const [rascunho, setRascunho] = useState(inicial);
  const [erro, setErro] = useState(null);
  const { confirmar } = useDialogos();

  const salvar = (e) => {
    e.preventDefault();
    const limpo = limparRascunho(campos, rascunho);
    const problema = erroDoRascunho(campos, limpo) || validar?.(limpo) || null;
    setErro(problema);
    if (problema) return;
    if (onSalvar(limpo).ok) onFechar();
  };

  const fechar = async () => {
    const mudou = campos.some((c) => rascunho[c.id] !== inicial[c.id]);
    const ok =
      !mudou ||
      (await confirmar("O que você digitou não foi salvo. Descartar?", {
        titulo: "Descartar alterações",
        textoConfirmar: "Descartar",
        perigo: true,
      }));
    if (ok) onFechar();
  };

  return (
    <Modal titulo={titulo} rotuloId="form-curriculo" classe="modal-curriculo" onFechar={fechar}>
      <form className="form-curriculo" onSubmit={salvar} noValidate>
        {dica && <p className="curriculo-dica">{dica}</p>}
        <div className="form-campos">
          {campos.map((c, i) => (
            <Campo
              key={c.id}
              campo={c}
              valor={rascunho[c.id]}
              autofoco={i === 0}
              onMudar={(v) => setRascunho((r) => ({ ...r, [c.id]: v }))}
            />
          ))}
        </div>
        {erro && (
          <span className="form-erro" role="alert">
            {erro}
          </span>
        )}
        <div className="modal-acoes">
          <button type="button" className="btn-secundario" onClick={fechar}>
            Cancelar
          </button>
          <button className="btn-primario">Salvar</button>
        </div>
      </form>
    </Modal>
  );
}
