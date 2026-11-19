// src/components/PainelRotina.jsx
// Drawer da rotina (Fase 5, ex-PainelCompromisso): nome, resumo (faixa da
// semana, próxima, horas/semana), cor, período e a seção de horários.
import { useState, useEffect, useRef } from "react";
import { Trash2, X } from "lucide-react";
import useListaInterna from "../hooks/useListaInterna";
import { DIAS_FULL } from "../constants";
import AbaHorarios from "./abas/AbaHorarios";
import SeletorCor from "./ui/SeletorCor.jsx";
import ResumoRotina from "./ui/ResumoRotina.jsx";
import { useNavegacaoEnter } from "../hooks/useNavegacaoEnter.js";

const textoHorarioExcluido = (h) => `Horário de ${DIAS_FULL[h.dia] ?? "?"} (${h.inicio}–${h.fim}) excluído`;

export default function PainelRotina({
  rotina,
  periodos = [],
  eventosExcluidos = [],
  onFechar,
  onAtualizar,
  onExcluir,
}) {
  const [nomeEdit, setNomeEdit] = useState(rotina.nome);
  const painelRef = useRef(null);
  useNavegacaoEnter(painelRef);

  // Só ao trocar de rotina (mesmo motivo do PainelCadeira).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setNomeEdit(rotina.nome), [rotina.id]);

  const salvarNome = () => {
    const v = nomeEdit.trim();
    if (v && v !== rotina.nome) onAtualizar({ nome: v });
  };

  /* horários: leem a rotina mais recente; excluir tem "Desfazer" (#18) */
  const {
    adicionar: addHorario,
    remover: rmHorario,
    editar: editHorario,
  } = useListaInterna("horarios", onAtualizar, textoHorarioExcluido);

  return (
    <div className="overlay" onClick={onFechar}>
      <div className="painel-lateral" ref={painelRef} onClick={(e) => e.stopPropagation()}>
        <div className="painel-header">
          <span className="cor-dot" style={{ background: rotina.cor }} />
          <input
            className="painel-title-input"
            value={nomeEdit}
            onChange={(e) => setNomeEdit(e.target.value)}
            onBlur={salvarNome}
          />
          <button className="icon-btn-ghost" onClick={onExcluir} title="Excluir rotina">
            <Trash2 size={15} />
          </button>
          <button className="icon-btn-ghost" onClick={onFechar} title="Fechar">
            <X size={17} />
          </button>
        </div>

        <div className="painel-resumo">
          <ResumoRotina rotina={rotina} eventosExcluidos={eventosExcluidos} />
        </div>

        <div style={{ marginTop: 10 }}>
          <SeletorCor key={rotina.id} valor={rotina.cor} onChange={(cor) => onAtualizar({ cor })} />
        </div>

        <div className="painel-vigencia">
          <span className="subtle painel-vigencia-rotulo">Período</span>
          <select
            className="input"
            value={rotina.periodoId || ""}
            onChange={(e) => {
              if (e.target.value) onAtualizar({ periodoId: e.target.value });
            }}
          >
            {periodos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <span className="subtle painel-vigencia-dica">
            Só aparece na agenda e no calendário quando este período estiver selecionado.
          </span>
        </div>

        <div className="painel-secoes">
          <section className="painel-secao">
            <div className="painel-secao-cabecalho painel-secao-fixo">
              <span>Horários</span>
              <span className="painel-secao-contagem">{rotina.horarios.length}</span>
            </div>
            <div className="painel-secao-corpo">
              <AbaHorarios horarios={rotina.horarios} onAdd={addHorario} onRemover={rmHorario} onEditar={editHorario} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
