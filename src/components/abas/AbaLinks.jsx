// src/components/abas/AbaLinks.jsx
// Links web e códigos do Classroom da cadeira (drawer). Os códigos ficam no
// topo; os links aparecem na ordem salva — a mesma da tela da cadeira — e dá
// para mudar arrastando pela alça (mouse ou toque) ou com ↑/↓ na alça.
import { useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Link as LinkIcon,
  ExternalLink,
  Copy,
  Check,
  X,
  KeyRound,
  GripVertical,
} from "lucide-react";
import EstadoVazio from "../ui/EstadoVazio.jsx";
import useDialogos from "../../hooks/useDialogos";
import useCopiarTexto from "../../hooks/useCopiarTexto.js";
import { normalizarUrl, hrefSeguro, ehClassroom } from "../../utils/links.js";

// Arrasto por pointer events (o drag-and-drop nativo do HTML não funciona no
// toque do celular). Os outros itens não se mexem durante o arrasto: o alvo
// é o item sob o dedo, marcado com uma linha; soltar grava UMA vez
// (`onReordenar(idOrigem, idAlvo)` ⇒ um único onAtualizar).
function useArrastoLista(listaRef, onReordenar) {
  const [arrasto, setArrasto] = useState(null); // { id, dy, alvoId }
  const atual = useRef(null);

  const iniciar = (e, id) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const alca = e.currentTarget;
    const inicioY = e.clientY;
    alca.setPointerCapture?.(e.pointerId);
    atual.current = { id, dy: 0, alvoId: id };
    setArrasto(atual.current);

    const mover = (ev) => {
      let alvoId = atual.current.alvoId;
      for (const el of listaRef.current?.querySelectorAll("[data-arrastavel]") || []) {
        if (el.dataset.arrastavel === id) continue;
        const r = el.getBoundingClientRect();
        if (ev.clientY >= r.top && ev.clientY <= r.bottom) alvoId = el.dataset.arrastavel;
      }
      atual.current = { id, dy: ev.clientY - inicioY, alvoId };
      setArrasto(atual.current);
    };
    const soltar = () => {
      alca.removeEventListener("pointermove", mover);
      alca.removeEventListener("pointerup", soltar);
      alca.removeEventListener("pointercancel", soltar);
      const fim = atual.current;
      atual.current = null;
      setArrasto(null);
      if (fim && fim.alvoId !== fim.id) onReordenar(fim.id, fim.alvoId);
    };
    alca.addEventListener("pointermove", mover);
    alca.addEventListener("pointerup", soltar);
    alca.addEventListener("pointercancel", soltar);
  };

  return { arrasto, iniciar };
}

export default function AbaLinks({ links, onAdd, onRemover, onEditar, onReordenar }) {
  const { avisar } = useDialogos();
  const { copiar, copiadoId } = useCopiarTexto();
  const listaRef = useRef(null);
  const [tipo, setTipo] = useState("link"); // "link" | "classroom"
  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");
  const [codigoClassroom, setCodigoClassroom] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [arrastando, setArrastando] = useState(false);

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
        avisar("Preencha o título e o código do Classroom.", { titulo: "Faltam dados" });
        return;
      }
      const payload = { titulo: t, codigoClassroom: c, isClassroom: true, url: "" };
      if (editandoId) {
        if (onEditar) onEditar(editandoId, payload);
        else {
          onRemover(editandoId);
          onAdd(payload);
        }
      } else {
        onAdd(payload);
      }
    } else {
      const u = url.trim();
      if (!t || !u) {
        avisar("Preencha o título e o link.", { titulo: "Faltam dados" });
        return;
      }
      const payload = { titulo: t, url: normalizarUrl(u), isClassroom: false, codigoClassroom: "" };
      if (editandoId) {
        if (onEditar) onEditar(editandoId, payload);
        else {
          onRemover(editandoId);
          onAdd(payload);
        }
      } else {
        onAdd(payload);
      }
    }
    limpar();
  };

  const iniciarEdicao = (l) => {
    setEditandoId(l.id);
    setTitulo(l.titulo);
    if (ehClassroom(l)) {
      setTipo("classroom");
      setCodigoClassroom(l.codigoClassroom || "");
      setUrl("");
    } else {
      setTipo("link");
      setUrl(l.url || "");
      setCodigoClassroom("");
    }
  };

  // #28: falha da área de transferência mostra o código num aviso (useCopiarTexto).
  const copiarCodigo = (e, id, codigo) => {
    e.preventDefault();
    e.stopPropagation();
    copiar(id, codigo);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastando(false);
    if (tipo === "link") {
      const texto = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
      if (texto) setUrl(texto.trim());
    }
  };

  const { arrasto, iniciar: iniciarArrasto } = useArrastoLista(listaRef, (de, para) => onReordenar?.(de, para));
  const codigos = links.filter(ehClassroom);
  const web = links.filter((l) => !ehClassroom(l));
  const indiceArrastado = arrasto ? web.findIndex((l) => l.id === arrasto.id) : -1;

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

      <div className="lista-itens" ref={listaRef}>
        {links.length === 0 && <EstadoVazio texto="Nenhum link ou código cadastrado" pequeno />}
        {codigos.map((l) => (
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
                onRemover(l.id);
              }}
              title="Excluir"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}

        {web.map((l, i) => {
          const sendoArrastado = arrasto?.id === l.id;
          const ehAlvo = arrasto && !sendoArrastado && arrasto.alvoId === l.id;
          const classes = [
            "link-item",
            sendoArrastado ? "arrastando" : "",
            ehAlvo ? (i > indiceArrastado ? "alvo-abaixo" : "alvo-acima") : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <a
              key={l.id}
              href={hrefSeguro(l.url)}
              target="_blank"
              rel="noopener noreferrer"
              className={classes}
              data-arrastavel={l.id}
              style={sendoArrastado ? { transform: `translateY(${arrasto.dy}px)` } : undefined}
            >
              {web.length > 1 && onReordenar && (
                <button
                  type="button"
                  className="link-alca"
                  title="Arraste para mudar a ordem (ou use ↑/↓)"
                  aria-label={`Mover ${l.titulo}`}
                  onPointerDown={(e) => iniciarArrasto(e, l.id)}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onKeyDown={(e) => {
                    const vizinho = e.key === "ArrowUp" ? web[i - 1] : e.key === "ArrowDown" ? web[i + 1] : null;
                    if (!vizinho) return;
                    e.preventDefault();
                    onReordenar(l.id, vizinho.id);
                  }}
                >
                  <GripVertical size={14} />
                </button>
              )}
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
                  onRemover(l.id);
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
