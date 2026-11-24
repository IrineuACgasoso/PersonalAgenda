// src/components/ui/ListaDoDia.jsx
//
// Lista de tudo o que acontece num dia: usada na tela Hoje e embaixo do
// calendário geral. Ordem e textos vêm de utils/projecao.js
// (ordenarEventosDoDia, subtituloEvento); aqui só desenha e chama as ações.
// O arrasto para outro dia só existe no calendário: ele passa `arrasto`.
import { useMemo, useRef, useState } from "react";
import { BookMarked, Check, Flag, FlagOff, ListChecks, Plus, Star, Trash2, X } from "lucide-react";
import { formatarData } from "../../utils/formatarData.js";
import { eventoConcluido, idArrasto, ordenarEventosDoDia, subtituloEvento } from "../../utils/projecao.js";
import useFecharAoClicarFora from "../../hooks/useFecharAoClicarFora.js";
import EstadoVazio from "./EstadoVazio.jsx";
import BarraUrgencia from "./BarraUrgencia.jsx";

// Afazer sem repetição e compromisso acontecem uma vez só: a lixeira os
// exclui de verdade (com Desfazer), em vez de só esconder o dia e deixar o
// item vivo na aba (#45).
const ehAfazerPontual = (ev) => ev.tipo === "afazeres" && !(ev.rotina && ev.rotina.tipo !== "nenhuma");

