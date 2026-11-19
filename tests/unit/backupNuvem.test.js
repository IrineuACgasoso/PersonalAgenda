// Backup automático na nuvem (src/utils/backupNuvem.js) — #8: snapshot a
// cada abertura do app e, offline, um snapshot enfileirado por edição.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { deveFazerBackup, backupsParaApagar, INTERVALO_BACKUP_MS, MAX_BACKUPS } from "../../src/utils/backupNuvem.js";
import { sanitizarDados, DADOS_PADRAO } from "../../src/utils/sanitizarDados.js";
import { appData, cadeira } from "../fixtures/fabricas.js";

const AGORA = Date.now();
const dados = sanitizarDados(appData({ cadeiras: [cadeira()] }));
const base = { agora: AGORA, ultimoBackup: 0, online: true, dados };

describe("deveFazerBackup", () => {
  it("nenhum backup na nuvem ainda (0) → faz", () => {
    expect(deveFazerBackup(base)).toEqual({ fazer: true, motivo: null });
  });

  it("reabrir o app pouco depois do último backup NÃO cria outro (regressão #8)", () => {
    const r = deveFazerBackup({ ...base, ultimoBackup: AGORA - 10 * 60 * 1000 });
    expect(r).toEqual({ fazer: false, motivo: "recente" });
  });

  it("passou o intervalo desde o último backup na nuvem → faz", () => {
    expect(deveFazerBackup({ ...base, ultimoBackup: AGORA - INTERVALO_BACKUP_MS }).fazer).toBe(true);
    expect(deveFazerBackup({ ...base, ultimoBackup: AGORA - INTERVALO_BACKUP_MS + 1 }).fazer).toBe(false);
  });

  it("offline não enfileira snapshot (regressão #8)", () => {
    expect(deveFazerBackup({ ...base, online: false })).toEqual({ fazer: false, motivo: "offline" });
  });

  it("sem saber o último backup (leitura do servidor falhou) não arrisca duplicar", () => {
    expect(deveFazerBackup({ ...base, ultimoBackup: null }).motivo).toBe("ultimo-desconhecido");
  });

  it("sem dados ou sem períodos não faz", () => {
    expect(deveFazerBackup({ ...base, dados: null }).motivo).toBe("sem-dados");
    expect(deveFazerBackup({ ...base, dados: { ...dados, periodos: [] } }).motivo).toBe("sem-dados");
  });

  it("estado vazio (padrão) não entra na rotação — não empurra backups bons para fora", () => {
    expect(deveFazerBackup({ ...base, dados: DADOS_PADRAO }).motivo).toBe("dados-vazios");
  });
});

describe("backupsParaApagar", () => {
  const bk = (n) => ({ id: String(n), timestamp: n });

  it("mantém os MAX_BACKUPS mais recentes e apaga o resto", () => {
    const lista = Array.from({ length: 13 }, (_, i) => bk(i + 1));
    expect(backupsParaApagar(lista)).toEqual(["3", "2", "1"]);
    expect(MAX_BACKUPS).toBe(10);
  });

  it("não depende da ordem recebida", () => {
    const lista = [bk(1), bk(12), bk(5), bk(11), bk(2)];
    expect(backupsParaApagar(lista, 3)).toEqual(["2", "1"]);
  });

  it("até o limite não apaga nada", () => {
    expect(backupsParaApagar([bk(1), bk(2)])).toEqual([]);
  });
});

describe("useCloudBackup (estático, #8)", () => {
  const hook = readFileSync(new URL("../../src/hooks/useCloudBackup.js", import.meta.url), "utf8");
  it("o timer não é recriado a cada mudança de data", () => {
    expect(hook).toMatch(/\}, \[user, dadosCarregados\]\);/);
  });
  it("marca 'em andamento' antes de qualquer await", () => {
    const executar = hook.slice(hook.indexOf("const executar"));
    // primeiro `await chamada(` de verdade (o comentário também cita "await")
    const primeiroAwait = executar.search(/\bawait \w+\(/);
    expect(primeiroAwait).toBeGreaterThan(0);
    expect(executar.indexOf("emAndamento = true")).toBeLessThan(primeiroAwait);
  });
});
