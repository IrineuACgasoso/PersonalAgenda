// src/components/ui/SeletorCor.jsx
import React, { useEffect, useRef, useState } from "react";
import { criarConfirmacaoAdiada } from "../../utils/confirmacaoAdiada";

const HEX_VALIDO = /^#([0-9a-fA-F]{6})$/;

/**
 * Seletor de cor livre: um color-picker nativo (roda de cores do sistema)
 * acoplado a um campo de texto para digitar/colar o hexadecimal direto.
 * Sempre controlado por `valor` (hex de 6 dígitos, ex: "#6366f1").
 *
 * #41: arrastando na roda de cores, o navegador dispara um evento a cada
 * pixel. Enquanto arrasta, só a prévia local muda; `onChange` é chamado
 * quando o usuário fecha o seletor (evento `change` nativo), sai do campo,
 * ou para de mexer por `adiarMs`. No drawer, cada `onChange` é um persist().
 * Use `adiarMs={0}` quando `onChange` for só um estado local (formulário).
 *
 * Quem troca o item editado sem desmontar o drawer deve passar `key` (id do
 * item): ao desmontar, a cor pendente é confirmada no item ANTERIOR.
 */
export default function SeletorCor({ valor, onChange, label, adiarMs = 400 }) {
  const [texto, setTexto] = useState(valor || "#6366f1");
  const swatchRef = useRef(null);

  // Sempre a versão mais recente do onChange (ele muda a cada render do pai).
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const confirmacaoRef = useRef(null);
  if (!confirmacaoRef.current) {
    confirmacaoRef.current = criarConfirmacaoAdiada((cor) => onChangeRef.current(cor), adiarMs);
  }
  const confirmacao = confirmacaoRef.current;

  // Mantém o campo sincronizado quando o valor muda de fora (ex: gravação
  // confirmada, sync de outro aparelho) e evita regravar esse mesmo valor.
  useEffect(() => {
    setTexto(valor || "#6366f1");
    confirmacao.sincronizar(valor);
  }, [valor, confirmacao]);

  // `onChange` do React num input de cor = evento `input` (contínuo). O
  // `change` nativo só dispara quando o usuário fecha o seletor: é o
  // momento de gravar. Ao desmontar (fechar o drawer), confirma o pendente.
  useEffect(() => {
    const el = swatchRef.current;
    const aoFechar = () => confirmacao.confirmar();
    el?.addEventListener("change", aoFechar);
    return () => {
      el?.removeEventListener("change", aoFechar);
      confirmacao.confirmar();
    };
  }, [confirmacao]);

  const aplicarTexto = (v, imediato) => {
    let limpo = v.trim();
    if (limpo && !limpo.startsWith("#")) limpo = `#${limpo}`;
    setTexto(limpo);
    if (!HEX_VALIDO.test(limpo)) return;
    confirmacao.mudar(limpo);
    if (imediato || adiarMs <= 0) confirmacao.confirmar();
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
          ref={swatchRef}
          type="color"
          className="seletor-cor-swatch"
          value={HEX_VALIDO.test(texto) ? texto : valor || "#6366f1"}
          onChange={(e) => aplicarTexto(e.target.value, false)}
          onBlur={() => confirmacao.confirmar()}
          title="Escolher cor"
        />
        <input
          type="text"
          className="input seletor-cor-hex"
          value={texto}
          // Digitar/colar um hex completo é uma ação pontual: grava na hora.
          onChange={(e) => aplicarTexto(e.target.value, true)}
          onBlur={() => setTexto(HEX_VALIDO.test(texto) ? texto : valor || "#6366f1")}
          placeholder="#6366f1"
          maxLength={7}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
