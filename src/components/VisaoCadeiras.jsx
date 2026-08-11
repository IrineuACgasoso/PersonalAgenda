import React, { useState } from "react";
import { Plus, Trash2, Clock, Link as LinkIcon, Calendar } from "lucide-react";
import EstadoVazio from "./ui/EstadoVazio.jsx";

export default function VisaoCadeiras({ periodoAtivo, cadeiras, onCriar, onAbrir, onExcluir }) {
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
        <h1 className="titulo-pagina">{periodoAtivo.nome}</h1>
        <span className="subtle">
          {cadeiras.length} cadeira{cadeiras.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="add-row">
        <input
          className="input"
          placeholder="Nome da cadeira, ex: Cálculo II"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && adicionar()}
        />
        <button className="btn-primario" onClick={adicionar}>
          <Plus size={16} /> Adicionar
        </button>
      </div>

      {cadeiras.length === 0 ? (
        <EstadoVazio texto="Nenhuma cadeira cadastrada ainda" />
      ) : (
        <div className="grid-cadeiras">
          {cadeiras.map((c) => (
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
                  <span className="separador">·</span>
                  <LinkIcon size={12} />
                  <span>{c.links.length} link{c.links.length !== 1 ? "s" : ""}</span>
                  <span className="separador">·</span>
                  <Calendar size={12} />
                  <span>{c.datas.length} data{c.datas.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}