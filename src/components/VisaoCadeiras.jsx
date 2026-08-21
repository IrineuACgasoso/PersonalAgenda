// src/components/VisaoCadeiras.jsx
import React, { useState, useEffect } from "react";
import { Plus, Trash2, Clock, Link as LinkIcon, Calendar, Check } from "lucide-react";
import EstadoVazio from "./ui/EstadoVazio.jsx";
import SeletorPeriodo from "./ui/SeletorPeriodo.jsx";

export default function VisaoCadeiras({
  periodos,
  periodoAtivo,
  cadeiras,
  onCriar,
  onAbrir,
  onExcluir,
  onSelecionarPeriodo,
  onNovoPeriodo,
  onAtualizarPeriodo,
  onExcluirPeriodo,
}) {
  const [novoNome, setNovoNome] = useState("");
  
  // Estado local para controlar as datas sem bug de re-render
  const [dataInicio, setDataInicio] = useState(periodoAtivo?.dataInicio || "");
  const [dataFim, setDataFim] = useState(periodoAtivo?.dataFim || "");
  const [salvo, setSalvo] = useState(false);

  // Sincroniza o estado local quando troca de período
  useEffect(() => {
    setDataInicio(periodoAtivo?.dataInicio || "");
    setDataFim(periodoAtivo?.dataFim || "");
    setSalvo(false);
  }, [periodoAtivo?.id]);

  const adicionar = () => {
    const nome = novoNome.trim();
    if (!nome) return;
    onCriar(nome);
    setNovoNome("");
  };

  const salvarDatas = () => {
    if (onAtualizarPeriodo && periodoAtivo) {
      onAtualizarPeriodo(periodoAtivo.id, { dataInicio, dataFim });
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2000);
    }
  };

  return (
    <div>
      <div className="header-bar" style={{ alignItems: "flex-start", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
          <SeletorPeriodo
            periodos={periodos}
            periodoAtivo={periodoAtivo}
            onSelecionar={onSelecionarPeriodo}
            onNovo={onNovoPeriodo}
            onAtualizar={onAtualizarPeriodo}
            onExcluir={onExcluirPeriodo}
          />
          <span className="subtle" style={{ marginLeft: "auto" }}>
            {cadeiras.length} cadeira{cadeiras.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Seleção de Datas com Botão de Salvar */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: 13 }}>
          <span className="subtle">Duração do período:</span>
          
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span className="subtle">De:</span>
            <input
              type="date"
              className="input"
              style={{ padding: "4px 8px", fontSize: 12, width: "auto" }}
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </label>

          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span className="subtle">Até:</span>
            <input
              type="date"
              className="input"
              style={{ padding: "4px 8px", fontSize: 12, width: "auto" }}
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </label>

          <button
            type="button"
            className="btn-secundario"
            style={{ padding: "4px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
            onClick={salvarDatas}
          >
            <Check size={13} color={salvo ? "#10b981" : "currentColor"} />
            {salvo ? "Salvo!" : "Salvar datas"}
          </button>
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