// src/components/VisaoCadeiras.jsx
import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Clock, Link as LinkIcon, Calendar, Check, Edit2, X } from "lucide-react";
import EstadoVazio from "./ui/EstadoVazio.jsx";
import SeletorPeriodo from "./ui/SeletorPeriodo.jsx";
import { useNavegacaoEnter } from "../hooks/useNavegacaoEnter.js";

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
  
  // Estado local para controlar as datas sem bug de re-render
  const [dataInicio, setDataInicio] = useState(periodoAtivo?.dataInicio || "");
  const [dataFim, setDataFim] = useState(periodoAtivo?.dataFim || "");
  const [salvo, setSalvo] = useState(false);
  // As datas só ficam editáveis quando o usuário clica no lápis — evita
  // alterações acidentais direto no campo. Enquanto `false`, os inputs
  // ficam desabilitados (não clicáveis, não abrem o seletor de data).
  const [editandoDatas, setEditandoDatas] = useState(false);
  const formRef = useRef(null);
  useNavegacaoEnter(formRef);
  const addRowRef = useRef(null);
  useNavegacaoEnter(addRowRef);

  // Sincroniza o estado local quando troca de período
  useEffect(() => {
    setDataInicio(periodoAtivo?.dataInicio || "");
    setDataFim(periodoAtivo?.dataFim || "");
    setSalvo(false);
    setEditandoDatas(false);
  }, [periodoAtivo?.id]);

  const adicionar = () => {
    const nome = novoNome.trim();
    if (!nome) return;
    onCriar(nome);
    setNovoNome("");
  };

  const salvarDatas = () => {
    if (onAtualizarPeriodo && periodoAtivo) {
      onAtualizarPeriodo(periodoAtivo.id, { dataInicio, dataFim });
      setSalvo(true);
      setEditandoDatas(false);
      setTimeout(() => setSalvo(false), 2000);
    }
  };

  const cancelarEdicaoDatas = () => {
    setDataInicio(periodoAtivo?.dataInicio || "");
    setDataFim(periodoAtivo?.dataFim || "");
    setEditandoDatas(false);
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

        {/* Duração do período: só editável depois de clicar no lápis */}
        <div ref={formRef} className="periodo-duracao-bar">
          <span className="subtle periodo-duracao-label">Duração do período:</span>

          <div className="periodo-duracao-campos">
            <label className="periodo-data-campo">
              <span className="subtle">De:</span>
              <input
                type="date"
                className="input"
                disabled={!editandoDatas}
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </label>

            <label className="periodo-data-campo">
              <span className="subtle">Até:</span>
              <input
                type="date"
                className="input"
                disabled={!editandoDatas}
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </label>
          </div>

          <div className="periodo-duracao-acoes">
            {editandoDatas ? (
              <>
                <button
                  type="button"
                  className="icon-btn-ghost"
                  title="Salvar datas"
                  onClick={salvarDatas}
                >
                  <Check size={15} color="#10b981" />
                </button>
                <button
                  type="button"
                  className="icon-btn-ghost"
                  title="Cancelar"
                  onClick={cancelarEdicaoDatas}
                >
                  <X size={15} />
                </button>
              </>
            ) : (
              <button
                type="button"
                className="icon-btn-ghost"
                title="Editar datas"
                onClick={() => setEditandoDatas(true)}
              >
                <Edit2 size={14} />
              </button>
            )}
            {salvo && <span className="periodo-duracao-salvo">Salvo!</span>}
          </div>
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
                  <span>{c.horarios.length} horário{c.horarios.length !== 1 ? "s" : ""}</span>
                  <span className="separador">·</span>
                  <LinkIcon size={12} />
                  <span>{c.links.length} link{c.links.length !== 1 ? "s" : ""}</span>
                  <span className="separador">·</span>
                  <Calendar size={12} />
                  <span>{c.datas.length} data{c.datas.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}