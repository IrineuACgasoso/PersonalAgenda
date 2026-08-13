// src/hooks/usePersistedData.js
import { useState, useEffect } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth, loginComGoogle, fazerLogout } from "../firebase";

const LOCAL_STORAGE_KEY = "cadeiras_app_data";

const DADOS_PADRAO = {
  periodos: [{ id: "p1", nome: "2026.1" }],
  cadeiras: [],
  periodoAtivoId: "p1",
};

export default function usePersistedData() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading"); // "saved" | "saving" | "error" | "loading"

  // 1. Escuta alterações na Autenticação
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        // Quando deslogado, lê do localStorage
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        setData(local ? JSON.parse(local) : DADOS_PADRAO);
        setStatus("saved");
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Escuta alterações no Firestore quando o usuário está logado
  useEffect(() => {
    if (!user) return;

    setStatus("loading");
    const userDocRef = doc(db, "users", user.uid);

    const unsubscribeSnapshot = onSnapshot(
      userDocRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          setData(docSnap.data());
          setStatus("saved");
        } else {
          // Migra dados do localStorage para a nuvem no 1º login
          const localDataRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
          const dataParaSalvar = localDataRaw
            ? JSON.parse(localDataRaw)
            : DADOS_PADRAO;

          await setDoc(userDocRef, dataParaSalvar);
          setData(dataParaSalvar);
          setStatus("saved");
        }
      },
      (error) => {
        console.error("Erro no Firestore:", error);
        setStatus("error");
      }
    );

    return () => unsubscribeSnapshot();
  }, [user]);

  // 3. Função para persistir dados (nuvem ou local)
  const persist = async (newData) => {
    setData(newData); // Atualização otimista
    setStatus("saving");

    try {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, newData);
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newData));
      }
      setStatus("saved");
    } catch (err) {
      console.error("Erro ao salvar:", err);
      setStatus("error");
    }
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