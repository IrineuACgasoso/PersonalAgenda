// src/notificacoes.js
//
// Registro DESTE aparelho para receber os lembretes (#23).
//
// Como funciona: o app pede permissão, pega um token do FCM (Firebase Cloud
// Messaging) ligado ao service worker (src/sw.js) e grava esse token em
// users/{uid}/dispositivos/{id}. A Cloud Function agendada
// (functions/index.js) roda a cada minuto, calcula os lembretes que venceram
// e manda o push para todos os tokens da lista.
//
// Isto NÃO é dado do app (não passa por persist()): é um registro técnico do
// aparelho, como os backups da nuvem. As Rules limitam os campos.
//
// O SDK do Messaging é carregado só quando usado (import dinâmico): quem não
// liga os lembretes não baixa esse pedaço.
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { app, db } from "./firebase";
import { DISPOSITIVO_PUSH_KEY } from "./constants";
import { uid as gerarId } from "./utils/id";
import { estadoDoAparelho, descreverAparelho } from "./utils/aparelho";

const TEMPO_MAX_MS = 15000;

function lerRegistro() {
  try {
    const r = JSON.parse(localStorage.getItem(DISPOSITIVO_PUSH_KEY) || "null");
    return r && typeof r === "object" ? r : {};
  } catch {
    return {};
  }
}

function salvarRegistro(r) {
  try {
    localStorage.setItem(DISPOSITIVO_PUSH_KEY, JSON.stringify(r));
  } catch {
    /* sem localStorage: só não lembra que está ativo */
  }
}

// Promessa com prazo: sem rede, setDoc/serviceWorker.ready podem nunca resolver.
function comPrazo(promessa, mensagem) {
  let timer;
  return Promise.race([
    promessa,
    new Promise((_, rejeitar) => {
      timer = setTimeout(() => rejeitar(new Error(mensagem)), TEMPO_MAX_MS);
    }),
  ]).finally(() => clearTimeout(timer));
}

export function estadoNotificacoes(logado) {
  const ua = navigator.userAgent || "";
  return estadoDoAparelho({
    logado,
    ios: /iphone|ipad|ipod/i.test(ua),
    standalone: navigator.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches,
    temNotification: "Notification" in window,
    temServiceWorker: "serviceWorker" in navigator,
    temPush: "PushManager" in window,
    permissao: "Notification" in window ? Notification.permission : "default",
    ativo: !!lerRegistro().ativo,
  });
}

const refDispositivo = (uid, id) => doc(db, "users", uid, "dispositivos", id);

async function obterToken() {
  const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
  if (!(await isSupported())) throw new Error("Este navegador não suporta notificações push.");
  // No `npm run dev` não há service worker: o ready nunca resolveria.
  const registro = await comPrazo(
    navigator.serviceWorker.ready,
    "O service worker do app não está ativo (no modo dev, use `npm run build && npm run preview`).",
  );
  return getToken(getMessaging(app), {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined,
    serviceWorkerRegistration: registro,
  });
}

// Liga os lembretes neste aparelho. `testeEm` faz a função mandar um push de
// confirmação no próximo minuto ("Lembretes ativados") — serve de teste.
// Devolve { ok } ou { ok: false, mensagem } (mensagem null = só cancelou).
export async function ativarNotificacoes(uid) {
  try {
    const permissao = await Notification.requestPermission();
    if (permissao !== "granted") {
      return {
        ok: false,
        mensagem:
          permissao === "denied"
            ? "As notificações estão bloqueadas para este site. Libere nas configurações do navegador e tente de novo."
            : null,
      };
    }
    const token = await obterToken();
    const atual = lerRegistro();
    const id = atual.id || gerarId();
    const agora = Date.now();
    await comPrazo(
      setDoc(
        refDispositivo(uid, id),
        {
          token,
          aparelho: descreverAparelho(navigator.userAgent),
          criadoEm: atual.criadoEm || agora,
          atualizadoEm: agora,
          testeEm: agora,
        },
        { merge: true },
      ),
      "Sem conexão com o servidor. Tente de novo quando estiver online.",
    );
    salvarRegistro({ id, ativo: true, token, criadoEm: atual.criadoEm || agora });
    return { ok: true };
  } catch (err) {
    console.error("Erro ao ativar lembretes:", err);
    return { ok: false, mensagem: `Não foi possível ativar os lembretes: ${err?.message || err}` };
  }
}

export async function desativarNotificacoes(uid) {
  const atual = lerRegistro();
  try {
    const { getMessaging, deleteToken } = await import("firebase/messaging");
    await deleteToken(getMessaging(app)).catch(() => {});
    if (atual.id) await comPrazo(deleteDoc(refDispositivo(uid, atual.id)), "Sem conexão com o servidor.");
    salvarRegistro({ id: atual.id });
    return { ok: true };
  } catch (err) {
    console.error("Erro ao desativar lembretes:", err);
    // Mesmo sem apagar no servidor, para de considerar ativo aqui; a função
    // apaga sozinha tokens que o FCM disser que não valem mais.
    salvarRegistro({ id: atual.id });
    return { ok: false, mensagem: `Não foi possível desativar no servidor: ${err?.message || err}` };
  }
}

// Pede um push de teste (a função responde em até ~1 minuto).
export async function testarNotificacoes(uid) {
  const atual = lerRegistro();
  if (!atual.id) return { ok: false, mensagem: "Ative os lembretes neste aparelho primeiro." };
  try {
    await comPrazo(
      setDoc(refDispositivo(uid, atual.id), { testeEm: Date.now() }, { merge: true }),
      "Sem conexão com o servidor.",
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, mensagem: `Não foi possível pedir o teste: ${err?.message || err}` };
  }
}

// O FCM pode trocar o token (reinstalação, limpeza do navegador). Chamado
// uma vez por sessão: se mudou, atualiza o registro no servidor.
export async function renovarTokenSeAtivo(uid) {
  const atual = lerRegistro();
  if (!atual.ativo || !atual.id || !("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const token = await obterToken();
    if (token === atual.token) return;
    await setDoc(refDispositivo(uid, atual.id), { token, atualizadoEm: Date.now() }, { merge: true });
    salvarRegistro({ ...atual, token });
  } catch (err) {
    console.warn("Não foi possível renovar o token dos lembretes:", err);
  }
}
