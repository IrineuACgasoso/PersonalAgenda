import React from "react";
import { Plus, Trash2, Edit2, BookOpen, Calendar } from "lucide-react";

export default function Sidebar({
  data,
  periodoAtivo,
  onSelecionarPeriodo,
  onNovoPeriodo,
  onEditarPeriodo,
  onExcluirPeriodo,
  aba,
  setAba,
  status,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-dot" />
        <span className="logo-text">Painel acadêmico</span>
      </div>

      <div className="sidebar-secao">
        <div className="sidebar-secao-label">
          <span>Períodos</span>
          <button className="icon-btn-sm" onClick={onNovoPeriodo} title="Novo período">
            <Plus size={14} />
          </button>
        </div>
        <div className="periodo-lista">
          {data.periodos.map((p) => (
            <div
              key={p.id}
              className={`periodo-item${p.id === periodoAtivo?.id ? " ativo" : ""}`}
              onClick={() => onSelecionarPeriodo(p.id)}
            >
              <span className="periodo-nome">{p.nome}</span>
              <div className="periodo-acoes">
                <button
                  className="icon-btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditarPeriodo(p.id);
                  }}
                >
                  <Edit2 size={12} />
                </button>
                <button
                  className="icon-btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExcluirPeriodo(p.id);
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-secao">
        <div className="sidebar-secao-label">
          <span>Visão</span>
        </div>
        <button className={`nav-btn${aba === "cadeiras" ? " ativo" : ""}`} onClick={() => setAba("cadeiras")}>
          <BookOpen size={15} /> Cadeiras
        </button>
        <button className={`nav-btn${aba === "agenda" ? " ativo" : ""}`} onClick={() => setAba("agenda")}>
          <Calendar size={15} /> Agenda da semana
        </button>
      </div>

      <div className="status-footer">
        <span className={`status-dot ${status}`} />
        {status === "saved" ? "Tudo salvo" : status === "saving" ? "Salvando..." : "Erro ao salvar"}
      </div>
    </aside>
  );
}