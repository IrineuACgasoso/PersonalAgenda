// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD_GKUYFC90edRHGD9t19fKE4BQztBt0lc",
  authDomain: "personal-agenda-28cb5.firebaseapp.com",
  projectId: "personal-agenda-28cb5",
  storageBucket: "personal-agenda-28cb5.firebasestorage.app",
  messagingSenderId: "114855860515",
  appId: "1:114855860515:web:b4dcd7a9de4350be519496",
  measurementId: "G-NR5L0PGC8K"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
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