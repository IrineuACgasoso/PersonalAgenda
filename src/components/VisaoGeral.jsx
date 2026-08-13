// src/components/VisaoGeral.jsx
import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, BookOpen, GraduationCap, ListChecks } from "lucide-react";
import { DIAS_FULL } from "../constants.js";
import { formatarData } from "../utils/formatarData.js";
import { ocorrenciasNoIntervalo, toISO } from "../utils/afazeres.js";
import EstadoVazio from "./ui/EstadoVazio.jsx";

const FILTROS_KEY = "painel-academico-filtros-calendario";

const TIPOS = [
  { chave: "aulas", label: "Aulas", icone: BookOpen },
  { chave: "avaliacoes", label: "Avaliações", icone: GraduationCap },
  { chave: "afazeres", label: "Afazeres/Eventos", icone: ListChecks },
];

const NOME_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function lerFiltrosIniciais() {
  try {
    const raw = localStorage.getItem(FILTROS_KEY);
    return raw ? JSON.parse(raw) : { aulas: true, avaliacoes: true, afazeres: true };
  } catch {
    return { aulas: true, avaliacoes: true, afazeres: true };
  }
}

export default function VisaoGeral({ cadeiras, afazeres }) {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [filtros, setFiltros] = useState(lerFiltrosIniciais);

  const alternarFiltro = (chave) => {
    setFiltros((prev) => {
      const proximo = { ...prev, [chave]: !prev[chave] };
      try {
        localStorage.setItem(FILTROS_KEY, JSON.stringify(proximo));
      } catch {
        /* ignora erro de storage */
      }
      return proximo;
    });
  };

  const primeiroDiaMes = new Date(ano, mes, 1);
  const ultimoDiaMes = new Date(ano, mes + 1, 0);
  const inicioISO = toISO(primeiroDiaMes);
  const fimISO = toISO(ultimoDiaMes);

  // eventos do tipo "avaliações" (datas importantes das cadeiras)
  const avaliacoes = useMemo(() => {
    if (!filtros.avaliacoes) return [];
    return cadeiras.flatMap((c) =>
      c.datas
        .filter((d) => d.data >= inicioISO && d.data <= fimISO)
        .map((d) => ({
          tipo: "avaliacoes",
          data: d.data,
          hora: d.hora,
          titulo: d.titulo,
          cor: c.cor,
          origem: c.nome,
        }))
    );
  }, [cadeiras, filtros.avaliacoes, inicioISO, fimISO]);

  // eventos do tipo "aulas" (horários fixos semanais, projetados no mês)
  const aulas = useMemo(() => {
    if (!filtros.aulas) return [];
    const lista = [];
    for (let d = new Date(primeiroDiaMes); d <= ultimoDiaMes; d.setDate(d.getDate() + 1)) {
      const diaSemana = (d.getDay() + 6) % 7; // 0 = segunda
      const dataISO = toISO(d);
      cadeiras.forEach((c) => {
        c.horarios
          .filter((h) => h.dia === diaSemana)
          .forEach((h) => {
            lista.push({
              tipo: "aulas",
              data: dataISO,
              hora: h.inicio,
              titulo: c.nome,
              cor: c.cor,
              origem: h.local || DIAS_FULL[diaSemana],
            });
          });
      });
    }
    return lista;
  }, [cadeiras, filtros.aulas, mes, ano]);

  // eventos do tipo "afazeres" (usando a cor personalizada de cada afazer)
  const eventosAfazeres = useMemo(() => {
    if (!filtros.afazeres) return [];
    const lista = [];
    afazeres.forEach((a) => {
      const ocorrencias = ocorrenciasNoIntervalo(a, inicioISO, fimISO);
      ocorrencias.forEach((data) => {
        lista.push({
          tipo: "afazeres",
          data,
          hora: a.hora,
          titulo: a.nome,
          cor: a.cor || "#8b5cf6",
          origem: a.feito ? "concluído" : "pendente",
          feito: a.feito,
        });
      });
    });
    return lista;
  }, [afazeres, filtros.afazeres, inicioISO, fimISO]);

  const todosEventos = [...aulas, ...avaliacoes, ...eventosAfazeres];
  const eventosPorDia = useMemo(() => {
    const mapa = {};
    todosEventos.forEach((ev) => {
      if (!mapa[ev.data]) mapa[ev.data] = [];
      mapa[ev.data].push(ev);
    });
    Object.values(mapa).forEach((lista) =>
      lista.sort((a, b) => (a.hora || "").localeCompare(b.hora || ""))
    );
    return mapa;
  }, [todosEventos]);

  const [diaSelecionado, setDiaSelecionado] = useState(null);

  const celulas = useMemo(() => {
    const offset = (primeiroDiaMes.getDay() + 6) % 7; // segunda = 0
    const total = ultimoDiaMes.getDate();
    const dias = [];
    for (let i = 0; i < offset; i++) dias.push(null);
    for (let dia = 1; dia <= total; dia++) dias.push(dia);
    return dias;
  }, [mes, ano]);

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
          return (
            <div
              key={idx}
              className={`calendario-celula${dataISO === hojeISO ? " hoje" : ""}${dataISO === diaSelecionado ? " selecionada" : ""}`}
              onClick={() => setDiaSelecionado(dataISO === diaSelecionado ? null : dataISO)}
            >
              <span className="calendario-numero">{dia}</span>
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

      <div className="proximas-datas">
        <h2 className="titulo-secao">
          {diaSelecionado ? `Eventos em ${formatarData(diaSelecionado)}` : "Selecione um dia para ver os detalhes"}
        </h2>
        {diaSelecionado && eventosDoDiaSelecionado.length === 0 && (
          <EstadoVazio texto="Nenhum evento neste dia" pequeno />
        )}
        {diaSelecionado && eventosDoDiaSelecionado.length > 0 && (
          <div className="lista-proximas-datas">
            {eventosDoDiaSelecionado.map((ev, i) => (
              <div key={i} className={`data-item${ev.feito ? " passada" : ""}`}>
                <div className="data-item-faixa" style={{ background: ev.cor }} />
                <div style={{ flex: 1 }}>
                  <div className="data-item-titulo">{ev.titulo}</div>
                  <div className="subtle">{ev.origem}</div>
                </div>
                <div className="data-item-data">{ev.hora || ""}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}