// src/components/PainelRotina.jsx
// Drawer da rotina (Fase 5, ex-PainelCompromisso): nome, resumo (faixa da
// semana, próxima, horas/semana), cor, vigência opcional (#56) e horários.
import { useState, useEffect, useRef } from "react";
import { Trash2, X } from "lucide-react";
import useListaInterna from "../hooks/useListaInterna";
import { DIAS_FULL } from "../constants";
import AbaHorarios from "./abas/AbaHorarios";
import SeletorCor from "./ui/SeletorCor.jsx";
import ResumoRotina from "./ui/ResumoRotina.jsx";
import CampoVigencia from "./ui/CampoVigencia.jsx";
import { useNavegacaoEnter } from "../hooks/useNavegacaoEnter.js";

const textoHorarioExcluido = (h) => `Horário de ${DIAS_FULL[h.dia] ?? "?"} (${h.inicio}–${h.fim}) excluído`;

export default function PainelRotina({ rotina, eventosExcluidos = [], onFechar, onAtualizar, onExcluir }) {
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

        {/* Vigência própria (#56): a rotina não pertence mais a um período */}
        <CampoVigencia
          key={rotina.id}
          item={rotina}
          onAtualizar={onAtualizar}
          rotulo="Período da rotina"
          dicaComDatas="Fora dessas datas, a rotina não aparece no calendário nem na agenda."
          dicaSemDatas="Sem datas: a rotina vale todas as semanas, sem fim."
        />

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
