import { describe, expect, it } from "vitest";
import { nomeAoSair } from "../../src/utils/nomes.js";

describe("nomeAoSair (#48)", () => {
  it("nome apagado não grava e o campo volta ao nome atual", () => {
    expect(nomeAoSair("", "Cálculo II")).toEqual({ salvar: null, exibir: "Cálculo II" });
    expect(nomeAoSair("   ", "Cálculo II")).toEqual({ salvar: null, exibir: "Cálculo II" });
    expect(nomeAoSair(undefined, "Academia")).toEqual({ salvar: null, exibir: "Academia" });
  });

  it("nome novo grava sem os espaços das pontas", () => {
    expect(nomeAoSair("  Cálculo III ", "Cálculo II")).toEqual({ salvar: "Cálculo III", exibir: "Cálculo III" });
  });

  it("mesmo nome não grava de novo", () => {
    expect(nomeAoSair("Cálculo II ", "Cálculo II")).toEqual({ salvar: null, exibir: "Cálculo II" });
  });
});
