import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Check, Trash, Repeat, Clock, Edit2, X } from "lucide-react";
import { ROTINA_OPCOES, URGENCIA_CORES, DIAS_FULL } from "../constants.js";
import { formatarData } from "../utils/formatarData.js";
import EstadoVazio from "./ui/EstadoVazio.jsx";
import SeletorCor from "./ui/SeletorCor.jsx";
import BarraUrgencia from "./ui/BarraUrgencia.jsx";
import { useNavegacaoEnter } from "../hooks/useNavegacaoEnter.js";

const COR_PADRAO_AFAZER = "#221e1e";

// Tipos de rotina onde a data-base preenchida no cadastro é usada só para
// calcular as ocorrências, mas não tem por que aparecer na listagem — o
// usuário não precisa saber "quando começou", só se repete.
const ROTINAS_SEM_DATA_NA_LISTAGEM = ["diaria", "semanal", "quinzenal", "mensal", "personalizada", "dias_especificos"];

const LETRA_DIA = DIAS_FULL.map((d) => d[0]);

function rotinaLabel(rotina) {
  if (!rotina || rotina.tipo === "nenhuma") return null;
  let labelBase = "";
  if (rotina.tipo === "personalizada") {
    labelBase = `a cada ${rotina.intervaloDias || 1} dia${(rotina.intervaloDias || 1) !== 1 ? "s" : ""}`;
  } else if (rotina.tipo === "dias_especificos") {
    const dias = Array.isArray(rotina.diasSemana) ? [...rotina.diasSemana].sort((a, b) => a - b) : [];
    labelBase = dias.length ? dias.map((d) => DIAS_FULL[d].slice(0, 3)).join(", ") : "dias específicos";
  } else {
    labelBase = ROTINA_OPCOES.find((o) => o.valor === rotina.tipo)?.label.toLowerCase() || "";
  }

  if (rotina.totalRepeticoes) {
    labelBase += ` (${rotina.totalRepeticoes}x)`;
  }
  return labelBase;
}

