// src/components/ui/SecaoLista.jsx
// Grupo de uma lista (abas Afazeres e Compromissos, Fase 5): título com
// contagem, recolhível. `recolhivel` = começa fechado. `acao` (ex.: "Apagar
// concluídos") aparece no cabeçalho só com a seção aberta. Sem itens, some.
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function SecaoLista({ titulo, itens, acao, recolhivel = false, destaque, children }) {
  const [aberta, setAberta] = useState(!recolhivel);
  if (itens.length === 0) return null;
  return (
    <section className={`secao-lista${destaque ? ` ${destaque}` : ""}`}>
      <div className="secao-lista-cabecalho">
        <button
          type="button"
          className="secao-lista-titulo"
          onClick={() => setAberta((a) => !a)}
          aria-expanded={aberta}
        >
          <ChevronDown size={15} className={`secao-lista-seta${aberta ? "" : " fechada"}`} />
          <span>{titulo}</span>
          <span className="secao-lista-contagem">{itens.length}</span>
        </button>
        {aberta && acao}
      </div>
      {aberta && <div className="lista-itens">{children}</div>}
    </section>
  );
}
