// src/components/telaCadeira/AbaGeral.jsx
// Aba "Geral" da tela da cadeira: mini agenda da semana (só as aulas desta
// cadeira, pequena e centralizada — é só para ver onde as aulas caem) e os
// números: carga horária, faltas e média parcial.
import { Award, Clock, UserX } from "lucide-react";
import { DIAS, DIAS_FULL } from "../../constants.js";
import { faixaDeHoras, percentualNaGrade } from "../../utils/agendaSemanal.js";
import { aulasQueAindaPodeFaltar, resumoFaltas } from "../../utils/frequencia.js";
import { formatarNota, situacaoDasNotas, textoNecessaria, MEDIA_APROVACAO } from "../../utils/notas.js";

const numero = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

// Sábado/domingo só aparecem se tiverem aula (a grade fica mais larga por dia).
function diasVisiveis(horarios) {
  const usados = new Set(horarios.map((h) => h.dia));
  return DIAS.map((_, i) => i).filter((i) => i < 5 || usados.has(i));
}

function MiniAgenda({ horarios, cor }) {
  const validos = horarios.filter((h) => h && Number.isInteger(h.dia) && h.inicio && h.fim);
  if (validos.length === 0) {
    return <p className="tc-vazio">Sem horários cadastrados.</p>;
  }
  const faixa = faixaDeHoras(validos);
  const horas = faixa.fim - faixa.inicio;
  const dias = diasVisiveis(validos);
  return (
    <div className="tc-mini-agenda" style={{ "--dias": dias.length, "--horas": horas }} aria-label="Aulas na semana">
      <div className="tc-mini-cabecalho">
        <span />
        {dias.map((d) => (
          <span key={d}>{DIAS[d]}</span>
        ))}
      </div>
      <div className="tc-mini-corpo">
        <div className="tc-mini-horas">
          {Array.from({ length: horas }, (_, i) => (
            <span key={i}>{faixa.inicio + i}h</span>
          ))}
        </div>
        {dias.map((d) => (
          <div key={d} className="tc-mini-coluna">
            {validos
              .filter((h) => h.dia === d)
              .map((h) => {
                const topo = percentualNaGrade(h.inicio, faixa.inicio, faixa.fim);
                const base = percentualNaGrade(h.fim, faixa.inicio, faixa.fim);
                return (
                  <div
                    key={h.id || h.inicio}
                    className="tc-mini-bloco"
                    style={{ top: `${topo}%`, height: `${Math.max(base - topo, 5)}%`, borderColor: cor }}
                    title={`${DIAS_FULL[d]} · ${h.inicio}–${h.fim}${h.local ? ` · ${h.local}` : ""}`}
                  >
                    <span>{h.inicio}</span>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Cartao({ icone: Icone, rotulo, valor, tom = "", children }) {
  return (
    <div className={`tc-cartao${tom ? ` tom-${tom}` : ""}`}>
      <div className="tc-cartao-rotulo">
        <Icone size={13} /> {rotulo}
      </div>
      <div className="tc-cartao-valor">{valor}</div>
      {children && <div className="tc-cartao-detalhe">{children}</div>}
    </div>
  );
}

function textoMedia(s) {
  switch (s.estado) {
    case "andamento":
      return {
        rotulo: "Média parcial",
        valor: s.parcial === null ? "–" : formatarNota(s.parcial),
        detalhe:
          s.paraPassar === 0
            ? "Aprovação já garantida"
            : `Falta${s.pendentes > 1 ? "m" : ""} ${s.pendentes} nota${s.pendentes > 1 ? "s" : ""} · para passar (≥ ${MEDIA_APROVACAO}): ${textoNecessaria(s.paraPassar)}`,
        tom: s.paraPassar === 0 ? "bom" : s.paraPassar === Infinity ? "ruim" : "",
      };
    case "aprovado":
      return { valor: formatarNota(s.mediaFinal ?? s.media), detalhe: "Aprovado", tom: "bom" };
    case "final":
      return {
        valor: formatarNota(s.media),
        detalhe: `Vai para a final: precisa de ${formatarNota(s.precisaNaFinal)}`,
        tom: "atencao",
      };
    case "reprovado":
      return { valor: formatarNota(s.mediaFinal ?? s.media), detalhe: "Reprovado", tom: "ruim" };
    default:
      return { rotulo: "Média parcial", valor: "–", detalhe: "Nenhuma nota cadastrada", tom: "" };
  }
}

export default function AbaGeral({ cadeira, eventosExcluidos, cor }) {
  const faltas = resumoFaltas(cadeira, eventosExcluidos);
  const podeFaltar = aulasQueAindaPodeFaltar(cadeira, faltas);
  const media = textoMedia(situacaoDasNotas(cadeira.notas, cadeira.notaFinal));
  const tomFaltas = { atencao: "atencao", perigo: "ruim", estourou: "ruim" }[faltas.nivel] || "";
  const usado = faltas.proporcao === null ? null : Math.round(faltas.proporcao * 100);

  return (
    <div className="tc-geral">
      <MiniAgenda horarios={cadeira.horarios} cor={cor} />

      <div className="tc-cartoes">
        <Cartao
          icone={Clock}
          rotulo="Carga horária"
          valor={faltas.carga ? `${faltas.cargaEstimada ? "≈ " : ""}${numero(faltas.carga)}h` : "–"}
        >
          {faltas.carga
            ? faltas.cargaEstimada
              ? "Estimada pelos horários × vigência"
              : `Limite de faltas: ${numero(faltas.limiteHoras)}h (25%)`
            : "Informe no lápis (editar)"}
        </Cartao>

        <Cartao
          icone={UserX}
          rotulo="Faltas"
          tom={tomFaltas}
          valor={`${faltas.quantidade} falta${faltas.quantidade !== 1 ? "s" : ""}`}
        >
          {usado === null ? (
            faltas.quantidade > 0 ? (
              `${numero(faltas.horas)}h perdidas`
            ) : (
              "Sem carga horária para calcular o limite"
            )
          ) : (
            <>
              <span
                className="tc-barra"
                role="progressbar"
                aria-label="Limite de faltas usado"
                aria-valuenow={usado}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${Math.min(100, usado)}%` }} />
              </span>
              <span>
                {usado}% do limite usado ({numero(faltas.horas)}h de {numero(faltas.limiteHoras)}h)
              </span>
              <span>
                {faltas.nivel === "estourou"
                  ? "Passou do limite de faltas!"
                  : podeFaltar === null
                    ? `Pode faltar mais ${numero(faltas.limiteHoras - faltas.horas)}h`
                    : `Pode faltar mais ${podeFaltar} aula${podeFaltar !== 1 ? "s" : ""}`}
              </span>
            </>
          )}
        </Cartao>

        <Cartao icone={Award} rotulo={media.rotulo || "Média"} valor={media.valor} tom={media.tom}>
          {media.detalhe}
        </Cartao>
      </div>
    </div>
  );
}
