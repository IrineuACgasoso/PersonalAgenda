import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { nomeDoChunk, semCiclosEntreChunks } from "./vite.chunks.js";

export default defineConfig({
  build: {
    rollupOptions: { output: { manualChunks: nomeDoChunk } },
    // O chunk do Firebase tem ~760 kB (Firestore + re2js + webchannel + Auth) e
    // é necessário na abertura (ver vite.chunks.js). Os outros ficam bem abaixo.
    chunkSizeWarningLimit: 800,
  },
  plugins: [
    react(),
    semCiclosEntreChunks(),
    VitePWA({
      // Service worker próprio (src/sw.js) desde o #23: precisa tratar o
      // `push` dos lembretes. O cache continua o mesmo de antes.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "icon-512.png", "web-app-manifest-192x192.png", "web-app-manifest-512x512.png"],
      manifest: {
        // `id` fixo = identidade do app instalado (é o que o Chrome já
        // calculava a partir do start_url; deixar explícito evita que uma
        // mudança no start_url vire "outro app").
        id: "/",
        lang: "pt-BR",
        name: "Minha Agenda Pessoal",
        short_name: "Minha Agenda",
        description: "Cadeiras, afazeres e agenda em um só lugar",
        theme_color: "#0f1115",
        background_color: "#0f1115",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        // Os "any" são transparentes (aba do navegador, splash). O ícone da
        // tela inicial do Android sai dos "maskable" (fundo roxo opaco): sem
        // eles, o launcher põe o ícone transparente sobre um fundo BRANCO —
        // foi o que aconteceu enquanto o maskable apontava para um arquivo
        // que não existia (#15). Ícone já instalado não troca sozinho:
        // desinstalar e instalar de novo.
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
            src: "web-app-manifest-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "web-app-manifest-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      injectManifest: {
        // Cacheia o app shell inteiro: garante que o app abre offline mesmo
        // sem rede nenhuma. Os dados em si vêm do Firestore (com cache
        // persistente habilitado em src/firebase.js) quando logado, ou do
        // localStorage quando não logado — ver usePersistedData.js.
        // O fallback de navegação (/index.html) fica em src/sw.js.
        globPatterns: ["**/*.{js,css,html,png,svg,ico,mp4}"],
      },
    }),
  ],
});
