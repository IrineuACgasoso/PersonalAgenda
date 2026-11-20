// src/components/VisaoHoje.jsx
//
// Tela inicial (#31): tudo o que está marcado para um dia — aulas, provas,
// rotinas, compromissos e afazeres —, com < e > para andar pelos dias. A
// lista é a mesma do calendário geral (ui/ListaDoDia), sem o arrasto.
import { useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Undo2 } from "lucide-react";
import { useHoje } from "../hooks/useHoje.js";
import { somarDias, diaPorExtenso } from "../utils/calendario.js";
import {
  itensAtrasados,
  projetarEventos,
  projetarMarcosVigencia,
  textoAtrasados,
  textoDistanciaDeHoje,
} from "../utils/projecao.js";
import ListaDoDia from "./ui/ListaDoDia.jsx";

// Quantos atrasados aparecem por nome no aviso (o resto vira "+N").
const MAX_ATRASADOS_VISIVEIS = 4;

export default function VisaoHoje({
  cadeiras = [],
  rotinas = [],
  compromissos = [],
  afazeres = [],
  eventosConcluidos = [],
  eventosExcluidos = [],
  // Abre o calendário geral já com este dia selecionado (aviso de atrasados).
  onAbrirCalendarioNaData,
  ...acoes
}) {
  const hojeISO = useHoje();
  // Guarda a DISTÂNCIA até hoje, não a data: com o app aberto na virada do
  // dia, quem estava vendo "hoje" passa a ver o novo hoje (#49).
  const [deslocamento, setDeslocamento] = useState(0);
  const diaISO = somarDias(hojeISO, deslocamento);

  // Só a janela de um dia: mesma projeção do calendário (utils/projecao.js),
  // com todos os tipos (a tela Hoje não tem filtros).
  const eventos = useMemo(
    () =>
      projetarEventos({
        cadeiras,
        rotinas,
        compromissos,
        afazeres,
        eventosExcluidos,
        inicioISO: diaISO,
        fimISO: diaISO,
        hojeISO,
      })[diaISO] || [],
    [cadeiras, rotinas, compromissos, afazeres, eventosExcluidos, diaISO, hojeISO],
  );
  // Atrasados não entram na lista (podem ter sido feitos e não marcados):
  // só um aviso que leva ao calendário geral, onde se marca ou se adia.
  const atrasados = useMemo(
    () => itensAtrasados({ afazeres, compromissos }, hojeISO),
    [afazeres, compromissos, hojeISO],
  );
  const marcos = useMemo(() => projetarMarcosVigencia(cadeiras, diaISO, diaISO)[diaISO] || [], [cadeiras, diaISO]);

  return (
    <div>
      <div className="header-bar">
        <h1 className="titulo-pagina">Hoje</h1>
        <span className="subtle">Tudo o que está marcado para o dia</span>
      </div>

      {atrasados.length > 0 && (
        <div className="aviso-atrasados" role="status">
          <div className="aviso-atrasados-topo">
            <AlertTriangle size={16} className="aviso-atrasados-icone" />
            <span className="aviso-atrasados-texto">
              <strong>{textoAtrasados(atrasados)}</strong>
              <span className="subtle"> · foram feitos ou vão ser adiados?</span>
            </span>
            {onAbrirCalendarioNaData && (
              <button
                type="button"
                className="btn-secundario aviso-atrasados-btn"
                onClick={() => onAbrirCalendarioNaData(atrasados[0].data)}
                title="Abre o calendário geral no dia do atraso mais antigo"
              >
                Organizar
              </button>
            )}
          </div>
          {/* Cada item abre o calendário no próprio dia: lá dá para marcar o
              check (foi feito) ou arrastar para outra data (adiado). */}
          <div className="aviso-atrasados-itens">
            {atrasados.slice(0, MAX_ATRASADOS_VISIVEIS).map((item) => (
              <button
                type="button"
                key={`${item.tipo}|${item.id}`}
                className="aviso-atrasados-item"
                onClick={() => onAbrirCalendarioNaData?.(item.data)}
                disabled={!onAbrirCalendarioNaData}
              >
                <span className="aviso-atrasados-ponto" style={{ background: item.cor }} />
                <span className="aviso-atrasados-nome">{item.nome}</span>
                <span className="subtle">{textoDistanciaDeHoje(item.data, hojeISO)}</span>
              </button>
            ))}
            {atrasados.length > MAX_ATRASADOS_VISIVEIS && (
              <span className="subtle aviso-atrasados-mais">+{atrasados.length - MAX_ATRASADOS_VISIVEIS}</span>
            )}
          </div>
        </div>
      )}

      {/* Atalho de volta para hoje: numa linha própria, no canto direito, com
          a altura SEMPRE reservada. Antes ele entrava ao lado do ">" e
          espremia a navegação: o ">" andava e o toque seguinte caía no
          "Hoje". Assim data, "<" e ">" nunca mudam de lugar. */}
      <div className="hoje-topo">
        {deslocamento !== 0 && (
          <button type="button" className="btn-secundario hoje-voltar" onClick={() => setDeslocamento(0)}>
            <Undo2 size={13} /> Hoje
          </button>
        )}
      </div>

      <ListaDoDia
        diaISO={diaISO}
        hojeISO={hojeISO}
        cabecalho={
          <div className="hoje-nav">
            <button
              type="button"
              className="icon-btn-ghost"
              onClick={() => setDeslocamento((d) => d - 1)}
              title="Dia anterior"
              aria-label="Dia anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="hoje-nav-data">
              <h2 className="titulo-secao">{diaPorExtenso(diaISO, hojeISO)}</h2>
              <span className="subtle">{textoDistanciaDeHoje(diaISO, hojeISO)}</span>
            </div>
            <button
              type="button"
              className="icon-btn-ghost"
              onClick={() => setDeslocamento((d) => d + 1)}
              title="Próximo dia"
              aria-label="Próximo dia"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        }
        eventos={eventos}
        marcos={marcos}
        eventosConcluidos={eventosConcluidos}
        {...acoes}
      />
    </div>
  );
}
