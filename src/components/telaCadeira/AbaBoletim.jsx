// src/components/telaCadeira/AbaBoletim.jsx
// Aba "Avaliações e Notas": boletim. Uma caixa por grupo (lado a lado, com
// rolagem lateral): cada avaliação com o % que vale no grupo (inteiro), a
// nota tirada e, na cor da cadeira, quanto ela somou no grupo; pontos
// extras no fim de cada caixa. Por último, a caixa da nota final com a
// situação — em verde/âmbar/vermelho com faixa, ícone e texto, para não se
// confundir com a cor da cadeira quando ela for verde, amarela ou vermelha.
// Cálculos em utils/notas.js (boletimDasNotas, situacaoDasNotas).
import { CheckCircle2, Hourglass, XCircle } from "lucide-react";
import {
  MEDIA_APOS_FINAL,
  MEDIA_APROVACAO,
  MEDIA_MINIMA_FINAL,
  boletimDasNotas,
  formatarNota,
  situacaoDasNotas,
  textoNecessaria,
  tomDaSituacao,
} from "../../utils/notas.js";

const comSinal = (n) => `+${formatarNota(n)}`;

function Linha({ linha, titulo, meta }) {
  const classes = [
    "tc-bol-linha",
    `nivel-${linha.nivel}`,
    linha.grupo ? "subgrupo" : "",
    linha.bonus ? "extra" : "",
    linha.pendente ? "pendente" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes}>
      <span className="tc-bol-titulo">
        {titulo}
        {linha.bonus && <em> (Ponto Extra)</em>}
        {linha.pendente && !linha.grupo && meta && <small className="tc-bol-meta">{meta}</small>}
      </span>
      <span className="tc-bol-pct">{linha.bonus ? "" : `${linha.percentual}%`}</span>
      <span className="tc-bol-nota">{linha.bonus ? "" : formatarNota(linha.nota)}</span>
      <span className="tc-bol-contrib">
        {linha.contribuicao === null
          ? "–"
          : linha.bonus
            ? comSinal(linha.contribuicao)
            : formatarNota(linha.contribuicao)}
      </span>
    </div>
  );
}

function CaixaFinal({ s, tom }) {
  const Icone = { aprovado: CheckCircle2, andamento: Hourglass, reprovado: XCircle }[tom] || Hourglass;
  let rotulo;
  let media;
  let rotuloMedia = "Média";
  const detalhes = [];
  if (s.estado === "andamento") {
    rotulo = s.paraPassar === 0 ? "Aprovação garantida" : "Em andamento";
    rotuloMedia = "Média parcial";
    media = s.parcial;
    detalhes.push(`Falta${s.pendentes > 1 ? "m" : ""} ${s.pendentes} nota${s.pendentes > 1 ? "s" : ""}.`);
    if (s.paraPassar !== 0) {
      detalhes.push(`Para passar direto (≥ ${MEDIA_APROVACAO}): ${textoNecessaria(s.paraPassar)}.`);
      detalhes.push(`Para ao menos ir à final (≥ ${MEDIA_MINIMA_FINAL}): ${textoNecessaria(s.paraFinal)}.`);
    } else {
      detalhes.push("Mesmo com 0 nas que faltam, passa direto.");
    }
    detalhes.push("Ponto extra que não saiu conta como 0.");
  } else if (s.estado === "final") {
    rotulo = "Vai para a final";
    media = s.media;
    detalhes.push(`Precisa de ${formatarNota(s.precisaNaFinal)} na final.`);
    detalhes.push(`(média + final) / 2 ≥ ${MEDIA_APOS_FINAL}. Lance a nota da final no lápis (editar).`);
  } else {
    rotulo = s.estado === "aprovado" ? "Aprovado" : "Reprovado";
    media = s.mediaFinal ?? s.media;
    if (s.final !== undefined) {
      rotuloMedia = "Média com a final";
      detalhes.push(`Média ${formatarNota(s.media)} · final ${formatarNota(s.final)}.`);
    }
  }
  return (
    <section className={`tc-bol-final tom-${tom}`} aria-label={`Situação: ${rotulo}`}>
      <div className="tc-bol-final-faixa">
        <Icone size={16} /> {rotulo}
      </div>
      <div className="tc-bol-final-media">
        <span>{rotuloMedia}</span>
        <strong>{formatarNota(media)}</strong>
      </div>
      <ul className="tc-bol-final-detalhes">
        {detalhes.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
    </section>
  );
}

export default function AbaBoletim({ cadeira }) {
  const itens = cadeira.notas || [];
  const s = situacaoDasNotas(itens, cadeira.notaFinal);
  if (s.estado === "sem-notas") {
    return <p className="tc-vazio">Nenhuma nota cadastrada. Crie as avaliações no lápis (editar).</p>;
  }
  const colunas = boletimDasNotas(itens);
  const datasPorId = Object.fromEntries((cadeira.datas || []).map((d) => [d.id, d]));
  // Nota ligada a uma data importante aparece com o título da data (como no drawer).
  const tituloDe = (l) => datasPorId[l.dataId]?.titulo || l.titulo || (l.grupo ? "Grupo sem nome" : "Sem nome");
  // Ideia do que falta: a mesma nota em cada pendente para passar direto.
  const meta =
    s.estado === "andamento" && Number.isFinite(s.paraPassar) && s.paraPassar > 0
      ? `precisa ≈ ${formatarNota(s.paraPassar)}`
      : null;

  return (
    <div className="tc-boletim">
      {colunas.map((col) => (
        <section key={col.id} className="tc-bol-col">
          <header className="tc-bol-cabecalho">
            <h4>{col.soltas ? col.titulo : col.titulo || "Grupo sem nome"}</h4>
            <span>{col.bonus ? "Ponto extra" : `${col.percentual}% da média`}</span>
          </header>
          <div className="tc-bol-linha tc-bol-legenda" aria-hidden="true">
            <span>Avaliação</span>
            <span>Vale</span>
            <span>Nota</span>
            <span>{col.soltas ? "Na média" : "No grupo"}</span>
          </div>
          {col.linhas.length === 0 && <p className="tc-vazio">Grupo vazio.</p>}
          {col.linhas.map((l) => (
            <Linha key={l.id} linha={l} titulo={tituloDe(l)} meta={meta} />
          ))}
          <footer className="tc-bol-rodape">
            {col.soltas ? (
              <>
                <span>Somam na média</span>
                <strong>{col.contribuicao === null ? "–" : formatarNota(col.contribuicao)}</strong>
              </>
            ) : (
              <>
                <span>
                  {col.bonus ? "Soma do extra" : "Nota do grupo"}
                  {col.pendente && col.valor !== null ? " (parcial)" : ""}
                </span>
                <strong>{col.bonus && col.valor !== null ? comSinal(col.valor) : formatarNota(col.valor)}</strong>
                {!col.bonus && col.contribuicao !== null && <small>→ {formatarNota(col.contribuicao)} na média</small>}
              </>
            )}
          </footer>
        </section>
      ))}
      <CaixaFinal s={s} tom={tomDaSituacao(s)} />
    </div>
  );
}
