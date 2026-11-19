// Checagens estáticas do projeto (arquivos, configs, imports) — pegam
// regressões que o build não acusa.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");

describe("PWA", () => {
  // BUG CONHECIDO (todo.md): icon-maskable-512.png referenciado mas inexistente.
  it.fails("todo ícone citado no vite.config.js existe em public/", () => {
    const cfg = ler("vite.config.js");
    const arquivos = [...cfg.matchAll(/["']([\w-]+\.(?:png|svg|ico))["']/g)].map((m) => m[1]);
    const faltando = arquivos.filter((f) => !existsSync(join(RAIZ, "public", f)));
    expect(faltando).toEqual([]);
  });
});

describe("CSS", () => {
  it("app.css importa mobile.css por último", () => {
    const imports = [...ler("src/styles/app.css").matchAll(/@import\s+"([^"]+)"/g)].map((m) => m[1]);
    expect(imports.at(-1)).toBe("./mobile.css");
  });
  it("todo arquivo de src/styles está importado no app.css", () => {
    const app = ler("src/styles/app.css");
    const soltos = readdirSync(join(RAIZ, "src/styles"))
      .filter((f) => f.endsWith(".css") && f !== "app.css")
      .filter((f) => !app.includes(`./${f}`));
    expect(soltos).toEqual([]);
  });
  it("@media de mobile só existe em mobile.css", () => {
    const outros = readdirSync(join(RAIZ, "src/styles"))
      .filter((f) => f.endsWith(".css") && f !== "mobile.css")
      .filter((f) => /@media[^{]*max-width/.test(ler(`src/styles/${f}`)));
    expect(outros).toEqual([]);
  });
});

describe("Regressões de UI", () => {
  // Bug corrigido em 2026-11-18: no mobile o nome longo do evento era
  // cortado com "..." na lista "Eventos em DD/MM" do calendário geral.
  it("título dos eventos do dia quebra linha em vez de ser cortado", () => {
    const jsx = ler("src/components/VisaoGeral.jsx");
    expect(jsx).toContain("data-item-titulo-quebra");
    const regra = ler("src/styles/agenda.css").match(/\.data-item-titulo-quebra\s*\{([^}]*)\}/);
    expect(regra?.[1]).toMatch(/white-space:\s*normal/);
    expect(regra?.[1]).toMatch(/overflow-wrap:\s*anywhere/);
  });
});

describe("Segurança", () => {
  it(".env está no .gitignore", () => {
    expect(ler(".gitignore").split(/\r?\n/)).toContain(".env");
  });
  it("credenciais Firebase vêm do .env, não estão hardcoded", () => {
    expect(ler("src/firebase.js")).not.toMatch(/AIza[0-9A-Za-z_-]{20,}/);
  });
});
