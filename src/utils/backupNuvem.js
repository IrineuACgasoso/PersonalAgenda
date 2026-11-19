// src/utils/backupNuvem.js
// Decisões puras do backup automático na nuvem (hooks/useCloudBackup.js),
// separadas do hook para serem testáveis sem Firebase/React.
//
// #8: antes, o "último backup" vivia só num useRef que zerava a cada
// abertura do app → todo reload criava um snapshot novo e girava o
// histórico de 10 em poucas horas. Offline era pior: o setDoc do backup só
// resolve com o servidor, a marca nunca era atualizada e CADA edição
// enfileirava mais um snapshot completo; ao reconectar subiam todos juntos
// e a rotação apagava os backups bons.
import { pareceVazio } from "./sanitizarDados.js";

export const INTERVALO_BACKUP_MS = 3 * 60 * 60 * 1000;
export const INTERVALO_CHECAGEM_BACKUP_MS = 15 * 60 * 1000;
export const MAX_BACKUPS = 10;

/**
 * Decide se é hora de gravar um snapshot.
 *
 * @param {object} p
 * @param {number} p.agora           Date.now()
 * @param {number|null} p.ultimoBackup timestamp do backup mais recente NA NUVEM
 *                                   (0 = não existe nenhum; null = ainda não se sabe)
 * @param {boolean} p.online         navigator.onLine
 * @param {object|null} p.dados      AppData atual
 * @returns {{ fazer: boolean, motivo: string|null }}
 *   motivo: null | "offline" | "sem-dados" | "dados-vazios" | "ultimo-desconhecido" | "recente"
 */
export function deveFazerBackup({ agora, ultimoBackup, online, dados }) {
  // Offline o setDoc fica pendurado até a rede voltar; não adianta enfileirar.
  if (!online) return { fazer: false, motivo: "offline" };
  if (!dados || !Array.isArray(dados.periodos) || dados.periodos.length === 0) {
    return { fazer: false, motivo: "sem-dados" };
  }
  // Um estado "vazio" (bug, conta recém-criada) nunca entra na rotação:
  // 10 snapshots vazios empurrariam para fora os backups com conteúdo real.
  if (pareceVazio(dados)) return { fazer: false, motivo: "dados-vazios" };
  // Sem saber quando foi o último backup na nuvem, não arrisca duplicar.
  if (ultimoBackup == null) return { fazer: false, motivo: "ultimo-desconhecido" };
  if (agora - ultimoBackup < INTERVALO_BACKUP_MS) return { fazer: false, motivo: "recente" };
  return { fazer: true, motivo: null };
}

/**
 * Ids dos backups que saem na rotação: tudo além dos `max` mais recentes.
 * Ordena aqui (por timestamp desc) em vez de confiar na ordem recebida.
 * @param {{ id: string, timestamp: number }[]} backups
 * @returns {string[]}
 */
export function backupsParaApagar(backups, max = MAX_BACKUPS) {
  return [...backups]
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(max)
    .map((b) => b.id);
}
