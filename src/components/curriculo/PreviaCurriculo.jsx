// src/components/curriculo/PreviaCurriculo.jsx
// Prévia do currículo: desenha em SVG as mesmas páginas que viram o PDF
// (utils/curriculoLayout.js), então o que aparece aqui é o arquivo baixado.
import { PAGINA } from "../../utils/curriculoLayout.js";

const cinza = (tom) =>
  `rgb(${Array(3)
    .fill(Math.round(tom * 255))
    .join(",")})`;

function Operacao({ op }) {
  if (op.tipo === "traco") {
    return <line x1={op.x} y1={op.y} x2={op.x + op.largura} y2={op.y} stroke={cinza(op.tom)} strokeWidth={0.6} />;
  }
  return (
    <text
      x={op.x}
      y={op.y}
      fontSize={op.tamanho}
      fontWeight={op.fonte === "negrito" ? 700 : 400}
      fontStyle={op.fonte === "italico" ? "italic" : "normal"}
      fill={cinza(op.tom)}
      // Largura do PDF: sem Helvetica/Arial no aparelho (Android) o texto
      // ficaria mais largo ou mais estreito que no arquivo.
      textLength={op.largura || undefined}
      lengthAdjust="spacingAndGlyphs"
      xmlSpace="preserve"
    >
      {op.texto}
    </text>
  );
}

export default function PreviaCurriculo({ paginas }) {
  return (
    <div className="curriculo-paginas">
      {paginas.map((ops, i) => (
        <svg
          key={i}
          className="curriculo-pagina"
          viewBox={`0 0 ${PAGINA.largura} ${PAGINA.altura}`}
          role="img"
          aria-label={`Prévia do currículo, página ${i + 1} de ${paginas.length}`}
        >
          {ops.length === 0 && (
            <text x={PAGINA.largura / 2} y={PAGINA.altura / 2} fontSize={16} fill={cinza(0.45)} textAnchor="middle">
              O currículo aparece aqui conforme você preenche.
            </text>
          )}
          {ops.map((op, j) => (
            <Operacao key={j} op={op} />
          ))}
        </svg>
      ))}
    </div>
  );
}
