// src/components/VisaoGeral.jsx
import React, { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, BookOpen, GraduationCap, ListChecks, CalendarClock, Check, Plus } from "lucide-react";
import { DIAS_FULL } from "../constants.js";
import { formatarData } from "../utils/formatarData.js";
import { toISO } from "../utils/afazeres.js";
import { NOME_MESES, gerarCelulasMes, hexParaRgb } from "../utils/calendario.js";
import { useFiltrosCalendario } from "../hooks/useFiltrosCalendario.js";
import { useEventosCalendario } from "../hooks/useEventosCalendario.js";
import EstadoVazio from "./ui/EstadoVazio.jsx";
import BarraUrgencia from "./ui/BarraUrgencia.jsx";

const TIPOS = [
  { chave: "aulas", label: "Aulas", icone: BookOpen },
  { chave: "avaliacoes", label: "Avaliações", icone: GraduationCap },
  { chave: "compromissos", label: "Compromissos", icone: CalendarClock },
  { chave: "afazeres", label: "Afazeres/Eventos", icone: ListChecks },
];

// distância mínima (px) do ponteiro para considerar que o usuário começou a arrastar
const LIMIAR_ARRASTO = 8;
// no toque, quanto tempo (ms) precisa ficar parado segurando o item antes do
// arrasto "armar" — antes disso, qualquer movimento é tratado como scroll
const ATRASO_ARRASTO_TOQUE = 350;

