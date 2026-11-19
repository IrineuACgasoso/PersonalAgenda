// Tela inicial e watchdog (src/utils/carregamento.js) — #7: logado, sem
// cache e sem rede, o app recarregava a cada 12s para sempre.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { telaInicial, acaoDoWatchdog } from "../../src/utils/carregamento.js";

describe("telaInicial", () => {
  it("com dados mostra o app, mesmo se houve erro antes", () => {
    expect(telaInicial({ temDados: true, erroCarga: true, travou: true })).toBe("app");
  });

  it("erro de carga sem dados vai para a tela de erro (não fica no loading)", () => {
    expect(telaInicial({ temDados: false, erroCarga: true, travou: false })).toBe("erro");
  });

  it("erro conhecido tem prioridade sobre 'travado'", () => {
    expect(telaInicial({ temDados: false, erroCarga: true, travou: true })).toBe("erro");
  });

  it("travado sem erro conhecido", () => {
    expect(telaInicial({ temDados: false, erroCarga: false, travou: true })).toBe("travado");
  });

  it("sem dados e sem erro: carregando", () => {
    expect(telaInicial({ temDados: false, erroCarga: false, travou: false })).toBe("carregando");
  });
});

describe("acaoDoWatchdog (#7: no máximo 1 reload por sessão)", () => {
  it("primeira vez recarrega", () => expect(acaoDoWatchdog(false)).toBe("recarregar"));
  it("já recarregou nesta sessão: mostra o erro em vez de entrar em loop", () =>
    expect(acaoDoWatchdog(true)).toBe("mostrar-erro"));
});

describe("App.jsx não recarrega incondicionalmente (#7, regressão)", () => {
  const app = readFileSync(new URL("../../src/App.jsx", import.meta.url), "utf8");
  it("o único reload automático passa pelo acaoDoWatchdog", () => {
    const timeoutsComReload = app.match(/setTimeout\(\s*\(\)\s*=>\s*window\.location\.reload\(\)/g) || [];
    expect(timeoutsComReload).toHaveLength(0);
    expect(app).toMatch(/acaoDoWatchdog\(/);
  });
});
