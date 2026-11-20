export const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const DIAS_FULL = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
export const CORES = [
  "#0011ff",
  "#00acfc",
  "#00ff4c",
  "#0c3d00",
  "#10b981",
  "#14b8a6",
  "#3b82f6",
  "#4700cc",
  "#6366f1",
  "#666666",
  "#81792c",
  "#8b5cf6",
  "#ec4899",
  "#eb1111",
  "#ebfc00",
  "#ef4444",
  "#f59e0b",
  "#ff00ea",
  "#ff8800",
  "#ffffff",
];
export const HORA_INICIO = 6; // grade das 6h às 23h
export const HORA_FIM = 23;
export const STORAGE_KEY = "painel-academico-data";
export const SIDEBAR_STATE_KEY = "painel-academico-sidebar";
export const ULTIMA_SINCRONIZACAO_KEY = "painel-academico-ultima-sincronizacao";
// Registro deste aparelho para os lembretes (#23): { id, ativo, token }.
export const DISPOSITIVO_PUSH_KEY = "painel-academico-dispositivo-push";
// Zoom da Agenda da semana (#24): preferência de exibição deste aparelho.
export const ZOOM_AGENDA_KEY = "painel-academico-zoom-agenda";

export const ROTINA_OPCOES = [
  { valor: "nenhuma", label: "Não é rotineiro" },
  { valor: "diaria", label: "Diariamente" },
  { valor: "semanal", label: "Semanalmente" },
  { valor: "quinzenal", label: "A cada 15 dias" },
  { valor: "mensal", label: "Mensalmente" },
  { valor: "dias_especificos", label: "Dias específicos" },
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
