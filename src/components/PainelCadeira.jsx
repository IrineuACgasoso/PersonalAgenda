import { useState, useEffect, useRef } from "react";
import { Trash2, X, ChevronDown } from "lucide-react";
import useListaInterna from "../hooks/useListaInterna";
import { DIAS_FULL } from "../constants";
import AbaHorarios from "./abas/AbaHorarios";
import AbaLinks from "./abas/AbaLinks";
import AbaDatas from "./abas/AbaDatas";
import AbaNotas from "./abas/AbaNotas";
import CampoNumero from "./ui/CampoNumero.jsx";
import { uid } from "../utils/id";
import { notasPorData } from "../utils/notas.js";
import { moverParaPosicao } from "../utils/links.js";
import { cargaHorariaEstimada, LIMITE_FALTAS } from "../utils/frequencia.js";
import SeletorCor from "./ui/SeletorCor.jsx";
import ResumoCadeira from "./ui/ResumoCadeira.jsx";
import CampoVigencia from "./ui/CampoVigencia.jsx";
import useCaixaModal from "../hooks/useCaixaModal";
import { nomeAoSair } from "../utils/nomes.js";
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
  conflitosDe,
  onFechar,
  onAtualizar,
  onExcluir,
}) {
  const [abertas, setAbertas] = useState({ horarios: true, links: true, datas: true, notas: true });
  // Nota a focar depois de "Criar avaliação" numa data importante (#35).
  const [focarNotaId, setFocarNotaId] = useState(null);
  const alternarSecao = (secao) => setAbertas((a) => ({ ...a, [secao]: !a[secao] }));
  const [nomeEdit, setNomeEdit] = useState(cadeira.nome);
  const painelRef = useRef(null);
  useNavegacaoEnter(painelRef);
  // #51: Esc fecha, Tab fica no drawer e o foco volta ao card ao fechar.
  const aoTeclar = useCaixaModal(painelRef, onFechar, { focoInicial: "caixa" });

  // Só ao trocar de cadeira: reagir a `cadeira.nome` apagaria o que está
  // sendo digitado a cada sync vindo de outro aparelho.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setNomeEdit(cadeira.nome), [cadeira.id]);

  const salvarNome = () => {
    const { salvar, exibir } = nomeAoSair(nomeEdit, cadeira.nome);
    if (salvar) onAtualizar({ nome: salvar });
    setNomeEdit(exibir);
  };

  /* listas internas: leem a cadeira mais recente; excluir tem "Desfazer" (#18) */
  const horarios = useListaInterna("horarios", onAtualizar, textoHorarioExcluido);
  const links = useListaInterna("links", onAtualizar, (l) => `Link "${l.titulo}" excluído`);
  const datas = useListaInterna("datas", onAtualizar, (d) => `Data "${d.titulo}" excluída`);
  const { adicionar: addHorario, remover: rmHorario, editar: editHorario } = horarios;
  const { adicionar: addLink, remover: rmLink, editar: editLink } = links;
  const { adicionar: addData, remover: rmData, editar: editData } = datas;

  // #35: data importante → nota ligada a ela. Já existe? Só leva até ela.
  const notasDasDatas = notasPorData(cadeira.notas);
  const abrirAvaliacao = (data) => {
    setAbertas((a) => ({ ...a, notas: true }));
    const existente = notasDasDatas[data.id];
    if (existente) return setFocarNotaId(existente.id);
    const nova = { id: uid(), titulo: data.titulo, tipo: "nota", modo: "peso", valor: 1, dataId: data.id };
    const r = onAtualizar((c) => ({ notas: [...(c.notas || []), nova] }));
    if (r?.ok) setFocarNotaId(nova.id);
  };

  // #34: carga horária (limite de faltas = 25%). Vazia = estimada pela vigência.
  const cargaEstimada = cargaHorariaEstimada(cadeira);
  const cargaEfetiva = cadeira.cargaHoraria || cargaEstimada;

  return (
    <div className="overlay" onClick={onFechar}>
      <div
        className="painel-lateral"
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Cadeira ${cadeira.nome}`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={aoTeclar}
      >
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

        <div className="painel-vigencia">
          <label className="painel-vigencia-campo">
            <span className="painel-vigencia-rotulo">Carga horária</span>
            <CampoNumero
              className="input painel-carga-input"
              valor={cadeira.cargaHoraria}
              min={1}
              placeholder={cargaEstimada ? `≈ ${cargaEstimada}` : "ex.: 60"}
              onSalvar={(cargaHoraria) => onAtualizar({ cargaHoraria })}
              aria-label="Carga horária em horas"
            />
            <span className="subtle">h</span>
          </label>
          <span className="subtle painel-vigencia-dica">
            {cargaEfetiva
              ? `Limite de faltas: ${Math.round(cargaEfetiva * LIMITE_FALTAS * 10) / 10}h (25%)${cadeira.cargaHoraria ? "" : ", pela carga estimada nos horários × vigência"}.`
              : "Informe a carga horária (ou a vigência completa) para ver o limite de faltas."}{" "}
            Falta: ✗ na aula, na Hoje ou no calendário.
          </span>
        </div>

        <div className="painel-secoes">
          <Secao
            titulo="Horários"
            contagem={cadeira.horarios.length}
            aberta={abertas.horarios}
            onAlternar={() => alternarSecao("horarios")}
          >
            <AbaHorarios
              horarios={cadeira.horarios}
              onAdd={addHorario}
              onRemover={rmHorario}
              onEditar={editHorario}
              conflitosDe={conflitosDe}
              rotuloMesmoDono="outro horário desta cadeira"
            />
          </Secao>
          <Secao
            titulo="Links e materiais"
            contagem={cadeira.links.length}
            aberta={abertas.links}
            onAlternar={() => alternarSecao("links")}
          >
            <AbaLinks
              links={cadeira.links}
              onAdd={addLink}
              onRemover={rmLink}
              onEditar={editLink}
              onReordenar={(de, para) => onAtualizar((c) => ({ links: moverParaPosicao(c.links, de, para) }))}
            />
          </Secao>
          <Secao
            titulo="Datas importantes"
            contagem={cadeira.datas.length}
            aberta={abertas.datas}
            onAlternar={() => alternarSecao("datas")}
          >
            <AbaDatas
              datas={cadeira.datas}
              notasDasDatas={notasDasDatas}
              onAvaliacao={abrirAvaliacao}
              onAdd={addData}
              onRemover={rmData}
              onEditar={editData}
            />
          </Secao>
          <Secao
            titulo="Notas"
            contagem={cadeira.notas?.length || 0}
            aberta={abertas.notas}
            onAlternar={() => alternarSecao("notas")}
          >
            <AbaNotas
              cadeira={cadeira}
              onAtualizar={onAtualizar}
              focarId={focarNotaId}
              onFocado={() => setFocarNotaId(null)}
            />
          </Secao>
        </div>
      </div>
    </div>
  );
}
