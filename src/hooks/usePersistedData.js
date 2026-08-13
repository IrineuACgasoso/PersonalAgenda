// src/hooks/usePersistedData.js
import { useState, useEffect } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth, loginComGoogle, fazerLogout, EMAIL_PERMITIDO } from "../firebase";
import { STORAGE_KEY } from "../constants";

const DADOS_PADRAO = {
  periodos: [{ id: "p1", nome: "2026.1" }],
  cadeiras: [],
  afazeres: [],
  periodoAtivoId: "p1",
};

export default function usePersistedData() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading"); // "saved" | "saving" | "error" | "loading"

  // 1. Escuta alterações na Autenticação (Persistente)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Validação extra de segurança do e-mail
        if (currentUser.email !== EMAIL_PERMITIDO) {
          await signOut(auth);
          setUser(null);
          return;
        }
        setUser(currentUser);
      } else {
        setUser(null);
        const local = localStorage.getItem(STORAGE_KEY);
        setData(local ? JSON.parse(local) : DADOS_PADRAO);
        setStatus("saved");
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Escuta alterações no Firestore
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
          const localDataRaw = localStorage.getItem(STORAGE_KEY);
          const dataParaSalvar = localDataRaw
            ? JSON.parse(localDataRaw)
            : DADOS_PADRAO;

          const dataSanitizada = JSON.parse(JSON.stringify(dataParaSalvar));
          await setDoc(userDocRef, dataSanitizada);
          setData(dataSanitizada);
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

  // 3. Função para persistir dados
  const persist = async (newData) => {
    const dataSanitizada = JSON.parse(JSON.stringify(newData));

    setData(dataSanitizada);
    setStatus("saving");

    try {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, dataSanitizada);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataSanitizada));
      }
      setStatus("saved");
    } catch (err) {
      console.error("Erro ao salvar dados:", err);
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