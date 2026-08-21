import React, { useState, useEffect } from "react";
import { Trash2, X } from "lucide-react";
import { uid } from "../utils/id";
import AbaHorarios from "./abas/AbaHorarios";
import AbaLinks from "./abas/AbaLinks";
import AbaDatas from "./abas/AbaDatas";
import SeletorCor from "./ui/SeletorCor.jsx";

export default function PainelCadeira({
  cadeira,
  onFechar,
  onAtualizar,
  onExcluir,
}) {
  const [subaba, setSubaba] = useState("horarios");
  const [nomeEdit, setNomeEdit] = useState(cadeira.nome);

  useEffect(() => setNomeEdit(cadeira.nome), [cadeira.id]);

  const salvarNome = () => {
    const v = nomeEdit.trim();
    if (v && v !== cadeira.nome) onAtualizar({ nome: v });
  };

  /* horários */
  const addHorario = (h) =>
    onAtualizar({ horarios: [...cadeira.horarios, { id: uid(), ...h }] });
  const rmHorario = (id) =>
    onAtualizar({
      horarios: cadeira.horarios.filter((h) => h.id !== id),
    });
  const editHorario = (id, patch) =>
    onAtualizar({
      horarios: cadeira.horarios.map((h) => (h.id === id ? { ...h, ...patch } : h)),
    });

  /* links */
  const addLink = (l) =>
    onAtualizar({ links: [...cadeira.links, { id: uid(), ...l }] });
  const rmLink = (id) =>
    onAtualizar({ links: cadeira.links.filter((l) => l.id !== id) });
  const editLink = (id, patch) =>
    onAtualizar({
      links: cadeira.links.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    });

  /* datas */
  const addData = (d) =>
    onAtualizar({ datas: [...cadeira.datas, { id: uid(), ...d }] });
  const rmData = (id) =>
    onAtualizar({ datas: cadeira.datas.filter((d) => d.id !== id) });
  const editData = (id, patch) =>
    onAtualizar({
      datas: cadeira.datas.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    });

  return (
    <div className="overlay" onClick={onFechar}>
      <div className="painel-lateral" onClick={(e) => e.stopPropagation()}>
        <div className="painel-header">
          <span className="cor-dot" style={{ background: cadeira.cor }} />
          <input
            className="painel-title-input"
            value={nomeEdit}
            onChange={(e) => setNomeEdit(e.target.value)}
            onBlur={salvarNome}
            onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
          />
          <button
            className="icon-btn-ghost"
            onClick={onExcluir}
            title="Excluir cadeira"
          >
            <Trash2 size={15} />
          </button>
          <button className="icon-btn-ghost" onClick={onFechar}>
            <X size={17} />
          </button>
        </div>

        {/* SELETOR DE COR (HEXADECIMAL LIVRE) */}
        <div style={{ marginTop: 10 }}>
          <SeletorCor valor={cadeira.cor} onChange={(cor) => onAtualizar({ cor })} />
        </div>

        <div className="painel-tabs">
          <button
            className={`painel-tab ${subaba === "horarios" ? "ativa" : ""}`}
            onClick={() => setSubaba("horarios")}
          >
            Horários
          </button>
          <button
            className={`painel-tab ${subaba === "links" ? "ativa" : ""}`}
            onClick={() => setSubaba("links")}
          >
            Links e materiais
          </button>
          <button
            className={`painel-tab ${subaba === "datas" ? "ativa" : ""}`}
            onClick={() => setSubaba("datas")}
          >
            Datas importantes
          </button>
        </div>

        <div className="painel-conteudo">
          {subaba === "horarios" && (
            <AbaHorarios
              horarios={cadeira.horarios}
              onAdd={addHorario}
              onRemover={rmHorario}
              onEditar={editHorario}
            />
          )}
          {subaba === "links" && (
            <AbaLinks
              links={cadeira.links}
              onAdd={addLink}
              onRemover={rmLink}
              onEditar={editLink}
            />
          )}
          {subaba === "datas" && (
            <AbaDatas
              datas={cadeira.datas}
              onAdd={addData}
              onRemover={rmData}
              onEditar={editData}
            />
          )}
        </div>
      </div>
    </div>
  );
}