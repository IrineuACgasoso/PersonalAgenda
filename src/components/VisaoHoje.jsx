// src/components/VisaoHoje.jsx
//
// Tela inicial (#31): tudo o que está marcado para um dia — aulas, provas,
// rotinas, compromissos e afazeres —, com < e > para andar pelos dias. A
// lista é a mesma do calendário geral (ui/ListaDoDia), sem o arrasto.
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useHoje } from "../hooks/useHoje.js";
import { somarDias, diaPorExtenso } from "../utils/calendario.js";
import { projetarEventos, projetarMarcosVigencia, textoDistanciaDeHoje } from "../utils/projecao.js";
import ListaDoDia from "./ui/ListaDoDia.jsx";

export default function VisaoHoje({
  cadeiras = [],
  rotinas = [],
  compromissos = [],
  afazeres = [],
  eventosConcluidos = [],
  eventosExcluidos = [],
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
  const marcos = useMemo(() => projetarMarcosVigencia(cadeiras, diaISO, diaISO)[diaISO] || [], [cadeiras, diaISO]);

  return (
    <div>
      <div className="header-bar">
        <h1 className="titulo-pagina">Hoje</h1>
        <span className="subtle">Tudo o que está marcado para o dia</span>
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
            {deslocamento !== 0 && (
              <button type="button" className="btn-secundario hoje-voltar" onClick={() => setDeslocamento(0)}>
                Hoje
              </button>
            )}
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
