// src/components/Sidebar.jsx
import React, { useState, useRef } from "react";
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
  Download,
  Upload,
  LogIn,
  LogOut,
  Check,
  X,
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
  onExportarBackup,
  onImportarBackup,
  user,
  loginWithGoogle,
  logout,
}) {
  const [periodosAberto, setPeriodosAberto] = useState(
    () => lerEstadoInicial().periodosAberto ?? true
  );
  const [mobileAberta, setMobileAberta] = useState(false);
  const inputImportRef = useRef(null);

  // Estados locais para controlar a EDIÇÃO INLINE
  const [editandoId, setEditandoId] = useState(null);
  const [nomeTemp, setNomeTemp] = useState("");

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

  const salvarEdicaoInline = (id) => {
    const nomeLimpo = nomeTemp.trim();
    if (nomeLimpo && onEditarPeriodo) {
      onEditarPeriodo(id, { nome: nomeLimpo });
    }
    setEditandoId(null);
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
              {data.periodos.map((p) => {
                const estaEditando = editandoId === p.id;

                return (
                  <div
                    key={p.id}
                    className={`periodo-item${p.id === periodoAtivo?.id ? " ativo" : ""}`}
                    onClick={() => !estaEditando && onSelecionarPeriodo(p.id)}
                  >
                    {estaEditando ? (
                      /* CAMPO DE EDIÇÃO INLINE */
                      <div style={{ display: "flex", alignItems: "center", gap: 4, width: "100%" }}>
                        <input
                          className="input"
                          style={{ padding: "2px 6px", fontSize: 12, height: 24, flex: 1 }}
                          value={nomeTemp}
                          onChange={(e) => setNomeTemp(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") salvarEdicaoInline(p.id);
                            if (e.key === "Escape") setEditandoId(null);
                          }}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          className="icon-btn-ghost"
                          title="Salvar"
                          onClick={(e) => {
                            e.stopPropagation();
                            salvarEdicaoInline(p.id);
                          }}
                        >
                          <Check size={13} color="#10b981" />
                        </button>
                        <button
                          className="icon-btn-ghost"
                          title="Cancelar"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditandoId(null);
                          }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      /* EXIBIÇÃO NORMAL */
                      <>
                        <span className="periodo-nome">{p.nome}</span>
                        <div className="periodo-acoes">
                          <button
                            className="icon-btn-ghost"
                            title="Renomear"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditandoId(p.id);
                              setNomeTemp(p.nome);
                            }}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            className="icon-btn-ghost"
                            title="Excluir"
                            onClick={(e) => {
                              e.stopPropagation();
                              onExcluirPeriodo(p.id);
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
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

        <div className="sidebar-secao backup-secao">
          <div className="sidebar-secao-label">
            <span>Backup</span>
          </div>
          <button className="nav-btn" onClick={onExportarBackup} title="Baixa um arquivo .json com todos os seus dados">
            <Download size={15} /> Exportar dados
          </button>
          <button className="nav-btn" onClick={() => inputImportRef.current?.click()} title="Restaura dados a partir de um backup .json">
            <Upload size={15} /> Importar dados
          </button>
          <input
            ref={inputImportRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo) onImportarBackup(arquivo);
              e.target.value = "";
            }}
          />
        </div>

        {/* --- Conta / Nuvem & Status --- */}
        <div className="status-footer" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Foto do usuário" style={{ width: 22, height: 22, borderRadius: "50%" }} />
                ) : (
                  <div className="logo-dot" />
                )}
                <span className="subtle" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: 12 }}>
                  {user.displayName || user.email}
                </span>
              </div>
              <button className="icon-btn-ghost" onClick={logout} title="Sair da conta">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button className="btn-secundario" onClick={loginWithGoogle} style={{ width: "100%", padding: "6px 8px", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <LogIn size={14} /> Entrar p/ Sincronizar
            </button>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className={`status-dot ${status}`} />
            <span style={{ fontSize: 11 }}>
              {status === "saved" ? (user ? "Nuvem sincronizada" : "Salvo localmente") : status === "saving" ? "Salvando..." : status === "loading" ? "Carregando..." : "Erro ao salvar"}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}