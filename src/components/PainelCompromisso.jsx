// src/components/PainelCompromisso.jsx
import React, { useState, useEffect } from "react";
import { Trash2, X } from "lucide-react";
import { uid } from "../utils/id";
import AbaHorarios from "./abas/AbaHorarios";
import SeletorCor from "./ui/SeletorCor.jsx";

export default function PainelCompromisso({
  compromisso,
  periodos = [],
  onFechar,
  onAtualizar,
  onExcluir,
}) {
  const [nomeEdit, setNomeEdit] = useState(compromisso.nome);

  useEffect(() => setNomeEdit(compromisso.nome), [compromisso.id]);

  const salvarNome = () => {
    const v = nomeEdit.trim();
    if (v && v !== compromisso.nome) onAtualizar({ nome: v });
  };

  /* horários */
  const addHorario = (h) =>
    onAtualizar({ horarios: [...compromisso.horarios, { id: uid(), ...h }] });
  const rmHorario = (id) =>
    onAtualizar({ horarios: compromisso.horarios.filter((h) => h.id !== id) });
  const editHorario = (id, patch) =>
    onAtualizar({
      horarios: compromisso.horarios.map((h) => (h.id === id ? { ...h, ...patch } : h)),
    });

  return (
    <div className="overlay" onClick={onFechar}>
      <div className="painel-lateral" onClick={(e) => e.stopPropagation()}>
        <div className="painel-header">
          <span className="cor-dot" style={{ background: compromisso.cor }} />
          <input
            className="painel-title-input"
            value={nomeEdit}
            onChange={(e) => setNomeEdit(e.target.value)}
            onBlur={salvarNome}
            onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
          />
          <button
            className="icon-btn-ghost"
            onClick={onExcluir}
            title="Excluir compromisso"
          >
            <Trash2 size={15} />
          </button>
          <button className="icon-btn-ghost" onClick={onFechar}>
            <X size={17} />
          </button>
        </div>

        <div style={{ marginTop: 10 }}>
          <SeletorCor valor={compromisso.cor} onChange={(cor) => onAtualizar({ cor })} />
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
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          <span className="subtle" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
            Só aparece na agenda e no calendário quando este período estiver selecionado.
          </span>
        </div>

        <div className="painel-conteudo" style={{ paddingTop: 18 }}>
          <h2 className="titulo-secao" style={{ marginBottom: 4 }}>Horários</h2>
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