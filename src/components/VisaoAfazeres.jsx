// src/components/VisaoAfazeres.jsx
//
// Afazeres (Fase 5): coisas a fazer SEM hora marcada (o que tem hora é
// compromisso ou rotina). Um afazer pode:
//  - não ter data → aparece em "hoje" no calendário até ser concluído;
//  - ter uma data → aparece só nela (atrasado = selo vermelho na aba);
//  - se repetir a partir da data (ou de hoje), até uma data de fim
//    escolhida num calendário que só mostra os dias da repetição — sem fim
//    = para sempre.
import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Trash2, Check, Trash, Repeat, CalendarDays, Edit2, X, AlertTriangle } from "lucide-react";
import { ROTINA_OPCOES, URGENCIA_CORES, DIAS_FULL } from "../constants.js";
import useDialogos from "../hooks/useDialogos";
import {
  toISO,
  ehRotina,
  dataAoSalvarAfazer,
  rotinaSemDataBase,
  datasDaRegra,
  ehDataDaRegra,
  dataFimDaRotina,
  textoRepeticao,
  textoFimRepeticao,
  descreverAfazer,
  secoesDosAfazeres,
  ROTINAS_COM_DATA_BASE,
} from "../utils/afazeres.js";
import { textoDataComSemana, rotuloRelativo } from "../utils/compromissos.js";
import EstadoVazio from "./ui/EstadoVazio.jsx";
import SeletorCor from "./ui/SeletorCor.jsx";
import SeletorData from "./ui/SeletorData.jsx";
import BarraUrgencia from "./ui/BarraUrgencia.jsx";
import SecaoLista from "./ui/SecaoLista.jsx";
import { useNavegacaoEnter } from "../hooks/useNavegacaoEnter.js";

const COR_PADRAO_AFAZER = "#221e1e";
const LETRA_DIA = DIAS_FULL.map((d) => d[0]);

// Rótulos do seletor de repetição (os valores continuam os de ROTINA_OPCOES).
const ROTULO_OPCAO = { nenhuma: "Não se repete" };

