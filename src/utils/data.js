import { uid } from "./id.js";

/**
 * Formato dos dados do app:
 * {
 *   periodos: [{ id, nome }],
 *   periodoAtivoId: string,
 *   cadeiras: [{
 *     id, periodoId, nome, cor,
 *     horarios: [{ id, dia, inicio, fim, local }],
 *     links:    [{ id, titulo, url }],
 *     datas:    [{ id, titulo, data, hora }],
 *   }],
 *   compromissos: [{
 *     id, nome, cor,
 *     horarios: [{ id, dia, inicio, fim, local }],
 *   }],
 *   afazeres: [{
 *     id, nome, data (opcional, "YYYY-MM-DD"), hora (opcional, "HH:MM"),
 *     rotina: { tipo: "nenhuma"|"diaria"|"semanal"|"quinzenal"|"mensal"|"personalizada", intervaloDias },
 *     urgencia: 1 | 2 | 3,
 *     feito: boolean,
 *     cor,
 *   }],
 * }
 */
export function dadosVazios() {
  const id = uid();
  return {
    periodos: [{ id, nome: "2026.1" }],
    periodoAtivoId: id,
    cadeiras: [],
    compromissos: [],
    afazeres: [],
  };
}