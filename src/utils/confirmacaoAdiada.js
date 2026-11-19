// src/utils/confirmacaoAdiada.js
// Lógica pura (sem React) do "grava só quando o usuário parar" (#41).

/**
 * Agrupa uma sequência rápida de valores (ex: arrastar na roda de cores do
 * `<input type="color">`, que dispara `input` a cada pixel) numa única
 * confirmação. No drawer, cada confirmação vira um persist() → um setDoc do
 * documento inteiro; sem isso eram dezenas de gravações por segundo
 * (cota gratuita: 20 mil/dia).
 *
 *  - `mudar(v)`: guarda `v` e (re)agenda a confirmação para daqui a `esperaMs`.
 *  - `confirmar()`: confirma o pendente AGORA (evento `change` nativo, blur,
 *    desmontar o componente). Sem pendente, não faz nada.
 *  - `cancelar()`: descarta o pendente sem confirmar.
 *  - `sincronizar(v)`: avisa o valor que veio de fora (prop `valor`), para
 *    não confirmar de novo algo que já está gravado.
 *
 * Nunca confirma duas vezes seguidas o mesmo valor.
 */
export function criarConfirmacaoAdiada(aoConfirmar, esperaMs = 400, timers = globalThis) {
  let pendente;
  let temPendente = false;
  let ultimoConfirmado;
  let timer = null;

  const limparTimer = () => {
    if (timer !== null) timers.clearTimeout(timer);
    timer = null;
  };

  const confirmar = () => {
    limparTimer();
    if (!temPendente) return;
    temPendente = false;
    if (pendente === ultimoConfirmado) return;
    ultimoConfirmado = pendente;
    aoConfirmar(pendente);
  };

  return {
    mudar(v) {
      pendente = v;
      temPendente = true;
      limparTimer();
      timer = timers.setTimeout(confirmar, esperaMs);
    },
    confirmar,
    cancelar() {
      limparTimer();
      temPendente = false;
    },
    sincronizar(v) {
      ultimoConfirmado = v;
    },
  };
}
