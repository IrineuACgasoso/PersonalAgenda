// src/components/VisaoCompromissos.jsx
// Compromissos (Fase 5): eventos PONTUAIS com data e hora marcadas
// (dentista, reunião, entrega presencial). No calendário geral, o dia ganha
// uma ★ na cor do compromisso. Não dependem de período.
import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Check, Trash, Edit2, X, Star, Bell, BellOff } from "lucide-react";
import useDialogos from "../hooks/useDialogos";
import { toISO } from "../utils/afazeres.js";
import { corVisivel } from "../utils/calendario.js";
import {
  erroDoCompromisso,
  secoesDosCompromissos,
  textoHorarioCompromisso,
  textoDataComSemana,
  rotuloRelativo,
} from "../utils/compromissos.js";
import EstadoVazio from "./ui/EstadoVazio.jsx";
import SeletorCor from "./ui/SeletorCor.jsx";
import SeletorData from "./ui/SeletorData.jsx";
import SecaoLista from "./ui/SecaoLista.jsx";
import SeletorLembretes from "./ui/SeletorLembretes.jsx";
import { OPCOES_LEMBRETE, LEMBRETES_PADRAO, textoListaLembretes } from "../utils/lembretes.js";
import { useNavegacaoEnter } from "../hooks/useNavegacaoEnter.js";

const COR_PADRAO_COMPROMISSO = "#f59e0b";

