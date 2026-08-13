// src/components/VisaoCadeiras.jsx
import React, { useState } from "react";
import { Plus, Trash2, Clock, Link as LinkIcon, Calendar } from "lucide-react";
import EstadoVazio from "./ui/EstadoVazio.jsx";

export default function VisaoCadeiras({
  periodoAtivo,
  cadeiras,
  onCriar,
  onAbrir,
  onExcluir,
  onAtualizarPeriodo,
}) {
  const [novoNome, setNovoNome] = useState("");

  const adicionar = () => {
    const nome = novoNome.trim();
    if (!nome) return;
    onCriar(nome);
    setNovoNome("");
  };

  return (
    <div>
      <div className="header-bar" style={{ alignItems: "flex-start", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
          <h1 className="titulo-pagina">{periodoAtivo.nome}</h1>
          <span className="subtle" style={{ marginLeft: "auto" }}>
            {cadeiras.length} cadeira{cadeiras.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Configuração de Data de Início e Fim do Período */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", fontSize: 13 }}>
          <span className="subtle">Duração do período:</span>
          <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span className="subtle">De:</span>
            <input
              type="date"
              className="input"
              style={{ padding: "3px 8px", fontSize: 12 }}
              value={periodoAtivo.dataInicio || ""}
              onChange={(e) =>
                onAtualizarPeriodo && onAtualizarPeriodo(periodoAtivo.id, { dataInicio: e.target.value })
              }
            />
          </label>
          <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span className="subtle">Até:</span>
            <input
              type="date"
              className="input"
              style={{ padding: "3px 8px", fontSize: 12 }}
              value={periodoAtivo.dataFim || ""}
              onChange={(e) =>
                onAtualizarPeriodo && onAtualizarPeriodo(periodoAtivo.id, { dataFim: e.target.value })
              }
            />
          </label>
        </div>
      </div>

      <div className="add-row" style={{ marginTop: 16 }}>
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