// src/components/VisaoGeral.jsx
import { useMemo, useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, BookOpen, BookMarked, ListChecks, Repeat, Star, Flag, FlagOff } from "lucide-react";
import { DIAS_FULL } from "../constants.js";
import { formatarData } from "../utils/formatarData.js";
import { toISO, parseISO } from "../utils/afazeres.js";
import { useHoje } from "../hooks/useHoje.js";
import { NOME_MESES, gerarCelulasMes, hexParaRgb } from "../utils/calendario.js";
import { idArrasto, marcadoresDoDia, resumirMarcadores } from "../utils/projecao.js";
import { useFiltrosCalendario } from "../hooks/useFiltrosCalendario.js";
import { useEventosCalendario } from "../hooks/useEventosCalendario.js";
import ListaDoDia from "./ui/ListaDoDia.jsx";
import { propsDeBotao } from "../utils/acessibilidade.js";

// Os ícones dos filtros são os mesmos dos marcadores das células (Fase 5):
// livro = avaliação, ★ = compromisso.
const TIPOS = [
  { chave: "aulas", label: "Aulas", icone: BookOpen },
  { chave: "avaliacoes", label: "Avaliações", icone: BookMarked },
  { chave: "rotinas", label: "Rotinas", icone: Repeat },
  { chave: "compromissos", label: "Compromissos", icone: Star },
  { chave: "afazeres", label: "Afazeres", icone: ListChecks },
];

// Ícone de cada marcador da célula (ver marcadoresDoDia em utils/projecao.js).
const ICONE_MARCADOR = { compromisso: Star, avaliacao: BookMarked, inicio: Flag, fim: FlagOff };
const TEXTO_MARCADOR = {
  compromisso: (t) => `Compromisso: ${t}`,
  avaliacao: (t) => `Avaliação: ${t}`,
  inicio: (t) => `Início de ${t}`,
  fim: (t) => `Fim de ${t}`,
};

// distância mínima (px) do ponteiro para considerar que o usuário começou a arrastar
const LIMIAR_ARRASTO = 8;
// no toque, quanto tempo (ms) precisa ficar parado segurando o item antes do
// arrasto "armar" — antes disso, qualquer movimento é tratado como scroll
const ATRASO_ARRASTO_TOQUE = 350;

