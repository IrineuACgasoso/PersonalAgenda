import { useState, useEffect, useRef } from "react";
import { Trash2, X, ChevronDown } from "lucide-react";
import useListaInterna from "../hooks/useListaInterna";
import { DIAS_FULL } from "../constants";
import AbaHorarios from "./abas/AbaHorarios";
import AbaLinks from "./abas/AbaLinks";
import AbaDatas from "./abas/AbaDatas";
import SeletorCor from "./ui/SeletorCor.jsx";
import ResumoCadeira from "./ui/ResumoCadeira.jsx";
import CampoVigencia from "./ui/CampoVigencia.jsx";
import { useNavegacaoEnter } from "../hooks/useNavegacaoEnter.js";

const textoHorarioExcluido = (h) => `Horário de ${DIAS_FULL[h.dia] ?? "?"} (${h.inicio}–${h.fim}) excluído`;

// Seção recolhível do drawer (#21): substitui as 3 abas — tudo fica numa
// rolagem só, e dá para fechar o que não interessa.
function Secao({ titulo, contagem, aberta, onAlternar, children }) {
  return (
    <section className="painel-secao">
      <button type="button" className="painel-secao-cabecalho" onClick={onAlternar} aria-expanded={aberta}>
        <ChevronDown size={16} className={`painel-secao-seta${aberta ? "" : " fechada"}`} />
        <span>{titulo}</span>
        <span className="painel-secao-contagem">{contagem}</span>
      </button>
      {aberta && <div className="painel-secao-corpo">{children}</div>}
    </section>
  );
}

export default function PainelCadeira({
  cadeira,
  eventosExcluidos = [],
  lembretesPadrao,
  onFechar,
  onAtualizar,
  onExcluir,
}) {
  const [abertas, setAbertas] = useState({ horarios: true, links: true, datas: true });
  const alternarSecao = (secao) => setAbertas((a) => ({ ...a, [secao]: !a[secao] }));
  const [nomeEdit, setNomeEdit] = useState(cadeira.nome);
  const painelRef = useRef(null);
  useNavegacaoEnter(painelRef);

  // Só ao trocar de cadeira: reagir a `cadeira.nome` apagaria o que está
  // sendo digitado a cada sync vindo de outro aparelho.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setNomeEdit(cadeira.nome), [cadeira.id]);

  const salvarNome = () => {
    const v = nomeEdit.trim();
    if (v && v !== cadeira.nome) onAtualizar({ nome: v });
  };

  /* listas internas: leem a cadeira mais recente; excluir tem "Desfazer" (#18) */
  const horarios = useListaInterna("horarios", onAtualizar, textoHorarioExcluido);
  const links = useListaInterna("links", onAtualizar, (l) => `Link "${l.titulo}" excluído`);
  const datas = useListaInterna("datas", onAtualizar, (d) => `Data "${d.titulo}" excluída`);
  const { adicionar: addHorario, remover: rmHorario, editar: editHorario } = horarios;
  const { adicionar: addLink, remover: rmLink, editar: editLink } = links;
  const { adicionar: addData, remover: rmData, editar: editData } = datas;

  return (
    <div className="overlay" onClick={onFechar}>
      <div className="painel-lateral" ref={painelRef} onClick={(e) => e.stopPropagation()}>
        <div className="painel-header">
          <span className="cor-dot" style={{ background: cadeira.cor }} />
          <input
            className="painel-title-input"
            value={nomeEdit}
            onChange={(e) => setNomeEdit(e.target.value)}
            onBlur={salvarNome}
          />
          <button className="icon-btn-ghost" onClick={onExcluir} title="Excluir cadeira">
            <Trash2 size={15} />
          </button>
          <button className="icon-btn-ghost" onClick={onFechar} title="Fechar">
            <X size={17} />
          </button>
        </div>

        {/* Resumo no cabeçalho (#21): mesma informação do card. */}
        <div className="painel-resumo">
          <ResumoCadeira cadeira={cadeira} eventosExcluidos={eventosExcluidos} maxAvaliacoes={5} />
        </div>

        {/* SELETOR DE COR (HEXADECIMAL LIVRE) */}
        <div style={{ marginTop: 10 }}>
          <SeletorCor key={cadeira.id} valor={cadeira.cor} onChange={(cor) => onAtualizar({ cor })} />
        </div>

        {/* VIGÊNCIA DA CADEIRA (#19): fora dela, aulas e avaliações não aparecem no calendário */}
        <CampoVigencia
          key={cadeira.id}
          item={cadeira}
          onAtualizar={onAtualizar}
          dicaComDatas="Fora dessas datas, as aulas e avaliações não aparecem no calendário."
          dicaSemDatas="Sem datas: as aulas aparecem em todas as semanas."
        />

        <div className="painel-secoes">
          <Secao
            titulo="Horários"
            contagem={cadeira.horarios.length}
            aberta={abertas.horarios}
            onAlternar={() => alternarSecao("horarios")}
          >
            <AbaHorarios horarios={cadeira.horarios} onAdd={addHorario} onRemover={rmHorario} onEditar={editHorario} />
          </Secao>
          <Secao
            titulo="Links e materiais"
            contagem={cadeira.links.length}
            aberta={abertas.links}
            onAlternar={() => alternarSecao("links")}
          >
            <AbaLinks links={cadeira.links} onAdd={addLink} onRemover={rmLink} onEditar={editLink} />
          </Secao>
          <Secao
            titulo="Datas importantes"
            contagem={cadeira.datas.length}
            aberta={abertas.datas}
            onAlternar={() => alternarSecao("datas")}
          >
            <AbaDatas
              datas={cadeira.datas}
              lembretesPadrao={lembretesPadrao}
              onAdd={addData}
              onRemover={rmData}
              onEditar={editData}
            />
          </Secao>
        </div>
      </div>
    </div>
  );
}
