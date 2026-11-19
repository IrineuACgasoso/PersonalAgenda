import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { DialogosProvider } from "./components/ui/Dialogos.jsx";
import "./styles/app.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* Diálogos próprios + toast (#17/#18): disponíveis para todo o app via useDialogos(). */}
    <DialogosProvider>
      <App />
    </DialogosProvider>
  </React.StrictMode>,
);
