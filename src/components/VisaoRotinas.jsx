// src/components/VisaoRotinas.jsx
// Rotinas (Fase 5, ex-"Compromissos" semanais): blocos com dia da semana e
// horário fixos (academia, inglês…). Não pertencem a período (#56): cada uma
// tem vigência própria opcional. Cada card mostra a faixa da semana, a
// próxima ocorrência e as horas por semana.
import { useState, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import EstadoVazio from "./ui/EstadoVazio.jsx";
import ResumoRotina from "./ui/ResumoRotina.jsx";
import { useNavegacaoEnter } from "../hooks/useNavegacaoEnter.js";

export default function VisaoRotinas({ rotinas, eventosExcluidos = [], onCriar, onAbrir, onExcluir }) {
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
      <div className="header-bar">
        <h1 className="titulo-pagina">Rotinas</h1>
        <span className="subtle" style={{ marginLeft: "auto" }}>
          {rotinas.length} rotina{rotinas.length !== 1 ? "s" : ""}
        </span>
      </div>
      <p className="subtle pagina-descricao">
        Atividades de toda semana com horário fixo. Algo que acontece uma vez com hora marcada é um compromisso.
      </p>

      <div className="add-row" ref={addRowRef} style={{ marginTop: 12 }}>
        <input
          className="input"
          placeholder="Nome da rotina, ex: Academia, Inglês..."
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
        />
        <button className="btn-primario" onClick={adicionar}>
          <Plus size={16} /> Adicionar
        </button>
      </div>

      {rotinas.length === 0 ? (
        <EstadoVazio texto="Nenhuma rotina cadastrada ainda" />
      ) : (
        <div className="grid-cadeiras">
          {rotinas.map((r) => (
            <div key={r.id} className="card-cadeira" style={{ "--cor-card": r.cor }} onClick={() => onAbrir(r.id)}>
              <div className="card-faixa" style={{ background: r.cor }} />
              <div className="card-body">
                <div className="card-title-row">
                  <span className="card-title">{r.nome}</span>
                  <button
                    className="icon-btn-ghost"
                    title="Excluir rotina"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExcluir(r.id);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <ResumoRotina rotina={r} eventosExcluidos={eventosExcluidos} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
