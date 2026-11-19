// "Grava só quando o usuário parar": src/utils/confirmacaoAdiada.js (#41),
// usado pelo SeletorCor para não fazer um persist() a cada pixel arrastado.
import { describe, it, expect } from "vitest";
import { criarConfirmacaoAdiada } from "../../src/utils/confirmacaoAdiada.js";

// Relógio manual (sem timers reais nem conflito com o fake de Date do setup).
function relogio() {
  let agora = 0;
  let proximoId = 1;
  const agendados = new Map();
  return {
    setTimeout(fn, ms) {
      const id = proximoId++;
      agendados.set(id, { fn, quando: agora + ms });
      return id;
    },
    clearTimeout(id) {
      agendados.delete(id);
    },
    avancar(ms) {
      agora += ms;
      for (const [id, t] of [...agendados]) {
        if (t.quando <= agora) {
          agendados.delete(id);
          t.fn();
        }
      }
    },
    get pendentes() {
      return agendados.size;
    },
  };
}

function montar(esperaMs = 400) {
  const r = relogio();
  const confirmados = [];
  const c = criarConfirmacaoAdiada((v) => confirmados.push(v), esperaMs, r);
  return { r, c, confirmados };
}

describe("criarConfirmacaoAdiada (#41)", () => {
  it("arrastar na roda de cores (muitos eventos seguidos) gera UMA confirmação", () => {
    const { r, c, confirmados } = montar();
    for (let i = 0; i < 50; i++) {
      c.mudar(`#0000${String(i).padStart(2, "0")}`);
      r.avancar(16); // ~60 eventos/s
    }
    expect(confirmados).toEqual([]);
    r.avancar(400);
    expect(confirmados).toEqual(["#000049"]);
  });

  it("confirmar() (change nativo / blur / desmontar) grava na hora e cancela o timer", () => {
    const { r, c, confirmados } = montar();
    c.mudar("#ff0000");
    c.confirmar();
    expect(confirmados).toEqual(["#ff0000"]);
    expect(r.pendentes).toBe(0);
    r.avancar(1000);
    expect(confirmados).toEqual(["#ff0000"]);
  });

  it("confirmar() sem nada pendente não faz nada", () => {
    const { c, confirmados } = montar();
    c.confirmar();
    expect(confirmados).toEqual([]);
  });

  it("não confirma de novo o mesmo valor (change + blur em sequência)", () => {
    const { c, confirmados } = montar();
    c.mudar("#ff0000");
    c.confirmar();
    c.mudar("#ff0000");
    c.confirmar();
    expect(confirmados).toEqual(["#ff0000"]);
  });

  it("não regrava o valor que já veio de fora (sincronizar)", () => {
    const { c, confirmados } = montar();
    c.sincronizar("#6366f1");
    c.mudar("#6366f1"); // ex: arrastou e voltou para a cor original
    c.confirmar();
    expect(confirmados).toEqual([]);
    c.mudar("#123456");
    c.confirmar();
    expect(confirmados).toEqual(["#123456"]);
  });

  it("cancelar() descarta o pendente", () => {
    const { r, c, confirmados } = montar();
    c.mudar("#ff0000");
    c.cancelar();
    r.avancar(1000);
    c.confirmar();
    expect(confirmados).toEqual([]);
  });
});
