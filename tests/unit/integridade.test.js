// Checagens estáticas do projeto (arquivos, configs, imports) — pegam
// regressões que o build não acusa.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");

describe("PWA", () => {
  // Regressão do #15: icon-maskable-512.png era referenciado mas não existia.
  it("todo ícone citado no vite.config.js existe em public/", () => {
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

  // Regressão do #42: o gatilho "novo afazer nesta data" ficava guardado no
  // App e reabria o formulário com a data antiga em toda visita à aba.
  it("gatilho de novo afazer é limpo depois de consumido", () => {
    expect(ler("src/App.jsx")).toMatch(/onGatilhoConsumido=\{\(\) => setGatilhoNovoAfazer\(null\)\}/);
    expect(ler("src/components/VisaoAfazeres.jsx")).toMatch(/onGatilhoConsumido\?\.\(\)/);
  });

  // Regressão do #50: links só viram href se forem http(s).
  it("AbaLinks não usa a URL crua no href", () => {
    const jsx = ler("src/components/abas/AbaLinks.jsx");
    expect(jsx).not.toMatch(/href=\{l\.url\}/);
    expect(jsx).toContain("hrefSeguro(");
  });

  // Regressão do #13: `new Date().toISOString()` é UTC; no Recife (UTC-3),
  // depois das 21h já é "amanhã". Datas locais usam toISO() de utils/afazeres.
  it("nenhum arquivo de src/ usa toISOString() (usar toISO para datas locais)", () => {
    const arquivos = (dir) =>
      readdirSync(join(RAIZ, dir), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? arquivos(`${dir}/${e.name}`) : /\.jsx?$/.test(e.name) ? [`${dir}/${e.name}`] : [],
      );
    const comUTC = arquivos("src").filter((f) => /\.toISOString\(\)/.test(ler(f)));
    expect(comUTC).toEqual([]);
  });

  // Regressão do #17: alert/confirm/prompt nativos são ruins no PWA (o iOS
  // mostra o endereço do site, e eles travam a página). Usar useDialogos().
  it("nenhum arquivo de src/ usa alert/confirm/prompt nativos", () => {
    const arquivos = (dir) =>
      readdirSync(join(RAIZ, dir), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? arquivos(`${dir}/${e.name}`) : /\.jsx?$/.test(e.name) ? [`${dir}/${e.name}`] : [],
      );
    const semComentarios = (codigo) => codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const nativos = arquivos("src").filter((f) =>
      /(?<![\w.])(?:window\.)?(?:alert|confirm|prompt)\(/.test(semComentarios(ler(f))),
    );
    expect(nativos).toEqual([]);
  });
});

describe("Qualidade (#16)", () => {
  it("npm run check roda o lint antes dos testes e do build", () => {
    const { scripts } = JSON.parse(ler("package.json"));
    expect(scripts.check.startsWith("npm run lint")).toBe(true);
    expect(scripts.lint).toMatch(/prettier --check/);
    // `src` passado explicitamente: no OneDrive a pasta aparece como link
    // simbólico para o Node, e `eslint .` / `prettier .` a pulavam em silêncio.
    expect(scripts.lint).toMatch(/eslint [^&]*\bsrc\b/);
    expect(scripts.lint).toMatch(/prettier --check [^&]*\bsrc\b/);
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

describe("Firestore Rules (firestore.rules)", () => {
  const rules = ler("firestore.rules");

  it("e-mail das Rules é o mesmo EMAIL_PERMITIDO do client", () => {
    const emailClient = ler("src/firebase.js").match(/EMAIL_PERMITIDO\s*=\s*"([^"]+)"/)[1];
    const emailRules = rules.match(/request\.auth\.token\.email\s*==\s*"([^"]+)"/)[1];
    expect(emailRules).toBe(emailClient);
  });

  it("todo campo obrigatório nas Rules é gravado pelo sanitizarDados", async () => {
    const { DADOS_PADRAO } = await import("../../src/utils/sanitizarDados.js");
    const obrigatorios = JSON.parse(rules.match(/hasAll\((\[[^\]]+\])\)/)[1]);
    expect(obrigatorios.filter((c) => !(c in DADOS_PADRAO))).toEqual([]);
  });

  // Fase 5 (rotinas): lista nova no AppData tem que ser exigida pelas Rules,
  // senão uma gravação com bug sem ela apagaria a lista inteira no servidor.
  it("toda lista do DADOS_PADRAO é obrigatória nas Rules", async () => {
    const { DADOS_PADRAO } = await import("../../src/utils/sanitizarDados.js");
    const obrigatorios = JSON.parse(rules.match(/hasAll\((\[[^\]]+\])\)/)[1]);
    const listas = Object.keys(DADOS_PADRAO).filter((c) => Array.isArray(DADOS_PADRAO[c]));
    expect(listas.filter((c) => !obrigatorios.includes(c))).toEqual([]);
  });

  it("documento principal não pode ser apagado e o resto do banco é negado", () => {
    expect(rules).toMatch(/match \/users\/\{uid\}[\s\S]*?allow delete: if false;/);
    expect(rules).toMatch(/match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/);
  });

  it("firebase.json aponta para o arquivo de regras", () => {
    expect(JSON.parse(ler("firebase.json")).firestore.rules).toBe("firestore.rules");
  });
});
