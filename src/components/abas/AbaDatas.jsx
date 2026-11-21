// src/components/cadeira/AbaDatas.jsx
import { useState } from "react";
import { Plus, Trash2, Edit2, Calendar, Check, X, Bell, BellOff, GraduationCap } from "lucide-react";
import { formatarData } from "../../utils/formatarData.js";
import EstadoVazio from "../ui/EstadoVazio.jsx";
import SeletorLembretes from "../ui/SeletorLembretes.jsx";
import useDialogos from "../../hooks/useDialogos";
import { OPCOES_LEMBRETE, LEMBRETES_PADRAO, textoListaLembretes } from "../../utils/lembretes.js";
import { formatarNota } from "../../utils/notas.js";

// #35: `onAvaliacao(data)` cria a nota ligada a esta data (ou leva até ela);
// `notasDasDatas` = { dataId: nota } para mostrar a nota na linha.
export default function AbaDatas({
  datas,
  notasDasDatas = {},
  onAvaliacao,
  lembretesPadrao = LEMBRETES_PADRAO.avaliacoes,
  onAdd,
  onRemover,
  onEditar,
}) {
  const { avisar } = useDialogos();
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  // Lembretes desta avaliação (#23): undefined = padrão global.
  const [lembretes, setLembretes] = useState(undefined);
  const [editandoId, setEditandoId] = useState(null);

  const limpar = () => {
    setTitulo("");
    setData("");
    setHora("");
    setLembretes(undefined);
    setEditandoId(null);
  };

  const salvar = () => {
    const t = titulo.trim();
    if (!t || !data) {
      avisar("Preencha o título e a data.", { titulo: "Faltam dados" });
      return;
    }
    const campos = { titulo: t, data, hora, lembretes };
    if (editandoId) {
      if (onEditar) {
        onEditar(editandoId, campos);
      } else {
        onRemover(editandoId);
        onAdd(campos);
      }
    } else {
      onAdd(campos);
    }
    limpar();
  };

  const iniciarEdicao = (d) => {
    setEditandoId(d.id);
    setTitulo(d.titulo);
    setData(d.data);
    setHora(d.hora || "");
    setLembretes(d.lembretes);
  };

  return (
    <div>
      <input
        className="input"
        placeholder="ex: Prova 1, entrega do trabalho..."
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />
      <div className="form-grid duas-colunas" style={{ marginTop: 8 }}>
        <input className="input" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        <input className="input" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
      </div>
      <div style={{ marginTop: 10 }}>
        <SeletorLembretes
          valor={lembretes}
          onChange={setLembretes}
          padrao={lembretesPadrao}
          opcoes={OPCOES_LEMBRETE.avaliacoes}
        />
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button className="btn-primario full" onClick={salvar}>
          {editandoId ? <Check size={15} /> : <Plus size={15} />}
          {editandoId ? "Salvar edição" : "Adicionar data"}
        </button>
        {editandoId && (
          <button className="btn-secundario" onClick={limpar} title="Cancelar edição">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="lista-itens">
        {datas.length === 0 && <EstadoVazio texto="Nenhuma data cadastrada" pequeno />}
        {[...datas]
          .sort((a, b) => `${a.data}T${a.hora || "00:00"}`.localeCompare(`${b.data}T${b.hora || "00:00"}`))
          .map((d) => (
            <div key={d.id} className="item-linha">
              <Calendar size={14} style={{ opacity: 0.6 }} />
              <div style={{ flex: 1 }}>
                <div className="item-linha-titulo">{d.titulo}</div>
                <div className="subtle">
                  {formatarData(d.data)}
                  {d.hora ? ` · ${d.hora}` : ""}
                  {/* Só quando foge do padrão (#23). */}
                  {Array.isArray(d.lembretes) && (
                    <span className="lembrete-proprio">
                      {d.lembretes.length ? <Bell size={11} /> : <BellOff size={11} />}
                      {textoListaLembretes(d.lembretes)}
                    </span>
                  )}
                </div>
              </div>
              {onAvaliacao &&
                (notasDasDatas[d.id] ? (
                  <button
                    type="button"
                    className="chip-nota"
                    onClick={() => onAvaliacao(d)}
                    title="Ver a nota desta avaliação"
                  >
                    <GraduationCap size={12} />
                    {notasDasDatas[d.id].nota === undefined ? "Nota –" : formatarNota(notasDasDatas[d.id].nota)}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="icon-btn-ghost"
                    onClick={() => onAvaliacao(d)}
                    title="Criar avaliação (nota ligada a esta data)"
                    aria-label={`Criar avaliação de ${d.titulo}`}
                  >
                    <GraduationCap size={14} />
                  </button>
                ))}
              <button className="icon-btn-ghost" onClick={() => iniciarEdicao(d)} title="Editar data">
                <Edit2 size={13} />
              </button>
              <button className="icon-btn-ghost" onClick={() => onRemover(d.id)} title="Excluir data">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
