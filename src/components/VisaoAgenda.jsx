import React from "react";
import { DIAS, DIAS_FULL, HORA_INICIO, HORA_FIM } from "../constants.js";
import { formatarData } from "../utils/formatarData.js";
import EstadoVazio from "./ui/EstadoVazio.jsx";

function minutosParaTopo(hhmm, totalHoras) {
  const [h, m] = hhmm.split(":").map(Number);
  const frac = (h + m / 60 - HORA_INICIO) / totalHoras;
  return Math.max(0, Math.min(1, frac)) * 100;
}

export default function VisaoAgenda({ cadeiras, onAbrir }) {
  const blocos = [];
  cadeiras.forEach((c) => {
    c.horarios.forEach((h) => {
      blocos.push({ ...h, cadeiraId: c.id, cadeiraNome: c.nome, cor: c.cor });
    });
  });

  const proximasDatas = cadeiras
    .flatMap((c) => c.datas.map((d) => ({ ...d, cadeiraNome: c.nome, cor: c.cor, cadeiraId: c.id })))
    .sort((a, b) => `${a.data}T${a.hora || "00:00"}`.localeCompare(`${b.data}T${b.hora || "00:00"}`));

  const hojeStr = new Date().toISOString().slice(0, 10);
  const totalHoras = HORA_FIM - HORA_INICIO;

  return (
    <div>
      <div className="header-bar">
        <h1 className="titulo-pagina">Agenda da semana</h1>
        <span className="subtle">
          {blocos.length} horário{blocos.length !== 1 ? "s" : ""} fixo{blocos.length !== 1 ? "s" : ""}
        </span>
      </div>

      {blocos.length === 0 ? (
        <EstadoVazio texto="Cadastre horários nas cadeiras para ver a agenda" />
      ) : (
        <div className="agenda-wrap">
          <div className="agenda-grid-head">
            <div className="agenda-hora-col" />
            {DIAS.map((d) => (
              <div key={d} className="agenda-dia-head">{d}</div>
            ))}
          </div>
          <div className="agenda-body">
            <div className="agenda-hora-col">
              {Array.from({ length: totalHoras }, (_, i) => (
                <div key={i} className="agenda-hora-label">{HORA_INICIO + i}h</div>
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
                        onClick={() => onAbrir(b.cadeiraId)}
                        title={`${b.cadeiraNome} · ${b.inicio}–${b.fim}`}
                      >
                        <span className="agenda-bloco-titulo" style={{ color: b.cor }}>{b.cadeiraNome}</span>
                        <span className="agenda-bloco-hora">{b.inicio}–{b.fim}{b.local ? ` · ${b.local}` : ""}</span>
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
        {proximasDatas.length === 0 ? (
          <EstadoVazio texto="Nenhuma data importante cadastrada" />
        ) : (
          <div className="lista-proximas-datas">
            {proximasDatas.map((d) => (
              <div
                key={d.id}
                className={`data-item${d.data < hojeStr ? " passada" : ""}`}
                onClick={() => onAbrir(d.cadeiraId)}
              >
                <div className="data-item-faixa" style={{ background: d.cor }} />
                <div style={{ flex: 1 }}>
                  <div className="data-item-titulo">{d.titulo}</div>
                  <div className="subtle">{d.cadeiraNome}</div>
                </div>
                <div className="data-item-data">
                  {formatarData(d.data)}{d.hora ? ` · ${d.hora}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}