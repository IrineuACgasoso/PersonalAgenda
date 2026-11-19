// src/utils/carregamento.js
// Decisões puras da tela inicial (App.jsx), separadas para serem testáveis.
//
// #7: antes, logado + sem cache local + sem rede deixava `data = null` com
// status "error", e o watchdog do App recarregava a página a cada 12s PARA
// SEMPRE (o reload caía no mesmo erro). Agora:
//  - erro de carga conhecido → tela de erro com "Tentar de novo" (nova
//    tentativa sem reload, também automática quando a rede volta);
//  - carga travada sem resposta → o watchdog recarrega no máximo UMA vez por
//    sessão do navegador; na segunda vez mostra a tela de erro.

// Se a tela de carregamento ficar parada por mais tempo que isso, algo no
// boot (rede, auth) não vai se resolver sozinho.
export const TEMPO_LIMITE_CARREGAMENTO_MS = 12000;

// Na tela de erro, tenta carregar de novo sozinho a cada X ms (além do
// evento `online`, que nem sempre dispara quando a rede "volta de verdade").
export const INTERVALO_NOVA_TENTATIVA_MS = 30000;

// sessionStorage: marca que o watchdog já recarregou nesta sessão.
export const CHAVE_WATCHDOG_RECARREGOU = "painel-watchdog-recarregou";

/**
 * Qual tela mostrar enquanto os dados não estão prontos.
 * @returns {"app" | "erro" | "travado" | "carregando"}
 */
export function telaInicial({ temDados, erroCarga, travou }) {
  if (temDados) return "app";
  if (erroCarga) return "erro";
  if (travou) return "travado";
  return "carregando";
}

/**
 * O que o watchdog faz quando a carga estoura o tempo limite.
 * @returns {"recarregar" | "mostrar-erro"}
 */
export function acaoDoWatchdog(jaRecarregouNestaSessao) {
  return jaRecarregouNestaSessao ? "mostrar-erro" : "recarregar";
}