function FormularioAfazer({ onSalvar, itemEmEdicao, onCancelarEdicao, gatilhoNovaData }) {
  const [nome, setNome] = useState("");
  const [temData, setTemData] = useState(false);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [rotinaTipo, setRotinaTipo] = useState("nenhuma");
  const [intervaloDias, setIntervaloDias] = useState(3);
  const [diasSemana, setDiasSemana] = useState([]);
  const [totalRepeticoes, setTotalRepeticoes] = useState("");
  const [urgencia, setUrgencia] = useState(1);
  const [cor, setCor] = useState(COR_PADRAO_AFAZER);
  const formRef = useRef(null);
  const nomeRef = useRef(null);
  useNavegacaoEnter(formRef);

  useEffect(() => {
    if (itemEmEdicao) {
      setNome(itemEmEdicao.nome || "");
      setTemData(!!itemEmEdicao.data);
      setData(itemEmEdicao.data || "");
      setHora(itemEmEdicao.hora || "");
      setRotinaTipo(itemEmEdicao.rotina?.tipo || "nenhuma");
      setIntervaloDias(itemEmEdicao.rotina?.intervaloDias || 3);
      setDiasSemana(Array.isArray(itemEmEdicao.rotina?.diasSemana) ? itemEmEdicao.rotina.diasSemana : []);
      setTotalRepeticoes(itemEmEdicao.rotina?.totalRepeticoes || "");
      setUrgencia(itemEmEdicao.urgencia || 1);
      setCor(itemEmEdicao.cor || COR_PADRAO_AFAZER);
    } else {
      limpar();
    }
  }, [itemEmEdicao]);

  // Veio um pedido de "novo afazer nesta data" (ex: botão + no calendário geral).
  // Preenche a data e foca o nome, sem mexer em edição em andamento.
  useEffect(() => {
    if (!gatilhoNovaData || itemEmEdicao) return;
    setTemData(true);
    setData(gatilhoNovaData.data);
    nomeRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gatilhoNovaData?.ts]);

  const limpar = () => {
    setNome("");
    setTemData(false);
    setData("");
    setHora("");
    setRotinaTipo("nenhuma");
    setIntervaloDias(3);
    setDiasSemana([]);
    setTotalRepeticoes("");
    setUrgencia(1);
    setCor(COR_PADRAO_AFAZER);
    if (onCancelarEdicao) onCancelarEdicao();
  };

  const submit = () => {
    const n = nome.trim();
    if (!n) return window.alert("Dê um nome para o afazer.");
    if (temData && !data) return window.alert("Escolha a data ou desmarque a opção de data/hora.");
    if (rotinaTipo === "dias_especificos" && diasSemana.length === 0) {
      return window.alert("Escolha ao menos um dia da semana para a rotina.");
    }

    onSalvar({
      nome: n,
      data: temData ? data : "",
      hora: temData ? hora : "",
      rotina: {
        tipo: rotinaTipo,
        intervaloDias: rotinaTipo === "personalizada" ? Number(intervaloDias) || 1 : undefined,
        diasSemana: rotinaTipo === "dias_especificos" ? [...diasSemana].sort((a, b) => a - b) : undefined,
        totalRepeticoes: rotinaTipo !== "nenhuma" && totalRepeticoes ? Number(totalRepeticoes) : undefined,
      },
      urgencia,
      cor,
    });
    limpar();
  };

  const alternarDiaSemana = (d) => {
    setDiasSemana((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));
  };

  return (
    <div className="afazer-form" ref={formRef}>
      <input
        className="input"
        placeholder="Nome do afazer, ex: Estudar para a prova"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        ref={nomeRef}
      />

      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <SeletorCor valor={cor} onChange={setCor} label="Cor de identificação:" />
      </div>

      <label className="checkbox-linha">
        <input type="checkbox" checked={temData} onChange={(e) => setTemData(e.target.checked)} />
        Definir dia/hora (vai para o calendário)
      </label>

      {temData && (
        <div className="form-grid duas-colunas" style={{ marginTop: 8 }}>
          <input className="input" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          <input className="input" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </div>
      )}

      {/* SELETOR DE ROTINA E REPETIÇÕES */}
      <div className="form-grid duas-colunas" style={{ marginTop: 8 }}>
        <select className="input" value={rotinaTipo} onChange={(e) => setRotinaTipo(e.target.value)}>
          {ROTINA_OPCOES.map((o) => (
            <option key={o.valor} value={o.valor}>{o.label}</option>
          ))}
        </select>

        {rotinaTipo !== "nenhuma" && (
          <div style={{ display: "flex", gap: 6 }}>
            {rotinaTipo === "personalizada" && (
              <input
                className="input"
                type="number"
                min={1}
                placeholder="Dias"
                title="A cada quantos dias"
                value={intervaloDias}
                onChange={(e) => setIntervaloDias(e.target.value)}
                style={{ flex: 1 }}
              />
            )}
            <input
              className="input"
              type="number"
              min={1}
              placeholder="Qtd. vezes (vazio = eterno)"
              title="Número de repetições (deixe em branco para repetir indefinidamente)"
              value={totalRepeticoes}
              onChange={(e) => setTotalRepeticoes(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
        )}
      </div>

      {rotinaTipo === "dias_especificos" && (
        <div className="dias-semana-picker" style={{ marginTop: 8 }}>
          {LETRA_DIA.map((letra, d) => (
            <button
              key={d}
              type="button"
              title={DIAS_FULL[d]}
              className={`dia-semana-bolinha${diasSemana.includes(d) ? " ativa" : ""}`}
              onClick={() => alternarDiaSemana(d)}
            >
              {letra}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <label style={{ fontSize: "0.8rem", color: "#a1a1aa", marginBottom: 4, display: "block" }}>
          Nível de urgência:
        </label>
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
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button className="btn-primario full" onClick={submit}>
          {itemEmEdicao ? <Check size={15} /> : <Plus size={15} />}
          {itemEmEdicao ? "Salvar alterações" : "Adicionar afazer"}
        </button>
        {itemEmEdicao && (
          <button className="btn-secundario" onClick={limpar} title="Cancelar edição">
            <X size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function VisaoAfazeres({
  afazeres,
  onCriar,
  onEditar,
  onAlternarFeito,
  onExcluir,
  onLimparConcluidos,
  gatilhoNovaData,
}) {
  const [itemEmEdicao, setItemEmEdicao] = useState(null);

  useEffect(() => {
    if (gatilhoNovaData) setItemEmEdicao(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gatilhoNovaData?.ts]);

  const salvarHandler = (dados) => {
    if (itemEmEdicao) {
      if (onEditar) onEditar(itemEmEdicao.id, dados);
      setItemEmEdicao(null);
    } else {
      onCriar(dados);
    }
  };

  const pendentes = afazeres.filter((a) => !a.feito);
  const concluidos = afazeres.filter((a) => a.feito);

  const pendentesOrdenados = [...pendentes].sort((a, b) => {
    if (a.data && b.data) return `${a.data}T${a.hora || "00:00"}`.localeCompare(`${b.data}T${b.hora || "00:00"}`);
    if (a.data) return -1;
    if (b.data) return 1;
    return b.urgencia - a.urgencia;
  });

  // Concluídos: os marcados mais recentemente ficam no topo do grupo.
  const concluidosOrdenados = [...concluidos].sort((a, b) => (b.concluidoEm || 0) - (a.concluidoEm || 0));

  const ordenados = [...pendentesOrdenados, ...concluidosOrdenados];

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
        >
          <Trash size={14} /> Apagar concluídos ({concluidos.length})
        </button>
      </div>

      <FormularioAfazer
        onSalvar={salvarHandler}
        itemEmEdicao={itemEmEdicao}
        onCancelarEdicao={() => setItemEmEdicao(null)}
        gatilhoNovaData={gatilhoNovaData}
      />

      {ordenados.length === 0 ? (
        <EstadoVazio texto="Nenhum afazer cadastrado ainda" />
      ) : (
        <div className="lista-itens lista-afazeres" style={{ marginTop: 20 }}>
          {ordenados.map((a) => {
            const corAfazer = a.cor || "#8b5cf6";
            return (
              <div
                key={a.id}
                className={`item-afazer${a.feito ? " feito" : ""}`}
                style={{ borderLeft: `4px solid ${corAfazer}`, paddingLeft: 12 }}
              >
                <button
                  className={`check-btn${a.feito ? " marcado" : ""}`}
                  onClick={() => onAlternarFeito(a.id)}
                  style={{ borderColor: a.feito ? "transparent" : corAfazer }}
                >
                  {a.feito && <Check size={13} />}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="item-linha-titulo" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{a.nome}</span>
                  </div>
                  <div className="subtle afazer-meta">
                    {a.data && !ROTINAS_SEM_DATA_NA_LISTAGEM.includes(a.rotina?.tipo) && (
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
                <button className="icon-btn-ghost" onClick={() => setItemEmEdicao(a)} title="Editar afazer">
                  <Edit2 size={13} />
                </button>
                <button
                  className="icon-btn-ghost"
                  onClick={() => {
                    if (window.confirm(`Excluir o afazer "${a.nome}"?`)) {
                      onExcluir(a.id);
                    }
                  }}
                  title="Excluir afazer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}