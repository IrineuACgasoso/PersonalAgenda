import React, { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Trash2, X, Link as LinkIcon, Calendar, Clock, BookOpen, ChevronLeft, ChevronRight, Edit2, MapPin, Save, Check, ExternalLink } from "lucide-react";

/* ---------- constantes ---------- */
const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const DIAS_FULL = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const CORES = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6"];
const HORA_INICIO = 6; // grade das 6h às 23h
const HORA_FIM = 23;
const STORAGE_KEY = "painel-academico-data";

const uid = () => Math.random().toString(36).slice(2, 10);

const dadosVazios = () => {
  const id = uid();
  return {
    periodos: [{ id, nome: "2026.1" }],
    periodoAtivoId: id,
    cadeiras: [], // {id, periodoId, nome, cor, horarios:[{id,dia,inicio,fim,local}], links:[{id,titulo,url}], datas:[{id,titulo,data,hora}]}
  };
};

/* ---------- persistência ---------- */
function usePersistedData() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | saved | saving | error
  const saveTimeout = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        setData(res ? JSON.parse(res.value) : dadosVazios());
      } catch {
        setData(dadosVazios());
      }
      setStatus("saved");
    })();
  }, []);

  const persist = useCallback((next) => {
    setData(next);
    setStatus("saving");
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify(next), false);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, 300);
  }, []);

  return { data, persist, status };
}

