// src/components/ui/ResumoRotina.jsx
// Resumo da rotina (Fase 5): faixa da semana com os dias ativos acesos na
// cor da rotina, caixa "Próxima" (mesma caixa do resumo da cadeira) e total
// de horas por semana. Usado no card (VisaoRotinas) e no drawer (PainelRotina).
// A lógica é pura, em utils/rotinas.js.
import { CalendarRange, Clock, Timer } from "lucide-react";
import { DIAS_FULL } from "../../constants.js";
import { toISO } from "../../utils/afazeres.js";
import { hexParaRgb, textoVigencia } from "../../utils/calendario.js";
import { textoProximaAula } from "../../utils/cadeiras.js";
import {
  diasAtivosDaRotina,
  minutosPorSemana,
  proximaOcorrenciaRotina,
  rotinaEncerrada,
  textoDuracao,
} from "../../utils/rotinas.js";

export default function ResumoRotina({ rotina, eventosExcluidos = [] }) {
  const agora = new Date();
  const hojeISO = toISO(agora);
  const diaDeHoje = (agora.getDay() + 6) % 7;
  const ativos = diasAtivosDaRotina(rotina);
  const proxima = proximaOcorrenciaRotina(rotina, agora, eventosExcluidos);
  const n = rotina.horarios.length;
  const vigencia = textoVigencia(rotina);
  const encerrada = rotinaEncerrada(rotina, hojeISO);

  return (
    <div className="resumo-rotina" style={{ "--cor-rgb": hexParaRgb(rotina.cor) }}>
      <div className="faixa-semana" aria-label="Dias da semana com horário">
        {DIAS_FULL.map((dia, i) => (
          <span
            key={dia}
            className={`faixa-semana-dia${ativos.has(i) ? " ativo" : ""}${i === diaDeHoje ? " hoje" : ""}`}
            title={`${dia}${ativos.has(i) ? "" : " (sem horário)"}`}
          >
            {dia[0]}
          </span>
        ))}
      </div>

      <div className={`resumo-caixa${proxima ? "" : " resumo-caixa-vazia"}`}>
        <div className="resumo-caixa-rotulo">
          <Clock size={12} />
          <span>Próxima</span>
        </div>
        <span className="resumo-caixa-valor">
          {proxima
            ? textoProximaAula(proxima, hojeISO)
            : encerrada
              ? "Encerrada"
              : n === 0
                ? "Sem horários cadastrados"
                : "Nada nas próximas semanas"}
        </span>
      </div>

      <div className="resumo-rotina-rodape">
        <Timer size={12} />
        <span>
          {textoDuracao(minutosPorSemana(rotina))}/semana · {n} horário{n !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Vigência própria (#56), só quando tem alguma data */}
      {vigencia && (
        <div className="resumo-rotina-rodape">
          <CalendarRange size={12} />
          <span>{vigencia}</span>
        </div>
      )}
    </div>
  );
}
