// src/hooks/useCopiarTexto.js
// Copiar para a área de transferência com o "Copiado!" por 2 s (código do
// Classroom no drawer e na tela da cadeira).
// #28: a área de transferência pode não existir (http sem TLS, navegador
// antigo) ou recusar (permissão, página sem foco). Nesse caso o texto é
// mostrado num aviso para copiar à mão — nunca um "Copiado!" falso.
import { useEffect, useRef, useState } from "react";
import useDialogos from "./useDialogos";

export default function useCopiarTexto() {
  const { avisar } = useDialogos();
  const [copiadoId, setCopiadoId] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copiar = async (id, texto) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("sem clipboard");
      await navigator.clipboard.writeText(texto);
    } catch {
      avisar(`Não deu para copiar automaticamente. Código: ${texto}`, { titulo: "Copie o código" });
      return;
    }
    setCopiadoId(id);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopiadoId(null), 2000);
  };

  return { copiar, copiadoId };
}
