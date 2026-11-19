// vitest.config.js
// Config separada do vite.config.js de propósito: os testes não precisam do
// plugin de PWA nem do React, e assim sobem bem mais rápido.
import { defineConfig } from "vitest/config";

// Fuso fixo de Recife (UTC-3, sem horário de verão): os testes de data
// precisam dar o mesmo resultado em qualquer máquina.
process.env.TZ = "America/Recife";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.js"],
    environment: "node",
    setupFiles: ["tests/setup.js"],
    reporters: ["default"],
  },
});
