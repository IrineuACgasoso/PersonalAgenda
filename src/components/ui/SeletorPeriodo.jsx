// src/components/ui/SeletorPeriodo.jsx
import React, { useState } from "react";
import { Plus, Trash2, Edit2, ChevronDown, Check, X } from "lucide-react";

/**
 * Título grande e clicável que mostra o nome do período ativo e, ao ser
 * clicado, abre um dropdown para trocar/renomear/excluir/criar períodos.
 * Pensado para ficar no lugar do <h1 className="titulo-pagina"> da tela
 * de Cadeiras.
 */
export default function SeletorPeriodo({
  periodos,
  periodoAtivo,
  onSelecionar,
  onNovo,
  onAtualizar,
  onExcluir,
}) {
  const [aberto, setAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nomeTemp, setNomeTemp] = useState("");

  const fechar = () => {
    setAberto(false);
    setEditandoId(null);
  };

  const salvarEdicaoInline = (id) => {
    const nomeLimpo = nomeTemp.trim();
    if (nomeLimpo && onAtualizar) {
      onAtualizar(id, { nome: nomeLimpo });
    }
    setEditandoId(null);
  };

  return (
    <div className="periodo-seletor-wrap periodo-seletor-titulo">
      <button
        className="periodo-seletor-btn titulo-pagina-btn"
        onClick={() => setAberto((v) => !v)}
      >
        <span className="periodo-seletor-nome titulo-pagina">
          {periodoAtivo?.nome || "Nenhum período"}
        </span>
        <ChevronDown
          size={20}
          style={{
            transform: aberto ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
            flexShrink: 0,
          }}
        />
      </button>

      {aberto && (
        <>
          <div className="click-fora-overlay" onClick={fechar} />
          <div className="periodo-dropdown">
            <div className="sidebar-secao-label" style={{ padding: "0 6px 8px" }}>
              <span className="sidebar-secao-titulo" style={{ cursor: "default" }}>
                Períodos
              </span>
              <button
                className="icon-btn-sm"
                onClick={() => {
                  onNovo();
                  fechar();
                }}
                title="Novo período"
              >
                <Plus size={14} />
              </button>
            </div>

            {periodos.length === 0 ? (
              <div className="subtle" style={{ padding: "6px 8px 10px" }}>
                Nenhum período criado ainda.
              </div>
            ) : (
              <div className="periodo-lista">
                {periodos.map((p) => {
                  const estaEditando = editandoId === p.id;

                  return (
                    <div
                      key={p.id}
                      className={`periodo-item${p.id === periodoAtivo?.id ? " ativo" : ""}`}
                      onClick={() => {
                        if (estaEditando) return;
                        onSelecionar(p.id);
                        fechar();
                      }}
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
                                onExcluir(p.id);
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
        </>
      )}
    </div>
  );
}