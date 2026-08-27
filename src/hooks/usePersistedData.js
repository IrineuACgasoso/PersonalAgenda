// src/hooks/usePersistedData.js
import { useState, useEffect, useRef } from "react";
import { doc, onSnapshot, setDoc, getDocFromServer } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth, loginComGoogle, fazerLogout, EMAIL_PERMITIDO } from "../firebase";
import { STORAGE_KEY } from "../constants";
import { DADOS_PADRAO, sanitizarDados, pareceVazio } from "../utils/sanitizarDados";

export default function usePersistedData() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");

  // Trava dupla contra escrita prematura / sobre dados ainda não confirmados.
  const carregadoRef = useRef(false);

  // Fila de escrita: garante que os `setDoc` cheguem ao Firestore na MESMA
  // ordem em que foram chamados. Sem isso, duas chamadas de persist() em
  // sequência rápida podem ter suas respostas de rede fora de ordem e a
  // mais antiga "vence" por último, apagando a alteração mais nova.
  const filaRef = useRef(Promise.resolve());
  // Só o resultado da chamada mais recente deve atualizar o status na tela.
  const versaoRef = useRef(0);

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
        const snapServidor = await getDocFromServer(userDocRef);
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
      } catch (error) {
        // Sem acesso ao servidor agora (ex: offline no primeiro login).
        // Não arriscamos criar/sobrescrever nada — apenas reportamos erro
        // e deixamos os próximos snapshots (abaixo) tentarem de novo assim
        // que a conexão voltar.
        console.error("Erro ao confirmar dados no servidor:", error);
        setStatus("error");
      }
    })();

    // Depois da checagem inicial segura, o onSnapshot só ATUALIZA a tela
    // em tempo real — nunca decide criar/sobrescrever o documento.
    const unsubscribeSnapshot = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (!carregadoRef.current) return; // ainda na checagem inicial acima
        if (docSnap.exists()) {
          setData(sanitizarDados(docSnap.data()));
          setStatus("saved");
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

  // 3. Persistência segura, serializada e sem race conditions
  const persist = async (newData) => {
    if (!carregadoRef.current) {
      console.warn("Tentativa de salvar bloqueada: dados ainda estão sendo carregados do banco.");
      return;
    }

    const dataSanitizada = sanitizarDados(newData);

    // Trava extra: nunca gravamos algo que sanitiza para "vazio" por cima
    // de um estado local que claramente tinha conteúdo — isso indicaria
    // bug no chamador (ex: limpou o state sem querer) em vez de uma ação
    // real do usuário.
    if (pareceVazio(dataSanitizada) && !pareceVazio(data)) {
      console.error(
        "persist() bloqueado: dados novos parecem vazios enquanto os atuais não estão. " +
          "Isso evita uma possível perda acidental de dados. Se isso for intencional " +
          "(ex: o usuário excluiu tudo de propósito), revise esta trava."
      );
      setStatus("error");
      return;
    }

    setData(dataSanitizada);
    setStatus("saving");

    const minhaVersao = ++versaoRef.current;

    // Encadeia a escrita na fila em vez de disparar em paralelo. Isso é o
    // que garante ORDEM: a próxima escrita só começa depois que a anterior
    // terminou (com sucesso ou erro), então a resposta de rede não pode
    // chegar fora de ordem e sobrescrever um dado mais novo com um antigo.
    filaRef.current = filaRef.current.then(async () => {
      try {
        if (user) {
          const userDocRef = doc(db, "users", user.uid);
          await setDoc(userDocRef, dataSanitizada);
        } else {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(dataSanitizada));
        }
        // Só atualiza o status se ninguém mais recente já respondeu.
        if (minhaVersao === versaoRef.current) setStatus("saved");
      } catch (err) {
        console.error("Erro ao salvar dados:", err);
        if (minhaVersao === versaoRef.current) setStatus("error");
      }
    });

    await filaRef.current;
  };

  return {
    data,
    persist,
    status,
    user,
    loginWithGoogle: loginComGoogle,
    logout: fazerLogout,
  };
}
