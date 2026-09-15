import { useEffect } from "react";

const CHAVE_BACKUPS_AUTO = "agenda_backups_automaticos";
// Checagem periódica só pra perceber a virada do dia com alguma frequência —
// a decisão de fato de gerar (ou não) o backup é por CALENDÁRIO (um por dia),
// não por intervalo de horas.
const INTERVALO_CHECAGEM = 30 * 60 * 1000;

/**
 * Hook que gera no máximo 1 backup físico (download .json) por dia.
 */
export function useAutoBackup(data) {
  useEffect(() => {
    // Evita gerar backup se os dados ainda estiverem nulos ou vazios
    if (!data || !Array.isArray(data.periodos) || data.periodos.length === 0) return;

    const verificarEGerarBackup = () => {
      try {
        const agora = Date.now();
        const hojeStr = new Date(agora).toDateString();
        const historicoRaw = localStorage.getItem(CHAVE_BACKUPS_AUTO);
        const historico = historicoRaw ? JSON.parse(historicoRaw) : [];

        const ultimoTimestamp = historico[0]?.timestamp || 0;
        const ultimoDiaStr = ultimoTimestamp ? new Date(ultimoTimestamp).toDateString() : null;

        // Só gera um novo backup se o último foi num dia (calendário) diferente
        // de hoje — no máximo 1 por dia, não importa quantas vezes o app seja
        // aberto/fechado ou quanto tempo fique aberto.
        if (ultimoDiaStr !== hojeStr) {
          const novoSnapshot = {
            timestamp: agora,
            dataHora: new Date(agora).toLocaleString("pt-BR"),
            payload: data,
          };

          // Guarda até 10 snapshots históricos locais (protegidos contra o Firebase)
          const novoHistorico = [novoSnapshot, ...historico].slice(0, 10);
          localStorage.setItem(CHAVE_BACKUPS_AUTO, JSON.stringify(novoHistorico));

          // 1. Download automático do arquivo .json
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          const timestampTag = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
          a.href = url;
          a.download = `backup-auto-${timestampTag}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);

          console.log(`[AutoBackup] Snapshot e download gerados às ${novoSnapshot.dataHora}`);
        }
      } catch (err) {
        console.error("[AutoBackup] Falha ao executar backup automático:", err);
      }
    };

    // Avalia assim que o app é aberto
    verificarEGerarBackup();

    // Rechecagem periódica, só pra pegar a virada do dia caso o app fique
    // aberto por muito tempo sem ser recarregado.
    const timer = setInterval(verificarEGerarBackup, INTERVALO_CHECAGEM);
    return () => clearInterval(timer);
  }, [data]);
}