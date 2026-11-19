// src/hooks/useDialogos.js
// Acesso aos diálogos próprios (#17), no lugar de window.alert/confirm/prompt
// — que no PWA instalado (principalmente iOS) aparecem com o endereço do site,
// travam a página inteira e às vezes nem aparecem.
//
// Uso:
//   const { avisar, confirmar } = useDialogos();
//   if (!(await confirmar("Excluir?", { perigo: true }))) return;
//   avisar("Preencha o título.");
//
// O provider fica em components/ui/Dialogos.jsx (envolve o <App/> no main.jsx).
import { createContext, useContext } from "react";

export const DialogosContexto = createContext(null);

export default function useDialogos() {
  const ctx = useContext(DialogosContexto);
  if (!ctx) throw new Error("useDialogos() precisa estar dentro de <DialogosProvider>.");
  return ctx;
}
