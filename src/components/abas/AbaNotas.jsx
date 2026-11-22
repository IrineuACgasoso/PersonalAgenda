// src/components/abas/AbaNotas.jsx
// Seção "Notas" do drawer da cadeira (#35). Árvore de notas e grupos; cada
// item entra no de cima por PESO (média ponderada) ou PONTO EXTRA (a nota
// lançada já é o quanto somou: 10 numa MP de 1 ponto ⇒ 1; 3 ⇒ 0,3).
// Cálculos e edição da árvore são puros, em utils/notas.js.
// Tudo grava ao sair do campo (CampoNumero / blur do título).
import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Copy, FolderPlus, Plus, Trash2 } from "lucide-react";
import CampoNumero from "../ui/CampoNumero.jsx";
import useDialogos from "../../hooks/useDialogos";
import { uid } from "../../utils/id";
import { formatarData } from "../../utils/formatarData.js";
import {
  MAX_PROFUNDIDADE,
  MEDIA_APROVACAO,
  MEDIA_MINIMA_FINAL,
  destinosPossiveis,
  duplicarItem,
  editarItem,
  formatarNota,
  inserirItem,
  moverItem,
  removerItem,
  situacaoDasNotas,
  textoNecessaria,
  valorDoGrupo,
} from "../../utils/notas.js";

const novaNota = (extra = {}) => ({ id: uid(), titulo: "", tipo: "nota", modo: "peso", valor: 1, ...extra });
const novoGrupo = () => ({ id: uid(), titulo: "", tipo: "grupo", modo: "peso", valor: 1, itens: [] });

// Título salvo ao sair do campo (como o nome nos drawers).
function CampoTitulo({ valor, onSalvar, placeholder }) {
  return (
    <input
      key={valor}
      className="input nota-titulo"
      defaultValue={valor}
      placeholder={placeholder}
      onBlur={(e) => {
        const t = e.target.value.trim();
        if (t !== valor) onSalvar(t);
      }}
    />
  );
}

function ResumoNotas({ itens, notaFinal, onFinal }) {
  const s = situacaoDasNotas(itens, notaFinal);
  if (s.estado === "sem-notas") {
    return (
      <p className="subtle notas-dica">
        Crie as notas da cadeira (Prova 1, Projeto…) e, se precisar, grupos (Unidade 1…). <strong>Peso</strong> entra na
        média ponderada (1/1, 60/30/10…); <strong>Ponto extra</strong> soma direto no grupo: lance quanto a nota cresceu
        (tirou 10 numa MP que vale 1 ponto ⇒ 1; tirou 3 ⇒ 0,3). Dá para criar uma nota direto de uma data importante.
      </p>
    );
  }
  const campoFinal = (
    <label className="notas-final">
      <span>Nota da final</span>
      <CampoNumero
        className="input nota-valor"
        valor={notaFinal}
        max={10}
        placeholder="–"
        onSalvar={onFinal}
        aria-label="Nota da prova final"
      />
    </label>
  );
  if (s.estado === "andamento") {
    return (
      <div className="notas-resumo">
        <div className="notas-resumo-linha">
          <span>Média parcial</span>
          <strong>{formatarNota(s.parcial)}</strong>
        </div>
        <div className="notas-resumo-linha subtle">
          <span>
            Falta{s.pendentes > 1 ? "m" : ""} {s.pendentes} nota{s.pendentes > 1 ? "s" : ""}. Para passar direto (≥{" "}
            {MEDIA_APROVACAO}):
          </span>
          <strong className={Number.isFinite(s.paraPassar) ? "" : "notas-ruim"}>{textoNecessaria(s.paraPassar)}</strong>
        </div>
        <div className="notas-resumo-linha subtle">
          <span>Para ao menos ir à final (≥ {MEDIA_MINIMA_FINAL}):</span>
          <strong className={Number.isFinite(s.paraFinal) ? "" : "notas-ruim"}>{textoNecessaria(s.paraFinal)}</strong>
        </div>
        <p className="subtle notas-dica">Ponto extra que ainda não saiu conta como 0.</p>
      </div>
    );
  }
  const classe = { aprovado: "notas-bom", reprovado: "notas-ruim", final: "notas-atencao" }[s.estado];
  const rotulo = { aprovado: "Aprovado", reprovado: "Reprovado", final: "Vai para a final" }[s.estado];
  return (
    <div className="notas-resumo">
      <div className="notas-resumo-linha">
        <span>Média</span>
        <strong>{formatarNota(s.media)}</strong>
        <span className={`notas-situacao ${classe}`}>{rotulo}</span>
      </div>
      {s.estado === "final" && (
        <div className="notas-resumo-linha subtle">
          <span>Precisa de</span>
          <strong>{formatarNota(s.precisaNaFinal)}</strong>
          <span>na final (média com a final ≥ 5)</span>
        </div>
      )}
      {s.mediaFinal !== undefined && (
        <div className="notas-resumo-linha subtle">
          <span>Média com a final</span>
          <strong>{formatarNota(s.mediaFinal)}</strong>
        </div>
      )}
      {(s.estado === "final" || s.final !== undefined) && campoFinal}
    </div>
  );
}