export default function ListaDoDia({
  diaISO,
  hojeISO,
  cabecalho,
  eventos = [],
  marcos = [],
  eventosConcluidos = [],
  textoSemDia = "Selecione um dia.",
  onAlternarEventoConcluido,
  // #34: ✗ ao lado da lixeira (só aulas não concluídas) = faltei.
  onMarcarFalta,
  onExcluirInstanciaEvento,
  onAlternarFeitoAfazer,
  onExcluirAfazer,
  onAlternarFeitoCompromisso,
  onExcluirCompromisso,
  onNovoAfazer,
  onNovoCompromisso,
  // { podeArrastar(ev), iniciar(e, ev), mover(e), finalizar(), chaveArrastando, chavePronta }
  arrasto,
  rodape,
}) {
  // Menu do "+": novo afazer ou novo compromisso nessa data.
  const [menuNovoAberto, setMenuNovoAberto] = useState(false);
  const menuNovoRef = useRef(null);
  useFecharAoClicarFora(menuNovoRef, menuNovoAberto, () => setMenuNovoAberto(false));

  const ordenados = useMemo(() => ordenarEventosDoDia(eventos, eventosConcluidos), [eventos, eventosConcluidos]);

  const alternarConcluido = (ev) => {
    if (ev.tipo === "afazeres") {
      // Passa a data natural da ocorrência: altera só aquele dia (#14).
      onAlternarFeitoAfazer?.(ev.id, ev.dataOriginal ?? ev.data);
    } else if (ev.tipo === "compromissos") {
      onAlternarFeitoCompromisso?.(ev.id);
    } else {
      onAlternarEventoConcluido?.(ev.chave);
    }
  };

  // Recorrentes (aula, rotina, afazer que se repete): remove só esta
  // ocorrência. Avaliação: some do calendário (a data continua na cadeira).
  // Compromisso e afazer sem repetição: excluídos de verdade (#45). Sem
  // confirm(): o App mostra um toast com "Desfazer" (#18).
  const excluirInstancia = (ev) => {
    if (ev.tipo === "compromissos") return onExcluirCompromisso?.(ev.id);
    if (ehAfazerPontual(ev)) return onExcluirAfazer?.(ev.id);
    if (!onExcluirInstanciaEvento) return;
    const texto =
      ev.tipo === "avaliacoes" ? `"${ev.titulo}" removido da agenda` : `"${ev.titulo}" removido só deste dia`;
    onExcluirInstanciaEvento(ev.chave, texto);
  };

  const tituloLixeira = (ev) => {
    if (ev.tipo === "compromissos") return "Excluir compromisso";
    if (ehAfazerPontual(ev)) return "Excluir afazer";
    return ev.tipo === "avaliacoes" ? "Remover da agenda" : "Remover só este dia";
  };

  return (
    <div className="detalhe-dia">
      <div className="detalhe-dia-cabecalho">
        {cabecalho}
        {diaISO && (onNovoAfazer || onNovoCompromisso) && (
          <div className="menu-novo" ref={menuNovoRef}>
            <button
              type="button"
              className="icon-btn-ghost"
              onClick={() => setMenuNovoAberto((v) => !v)}
              title={`Criar em ${formatarData(diaISO)}`}
              aria-haspopup="menu"
              aria-expanded={menuNovoAberto}
            >
              <Plus size={16} />
            </button>
            {menuNovoAberto && (
              <div className="menu-novo-opcoes" role="menu">
                {onNovoAfazer && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuNovoAberto(false);
                      onNovoAfazer(diaISO);
                    }}
                  >
                    <ListChecks size={14} /> Afazer
                  </button>
                )}
                {onNovoCompromisso && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuNovoAberto(false);
                      onNovoCompromisso(diaISO);
                    }}
                  >
                    <Star size={14} /> Compromisso
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="detalhe-dia-corpo">
        {!diaISO && <EstadoVazio texto={textoSemDia} pequeno />}
        {/* Início/fim de vigência das cadeiras (#19): só informativo, sem
            check nem lixeira — muda-se no drawer da cadeira. */}
        {diaISO && marcos.length > 0 && (
          <div className="marcos-vigencia">
            {marcos.map((m) => {
              const Icone = m.tipo === "inicio" ? Flag : FlagOff;
              return (
                <div key={`${m.tipo}|${m.idCadeira}`} className="marco-vigencia">
                  <Icone size={13} color={m.cor} />
                  <span>
                    {m.tipo === "inicio" ? "Início" : "Fim"} de <strong>{m.nome}</strong>
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {diaISO && ordenados.length === 0 && marcos.length === 0 && (
          <EstadoVazio texto="Nada marcado para este dia" pequeno />
        )}
        {diaISO && ordenados.length > 0 && (
          <div className="lista-proximas-datas detalhe-dia-lista">
            {ordenados.map((ev, i) => {
              const concluido = eventoConcluido(ev, eventosConcluidos);
              const arrastavel = !!arrasto?.podeArrastar(ev);
              const sendoArrastado = arrasto?.chaveArrastando === idArrasto(ev);
              const pronto = arrasto?.chavePronta === idArrasto(ev) && !sendoArrastado;
              return (
                <div
                  key={ev.chave || i}
                  className={`data-item${concluido ? " passada" : ""}${arrastavel ? " arrastavel" : ""}${pronto ? " pronto-arrasto" : ""}${sendoArrastado ? " sendo-arrastado" : ""}`}
                  style={{ "--cor-item": ev.cor }}
                  onPointerDown={arrastavel ? (e) => arrasto.iniciar(e, ev) : undefined}
                  onPointerMove={arrastavel ? arrasto.mover : undefined}
                  onPointerUp={arrastavel ? arrasto.finalizar : undefined}
                  onPointerCancel={arrastavel ? arrasto.finalizar : undefined}
                >
                  <button
                    type="button"
                    className={`check-btn${concluido ? " marcado" : ""}${ev.falta ? " falta" : ""}`}
                    style={{ borderColor: concluido ? "transparent" : ev.cor }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => alternarConcluido(ev)}
                    title={
                      ev.falta
                        ? "Tirar a falta"
                        : concluido
                          ? "Marcar como não realizado"
                          : ev.tipo === "aulas"
                            ? "Fui (presença)"
                            : "Marcar como realizado"
                    }
                  >
                    {concluido && (ev.falta ? <X size={14} strokeWidth={3} /> : <Check size={13} />)}
                  </button>
                  <div className="data-item-faixa" style={{ background: ev.cor }} />
                  {/* Título quebra linha (nunca é cortado com "..."): no
                      mobile nomes longos ficavam ilegíveis. O item cresce em
                      altura e a faixa colorida acompanha (align-self: stretch). */}
                  <div className="data-item-texto">
                    <div className="data-item-titulo data-item-titulo-quebra">
                      {ev.tipo === "compromissos" && (
                        <Star size={12} fill={ev.cor} color={ev.cor} className="data-item-icone" />
                      )}
                      {ev.tipo === "avaliacoes" && <BookMarked size={12} color={ev.cor} className="data-item-icone" />}
                      {ev.titulo}
                    </div>
                    <div className={`subtle data-item-sub${ev.falta ? " data-item-falta" : ""}`}>
                      {subtituloEvento(ev, hojeISO, concluido)}
                    </div>
                  </div>
                  <div className="data-item-urgencia">
                    {ev.tipo === "afazeres" && <BarraUrgencia nivel={ev.urgencia || 1} />}
                  </div>
                  <div className="data-item-data data-item-hora">{ev.hora || ""}</div>
                  {onMarcarFalta && ev.tipo === "aulas" && !concluido && (
                    <button
                      type="button"
                      className="icon-btn-ghost botao-falta"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => onMarcarFalta(ev.chave)}
                      title="Faltei (conclui a aula como falta)"
                      aria-label={`Faltei em ${ev.titulo}`}
                    >
                      <X size={15} />
                    </button>
                  )}
                  {onExcluirInstanciaEvento && (
                    <button
                      type="button"
                      className="icon-btn-ghost"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => excluirInstancia(ev)}
                      title={tituloLixeira(ev)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {rodape}
    </div>
  );
}
