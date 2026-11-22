// src/components/ui/AdicionarLembrete.jsx
// Chip "+ Adicionar" de lembrete personalizado (valor | h/dia/semana antes).
// Vale só para o item que está sendo editado (uma data importante, um
// compromisso): quem usa recebe os minutos em `onAdicionar` e decide onde
// gravar. Fica dentro de `.chips-lembrete`; aberto, o formulário ocupa a
// linha inteira (flex-basis 100%) logo abaixo dos chips.
import { useEffect, useRef, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { MAX_LEMBRETES_POR_ITEM, UNIDADES_LEMBRETE, antecedenciaPersonalizada } from "../../utils/lembretes.js";

export default function AdicionarLembrete({ onAdicionar, cheia = false, onFocoPerdido, unidadeInicial = "dia" }) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState("");
  const [unidade, setUnidade] = useState(unidadeInicial);
  const [erro, setErro] = useState("");
  // Ao fechar, o campo some com o foco nele: devolve o foco ao botão (ou a
  // quem usa, se a lista encheu e o botão ficou desabilitado). Sem isso o
  // foco caía no <body> e o Esc parava de fechar a janela da data.
  const botaoRef = useRef(null);
  const devolverFoco = useRef(false);
  useEffect(() => {
    if (aberto || !devolverFoco.current) return;
    devolverFoco.current = false;
    if (botaoRef.current && !botaoRef.current.disabled) botaoRef.current.focus();
    else onFocoPerdido?.();
  }, [aberto, onFocoPerdido]);

  // Enter confirma e Esc fecha SÓ este campo. Ouvinte nativo no próprio
  // input: o formulário do compromisso tem um ouvinte nativo de Enter
  // (useNavegacaoEnter) que roda antes dos handlers do React, então um
  // stopPropagation no onKeyDown chegaria tarde. Parado aqui, o evento não
  // chega nem nele nem no Esc da janela em volta.
  const campoRef = useRef(null);
  const teclaRef = useRef(null);
  teclaRef.current = (e) => {
    if (e.key !== "Enter" && e.key !== "Escape") return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "Enter") confirmar();
    else fechar();
  };
  useEffect(() => {
    const campo = campoRef.current;
    if (!aberto || !campo) return;
    const aoTeclar = (e) => teclaRef.current(e);
    campo.addEventListener("keydown", aoTeclar);
    return () => campo.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  const fechar = () => {
    devolverFoco.current = true;
    setAberto(false);
    setValor("");
    setErro("");
  };

  const confirmar = () => {
    const min = antecedenciaPersonalizada(valor, unidade);
    if (min === null) {
      setErro("Use um número maior que 0, até 30 dias antes.");
      return;
    }
    onAdicionar(min);
    fechar();
  };

  if (!aberto) {
    return (
      <button
        type="button"
        ref={botaoRef}
        className="chip-lembrete lembrete-adicionar"
        onClick={() => setAberto(true)}
        disabled={cheia}
        title={cheia ? `No máximo ${MAX_LEMBRETES_POR_ITEM} lembretes por item` : "Lembrete com outra antecedência"}
      >
        <Plus size={12} /> Adicionar
      </button>
    );
  }

  return (
    <div className="lembrete-novo">
      <div className="lembrete-novo-linha">
        <input
          className="input"
          type="number"
          inputMode="decimal"
          min="1"
          step="1"
          placeholder="Valor"
          value={valor}
          ref={campoRef}
          onChange={(e) => setValor(e.target.value)}
          aria-label="Quanto tempo antes"
          autoFocus
        />
        <select className="input" value={unidade} onChange={(e) => setUnidade(e.target.value)} aria-label="Unidade">
          {UNIDADES_LEMBRETE.map((u) => (
            <option key={u.id} value={u.id}>
              {u.rotulo}
            </option>
          ))}
        </select>
        <span className="lembrete-novo-antes">antes</span>
        <button type="button" className="icon-btn-ghost" onClick={confirmar} title="Adicionar">
          <Check size={15} />
        </button>
        <button type="button" className="icon-btn-ghost" onClick={fechar} title="Cancelar">
          <X size={15} />
        </button>
      </div>
      {erro && <p className="lembrete-novo-erro">{erro}</p>}
    </div>
  );
}
