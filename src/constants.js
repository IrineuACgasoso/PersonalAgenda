export const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const DIAS_FULL = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
export const CORES = [
  "#0011ff", "#00acfc", "#00ff4c", "#0c3d00", "#10b981",
  "#14b8a6", "#221e1e", "#3b82f6", "#4700cc", "#6366f1",
  "#666666", "#81792c", "#8b5cf6", "#ec4899", "#eb1111",
  "#ebfc00", "#ef4444", "#f59e0b", "#ff00ea", "#ff8800",
  "#ffffff",
];
export const HORA_INICIO = 6; // grade das 6h às 23h
export const HORA_FIM = 23;
export const STORAGE_KEY = "painel-academico-data";
export const SIDEBAR_STATE_KEY = "painel-academico-sidebar";

export const ROTINA_OPCOES = [
  { valor: "nenhuma", label: "Não é rotineiro" },
  { valor: "diaria", label: "Diariamente" },
  { valor: "semanal", label: "Semanalmente" },
  { valor: "quinzenal", label: "A cada 15 dias" },
  { valor: "mensal", label: "Mensalmente" },
  { valor: "personalizada", label: "Intervalo personalizado" },
];

export const URGENCIA_CORES = {
  1: "#f5a623",
  2: "#f2632a",
  3: "#ef1f1f",
};

export const URGENCIA_LABELS = {
  1: "Baixa",
  2: "Média",
  3: "Alta",
};