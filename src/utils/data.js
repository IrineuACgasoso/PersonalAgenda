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
 * }
 */
export function dadosVazios() {
  const id = uid();
  return {
    periodos: [{ id, nome: "2026.1" }],
    periodoAtivoId: id,
    cadeiras: [],
  };
}