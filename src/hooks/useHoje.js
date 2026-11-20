// src/hooks/useHoje.js
//
// "Hoje" (YYYY-MM-DD local) que se atualiza sozinho (#49): antes, cada tela
// calculava `toISO(new Date())` no render e, com o app aberto depois da
// meia-noite, o "hoje" ficava congelado até outro re-render. Aqui um timer
// dispara na virada do dia e, como timers dormem com o celular bloqueado,
// a data também é conferida ao voltar para o app (visibilitychange/focus).
import { useEffect, useState } from "react";
import { toISO } from "../utils/afazeres.js";

// ms até a próxima meia-noite local (+1 s de folga para não cair em 23:59:59).
function msAteAmanha() {
  const agora = new Date();
  const amanha = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
  return amanha - agora + 1000;
}

export function useHoje() {
  const [hojeISO, setHojeISO] = useState(() => toISO(new Date()));

  useEffect(() => {
    let timer;
    // setState com o mesmo valor não re-renderiza: conferir à toa é barato.
    const conferir = () => setHojeISO(toISO(new Date()));
    const agendar = () => {
      timer = setTimeout(() => {
        conferir();
        agendar();
      }, msAteAmanha());
    };
    const aoVoltar = () => {
      if (document.visibilityState === "visible") conferir();
    };
    agendar();
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", conferir);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", conferir);
    };
  }, []);

  return hojeISO;
}
