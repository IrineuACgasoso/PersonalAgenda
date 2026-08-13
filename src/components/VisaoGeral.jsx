// src/components/VisaoGeral.jsx
import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, BookOpen, GraduationCap, ListChecks } from "lucide-react";
import { DIAS_FULL } from "../constants.js";
import { formatarData } from "../utils/formatarData.js";
import { toISO } from "../utils/afazeres.js";
import { NOME_MESES, gerarCelulasMes } from "../utils/calendario.js";
import { useFiltrosCalendario } from "../hooks/useFiltrosCalendario.js";
import { useEventosCalendario } from "../hooks/useEventosCalendario.js";
import EstadoVazio from "./ui/EstadoVazio.jsx";

const TIPOS = [
  { chave: "aulas", label: "Aulas", icone: BookOpen },
  { chave: "avaliacoes", label: "Avaliações", icone: GraduationCap },
  { chave: "afazeres", label: "Afazeres/Eventos", icone: ListChecks },
];

export default function VisaoGeral({ cadeiras = [], afazeres = [], periodos = [] }) {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [diaSelecionado, setDiaSelecionado] = useState(null);

  const { filtros, alternarFiltro } = useFiltrosCalendario();
  const eventosPorDia = useEventosCalendario({ cadeiras, afazeres, periodos, ano, mes, filtros });

  const celulas = useMemo(() => gerarCelulasMes(ano, mes), [ano, mes]);

  const irMesAnterior = () => {
    const novo = new Date(ano, mes - 1, 1);
    setAno(novo.getFullYear());
    setMes(novo.getMonth());
    setDiaSelecionado(null);
  };

  const irProximoMes = () => {
    const novo = new Date(ano, mes + 1, 1);
    setAno(novo.getFullYear());
    setMes(novo.getMonth());
    setDiaSelecionado(null);
  };

  const hojeISO = toISO(hoje);
  const eventosDoDiaSelecionado = diaSelecionado ? eventosPorDia[diaSelecionado] || [] : [];

  return (
    <div>
      <div className="header-bar">
        <h1 className="titulo-pagina">Visão geral</h1>
        <span className="subtle">Faculdade e afazeres num só calendário</span>
      </div>

      <div className="filtros-linha">
        {TIPOS.map(({ chave, label, icone: Icone }) => (
          <button
            key={chave}
            className={`filtro-chip${filtros[chave] ? " ativo" : ""}`}
            onClick={() => alternarFiltro(chave)}
          >
            <Icone size={13} /> {label}
          </button>
        ))}
      </div>

      <div className="calendario-header">
        <button className="icon-btn-ghost" onClick={irMesAnterior}>
          <ChevronLeft size={18} />
        </button>
        <span className="calendario-titulo">{NOME_MESES[mes]} {ano}</span>
        <button className="icon-btn-ghost" onClick={irProximoMes}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="calendario-grid-head">
        {DIAS_FULL.map((d) => (
          <div key={d} className="calendario-dia-head">{d.slice(0, 3)}</div>
        ))}
      </div>

      <div className="calendario-grid">
        {celulas.map((dia, idx) => {
          if (dia === null) return <div key={idx} className="calendario-celula vazia" />;
          const dataISO = toISO(new Date(ano, mes, dia));
          const eventos = eventosPorDia[dataISO] || [];
          const selecionada = dataISO === diaSelecionado;
          const ehHoje = dataISO === hojeISO;

          let celulaStyle = { transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)" };
          if (ehHoje && !selecionada) {
            celulaStyle = { ...celulaStyle, border: "1px solid #10b981", backgroundColor: "rgba(16, 185, 129, 0.08)" };
          } else if (selecionada && !ehHoje) {
            celulaStyle = { ...celulaStyle, borderColor: "#818cf8", backgroundColor: "rgba(129, 140, 248, 0.18)", boxShadow: "0 0 0 2px #818cf8, 0 4px 12px rgba(129, 140, 248, 0.3)", transform: "scale(1.05)", zIndex: 2 };
          } else if (selecionada && ehHoje) {
            celulaStyle = { ...celulaStyle, border: "2px solid #10b981", backgroundColor: "rgba(129, 140, 248, 0.22)", boxShadow: "0 0 0 2px #818cf8, 0 4px 12px rgba(16, 185, 129, 0.35)", transform: "scale(1.05)", zIndex: 2 };
          }

          return (
            <div
              key={idx}
              className={`calendario-celula${ehHoje ? " hoje" : ""}${selecionada ? " selecionada" : ""}`}
              onClick={() => setDiaSelecionado(selecionada ? null : dataISO)}
              style={celulaStyle}
            >
              <span
                className="calendario-numero"
                style={
                  ehHoje
                    ? { background: "#10b981", color: "#09090b", fontWeight: "700", borderRadius: "12px", padding: "1px 7px", display: "inline-block", fontSize: "0.82rem", boxShadow: "0 2px 4px rgba(16, 185, 129, 0.3)" }
                    : selecionada
                    ? { fontWeight: 800, color: "#ffffff", textShadow: "0 0 6px rgba(129, 140, 248, 0.8)" }
                    : {}
                }
              >
                {dia}
              </span>
              <div className="calendario-pontos">
                {eventos.slice(0, 4).map((ev, i) => (
                  <span key={i} className="calendario-ponto" style={{ background: ev.cor }} />
                ))}
                {eventos.length > 4 && <span className="calendario-mais">+{eventos.length - 4}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="proximas-datas" style={{ marginTop: 24, minHeight: "230px", display: "flex", flexDirection: "column" }}>
        <h2 className="titulo-secao" style={{ marginBottom: 12 }}>
          {diaSelecionado ? `Eventos em ${formatarData(diaSelecionado)}` : "Selecione um dia para ver os detalhes"}
        </h2>

        <div style={{ flex: 1, position: "relative" }}>
          {!diaSelecionado && <EstadoVazio texto="Clique em qualquer dia do calendário para ver a programação detalhada." pequeno />}
          {diaSelecionado && eventosDoDiaSelecionado.length === 0 && <EstadoVazio texto="Nenhum evento neste dia" pequeno />}
          {diaSelecionado && eventosDoDiaSelecionado.length > 0 && (
            <div className="lista-proximas-datas" style={{ maxHeight: "300px", overflowY: "auto", scrollBehavior: "smooth", paddingRight: "4px" }}>
              {eventosDoDiaSelecionado.map((ev, i) => (
                <div key={i} className={`data-item${ev.feito ? " passada" : ""}`}>
                  <div className="data-item-faixa" style={{ background: ev.cor }} />
                  <div style={{ flex: 1 }}>
                    <div className="data-item-titulo">{ev.titulo}</div>
                    <div className="subtle">{ev.origem}</div>
                  </div>
                  <div className="data-item-data" style={{ fontSize: "1.05rem", fontWeight: 600, letterSpacing: "0.5px" }}>
                    {ev.hora || ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}