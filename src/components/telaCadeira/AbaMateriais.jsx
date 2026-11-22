// src/components/telaCadeira/AbaMateriais.jsx
// Aba "Materiais": código do Classroom no canto superior direito (com
// copiar; sem código o quadro fica, vazio) e os links como botões na cor
// da cadeira, só com o título — clicar abre. Com muitos links a lista vira
// 2 colunas para a tela não crescer para baixo. A ordem é a do drawer
// (arrastar para reordenar fica lá).
import { Check, Copy, ExternalLink, KeyRound } from "lucide-react";
import useCopiarTexto from "../../hooks/useCopiarTexto.js";
import { ehClassroom, hrefSeguro } from "../../utils/links.js";

// A partir daqui a coluna única passaria da altura da caixa.
const LINKS_EM_UMA_COLUNA = 6;

export default function AbaMateriais({ links = [] }) {
  const { copiar, copiadoId } = useCopiarTexto();
  const codigos = links.filter((l) => ehClassroom(l) && l.codigoClassroom);
  const web = links.filter((l) => !ehClassroom(l));

  return (
    <div className="tc-materiais">
      <div className="tc-materiais-topo">
        <h3 className="tc-subtitulo">Links e materiais</h3>
        <div className={`tc-classroom${codigos.length ? "" : " vazio"}`}>
          <span className="tc-classroom-rotulo">
            <KeyRound size={12} /> Classroom
          </span>
          {codigos.length === 0 ? (
            <span className="tc-classroom-codigo">—</span>
          ) : (
            codigos.map((l) => (
              <span key={l.id} className="tc-classroom-linha" title={l.titulo}>
                <code className="tc-classroom-codigo">{l.codigoClassroom}</code>
                <button
                  type="button"
                  className="tc-classroom-copiar"
                  onClick={() => copiar(l.id, l.codigoClassroom)}
                  aria-label={`Copiar código ${l.codigoClassroom}`}
                >
                  {copiadoId === l.id ? <Check size={13} /> : <Copy size={13} />}
                  {copiadoId === l.id ? "Copiado!" : "Copiar"}
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {web.length === 0 ? (
        <p className="tc-vazio">Nenhum link cadastrado. Adicione no lápis (editar).</p>
      ) : (
        <div className={`tc-links${web.length > LINKS_EM_UMA_COLUNA ? " duas-colunas" : ""}`}>
          {web.map((l) => {
            const href = hrefSeguro(l.url);
            return (
              <a
                key={l.id}
                className={`tc-link${href ? "" : " sem-link"}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title={href ? undefined : "Link inválido: corrija no lápis (editar)"}
              >
                <span>{l.titulo || "Sem título"}</span>
                <ExternalLink size={13} />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
