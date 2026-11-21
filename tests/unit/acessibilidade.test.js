import { describe, expect, it, vi } from "vitest";
import { propsDeBotao } from "../../src/utils/acessibilidade.js";

const tecla = (key, mesmoAlvo = true) => {
  const el = {};
  return { key, target: mesmoAlvo ? el : {}, currentTarget: el, preventDefault: vi.fn() };
};

describe("propsDeBotao (#51)", () => {
  it("vira botão acessível por teclado", () => {
    const p = propsDeBotao(() => {}, { "aria-label": "Abrir" });
    expect(p).toMatchObject({ role: "button", tabIndex: 0, "aria-label": "Abrir" });
  });

  it("Enter e Espaço disparam a ação (e o Espaço não rola a página)", () => {
    const acao = vi.fn();
    const p = propsDeBotao(acao);
    const espaco = tecla(" ");
    p.onKeyDown(tecla("Enter"));
    p.onKeyDown(espaco);
    expect(acao).toHaveBeenCalledTimes(2);
    expect(espaco.preventDefault).toHaveBeenCalled();
  });

  it("ignora outras teclas e teclas vindas de um botão de dentro", () => {
    const acao = vi.fn();
    const p = propsDeBotao(acao);
    p.onKeyDown(tecla("a"));
    p.onKeyDown(tecla("Enter", false));
    expect(acao).not.toHaveBeenCalled();
  });

  it("clique continua chamando a ação", () => {
    const acao = vi.fn();
    propsDeBotao(acao).onClick("ev");
    expect(acao).toHaveBeenCalledWith("ev");
  });
});
