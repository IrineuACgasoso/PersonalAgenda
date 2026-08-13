// src/components/cadeira/AbaHorarios.jsx
import React, { useState } from "react";
import { Plus, Trash2, Edit2, Clock, MapPin, Check, X } from "lucide-react";
import { DIAS_FULL } from "../../constants.js";
import EstadoVazio from "../ui/EstadoVazio.jsx";

export default function AbaHorarios({ horarios, onAdd, onRemover, onEditar }) {
  const [dia, setDia] = useState(0);
  const [inicio, setInicio] = useState("08:00");
  const [fim, setFim] = useState("10:00");
  const [local, setLocal] = useState("");
  const [editandoId, setEditandoId] = useState(null);

  const limpar = () => {
    setDia(0);
    setInicio("08:00");
    setFim("10:00");
    setLocal("");
    setEditandoId(null);
  };

  const salvar = () => {
    if (!inicio || !fim || inicio >= fim) {
      window.alert("Verifique o horário: o início precisa ser antes do fim.");
      return;
    }
    if (editandoId) {
      if (onEditar) {
        onEditar(editandoId, { dia, inicio, fim, local: local.trim() });
      } else {
        onRemover(editandoId);
        onAdd({ dia, inicio, fim, local: local.trim() });
      }
    } else {
      onAdd({ dia, inicio, fim, local: local.trim() });
    }
    limpar();
  };

  const iniciarEdicao = (h) => {
    setEditandoId(h.id);
    setDia(h.dia);
    setInicio(h.inicio);
    setFim(h.fim);
    setLocal(h.local || "");
  };

  return (
    <div>
      <div className="form-grid">
        <select className="input" value={dia} onChange={(e) => setDia(Number(e.target.value))}>
          {DIAS_FULL.map((d, i) => (
            <option key={d} value={i}>{d}</option>
          ))}
        </select>
        <input className="input" type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        <input className="input" type="time" value={fim} onChange={(e) => setFim(e.target.value)} />
      </div>
      <div className="form-grid campo-mais-botao">
        <input
          className="input"
          placeholder="Local ou link da sala (opcional)"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
        />
        <button className="btn-primario" onClick={salvar}>
          {editandoId ? <Check size={15} /> : <Plus size={15} />}
          {editandoId ? "Salvar" : "Adicionar"}
        </button>
        {editandoId && (
          <button className="btn-secundario" onClick={limpar} title="Cancelar edição">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="lista-itens">
        {horarios.length === 0 && <EstadoVazio texto="Nenhum horário cadastrado" pequeno />}
        {[...horarios]
          .sort((a, b) => a.dia - b.dia || a.inicio.localeCompare(b.inicio))
          .map((h) => (
            <div key={h.id} className="item-linha">
              <Clock size={14} style={{ opacity: 0.6 }} />
              <div style={{ flex: 1 }}>
                <div className="item-linha-titulo">{DIAS_FULL[h.dia]} · {h.inicio}–{h.fim}</div>
                {h.local && (
                  <div className="subtle">
                    <MapPin size={11} style={{ verticalAlign: "-1px", marginRight: 3 }} />
                    {h.local}
                  </div>
                )}
              </div>
              <button className="icon-btn-ghost" onClick={() => iniciarEdicao(h)} title="Editar horário">
                <Edit2 size={13} />
              </button>
              <button className="icon-btn-ghost" onClick={() => onRemover(h.id)} title="Excluir horário">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}