export default function VisaoGeral({
  cadeiras = [],
  rotinas = [],
  compromissos = [],
  afazeres = [],
  eventosConcluidos = [],
  eventosExcluidos = [],
  onAlternarEventoConcluido,
  onMarcarFalta,
  onExcluirInstanciaEvento,
  onAlternarFeitoAfazer,
  onAtualizarAfazer,
  onMoverInstanciaAfazer,
  onExcluirAfazer,
  onAlternarFeitoCompromisso,
  onAtualizarCompromisso,
  onExcluirCompromisso,
  onNovoAfazer,
  onNovoCompromisso,
  // { data, ts }: abrir já neste dia (aviso de atrasados da tela Hoje).
  // Consumido ao montar, para a próxima visita abrir em hoje de novo.
  diaInicial,
  onDiaInicialConsumido,
}) {
  const hojeISO = useHoje();
  const inicio = diaInicial?.data ? parseISO(diaInicial.data) : new Date();
  // ano+mes vivem juntos num único estado (em vez de dois setState separados)
  // para que a navegação de mês feita por closures "antigas" (ex: o loop de
  // autoscroll do drag, que dispara mesmo sem o ponteiro se mover) sempre
  // aplique a mudança em cima do mês mais recente, via updater funcional.
  const [cursor, setCursor] = useState({ ano: inicio.getFullYear(), mes: inicio.getMonth() });
  const { ano, mes } = cursor;
  const [diaSelecionado, setDiaSelecionado] = useState(diaInicial?.data || hojeISO);
  useEffect(() => {
    if (!diaInicial) return;
    onDiaInicialConsumido?.();
    // A lista do dia fica embaixo do calendário: no celular ela estaria fora
    // da tela, então rola até o cabeçalho dela.
    document.querySelector(".detalhe-dia-cabecalho")?.scrollIntoView({ block: "center" });
    // Só na montagem: o valor inicial já foi lido pelos useState acima.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { filtros, alternarFiltro } = useFiltrosCalendario();
  const { eventosPorDia, marcosVigencia } = useEventosCalendario({
    cadeiras,
    rotinas,
    compromissos,
    afazeres,
    ano,
    mes,
    filtros,
    eventosExcluidos,
    hojeISO,
  });

  const celulas = useMemo(() => gerarCelulasMes(ano, mes), [ano, mes]);

  // ---- estado de drag (ponteiro, funciona em mouse e touch) ----
  const dragRef = useRef({
    ativo: false,
    armado: false,
    ponteiroId: null,
    evento: null,
    startX: 0,
    startY: 0,
    elemento: null,
    timer: null,
    lastX: 0,
    lastY: 0,
  });
  const [itemArrastando, setItemArrastando] = useState(null); // { id, titulo, cor, x, y }
  const [diaAlvo, setDiaAlvo] = useState(null);
  const [itemPronto, setItemPronto] = useState(null); // idArrasto do item "armado" (feedback visual no toque)

  const prevBtnRef = useRef(null);
  const nextBtnRef = useRef(null);
  const autoScrollTimerRef = useRef(null);
  const arrowHoverRef = useRef({ dir: null, ultimaTroca: 0 });

  const diaAlvoRef = useRef(null);

  const irMesAnterior = () => {
    setCursor((c) => {
      const novo = new Date(c.ano, c.mes - 1, 1);
      return { ano: novo.getFullYear(), mes: novo.getMonth() };
    });
    if (!dragRef.current.ativo) setDiaSelecionado(null);
  };

  const irProximoMes = () => {
    setCursor((c) => {
      const novo = new Date(c.ano, c.mes + 1, 1);
      return { ano: novo.getFullYear(), mes: novo.getMonth() };
    });
    if (!dragRef.current.ativo) setDiaSelecionado(null);
  };

  const pontoDentroDoElemento = (el, x, y) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  // Roda em intervalo enquanto o arrasto está ativo (não só em pointermove),
  // pra funcionar mesmo quando o usuário segura parado bem na borda da tela
  // ou em cima de uma seta de mês.
  const rodarAutoScrollETrocaMes = () => {
    const st = dragRef.current;
    if (!st.ativo) return;
    const { lastX: x, lastY: y } = st;

    const scrollEl = document.querySelector(".main");
    if (scrollEl) {
      const rect = scrollEl.getBoundingClientRect();
      const margem = 70;
      if (y > rect.top && y - rect.top < margem) {
        scrollEl.scrollTop -= 16;
      } else if (y < rect.bottom && rect.bottom - y < margem) {
        scrollEl.scrollTop += 16;
      }
    }

    const sobrePrev = pontoDentroDoElemento(prevBtnRef.current, x, y);
    const sobreNext = pontoDentroDoElemento(nextBtnRef.current, x, y);
    const dir = sobrePrev ? "prev" : sobreNext ? "next" : null;

    if (dir) {
      const agora = Date.now();
      if (arrowHoverRef.current.dir !== dir) {
        arrowHoverRef.current = { dir, ultimaTroca: agora };
      } else if (agora - arrowHoverRef.current.ultimaTroca > 650) {
        if (dir === "prev") irMesAnterior();
        else irProximoMes();
        arrowHoverRef.current.ultimaTroca = agora;
      }
    } else {
      arrowHoverRef.current = { dir: null, ultimaTroca: 0 };
    }
  };

  const marcosDoDiaSelecionado = (diaSelecionado && marcosVigencia[diaSelecionado]) || [];
  const eventosDoDiaSelecionado = (diaSelecionado && eventosPorDia[diaSelecionado]) || [];

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

  const podeArrastar = (ev) =>
    (ev.tipo === "afazeres" && (!!onAtualizarAfazer || !!onMoverInstanciaAfazer)) ||
    (ev.tipo === "compromissos" && !!onAtualizarCompromisso);

  const iniciarPossivelArrasto = (e, ev) => {
    if (!podeArrastar(ev)) return;
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
        setItemPronto(idArrasto(ev));
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
    st.lastX = e.clientX;
    st.lastY = e.clientY;
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
      setItemArrastando({
        chave: idArrasto(st.evento),
        titulo: st.evento.titulo,
        cor: st.evento.cor,
        x: e.clientX,
        y: e.clientY,
      });
      // começa a checar (em intervalo) autoscroll de borda + troca de mês
      // ao segurar sobre as setas, independente de novos eventos de movimento
      if (!autoScrollTimerRef.current) {
        autoScrollTimerRef.current = setInterval(rodarAutoScrollETrocaMes, 50);
      }
    } else {
      e.preventDefault();
      setItemArrastando((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    }

    const elAlvo = document.elementFromPoint(e.clientX, e.clientY);
    const celula = elAlvo && elAlvo.closest ? elAlvo.closest("[data-dia-iso]") : null;
    const alvo = celula ? celula.getAttribute("data-dia-iso") : null;
    diaAlvoRef.current = alvo;
    setDiaAlvo(alvo);
  };

  const finalizarArrasto = () => {
    const st = dragRef.current;
    limparTimerArrasto();
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
    arrowHoverRef.current = { dir: null, ultimaTroca: 0 };
    if (st.elemento) st.elemento.style.touchAction = "";
    const alvo = diaAlvoRef.current;
    if (st.ativo && st.evento && alvo && alvo !== st.evento.data) {
      const ev = st.evento;
      const ehRotina = ev.rotina && ev.rotina.tipo !== "nenhuma";
      if (ev.tipo === "compromissos") {
        // Compromisso: muda a data, mantém o horário.
        onAtualizarCompromisso(ev.id, { data: alvo });
        setDiaSelecionado(alvo);
      } else if (ehRotina && onMoverInstanciaAfazer) {
        // Afazer com recorrência: move só esta ocorrência (a "quarta que
        // virou quinta"). A regra continua valendo normalmente para as
        // outras semanas — nada é sobrescrito na rotina em si.
        onMoverInstanciaAfazer(ev.id, ev.dataOriginal || ev.data, alvo);
        setDiaSelecionado(alvo);
      } else if (!ehRotina && onAtualizarAfazer) {
        // Afazer avulso (sem rotina): mover é simplesmente trocar a data dele.
        onAtualizarAfazer(ev.id, { data: alvo });
        setDiaSelecionado(alvo);
      }
    }
    dragRef.current = { ativo: false, armado: false, evento: null };
    diaAlvoRef.current = null;
    setItemArrastando(null);
    setItemPronto(null);
    setDiaAlvo(null);
  };

  // Rede de segurança: garante que o arrasto SEMPRE termine, mesmo se a
  // linha de origem (dentro da lista "Eventos em ...") sumir do DOM no meio
  // do gesto — o que acontecia ao trocar de mês durante o arrasto (a lista
  // do dia selecionado zera, o elemento que tinha a captura do ponteiro é
  // desmontado, e o "fantasma" do item ficava preso, sem nenhum evento de
  // soltar para finalizar). Ouvindo em `window`, essas continuam
  // funcionando mesmo que o elemento original já não exista mais.
  useEffect(() => {
    if (!itemArrastando) return undefined;
    const aoMover = (e) => moverArrasto(e);
    const aoSoltar = () => finalizarArrasto();
    window.addEventListener("pointermove", aoMover);
    window.addEventListener("pointerup", aoSoltar);
    window.addEventListener("pointercancel", aoSoltar);
    return () => {
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("pointerup", aoSoltar);
      window.removeEventListener("pointercancel", aoSoltar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemArrastando]);

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
        <button ref={prevBtnRef} className="icon-btn-ghost" onClick={irMesAnterior}>
          <ChevronLeft size={18} />
        </button>
        <span className="calendario-titulo">
          {NOME_MESES[mes]} {ano}
        </span>
        <button ref={nextBtnRef} className="icon-btn-ghost" onClick={irProximoMes}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="calendario-grid-head">
        {DIAS_FULL.map((d) => (
          <div key={d} className="calendario-dia-head">
            {d.slice(0, 3)}
          </div>
        ))}
      </div>

      <div className="calendario-grid">
        {celulas.map((cel, idx) => {
          const dia = cel.dia;
          const dataISO = toISO(new Date(cel.ano, cel.mes, dia));
          const eventos = eventosPorDia[dataISO] || [];
          const selecionada = dataISO === diaSelecionado;
          const ehHoje = dataISO === hojeISO;
          const ehAlvoDrag = itemArrastando && diaAlvo === dataISO;
          const temAvaliacao = eventos.some((ev) => ev.tipo === "avaliacoes");
          const eventoImportante = eventos.find((ev) => ev.tipo === "avaliacoes");
          const marcadores = marcadoresDoDia(eventos, marcosVigencia[dataISO] || []);
          const { visiveis: marcadoresVisiveis, ocultos: marcadoresOcultos } = resumirMarcadores(marcadores);

          // Estados (hoje/selecionada/destino do arrasto/avaliação) ficam em
          // calendario.css (#24). Só a cor da cadeira da avaliação vem daqui,
          // como variável: o glow dela SOMA com o destaque do estado.
          const celulaStyle = temAvaliacao ? { "--cor-rgb": hexParaRgb(eventoImportante.cor) } : undefined;

          return (
            <div
              key={idx}
              data-dia-iso={dataISO}
              className={`calendario-celula${ehHoje ? " hoje" : ""}${selecionada ? " selecionada" : ""}${ehAlvoDrag ? " destino-drag" : ""}${temAvaliacao ? " tem-avaliacao" : ""}${cel.foraDoMes ? " fora-do-mes" : ""}`}
              {...propsDeBotao(
                () => {
                  if (cel.foraDoMes) {
                    setCursor({ ano: cel.ano, mes: cel.mes });
                    setDiaSelecionado(dataISO);
                  } else {
                    setDiaSelecionado(selecionada ? null : dataISO);
                  }
                },
                { "aria-label": formatarData(dataISO), "aria-pressed": selecionada },
              )}
              style={celulaStyle}
            >
              <span className="calendario-numero">{dia}</span>
              {/* Marcadores (Fase 5): ★ compromisso, livro = avaliação, bandeiras =
                  vigência. Um ícone por tipo (número = quantos), até 3; passou
                  disso, 2 + "+N". Só informativos: o clique é da célula. */}
              {marcadores.length > 0 && (
                <span
                  className="calendario-marcos"
                  title={marcadores.flatMap((m) => m.titulos.map(TEXTO_MARCADOR[m.tipo])).join("\n")}
                >
                  {marcadoresVisiveis.map((m) => {
                    const Icone = ICONE_MARCADOR[m.tipo];
                    return (
                      <span key={m.tipo} className={`calendario-marcador marcador-${m.tipo}`}>
                        <Icone size={11} color={m.cor} fill={m.tipo === "compromisso" ? m.cor : "none"} />
                        {m.quantidade > 1 && <sup>{m.quantidade}</sup>}
                      </span>
                    );
                  })}
                  {marcadoresOcultos > 0 && <span className="calendario-marcos-mais">+{marcadoresOcultos}</span>}
                </span>
              )}
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

      {/* Lista do dia selecionado: EMBAIXO do calendário (antes ficava em
          cima), igual à tela Hoje — mesmo componente, mesma ordem. */}
      <ListaDoDia
        diaISO={diaSelecionado}
        hojeISO={hojeISO}
        cabecalho={
          <h2 className="titulo-secao">
            {diaSelecionado ? `Eventos em ${formatarData(diaSelecionado)}` : "Selecione um dia para ver os detalhes"}
          </h2>
        }
        eventos={eventosDoDiaSelecionado}
        marcos={marcosDoDiaSelecionado}
        eventosConcluidos={eventosConcluidos}
        textoSemDia="Clique em qualquer dia do calendário para ver a programação detalhada."
        onAlternarEventoConcluido={onAlternarEventoConcluido}
        onMarcarFalta={onMarcarFalta}
        onExcluirInstanciaEvento={onExcluirInstanciaEvento}
        onAlternarFeitoAfazer={onAlternarFeitoAfazer}
        onExcluirAfazer={onExcluirAfazer}
        onAlternarFeitoCompromisso={onAlternarFeitoCompromisso}
        onExcluirCompromisso={onExcluirCompromisso}
        onNovoAfazer={onNovoAfazer}
        onNovoCompromisso={onNovoCompromisso}
        arrasto={{
          podeArrastar,
          iniciar: iniciarPossivelArrasto,
          mover: moverArrasto,
          finalizar: finalizarArrasto,
          chaveArrastando: itemArrastando?.chave ?? null,
          chavePronta: itemPronto,
        }}
        rodape={
          itemArrastando && (
            <div className="subtle detalhe-dia-dica">Arraste até um dia do calendário para mudar a data.</div>
          )
        }
      />

      {itemArrastando && (
        <div
          className="drag-ghost"
          style={{ left: itemArrastando.x, top: itemArrastando.y, borderColor: itemArrastando.cor }}
        >
          <span className="drag-ghost-ponto" style={{ background: itemArrastando.cor }} />
          <span className="drag-ghost-titulo">{itemArrastando.titulo}</span>
        </div>
      )}
    </div>
  );
}