function ItemNota({ item, nivel, raiz, datasPorId, acoes, idPai }) {
  const data = item.dataId ? datasPorId[item.dataId] : null;
  const ehGrupo = item.tipo === "grupo";
  const destinos = useMemo(() => destinosPossiveis(raiz, item.id), [raiz, item.id]);
  const valorGrupo = ehGrupo ? valorDoGrupo(item) : null;
  const extra = item.modo === "bonus";

  return (
    <div className={`nota-item${ehGrupo ? " nota-grupo" : ""}`} data-nota-id={item.id}>
      <div className="nota-linha">
        {data ? (
          <span className="nota-titulo nota-titulo-vinculado" title="Ligada a uma data importante">
            {data.titulo}
            <span className="nota-data">
              <Calendar size={11} /> {formatarData(data.data)}
            </span>
          </span>
        ) : (
          <CampoTitulo
            valor={item.titulo}
            placeholder={ehGrupo ? "Grupo (ex.: Unidade 1)" : "Nota (ex.: Prova 1)"}
            onSalvar={(titulo) => acoes.editar(item.id, { titulo })}
          />
        )}
        {ehGrupo ? (
          <span className="nota-valor nota-valor-grupo" title="Valor do grupo com o que já saiu">
            {formatarNota(valorGrupo)}
          </span>
        ) : (
          <CampoNumero
            className="input nota-valor"
            valor={item.nota}
            max={10}
            placeholder={extra ? "+pts" : "–"}
            onSalvar={(nota) => acoes.editar(item.id, { nota })}
            aria-label={`${extra ? "Pontos extras de" : "Nota de"} ${data?.titulo || item.titulo || "item"}`}
            title={extra ? "Pontos que somaram (ex.: 10 numa MP de 1 ponto ⇒ 1)" : undefined}
          />
        )}
      </div>

      <div className="nota-linha nota-config">
        <select
          className="input nota-modo"
          value={item.modo}
          onChange={(e) => acoes.editar(item.id, { modo: e.target.value })}
          aria-label="Como entra na média"
        >
          <option value="peso">Peso</option>
          <option value="bonus">Ponto extra</option>
        </select>
        {/* Ponto extra não tem peso: a nota já é o quanto somou. */}
        {!extra && (
          <CampoNumero
            className="input nota-peso"
            valor={item.valor}
            onSalvar={(valor) => acoes.editar(item.id, { valor: valor ?? 1 })}
            aria-label="Peso"
          />
        )}
        {(destinos.length > 0 || idPai) && (
          <select
            className="input nota-pai"
            value={idPai || ""}
            onChange={(e) => acoes.mover(item.id, e.target.value || null)}
            aria-label="Dentro de qual grupo"
            title="Dentro de qual grupo"
          >
            <option value="">Sem grupo</option>
            {destinos.map((d) => (
              <option key={d.id} value={d.id}>
                {"– ".repeat(d.nivel - 1)}
                {d.titulo || "(grupo sem nome)"}
              </option>
            ))}
          </select>
        )}
        <div className="nota-acoes">
          {ehGrupo && (
            <>
              <button
                type="button"
                className="icon-btn-ghost"
                title="Nova nota neste grupo"
                onClick={() => acoes.adicionar(item.id, novaNota())}
              >
                <Plus size={14} />
              </button>
              {nivel < MAX_PROFUNDIDADE - 1 && (
                <button
                  type="button"
                  className="icon-btn-ghost"
                  title="Novo grupo dentro deste"
                  onClick={() => acoes.adicionar(item.id, novoGrupo())}
                >
                  <FolderPlus size={14} />
                </button>
              )}
              <button
                type="button"
                className="icon-btn-ghost"
                title="Duplicar grupo (Unidade 1 → Unidade 2)"
                onClick={() => acoes.duplicar(item.id)}
              >
                <Copy size={13} />
              </button>
            </>
          )}
          <button type="button" className="icon-btn-ghost" title="Excluir" onClick={() => acoes.remover(item)}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {ehGrupo && (
        <div className="nota-filhos">
          {item.itens.length === 0 && <p className="subtle notas-dica">Grupo vazio: use o + para criar notas.</p>}
          {item.itens.map((filho) => (
            <ItemNota
              key={filho.id}
              item={filho}
              nivel={nivel + 1}
              raiz={raiz}
              datasPorId={datasPorId}
              acoes={acoes}
              idPai={item.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// `focarId`: nota recém-criada (ou aberta) a partir de uma data importante:
// rola até ela e foca o campo da nota.
export default function AbaNotas({ cadeira, onAtualizar, focarId, onFocado }) {
  const { notificar } = useDialogos();
  const itens = useMemo(() => cadeira.notas || [], [cadeira.notas]);
  const datasPorId = useMemo(() => Object.fromEntries((cadeira.datas || []).map((d) => [d.id, d])), [cadeira.datas]);
  const raizRef = useRef(null);
  const [focarInterno, setFocarInterno] = useState(null);
  const alvo = focarId || focarInterno;

  useEffect(() => {
    if (!alvo) return;
    const el = raizRef.current?.querySelector(`[data-nota-id="${CSS.escape(alvo)}"]`);
    if (!el) return; // ainda não chegou do persist: tenta no próximo render
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const campo = el.querySelector(".nota-titulo:not(.nota-titulo-vinculado)") ?? el.querySelector(".nota-valor");
    if (campo && !campo.value) campo.focus?.();
    else el.querySelector(".nota-valor")?.focus?.();
    setFocarInterno(null);
    onFocado?.();
  }, [alvo, itens, onFocado]);

  const atualizarNotas = (fn) => onAtualizar((c) => ({ notas: fn(c.notas || []) }));

  const acoes = {
    adicionar: (idPai, novo) => {
      atualizarNotas((lista) => inserirItem(lista, idPai, novo));
      setFocarInterno(novo.id);
    },
    editar: (id, patch) => atualizarNotas((lista) => editarItem(lista, id, patch)),
    mover: (id, idPai) => atualizarNotas((lista) => moverItem(lista, id, idPai)),
    duplicar: (id) => atualizarNotas((lista) => duplicarItem(lista, id, uid)),
    remover: (item) => {
      let removido = null;
      const r = onAtualizar((c) => {
        const res = removerItem(c.notas || [], item.id);
        removido = res.removido;
        return { notas: res.itens };
      });
      if (!r?.ok || !removido) return;
      const nome = datasPorId[item.dataId]?.titulo || item.titulo || (item.tipo === "grupo" ? "Grupo" : "Nota");
      notificar(`"${nome}" excluíd${item.tipo === "grupo" ? "o" : "a"}`, {
        acao: {
          rotulo: "Desfazer",
          aoClicar: () => atualizarNotas((lista) => inserirItem(lista, removido.idPai, removido.item, removido.indice)),
        },
      });
    },
  };

  return (
    <div ref={raizRef}>
      <ResumoNotas itens={itens} notaFinal={cadeira.notaFinal} onFinal={(notaFinal) => onAtualizar({ notaFinal })} />
      <div className="notas-lista">
        {itens.map((item) => (
          <ItemNota key={item.id} item={item} nivel={1} raiz={itens} datasPorId={datasPorId} acoes={acoes} />
        ))}
      </div>
      <div className="notas-botoes">
        <button type="button" className="btn-secundario" onClick={() => acoes.adicionar(null, novaNota())}>
          <Plus size={14} /> Nota
        </button>
        <button type="button" className="btn-secundario" onClick={() => acoes.adicionar(null, novoGrupo())}>
          <FolderPlus size={14} /> Grupo
        </button>
      </div>
    </div>
  );
}
