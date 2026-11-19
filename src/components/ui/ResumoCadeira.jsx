// src/components/ui/ResumoCadeira.jsx
// Resumo da cadeira (#21): próxima aula, próxima avaliação e a vigência com
// barra de progresso. Usado no card (VisaoCadeiras) e no cabeçalho do drawer
// (PainelCadeira). A lógica é pura, em utils/cadeiras.js.
import { Clock, GraduationCap, CalendarRange } from "lucide-react";
import { toISO } from "../../utils/afazeres.js";
import { textoVigencia } from "../../utils/calendario.js";
import {
  proximaAula,
  proximaAvaliacao,
  progressoVigencia,
  textoProximaAula,
  textoProximaAvaliacao,
} from "../../utils/cadeiras.js";

export default function ResumoCadeira({ cadeira, eventosExcluidos = [] }) {
  const agora = new Date();
  const hojeISO = toISO(agora);
  const aula = proximaAula(cadeira, agora, eventosExcluidos);
  const avaliacao = proximaAvaliacao(cadeira, hojeISO);
  const progresso = progressoVigencia(cadeira, hojeISO);
  const vigencia = textoVigencia(cadeira);

  const semAulaTexto = cadeira.horarios.length === 0 ? "Sem horários cadastrados" : "Sem mais aulas na vigência";

  return (
    <div className="resumo-cadeira">
      <div className={`resumo-linha${aula ? "" : " vazio"}`}>
        <Clock size={12} />
        <span className="resumo-rotulo">Próx. aula:</span>
        <span className="resumo-valor">{aula ? textoProximaAula(aula, hojeISO) : semAulaTexto}</span>
      </div>
      <div className={`resumo-linha${avaliacao ? "" : " vazio"}`}>
        <GraduationCap size={12} />
        <span className="resumo-rotulo">Próx. avaliação:</span>
        <span className={`resumo-valor${avaliacao && avaliacao.dias <= 3 ? " urgente" : ""}`}>
          {avaliacao ? textoProximaAvaliacao(avaliacao) : "Nenhuma marcada"}
        </span>
      </div>
      <div className={`resumo-linha${vigencia ? "" : " vazio"}`}>
        <CalendarRange size={12} />
        {progresso !== null ? (
          <>
            <span
              className="resumo-progresso"
              role="progressbar"
              aria-label="Andamento da vigência"
              aria-valuenow={Math.round(progresso * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${progresso * 100}%`, background: cadeira.cor }} />
            </span>
            <span className="resumo-valor">{vigencia}</span>
          </>
        ) : (
          <span className="resumo-valor">{vigencia || "Sem início/fim definidos"}</span>
        )}
      </div>
    </div>
  );
}
