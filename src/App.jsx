// src/App.jsx
import { useState, useEffect } from "react";
import { CORES } from "./constants";
import { uid } from "./utils/id";
import usePersistedData from "./hooks/usePersistedData";
import Sidebar from "./components/Sidebar";
import VisaoCadeiras from "./components/VisaoCadeiras";
import VisaoRotinas from "./components/VisaoRotinas";
import VisaoCompromissos from "./components/VisaoCompromissos";
import VisaoAgenda from "./components/VisaoAgenda";
import VisaoAfazeres from "./components/VisaoAfazeres";
import VisaoGeral from "./components/VisaoGeral";
import VisaoHoje from "./components/VisaoHoje";
import PainelCadeira from "./components/PainelCadeira";
import PainelRotina from "./components/PainelRotina";
import EstadoVazio from "./components/ui/EstadoVazio";
import ModalTexto from "./components/ui/ModalTexto";
import ModalRestaurarNuvem from "./components/ui/ModalRestaurarNuvem";
import ModalLembretes from "./components/ui/ModalLembretes";
import { renovarTokenSeAtivo } from "./notificacoes";
import { sanitizarPreferenciasLembretes } from "./utils/lembretes";
import useDialogos from "./hooks/useDialogos";
import CarregandoPainel from "./components/ui/CarregandoPainel.jsx";
import TelaErroCarga from "./components/ui/TelaErroCarga.jsx";
import { useCloudBackup } from "./hooks/useCloudBackup";
import { ehVersaoFutura } from "./utils/migracoes";
import { toISO, ehRotina, afazerConcluido } from "./utils/afazeres";
import { mensagemDeRecusa } from "./utils/dialogos";
import { vigenciaPadraoParaNovaCadeira } from "./utils/calendario";
import { reinserirPorId, reinserirVarios, separarRemovidos } from "./utils/desfazer";
import { devolverChaves, limparChavesOrfas } from "./utils/chavesOrfas";
import { motivoParaNaoExcluirPeriodo } from "./utils/cadeiras";
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
  const { data, persist, status, online, ultimaSincronizacao, user, erroCarga, tentarDeNovo, loginWithGoogle, logout } =
    usePersistedData();

  // Só depois da carga inicial e com dados de verdade (na tela de erro do #7
  // o status alterna loading/error a cada nova tentativa).
  useCloudBackup(user, data, !!data && status !== "loading");
  // Tela inicial: Hoje (#31).
  const [aba, setAba] = useState("hoje");
  const [cadeiraAbertaId, setCadeiraAbertaId] = useState(null);
  const [rotinaAbertaId, setRotinaAbertaId] = useState(null);
  const [modalPeriodo, setModalPeriodo] = useState(false);
  const [gatilhoNovoAfazer, setGatilhoNovoAfazer] = useState(null);
  const [gatilhoNovoCompromisso, setGatilhoNovoCompromisso] = useState(null);
  // Dia em que o calendário geral abre (aviso de atrasados da Hoje).
  const [diaCalendario, setDiaCalendario] = useState(null);
  const [cargaTravada, setCargaTravada] = useState(false);
  const [restaurandoNuvem, setRestaurandoNuvem] = useState(false);
  const [modalLembretes, setModalLembretes] = useState(false);
  const { avisar, confirmar, notificar } = useDialogos();

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

  // Lembretes (#23): o FCM pode trocar o token deste aparelho; confere uma
  // vez por login (só faz algo se os lembretes estiverem ligados aqui).
  useEffect(() => {
    if (user?.uid) renovarTokenSeAtivo(user.uid);
  }, [user?.uid]);

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

  const periodoAtivo = data.periodos.find((p) => p.id === data.periodoAtivoId) || data.periodos[0];
  const cadeirasDoPeriodo = data.cadeiras.filter((c) => c.periodoId === periodoAtivo?.id);
  const cadeiraAberta = data.cadeiras.find((c) => c.id === cadeiraAbertaId);
  // Rotinas (ex-"compromissos" semanais, v5) não pertencem a período desde
  // a v6 (#56): cada uma tem vigência própria opcional (dataInicio/dataFim).
  const rotinas = data.rotinas || [];
  const rotinaAberta = rotinas.find((r) => r.id === rotinaAbertaId);
  const compromissos = data.compromissos || [];
  // Padrões dos lembretes (#23), sempre completos.
  const preferenciasLembretes = sanitizarPreferenciasLembretes(data.lembretes);

  /* Toda ação grava por aqui. Ela usa persist((d) => ...): o updater recebe
     o estado MAIS RECENTE, não o `data` deste render — duas ações seguidas
     (ex: blur do nome no drawer + clique em "Adicionar") não se sobrescrevem
     (#6). Se o persist() recusar (trava de "parece vazio", dados de versão
     mais nova, ainda carregando), avisa na tela (#44) — antes a recusa só
     mudava a bolinha de status e o item excluído "voltava" sem explicação.
     Devolve o { ok, motivo } do persist(). */
  const gravar = (entrada) => {
    const resultado = persist(entrada);
    const mensagem = resultado.ok ? null : mensagemDeRecusa(resultado.motivo);
    if (mensagem) avisar(mensagem, { titulo: "Alteração não salva" });
    return resultado;
  };

  // Gravou de verdade (não foi recusado nem "sem mudança")? Só aí faz
  // sentido mostrar o toast de "Desfazer".
  const gravouAlgo = (r) => r.ok && r.motivo !== "sem-mudanca";

  // Toast "X excluído · Desfazer" (#18). `restaurar` é um updater do persist.
  const avisarComDesfazer = (texto, restaurar) => {
    notificar(texto, { acao: { rotulo: "Desfazer", aoClicar: () => gravar(restaurar) } });
  };

  /* ---- ações períodos ---- */
  const selecionarPeriodo = (id) => {
    gravar((d) => ({ ...d, periodoAtivoId: id }));
  };

  const criarPeriodo = (nome) => {
    const novo = { id: uid(), nome };
    gravar((d) => ({
      ...d,
      periodos: [...d.periodos, novo],
      periodoAtivoId: novo.id,
    }));
  };

  const atualizarPeriodo = (id, patch) => {
    gravar((d) => ({
      ...d,
      periodos: d.periodos.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  // Período leva junto as cadeiras dele: continua pedindo
  // confirmação, e ainda dá para desfazer (#18).
  const excluirPeriodo = async (id) => {
    const bloqueio = motivoParaNaoExcluirPeriodo(data.periodos, id); // #53
    if (bloqueio) {
      avisar(bloqueio, { titulo: "Excluir período" });
      return;
    }
    const ok = await confirmar("Excluir este período? As cadeiras dele também serão removidas.", {
      titulo: "Excluir período",
      textoConfirmar: "Excluir",
      perigo: true,
    });
    if (!ok) return;
    let removido = null;
    const r = gravar((d) => {
      const p = separarRemovidos(d.periodos, (x) => x.id === id);
      // Nunca deixar a lista vazia (#53), nem se o estado mudou durante o confirm.
      if (p.removidos.length === 0 || p.restantes.length === 0) return d;
      const c = separarRemovidos(d.cadeiras, (x) => x.periodoId === id);
      // #52: concluídos/removidos das aulas e provas dessas cadeiras saem junto.
      const limpo = limparChavesOrfas({
        ...d,
        periodos: p.restantes,
        cadeiras: c.restantes,
        periodoAtivoId: d.periodoAtivoId === id ? (p.restantes[0]?.id ?? null) : d.periodoAtivoId,
      });
      removido = {
        periodos: p.removidos,
        cadeiras: c.removidos,
        eraAtivo: d.periodoAtivoId === id,
        chaves: limpo.removidas,
      };
      return limpo.dados;
    });
    if (cadeiraAberta?.periodoId === id) setCadeiraAbertaId(null);
    if (!gravouAlgo(r) || !removido) return;
    const { periodos, cadeiras, eraAtivo, chaves } = removido;
    avisarComDesfazer(`Período "${periodos[0].item.nome}" excluído`, (d) =>
      devolverChaves(
        {
          ...d,
          periodos: reinserirVarios(d.periodos, periodos),
          cadeiras: reinserirVarios(d.cadeiras, cadeiras),
          periodoAtivoId: eraAtivo ? id : d.periodoAtivoId,
        },
        chaves,
      ),
    );
  };

  // Exclui um item de uma lista de primeiro nível (cadeiras, rotinas,
  // compromissos, afazeres) com "Desfazer" no lugar do confirm() (#18). O item e a posição
  // são lidos DENTRO do updater (estado mais recente), e o desfazer o
  // devolve no mesmo lugar sem duplicar.
  const excluirComDesfazer = (campo, id, textoExcluido) => {
    let removido = null;
    let chaves = {};
    const r = gravar((d) => {
      const { restantes, removidos } = separarRemovidos(d[campo] || [], (x) => x.id === id);
      if (removidos.length === 0) return d;
      removido = removidos[0];
      // #52: as chaves de concluído/removido do item saem junto (e voltam no Desfazer).
      const limpo = limparChavesOrfas({ ...d, [campo]: restantes });
      chaves = limpo.removidas;
      return limpo.dados;
    });
    if (!gravouAlgo(r) || !removido) return;
    const { item, indice } = removido;
    avisarComDesfazer(textoExcluido(item), (d) =>
      devolverChaves({ ...d, [campo]: reinserirPorId(d[campo] || [], item, indice) }, chaves),
    );
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
    // Vigência (#19): nasce com a das outras cadeiras do período (lida no
    // estado mais recente); dá para mudar no drawer.
    gravar((d) => ({
      ...d,
      cadeiras: [...d.cadeiras, { ...nova, ...vigenciaPadraoParaNovaCadeira(d.cadeiras, nova.periodoId) }],
    }));
    setCadeiraAbertaId(nova.id);
  };

  // `patch` pode ser um objeto ou uma função (cadeiraAtual) => patch, que lê
  // a cadeira do estado mais recente (listas internas: horários/links/datas).
  const atualizarCadeira = (id, patch) =>
    gravar((d) => ({
      ...d,
      cadeiras: d.cadeiras.map((c) =>
        c.id === id ? { ...c, ...(typeof patch === "function" ? patch(c) : patch) } : c,
      ),
    }));

  const excluirCadeira = (id) => {
    excluirComDesfazer("cadeiras", id, (c) => `Cadeira "${c.nome}" excluída`);
    if (cadeiraAbertaId === id) setCadeiraAbertaId(null);
  };

  /* ---- ações rotinas (ex-"compromissos" semanais, v5) ---- */
  const criarRotina = (nome) => {
    const nova = {
      id: uid(),
      nome,
      cor: CORES[rotinas.length % CORES.length],
      horarios: [],
    };
    gravar((d) => ({ ...d, rotinas: [...(d.rotinas || []), nova] }));
    setRotinaAbertaId(nova.id);
  };

  // `patch`: objeto ou função (rotinaAtual) => patch (ver atualizarCadeira).
  const atualizarRotina = (id, patch) =>
    gravar((d) => ({
      ...d,
      rotinas: (d.rotinas || []).map((r) =>
        r.id === id ? { ...r, ...(typeof patch === "function" ? patch(r) : patch) } : r,
      ),
    }));

  const excluirRotina = (id) => {
    excluirComDesfazer("rotinas", id, (r) => `Rotina "${r.nome}" excluída`);
    if (rotinaAbertaId === id) setRotinaAbertaId(null);
  };

  /* ---- lembretes (#23): padrões globais (o registro do aparelho fica em notificacoes.js) ---- */
  const salvarPreferenciasLembretes = (prefs) => gravar((d) => ({ ...d, lembretes: prefs }));

  /* ---- ações compromissos (pontuais, v5) ---- */
  const criarCompromisso = (dados) => {
    const novo = { id: uid(), feito: false, ...dados };
    gravar((d) => ({ ...d, compromissos: [...(d.compromissos || []), novo] }));
  };

  const atualizarCompromisso = (id, patch) =>
    gravar((d) => ({
      ...d,
      compromissos: (d.compromissos || []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));

  // Mesmo cuidado do afazer (#43): desmarcar nunca grava `concluidoEm: undefined`.
  const alternarFeitoCompromisso = (id) =>
    gravar((d) => ({
      ...d,
      compromissos: (d.compromissos || []).map((c) => {
        if (c.id !== id) return c;
        return c.feito ? { ...c, feito: false } : { ...c, feito: true, concluidoEm: Date.now() };
      }),
    }));

  const excluirCompromisso = (id) => {
    excluirComDesfazer("compromissos", id, (c) => `Compromisso "${c.nome}" excluído`);
  };

  // "Apagar passados" da aba Compromissos, com Desfazer (#18).
  const limparCompromissosPassados = () => {
    const hoje = toISO(new Date());
    let removidos = [];
    let chaves = {};
    const r = gravar((d) => {
      const sep = separarRemovidos(d.compromissos || [], (c) => !c.data || c.data < hoje);
      if (sep.removidos.length === 0) return d;
      removidos = sep.removidos;
      const limpo = limparChavesOrfas({ ...d, compromissos: sep.restantes }); // #52
      chaves = limpo.removidas;
      return limpo.dados;
    });
    if (!gravouAlgo(r) || removidos.length === 0) return;
    const n = removidos.length;
    const s = n !== 1 ? "s" : "";
    avisarComDesfazer(`${n} compromisso${s} passado${s} apagado${s}`, (d) =>
      devolverChaves({ ...d, compromissos: reinserirVarios(d.compromissos || [], removidos) }, chaves),
    );
  };

  const abrirCalendarioNaData = (dataISO) => {
    setDiaCalendario({ data: dataISO, ts: Date.now() });
    setAba("visaogeral");
  };

  const abrirNovoCompromissoNaData = (dataISO) => {
    setGatilhoNovoCompromisso({ data: dataISO, ts: Date.now() });
    setAba("compromissos");
  };

  /* ---- ações afazeres ---- */
  const afazeres = data.afazeres || [];

  const criarAfazer = (afazer) => {
    const novo = { id: uid(), feito: false, datasConcluidas: [], ...afazer };
    gravar((d) => ({ ...d, afazeres: [...(d.afazeres || []), novo] }));
  };

  const atualizarAfazer = (id, patch) => {
    gravar((d) => ({
      ...d,
      afazeres: (d.afazeres || []).map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  };

  const alternarFeitoAfazer = (id, dataOcorrencia) => {
    gravar((d) => ({
      ...d,
      afazeres: (d.afazeres || []).map((a) => {
        if (a.id !== id) return a;

        // Rotina: conclui só a ocorrência (pela data natural, #14). Sem a
        // data da ocorrência não faz nada — nunca marcar a rotina inteira
        // como `feito` (#11: "Apagar concluídos" apagava a rotina toda).
        if (ehRotina(a)) {
          if (!dataOcorrencia) return a;
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
    gravar((d) => ({
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
    excluirComDesfazer("afazeres", id, (a) => `Afazer "${a.nome}" excluído`);
  };

  const abrirNovoAfazerNaData = (dataISO) => {
    setGatilhoNovoAfazer({ data: dataISO, ts: Date.now() });
    setAba("afazeres");
  };

  /* ---- ações eventos concluidos / excluídos por instância ---- */
  const eventosConcluidos = data.eventosConcluidos || [];
  const eventosExcluidos = data.eventosExcluidos || [];

  const alternarEventoConcluido = (chave) => {
    gravar((d) => {
      const concluidos = d.eventosConcluidos || [];
      return {
        ...d,
        eventosConcluidos: concluidos.includes(chave) ? concluidos.filter((c) => c !== chave) : [...concluidos, chave],
      };
    });
  };

  // Remove só esta ocorrência (dia) de um evento da agenda — usado quando
  // algo foi cancelado e não faz sentido continuar aparecendo naquele dia.
  // Para itens recorrentes (aula, rotina, afazer com repetição), a chave
  // já carrega a data específica dessa ocorrência, então isso NÃO apaga o
  // horário/afazer em si — só esconde esse dia; as outras ocorrências
  // continuam normalmente.
  // Sem confirm(): dá para desfazer pelo toast (#18).
  const excluirInstanciaEvento = (chave, texto = "Removido da agenda") => {
    const r = gravar((d) => {
      const excluidos = d.eventosExcluidos || [];
      // Devolver o próprio `d` = nada a gravar (ver resolverGravacao).
      if (excluidos.includes(chave)) return d;
      return { ...d, eventosExcluidos: [...excluidos, chave] };
    });
    if (!gravouAlgo(r)) return;
    avisarComDesfazer(texto, (d) => ({
      ...d,
      eventosExcluidos: (d.eventosExcluidos || []).filter((c) => c !== chave),
    }));
  };

  // Sem confirm(): dá para desfazer pelo toast (#18).
  const limparAfazeresConcluidos = () => {
    let removidos = [];
    let chaves = {};
    const r = gravar((d) => {
      // Rotinas nunca entram aqui (#11), mesmo com um `feito` antigo.
      const sep = separarRemovidos(d.afazeres || [], afazerConcluido);
      if (sep.removidos.length === 0) return d;
      removidos = sep.removidos;
      const limpo = limparChavesOrfas({ ...d, afazeres: sep.restantes }); // #52
      chaves = limpo.removidas;
      return limpo.dados;
    });
    if (!gravouAlgo(r) || removidos.length === 0) return;
    const n = removidos.length;
    const s = n !== 1 ? "s" : "";
    avisarComDesfazer(`${n} afazer${n !== 1 ? "es" : ""} concluído${s} apagado${s}`, (d) =>
      devolverChaves({ ...d, afazeres: reinserirVarios(d.afazeres || [], removidos) }, chaves),
    );
  };

  /* ---- backup: exportar / importar ---- */
  const exportarBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    // Data LOCAL (#13): toISOString() é UTC e, depois das 21h no Recife, já dava o dia seguinte.
    const hoje = toISO(new Date());
    a.href = url;
    a.download = `agenda-backup-${hoje}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const importarBackup = (arquivo) => {
    const leitor = new FileReader();
    leitor.onload = async (e) => {
      let importado;
      try {
        importado = JSON.parse(e.target.result);
        if (!importado || typeof importado !== "object" || !Array.isArray(importado.periodos)) {
          throw new Error("formato inválido");
        }
      } catch {
        avisar("Não foi possível ler este arquivo. Verifique se é um backup válido (.json).", {
          titulo: "Importar backup",
        });
        return;
      }
      if (ehVersaoFutura(importado)) {
        avisar(MSG_BACKUP_VERSAO_FUTURA, { titulo: "Importar backup" });
        return;
      }
      const ok = await confirmar("Importar este backup vai substituir TODOS os dados atuais. Deseja continuar?", {
        titulo: "Importar backup",
        textoConfirmar: "Substituir dados",
        perigo: true,
      });
      if (!ok) return;
      // gravar() avisa se o persist() recusar (ex.: backup "vazio", #44).
      const r = gravar({
        // A versão do schema TEM que vir junto: sem ela o backup seria
        // tratado como v0 e migrado de novo (ver utils/migracoes.js).
        versao: importado.versao,
        periodos: importado.periodos ?? [],
        cadeiras: importado.cadeiras ?? [],
        // Backup v5+ tem `rotinas`; num anterior os semanais ainda estão em
        // `compromissos` e a migração v5 os move para `rotinas`.
        ...(Array.isArray(importado.rotinas) ? { rotinas: importado.rotinas } : {}),
        compromissos: importado.compromissos ?? [],
        afazeres: importado.afazeres ?? [],
        eventosConcluidos: importado.eventosConcluidos ?? [],
        eventosExcluidos: importado.eventosExcluidos ?? [],
        periodoAtivoId: importado.periodoAtivoId ?? null,
      });
      if (r.ok) notificar("Backup importado.");
    };
    leitor.readAsText(arquivo);
  };

  /* ---- backup: restaurar a partir da nuvem (Firestore) ----
     A lista de backups é um modal próprio (#17), não mais um prompt(). */
  const abrirRestaurarNuvem = () => {
    if (!user) {
      avisar("Você precisa estar logado para restaurar um backup da nuvem.", { titulo: "Restaurar da nuvem" });
      return;
    }
    setRestaurandoNuvem(true);
  };

  const restaurarBackupNuvem = async (escolhido) => {
    if (ehVersaoFutura(escolhido.payload)) {
      avisar(MSG_BACKUP_VERSAO_FUTURA, { titulo: "Restaurar da nuvem" });
      return;
    }
    const ok = await confirmar(
      `Restaurar o backup de ${escolhido.dataHora}? Isso substitui TODOS os dados atuais (locais e na nuvem).`,
      { titulo: "Restaurar da nuvem", textoConfirmar: "Restaurar", perigo: true },
    );
    if (!ok) return;
    // gravar() já avisa se o persist() recusar (#44) — não anunciar sucesso nesse caso.
    const r = gravar(escolhido.payload);
    if (!r.ok) return;
    setRestaurandoNuvem(false);
    notificar(`Backup de ${escolhido.dataHora} restaurado.`);
  };

  // O aviso de login (e-mail não permitido, erro do popup) vem do
  // firebase.js como texto e aparece num diálogo próprio (#17).
  const entrar = async () => {
    const r = await loginWithGoogle();
    if (!r.ok && r.mensagem) avisar(r.mensagem, { titulo: "Login" });
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
        onRestaurarBackupNuvem={abrirRestaurarNuvem}
        onAbrirLembretes={() => setModalLembretes(true)}
        onImportarBackup={importarBackup}
        user={user}
        loginWithGoogle={entrar}
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
            onGatilhoConsumido={() => setGatilhoNovoAfazer(null)}
          />
        ) : aba === "compromissos" ? (
          <VisaoCompromissos
            compromissos={compromissos}
            onCriar={criarCompromisso}
            onEditar={atualizarCompromisso}
            onAlternarFeito={alternarFeitoCompromisso}
            onExcluir={excluirCompromisso}
            onLimparPassados={limparCompromissosPassados}
            lembretesPadrao={preferenciasLembretes.compromissos}
            gatilhoNovaData={gatilhoNovoCompromisso}
            onGatilhoConsumido={() => setGatilhoNovoCompromisso(null)}
          />
        ) : aba === "hoje" ? (
          <VisaoHoje
            cadeiras={data.cadeiras}
            rotinas={rotinas}
            compromissos={compromissos}
            afazeres={afazeres}
            eventosConcluidos={eventosConcluidos}
            eventosExcluidos={eventosExcluidos}
            onAlternarEventoConcluido={alternarEventoConcluido}
            onExcluirInstanciaEvento={excluirInstanciaEvento}
            onAlternarFeitoAfazer={alternarFeitoAfazer}
            onExcluirAfazer={excluirAfazer}
            onAlternarFeitoCompromisso={alternarFeitoCompromisso}
            onExcluirCompromisso={excluirCompromisso}
            onNovoAfazer={abrirNovoAfazerNaData}
            onNovoCompromisso={abrirNovoCompromissoNaData}
            onAbrirCalendarioNaData={abrirCalendarioNaData}
          />
        ) : aba === "visaogeral" ? (
          <VisaoGeral
            cadeiras={data.cadeiras}
            rotinas={rotinas}
            compromissos={compromissos}
            afazeres={afazeres}
            eventosConcluidos={eventosConcluidos}
            eventosExcluidos={eventosExcluidos}
            onAlternarEventoConcluido={alternarEventoConcluido}
            onExcluirInstanciaEvento={excluirInstanciaEvento}
            onAlternarFeitoAfazer={alternarFeitoAfazer}
            onAtualizarAfazer={atualizarAfazer}
            onMoverInstanciaAfazer={moverInstanciaAfazer}
            onExcluirAfazer={excluirAfazer}
            onAlternarFeitoCompromisso={alternarFeitoCompromisso}
            onAtualizarCompromisso={atualizarCompromisso}
            onExcluirCompromisso={excluirCompromisso}
            onNovoAfazer={abrirNovoAfazerNaData}
            onNovoCompromisso={abrirNovoCompromissoNaData}
            diaInicial={diaCalendario}
            onDiaInicialConsumido={() => setDiaCalendario(null)}
          />
        ) : aba === "rotinas" ? (
          <VisaoRotinas
            rotinas={rotinas}
            eventosExcluidos={eventosExcluidos}
            onCriar={criarRotina}
            onAbrir={setRotinaAbertaId}
            onExcluir={excluirRotina}
          />
        ) : !periodoAtivo ? (
          <EstadoVazio
            texto="Crie um período para começar"
            onAcao={() => setModalPeriodo(true)}
            acaoTexto="Novo período"
          />
        ) : aba === "cadeiras" ? (
          <VisaoCadeiras
            periodos={data.periodos}
            periodoAtivo={periodoAtivo}
            cadeiras={cadeirasDoPeriodo}
            eventosExcluidos={eventosExcluidos}
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
            rotinas={rotinas}
            onAbrirCadeira={setCadeiraAbertaId}
            onAbrirRotina={setRotinaAbertaId}
          />
        )}
      </main>

      {cadeiraAberta && (
        <PainelCadeira
          cadeira={cadeiraAberta}
          eventosExcluidos={eventosExcluidos}
          lembretesPadrao={preferenciasLembretes.avaliacoes}
          onFechar={() => setCadeiraAbertaId(null)}
          onAtualizar={(patch) => atualizarCadeira(cadeiraAberta.id, patch)}
          onExcluir={() => excluirCadeira(cadeiraAberta.id)}
        />
      )}

      {rotinaAberta && (
        <PainelRotina
          rotina={rotinaAberta}
          eventosExcluidos={eventosExcluidos}
          onFechar={() => setRotinaAbertaId(null)}
          onAtualizar={(patch) => atualizarRotina(rotinaAberta.id, patch)}
          onExcluir={() => excluirRotina(rotinaAberta.id)}
        />
      )}

      {restaurandoNuvem && user && (
        <ModalRestaurarNuvem
          uid={user.uid}
          onEscolher={restaurarBackupNuvem}
          onFechar={() => setRestaurandoNuvem(false)}
        />
      )}

      {modalLembretes && (
        <ModalLembretes
          user={user}
          preferencias={preferenciasLembretes}
          onSalvarPreferencias={salvarPreferenciasLembretes}
          onFechar={() => setModalLembretes(false)}
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
