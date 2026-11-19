// src/App.jsx
import React, { useState, useEffect } from "react";
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
import TelaErroCarga from "./components/ui/TelaErroCarga.jsx";
import { useCloudBackup, listarBackupsCloud } from "./hooks/useCloudBackup";
import { ehVersaoFutura } from "./utils/migracoes";
import {
  TEMPO_LIMITE_CARREGAMENTO_MS,
  CHAVE_WATCHDOG_RECARREGOU,
  telaInicial,
  acaoDoWatchdog,
} from "./utils/carregamento";

const MSG_BACKUP_VERSAO_FUTURA =
  "Este backup foi criado por uma versão mais nova do app. Recarregue a página para atualizar o app e tente de novo.";

// sessionStorage pode lançar (modo privado/bloqueado): nunca deixar isso
// derrubar a tela inicial.
function lerSessao(chave) {
  try {
    return sessionStorage.getItem(chave);
  } catch {
    return null;
  }
}
function gravarSessao(chave, valor) {
  try {
    if (valor == null) sessionStorage.removeItem(chave);
    else sessionStorage.setItem(chave, valor);
  } catch {
    /* sem sessionStorage: o watchdog só não lembra do reload anterior */
  }
}

export default function App() {
  const {
    data,
    persist,
    status,
    online,
    ultimaSincronizacao,
    user,
    erroCarga,
    tentarDeNovo,
    loginWithGoogle,
    logout,
  } = usePersistedData();

  useCloudBackup(user, data, status !== "loading");
  const [aba, setAba] = useState("visaogeral");
  const [cadeiraAbertaId, setCadeiraAbertaId] = useState(null);
  const [compromissoAbertoId, setCompromissoAbertoId] = useState(null);
  const [modalPeriodo, setModalPeriodo] = useState(false);
  const [gatilhoNovoAfazer, setGatilhoNovoAfazer] = useState(null);
  const [cargaTravada, setCargaTravada] = useState(false);

  // Watchdog: se a tela de carregamento ficar travada (ex: a rede caiu ou
  // mudou bem no meio da checagem inicial e nada nunca resolve), recarrega
  // a página — mas só UMA vez por sessão (#7). Antes recarregava a cada 12s
  // para sempre quando a carga falhava sem cache (offline num aparelho novo).
  // Erro conhecido (`erroCarga`) não passa pelo watchdog: vai direto para a
  // tela de erro, que tenta de novo sem reload.
  useEffect(() => {
    if (data) {
      gravarSessao(CHAVE_WATCHDOG_RECARREGOU, null);
      setCargaTravada(false);
      return;
    }
    if (erroCarga || cargaTravada) return;
    const timer = setTimeout(() => {
      if (acaoDoWatchdog(!!lerSessao(CHAVE_WATCHDOG_RECARREGOU)) === "recarregar") {
        gravarSessao(CHAVE_WATCHDOG_RECARREGOU, "1");
        window.location.reload();
      } else {
        setCargaTravada(true);
      }
    }, TEMPO_LIMITE_CARREGAMENTO_MS);
    return () => clearTimeout(timer);
  }, [data, erroCarga, cargaTravada]);

  const tela = telaInicial({ temDados: !!data, erroCarga, travou: cargaTravada });
  if (tela === "carregando") {
    return <CarregandoPainel texto="Carregando seu painel..." />;
  }
  if (tela === "erro" || tela === "travado") {
    return (
      <TelaErroCarga
        motivo={tela}
        online={online}
        tentando={tela === "erro" && status === "loading"}
        onTentarDeNovo={tela === "travado" ? () => window.location.reload() : tentarDeNovo}
        onUsarSemLogin={user ? logout : null}
      />
    );
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

  /* ---- ações períodos ----
     Toda ação usa persist((d) => ...): o updater recebe o estado MAIS
     RECENTE, não o `data` deste render — duas ações seguidas (ex: blur do
     nome no drawer + clique em "Adicionar") não se sobrescrevem (#6). */
  const selecionarPeriodo = (id) => {
    persist((d) => ({ ...d, periodoAtivoId: id }));
  };

  const criarPeriodo = (nome) => {
    const novo = { id: uid(), nome };
    persist((d) => ({
      ...d,
      periodos: [...d.periodos, novo],
      periodoAtivoId: novo.id,
    }));
  };

  const atualizarPeriodo = (id, patch) => {
    persist((d) => ({
      ...d,
      periodos: d.periodos.map((p) =>
        p.id === id ? { ...p, ...patch } : p
      ),
    }));
  };

  const excluirPeriodo = (id) => {
    if (
      !window.confirm(
        "Excluir este período? As cadeiras e compromissos dele também serão removidos."
      )
    )
      return;
    persist((d) => {
      const periodos = d.periodos.filter((p) => p.id !== id);
      return {
        ...d,
        periodos,
        cadeiras: d.cadeiras.filter((c) => c.periodoId !== id),
        compromissos: (d.compromissos || []).filter((c) => c.periodoId !== id),
        periodoAtivoId: d.periodoAtivoId === id ? periodos[0]?.id ?? null : d.periodoAtivoId,
      };
    });
    if (compromissoAberto?.periodoId === id) setCompromissoAbertoId(null);
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
    persist((d) => ({ ...d, cadeiras: [...d.cadeiras, nova] }));
    setCadeiraAbertaId(nova.id);
  };

  const atualizarCadeira = (id, patch) => {
    persist((d) => ({
      ...d,
      cadeiras: d.cadeiras.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    }));
  };

  const excluirCadeira = (id) => {
    if (!window.confirm("Excluir esta cadeira e todos os seus dados?")) return;
    persist((d) => ({ ...d, cadeiras: d.cadeiras.filter((c) => c.id !== id) }));
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
    persist((d) => ({ ...d, compromissos: [...(d.compromissos || []), novo] }));
    setCompromissoAbertoId(novo.id);
  };

  const atualizarCompromisso = (id, patch) => {
    persist((d) => ({
      ...d,
      compromissos: (d.compromissos || []).map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    }));
  };

  const excluirCompromisso = (id) => {
    if (!window.confirm("Excluir este compromisso e todos os seus horários?")) return;
    persist((d) => ({ ...d, compromissos: (d.compromissos || []).filter((c) => c.id !== id) }));
    if (compromissoAbertoId === id) setCompromissoAbertoId(null);
  };

  /* ---- ações afazeres ---- */
  const afazeres = data.afazeres || [];

  const criarAfazer = (afazer) => {
    const novo = { id: uid(), feito: false, datasConcluidas: [], ...afazer };
    persist((d) => ({ ...d, afazeres: [...(d.afazeres || []), novo] }));
  };

  const atualizarAfazer = (id, patch) => {
    persist((d) => ({
      ...d,
      afazeres: (d.afazeres || []).map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  };

  const alternarFeitoAfazer = (id, dataOcorrencia) => {
    persist((d) => ({
      ...d,
      afazeres: (d.afazeres || []).map((a) => {
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
        // Ao desmarcar, mantém o `concluidoEm` que já existir. Nunca gravar
        // `concluidoEm: undefined` (afazer antigo sem o campo): o Firestore
        // recusa campo undefined e travava todas as gravações (#43).
        return feito ? { ...a, feito, concluidoEm: Date.now() } : { ...a, feito };
      }),
    }));
  };

  // Move só UMA ocorrência de um afazer rotineiro (ex: arrastar no
  // calendário) para outro dia, sem alterar a regra de recorrência em si —
  // as demais ocorrências continuam caindo nos dias da semana configurados.
  // Isso fica guardado em `excecoesData`: { dataOriginalDaOcorrencia: novaData }.
  const moverInstanciaAfazer = (id, dataOrigem, dataDestino) => {
    persist((d) => ({
      ...d,
      afazeres: (d.afazeres || []).map((a) => {
        if (a.id !== id) return a;
        const excecoes = { ...(a.excecoesData || {}) };
        excecoes[dataOrigem] = dataDestino;
        return { ...a, excecoesData: excecoes };
      }),
    }));
  };

  const excluirAfazer = (id) => {
    persist((d) => ({ ...d, afazeres: (d.afazeres || []).filter((a) => a.id !== id) }));
  };

  const abrirNovoAfazerNaData = (dataISO) => {
    setGatilhoNovoAfazer({ data: dataISO, ts: Date.now() });
    setAba("afazeres");
  };

  /* ---- ações eventos concluidos / excluídos por instância ---- */
  const eventosConcluidos = data.eventosConcluidos || [];
  const eventosExcluidos = data.eventosExcluidos || [];

  const alternarEventoConcluido = (chave) => {
    persist((d) => {
      const concluidos = d.eventosConcluidos || [];
      return {
        ...d,
        eventosConcluidos: concluidos.includes(chave)
          ? concluidos.filter((c) => c !== chave)
          : [...concluidos, chave],
      };
    });
  };

  // Remove só esta ocorrência (dia) de um evento da agenda — usado quando
  // algo foi cancelado e não faz sentido continuar aparecendo naquele dia.
  // Para itens recorrentes (aula, compromisso, afazer com rotina), a chave
  // já carrega a data específica dessa ocorrência, então isso NÃO apaga o
  // horário/afazer em si — só esconde esse dia; as outras ocorrências
  // continuam normalmente.
  const excluirInstanciaEvento = (chave) => {
    persist((d) => {
      const excluidos = d.eventosExcluidos || [];
      // Devolver o próprio `d` = nada a gravar (ver resolverGravacao).
      if (excluidos.includes(chave)) return d;
      return { ...d, eventosExcluidos: [...excluidos, chave] };
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
    persist((d) => ({ ...d, afazeres: (d.afazeres || []).filter((a) => !a.feito) }));
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
        if (ehVersaoFutura(importado)) {
          window.alert(MSG_BACKUP_VERSAO_FUTURA);
          return;
        }
        if (
          !window.confirm(
            "Importar este backup vai substituir TODOS os dados atuais. Deseja continuar?"
          )
        )
          return;
        persist({
          // A versão do schema TEM que vir junto: sem ela o backup seria
          // tratado como v0 e migrado de novo (ver utils/migracoes.js).
          versao: importado.versao,
          periodos: importado.periodos ?? [],
          cadeiras: importado.cadeiras ?? [],
          compromissos: importado.compromissos ?? [],
          afazeres: importado.afazeres ?? [],
          eventosConcluidos: importado.eventosConcluidos ?? [],
          eventosExcluidos: importado.eventosExcluidos ?? [],
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
    if (ehVersaoFutura(escolhido.payload)) {
      window.alert(MSG_BACKUP_VERSAO_FUTURA);
      return;
    }
    if (
      !window.confirm(
        `Restaurar o backup de ${escolhido.dataHora}? Isso substitui TODOS os dados atuais (locais e na nuvem).`
      )
    )
      return;

    const { ok } = persist(escolhido.payload);
    // persist() pode recusar (ex: trava de "parece vazio") — não anunciar
    // sucesso nesse caso. Aviso mais completo de recusas: #44.
    window.alert(
      ok
        ? "Backup restaurado com sucesso."
        : "O backup NÃO foi restaurado: a gravação foi bloqueada pela proteção contra perda de dados."
    );
  };

  return (
    <div className="app">
      <Sidebar
        aba={aba}
        setAba={setAba}
        status={status}
        online={online}
        ultimaSincronizacao={ultimaSincronizacao}
        onExportarBackup={exportarBackup}
        onRestaurarBackupNuvem={restaurarBackupNuvem}
        onImportarBackup={importarBackup}
        user={user}
        loginWithGoogle={loginWithGoogle}
        logout={logout}
      />

      <main className={`main${aba === "visaogeral" ? " main-larga" : ""}`}>
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
              eventosExcluidos={eventosExcluidos}
              onAlternarEventoConcluido={alternarEventoConcluido}
              onExcluirInstanciaEvento={excluirInstanciaEvento}
              onAlternarFeitoAfazer={alternarFeitoAfazer}
              onAtualizarAfazer={atualizarAfazer}
              onMoverInstanciaAfazer={moverInstanciaAfazer}
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