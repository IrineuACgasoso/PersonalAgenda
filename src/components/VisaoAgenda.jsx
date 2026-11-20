import { useState } from "react";
import { BookOpen, Repeat, ZoomIn, ZoomOut } from "lucide-react";
import { DIAS, DIAS_FULL, HORA_INICIO, HORA_FIM } from "../constants.js";
import { formatarData } from "../utils/formatarData.js";
import { toISO } from "../utils/afazeres.js";
import EstadoVazio from "./ui/EstadoVazio.jsx";
import SecaoLista from "./ui/SecaoLista.jsx";
import { datasImportantes } from "../utils/cadeiras.js";
import { horariosNaSemana } from "../utils/rotinas.js";
import { corVisivel } from "../utils/calendario.js";
import useZoomAgenda from "../hooks/useZoomAgenda.js";
import { ZOOM_MAX, ZOOM_MIN, textoZoom } from "../utils/zoomAgenda.js";

const FILTROS_AGENDA_KEY = "painel-academico-filtros-agenda";

// "rotinas" herda o filtro salvo do antigo "compromissos" (semanais até a v5).
function lerFiltrosAgendaIniciais() {
  const padrao = { cadeiras: true, rotinas: true };
  try {
    const raw = localStorage.getItem(FILTROS_AGENDA_KEY);
    if (!raw) return padrao;
    const salvos = JSON.parse(raw);
    const herdado = "rotinas" in salvos || !("compromissos" in salvos) ? {} : { rotinas: salvos.compromissos };
    return { ...padrao, ...herdado, ...salvos };
  } catch {
    return padrao;
  }
}

function minutosParaTopo(hhmm, totalHoras) {
  const [h, m] = hhmm.split(":").map(Number);
  const frac = (h + m / 60 - HORA_INICIO) / totalHoras;
  return Math.max(0, Math.min(1, frac)) * 100;
}

