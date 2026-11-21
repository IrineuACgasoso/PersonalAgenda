// src/hooks/useMediaQuery.js
// true enquanto a media query casa; acompanha giro da tela/redimensionamento.
import { useEffect, useState } from "react";

function casa(consulta) {
  try {
    return window.matchMedia(consulta).matches;
  } catch {
    return false;
  }
}

export default function useMediaQuery(consulta) {
  const [ativa, setAtiva] = useState(() => casa(consulta));

  useEffect(() => {
    let mql;
    try {
      mql = window.matchMedia(consulta);
    } catch {
      return undefined;
    }
    const atualizar = () => setAtiva(mql.matches);
    atualizar();
    mql.addEventListener("change", atualizar);
    return () => mql.removeEventListener("change", atualizar);
  }, [consulta]);

  return ativa;
}
