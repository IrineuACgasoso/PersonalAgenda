import { useState, useEffect, useRef } from "react";
import { Trash2, X } from "lucide-react";
import { dataCompleta, erroDeVigencia } from "../utils/calendario";
import useListaInterna from "../hooks/useListaInterna";
import { DIAS_FULL } from "../constants";
import AbaHorarios from "./abas/AbaHorarios";
import AbaLinks from "./abas/AbaLinks";
import AbaDatas from "./abas/AbaDatas";
import SeletorCor from "./ui/SeletorCor.jsx";
import { useNavegacaoEnter } from "../hooks/useNavegacaoEnter.js";

const textoHorarioExcluido = (h) => `Horário de ${DIAS_FULL[h.dia] ?? "?"} (${h.inicio}–${h.fim}) excluído`;

export default function PainelCadeira({ cadeira, onFechar, onAtualizar, onExcluir }) {
  const [subaba, setSubaba] = useState("horarios");
  const [nomeEdit, setNomeEdit] = useState(cadeira.nome);
  const painelRef = useRef(null);
  useNavegacaoEnter(painelRef);

  // Só ao trocar de cadeira: reagir a `cadeira.nome` apagaria o que está
  // sendo digitado a cada sync vindo de outro aparelho.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setNomeEdit(cadeira.nome), [cadeira.id]);

  // Vigência (#19): estado local para o input não "pular" enquanto digita.
  // Grava a cada data completa e válida; fim antes do início mostra o erro
  // embaixo e não grava (sem diálogo: o valor pode estar no meio da edição).
  const vigenciaDa = (c) => ({ inicio: c.dataInicio || "", fim: c.dataFim || "" });
  const [vigencia, setVigencia] = useState(() => vigenciaDa(cadeira));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setVigencia(vigenciaDa(cadeira)), [cadeira.id]);
  const erroVigencia = erroDeVigencia(vigencia.inicio, vigencia.fim);

  const alterarVigencia = (campo, valor) => {
    const nova = { ...vigencia, [campo]: valor };
    setVigencia(nova);
    if (valor && !dataCompleta(valor)) return;
    if (erroDeVigencia(nova.inicio, nova.fim)) return;
    const atual = vigenciaDa(cadeira);
    if (nova.inicio === atual.inicio && nova.fim === atual.fim) return;
    onAtualizar({ dataInicio: nova.inicio, dataFim: nova.fim });
  };

  const salvarNome = () => {
    const v = nomeEdit.trim();
    if (v && v !== cadeira.nome) onAtualizar({ nome: v });
  };

  /* listas internas: leem a cadeira mais recente; excluir tem "Desfazer" (#18) */
  const horarios = useListaInterna("horarios", onAtualizar, textoHorarioExcluido);
  const links = useListaInterna("links", onAtualizar, (l) => `Link "${l.titulo}" excluído`);
  const datas = useListaInterna("datas", onAtualizar, (d) => `Data "${d.titulo}" excluída`);
  const { adicionar: addHorario, remover: rmHorario, editar: editHorario } = horarios;
  const { adicionar: addLink, remover: rmLink, editar: editLink } = links;
  const { adicionar: addData, remover: rmData, editar: editData } = datas;

  return (
    <div className="overlay" onClick={onFechar}>
      <div className="painel-lateral" ref={painelRef} onClick={(e) => e.stopPropagation()}>
        <div className="painel-header">
          <span className="cor-dot" style={{ background: cadeira.cor }} />
          <input
            className="painel-title-input"
            value={nomeEdit}
            onChange={(e) => setNomeEdit(e.target.value)}
            onBlur={salvarNome}
          />
          <button className="icon-btn-ghost" onClick={onExcluir} title="Excluir cadeira">
            <Trash2 size={15} />
          </button>
          <button className="icon-btn-ghost" onClick={onFechar}>
            <X size={17} />
          </button>
        </div>

        {/* SELETOR DE COR (HEXADECIMAL LIVRE) */}
        <div style={{ marginTop: 10 }}>
          <SeletorCor key={cadeira.id} valor={cadeira.cor} onChange={(cor) => onAtualizar({ cor })} />
        </div>

        {/* VIGÊNCIA DA CADEIRA (#19): fora dela, aulas e avaliações não aparecem no calendário */}
        <div className="painel-vigencia">
          <span className="subtle painel-vigencia-rotulo">Vigência</span>
          <div className="painel-vigencia-campos">
            {[
              ["inicio", "De"],
              ["fim", "Até"],
            ].map(([campo, rotulo]) => (
              <label key={campo} className="painel-vigencia-campo">
                <span className="subtle">{rotulo}</span>
                <input
                  type="date"
                  className="input"
                  value={vigencia[campo]}
                  max={campo === "inicio" ? vigencia.fim || undefined : undefined}
                  min={campo === "fim" ? vigencia.inicio || undefined : undefined}
                  onChange={(e) => alterarVigencia(campo, e.target.value)}
                />
                {vigencia[campo] && (
                  <button
                    type="button"
                    className="icon-btn-ghost"
                    title={`Limpar data de ${campo === "inicio" ? "início" : "fim"}`}
                    onClick={() => alterarVigencia(campo, "")}
                  >
                    <X size={13} />
                  </button>
                )}
              </label>
            ))}
          </div>
          {erroVigencia ? (
            <span className="painel-vigencia-erro">{erroVigencia}</span>
          ) : (
            <span className="subtle painel-vigencia-dica">
              {vigencia.inicio || vigencia.fim
                ? "Fora dessas datas, as aulas e avaliações não aparecem no calendário."
                : "Sem datas: as aulas aparecem em todas as semanas."}
            </span>
          )}
        </div>

        <div className="painel-tabs">
          <button
            className={`painel-tab ${subaba === "horarios" ? "ativa" : ""}`}
            onClick={() => setSubaba("horarios")}
          >
            Horários
          </button>
          <button className={`painel-tab ${subaba === "links" ? "ativa" : ""}`} onClick={() => setSubaba("links")}>
            Links e materiais
          </button>
          <button className={`painel-tab ${subaba === "datas" ? "ativa" : ""}`} onClick={() => setSubaba("datas")}>
            Datas importantes
          </button>
        </div>

        <div className="painel-conteudo">
          {subaba === "horarios" && (
            <AbaHorarios horarios={cadeira.horarios} onAdd={addHorario} onRemover={rmHorario} onEditar={editHorario} />
          )}
          {subaba === "links" && (
            <AbaLinks links={cadeira.links} onAdd={addLink} onRemover={rmLink} onEditar={editLink} />
          )}
          {subaba === "datas" && (
            <AbaDatas datas={cadeira.datas} onAdd={addData} onRemover={rmData} onEditar={editData} />
          )}
        </div>
      </div>
    </div>
  );
}
