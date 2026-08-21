// src/components/VisaoCompromissos.jsx
import React, { useState } from "react";
import { Plus, Trash2, Clock } from "lucide-react";
import EstadoVazio from "./ui/EstadoVazio.jsx";

export default function VisaoCompromissos({ periodoAtivo, compromissos, onCriar, onAbrir, onExcluir }) {
  const [novoNome, setNovoNome] = useState("");

  const adicionar = () => {
    const nome = novoNome.trim();
    if (!nome) return;
    onCriar(nome);
    setNovoNome("");
  };

  return (
    <div>
      <div className="header-bar">
        <h1 className="titulo-pagina">Compromissos</h1>
        <span className="subtle" style={{ marginLeft: "auto" }}>
          {compromissos.length} compromisso{compromissos.length !== 1 ? "s" : ""} em {periodoAtivo.nome}
        </span>
      </div>

      <div className="add-row" style={{ marginTop: 16 }}>
        <input
          className="input"
          placeholder="Nome do compromisso, ex: Academia, Reunião de equipe..."
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && adicionar()}
        />
        <button className="btn-primario" onClick={adicionar}>
          <Plus size={16} /> Adicionar
        </button>
      </div>

      {compromissos.length === 0 ? (
        <EstadoVazio texto="Nenhum compromisso cadastrado neste período ainda" />
      ) : (
        <div className="grid-cadeiras">
          {compromissos.map((c) => (
            <div key={c.id} className="card-cadeira" onClick={() => onAbrir(c.id)}>
              <div className="card-faixa" style={{ background: c.cor }} />
              <div className="card-body">
                <div className="card-title-row">
                  <span className="card-title">{c.nome}</span>
                  <button
                    className="icon-btn-ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExcluir(c.id);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="card-meta">
                  <Clock size={12} />
                  <span>{c.horarios.length} horário{c.horarios.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}