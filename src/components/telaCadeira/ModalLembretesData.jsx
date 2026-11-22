// src/components/telaCadeira/ModalLembretesData.jsx
// Lembretes de UMA data importante (sininho da tela da cadeira). Janela
// pequena tingida com a cor da cadeira:
//   Ativados | Desativados (padrão: desativado, por data)
//   chips: Padrão (o global, em Lembretes no menu) · opções · as próprias
//   desta data · "+ Adicionar" (valor | h/dia/semana, ui/AdicionarLembrete).
// Grava na hora (um clique = um persist), como o resto do app.
// Portal no <body>: dentro da tela da cadeira o `position: fixed` do modal
// ficaria preso à caixa dela (backdrop-filter cria um novo contexto).
import { useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Bell, BellOff } from "lucide-react";
import { Modal } from "../ui/Dialogos.jsx";
import AdicionarLembrete from "../ui/AdicionarLembrete.jsx";
import { formatarData } from "../../utils/formatarData.js";
import {
  MAX_LEMBRETES_POR_ITEM,
  OPCOES_LEMBRETE,
  rotuloAntecedencia,
  textoListaLembretes,
} from "../../utils/lembretes.js";

export default function ModalLembretesData({ data, lembretesPadrao = [], estiloCor, onSalvar, onFechar }) {
  // Se a lista encher, o "+ Adicionar" fica desabilitado ao fechar o campo:
  // o foco vai para o "Ativados" (senão cairia no <body> e o Esc pararia).
  const ativadosRef = useRef(null);
  const focarAtivados = useCallback(() => ativadosRef.current?.focus(), []);

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

  const adicionar = (min) => {
    const base = usandoPadrao ? [] : lista;
    if (!base.includes(min)) onSalvar({ lembretes: [...base, min].sort((a, b) => a - b) });
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
          <AdicionarLembrete onAdicionar={adicionar} cheia={cheia} onFocoPerdido={focarAtivados} />
        </div>
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
