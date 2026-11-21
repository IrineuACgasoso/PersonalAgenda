// src/utils/acessibilidade.js
// #51: cards e células clicáveis são <div> (têm botões dentro, e <button>
// não pode conter outro botão). Estas props os tornam botões para teclado e
// leitor de tela: role, entram no Tab e Enter/Espaço disparam a ação.

/** Props de um <div> que age como botão. `acao` recebe o evento. */
export function propsDeBotao(acao, extras = {}) {
  return {
    role: "button",
    tabIndex: 0,
    ...extras,
    onClick: acao,
    onKeyDown: (e) => {
      // Só o próprio elemento: Enter num botão de dentro (lixeira) é dele.
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault(); // Espaço rolaria a página
        acao(e);
      }
    },
  };
}
