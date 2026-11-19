// src/utils/aparelho.js
// Decisões PURAS sobre as notificações deste aparelho (#23), separadas de
// src/notificacoes.js (que fala com o navegador/Firebase) para testar.

// Estado mostrado no modal de lembretes:
//   "sem-login"     lembretes vêm do servidor ⇒ precisa estar logado
//   "ios-instalar"  iPhone/iPad no navegador: só recebe push com o app instalado (iOS 16.4+)
//   "sem-suporte"   navegador sem Notification/ServiceWorker/Push
//   "bloqueado"     o usuário negou a permissão (só volta nas configurações do navegador)
//   "ativo"         este aparelho está registrado e com permissão
//   "inativo"       pode ativar
export function estadoDoAparelho({
  logado,
  ios,
  standalone,
  temNotification,
  temServiceWorker,
  temPush,
  permissao,
  ativo,
}) {
  if (!logado) return "sem-login";
  if (ios && !standalone) return "ios-instalar";
  if (!temNotification || !temServiceWorker || !temPush) return "sem-suporte";
  if (permissao === "denied") return "bloqueado";
  if (ativo && permissao === "granted") return "ativo";
  return "inativo";
}

// Nome curto do aparelho, para identificar o registro no Firestore.
export function descreverAparelho(userAgent = "") {
  const ua = String(userAgent);
  const sistema = /iphone|ipad|ipod/i.test(ua)
    ? "iOS"
    : /android/i.test(ua)
      ? "Android"
      : /windows/i.test(ua)
        ? "Windows"
        : /mac os/i.test(ua)
          ? "macOS"
          : /linux/i.test(ua)
            ? "Linux"
            : "Outro";
  const navegador = /edg\//i.test(ua)
    ? "Edge"
    : /firefox|fxios/i.test(ua)
      ? "Firefox"
      : /chrome|crios/i.test(ua)
        ? "Chrome"
        : /safari/i.test(ua)
          ? "Safari"
          : "Navegador";
  return `${navegador} · ${sistema}`;
}
