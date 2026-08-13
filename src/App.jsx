// src/App.jsx
import React, { useState } from "react";
import { CORES } from "./constants";
import { uid } from "./utils/id";
import usePersistedData from "./hooks/usePersistedData";
import Sidebar from "./components/Sidebar";
import VisaoCadeiras from "./components/VisaoCadeiras";
import VisaoAgenda from "./components/VisaoAgenda";
import VisaoAfazeres from "./components/VisaoAfazeres";
import VisaoGeral from "./components/VisaoGeral";
import PainelCadeira from "./components/PainelCadeira";
import EstadoVazio from "./components/ui/EstadoVazio";
import ModalTexto from "./components/ui/ModalTexto";

export default function App() {
  const { data, persist, status, user, loginWithGoogle, logout } = usePersistedData();
  
  const [aba, setAba] = useState("cadeiras");
  const [cadeiraAbertaId, setCadeiraAbertaId] = useState(null);
  const [modalPeriodo, setModalPeriodo] = useState(false);

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
  const selecionarPeriodo = (id) => {
    persist({ ...data, periodoAtivoId: id });
  };

  const criarPeriodo = (nome) => {
    const novo = { id: uid(), nome };
    persist({
      ...data,
      periodos: [...data.periodos, novo],
      periodoAtivoId: novo.id,
    });
  };

  // Atualiza nome ou datas do período diretamente no estado unificado
  const atualizarPeriodo = (id, patch) => {
    persist({
      ...data,
      periodos: data.periodos.map((p) =>
        p.id === id ? { ...p, ...patch } : p
      ),
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

  /* ---- ações afazeres ---- */
  const afazeres = data.afazeres || [];

  const criarAfazer = (afazer) => {
    const novo = { id: uid(), feito: false, ...afazer };
    persist({ ...data, afazeres: [...afazeres, novo] });
  };

  const atualizarAfazer = (id, patch) => {
    persist({
      ...data,
      afazeres: afazeres.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    });
  };

  const alternarFeitoAfazer = (id) => {
    persist({
      ...data,
      afazeres: afazeres.map((a) =>
        a.id === id ? { ...a, feito: !a.feito } : a
      ),
    });
  };

  const excluirAfazer = (id) => {
    persist({ ...data, afazeres: afazeres.filter((a) => a.id !== id) });
  };

  const limparAfazeresConcluidos = () => {
    const concluidos = afazeres.filter((a) => a.feito);
    if (concluidos.length === 0) return;
    if (
      !window.confirm(
        `Apagar definitivamente ${concluidos.length} afazer${concluidos.length !== 1 ? "es" : ""} concluído${concluidos.length !== 1 ? "s" : ""}?`
      )
    )
      return;
    persist({ ...data, afazeres: afazeres.filter((a) => !a.feito) });
  };

  /* ---- backup: exportar / importar ---- */
  const exportarBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const hoje = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `agenda-backup-${hoje}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const importarBackup = (arquivo) => {
    const leitor = new FileReader();
    leitor.onload = (e) => {
      try {
        const importado = JSON.parse(e.target.result);
        if (!importado || typeof importado !== "object" || !Array.isArray(importado.periodos)) {
          throw new Error("formato inválido");
        }
        if (
          !window.confirm(
            "Importar este backup vai substituir TODOS os dados atuais. Deseja continuar?"
          )
        )
          return;
        persist({
          periodos: importado.periodos ?? [],
          cadeiras: importado.cadeiras ?? [],
          afazeres: importado.afazeres ?? [],
          periodoAtivoId: importado.periodoAtivoId ?? null,
        });
      } catch {
        window.alert("Não foi possível ler este arquivo. Verifique se é um backup válido (.json).");
      }
    };
    leitor.readAsText(arquivo);
  };

  return (
    <div className="app">
      <Sidebar
        data={data}
        periodoAtivo={periodoAtivo}
        onSelecionarPeriodo={selecionarPeriodo}
        onNovoPeriodo={() => setModalPeriodo(true)}
        onAtualizarPeriodo={atualizarPeriodo}
        onExcluirPeriodo={excluirPeriodo}
        aba={aba}
        setAba={setAba}
        status={status}
        onExportarBackup={exportarBackup}
        onImportarBackup={importarBackup}
        user={user}
        loginWithGoogle={loginWithGoogle}
        logout={logout}
      />

      <main className="main">
        {aba === "afazeres" ? (
          <VisaoAfazeres
            afazeres={afazeres}
            onCriar={criarAfazer}
            onEditar={atualizarAfazer}
            onAlternarFeito={alternarFeitoAfazer}
            onExcluir={excluirAfazer}
            onLimparConcluidos={limparAfazeresConcluidos}
          />
        ) : aba === "visaogeral" ? (
            <VisaoGeral
              cadeiras={data.cadeiras}
              afazeres={afazeres}
              periodos={data.periodos}
            />
        ) : !periodoAtivo ? (
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
            onAtualizarPeriodo={atualizarPeriodo}
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
    </div>
  );
}