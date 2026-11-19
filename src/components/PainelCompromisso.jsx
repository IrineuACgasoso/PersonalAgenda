// src/components/PainelCompromisso.jsx
import { useState, useEffect, useRef } from "react";
import { Trash2, X } from "lucide-react";
import useListaInterna from "../hooks/useListaInterna";
import { DIAS_FULL } from "../constants";
import AbaHorarios from "./abas/AbaHorarios";
import SeletorCor from "./ui/SeletorCor.jsx";
import { useNavegacaoEnter } from "../hooks/useNavegacaoEnter.js";

const textoHorarioExcluido = (h) => `Horário de ${DIAS_FULL[h.dia] ?? "?"} (${h.inicio}–${h.fim}) excluído`;

export default function PainelCompromisso({ compromisso, periodos = [], onFechar, onAtualizar, onExcluir }) {
  const [nomeEdit, setNomeEdit] = useState(compromisso.nome);
  const painelRef = useRef(null);
  useNavegacaoEnter(painelRef);

  // Só ao trocar de compromisso (mesmo motivo do PainelCadeira).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setNomeEdit(compromisso.nome), [compromisso.id]);

  const salvarNome = () => {
    const v = nomeEdit.trim();
    if (v && v !== compromisso.nome) onAtualizar({ nome: v });
  };

  /* horários: leem o compromisso mais recente; excluir tem "Desfazer" (#18) */
  const {
    adicionar: addHorario,
    remover: rmHorario,
    editar: editHorario,
  } = useListaInterna("horarios", onAtualizar, textoHorarioExcluido);

  return (
    <div className="overlay" onClick={onFechar}>
      <div className="painel-lateral" ref={painelRef} onClick={(e) => e.stopPropagation()}>
        <div className="painel-header">
          <span className="cor-dot" style={{ background: compromisso.cor }} />
          <input
            className="painel-title-input"
            value={nomeEdit}
            onChange={(e) => setNomeEdit(e.target.value)}
            onBlur={salvarNome}
          />
          <button className="icon-btn-ghost" onClick={onExcluir} title="Excluir compromisso">
            <Trash2 size={15} />
          </button>
          <button className="icon-btn-ghost" onClick={onFechar}>
            <X size={17} />
          </button>
        </div>

        <div style={{ marginTop: 10 }}>
          <SeletorCor key={compromisso.id} valor={compromisso.cor} onChange={(cor) => onAtualizar({ cor })} />
        </div>

        <div style={{ marginTop: 14 }}>
          <span className="subtle" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
            Período (obrigatório):
          </span>
          <select
            className="input"
            value={compromisso.periodoId || ""}
            onChange={(e) => {
              if (e.target.value) onAtualizar({ periodoId: e.target.value });
            }}
          >
            {periodos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <span className="subtle" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
            Só aparece na agenda e no calendário quando este período estiver selecionado.
          </span>
        </div>

        <div className="painel-conteudo" style={{ paddingTop: 18 }}>
          <h2 className="titulo-secao" style={{ marginBottom: 4 }}>
            Horários
          </h2>
          <AbaHorarios
            horarios={compromisso.horarios}
            onAdd={addHorario}
            onRemover={rmHorario}
            onEditar={editHorario}
          />
        </div>
      </div>
    </div>
  );
}
