import { useEffect } from "react";

const CHAVE_BACKUPS_AUTO = "agenda_backups_automaticos";
const INTERVALO_3_HORAS = 6 * 60 * 60 * 1000;

/**
 * Hook que verifica e executa o backup a cada 3 horas.
 * Salva snapshots locais isolados e realiza o download do arquivo .json.
 */
export function useAutoBackup(data) {
  useEffect(() => {
    // Evita gerar backup se os dados ainda estiverem nulos ou vazios
    if (!data || !Array.isArray(data.periodos) || data.periodos.length === 0) return;

    const verificarEGerarBackup = () => {
      try {
        const agora = Date.now();
        const historicoRaw = localStorage.getItem(CHAVE_BACKUPS_AUTO);
        const historico = historicoRaw ? JSON.parse(historicoRaw) : [];

        const ultimoTimestamp = historico[0]?.timestamp || 0;

        // Se já passaram 3 horas desde o último backup
        if (agora - ultimoTimestamp >= INTERVALO_3_HORAS) {
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

    // Checa a cada 1h se a janela de 6 horas foi atingida
    const timer = setInterval(verificarEGerarBackup, 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, [data]);
}