/* ---------- app ---------- */
export default function App() {
  const { data, persist, status } = usePersistedData();
  const [aba, setAba] = useState("cadeiras"); // cadeiras | agenda
  const [cadeiraAbertaId, setCadeiraAbertaId] = useState(null);
  const [modalPeriodo, setModalPeriodo] = useState(false);
  const [editandoPeriodoId, setEditandoPeriodoId] = useState(null);

  if (!data) {
    return (
      <div style={estilos.loadingWrap}>
        <div style={estilos.loadingText}>Carregando seu painel...</div>
      </div>
    );
  }

  const periodoAtivo = data.periodos.find((p) => p.id === data.periodoAtivoId) || data.periodos[0];
  const cadeirasDoPeriodo = data.cadeiras.filter((c) => c.periodoId === periodoAtivo?.id);
  const cadeiraAberta = data.cadeiras.find((c) => c.id === cadeiraAbertaId);

  /* ---- ações períodos ---- */
  const criarPeriodo = (nome) => {
    const novo = { id: uid(), nome };
    persist({ ...data, periodos: [...data.periodos, novo], periodoAtivoId: novo.id });
  };
  const renomearPeriodo = (id, nome) => {
    persist({ ...data, periodos: data.periodos.map((p) => (p.id === id ? { ...p, nome } : p)) });
  };
  const excluirPeriodo = (id) => {
    if (!window.confirm("Excluir este período? As cadeiras dele também serão removidas.")) return;
    const periodos = data.periodos.filter((p) => p.id !== id);
    const cadeiras = data.cadeiras.filter((c) => c.periodoId !== id);
    const periodoAtivoId = data.periodoAtivoId === id ? periodos[0]?.id ?? null : data.periodoAtivoId;
    persist({ ...data, periodos, cadeiras, periodoAtivoId });
  };

  /* ---- ações cadeiras ---- */
  const criarCadeira = (nome) => {
    const nova = {
      id: uid(),
      periodoId: periodoAtivo.id,
      nome,
      cor: CORES[data.cadeiras.length % CORES.length],
      horarios: [],
      links: [],
      datas: [],
    };
    persist({ ...data, cadeiras: [...data.cadeiras, nova] });
    setCadeiraAbertaId(nova.id);
  };
  const atualizarCadeira = (id, patch) => {
    persist({ ...data, cadeiras: data.cadeiras.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  };
  const excluirCadeira = (id) => {
    if (!window.confirm("Excluir esta cadeira e todos os seus dados?")) return;
    persist({ ...data, cadeiras: data.cadeiras.filter((c) => c.id !== id) });
    if (cadeiraAbertaId === id) setCadeiraAbertaId(null);
  };

  return (
    <div style={estilos.app}>
      <Sidebar
        data={data}
        periodoAtivo={periodoAtivo}
        onSelecionarPeriodo={(id) => persist({ ...data, periodoAtivoId: id })}
        onNovoPeriodo={() => setModalPeriodo(true)}
        onEditarPeriodo={(id) => setEditandoPeriodoId(id)}
        onExcluirPeriodo={excluirPeriodo}
        aba={aba}
        setAba={setAba}
        status={status}
      />

      <main style={estilos.main}>
        {!periodoAtivo ? (
          <EstadoVazio texto="Crie um período para começar" onAcao={() => setModalPeriodo(true)} acaoTexto="Novo período" />
        ) : aba === "cadeiras" ? (
          <VisaoCadeiras
            periodoAtivo={periodoAtivo}
            cadeiras={cadeirasDoPeriodo}
            onCriar={criarCadeira}
            onAbrir={setCadeiraAbertaId}
            onExcluir={excluirCadeira}
          />
        ) : (
          <VisaoAgenda cadeiras={cadeirasDoPeriodo} onAbrir={setCadeiraAbertaId} />
        )}
      </main>

      {cadeiraAberta && (
        <PainelCadeira
          cadeira={cadeiraAberta}
          onFechar={() => setCadeiraAbertaId(null)}
          onAtualizar={(patch) => atualizarCadeira(cadeiraAberta.id, patch)}
          onExcluir={() => excluirCadeira(cadeiraAberta.id)}
        />
      )}

      {modalPeriodo && (
        <ModalTexto
          titulo="Novo período"
          placeholder="ex: 2026.2"
          onConfirmar={(v) => {
            criarPeriodo(v);
            setModalPeriodo(false);
          }}
          onCancelar={() => setModalPeriodo(false)}
        />
      )}

      {editandoPeriodoId && (
        <ModalTexto
          titulo="Renomear período"
          valorInicial={data.periodos.find((p) => p.id === editandoPeriodoId)?.nome}
          onConfirmar={(v) => {
            renomearPeriodo(editandoPeriodoId, v);
            setEditandoPeriodoId(null);
          }}
          onCancelar={() => setEditandoPeriodoId(null)}
        />
      )}
    </div>
  );
}

/* ---------- sidebar ---------- */
function Sidebar({ data, periodoAtivo, onSelecionarPeriodo, onNovoPeriodo, onEditarPeriodo, onExcluirPeriodo, aba, setAba, status }) {
  return (
    <aside style={estilos.sidebar}>
      <div style={estilos.sidebarHeader}>
        <div style={estilos.logoDot} />
        <span style={estilos.logoText}>Painel acadêmico</span>
      </div>

      <div style={estilos.sidebarSecao}>
        <div style={estilos.sidebarSecaoLabel}>
          <span>Períodos</span>
          <button style={estilos.iconBtnSm} onClick={onNovoPeriodo} title="Novo período">
            <Plus size={14} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {data.periodos.map((p) => (
            <div
              key={p.id}
              style={{
                ...estilos.periodoItem,
                ...(p.id === periodoAtivo?.id ? estilos.periodoItemAtivo : {}),
              }}
              onClick={() => onSelecionarPeriodo(p.id)}
            >
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nome}</span>
              <div style={{ display: "flex", gap: 2 }}>
                <button
                  style={estilos.iconBtnGhost}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditarPeriodo(p.id);
                  }}
                >
                  <Edit2 size={12} />
                </button>
                <button
                  style={estilos.iconBtnGhost}
                  onClick={(e) => {
                    e.stopPropagation();
                    onExcluirPeriodo(p.id);
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={estilos.sidebarSecao}>
        <div style={estilos.sidebarSecaoLabel}>
          <span>Visão</span>
        </div>
        <button style={{ ...estilos.navBtn, ...(aba === "cadeiras" ? estilos.navBtnAtivo : {}) }} onClick={() => setAba("cadeiras")}>
          <BookOpen size={15} /> Cadeiras
        </button>
        <button style={{ ...estilos.navBtn, ...(aba === "agenda" ? estilos.navBtnAtivo : {}) }} onClick={() => setAba("agenda")}>
          <Calendar size={15} /> Agenda da semana
        </button>
      </div>

      <div style={estilos.statusFooter}>
        <span style={{ ...estilos.statusDot, background: status === "saved" ? "#10b981" : status === "error" ? "#ef4444" : "#f59e0b" }} />
        {status === "saved" ? "Tudo salvo" : status === "saving" ? "Salvando..." : "Erro ao salvar"}
      </div>
    </aside>
  );
}

/* ---------- visão cadeiras ---------- */
function VisaoCadeiras({ periodoAtivo, cadeiras, onCriar, onAbrir, onExcluir }) {
  const [novoNome, setNovoNome] = useState("");

  const adicionar = () => {
    const nome = novoNome.trim();
    if (!nome) return;
    onCriar(nome);
    setNovoNome("");
  };

  return (
    <div>
      <div style={estilos.headerBar}>
        <h1 style={estilos.h1}>{periodoAtivo.nome}</h1>
        <span style={estilos.subtle}>{cadeiras.length} cadeira{cadeiras.length !== 1 ? "s" : ""}</span>
      </div>

      <div style={estilos.addRow}>
        <input
          style={estilos.input}
          placeholder="Nome da cadeira, ex: Cálculo II"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && adicionar()}
        />
        <button style={estilos.btnPrimario} onClick={adicionar}>
          <Plus size={16} /> Adicionar
        </button>
      </div>

      {cadeiras.length === 0 ? (
        <EstadoVazio texto="Nenhuma cadeira cadastrada ainda" />
      ) : (
        <div style={estilos.grid}>
          {cadeiras.map((c) => (
            <div key={c.id} style={estilos.card} onClick={() => onAbrir(c.id)}>
              <div style={{ ...estilos.cardFaixa, background: c.cor }} />
              <div style={estilos.cardBody}>
                <div style={estilos.cardTitleRow}>
                  <span style={estilos.cardTitle}>{c.nome}</span>
                  <button
                    style={estilos.iconBtnGhost}
                    onClick={(e) => {
                      e.stopPropagation();
                      onExcluir(c.id);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div style={estilos.cardMeta}>
                  <Clock size={12} />
                  <span>{c.horarios.length} horário{c.horarios.length !== 1 ? "s" : ""}</span>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <LinkIcon size={12} />
                  <span>{c.links.length} link{c.links.length !== 1 ? "s" : ""}</span>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <Calendar size={12} />
                  <span>{c.datas.length} data{c.datas.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- visão agenda ---------- */
function VisaoAgenda({ cadeiras, onAbrir }) {
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

  const minutosParaTopo = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    const frac = (h + m / 60 - HORA_INICIO) / totalHoras;
    return Math.max(0, Math.min(1, frac)) * 100;
  };

  return (
    <div>
      <div style={estilos.headerBar}>
        <h1 style={estilos.h1}>Agenda da semana</h1>
        <span style={estilos.subtle}>{blocos.length} horário{blocos.length !== 1 ? "s" : ""} fixo{blocos.length !== 1 ? "s" : ""}</span>
      </div>

      {blocos.length === 0 ? (
        <EstadoVazio texto="Cadastre horários nas cadeiras para ver a agenda" />
      ) : (
        <div style={estilos.agendaWrap}>
          <div style={estilos.agendaGridHead}>
            <div style={estilos.agendaHoraCol} />
            {DIAS.map((d) => (
              <div key={d} style={estilos.agendaDiaHead}>{d}</div>
            ))}
          </div>
          <div style={estilos.agendaBody}>
            <div style={estilos.agendaHoraCol}>
              {Array.from({ length: totalHoras }, (_, i) => (
                <div key={i} style={estilos.agendaHoraLabel}>{HORA_INICIO + i}h</div>
              ))}
            </div>
            {DIAS_FULL.map((dia, idx) => (
              <div key={dia} style={estilos.agendaColuna}>
                {Array.from({ length: totalHoras }, (_, i) => (
                  <div key={i} style={estilos.agendaLinha} />
                ))}
                {blocos
                  .filter((b) => b.dia === idx)
                  .map((b) => {
                    const top = minutosParaTopo(b.inicio);
                    const bottom = minutosParaTopo(b.fim);
                    return (
                      <div
                        key={b.id}
                        style={{
                          ...estilos.agendaBloco,
                          top: `${top}%`,
                          height: `${Math.max(bottom - top, 4)}%`,
                          background: b.cor + "22",
                          borderLeft: `3px solid ${b.cor}`,
                        }}
                        onClick={() => onAbrir(b.cadeiraId)}
                        title={`${b.cadeiraNome} · ${b.inicio}–${b.fim}`}
                      >
                        <span style={{ ...estilos.agendaBlocoTitulo, color: b.cor }}>{b.cadeiraNome}</span>
                        <span style={estilos.agendaBlocoHora}>{b.inicio}–{b.fim}{b.local ? ` · ${b.local}` : ""}</span>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <h2 style={estilos.h2}>Próximas datas importantes</h2>
        {proximasDatas.length === 0 ? (
          <EstadoVazio texto="Nenhuma data importante cadastrada" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
            {proximasDatas.map((d) => (
              <div key={d.id} style={{ ...estilos.dataItem, opacity: d.data < hojeStr ? 0.45 : 1 }} onClick={() => onAbrir(d.cadeiraId)}>
                <div style={{ ...estilos.dataItemFaixa, background: d.cor }} />
                <div style={{ flex: 1 }}>
                  <div style={estilos.dataItemTitulo}>{d.titulo}</div>
                  <div style={estilos.subtle}>{d.cadeiraNome}</div>
                </div>
                <div style={estilos.dataItemData}>
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

function formatarData(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/* ---------- painel lateral de cadeira ---------- */
function PainelCadeira({ cadeira, onFechar, onAtualizar, onExcluir }) {
  const [subaba, setSubaba] = useState("horarios"); // horarios | links | datas
  const [nomeEdit, setNomeEdit] = useState(cadeira.nome);

  useEffect(() => setNomeEdit(cadeira.nome), [cadeira.id]);

  const salvarNome = () => {
    const v = nomeEdit.trim();
    if (v && v !== cadeira.nome) onAtualizar({ nome: v });
  };

  /* horários */
  const addHorario = (h) => onAtualizar({ horarios: [...cadeira.horarios, { id: uid(), ...h }] });
  const rmHorario = (id) => onAtualizar({ horarios: cadeira.horarios.filter((h) => h.id !== id) });

  /* links */
  const addLink = (l) => onAtualizar({ links: [...cadeira.links, { id: uid(), ...l }] });
  const rmLink = (id) => onAtualizar({ links: cadeira.links.filter((l) => l.id !== id) });

  /* datas */
  const addData = (d) => onAtualizar({ datas: [...cadeira.datas, { id: uid(), ...d }] });
  const rmData = (id) => onAtualizar({ datas: cadeira.datas.filter((d) => d.id !== id) });

  return (
    <div style={estilos.overlay} onClick={onFechar}>
      <div style={estilos.painel} onClick={(e) => e.stopPropagation()}>
        <div style={estilos.painelHeader}>
          <span style={{ ...estilos.corDot, background: cadeira.cor }} />
          <input
            style={estilos.painelTitleInput}
            value={nomeEdit}
            onChange={(e) => setNomeEdit(e.target.value)}
            onBlur={salvarNome}
            onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
          />
          <button style={estilos.iconBtnGhost} onClick={onExcluir} title="Excluir cadeira">
            <Trash2 size={15} />
          </button>
          <button style={estilos.iconBtnGhost} onClick={onFechar}>
            <X size={17} />
          </button>
        </div>

        <div style={estilos.painelCores}>
          {CORES.map((c) => (
            <button
              key={c}
              onClick={() => onAtualizar({ cor: c })}
              style={{ ...estilos.corSwatch, background: c, outline: c === cadeira.cor ? "2px solid #fff" : "none", boxShadow: c === cadeira.cor ? `0 0 0 2px ${c}` : "none" }}
            />
          ))}
        </div>

        <div style={estilos.painelTabs}>
          <button style={{ ...estilos.painelTab, ...(subaba === "horarios" ? estilos.painelTabAtiva : {}) }} onClick={() => setSubaba("horarios")}>
            Horários
          </button>
          <button style={{ ...estilos.painelTab, ...(subaba === "links" ? estilos.painelTabAtiva : {}) }} onClick={() => setSubaba("links")}>
            Links e materiais
          </button>
          <button style={{ ...estilos.painelTab, ...(subaba === "datas" ? estilos.painelTabAtiva : {}) }} onClick={() => setSubaba("datas")}>
            Datas importantes
          </button>
        </div>

        <div style={estilos.painelConteudo}>
          {subaba === "horarios" && <AbaHorarios horarios={cadeira.horarios} onAdd={addHorario} onRemover={rmHorario} />}
          {subaba === "links" && <AbaLinks links={cadeira.links} onAdd={addLink} onRemover={rmLink} />}
          {subaba === "datas" && <AbaDatas datas={cadeira.datas} onAdd={addData} onRemover={rmData} />}
        </div>
      </div>
    </div>
  );
}

/* ---------- aba horários ---------- */
function AbaHorarios({ horarios, onAdd, onRemover }) {
  const [dia, setDia] = useState(0);
  const [inicio, setInicio] = useState("08:00");
  const [fim, setFim] = useState("10:00");
  const [local, setLocal] = useState("");

  const adicionar = () => {
    if (!inicio || !fim || inicio >= fim) {
      window.alert("Verifique o horário: o início precisa ser antes do fim.");
      return;
    }
    onAdd({ dia, inicio, fim, local: local.trim() });
    setLocal("");
  };

  return (
    <div>
      <div style={estilos.formGrid}>
        <select style={estilos.input} value={dia} onChange={(e) => setDia(Number(e.target.value))}>
          {DIAS_FULL.map((d, i) => (
            <option key={d} value={i}>{d}</option>
          ))}
        </select>
        <input style={estilos.input} type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        <input style={estilos.input} type="time" value={fim} onChange={(e) => setFim(e.target.value)} />
      </div>
      <div style={{ ...estilos.formGrid, gridTemplateColumns: "1fr auto", marginTop: 8 }}>
        <input style={estilos.input} placeholder="Local ou link da sala (opcional)" value={local} onChange={(e) => setLocal(e.target.value)} />
        <button style={estilos.btnPrimario} onClick={adicionar}><Plus size={15} /> Adicionar</button>
      </div>

      <div style={estilos.listaItens}>
        {horarios.length === 0 && <EstadoVazio texto="Nenhum horário cadastrado" pequeno />}
        {[...horarios]
          .sort((a, b) => a.dia - b.dia || a.inicio.localeCompare(b.inicio))
          .map((h) => (
            <div key={h.id} style={estilos.itemLinha}>
              <Clock size={14} style={{ opacity: 0.6 }} />
              <div style={{ flex: 1 }}>
                <div style={estilos.itemLinhaTitulo}>{DIAS_FULL[h.dia]} · {h.inicio}–{h.fim}</div>
                {h.local && (
                  <div style={estilos.subtle}>
                    <MapPin size={11} style={{ verticalAlign: "-1px", marginRight: 3 }} />
                    {h.local}
                  </div>
                )}
              </div>
              <button style={estilos.iconBtnGhost} onClick={() => onRemover(h.id)}><Trash2 size={13} /></button>
            </div>
          ))}
      </div>
    </div>
  );
}

/* ---------- aba links (título + url, com suporte a colar) ---------- */
function AbaLinks({ links, onAdd, onRemover }) {
  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");
  const [arrastando, setArrastando] = useState(false);

  const adicionar = () => {
    const t = titulo.trim();
    const u = url.trim();
    if (!t || !u) {
      window.alert("Preencha o título e o link.");
      return;
    }
    onAdd({ titulo: t, url: normalizarUrl(u) });
    setTitulo("");
    setUrl("");
  };

  const normalizarUrl = (u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastando(false);
    const texto = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    if (texto) setUrl(texto.trim());
  };

  const handlePaste = (e) => {
    const texto = e.clipboardData.getData("text");
    if (texto && !url) setUrl(texto.trim());
  };

  return (
    <div>
      <div
        style={{ ...estilos.dropZone, ...(arrastando ? estilos.dropZoneAtiva : {}) }}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={handleDrop}
      >
        <input
          style={estilos.input}
          placeholder="Título, ex: Slides da aula 3"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <input
          style={{ ...estilos.input, marginTop: 8 }}
          placeholder="Cole ou arraste o link aqui (ou digite)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => e.key === "Enter" && adicionar()}
        />
        <button style={{ ...estilos.btnPrimario, marginTop: 8, width: "100%", justifyContent: "center" }} onClick={adicionar}>
          <Plus size={15} /> Adicionar link
        </button>
      </div>

      <div style={estilos.listaItens}>
        {links.length === 0 && <EstadoVazio texto="Nenhum link cadastrado" pequeno />}
        {links.map((l) => (
          <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" style={estilos.linkItem}>
            <LinkIcon size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={estilos.itemLinhaTitulo}>{l.titulo}</div>
              <div style={{ ...estilos.subtle, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.url}</div>
            </div>
            <ExternalLink size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
            <button
              style={estilos.iconBtnGhost}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemover(l.id);
              }}
            >
              <Trash2 size={13} />
            </button>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ---------- aba datas importantes ---------- */
function AbaDatas({ datas, onAdd, onRemover }) {
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");

  const adicionar = () => {
    const t = titulo.trim();
    if (!t || !data) {
      window.alert("Preencha o título e a data.");
      return;
    }
    onAdd({ titulo: t, data, hora });
    setTitulo("");
    setData("");
    setHora("");
  };

  return (
    <div>
      <input style={estilos.input} placeholder="ex: Prova 1, entrega do trabalho..." value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      <div style={{ ...estilos.formGrid, marginTop: 8, gridTemplateColumns: "1fr 1fr" }}>
        <input style={estilos.input} type="date" value={data} onChange={(e) => setData(e.target.value)} />
        <input style={estilos.input} type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
      </div>
      <button style={{ ...estilos.btnPrimario, marginTop: 8, width: "100%", justifyContent: "center" }} onClick={adicionar}>
        <Plus size={15} /> Adicionar data
      </button>

      <div style={estilos.listaItens}>
        {datas.length === 0 && <EstadoVazio texto="Nenhuma data cadastrada" pequeno />}
        {[...datas]
          .sort((a, b) => `${a.data}T${a.hora || "00:00"}`.localeCompare(`${b.data}T${b.hora || "00:00"}`))
          .map((d) => (
            <div key={d.id} style={estilos.itemLinha}>
              <Calendar size={14} style={{ opacity: 0.6 }} />
              <div style={{ flex: 1 }}>
                <div style={estilos.itemLinhaTitulo}>{d.titulo}</div>
                <div style={estilos.subtle}>{formatarData(d.data)}{d.hora ? ` · ${d.hora}` : ""}</div>
              </div>
              <button style={estilos.iconBtnGhost} onClick={() => onRemover(d.id)}><Trash2 size={13} /></button>
            </div>
          ))}
      </div>
    </div>
  );
}

/* ---------- utilitários de UI ---------- */
function EstadoVazio({ texto, onAcao, acaoTexto, pequeno }) {
  return (
    <div style={{ ...estilos.vazio, padding: pequeno ? "20px 12px" : "48px 20px" }}>
      <span style={estilos.subtle}>{texto}</span>
      {onAcao && (
        <button style={{ ...estilos.btnPrimario, marginTop: 12 }} onClick={onAcao}>
          <Plus size={15} /> {acaoTexto}
        </button>
      )}
    </div>
  );
}

function ModalTexto({ titulo, placeholder, valorInicial = "", onConfirmar, onCancelar }) {
  const [valor, setValor] = useState(valorInicial);
  const ref = useRef(null);
  useEffect(() => ref.current?.focus(), []);

  const confirmar = () => {
    const v = valor.trim();
    if (v) onConfirmar(v);
  };

  return (
    <div style={estilos.overlay} onClick={onCancelar}>
      <div style={estilos.modalPequeno} onClick={(e) => e.stopPropagation()}>
        <div style={estilos.h2}>{titulo}</div>
        <input
          ref={ref}
          style={{ ...estilos.input, marginTop: 12 }}
          placeholder={placeholder}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && confirmar()}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
          <button style={estilos.btnSecundario} onClick={onCancelar}>Cancelar</button>
          <button style={estilos.btnPrimario} onClick={confirmar}><Check size={15} /> Salvar</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- estilos ---------- */
const estilos = {
  app: { display: "flex", minHeight: "100vh", background: "#0f1115", color: "#e8e8ea", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  loadingWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f1115", color: "#8a8a92" },
  loadingText: { fontSize: 14 },

  sidebar: { width: 240, flexShrink: 0, background: "#15171c", borderRight: "1px solid #23252b", display: "flex", flexDirection: "column", padding: "18px 12px" },
  sidebarHeader: { display: "flex", alignItems: "center", gap: 8, padding: "0 6px 18px" },
  logoDot: { width: 8, height: 8, borderRadius: "50%", background: "#6366f1" },
  logoText: { fontSize: 13, fontWeight: 600, letterSpacing: 0.2 },

  sidebarSecao: { marginBottom: 20 },
  sidebarSecaoLabel: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: "#6b6b74", padding: "0 6px 8px" },

  periodoItem: { display: "flex", alignItems: "center", gap: 4, padding: "7px 8px", borderRadius: 7, fontSize: 13.5, cursor: "pointer", color: "#c4c4cc" },
  periodoItemAtivo: { background: "#23252b", color: "#fff" },

  navBtn: { display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 8px", borderRadius: 7, border: "none", background: "transparent", color: "#a9a9b2", fontSize: 13.5, cursor: "pointer", textAlign: "left", marginBottom: 2 },
  navBtnAtivo: { background: "#23252b", color: "#fff" },

  statusFooter: { marginTop: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#6b6b74", padding: "6px" },
  statusDot: { width: 6, height: 6, borderRadius: "50%" },

  iconBtnSm: { display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 5, border: "none", background: "#23252b", color: "#a9a9b2", cursor: "pointer" },
  iconBtnGhost: { display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 5, border: "none", background: "transparent", color: "#8a8a92", cursor: "pointer", flexShrink: 0 },

  main: { flex: 1, padding: "28px 36px", overflowY: "auto", maxWidth: 1100 },
  headerBar: { display: "flex", alignItems: "baseline", gap: 10, marginBottom: 18 },
  h1: { fontSize: 22, fontWeight: 600, margin: 0 },
  h2: { fontSize: 15, fontWeight: 600, margin: 0 },
  subtle: { fontSize: 12.5, color: "#8a8a92" },

  addRow: { display: "flex", gap: 8, marginBottom: 22 },
  input: { flex: 1, background: "#1a1c22", border: "1px solid #2a2c33", borderRadius: 8, color: "#e8e8ea", padding: "9px 11px", fontSize: 13.5, outline: "none" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 },

  btnPrimario: { display: "flex", alignItems: "center", gap: 6, background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 13.5, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" },
  btnSecundario: { background: "transparent", color: "#c4c4cc", border: "1px solid #2a2c33", borderRadius: 8, padding: "9px 14px", fontSize: 13.5, cursor: "pointer" },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 },
  card: { background: "#171920", border: "1px solid #23252b", borderRadius: 10, overflow: "hidden", cursor: "pointer" },
  cardFaixa: { height: 4 },
  cardBody: { padding: "12px 14px" },
  cardTitleRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 },
  cardTitle: { fontSize: 14.5, fontWeight: 600 },
  cardMeta: { display: "flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 11.5, color: "#8a8a92" },

  vazio: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", border: "1px dashed #2a2c33", borderRadius: 10 },

  agendaWrap: { border: "1px solid #23252b", borderRadius: 10, overflow: "hidden" },
  agendaGridHead: { display: "grid", gridTemplateColumns: "48px repeat(7, 1fr)", borderBottom: "1px solid #23252b", background: "#171920" },
  agendaHoraCol: { borderRight: "1px solid #23252b" },
  agendaDiaHead: { padding: "8px 4px", textAlign: "center", fontSize: 12, fontWeight: 600, color: "#a9a9b2", borderRight: "1px solid #23252b" },
  agendaBody: { display: "grid", gridTemplateColumns: "48px repeat(7, 1fr)" },
  agendaHoraLabel: { height: 44, fontSize: 10.5, color: "#6b6b74", textAlign: "right", paddingRight: 6, borderBottom: "1px solid #1c1e24", boxSizing: "border-box" },
  agendaColuna: { position: "relative", borderRight: "1px solid #23252b" },
  agendaLinha: { height: 44, borderBottom: "1px solid #1c1e24", boxSizing: "border-box" },
  agendaBloco: { position: "absolute", left: 2, right: 2, borderRadius: 5, padding: "3px 6px", overflow: "hidden", cursor: "pointer", boxSizing: "border-box" },
  agendaBlocoTitulo: { display: "block", fontSize: 11, fontWeight: 600, lineHeight: 1.2 },
  agendaBlocoHora: { display: "block", fontSize: 10, color: "#c4c4cc" },

  dataItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#171920", border: "1px solid #23252b", borderRadius: 8, cursor: "pointer" },
  dataItemFaixa: { width: 4, alignSelf: "stretch", borderRadius: 2 },
  dataItemTitulo: { fontSize: 13.5, fontWeight: 500 },
  dataItemData: { fontSize: 12, color: "#a9a9b2", flexShrink: 0 },

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "flex-end", zIndex: 50 },
  painel: { width: 420, maxWidth: "100%", background: "#15171c", height: "100%", overflowY: "auto", padding: "20px 22px", boxSizing: "border-box" },
  painelHeader: { display: "flex", alignItems: "center", gap: 8 },
  corDot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  painelTitleInput: { flex: 1, background: "transparent", border: "none", color: "#fff", fontSize: 17, fontWeight: 600, outline: "none" },
  painelCores: { display: "flex", gap: 6, marginTop: 12 },
  corSwatch: { width: 18, height: 18, borderRadius: "50%", border: "none", cursor: "pointer" },

  painelTabs: { display: "flex", gap: 4, marginTop: 18, borderBottom: "1px solid #23252b" },
  painelTab: { padding: "8px 4px", background: "transparent", border: "none", color: "#8a8a92", fontSize: 12.5, cursor: "pointer", borderBottom: "2px solid transparent", marginRight: 14 },
  painelTabAtiva: { color: "#fff", borderBottom: "2px solid #6366f1" },
  painelConteudo: { paddingTop: 18 },

  listaItens: { display: "flex", flexDirection: "column", gap: 6, marginTop: 16 },
  itemLinha: { display: "flex", alignItems: "center", gap: 8, background: "#1a1c22", border: "1px solid #23252b", borderRadius: 8, padding: "8px 10px" },
  itemLinhaTitulo: { fontSize: 13, fontWeight: 500 },
  linkItem: { display: "flex", alignItems: "center", gap: 8, background: "#1a1c22", border: "1px solid #23252b", borderRadius: 8, padding: "8px 10px", textDecoration: "none", color: "#e8e8ea" },

  dropZone: { border: "1px dashed #2a2c33", borderRadius: 10, padding: 12, transition: "border-color .15s" },
  dropZoneAtiva: { borderColor: "#6366f1" },

  modalPequeno: { background: "#171920", border: "1px solid #23252b", borderRadius: 12, padding: 20, width: 320, alignSelf: "center", margin: "auto" },
};