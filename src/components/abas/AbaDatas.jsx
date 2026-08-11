import React, { useState } from "react";
import { Plus, Trash2, Calendar } from "lucide-react";
import { formatarData } from "../../utils/formatarData.js";
import EstadoVazio from "../ui/EstadoVazio.jsx";

export default function AbaDatas({ datas, onAdd, onRemover }) {
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");

  const adicionar = () => {
    const t = titulo.trim();
    if (!t || !data) {
      window.alert("Preencha o título e a data.");
      return;
    }
    onAdd({ titulo: t, data, hora });
    setTitulo("");
    setData("");
    setHora("");
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
      <button className="btn-primario full" onClick={adicionar}>
        <Plus size={15} /> Adicionar data
      </button>

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
              <button className="icon-btn-ghost" onClick={() => onRemover(d.id)}><Trash2 size={13} /></button>
            </div>
          ))}
      </div>
    </div>
  );
}