// src/components/telaCadeira/ModalLembretesData.jsx
// Lembretes de UMA data importante (sininho da tela da cadeira). Janela
// pequena tingida com a cor da cadeira:
//   Ativados | Desativados (padrão: desativado, por data)
//   chips: Padrão (o global, em Lembretes no menu) · opções · as próprias
//   desta data · "+ Adicionar" (valor | h/dia/semana).
// Grava na hora (um clique = um persist), como o resto do app.
// Portal no <body>: dentro da tela da cadeira o `position: fixed` do modal
// ficaria preso à caixa dela (backdrop-filter cria um novo contexto).
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, BellOff, Check, Plus, X } from "lucide-react";
import { Modal } from "../ui/Dialogos.jsx";
import { formatarData } from "../../utils/formatarData.js";
import {
  MAX_LEMBRETES_POR_ITEM,
  OPCOES_LEMBRETE,
  UNIDADES_LEMBRETE,
  antecedenciaPersonalizada,
  rotuloAntecedencia,
  textoListaLembretes,
} from "../../utils/lembretes.js";

export default function ModalLembretesData({ data, lembretesPadrao = [], estiloCor, onSalvar, onFechar }) {
  const [adicionando, setAdicionando] = useState(false);
  const [valor, setValor] = useState("");
  const [unidade, setUnidade] = useState("dia");
  const [erro, setErro] = useState("");
  // Ao fechar o "+ Adicionar", o campo some com o foco nele: devolve o foco
  // ao botão (ou ao "Ativados", se a lista encheu e ele ficou desabilitado).
  // Sem isso o foco caía no <body> e o Esc parava de fechar a janela.
  const adicionarRef = useRef(null);
  const ativadosRef = useRef(null);
  const devolverFoco = useRef(false);
  useEffect(() => {
    if (adicionando || !devolverFoco.current) return;
    devolverFoco.current = false;
    (adicionarRef.current && !adicionarRef.current.disabled ? adicionarRef.current : ativadosRef.current)?.focus();
  }, [adicionando]);

  const ativo = data.lembretesAtivos === true;
  const usandoPadrao = !Array.isArray(data.lembretes);
  const lista = usandoPadrao ? lembretesPadrao : data.lembretes;
  // Opções fixas + as próprias desta data (as personalizadas viram chip).
  const todas = [...new Set([...OPCOES_LEMBRETE.avaliacoes, ...(usandoPadrao ? [] : lista)])].sort((a, b) => a - b);
  const cheia = !usandoPadrao && lista.length >= MAX_LEMBRETES_POR_ITEM;

  const alternar = (min) => {
    const base = usandoPadrao ? [] : lista;
    if (base.includes(min)) onSalvar({ lembretes: base.filter((m) => m !== min) });
    else if (base.length < MAX_LEMBRETES_POR_ITEM) onSalvar({ lembretes: [...base, min].sort((a, b) => a - b) });
  };

  const fecharNovo = () => {
    devolverFoco.current = true;
    setAdicionando(false);
    setValor("");
    setErro("");
  };

  const adicionar = () => {
    const min = antecedenciaPersonalizada(valor, unidade);
    if (min === null) {
      setErro("Use um número maior que 0, até 30 dias antes.");
      return;
    }
    const base = usandoPadrao ? [] : lista;
    if (!base.includes(min)) onSalvar({ lembretes: [...base, min].sort((a, b) => a - b) });
    fecharNovo();
  };

  const quando = `${formatarData(data.data)}${data.hora ? ` · ${data.hora}` : " · sem hora (conta a partir das 08:00)"}`;

  return createPortal(
    <Modal titulo={`Lembretes · ${data.titulo}`} onFechar={onFechar} classe="modal-lembretes-data" estilo={estiloCor}>
      <p className="mld-quando">{quando}</p>

      <div className="mld-alternador" role="radiogroup" aria-label="Lembretes desta data">
        <button
          type="button"
          role="radio"
          aria-checked={ativo}
          ref={ativadosRef}
          className={ativo ? "ativo" : ""}
          onClick={() => !ativo && onSalvar({ lembretesAtivos: true })}
        >
          <Bell size={14} /> Ativados
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={!ativo}
          className={!ativo ? "ativo" : ""}
          onClick={() => ativo && onSalvar({ lembretesAtivos: false })}
        >
          <BellOff size={14} /> Desativados
        </button>
      </div>

      <fieldset className="mld-opcoes" disabled={!ativo}>
        <legend className="mld-rotulo">Quando lembrar</legend>
        <div className="chips-lembrete">
          <button
            type="button"
            className={`chip-lembrete${usandoPadrao ? " ativo" : ""}`}
            aria-pressed={usandoPadrao}
            onClick={() => onSalvar({ lembretes: undefined })}
            title="O padrão das avaliações — muda em Lembretes, no menu"
          >
            Padrão ({textoListaLembretes(lembretesPadrao)})
          </button>
          {todas.map((min) => {
            const marcado = !usandoPadrao && lista.includes(min);
            const proprio = !OPCOES_LEMBRETE.avaliacoes.includes(min);
            return (
              <button
                key={min}
                type="button"
                className={`chip-lembrete${marcado ? " ativo" : ""}${proprio ? " proprio" : ""}`}
                aria-pressed={marcado}
                disabled={!marcado && cheia}
                onClick={() => alternar(min)}
              >
                {rotuloAntecedencia(min)}
              </button>
            );
          })}
          {!adicionando && (
            <button
              type="button"
              ref={adicionarRef}
              className="chip-lembrete mld-adicionar"
              onClick={() => setAdicionando(true)}
              disabled={cheia}
              title={cheia ? `No máximo ${MAX_LEMBRETES_POR_ITEM} lembretes por data` : undefined}
            >
              <Plus size={12} /> Adicionar
            </button>
          )}
        </div>

        {adicionando && (
          <div className="mld-novo">
            <input
              className="input"
              type="number"
              inputMode="decimal"
              min="1"
              step="1"
              placeholder="Valor"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") adicionar();
              }}
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
            <span className="mld-antes">antes</span>
            <button type="button" className="icon-btn-ghost" onClick={adicionar} title="Adicionar">
              <Check size={15} />
            </button>
            <button type="button" className="icon-btn-ghost" onClick={fecharNovo} title="Cancelar">
              <X size={15} />
            </button>
          </div>
        )}
        {erro && <p className="mld-erro">{erro}</p>}
      </fieldset>

      <p className="mld-resumo">
        {ativo
          ? lista.length
            ? `Vai lembrar: ${textoListaLembretes(lista)}.`
            : "Nenhum horário escolhido: não vai lembrar."
          : "Desativados: esta data não manda lembrete."}
      </p>
    </Modal>,
    document.body,
  );
}
