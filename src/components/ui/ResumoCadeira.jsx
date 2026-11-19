// src/components/ui/ResumoCadeira.jsx
// Resumo da cadeira (#21): caixas de próxima aula e próximas avaliações, e a
// vigência com barra de progresso + %. Usado no card (VisaoCadeiras) e no
// cabeçalho do drawer (PainelCadeira). A lógica é pura, em utils/cadeiras.js.
//
// Caixa com conteúdo = preenchimento leve na cor da cadeira (destaca quem
// ainda está em andamento). Caixa sem conteúdo = tracejada cinza e compacta
// (cadeira "acabada" não ocupa espaço à toa).
import { Clock, GraduationCap, CalendarRange } from "lucide-react";
import { toISO } from "../../utils/afazeres.js";
import { textoVigencia, hexParaRgb } from "../../utils/calendario.js";
import {
  proximaAula,
  proximasAvaliacoes,
  progressoVigencia,
  textoProximaAula,
  textoQuandoAvaliacao,
} from "../../utils/cadeiras.js";

function Caixa({ icone: Icone, rotulo, vazia, children }) {
  return (
    <div className={`resumo-caixa${vazia ? " resumo-caixa-vazia" : ""}`}>
      <div className="resumo-caixa-rotulo">
        <Icone size={12} />
        <span>{rotulo}</span>
      </div>
      {children}
    </div>
  );
}

// `maxAvaliacoes`: quantas cabem sem deformar o card; o resto vira "+N".
export default function ResumoCadeira({ cadeira, eventosExcluidos = [], maxAvaliacoes = 3 }) {
  const agora = new Date();
  const hojeISO = toISO(agora);
  const aula = proximaAula(cadeira, agora, eventosExcluidos);
  const avaliacoes = proximasAvaliacoes(cadeira, hojeISO);
  const visiveis = avaliacoes.slice(0, maxAvaliacoes);
  const restantes = avaliacoes.length - visiveis.length;
  const progresso = progressoVigencia(cadeira, hojeISO);
  const vigencia = textoVigencia(cadeira);

  const semAulaTexto = cadeira.horarios.length === 0 ? "Sem horários cadastrados" : "Sem mais aulas na vigência";

  return (
    <div className="resumo-cadeira" style={{ "--cor-rgb": hexParaRgb(cadeira.cor) }}>
      <Caixa icone={Clock} rotulo="Próx. aula" vazia={!aula}>
        <span className="resumo-caixa-valor">{aula ? textoProximaAula(aula, hojeISO) : semAulaTexto}</span>
      </Caixa>

      <Caixa
        icone={GraduationCap}
        rotulo={avaliacoes.length > 1 ? "Próx. avaliações" : "Próx. avaliação"}
        vazia={avaliacoes.length === 0}
      >
        {avaliacoes.length === 0 ? (
          <span className="resumo-caixa-valor">Nenhuma marcada</span>
        ) : (
          <ul className="resumo-avaliacoes">
            {visiveis.map((item) => (
              <li
                key={item.avaliacao.id || `${item.avaliacao.data}|${item.avaliacao.titulo}`}
                className={`resumo-avaliacao${item.destaque ? " destaque" : ""}`}
                title={`${item.avaliacao.titulo} · ${textoQuandoAvaliacao(item)}`}
              >
                <span className="resumo-avaliacao-titulo">{item.avaliacao.titulo}</span>
                <span className="resumo-avaliacao-quando">{textoQuandoAvaliacao(item)}</span>
              </li>
            ))}
            {restantes > 0 && (
              <li className="resumo-avaliacoes-mais">
                +{restantes} {restantes === 1 ? "outra" : "outras"}
              </li>
            )}
          </ul>
        )}
      </Caixa>

      <div className="resumo-vigencia">
        <CalendarRange size={12} />
        {progresso !== null ? (
          <>
            <span
              className="resumo-progresso"
              role="progressbar"
              aria-label="Andamento da cadeira"
              aria-valuenow={Math.round(progresso * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${progresso * 100}%`, background: cadeira.cor }} />
            </span>
            <span className="resumo-percentual">{Math.round(progresso * 100)}%</span>
            <span className="resumo-vigencia-datas">{vigencia}</span>
          </>
        ) : (
          <span className="resumo-vigencia-datas">{vigencia || "Sem início/fim definidos"}</span>
        )}
      </div>
    </div>
  );
}