export default function VisaoGeral({
  cadeiras = [],
  compromissos = [],
  afazeres = [],
  periodos = [],
  eventosConcluidos = [],
  onAlternarEventoConcluido,
  onAlternarFeitoAfazer,
  onAtualizarAfazer,
  onNovoAfazer,
}) {
  const hoje = new Date();
  const hojeISO = toISO(hoje);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [diaSelecionado, setDiaSelecionado] = useState(hojeISO);

  const { filtros, alternarFiltro } = useFiltrosCalendario();
  const eventosPorDia = useEventosCalendario({ cadeiras, compromissos, afazeres, periodos, ano, mes, filtros });

  const celulas = useMemo(() => gerarCelulasMes(ano, mes), [ano, mes]);

  // ---- estado de drag (ponteiro, funciona em mouse e touch) ----
  const dragRef = useRef({ ativo: false, armado: false, ponteiroId: null, evento: null, startX: 0, startY: 0, elemento: null, timer: null });
  const [itemArrastando, setItemArrastando] = useState(null); // { id, titulo, cor, x, y }
  const [diaAlvo, setDiaAlvo] = useState(null);
  const [itemPronto, setItemPronto] = useState(null); // id do item "armado" para arrastar (feedback visual no toque)

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

  const eventoEstaConcluido = (ev) => {
    if (ev.tipo === "afazeres") {
      // Se for um afazer rotineiro, checa se a data desta ocorrência específica está marcada
      if (ev.rotina && ev.rotina.tipo !== "nenhuma") {
        return Array.isArray(ev.datasConcluidas) && ev.datasConcluidas.includes(ev.data);
      }
      return !!ev.feito;
    }
    return eventosConcluidos.includes(ev.chave);
  };

  const alternarConcluido = (ev) => {
    if (ev.tipo === "afazeres") {
      if (onAlternarFeitoAfazer) {
        // Passa a data específica da ocorrência para alterar apenas aquele dia
        onAlternarFeitoAfazer(ev.id, ev.data);
      }
    } else if (onAlternarEventoConcluido) {
      onAlternarEventoConcluido(ev.chave);
    }
  };
  // pendentes primeiro (por horário/urgência), concluídos vão para o final —
  // dentro dos pendentes, afazeres de maior urgência sobem para o topo; sort
  // é estável, então a ordem por horário dentro de cada grupo é preservada
  const eventosDoDiaSelecionado = useMemo(() => {
    const lista = diaSelecionado ? eventosPorDia[diaSelecionado] || [] : [];
    return [...lista].sort((a, b) => {
      const ca = eventoEstaConcluido(a) ? 1 : 0;
      const cb = eventoEstaConcluido(b) ? 1 : 0;
      if (ca !== cb) return ca - cb;
      return (b.urgencia || 0) - (a.urgencia || 0);
    });
  }, [diaSelecionado, eventosPorDia, eventosConcluidos]);

  // ---- handlers de drag (só afazeres podem ser arrastados) ----
  // No mouse o arrasto começa assim que o ponteiro se move além do limiar.
  // No toque, para não brigar com o scroll da lista, o arrasto só "arma"
  // depois que o dedo fica parado em cima do item por ATRASO_ARRASTO_TOQUE ms;
  // qualquer movimento antes disso é interpretado como intenção de rolar a
  // lista, e devolvemos o controle para o navegador (scroll nativo).
  const limparTimerArrasto = () => {
    if (dragRef.current.timer) {
      clearTimeout(dragRef.current.timer);
      dragRef.current.timer = null;
    }
  };

  const iniciarPossivelArrasto = (e, ev) => {
    if (ev.tipo !== "afazeres" || !onAtualizarAfazer) return;
    const elemento = e.currentTarget;
    const ehToque = e.pointerType === "touch";

    dragRef.current = {
      ativo: false,
      armado: !ehToque, // mouse/caneta: já pode arrastar de cara
      ponteiroId: e.pointerId,
      evento: ev,
      startX: e.clientX,
      startY: e.clientY,
      elemento,
      timer: null,
    };

    if (ehToque) {
      dragRef.current.timer = setTimeout(() => {
        const st = dragRef.current;
        if (!st.evento || st.ponteiroId !== e.pointerId) return;
        st.armado = true;
        // só a partir daqui bloqueamos o scroll nativo, já que o dedo ficou
        // parado tempo suficiente pra confirmar que é arrasto e não rolagem
        if (st.elemento) st.elemento.style.touchAction = "none";
        setItemPronto(ev.id);
        if (navigator.vibrate) navigator.vibrate(12);
      }, ATRASO_ARRASTO_TOQUE);
    } else {
      try {
        elemento.setPointerCapture(e.pointerId);
      } catch {}
    }
  };

  const moverArrasto = (e) => {
    const st = dragRef.current;
    if (!st.evento) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    const dist = Math.hypot(dx, dy);

    if (!st.armado) {
      // ainda esperando o "segurar": se o dedo já se moveu, é scroll —
      // cancela nossa tentativa de arrasto e deixa o navegador rolar
      if (dist > LIMIAR_ARRASTO) {
        limparTimerArrasto();
        dragRef.current = { ativo: false, evento: null };
      }
      return;
    }

    if (!st.ativo) {
      if (dist < LIMIAR_ARRASTO) return;
      st.ativo = true;
      e.preventDefault();
      if (st.elemento) {
        try {
          st.elemento.setPointerCapture(e.pointerId);
        } catch {}
      }
      setItemArrastando({ id: st.evento.id, titulo: st.evento.titulo, cor: st.evento.cor, x: e.clientX, y: e.clientY });
    } else {
      e.preventDefault();
      setItemArrastando((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    }

    const elAlvo = document.elementFromPoint(e.clientX, e.clientY);
    const celula = elAlvo && elAlvo.closest ? elAlvo.closest("[data-dia-iso]") : null;
    setDiaAlvo(celula ? celula.getAttribute("data-dia-iso") : null);
  };

  const finalizarArrasto = () => {
    const st = dragRef.current;
    limparTimerArrasto();
    if (st.elemento) st.elemento.style.touchAction = "";
    if (st.ativo && st.evento && diaAlvo && diaAlvo !== st.evento.data && onAtualizarAfazer) {
      onAtualizarAfazer(st.evento.id, { data: diaAlvo });
      setDiaSelecionado(diaAlvo);
    }
    dragRef.current = { ativo: false, armado: false, evento: null };
    setItemArrastando(null);
    setItemPronto(null);
    setDiaAlvo(null);
  };

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

      <div className="proximas-datas" style={{ marginTop: 0, marginBottom: 20, minHeight: "230px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <h2 className="titulo-secao" style={{ marginBottom: 0 }}>
            {diaSelecionado ? `Eventos em ${formatarData(diaSelecionado)}` : "Selecione um dia para ver os detalhes"}
          </h2>
          {diaSelecionado && onNovoAfazer && (
            <button
              type="button"
              className="icon-btn-ghost"
              onClick={() => onNovoAfazer(diaSelecionado)}
              title={`Criar afazer em ${formatarData(diaSelecionado)}`}
            >
              <Plus size={16} />
            </button>
          )}
        </div>

        <div style={{ flex: 1, position: "relative" }}>
          {!diaSelecionado && <EstadoVazio texto="Clique em qualquer dia do calendário para ver a programação detalhada." pequeno />}
          {diaSelecionado && eventosDoDiaSelecionado.length === 0 && <EstadoVazio texto="Nenhum evento neste dia" pequeno />}
          {diaSelecionado && eventosDoDiaSelecionado.length > 0 && (
            <div className="lista-proximas-datas" style={{ maxHeight: "300px", overflowY: "auto", scrollBehavior: "smooth", paddingRight: "4px" }}>
              {eventosDoDiaSelecionado.map((ev, i) => {
                const concluido = eventoEstaConcluido(ev);
                const arrastavel = ev.tipo === "afazeres" && !!onAtualizarAfazer;
                const sendoArrastado = itemArrastando && itemArrastando.id === ev.id && ev.tipo === "afazeres";
                const pronto = itemPronto === ev.id && ev.tipo === "afazeres" && !sendoArrastado;
                return (
                  <div
                    key={ev.chave || i}
                    className={`data-item${concluido ? " passada" : ""}${arrastavel ? " arrastavel" : ""}${pronto ? " pronto-arrasto" : ""}`}
                    style={sendoArrastado ? { opacity: 0.35 } : undefined}
                    onPointerDown={arrastavel ? (e) => iniciarPossivelArrasto(e, ev) : undefined}
                    onPointerMove={arrastavel ? moverArrasto : undefined}
                    onPointerUp={arrastavel ? finalizarArrasto : undefined}
                    onPointerCancel={arrastavel ? finalizarArrasto : undefined}
                  >
                    <button
                      type="button"
                      className={`check-btn${concluido ? " marcado" : ""}`}
                      style={{ borderColor: concluido ? "transparent" : ev.cor }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => alternarConcluido(ev)}
                      title={concluido ? "Marcar como não realizado" : "Marcar como realizado"}
                    >
                      {concluido && <Check size={13} />}
                    </button>
                    <div className="data-item-faixa" style={{ background: ev.cor }} />
                    <div style={{ flex: 1 }}>
                      <div className="data-item-titulo">{ev.titulo}</div>
                      <div className="subtle">{ev.origem}</div>
                    </div>
                    {ev.tipo === "afazeres" && (
                      <BarraUrgencia nivel={ev.urgencia || 1} />
                    )}
                    <div className="data-item-data" style={{ fontSize: "1.05rem", fontWeight: 600, letterSpacing: "0.5px" }}>
                      {ev.hora || ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {itemArrastando && (
          <div className="subtle" style={{ marginTop: 8, fontSize: 11 }}>
            Arraste até um dia do calendário para mudar a data do afazer.
          </div>
        )}
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
          const ehAlvoDrag = itemArrastando && diaAlvo === dataISO;
          const temAvaliacao = eventos.some((ev) => ev.tipo === "avaliacoes");
          const eventoImportante = eventos.find((ev) => ev.tipo === "avaliacoes");

          let celulaStyle = { transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)" };
          if (ehHoje && !selecionada) {
            celulaStyle = { ...celulaStyle, border: "1px solid rgba(255, 255, 255, 0.55)", backgroundColor: "rgba(255, 255, 255, 0.06)" };
          } else if (selecionada && !ehHoje) {
            celulaStyle = { ...celulaStyle, borderColor: "#818cf8", backgroundColor: "rgba(129, 140, 248, 0.18)", boxShadow: "0 0 0 2px #818cf8, 0 4px 12px rgba(129, 140, 248, 0.3)", transform: "scale(1.05)", zIndex: 2 };
          } else if (selecionada && ehHoje) {
            celulaStyle = { ...celulaStyle, border: "2px solid rgba(255, 255, 255, 0.7)", backgroundColor: "rgba(129, 140, 248, 0.22)", boxShadow: "0 0 0 2px #818cf8, 0 4px 12px rgba(255, 255, 255, 0.3)", transform: "scale(1.05)", zIndex: 2 };
          }
          if (ehAlvoDrag) {
            celulaStyle = { ...celulaStyle, borderColor: "#f59e0b", backgroundColor: "rgba(245, 158, 11, 0.22)", boxShadow: "0 0 0 2px #f59e0b, 0 4px 14px rgba(245, 158, 11, 0.4)", transform: "scale(1.08)", zIndex: 3 };
          }
          // Data com prova/trabalho/avaliação de alguma cadeira: preenchimento com
          // opacidade média + glow na cor DA PRÓPRIA CADEIRA, somado (não
          // substituindo) a qualquer destaque já aplicado acima.
          if (temAvaliacao) {
            const rgb = hexParaRgb(eventoImportante.cor);
            const glowAvaliacao = `0 0 11px rgba(${rgb}, 0.6)`;
            celulaStyle = {
              ...celulaStyle,
              backgroundColor: celulaStyle.backgroundColor || `rgba(${rgb}, 0.16)`,
              boxShadow: celulaStyle.boxShadow ? `${celulaStyle.boxShadow}, ${glowAvaliacao}` : `0 0 0 1px rgba(${rgb}, 0.55), ${glowAvaliacao}`,
            };
          }

          return (
            <div
              key={idx}
              data-dia-iso={dataISO}
              className={`calendario-celula${ehHoje ? " hoje" : ""}${selecionada ? " selecionada" : ""}${ehAlvoDrag ? " destino-drag" : ""}${temAvaliacao ? " tem-avaliacao" : ""}`}
              onClick={() => setDiaSelecionado(selecionada ? null : dataISO)}
              style={celulaStyle}
            >
              <span
                className="calendario-numero"
                style={
                  ehHoje
                    ? { background: "#f4f4f5", color: "#09090b", fontWeight: "700", borderRadius: "12px", padding: "1px 7px", display: "inline-block", fontSize: "0.82rem", boxShadow: "0 2px 4px rgba(255, 255, 255, 0.25)" }
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

      {itemArrastando && (
        <div
          className="drag-ghost"
          style={{ left: itemArrastando.x, top: itemArrastando.y, borderColor: itemArrastando.cor }}
        >
          <span className="drag-ghost-ponto" style={{ background: itemArrastando.cor }} />
          {itemArrastando.titulo}
        </div>
      )}
    </div>
  );
}