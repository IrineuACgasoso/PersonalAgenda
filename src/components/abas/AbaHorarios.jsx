// src/components/cadeira/AbaHorarios.jsx
import { useState } from "react";
import { Plus, Trash2, Edit2, Clock, MapPin, Check, X, AlertTriangle } from "lucide-react";
import { DIAS_FULL } from "../../constants.js";
import EstadoVazio from "../ui/EstadoVazio.jsx";
import useDialogos from "../../hooks/useDialogos";
import { avisoDeConflitos } from "../../utils/conflitos.js";

// `conflitosDe(horario)` (opcional, #32): com quem o horário choca. Só avisa —
// salvar continua liberado (às vezes o choque é proposital).
export default function AbaHorarios({ horarios, onAdd, onRemover, onEditar, conflitosDe, rotuloMesmoDono }) {
  const { avisar } = useDialogos();
  const [dia, setDia] = useState(0);
  const [inicio, setInicio] = useState("08:00");
  const [fim, setFim] = useState("10:00");
  const [local, setLocal] = useState("");
  const [editandoId, setEditandoId] = useState(null);

  const limpar = () => {
    setDia(0);
    setInicio("08:00");
    setFim("10:00");
    setLocal("");
    setEditandoId(null);
  };

  const salvar = () => {
    if (!inicio || !fim || inicio >= fim) {
      avisar("Verifique o horário: o início precisa ser antes do fim.", { titulo: "Horário inválido" });
      return;
    }
    if (editandoId) {
      if (onEditar) {
        onEditar(editandoId, { dia, inicio, fim, local: local.trim() });
      } else {
        onRemover(editandoId);
        onAdd({ dia, inicio, fim, local: local.trim() });
      }
    } else {
      onAdd({ dia, inicio, fim, local: local.trim() });
    }
    limpar();
  };

  const avisoDe = (h) => (conflitosDe ? avisoDeConflitos(conflitosDe(h), rotuloMesmoDono) : "");
  // Rascunho do formulário: avisa ANTES de salvar (o horário em edição se
  // ignora pelo id). Com o formulário ainda nos valores iniciais, fica quieto:
  // senão abriria o drawer já acusando "Seg 08:00–10:00".
  const intocado = !editandoId && dia === 0 && inicio === "08:00" && fim === "10:00";
  const avisoRascunho = !intocado && inicio && fim && inicio < fim ? avisoDe({ id: editandoId, dia, inicio, fim }) : "";

  const iniciarEdicao = (h) => {
    setEditandoId(h.id);
    setDia(h.dia);
    setInicio(h.inicio);
    setFim(h.fim);
    setLocal(h.local || "");
  };

  return (
    <div>
      <div className="form-grid">
        <select className="input" value={dia} onChange={(e) => setDia(Number(e.target.value))}>
          {DIAS_FULL.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
        <input className="input" type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        <input className="input" type="time" value={fim} onChange={(e) => setFim(e.target.value)} />
      </div>
      <div className="form-grid campo-mais-botao">
        <input
          className="input"
          placeholder="Local ou link da sala (opcional)"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
        />
        <button className="btn-primario" onClick={salvar}>
          {editandoId ? <Check size={15} /> : <Plus size={15} />}
          {editandoId ? "Salvar" : "Adicionar"}
        </button>
        {editandoId && (
          <button className="btn-secundario" onClick={limpar} title="Cancelar edição">
            <X size={15} />
          </button>
        )}
      </div>
      {avisoRascunho && (
        <p className="aviso-conflito" role="status">
          <AlertTriangle size={13} /> {avisoRascunho}
        </p>
      )}

      <div className="lista-itens">
        {horarios.length === 0 && <EstadoVazio texto="Nenhum horário cadastrado" pequeno />}
        {[...horarios]
          .sort((a, b) => a.dia - b.dia || a.inicio.localeCompare(b.inicio))
          .map((h) => {
            const aviso = avisoDe(h);
            return (
              <div key={h.id} className={`item-linha${aviso ? " com-conflito" : ""}`}>
                <Clock size={14} style={{ opacity: 0.6 }} />
                <div style={{ flex: 1 }}>
                  <div className="item-linha-titulo">
                    {DIAS_FULL[h.dia]} · {h.inicio}–{h.fim}
                  </div>
                  {h.local && (
                    <div className="subtle">
                      <MapPin size={11} style={{ verticalAlign: "-1px", marginRight: 3 }} />
                      {h.local}
                    </div>
                  )}
                  {aviso && (
                    <div className="aviso-conflito">
                      <AlertTriangle size={11} /> {aviso}
                    </div>
                  )}
                </div>
                <button className="icon-btn-ghost" onClick={() => iniciarEdicao(h)} title="Editar horário">
                  <Edit2 size={13} />
                </button>
                <button className="icon-btn-ghost" onClick={() => onRemover(h.id)} title="Excluir horário">
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}
