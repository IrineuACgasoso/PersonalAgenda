import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "icon-512.png", "icon-maskable-512.png"],
      manifest: {
        name: "Minha Agenda Pessoal",
        short_name: "Minha Agenda",
        description: "Cadeiras, afazeres e agenda em um só lugar",
        theme_color: "#0f1115",
        background_color: "#0f1115",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Cacheia o app shell inteiro: garante que o app abre offline mesmo
        // sem rede nenhuma. Os dados em si vêm do Firestore (com cache
        // persistente habilitado em src/firebase.js) quando logado, ou do
        // localStorage quando não logado — ver usePersistedData.js.
        globPatterns: ["**/*.{js,css,html,png,svg,ico,mp4}"],
        navigateFallback: "/index.html",
      },
    }),
  ],
});