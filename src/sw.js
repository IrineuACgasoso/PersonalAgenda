// src/sw.js — service worker do PWA (vite-plugin-pwa, estratégia injectManifest).
//
// Até o #23 o service worker era gerado automaticamente (generateSW). Os
// lembretes precisam tratar o evento `push`, então agora o SW é nosso:
//   1. o mesmo cache de antes (app shell inteiro → abre offline);
//   2. `push`: mostra a notificação que a Cloud Function mandou;
//   3. `notificationclick`: foca o app aberto (ou abre um novo).
// Não carregamos o SDK do Firebase aqui: a função manda mensagens só de
// dados (`data`) e quem desenha a notificação somos nós — fica igual em
// Android, desktop e iOS (que exige uma notificação visível a cada push).
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { clientsClaim } from "workbox-core";

// registerType "autoUpdate": a versão nova assume na hora (era o que o
// generateSW fazia por baixo dos panos).
self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
// Equivale ao antigo `navigateFallback: "/index.html"`.
registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html")));

// Mensagem do FCM: { data: { titulo, corpo, tag, url }, from, ... }.
// Lê com folga (`notification`/raiz) para não perder um push num formato
// inesperado — melhor uma notificação genérica que nenhuma.
self.addEventListener("push", (event) => {
  let payload;
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { data: { corpo: event.data ? event.data.text() : "" } };
  }
  const d = payload.data || payload.notification || payload;
  const titulo = d.titulo || d.title || "Minha Agenda";
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: d.corpo || d.body || "",
      tag: d.tag || undefined,
      icon: "/icon-192.png",
      data: { url: d.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const aberta = janelas.find((c) => "focus" in c);
      if (aberta) return aberta.focus();
      return self.clients.openWindow(url);
    })(),
  );
});
