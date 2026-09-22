// src/firebase.js
import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from "firebase/firestore";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// Cache local persistente (IndexedDB): permite ler/escrever offline. Escritas
// feitas sem rede ficam na fila do próprio SDK do Firestore e sobem para o
// servidor sozinhas assim que a conexão volta — não precisamos reimplementar
// essa sincronização na mão. `persistentSingleTabManager` evita conflito
// entre abas: só a aba ativa usa o cache (mais simples que coordenar múltiplas).
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }),
});
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// E-mail único permitido
export const EMAIL_PERMITIDO = "cac@cin.ufpe.br";

// Garante sessão persistente no navegador/celular
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Erro ao definir persistência de login:", err);
});

export const loginComGoogle = async () => {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    
    // Trava de e-mail exclusivo
    if (res.user.email !== EMAIL_PERMITIDO) {
      await signOut(auth);
      alert(`Acesso negado! Apenas o e-mail ${EMAIL_PERMITIDO} tem permissão para acessar este painel.`);
      return null;
    }

    return res.user;
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    alert(`Não foi possível realizar o login: ${error.message}`);
  }
};

export const fazerLogout = () => signOut(auth);