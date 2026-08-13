// src/components/cadeira/AbaDatas.jsx
import React, { useState } from "react";
import { Plus, Trash2, Edit2, Calendar, Check, X } from "lucide-react";
import { formatarData } from "../../utils/formatarData.js";
import EstadoVazio from "../ui/EstadoVazio.jsx";

export default function AbaDatas({ datas, onAdd, onRemover, onEditar }) {
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [editandoId, setEditandoId] = useState(null);

  const limpar = () => {
    setTitulo("");
    setData("");
    setHora("");
    setEditandoId(null);
  };

  const salvar = () => {
    const t = titulo.trim();
    if (!t || !data) {
      window.alert("Preencha o título e a data.");
      return;
    }
    if (editandoId) {
      if (onEditar) {
        onEditar(editandoId, { titulo: t, data, hora });
      } else {
        onRemover(editandoId);
        onAdd({ titulo: t, data, hora });
      }
    } else {
      onAdd({ titulo: t, data, hora });
    }
    limpar();
  };

  const iniciarEdicao = (d) => {
    setEditandoId(d.id);
    setTitulo(d.titulo);
    setData(d.data);
    setHora(d.hora || "");
  };

  return (
    <div>
      <input
        className="input"
        placeholder="ex: Prova 1, entrega do trabalho..."
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />
      <div className="form-grid duas-colunas" style={{ marginTop: 8 }}>
        <input className="input" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        <input className="input" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button className="btn-primario full" onClick={salvar}>
          {editandoId ? <Check size={15} /> : <Plus size={15} />}
          {editandoId ? "Salvar edição" : "Adicionar data"}
        </button>
        {editandoId && (
          <button className="btn-secundario" onClick={limpar} title="Cancelar edição">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="lista-itens">
        {datas.length === 0 && <EstadoVazio texto="Nenhuma data cadastrada" pequeno />}
        {[...datas]
          .sort((a, b) => `${a.data}T${a.hora || "00:00"}`.localeCompare(`${b.data}T${b.hora || "00:00"}`))
          .map((d) => (
            <div key={d.id} className="item-linha">
              <Calendar size={14} style={{ opacity: 0.6 }} />
              <div style={{ flex: 1 }}>
                <div className="item-linha-titulo">{d.titulo}</div>
                <div className="subtle">{formatarData(d.data)}{d.hora ? ` · ${d.hora}` : ""}</div>
              </div>
              <button className="icon-btn-ghost" onClick={() => iniciarEdicao(d)} title="Editar data">
                <Edit2 size={13} />
              </button>
              <button
                className="icon-btn-ghost"
                onClick={() => {
                  if (window.confirm(`Excluir a data "${d.titulo}"?`)) {
                    onRemover(d.id);
                  }
                }}
                title="Excluir data"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}