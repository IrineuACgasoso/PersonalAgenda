// src/components/certificados/SeletorTags.jsx
// Dropdown de múltipla escolha com as tags já criadas (formulário do
// certificado). Abre empurrando o conteúdo, e não flutuando: o modal rola por
// dentro e cortaria um popover.
import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import useFecharAoClicarFora from "../../hooks/useFecharAoClicarFora";

export default function SeletorTags({ tags, valor, onMudar }) {
  const [aberto, setAberto] = useState(false);
  const caixaRef = useRef(null);
  useFecharAoClicarFora(caixaRef, aberto, () => setAberto(false), { noClique: true });

  const escolhidas = tags.filter((t) => valor.includes(t.id));
  const alternar = (id) => onMudar(valor.includes(id) ? valor.filter((t) => t !== id) : [...valor, id]);

  return (
    <div className={`seletor-tags${aberto ? " aberto" : ""}`} ref={caixaRef}>
      <button
        type="button"
        className="input seletor-tags-botao"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-label="Escolher tags"
      >
        <span className="seletor-tags-valor">
          {escolhidas.length === 0 ? (
            <span className="seletor-tags-vazio">Escolher tags (opcional)</span>
          ) : (
            escolhidas.map((t) => (
              <span key={t.id} className="chip-meta">
                {t.nome}
              </span>
            ))
          )}
        </span>
        <ChevronDown size={15} className="seletor-tags-seta" />
      </button>
      {aberto &&
        (tags.length === 0 ? (
          <p className="subtle filtro-tags-vazio">Nenhuma tag criada. Crie no filtro, ao lado da busca.</p>
        ) : (
          <ul className="lista-tags">
            {tags.map((t) => (
              <li key={t.id} className="lista-tags-item">
                <label className="lista-tags-opcao">
                  <input type="checkbox" checked={valor.includes(t.id)} onChange={() => alternar(t.id)} />
                  <span>{t.nome}</span>
                </label>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
