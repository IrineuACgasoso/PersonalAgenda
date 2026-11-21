// src/firebase.js
import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Exportado para o FCM dos lembretes (src/notificacoes.js, #23).
export const app = initializeApp(firebaseConfig);

// Cache local persistente (IndexedDB): permite ler/escrever offline. Escritas
// feitas sem rede ficam na fila do próprio SDK do Firestore e sobem para o
// servidor sozinhas assim que a conexão volta — não precisamos reimplementar
// essa sincronização na mão. `persistentMultipleTabManager` (#47): o cache é
// compartilhado entre abas/instâncias (PWA instalado + aba do navegador). Com
// o SingleTab, a segunda instância caía para cache só em memória e não abria
// offline. As escritas continuam passando pelo persist() de cada instância.
// `ignoreUndefinedProperties`: rede de segurança do #43 — sem ela, um único
// campo `undefined` no estado fazia TODO setDoc falhar. O sanitizarDados já
// remove os undefined; isto cobre qualquer caminho que escape dele.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
});
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// E-mail único permitido
export const EMAIL_PERMITIDO = "cac@cin.ufpe.br";

// Garante sessão persistente no navegador/celular
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Erro ao definir persistência de login:", err);
});

// Devolve { ok: true, user } ou { ok: false, mensagem }. A mensagem é
// mostrada pelo App num diálogo próprio (#17) — antes era um alert().
// `mensagem` null = o usuário só fechou o popup; nada a avisar.
export const loginComGoogle = async () => {
  try {
    const res = await signInWithPopup(auth, googleProvider);

    // Trava de e-mail exclusivo
    if (res.user.email !== EMAIL_PERMITIDO) {
      await signOut(auth);
      return {
        ok: false,
        mensagem: `Acesso negado! Apenas o e-mail ${EMAIL_PERMITIDO} tem permissão para acessar este painel.`,
      };
    }

    return { ok: true, user: res.user };
  } catch (error) {
    if (error?.code === "auth/popup-closed-by-user" || error?.code === "auth/cancelled-popup-request") {
      return { ok: false, mensagem: null };
    }
    console.error("Erro ao fazer login:", error);
    return { ok: false, mensagem: `Não foi possível realizar o login: ${error.message}` };
  }
};

export const fazerLogout = () => signOut(auth);
