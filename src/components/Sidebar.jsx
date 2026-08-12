import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  BookOpen,
  Calendar,
  ChevronRight,
  ListChecks,
  LayoutGrid,
  Menu,
} from "lucide-react";
import { SIDEBAR_STATE_KEY } from "../constants.js";

function lerEstadoInicial() {
  try {
    const raw = localStorage.getItem(SIDEBAR_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

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
  const [periodosAberto, setPeriodosAberto] = useState(
    () => lerEstadoInicial().periodosAberto ?? true
  );
  const [mobileAberta, setMobileAberta] = useState(false);

  const alternarPeriodos = () => {
    const proximo = !periodosAberto;
    setPeriodosAberto(proximo);
    try {
      localStorage.setItem(
        SIDEBAR_STATE_KEY,
        JSON.stringify({ ...lerEstadoInicial(), periodosAberto: proximo })
      );
    } catch {
      /* ignora erro de storage indisponível */
    }
  };

  const irPara = (novaAba) => {
    setAba(novaAba);
    setMobileAberta(false);
  };

  return (
    <>
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileAberta((v) => !v)}
        aria-label="Abrir menu"
      >
        <Menu size={18} />
      </button>

      {mobileAberta && (
        <div className="sidebar-scrim" onClick={() => setMobileAberta(false)} />
      )}

      <aside className={`sidebar${mobileAberta ? " mobile-aberta" : ""}`}>
        <div className="sidebar-header">
          <div className="logo-dot" />
          <span className="logo-text">Minha agenda</span>
        </div>

        <div className={`sidebar-secao periodos-secao${periodosAberto ? "" : " recolhida"}`}>
          <div className="sidebar-secao-label">
            <button
              className="chevron-btn"
              onClick={alternarPeriodos}
              title={periodosAberto ? "Recolher períodos" : "Expandir períodos"}
            >
              <ChevronRight
                size={13}
                style={{
                  transform: periodosAberto ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.15s",
                }}
              />
            </button>
            <span className="sidebar-secao-titulo" onClick={alternarPeriodos}>
              Período{periodosAberto ? "s" : ""}
            </span>
            {periodosAberto && (
              <button className="icon-btn-sm" onClick={onNovoPeriodo} title="Novo período">
                <Plus size={14} />
              </button>
            )}
          </div>
          {periodosAberto && (
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
          )}
        </div>

        <div className="sidebar-secao">
          <div className="sidebar-secao-label">
            <span>Visão</span>
          </div>
          <button className={`nav-btn${aba === "cadeiras" ? " ativo" : ""}`} onClick={() => irPara("cadeiras")}>
            <BookOpen size={15} /> Cadeiras
          </button>
          <button className={`nav-btn${aba === "afazeres" ? " ativo" : ""}`} onClick={() => irPara("afazeres")}>
            <ListChecks size={15} /> Afazeres
          </button>
          <button className={`nav-btn${aba === "agenda" ? " ativo" : ""}`} onClick={() => irPara("agenda")}>
            <Calendar size={15} /> Agenda da semana
          </button>
        </div>

        <div className="sidebar-secao">
          <div className="sidebar-secao-label">
            <span>Visão geral</span>
          </div>
          <button className={`nav-btn${aba === "visaogeral" ? " ativo" : ""}`} onClick={() => irPara("visaogeral")}>
            <LayoutGrid size={15} /> Calendário geral
          </button>
        </div>

        <div className="status-footer">
          <span className={`status-dot ${status}`} />
          {status === "saved" ? "Tudo salvo" : status === "saving" ? "Salvando..." : "Erro ao salvar"}
        </div>
      </aside>
    </>
  );
}
