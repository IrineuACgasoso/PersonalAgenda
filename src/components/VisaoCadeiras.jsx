// src/components/VisaoCadeiras.jsx
import { useState, useRef } from "react";
import { Plus, Trash2, Clock, Link as LinkIcon, Calendar, CalendarRange } from "lucide-react";
import EstadoVazio from "./ui/EstadoVazio.jsx";
import SeletorPeriodo from "./ui/SeletorPeriodo.jsx";
import { useNavegacaoEnter } from "../hooks/useNavegacaoEnter.js";
import { textoVigencia } from "../utils/calendario.js";

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
  const addRowRef = useRef(null);
  useNavegacaoEnter(addRowRef);

  const adicionar = () => {
    const nome = novoNome.trim();
    if (!nome) return;
    onCriar(nome);
    setNovoNome("");
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
      </div>

      <div className="add-row" ref={addRowRef} style={{ marginTop: 16 }}>
        <input
          className="input"
          placeholder="Nome da cadeira, ex: Cálculo II"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
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
            <div key={c.id} className="card-cadeira" style={{ "--cor-card": c.cor }} onClick={() => onAbrir(c.id)}>
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
                  <span>
                    {c.horarios.length} horário{c.horarios.length !== 1 ? "s" : ""}
                  </span>
                  <span className="separador">·</span>
                  <LinkIcon size={12} />
                  <span>
                    {c.links.length} link{c.links.length !== 1 ? "s" : ""}
                  </span>
                  <span className="separador">·</span>
                  <Calendar size={12} />
                  <span>
                    {c.datas.length} data{c.datas.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {/* Vigência própria da cadeira (#19); muda-se no drawer. */}
                <div className="card-meta card-vigencia">
                  <CalendarRange size={12} />
                  <span>{textoVigencia(c) || "Sem início/fim definidos"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
