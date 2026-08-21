// src/components/Sidebar.jsx
import React, { useState, useRef } from "react";
import {
  BookOpen,
  Calendar,
  CalendarClock,
  ListChecks,
  LayoutGrid,
  Menu,
  Download,
  Upload,
  LogIn,
  LogOut,
} from "lucide-react";

export default function Sidebar({
  aba,
  setAba,
  status,
  onExportarBackup,
  onImportarBackup,
  user,
  loginWithGoogle,
  logout,
}) {
  const [mobileAberta, setMobileAberta] = useState(false);
  const inputImportRef = useRef(null);

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

        <div className="sidebar-secao">
          <div className="sidebar-secao-label">
            <span>Visão</span>
          </div>
          <button className={`nav-btn${aba === "cadeiras" ? " ativo" : ""}`} onClick={() => irPara("cadeiras")}>
            <BookOpen size={15} /> Cadeiras
          </button>
          <button className={`nav-btn${aba === "compromissos" ? " ativo" : ""}`} onClick={() => irPara("compromissos")}>
            <CalendarClock size={15} /> Compromissos
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