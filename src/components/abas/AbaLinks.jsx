// src/components/cadeira/AbaLinks.jsx
import React, { useState } from "react";
import { Plus, Trash2, Edit2, Link as LinkIcon, ExternalLink, Copy, Check, X, KeyRound } from "lucide-react";
import EstadoVazio from "../ui/EstadoVazio.jsx";

const normalizarUrl = (u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

export default function AbaLinks({ links, onAdd, onRemover, onEditar }) {
  const [tipo, setTipo] = useState("link"); // "link" | "classroom"
  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");
  const [codigoClassroom, setCodigoClassroom] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [arrastando, setArrastando] = useState(false);
  const [copiadoId, setCopiadoId] = useState(null);

  const limpar = () => {
    setTipo("link");
    setTitulo("");
    setUrl("");
    setCodigoClassroom("");
    setEditandoId(null);
  };

  const salvar = () => {
    const t = titulo.trim();
    if (tipo === "classroom") {
      const c = codigoClassroom.trim();
      if (!t || !c) {
        window.alert("Preencha o título e o código do Classroom.");
        return;
      }
      const payload = { titulo: t, codigoClassroom: c, isClassroom: true, url: "" };
      if (editandoId) {
        if (onEditar) onEditar(editandoId, payload);
        else { onRemover(editandoId); onAdd(payload); }
      } else {
        onAdd(payload);
      }
    } else {
      const u = url.trim();
      if (!t || !u) {
        window.alert("Preencha o título e o link.");
        return;
      }
      const payload = { titulo: t, url: normalizarUrl(u), isClassroom: false, codigoClassroom: "" };
      if (editandoId) {
        if (onEditar) onEditar(editandoId, payload);
        else { onRemover(editandoId); onAdd(payload); }
      } else {
        onAdd(payload);
      }
    }
    limpar();
  };

  const iniciarEdicao = (l) => {
    setEditandoId(l.id);
    setTitulo(l.titulo);
    if (l.isClassroom || l.codigoClassroom) {
      setTipo("classroom");
      setCodigoClassroom(l.codigoClassroom || "");
      setUrl("");
    } else {
      setTipo("link");
      setUrl(l.url || "");
      setCodigoClassroom("");
    }
  };

  const copiarCodigo = (e, id, codigo) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(codigo);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastando(false);
    if (tipo === "link") {
      const texto = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
      if (texto) setUrl(texto.trim());
    }
  };

  return (
    <div>
      {/* Seletor do Tipo */}
      <div className="filtros-linha" style={{ marginBottom: 10 }}>
        <button
          type="button"
          className={`filtro-chip${tipo === "link" ? " ativo" : ""}`}
          onClick={() => setTipo("link")}
        >
          <LinkIcon size={13} /> Link Web
        </button>
        <button
          type="button"
          className={`filtro-chip${tipo === "classroom" ? " ativo" : ""}`}
          onClick={() => setTipo("classroom")}
        >
          <KeyRound size={13} /> Código Classroom
        </button>
      </div>

      <div
        className={`drop-zone${arrastando ? " ativa" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={handleDrop}
      >
        <input
          className="input"
          placeholder={tipo === "classroom" ? "ex: Google Classroom da Turma" : "Título, ex: Slides da aula 3"}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />

        {tipo === "classroom" ? (
          <input
            className="input"
            style={{ marginTop: 8 }}
            placeholder="Digite o código da turma (ex: 3x5abc)"
            value={codigoClassroom}
            onChange={(e) => setCodigoClassroom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && salvar()}
          />
        ) : (
          <input
            className="input"
            style={{ marginTop: 8 }}
            placeholder="Cole ou arraste o link aqui (ou digite)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && salvar()}
          />
        )}

        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <button className="btn-primario full" onClick={salvar}>
            {editandoId ? <Check size={15} /> : <Plus size={15} />}
            {editandoId ? "Salvar edição" : tipo === "classroom" ? "Adicionar código" : "Adicionar link"}
          </button>
          {editandoId && (
            <button className="btn-secundario" onClick={limpar} title="Cancelar edição">
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="lista-itens">
        {links.length === 0 && <EstadoVazio texto="Nenhum link ou código cadastrado" pequeno />}
        {[...links]
          .sort((a, b) => {
            const aClassroom = a.isClassroom || !!a.codigoClassroom;
            const bClassroom = b.isClassroom || !!b.codigoClassroom;
            return aClassroom === bClassroom ? 0 : aClassroom ? -1 : 1;
          })
          .map((l) => {
          const ehClassroom = l.isClassroom || !!l.codigoClassroom;

          if (ehClassroom) {
            return (
              <div key={l.id} className="link-item" style={{ cursor: "default" }}>
                <KeyRound size={14} style={{ opacity: 0.6, flexShrink: 0, color: "#10b981" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="item-linha-titulo">{l.titulo}</div>
                  <div className="subtle" style={{ fontFamily: "monospace", fontSize: 13, color: "#10b981" }}>
                    Código: <strong>{l.codigoClassroom}</strong>
                  </div>
                </div>
                <button
                  className="btn-secundario"
                  style={{ padding: "4px 8px", fontSize: 11 }}
                  onClick={(e) => copiarCodigo(e, l.id, l.codigoClassroom)}
                  title="Copiar código"
                >
                  {copiadoId === l.id ? <Check size={12} /> : <Copy size={12} />}
                  {copiadoId === l.id ? " Copiado!" : " Copiar"}
                </button>
                <button
                  className="icon-btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    iniciarEdicao(l);
                  }}
                  title="Editar"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  className="icon-btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Excluir o código do Classroom "${l.titulo}"?`)) {
                      onRemover(l.id);
                    }
                  }}
                  title="Excluir"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          }

          return (
            <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="link-item">
              <LinkIcon size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="item-linha-titulo">{l.titulo}</div>
                <div className="subtle link-item-url">{l.url}</div>
              </div>
              <ExternalLink size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
              <button
                className="icon-btn-ghost"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  iniciarEdicao(l);
                }}
                title="Editar link"
              >
                <Edit2 size={13} />
              </button>
              <button
                className="icon-btn-ghost"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (window.confirm(`Excluir o link "${l.titulo}"?`)) {
                    onRemover(l.id);
                  }
                }}
                title="Excluir link"
              >
                <Trash2 size={13} />
              </button>
            </a>
          );
        })}
      </div>
    </div>
  );
}