export default function VisaoAgenda({ cadeiras, rotinas = [], onAbrirCadeira, onAbrirRotina }) {
  const [filtros, setFiltros] = useState(lerFiltrosAgendaIniciais);
  // #24: a semana inteira cabe na tela; pinça / Ctrl+roda / − + ampliam.
  const { definirArea, zoom, aumentar, diminuir, redefinir } = useZoomAgenda();

  const alternarFiltro = (chave) => {
    setFiltros((prev) => {
      const proximo = { ...prev, [chave]: !prev[chave] };
      try {
        localStorage.setItem(FILTROS_AGENDA_KEY, JSON.stringify(proximo));
      } catch {
        /* ignora erros de storage */
      }
      return proximo;
    });
  };

  // Data LOCAL (#13): com toISOString() (UTC), depois das 21h as datas de hoje já apareciam como passadas.
  const hojeStr = toISO(new Date());

  const blocos = [];
  if (filtros.cadeiras) {
    cadeiras.forEach((c) => {
      c.horarios.forEach((h) => {
        blocos.push({ ...h, tipo: "cadeira", origemId: c.id, origemNome: c.nome, cor: corVisivel(c.cor) });
      });
    });
  }
  if (filtros.rotinas) {
    // Só os horários que valem nesta semana (vigência da rotina, #56).
    rotinas.forEach((r) => {
      horariosNaSemana(r, hojeStr).forEach((h) => {
        blocos.push({ ...h, tipo: "rotina", origemId: r.id, origemNome: r.nome, cor: corVisivel(r.cor) });
      });
    });
  }

  // Futuras primeiro; as que já passaram ficam recolhidas no fim (#46).
  const { proximas, anteriores } = datasImportantes(cadeiras, hojeStr);
  const itemData = (d) => (
    <div
      key={d.id}
      className={`data-item${d.data < hojeStr ? " passada" : ""}`}
      onClick={() => onAbrirCadeira(d.cadeiraId)}
    >
      <div className="data-item-faixa" style={{ background: corVisivel(d.cor) }} />
      <div className="data-item-texto">
        <div className="data-item-titulo">{d.titulo}</div>
        <div className="subtle">{d.cadeiraNome}</div>
      </div>
      <div className="data-item-data">
        {formatarData(d.data)}
        {d.hora ? ` · ${d.hora}` : ""}
      </div>
    </div>
  );

  const totalHoras = HORA_FIM - HORA_INICIO;

  return (
    <div>
      <div className="header-bar">
        <h1 className="titulo-pagina">Agenda da semana</h1>
        <span className="subtle">
          {blocos.length} horário{blocos.length !== 1 ? "s" : ""} fixo{blocos.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="filtros-linha">
        <button className={`filtro-chip${filtros.cadeiras ? " ativo" : ""}`} onClick={() => alternarFiltro("cadeiras")}>
          <BookOpen size={13} /> Cadeiras
        </button>
        <button className={`filtro-chip${filtros.rotinas ? " ativo" : ""}`} onClick={() => alternarFiltro("rotinas")}>
          <Repeat size={13} /> Rotinas
        </button>
        {blocos.length > 0 && (
          <div className="agenda-zoom" role="group" aria-label="Zoom da agenda">
            <button
              type="button"
              className="icon-btn-ghost"
              onClick={diminuir}
              disabled={zoom <= ZOOM_MIN}
              title="Diminuir zoom"
            >
              <ZoomOut size={16} />
            </button>
            <button type="button" className="agenda-zoom-valor" onClick={redefinir} title="Voltar a 100%">
              {textoZoom(zoom)}
            </button>
            <button
              type="button"
              className="icon-btn-ghost"
              onClick={aumentar}
              disabled={zoom >= ZOOM_MAX}
              title="Aumentar zoom (ou pinça / Ctrl + roda do mouse)"
            >
              <ZoomIn size={16} />
            </button>
          </div>
        )}
      </div>

      {blocos.length === 0 ? (
        <EstadoVazio texto="Cadastre horários nas cadeiras ou rotinas para ver a agenda" />
      ) : (
        <div className="agenda-wrap" ref={definirArea} style={{ "--agenda-zoom": zoom }}>
          <div className="agenda-grid-head">
            <div className="agenda-hora-col" />
            {DIAS.map((d) => (
              <div key={d} className="agenda-dia-head">
                {d}
              </div>
            ))}
          </div>
          <div className="agenda-body">
            <div className="agenda-hora-col">
              {Array.from({ length: totalHoras }, (_, i) => (
                <div key={i} className="agenda-hora-label">
                  {HORA_INICIO + i}h
                </div>
              ))}
            </div>
            {DIAS_FULL.map((dia, idx) => (
              <div key={dia} className="agenda-coluna">
                {Array.from({ length: totalHoras }, (_, i) => (
                  <div key={i} className="agenda-linha" />
                ))}
                {blocos
                  .filter((b) => b.dia === idx)
                  .map((b) => {
                    const top = minutosParaTopo(b.inicio, totalHoras);
                    const bottom = minutosParaTopo(b.fim, totalHoras);
                    return (
                      <div
                        key={b.id}
                        className="agenda-bloco"
                        style={{
                          top: `${top}%`,
                          height: `${Math.max(bottom - top, 4)}%`,
                          background: b.cor + "22",
                          borderLeft: `3px solid ${b.cor}`,
                        }}
                        onClick={() => (b.tipo === "rotina" ? onAbrirRotina(b.origemId) : onAbrirCadeira(b.origemId))}
                        title={`${b.origemNome} · ${b.inicio}–${b.fim}`}
                      >
                        <span className="agenda-bloco-titulo" style={{ color: b.cor }}>
                          {b.origemNome}
                        </span>
                        <span className="agenda-bloco-hora">
                          {b.inicio}–{b.fim}
                          {b.local ? ` · ${b.local}` : ""}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="proximas-datas">
        <h2 className="titulo-secao">Próximas datas importantes</h2>
        {proximas.length + anteriores.length === 0 ? (
          <EstadoVazio texto="Nenhuma data importante cadastrada" />
        ) : (
          <>
            {proximas.length === 0 ? (
              <p className="subtle proximas-datas-nenhuma">Nenhuma data pela frente.</p>
            ) : (
              <div className="lista-proximas-datas">{proximas.map(itemData)}</div>
            )}
            <div className="proximas-datas-anteriores">
              <SecaoLista titulo="Anteriores" itens={anteriores} recolhivel>
                {anteriores.map(itemData)}
              </SecaoLista>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
