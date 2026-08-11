import React, { useState } from "react";
import { Plus, Trash2, Link as LinkIcon, ExternalLink } from "lucide-react";
import EstadoVazio from "../ui/EstadoVazio.jsx";

const normalizarUrl = (u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

export default function AbaLinks({ links, onAdd, onRemover }) {
  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");
  const [arrastando, setArrastando] = useState(false);

  const adicionar = () => {
    const t = titulo.trim();
    const u = url.trim();
    if (!t || !u) {
      window.alert("Preencha o título e o link.");
      return;
    }
    onAdd({ titulo: t, url: normalizarUrl(u) });
    setTitulo("");
    setUrl("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastando(false);
    const texto = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    if (texto) setUrl(texto.trim());
  };

  const handlePaste = (e) => {
    const texto = e.clipboardData.getData("text");
    if (texto && !url) setUrl(texto.trim());
  };

  return (
    <div>
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
          placeholder="Título, ex: Slides da aula 3"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <input
          className="input"
          style={{ marginTop: 8 }}
          placeholder="Cole ou arraste o link aqui (ou digite)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => e.key === "Enter" && adicionar()}
        />
        <button className="btn-primario full" onClick={adicionar}>
          <Plus size={15} /> Adicionar link
        </button>
      </div>

      <div className="lista-itens">
        {links.length === 0 && <EstadoVazio texto="Nenhum link cadastrado" pequeno />}
        {links.map((l) => (
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
                onRemover(l.id);
              }}
            >
              <Trash2 size={13} />
            </button>
          </a>
        ))}
      </div>
    </div>
  );
}