function FormularioCompromisso({
  onSalvar,
  itemEmEdicao,
  onCancelarEdicao,
  gatilhoNovaData,
  onGatilhoConsumido,
  lembretesPadrao,
}) {
  const { avisar } = useDialogos();
  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [cor, setCor] = useState(COR_PADRAO_COMPROMISSO);
  // Lembretes deste compromisso (#23): undefined = padrão global.
  const [lembretes, setLembretes] = useState(undefined);
  const formRef = useRef(null);
  const nomeRef = useRef(null);
  useNavegacaoEnter(formRef);

  const limpar = () => {
    setNome("");
    setData("");
    setInicio("");
    setFim("");
    setCor(COR_PADRAO_COMPROMISSO);
    setLembretes(undefined);
    if (onCancelarEdicao) onCancelarEdicao();
  };

  useEffect(() => {
    if (itemEmEdicao) {
      setNome(itemEmEdicao.nome || "");
      setData(itemEmEdicao.data || "");
      setInicio(itemEmEdicao.inicio || "");
      setFim(itemEmEdicao.fim || "");
      setCor(itemEmEdicao.cor || COR_PADRAO_COMPROMISSO);
      setLembretes(itemEmEdicao.lembretes);
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      nomeRef.current?.focus({ preventScroll: true });
    } else {
      limpar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemEmEdicao]);

  // "+ Compromisso" no calendário geral: já vem com a data (igual ao afazer, #42).
  useEffect(() => {
    if (!gatilhoNovaData || itemEmEdicao) return;
    setData(gatilhoNovaData.data);
    nomeRef.current?.focus();
    onGatilhoConsumido?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gatilhoNovaData?.ts]);

  const submit = () => {
    const erro = erroDoCompromisso({ nome, data, inicio, fim });
    if (erro) return avisar(erro, { titulo: "Faltam dados" });
    onSalvar({ nome: nome.trim(), data, inicio, fim: fim || undefined, cor, lembretes });
    limpar();
  };

  return (
    <div className="form-card" ref={formRef}>
      <div className="form-card-titulo">{itemEmEdicao ? "Editar compromisso" : "Novo compromisso"}</div>
      <input
        className="input"
        placeholder="O que vai acontecer? ex: Dentista, Reunião do projeto"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        ref={nomeRef}
      />

      <div className="form-campos">
        <div className="form-campo">
          <span className="form-campo-rotulo">Data</span>
          <SeletorData valor={data} onChange={setData} placeholder="Escolher data" />
        </div>
        <div className="form-campo form-campo-horas">
          <div>
            <span className="form-campo-rotulo">Início</span>
            <input className="input" type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div>
            <span className="form-campo-rotulo">Fim (opcional)</span>
            <input className="input" type="time" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="form-campo">
        <SeletorCor valor={cor} onChange={setCor} adiarMs={0} label="Cor:" />
      </div>

      <div className="form-campo">
        <SeletorLembretes
          valor={lembretes}
          onChange={setLembretes}
          padrao={lembretesPadrao}
          opcoes={OPCOES_LEMBRETE.compromissos}
          personalizavel
          unidadeInicial="h"
        />
      </div>

      <div className="form-acoes">
        <button className="btn-primario full" onClick={submit}>
          {itemEmEdicao ? <Check size={15} /> : <Plus size={15} />}
          {itemEmEdicao ? "Salvar alterações" : "Adicionar compromisso"}
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

function ItemCompromisso({ c, hojeISO, onAlternarFeito, onEditar, onExcluir }) {
  const cor = corVisivel(c.cor || COR_PADRAO_COMPROMISSO);
  return (
    <div className={`item-lista${c.feito ? " feito" : ""}`} style={{ "--cor-item": cor }}>
      <button
        className={`check-btn${c.feito ? " marcado" : ""}`}
        onClick={() => onAlternarFeito(c.id)}
        title={c.feito ? "Marcar como não realizado" : "Marcar como realizado"}
        style={{ borderColor: c.feito ? "transparent" : cor }}
      >
        {c.feito && <Check size={13} />}
      </button>
      <div className="item-lista-texto">
        <div className="item-lista-titulo">{c.nome}</div>
        <div className="item-lista-meta">
          <span className={`chip-meta${c.data === hojeISO ? " hoje" : ""}`}>
            <Star size={11} fill={cor} color={cor} />
            {textoDataComSemana(c.data)} · {rotuloRelativo(c.data, hojeISO)}
          </span>
          {/* Só quando foge do padrão (#23). */}
          {Array.isArray(c.lembretes) && (
            <span className="chip-meta" title="Lembrete deste compromisso">
              {c.lembretes.length ? <Bell size={11} /> : <BellOff size={11} />}
              {textoListaLembretes(c.lembretes)}
            </span>
          )}
        </div>
      </div>
      <span className="item-lista-hora">{textoHorarioCompromisso(c)}</span>
      <button className="icon-btn-ghost" onClick={() => onEditar(c)} title="Editar compromisso">
        <Edit2 size={13} />
      </button>
      <button className="icon-btn-ghost" onClick={() => onExcluir(c.id)} title="Excluir compromisso">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

export default function VisaoCompromissos({
  compromissos,
  onCriar,
  onEditar,
  onAlternarFeito,
  onExcluir,
  onLimparPassados,
  gatilhoNovaData,
  onGatilhoConsumido,
  lembretesPadrao = LEMBRETES_PADRAO.compromissos,
}) {
  const [itemEmEdicao, setItemEmEdicao] = useState(null);

  useEffect(() => {
    if (gatilhoNovaData) setItemEmEdicao(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gatilhoNovaData?.ts]);

  const salvar = (dados) => {
    if (itemEmEdicao) {
      onEditar(itemEmEdicao.id, dados);
      setItemEmEdicao(null);
    } else {
      onCriar(dados);
    }
  };

  const hojeISO = toISO(new Date());
  const { hoje, proximos, passados } = secoesDosCompromissos(compromissos, hojeISO);
  const props = { hojeISO, onAlternarFeito, onEditar: setItemEmEdicao, onExcluir };
  const lista = (itens) => itens.map((c) => <ItemCompromisso key={c.id} c={c} {...props} />);
  const futuros = hoje.length + proximos.length;

  return (
    <div>
      <div className="header-bar">
        <h1 className="titulo-pagina">Compromissos</h1>
        <span className="subtle" style={{ marginLeft: "auto" }}>
          {futuros} pela frente
        </span>
      </div>

      <FormularioCompromisso
        onSalvar={salvar}
        itemEmEdicao={itemEmEdicao}
        onCancelarEdicao={() => setItemEmEdicao(null)}
        gatilhoNovaData={gatilhoNovaData}
        onGatilhoConsumido={onGatilhoConsumido}
        lembretesPadrao={lembretesPadrao}
      />

      {compromissos.length === 0 ? (
        <EstadoVazio texto="Nenhum compromisso marcado" />
      ) : (
        <div className="secoes-lista">
          <SecaoLista titulo="Hoje" itens={hoje}>
            {lista(hoje)}
          </SecaoLista>
          <SecaoLista titulo="Próximos" itens={proximos}>
            {lista(proximos)}
          </SecaoLista>
          <SecaoLista
            titulo="Passados"
            itens={passados}
            recolhivel
            acao={
              <button className="btn-secundario btn-pequeno" onClick={onLimparPassados}>
                <Trash size={13} /> Apagar passados
              </button>
            }
          >
            {lista(passados)}
          </SecaoLista>
          {futuros === 0 && <EstadoVazio texto="Nada marcado daqui para frente" pequeno />}
        </div>
      )}
    </div>
  );
}
