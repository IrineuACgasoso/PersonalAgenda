import React, { useState } from "react";
import { Plus, Trash2, Check, Trash, Repeat, Clock } from "lucide-react";
import { ROTINA_OPCOES, URGENCIA_CORES, URGENCIA_LABELS } from "../constants.js";
import { formatarData } from "../utils/formatarData.js";
import EstadoVazio from "./ui/EstadoVazio.jsx";

function rotinaLabel(rotina) {
  if (!rotina || rotina.tipo === "nenhuma") return null;
  if (rotina.tipo === "personalizada") {
    return `a cada ${rotina.intervaloDias || 1} dia${(rotina.intervaloDias || 1) !== 1 ? "s" : ""}`;
  }
  return ROTINA_OPCOES.find((o) => o.valor === rotina.tipo)?.label.toLowerCase();
}

function BarraUrgencia({ nivel }) {
  const cor = URGENCIA_CORES[nivel] || URGENCIA_CORES[1];
  return (
    <div className="urgencia-bateria" title={`Urgência: ${URGENCIA_LABELS[nivel]}`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className="urgencia-segmento"
          style={{
            background: i <= nivel ? cor : "transparent",
            borderColor: cor,
          }}
        />
      ))}
    </div>
  );
}

function FormularioAfazer({ onCriar }) {
  const [nome, setNome] = useState("");
  const [temData, setTemData] = useState(false);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [rotinaTipo, setRotinaTipo] = useState("nenhuma");
  const [intervaloDias, setIntervaloDias] = useState(3);
  const [urgencia, setUrgencia] = useState(1);

  const limpar = () => {
    setNome("");
    setTemData(false);
    setData("");
    setHora("");
    setRotinaTipo("nenhuma");
    setIntervaloDias(3);
    setUrgencia(1);
  };

  const adicionar = () => {
    const n = nome.trim();
    if (!n) {
      window.alert("Dê um nome para o afazer.");
      return;
    }
    if (temData && !data) {
      window.alert("Escolha a data ou desmarque a opção de data/hora.");
      return;
    }
    onCriar({
      nome: n,
      data: temData ? data : "",
      hora: temData ? hora : "",
      rotina: {
        tipo: rotinaTipo,
        intervaloDias: rotinaTipo === "personalizada" ? Number(intervaloDias) || 1 : undefined,
      },
      urgencia,
    });
    limpar();
  };

  return (
    <div className="afazer-form">
      <input
        className="input"
        placeholder="Nome do afazer, ex: Estudar para a prova"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && adicionar()}
      />

      <label className="checkbox-linha">
        <input type="checkbox" checked={temData} onChange={(e) => setTemData(e.target.checked)} />
        Definir dia/hora (vai para o calendário)
      </label>

      {temData && (
        <div className="form-grid duas-colunas">
          <input className="input" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          <input className="input" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </div>
      )}

      <div className="form-grid duas-colunas" style={{ marginTop: 8 }}>
        <select className="input" value={rotinaTipo} onChange={(e) => setRotinaTipo(e.target.value)}>
          {ROTINA_OPCOES.map((o) => (
            <option key={o.valor} value={o.valor}>{o.label}</option>
          ))}
        </select>
        {rotinaTipo === "personalizada" ? (
          <input
            className="input"
            type="number"
            min={1}
            placeholder="a cada quantos dias?"
            value={intervaloDias}
            onChange={(e) => setIntervaloDias(e.target.value)}
          />
        ) : (
          <div className="urgencia-picker">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                className={`urgencia-opcao${urgencia === n ? " ativa" : ""}`}
                onClick={() => setUrgencia(n)}
                style={{ borderColor: URGENCIA_CORES[n] }}
              >
                <BarraUrgencia nivel={n} />
              </button>
            ))}
          </div>
        )}
      </div>

      {rotinaTipo === "personalizada" && (
        <div className="urgencia-picker" style={{ marginTop: 8 }}>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              className={`urgencia-opcao${urgencia === n ? " ativa" : ""}`}
              onClick={() => setUrgencia(n)}
              style={{ borderColor: URGENCIA_CORES[n] }}
            >
              <BarraUrgencia nivel={n} />
            </button>
          ))}
        </div>
      )}

      <button className="btn-primario full" onClick={adicionar} style={{ marginTop: 10 }}>
        <Plus size={15} /> Adicionar afazer
      </button>
    </div>
  );
}

export default function VisaoAfazeres({
  afazeres,
  onCriar,
  onAlternarFeito,
  onExcluir,
  onLimparConcluidos,
}) {
  const pendentes = afazeres.filter((a) => !a.feito);
  const concluidos = afazeres.filter((a) => a.feito);

  const ordenados = [...pendentes, ...concluidos].sort((a, b) => {
    if (a.feito !== b.feito) return a.feito ? 1 : -1;
    if (a.data && b.data) return `${a.data}T${a.hora || "00:00"}`.localeCompare(`${b.data}T${b.hora || "00:00"}`);
    if (a.data) return -1;
    if (b.data) return 1;
    return b.urgencia - a.urgencia;
  });

  return (
    <div>
      <div className="header-bar">
        <h1 className="titulo-pagina">Afazeres</h1>
        <span className="subtle">
          {pendentes.length} pendente{pendentes.length !== 1 ? "s" : ""}
        </span>
        <button
          className="btn-secundario"
          style={{ marginLeft: "auto" }}
          onClick={onLimparConcluidos}
          disabled={concluidos.length === 0}
          title="Apaga definitivamente os afazeres marcados como concluídos"
        >
          <Trash size={14} /> Apagar concluídos ({concluidos.length})
        </button>
      </div>

      <FormularioAfazer onCriar={onCriar} />

      {ordenados.length === 0 ? (
        <EstadoVazio texto="Nenhum afazer cadastrado ainda" />
      ) : (
        <div className="lista-itens" style={{ marginTop: 20 }}>
          {ordenados.map((a) => (
            <div key={a.id} className={`item-afazer${a.feito ? " feito" : ""}`}>
              <button
                className={`check-btn${a.feito ? " marcado" : ""}`}
                onClick={() => onAlternarFeito(a.id)}
                title={a.feito ? "Marcar como pendente" : "Marcar como concluído"}
              >
                {a.feito && <Check size={13} />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="item-linha-titulo">{a.nome}</div>
                <div className="subtle afazer-meta">
                  {a.data && (
                    <span>
                      <Clock size={11} style={{ verticalAlign: "-1px", marginRight: 3 }} />
                      {formatarData(a.data)}{a.hora ? ` · ${a.hora}` : ""}
                    </span>
                  )}
                  {rotinaLabel(a.rotina) && (
                    <span>
                      <Repeat size={11} style={{ verticalAlign: "-1px", margin: "0 3px 0 8px" }} />
                      {rotinaLabel(a.rotina)}
                    </span>
                  )}
                </div>
              </div>
              <BarraUrgencia nivel={a.urgencia} />
              <button className="icon-btn-ghost" onClick={() => onExcluir(a.id)}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
