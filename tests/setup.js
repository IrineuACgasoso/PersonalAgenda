// tests/setup.js
// Roda antes de cada arquivo de teste.
import { beforeEach, afterEach, vi } from "vitest";

// "Hoje" fixo: quarta-feira, 18/11/2026, 10:00 em Recife. Qualquer código
// que chame new Date() / Date.now() vê essa data. Para testar outro horário,
// use vi.setSystemTime(...) dentro do próprio teste.
export const AGORA_FIXO = new Date(2026, 10, 18, 10, 0, 0);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(AGORA_FIXO);
});

afterEach(() => {
  vi.useRealTimers();
});