function FormularioAfazer({ onSalvar, itemEmEdicao, onCancelarEdicao, gatilhoNovaData, onGatilhoConsumido }) {
  const { avisar } = useDialogos();
  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [rotinaTipo, setRotinaTipo] = useState("nenhuma");
  const [intervaloDias, setIntervaloDias] = useState(3);
  const [diasSemana, setDiasSemana] = useState([]);
  const [dataFim, setDataFim] = useState("");
  const [urgencia, setUrgencia] = useState(1);
  const [cor, setCor] = useState(COR_PADRAO_AFAZER);
  const formRef = useRef(null);
  const nomeRef = useRef(null);
  useNavegacaoEnter(formRef);
  const hojeISO = toISO(new Date());

  const limpar = () => {
    setNome("");
    setData("");
    setRotinaTipo("nenhuma");
    setIntervaloDias(3);
    setDiasSemana([]);
    setDataFim("");
    setUrgencia(1);
    setCor(COR_PADRAO_AFAZER);
    if (onCancelarEdicao) onCancelarEdicao();
  };

  useEffect(() => {
    if (itemEmEdicao) {
      setNome(itemEmEdicao.nome || "");
      setData(itemEmEdicao.data || "");
      setRotinaTipo(itemEmEdicao.rotina?.tipo || "nenhuma");
      setIntervaloDias(itemEmEdicao.rotina?.intervaloDias || 3);
      setDiasSemana(Array.isArray(itemEmEdicao.rotina?.diasSemana) ? itemEmEdicao.rotina.diasSemana : []);
      setDataFim(dataFimDaRotina(itemEmEdicao));
      setUrgencia(itemEmEdicao.urgencia || 1);
      setCor(itemEmEdicao.cor || COR_PADRAO_AFAZER);
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      nomeRef.current?.focus({ preventScroll: true });
    } else {
      limpar();
    }
    // `limpar` é recriada a cada render; só a troca do item em edição importa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemEmEdicao]);

  // Veio um pedido de "novo afazer nesta data" (ex: botão + no calendário geral).
  // Preenche a data e foca o nome, sem mexer em edição em andamento.
  useEffect(() => {
    if (!gatilhoNovaData || itemEmEdicao) return;
    setData(gatilhoNovaData.data);
    nomeRef.current?.focus();
    // Consumido: o App limpa o gatilho (#42). Antes ele ficava guardado e
    // TODA visita seguinte à aba Afazeres reabria o formulário com aquela
    // data antiga (o efeito roda de novo a cada montagem).
    onGatilhoConsumido?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gatilhoNovaData?.ts]);

  const repete = rotinaTipo !== "nenhuma";
  // Regra como vai ser salva (data-base efetiva: repetição sem data começa hoje).
  const rascunho = {
    data: dataAoSalvarAfazer({ rotinaTipo, data }, hojeISO),
    rotina: {
      tipo: rotinaTipo,
      intervaloDias: Number(intervaloDias) || 1,
      diasSemana,
      dataFim: repete ? dataFim : "",
    },
  };
  const fimInvalido = repete && !!dataFim && !ehDataDaRegra(rascunho, dataFim);

  // Dias clicáveis no seletor de fim = dias da repetição (a partir do início).
  const regraKey = JSON.stringify([rascunho.data, rotinaTipo, rascunho.rotina.intervaloDias, diasSemana]);
  const datasPossiveisDeFim = useCallback(
    (inicioISO, fimISO) => new Set(datasDaRegra(rascunho, inicioISO, fimISO)),
    // a regra inteira está resumida em `regraKey`
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [regraKey],
  );

  const submit = () => {
    const n = nome.trim();
    const faltando = (texto) => avisar(texto, { titulo: "Faltam dados" });
    if (!n) return faltando("Dê um nome para o afazer.");
    if (rotinaTipo === "dias_especificos" && diasSemana.length === 0) {
      return faltando("Escolha ao menos um dia da semana para a repetição.");
    }
    if (fimInvalido) return faltando("A data de fim não cai num dia da repetição. Escolha outra (ou deixe vazia).");

    onSalvar({
      nome: n,
      data: rascunho.data,
      rotina: {
        tipo: rotinaTipo,
        intervaloDias: rotinaTipo === "personalizada" ? Number(intervaloDias) || 1 : undefined,
        diasSemana: rotinaTipo === "dias_especificos" ? [...diasSemana].sort((a, b) => a - b) : undefined,
        dataFim: repete && dataFim ? dataFim : undefined,
      },
      urgencia,
      cor,
    });
    limpar();
  };

  const alternarDiaSemana = (d) => {
    setDiasSemana((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));
  };

  // Início da repetição sem data escolhida: hoje (diária etc.) ou "toda semana" (dias específicos).
  const placeholderData = repete
    ? ROTINAS_COM_DATA_BASE.includes(rotinaTipo)
      ? "A partir de hoje"
      : "Qualquer semana"
    : "Sem data";

  return (
    <div className="form-card" ref={formRef}>
      <div className="form-card-titulo">{itemEmEdicao ? "Editar afazer" : "Novo afazer"}</div>
      <input
        className="input"
        placeholder="O que precisa ser feito? ex: Estudar para a prova"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        ref={nomeRef}
      />

      <div className="form-campos">
        <div className="form-campo">
          <span className="form-campo-rotulo">{repete ? "Começa em" : "Dia"}</span>
          <SeletorData valor={data} onChange={setData} placeholder={placeholderData} limpavel />
        </div>

        <div className="form-campo">
          <span className="form-campo-rotulo">Repetição</span>
          <select className="input" value={rotinaTipo} onChange={(e) => setRotinaTipo(e.target.value)}>
            {ROTINA_OPCOES.map((o) => (
              <option key={o.valor} value={o.valor}>
                {ROTULO_OPCAO[o.valor] || o.label}
              </option>
            ))}
          </select>
        </div>

        {rotinaTipo === "personalizada" && (
          <div className="form-campo">
            <span className="form-campo-rotulo">A cada quantos dias</span>
            <input
              className="input"
              type="number"
              min={1}
              value={intervaloDias}
              onChange={(e) => setIntervaloDias(e.target.value)}
            />
          </div>
        )}

        {rotinaTipo === "dias_especificos" && (
          <div className="form-campo form-campo-largo">
            <span className="form-campo-rotulo">Dias da semana</span>
            <div className="dias-semana-picker">
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
          </div>
        )}

        {repete && (
          <div className="form-campo">
            <span className="form-campo-rotulo">Termina em</span>
            <SeletorData
              valor={dataFim}
              onChange={setDataFim}
              placeholder="Para sempre (∞)"
              permitidas={datasPossiveisDeFim}
              minimo={rascunho.data || hojeISO}
              marcada={rascunho.data}
              mesInicial={rascunho.data > hojeISO ? rascunho.data : ""}
              invalido={fimInvalido}
              limpavel
            />
            {fimInvalido && <span className="form-erro">Essa data não é um dia da repetição.</span>}
          </div>
        )}
      </div>

      <div className="form-campo">
        <span className="form-campo-rotulo">Urgência</span>
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

      <div className="form-campo">
        <SeletorCor valor={cor} onChange={setCor} adiarMs={0} label="Cor:" />
      </div>

      <p className="form-resumo">{descreverAfazer(rascunho, hojeISO)}</p>

      <div className="form-acoes">
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

function ItemAfazer({ item, hojeISO, onAlternarFeito, onEditar, onExcluir }) {
  const { afazer: a, ocorrencia, diasAtraso } = item;
  const cor = a.cor || "#8b5cf6";
  const rotina = ehRotina(a);
  // Recorrentes já vêm com a ocorrência calculada por secoesDosAfazeres.
  const oc = rotina ? (ocorrencia ?? null) : null;
  const marcado = rotina ? !!oc?.concluida : !!a.feito;
  const encerrado = rotina && !oc;

  return (
    <div
      className={`item-lista${!rotina && a.feito ? " feito" : ""}${encerrado ? " encerrado" : ""}`}
      style={{ "--cor-item": cor }}
    >
      <button
        className={`check-btn${marcado ? " marcado" : ""}`}
        onClick={() => (rotina ? onAlternarFeito(a.id, oc.dataOriginal) : onAlternarFeito(a.id))}
        disabled={encerrado}
        title={
          rotina
            ? oc
              ? `Concluir só o dia ${oc.data === hojeISO ? "de hoje" : textoDataComSemana(oc.data)}`
              : "Esta repetição já terminou"
            : undefined
        }
        style={{ borderColor: marcado ? "transparent" : cor }}
      >
        {marcado && <Check size={13} />}
      </button>

      <div className="item-lista-texto">
        <div className="item-lista-titulo">{a.nome}</div>
        <div className="item-lista-meta">
          {!rotina && a.data && (
            <span className={`chip-meta${diasAtraso ? " atrasado" : ""}`}>
              {diasAtraso ? <AlertTriangle size={11} /> : <CalendarDays size={11} />}
              {textoDataComSemana(a.data)}
              {diasAtraso
                ? ` · atrasado há ${diasAtraso}d`
                : a.data !== hojeISO
                  ? ` · ${rotuloRelativo(a.data, hojeISO)}`
                  : ""}
            </span>
          )}
          {!rotina && !a.data && <span className="chip-meta">sem data · aparece hoje</span>}
          {rotina && (
            <span className="chip-meta">
              <Repeat size={11} />
              {textoRepeticao(a.rotina)} · {textoFimRepeticao(a) === "para sempre" ? "∞" : textoFimRepeticao(a)}
            </span>
          )}
          {rotina && oc && (
            <span className={`chip-meta${oc.data === hojeISO ? " hoje" : ""}`}>
              {oc.concluida ? "✓ " : ""}
              {oc.data === hojeISO ? "hoje" : `próx.: ${textoDataComSemana(oc.data)}`}
            </span>
          )}
          {encerrado && !rotinaSemDataBase(a) && <span className="chip-meta">terminou</span>}
          {rotinaSemDataBase(a) && (
            <span className="chip-meta atrasado">sem data de início: edite e salve para aparecer no calendário</span>
          )}
        </div>
      </div>

      <BarraUrgencia nivel={a.urgencia} />
      <button className="icon-btn-ghost" onClick={() => onEditar(a)} title="Editar afazer">
        <Edit2 size={13} />
      </button>
      <button className="icon-btn-ghost" onClick={() => onExcluir(a.id)} title="Excluir afazer">
        <Trash2 size={13} />
      </button>
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
  onGatilhoConsumido,
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

  const hojeISO = toISO(new Date());
  const secoes = secoesDosAfazeres(afazeres, hojeISO);
  const pendentes = secoes.atrasados.length + secoes.hoje.length + secoes.proximos.length + secoes.semData.length;
  const props = { hojeISO, onAlternarFeito, onEditar: setItemEmEdicao, onExcluir };
  const lista = (itens) => itens.map((item) => <ItemAfazer key={item.afazer.id} item={item} {...props} />);

  return (
    <div>
      <div className="header-bar">
        <h1 className="titulo-pagina">Afazeres</h1>
        <span className="subtle" style={{ marginLeft: "auto" }}>
          {pendentes} pendente{pendentes !== 1 ? "s" : ""} · {secoes.recorrentes.length} recorrente
          {secoes.recorrentes.length !== 1 ? "s" : ""}
        </span>
      </div>

      <FormularioAfazer
        onSalvar={salvarHandler}
        itemEmEdicao={itemEmEdicao}
        onCancelarEdicao={() => setItemEmEdicao(null)}
        gatilhoNovaData={gatilhoNovaData}
        onGatilhoConsumido={onGatilhoConsumido}
      />

      {afazeres.length === 0 ? (
        <EstadoVazio texto="Nenhum afazer cadastrado ainda" />
      ) : (
        <div className="secoes-lista">
          <SecaoLista titulo="Atrasados" itens={secoes.atrasados} destaque="secao-alerta">
            {lista(secoes.atrasados)}
          </SecaoLista>
          <SecaoLista titulo="Hoje" itens={secoes.hoje}>
            {lista(secoes.hoje)}
          </SecaoLista>
          <SecaoLista titulo="Próximos" itens={secoes.proximos}>
            {lista(secoes.proximos)}
          </SecaoLista>
          <SecaoLista titulo="Sem data" itens={secoes.semData}>
            {lista(secoes.semData)}
          </SecaoLista>
          <SecaoLista titulo="Recorrentes" itens={secoes.recorrentes}>
            {lista(secoes.recorrentes)}
          </SecaoLista>
          <SecaoLista
            titulo="Concluídos"
            itens={secoes.concluidos}
            recolhivel
            acao={
              <button className="btn-secundario btn-pequeno" onClick={onLimparConcluidos}>
                <Trash size={13} /> Apagar concluídos
              </button>
            }
          >
            {lista(secoes.concluidos)}
          </SecaoLista>
        </div>
      )}
    </div>
  );
}
