// src/hooks/useNavegacaoEnter.js
import { useEffect } from "react";

const SELETOR_FOCAVEL =
  'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function elementosFocaveis(container) {
  return Array.from(container.querySelectorAll(SELETOR_FOCAVEL)).filter(
    (el) => el.offsetParent !== null // visível na tela
  );
}

/**
 * Permite preencher e navegar por um formulário/painel inteiro usando apenas
 * a tecla "Enter": ao pressionar Enter em qualquer campo/botão/opção dentro
 * do elemento apontado por `ref`, o foco avança para o próximo item focável
 * (ciclando de volta ao primeiro ao chegar no fim). Se o item atual for um
 * botão (ex: "Salvar", chips de opção, item de urgência, aba, etc.), o clique
 * dele é disparado antes de avançar — assim dá pra selecionar opções e até
 * salvar sem precisar do mouse.
 *
 * O contorno visual do item focado é feito via CSS (:focus-visible),
 * ver `.input:focus-visible`, `button:focus-visible` etc. em base.css.
 */
export function useNavegacaoEnter(ref) {
  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    function aoTeclar(e) {
      if (e.key !== "Enter") return;

      const alvo = e.target;
      // Enter em textarea deve continuar quebrando linha normalmente.
      if (alvo.tagName === "TEXTAREA") return;
      // Selects abertos (nativos) já usam Enter pra confirmar a opção destacada;
      // deixa o comportamento padrão do navegador cuidar disso.
      if (alvo.tagName === "SELECT") return;

      e.preventDefault();

      const focaveis = elementosFocaveis(container);
      const indiceAtual = focaveis.indexOf(alvo);
      const eraBotao = alvo.tagName === "BUTTON" || alvo.getAttribute("role") === "button";

      if (eraBotao) alvo.click();

      // Espera o React processar o clique/estado (ex: fechar edição, limpar
      // formulário, trocar de aba) antes de recalcular os itens focáveis.
      setTimeout(() => {
        const c = ref.current;
        if (!c) return;
        const atualizados = elementosFocaveis(c);
        if (atualizados.length === 0) return;

        if (indiceAtual === -1) {
          atualizados[0].focus();
          return;
        }

        if (indiceAtual >= focaveis.length - 1) {
          // Estava no último item (geralmente "Salvar"): volta pro começo.
          atualizados[0].focus();
          return;
        }

        const proximo = focaveis[indiceAtual + 1];
        if (proximo && document.body.contains(proximo)) {
          proximo.focus();
        } else {
          const alvoIndice = Math.min(indiceAtual + 1, atualizados.length - 1);
          atualizados[alvoIndice].focus();
        }
      }, 0);
    }

    container.addEventListener("keydown", aoTeclar);
    return () => container.removeEventListener("keydown", aoTeclar);
  }, [ref]);
}