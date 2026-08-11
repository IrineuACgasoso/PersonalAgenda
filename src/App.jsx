import React, { useState } from "react";
import { CORES } from "./constants";
import { uid } from "./utils/id";
import usePersistedData from "./hooks/usePersistedData";
import Sidebar from "./components/Sidebar";
import VisaoCadeiras from "./components/VisaoCadeiras";
import VisaoAgenda from "./components/VisaoAgenda";
import PainelCadeira from "./components/PainelCadeira";
import EstadoVazio from "./components/ui/EstadoVazio";
import ModalTexto from "./components/ui/ModalTexto";

export default function App() {
  const { data, persist, status } = usePersistedData();
  const [aba, setAba] = useState("cadeiras");
  const [cadeiraAbertaId, setCadeiraAbertaId] = useState(null);
  const [modalPeriodo, setModalPeriodo] = useState(false);
  const [editandoPeriodoId, setEditandoPeriodoId] = useState(null);

  if (!data) {
    return (
      <div className="loading-wrap">
        <div className="loading-text">Carregando seu painel...</div>
      </div>
    );
  }

  const periodoAtivo =
    data.periodos.find((p) => p.id === data.periodoAtivoId) || data.periodos[0];
  const cadeirasDoPeriodo = data.cadeiras.filter(
    (c) => c.periodoId === periodoAtivo?.id
  );
  const cadeiraAberta = data.cadeiras.find((c) => c.id === cadeiraAbertaId);

  /* ---- ações períodos ---- */
  const criarPeriodo = (nome) => {
    const novo = { id: uid(), nome };
    persist({
      ...data,
      periodos: [...data.periodos, novo],
      periodoAtivoId: novo.id,
    });
  };

  const renomearPeriodo = (id, nome) => {
    persist({
      ...data,
      periodos: data.periodos.map((p) => (p.id === id ? { ...p, nome } : p)),
    });
  };

  const excluirPeriodo = (id) => {
    if (
      !window.confirm(
        "Excluir este período? As cadeiras dele também serão removidas."
      )
    )
      return;
    const periodos = data.periodos.filter((p) => p.id !== id);
    const cadeiras = data.cadeiras.filter((c) => c.periodoId !== id);
    const periodoAtivoId =
      data.periodoAtivoId === id ? periodos[0]?.id ?? null : data.periodoAtivoId;
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
    persist({
      ...data,
      cadeiras: data.cadeiras.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    });
  };

  const excluirCadeira = (id) => {
    if (!window.confirm("Excluir esta cadeira e todos os seus dados?")) return;
    persist({ ...data, cadeiras: data.cadeiras.filter((c) => c.id !== id) });
    if (cadeiraAbertaId === id) setCadeiraAbertaId(null);
  };

  return (
    <div className="app">
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

      <main className="main">
        {!periodoAtivo ? (
          <EstadoVazio
            texto="Crie um período para começar"
            onAcao={() => setModalPeriodo(true)}
            acaoTexto="Novo período"
          />
        ) : aba === "cadeiras" ? (
          <VisaoCadeiras
            periodoAtivo={periodoAtivo}
            cadeiras={cadeirasDoPeriodo}
            onCriar={criarCadeira}
            onAbrir={setCadeiraAbertaId}
            onExcluir={excluirCadeira}
          />
        ) : (
          <VisaoAgenda
            cadeiras={cadeirasDoPeriodo}
            onAbrir={setCadeiraAbertaId}
          />
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
          valorInicial={
            data.periodos.find((p) => p.id === editandoPeriodoId)?.nome
          }
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