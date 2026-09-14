// src/App.jsx
import React, { useState } from "react";
import { CORES } from "./constants";
import { uid } from "./utils/id";
import usePersistedData from "./hooks/usePersistedData";
import Sidebar from "./components/Sidebar";
import VisaoCadeiras from "./components/VisaoCadeiras";
import VisaoCompromissos from "./components/VisaoCompromissos";
import VisaoAgenda from "./components/VisaoAgenda";
import VisaoAfazeres from "./components/VisaoAfazeres";
import VisaoGeral from "./components/VisaoGeral";
import PainelCadeira from "./components/PainelCadeira";
import PainelCompromisso from "./components/PainelCompromisso";
import EstadoVazio from "./components/ui/EstadoVazio";
import ModalTexto from "./components/ui/ModalTexto";
import CarregandoPainel from "./components/ui/CarregandoPainel.jsx";
import { useAutoBackup } from "./hooks/useAutoBackup";
import { useCloudBackup, listarBackupsCloud } from "./hooks/useCloudBackup";

export default function App() {
  const { data, persist, status, user, loginWithGoogle, logout } = usePersistedData();

  useAutoBackup(data);
  useCloudBackup(user, data, status !== "loading");
  const [aba, setAba] = useState("visaogeral");
  const [cadeiraAbertaId, setCadeiraAbertaId] = useState(null);
  const [compromissoAbertoId, setCompromissoAbertoId] = useState(null);
  const [modalPeriodo, setModalPeriodo] = useState(false);
  const [gatilhoNovoAfazer, setGatilhoNovoAfazer] = useState(null);

  if (!data) {
    return <CarregandoPainel texto="Carregando seu painel..." />;
  }

  const periodoAtivo =
    data.periodos.find((p) => p.id === data.periodoAtivoId) || data.periodos[0];
  const cadeirasDoPeriodo = data.cadeiras.filter(
    (c) => c.periodoId === periodoAtivo?.id
  );
  const cadeiraAberta = data.cadeiras.find((c) => c.id === cadeiraAbertaId);
  const compromissos = data.compromissos || [];
  const compromissosDoPeriodo = compromissos.filter(
    (c) => c.periodoId === periodoAtivo?.id
  );
  const compromissoAberto = compromissos.find((c) => c.id === compromissoAbertoId);

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
        "Excluir este período? As cadeiras e compromissos dele também serão removidos."
      )
    )
      return;
    const periodos = data.periodos.filter((p) => p.id !== id);
    const cadeiras = data.cadeiras.filter((c) => c.periodoId !== id);
    const compromissosRestantes = compromissos.filter((c) => c.periodoId !== id);
    const periodoAtivoId =
      data.periodoAtivoId === id ? periodos[0]?.id ?? null : data.periodoAtivoId;
    persist({ ...data, periodos, cadeiras, compromissos: compromissosRestantes, periodoAtivoId });
    if (compromissoAbertoId && !compromissosRestantes.some((c) => c.id === compromissoAbertoId)) {
      setCompromissoAbertoId(null);
    }
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

  /* ---- ações compromissos ---- */
  const criarCompromisso = (nome) => {
    if (!periodoAtivo) return;
    const novo = {
      id: uid(),
      nome,
      periodoId: periodoAtivo.id,
      cor: CORES[compromissos.length % CORES.length],
      horarios: [],
    };
    persist({ ...data, compromissos: [...compromissos, novo] });
    setCompromissoAbertoId(novo.id);
  };

  const atualizarCompromisso = (id, patch) => {
    persist({
      ...data,
      compromissos: compromissos.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    });
  };

  const excluirCompromisso = (id) => {
    if (!window.confirm("Excluir este compromisso e todos os seus horários?")) return;
    persist({ ...data, compromissos: compromissos.filter((c) => c.id !== id) });
    if (compromissoAbertoId === id) setCompromissoAbertoId(null);
  };

  /* ---- ações afazeres ---- */
  const afazeres = data.afazeres || [];

  const criarAfazer = (afazer) => {
    const novo = { id: uid(), feito: false, datasConcluidas: [], ...afazer };
    persist({ ...data, afazeres: [...afazeres, novo] });
  };

  const atualizarAfazer = (id, patch) => {
    persist({
      ...data,
      afazeres: afazeres.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    });
  };

  const alternarFeitoAfazer = (id, dataOcorrencia) => {
    persist({
      ...data,
      afazeres: afazeres.map((a) => {
        if (a.id !== id) return a;

        const ehRotina = a.rotina && a.rotina.tipo !== "nenhuma";
        if (ehRotina && dataOcorrencia) {
          const datasConcluidas = a.datasConcluidas || [];
          const jaConcluido = datasConcluidas.includes(dataOcorrencia);
          const novasDatas = jaConcluido
            ? datasConcluidas.filter((d) => d !== dataOcorrencia)
            : [...datasConcluidas, dataOcorrencia];

          return { ...a, datasConcluidas: novasDatas };
        }

        const feito = !a.feito;
        return { ...a, feito, concluidoEm: feito ? Date.now() : a.concluidoEm };
      }),
    });
  };

  const excluirAfazer = (id) => {
    persist({ ...data, afazeres: afazeres.filter((a) => a.id !== id) });
  };

  const abrirNovoAfazerNaData = (dataISO) => {
    setGatilhoNovoAfazer({ data: dataISO, ts: Date.now() });
    setAba("afazeres");
  };

  /* ---- ações eventos concluidos ---- */
  const eventosConcluidos = data.eventosConcluidos || [];

  const alternarEventoConcluido = (chave) => {
    const jaConcluido = eventosConcluidos.includes(chave);
    persist({
      ...data,
      eventosConcluidos: jaConcluido
        ? eventosConcluidos.filter((c) => c !== chave)
        : [...eventosConcluidos, chave],
    });
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
          compromissos: importado.compromissos ?? [],
          afazeres: importado.afazeres ?? [],
          eventosConcluidos: importado.eventosConcluidos ?? [],
          periodoAtivoId: importado.periodoAtivoId ?? null,
        });
      } catch {
        window.alert("Não foi possível ler este arquivo. Verifique se é um backup válido (.json).");
      }
    };
    leitor.readAsText(arquivo);
  };

  /* ---- backup: restaurar a partir da nuvem (Firestore) ---- */
  const restaurarBackupNuvem = async () => {
    if (!user) {
      window.alert("Você precisa estar logado para restaurar um backup da nuvem.");
      return;
    }
    let backups = [];
    try {
      backups = await listarBackupsCloud(user.uid);
    } catch (err) {
      console.error(err);
      window.alert("Não foi possível buscar os backups na nuvem. Verifique sua conexão.");
      return;
    }
    if (backups.length === 0) {
      window.alert("Ainda não existe nenhum backup salvo na nuvem (o primeiro é criado até 3h após o login).");
      return;
    }

    const lista = backups
      .map((b, i) => `${i + 1}) ${b.dataHora}`)
      .join("\n");
    const escolha = window.prompt(
      `Backups disponíveis (mais recente primeiro):\n${lista}\n\nDigite o número do backup que deseja restaurar:`
    );
    const indice = parseInt(escolha, 10) - 1;
    if (Number.isNaN(indice) || indice < 0 || indice >= backups.length) return;

    const escolhido = backups[indice];
    if (
      !window.confirm(
        `Restaurar o backup de ${escolhido.dataHora}? Isso substitui TODOS os dados atuais (locais e na nuvem).`
      )
    )
      return;

    persist(escolhido.payload);
    window.alert("Backup restaurado com sucesso.");
  };

  return (
    <div className="app">
      <Sidebar
        aba={aba}
        setAba={setAba}
        status={status}
        onExportarBackup={exportarBackup}
        onRestaurarBackupNuvem={restaurarBackupNuvem}
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
            gatilhoNovaData={gatilhoNovoAfazer}
          />
        ) : aba === "visaogeral" ? (
            <VisaoGeral
              cadeiras={data.cadeiras}
              compromissos={compromissosDoPeriodo}
              afazeres={afazeres}
              periodos={data.periodos}
              eventosConcluidos={eventosConcluidos}
              onAlternarEventoConcluido={alternarEventoConcluido}
              onAlternarFeitoAfazer={alternarFeitoAfazer}
              onAtualizarAfazer={atualizarAfazer}
              onNovoAfazer={abrirNovoAfazerNaData}
            />
        ) : !periodoAtivo ? (
          <EstadoVazio
            texto="Crie um período para começar"
            onAcao={() => setModalPeriodo(true)}
            acaoTexto="Novo período"
          />
        ) : aba === "compromissos" ? (
          <VisaoCompromissos
            periodoAtivo={periodoAtivo}
            compromissos={compromissosDoPeriodo}
            onCriar={criarCompromisso}
            onAbrir={setCompromissoAbertoId}
            onExcluir={excluirCompromisso}
          />
        ) : aba === "cadeiras" ? (
          <VisaoCadeiras
            periodos={data.periodos}
            periodoAtivo={periodoAtivo}
            cadeiras={cadeirasDoPeriodo}
            onCriar={criarCadeira}
            onAbrir={setCadeiraAbertaId}
            onExcluir={excluirCadeira}
            onSelecionarPeriodo={selecionarPeriodo}
            onNovoPeriodo={() => setModalPeriodo(true)}
            onAtualizarPeriodo={atualizarPeriodo}
            onExcluirPeriodo={excluirPeriodo}
          />
        ) : (
          <VisaoAgenda
            cadeiras={cadeirasDoPeriodo}
            compromissos={compromissosDoPeriodo}
            onAbrirCadeira={setCadeiraAbertaId}
            onAbrirCompromisso={setCompromissoAbertoId}
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

      {compromissoAberto && (
        <PainelCompromisso
          compromisso={compromissoAberto}
          periodos={data.periodos}
          onFechar={() => setCompromissoAbertoId(null)}
          onAtualizar={(patch) => atualizarCompromisso(compromissoAberto.id, patch)}
          onExcluir={() => excluirCompromisso(compromissoAberto.id)}
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