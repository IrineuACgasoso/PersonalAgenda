// src/components/ui/TelaErroCarga.jsx
import React from "react";
import { WifiOff, RefreshCw, CloudOff } from "lucide-react";

/**
 * Tela mostrada quando a carga inicial não tem como terminar (#7) — no lugar
 * do antigo loop de reload a cada 12s.
 *
 * - `motivo="erro"`: logado, sem rede (ou servidor recusou) e sem cópia local
 *   neste aparelho. O hook já tenta de novo sozinho quando a rede volta.
 * - `motivo="travado"`: a carga não respondeu nem depois de um reload.
 *
 * "Usar sem login" sai da conta e abre os dados SÓ deste aparelho
 * (localStorage). Não toca no documento da nuvem: ao entrar de novo, o app
 * lê a nuvem e o que foi feito sem login fica só no aparelho — por isso o
 * aviso no botão.
 */
export default function TelaErroCarga({ motivo, online, tentando, onTentarDeNovo, onUsarSemLogin }) {
  const Icone = online ? CloudOff : WifiOff;
  const titulo =
    motivo === "travado"
      ? "O carregamento não respondeu"
      : online
        ? "Não foi possível acessar seus dados na nuvem"
        : "Sem conexão";
  const texto =
    motivo === "travado"
      ? "Algo travou ao abrir o painel. Tente de novo; se continuar, verifique a conexão."
      : online
        ? "O servidor não respondeu. Seus dados estão seguros na nuvem — tente de novo em instantes."
        : "Este aparelho ainda não tem uma cópia dos seus dados para abrir offline. Assim que a internet voltar, o painel carrega sozinho.";

  return (
    <div className="loading-wrap">
      <div className="tela-erro-carga" role="alert">
        <Icone size={40} strokeWidth={1.6} className="tela-erro-carga-icone" />
        <h1 className="tela-erro-carga-titulo">{titulo}</h1>
        <p className="tela-erro-carga-texto">{texto}</p>
        <div className="tela-erro-carga-acoes">
          <button className="btn-primario" onClick={onTentarDeNovo} disabled={tentando}>
            <RefreshCw size={16} className={tentando ? "girando" : undefined} />
            {tentando ? "Tentando..." : "Tentar de novo"}
          </button>
          {onUsarSemLogin && (
            <button className="btn-secundario" onClick={onUsarSemLogin}>
              Usar sem login
            </button>
          )}
        </div>
        {onUsarSemLogin && (
          <p className="tela-erro-carga-nota">
            "Usar sem login" sai da conta e abre só os dados salvos neste aparelho — o que você editar assim
            não vai para a nuvem.
          </p>
        )}
      </div>
    </div>
  );
}
