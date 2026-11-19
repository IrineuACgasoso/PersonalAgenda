// src/hooks/usePersistedData.js
import { useState, useEffect, useRef } from "react";
import { doc, onSnapshot, setDoc, getDocFromServer, getDocFromCache } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth, loginComGoogle, fazerLogout, EMAIL_PERMITIDO } from "../firebase";
import { STORAGE_KEY, ULTIMA_SINCRONIZACAO_KEY } from "../constants";
import { DADOS_PADRAO, sanitizarDados } from "../utils/sanitizarDados";
import { ehVersaoFutura } from "../utils/migracoes";
import { resolverGravacao, statusDoSnapshot, criarDespachante } from "../utils/persistencia";

// Tempo máximo de espera pela confirmação do servidor na checagem inicial.
// Numa rede instável (ex: wifi caindo bem nessa hora) a chamada pode nunca
// rejeitar sozinha — sem esse teto, o app fica preso em "loading" para sempre.
const TIMEOUT_CHECAGEM_SERVIDOR_MS = 8000;

function comTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

export default function usePersistedData() {
  const [user, setUser] = useState(null);
  const [data, setDataState] = useState(null);
  // Cópia SÍNCRONA do estado mais recente. O `data` do React só muda no
  // próximo render, então um persist() logo após outro (mesmo tick) leria o
  // valor velho e desfaria o anterior (#6). Todo setData passa por aqui.
  const dataRef = useRef(null);
  const setData = (novo) => {
    dataRef.current = novo;
    setDataState(novo);
  };
  const [status, setStatus] = useState("loading");
  // Conectividade real do navegador. Não bloqueia edição nem persist() — só
  // avisa na UI que as mudanças estão sendo enfileiradas localmente e serão
  // sincronizadas quando a rede voltar (o Firestore, com cache persistente
  // habilitado em firebase.js, já cuida dessa fila/sincronização sozinho).
  const [online, setOnline] = useState(navigator.onLine);
  // Timestamp (ms) da última vez que os dados foram confirmados com o
  // servidor de verdade (não do cache local). Persistido em localStorage
  // pra sobreviver a um reload feito enquanto ainda está offline — assim,
  // mesmo depois de recarregar sem rede, a UI ainda sabe "de quando" são
  // os dados que está mostrando.
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState(() => {
    const salvo = localStorage.getItem(ULTIMA_SINCRONIZACAO_KEY);
    return salvo ? Number(salvo) : null;
  });

  const marcarSincronizado = () => {
    const agora = Date.now();
    localStorage.setItem(ULTIMA_SINCRONIZACAO_KEY, String(agora));
    setUltimaSincronizacao(agora);
  };

  useEffect(() => {
    const marcarOnline = () => setOnline(true);
    const marcarOffline = () => setOnline(false);
    window.addEventListener("online", marcarOnline);
    window.addEventListener("offline", marcarOffline);
    return () => {
      window.removeEventListener("online", marcarOnline);
      window.removeEventListener("offline", marcarOffline);
    };
  }, []);

  // Dados gravados por uma versão mais nova do app (outro aparelho já
  // atualizado, este ainda com o PWA antigo em cache): mostra o aviso
  // "desatualizado" no lugar de qualquer outro status — persist() também
  // se recusa a gravar nesse estado. O autoUpdate do PWA resolve no reload.
  useEffect(() => {
    if (data && ehVersaoFutura(data) && status !== "desatualizado") setStatus("desatualizado");
  }, [data, status]);

  // Trava dupla contra escrita prematura / sobre dados ainda não confirmados.
  const carregadoRef = useRef(false);

  // Despacha cada gravação NA HORA (#54) e conta as que ainda não foram
  // confirmadas (`pendentes`) — ver criarDespachante em utils/persistencia.js.
  // A ordem das escritas é garantida pelo próprio SDK do Firestore.
  // Enquanto houver pendentes, o estado local está À FRENTE do servidor e o
  // onSnapshot é ignorado: um snapshot intermediário (confirmação do 1º
  // write com o 2º ainda pendente) faria a tela "voltar no tempo" e o
  // próximo updater partiria do estado velho.
  const despachanteRef = useRef(null);
  if (!despachanteRef.current) despachanteRef.current = criarDespachante();

  // 1. Escuta Autenticação
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        if (currentUser.email !== EMAIL_PERMITIDO) {
          await signOut(auth);
          setUser(null);
          return;
        }
        setUser(currentUser);
      } else {
        setUser(null);
        carregadoRef.current = false;
        const local = localStorage.getItem(STORAGE_KEY);
        let parsed = DADOS_PADRAO;
        try {
          parsed = local ? JSON.parse(local) : DADOS_PADRAO;
        } catch (e) {
          console.error("localStorage corrompido, usando padrão:", e);
        }
        setData(sanitizarDados(parsed));
        carregadoRef.current = true;
        setStatus("saved");
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Escuta Firestore com verificação segura de existência
  useEffect(() => {
    if (!user) return;

    setStatus("loading");
    carregadoRef.current = false;
    const userDocRef = doc(db, "users", user.uid);
    let cancelado = false;

    (async () => {
      // Passo crítico: NUNCA decidimos "o documento não existe" a partir da
      // primeira emissão do onSnapshot, porque essa primeira emissão pode
      // vir do cache local do navegador (offline-first do Firestore) e
      // reportar erroneamente "não existe" mesmo quando existe no servidor.
      // Foi esse cenário que provavelmente causou a perda de dados: o app
      // recriava o documento com dados vazios/locais por cima do real.
      // Aqui forçamos uma leitura direta do SERVIDOR antes de qualquer
      // decisão de criar/sobrescrever.
      try {
        const snapServidor = await comTimeout(getDocFromServer(userDocRef), TIMEOUT_CHECAGEM_SERVIDOR_MS);
        if (cancelado) return;

        if (!snapServidor.exists()) {
          const localDataRaw = localStorage.getItem(STORAGE_KEY);
          let dataInicial = DADOS_PADRAO;
          try {
            dataInicial = localDataRaw ? JSON.parse(localDataRaw) : DADOS_PADRAO;
          } catch (e) {
            console.error("localStorage corrompido ao migrar, usando padrão:", e);
          }
          const dataSanitizada = sanitizarDados(dataInicial);
          await setDoc(userDocRef, dataSanitizada);
          if (cancelado) return;
          setData(dataSanitizada);
        } else {
          setData(sanitizarDados(snapServidor.data()));
        }
        carregadoRef.current = true;
        setStatus("saved");
        marcarSincronizado();
      } catch (error) {
        // Sem acesso ao servidor agora (offline, rede instável, ou a
        // checagem estourou o tempo limite acima). Em vez de travar o app
        // esperando pra sempre, caímos pro cache local do Firestore (que o
        // próprio SDK mantém em IndexedDB): dá pra continuar usando o app
        // normalmente offline, e ele sincroniza sozinho quando a rede volta.
        console.error("Erro ao confirmar dados no servidor, tentando cache local:", error);
        try {
          const snapCache = await getDocFromCache(userDocRef);
          if (cancelado) return;
          if (snapCache.exists()) {
            setData(sanitizarDados(snapCache.data()));
            carregadoRef.current = true;
            setStatus("offline");
          } else {
            // Nunca sincronizou neste dispositivo e não há como confirmar
            // com o servidor agora: não existe uma base segura pra criar ou
            // liberar edição sem risco de perder dados depois.
            setStatus("error");
          }
        } catch (cacheError) {
          console.error("Sem cache local disponível:", cacheError);
          setStatus("error");
        }
      }
    })();

    // Depois da checagem inicial segura, o onSnapshot só ATUALIZA a tela
    // em tempo real — nunca decide criar/sobrescrever o documento.
    // `includeMetadataChanges` deixa a gente distinguir um snapshot que só
    // veio do cache local de um que já foi confirmado pelo servidor — é
    // assim que sabemos QUANDO de fato sincronizou (`ultimaSincronizacao`).
    const unsubscribeSnapshot = onSnapshot(
      userDocRef,
      { includeMetadataChanges: true },
      (docSnap) => {
        if (!carregadoRef.current) return; // ainda na checagem inicial acima
        if (despachanteRef.current.pendentes > 0) return; // persist() pendente: local está à frente (ver despachanteRef)
        if (docSnap.exists()) {
          setData(sanitizarDados(docSnap.data()));
          // #39: escrita local gera snapshot com fromCache=false mas
          // hasPendingWrites=true — ainda não dá para dizer "sincronizado".
          const { status: novoStatus, sincronizado } = statusDoSnapshot(docSnap.metadata, navigator.onLine);
          setStatus(novoStatus);
          if (sincronizado) marcarSincronizado();
        }
      },
      (error) => {
        console.error("Erro no Firestore:", error);
        setStatus("error");
      }
    );

    return () => {
      cancelado = true;
      unsubscribeSnapshot();
    };
  }, [user]);

  // 3. Persistência segura e sem race conditions (updater + despacho imediato, #6/#54).
  //
  // Uso preferido: persist((atual) => ({ ...atual, campo })) — o updater
  // recebe sempre o estado mais recente (dataRef), não o do closure de quem
  // chamou. Também aceita o objeto completo (importar/restaurar backup).
  //
  // Devolve { ok, motivo } na hora (não espera a rede): motivo é null,
  // "sem-mudanca", "carregando", "versao-futura" ou "parece-vazio".
  const persist = (entrada) => {
    if (!carregadoRef.current) {
      console.warn("Tentativa de salvar bloqueada: dados ainda estão sendo carregados do banco.");
      return { ok: false, motivo: "carregando" };
    }

    const resultado = resolverGravacao(dataRef.current, entrada);
    if (resultado.motivo === "versao-futura") {
      console.error("persist() bloqueado: os dados são de uma versão mais nova do app. Recarregue para atualizar.");
      setStatus("desatualizado");
    } else if (resultado.motivo === "parece-vazio") {
      console.error(
        "persist() bloqueado: dados novos parecem vazios enquanto os atuais não estão. " +
          "Isso evita uma possível perda acidental de dados. Se isso for intencional " +
          "(ex: o usuário excluiu tudo de propósito), revise esta trava."
      );
      setStatus("error");
    }
    if (!resultado.dados) return { ok: resultado.ok, motivo: resultado.motivo };

    const dataSanitizada = resultado.dados;
    setData(dataSanitizada);
    setStatus(navigator.onLine ? "saving" : "offline");

    // Dispara o setDoc AGORA, sem esperar o anterior (#54). O setDoc grava
    // na hora no cache persistente do Firestore (IndexedDB) — offline, a
    // edição já sobrevive a fechar o app — e o SDK envia as escritas ao
    // servidor na ordem em que foram feitas. A promise só resolve quando o
    // servidor confirma; ela serve apenas para o status, ninguém a espera.
    despachanteRef.current
      .enviar(() =>
        user
          ? setDoc(doc(db, "users", user.uid), dataSanitizada)
          : localStorage.setItem(STORAGE_KEY, JSON.stringify(dataSanitizada))
      )
      .then(({ ok, erro, ultima }) => {
        if (!ok) console.error("Erro ao salvar dados:", erro);
        // Só a gravação mais recente decide o status na tela.
        if (!ultima) return;
        if (ok) {
          setStatus(navigator.onLine ? "saved" : "offline");
          // setDoc só resolve depois que o servidor confirma (#39).
          if (user) marcarSincronizado();
        } else {
          setStatus(navigator.onLine ? "error" : "offline");
        }
      });

    return { ok: true, motivo: null };
  };

  return {
    data,
    persist,
    status,
    online,
    ultimaSincronizacao,
    user,
    loginWithGoogle: loginComGoogle,
    logout: fazerLogout,
  };
}