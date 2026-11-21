import { useState } from "react";
import { AlertTriangle, BookOpen, Repeat, ZoomIn, ZoomOut } from "lucide-react";
import { DIAS, DIAS_FULL } from "../constants.js";
import { formatarData } from "../utils/formatarData.js";
import { toISO } from "../utils/afazeres.js";
import EstadoVazio from "./ui/EstadoVazio.jsx";
import SecaoLista from "./ui/SecaoLista.jsx";
import { datasImportantes } from "../utils/cadeiras.js";
import { horariosNaSemana } from "../utils/rotinas.js";
import { corVisivel } from "../utils/calendario.js";
import useZoomAgenda from "../hooks/useZoomAgenda.js";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { faixaDeHoras, percentualNaGrade } from "../utils/agendaSemanal.js";
import { ZOOM_MAX, ZOOM_MIN, textoZoom } from "../utils/zoomAgenda.js";
import { propsDeBotao } from "../utils/acessibilidade.js";
import { distribuirEmColunas } from "../utils/conflitos.js";

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

// Celular em pé: a grade é desenhada DEITADA (girada 90°) e o usuário gira o
// aparelho para ler — a semana inteira aparece na proporção de uma tela
// deitada, sem espremer os 7 dias na largura. O PWA trava em retrato
// (manifest), por isso o giro é feito no CSS e não pelo sistema.
const CONSULTA_AGENDA_GIRADA = "(max-width: 860px) and (orientation: portrait)";

export default function VisaoAgenda({ cadeiras, rotinas = [], onAbrirCadeira, onAbrirRotina }) {
  const [filtros, setFiltros] = useState(lerFiltrosAgendaIniciais);
  // #24: a semana inteira cabe na tela; pinça / Ctrl+roda / − + ampliam.
  // Girada, a grade já ocupa a tela toda: sem zoom (a pinça em coordenadas
  // giradas ampliaria no lugar errado).
  const girada = useMediaQuery(CONSULTA_AGENDA_GIRADA);
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
      {...propsDeBotao(() => onAbrirCadeira(d.cadeiraId))}
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

  const faixa = faixaDeHoras(blocos);
  const totalHoras = faixa.fim - faixa.inicio;

  // #32: blocos do mesmo dia que se cruzam ficam lado a lado (antes um
  // cobria o outro) e ganham o ⚠. Só avisa; nada é bloqueado.
  const blocosPorDia = DIAS.map((_, idx) => blocos.filter((b) => b.dia === idx));
  const posicoes = blocosPorDia.map((doDia) => distribuirEmColunas(doDia));
  const totalConflitos = posicoes.reduce((n, pos) => n + [...pos.values()].filter((p) => p.conflito).length, 0);

  return (
    <div>
      <div className="header-bar">
        <h1 className="titulo-pagina">Agenda da semana</h1>
        <span className="subtle">
          {blocos.length} horário{blocos.length !== 1 ? "s" : ""} fixo{blocos.length !== 1 ? "s" : ""}
        </span>
        {totalConflitos > 0 && (
          <span className="agenda-conflitos" title="Horários que se cruzam aparecem lado a lado, com ⚠">
            <AlertTriangle size={13} /> {totalConflitos} em conflito
          </span>
        )}
      </div>

      <div className="filtros-linha">
        <button className={`filtro-chip${filtros.cadeiras ? " ativo" : ""}`} onClick={() => alternarFiltro("cadeiras")}>
          <BookOpen size={13} /> Cadeiras
        </button>
        <button className={`filtro-chip${filtros.rotinas ? " ativo" : ""}`} onClick={() => alternarFiltro("rotinas")}>
          <Repeat size={13} /> Rotinas
        </button>
        {blocos.length > 0 && !girada && (
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
        <div className={girada ? "agenda-girada" : undefined}>
          <div
            className="agenda-wrap"
            ref={girada ? undefined : definirArea}
            style={{ "--agenda-zoom": girada ? 1 : zoom, "--agenda-horas": totalHoras }}
          >
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
                    {faixa.inicio + i}h
                  </div>
                ))}
              </div>
              {DIAS_FULL.map((dia, idx) => (
                <div key={dia} className="agenda-coluna">
                  {Array.from({ length: totalHoras }, (_, i) => (
                    <div key={i} className="agenda-linha" />
                  ))}
                  {blocosPorDia[idx].map((b) => {
                    const top = percentualNaGrade(b.inicio, faixa.inicio, faixa.fim);
                    const bottom = percentualNaGrade(b.fim, faixa.inicio, faixa.fim);
                    const { coluna, colunas, conflito } = posicoes[idx].get(b);
                    return (
                      <div
                        key={b.id}
                        className={`agenda-bloco${conflito ? " conflito" : ""}`}
                        style={{
                          top: `${top}%`,
                          height: `${Math.max(bottom - top, 4)}%`,
                          "--col": coluna,
                          "--cols": colunas,
                          background: b.cor + "22",
                          borderLeft: `3px solid ${b.cor}`,
                        }}
                        {...propsDeBotao(
                          () => (b.tipo === "rotina" ? onAbrirRotina(b.origemId) : onAbrirCadeira(b.origemId)),
                          {
                            "aria-label": `${b.origemNome}, ${DIAS_FULL[idx]}, ${b.inicio} a ${b.fim}${conflito ? ", em conflito de horário" : ""}`,
                          },
                        )}
                        title={`${b.origemNome} · ${b.inicio}–${b.fim}${conflito ? " · ⚠ conflito de horário" : ""}`}
                      >
                        <span className="agenda-bloco-titulo" style={{ color: b.cor }}>
                          {conflito && <AlertTriangle size={10} className="agenda-bloco-alerta" />}
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
