// src/components/TelaCadeira.jsx
// Tela da cadeira (clicar no card): visualização centralizada, "meio fixa"
// (não cresce para baixo em casos normais), toda na cor da cadeira.
//   título · vigência (barra + %) · abas Geral | Materiais | Datas importantes
//   | Avaliações e Notas.
// Só LEITURA, com uma exceção: os lembretes de cada data (sininho). Editar a
// cadeira é no lápis, que abre o drawer de sempre (PainelCadeira).
import { useMemo, useRef, useState } from "react";
import { Pencil, X } from "lucide-react";
import useCaixaModal from "../hooks/useCaixaModal";
import { useHoje } from "../hooks/useHoje.js";
import { corVisivel, hexParaRgb } from "../utils/calendario.js";
import { VigenciaCadeira } from "./ui/ResumoCadeira.jsx";
import AbaGeral from "./telaCadeira/AbaGeral.jsx";
import AbaMateriais from "./telaCadeira/AbaMateriais.jsx";
import AbaDatasImportantes from "./telaCadeira/AbaDatasImportantes.jsx";
import AbaBoletim from "./telaCadeira/AbaBoletim.jsx";

const ABAS = [
  { id: "geral", rotulo: "Geral" },
  { id: "materiais", rotulo: "Materiais" },
  { id: "datas", rotulo: "Datas importantes" },
  { id: "notas", rotulo: "Avaliações e Notas" },
];

export default function TelaCadeira({
  cadeira,
  eventosExcluidos = [],
  lembretesPadrao,
  onAtualizar,
  onEditar,
  onFechar,
}) {
  const [aba, setAba] = useState("geral");
  const caixaRef = useRef(null);
  // Esc fecha, Tab fica aqui dentro, foco volta ao card ao fechar.
  const aoTeclar = useCaixaModal(caixaRef, onFechar, { focoInicial: "caixa" });
  const hojeISO = useHoje();
  // Cor quase preta some no fundo escuro (#55): só a exibição clareia.
  const cor = corVisivel(cadeira.cor);
  const estilo = useMemo(() => ({ "--cor": cor, "--cor-rgb": hexParaRgb(cor) }), [cor]);

  return (
    <div className="tela-cadeira-overlay" onClick={onFechar}>
      <div
        className="tela-cadeira"
        ref={caixaRef}
        style={estilo}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tela-cadeira-titulo"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={aoTeclar}
      >
        <div className="tela-cadeira-acoes">
          <button type="button" className="icon-btn-ghost" onClick={onEditar} title="Editar cadeira">
            <Pencil size={15} />
          </button>
          <button type="button" className="icon-btn-ghost" onClick={onFechar} title="Fechar">
            <X size={18} />
          </button>
        </div>

        <h2 className="tela-cadeira-titulo" id="tela-cadeira-titulo">
          {cadeira.nome}
        </h2>
        <VigenciaCadeira cadeira={cadeira} hojeISO={hojeISO} className="tela-cadeira-vigencia" />

        <div className="tela-cadeira-abas" role="tablist" aria-label="Seções da cadeira">
          {ABAS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              id={`aba-cadeira-${a.id}`}
              aria-selected={aba === a.id}
              aria-controls="tela-cadeira-conteudo"
              className={`tela-cadeira-aba${aba === a.id ? " ativa" : ""}`}
              onClick={() => setAba(a.id)}
            >
              {a.rotulo}
            </button>
          ))}
        </div>

        <div
          className={`tela-cadeira-conteudo aba-${aba}`}
          id="tela-cadeira-conteudo"
          role="tabpanel"
          aria-labelledby={`aba-cadeira-${aba}`}
        >
          {aba === "geral" && <AbaGeral cadeira={cadeira} eventosExcluidos={eventosExcluidos} cor={cor} />}
          {aba === "materiais" && <AbaMateriais links={cadeira.links} />}
          {aba === "datas" && (
            <AbaDatasImportantes
              cadeira={cadeira}
              hojeISO={hojeISO}
              lembretesPadrao={lembretesPadrao}
              estiloCor={estilo}
              onAtualizar={onAtualizar}
            />
          )}
          {aba === "notas" && <AbaBoletim cadeira={cadeira} />}
        </div>
      </div>
    </div>
  );
}
