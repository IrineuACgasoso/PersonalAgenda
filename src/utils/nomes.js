// src/utils/nomes.js
// Campo de nome dos drawers (PainelCadeira / PainelRotina). Função pura.

/**
 * Ao sair do campo: `salvar` é o nome a gravar (ou null = nada muda) e
 * `exibir` é o que o campo deve mostrar. #48: nome apagado não grava (certo),
 * mas o campo ficava vazio na tela; agora volta ao nome atual.
 */
export function nomeAoSair(digitado, atual) {
  const v = String(digitado ?? "").trim();
  if (!v) return { salvar: null, exibir: atual };
  return { salvar: v !== atual ? v : null, exibir: v };
}
