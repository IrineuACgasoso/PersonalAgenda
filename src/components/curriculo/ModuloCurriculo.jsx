// src/components/curriculo/ModuloCurriculo.jsx
// Um módulo do currículo (formação, projetos…) na coluna de edição: lista de
// itens + "Adicionar". O olho tira o item do currículo sem apagar, para
// montar versões diferentes sem perder nada.
import { ArrowDown, ArrowUp, Edit2, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { itensEmOrdem, resumoDoItem } from "../../utils/curriculo.js";

function BotaoIcone({ titulo, onClick, disabled, pressionado, children }) {
  return (
    <button
      type="button"
      className="icon-btn-ghost"
      title={titulo}
      aria-label={titulo}
      aria-pressed={pressionado}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default function ModuloCurriculo({
  modulo,
  itens,
  mesAtual,
  primeiro,
  ultimo,
  onMoverModulo,
  onAdicionar,
  onEditar,
  onExcluir,
  onAlternarOculto,
  onMover,
}) {
  const lista = itensEmOrdem(modulo, itens);
  const manual = modulo.ordenacao === "manual" && lista.length > 1;
  const visiveis = lista.filter((i) => !i.oculto).length;

  return (
    <section className="curriculo-modulo" aria-label={modulo.titulo}>
      <div className="curriculo-modulo-cabecalho">
        <h2 className="titulo-secao">{modulo.titulo}</h2>
        {lista.length > 0 && (
          <span className="secao-lista-contagem">
            {visiveis === lista.length ? lista.length : `${visiveis} de ${lista.length}`}
          </span>
        )}
        <span className="curriculo-modulo-acoes">
          <BotaoIcone titulo={`Subir ${modulo.titulo}`} onClick={() => onMoverModulo(-1)} disabled={primeiro}>
            <ArrowUp size={14} />
          </BotaoIcone>
          <BotaoIcone titulo={`Descer ${modulo.titulo}`} onClick={() => onMoverModulo(1)} disabled={ultimo}>
            <ArrowDown size={14} />
          </BotaoIcone>
          <button type="button" className="btn-secundario btn-pequeno curriculo-adicionar" onClick={onAdicionar}>
            <Plus size={13} /> Adicionar
          </button>
        </span>
      </div>

      {lista.length === 0 && <p className="curriculo-dica">{modulo.dica}</p>}

      {lista.map((item, i) => {
        const { titulo, detalhe } = resumoDoItem(modulo, item, mesAtual);
        return (
          <div key={item.id} className={`curriculo-item${item.oculto ? " oculto" : ""}`}>
            <div className="item-lista-texto">
              <div className="item-lista-titulo">{titulo}</div>
              {(detalhe || item.oculto) && (
                <div className="subtle">
                  {[item.oculto && "Fora do currículo", detalhe].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
            <div className="curriculo-item-acoes">
              {manual && (
                <>
                  <BotaoIcone titulo={`Subir ${titulo}`} onClick={() => onMover(item.id, -1)} disabled={i === 0}>
                    <ArrowUp size={14} />
                  </BotaoIcone>
                  <BotaoIcone
                    titulo={`Descer ${titulo}`}
                    onClick={() => onMover(item.id, 1)}
                    disabled={i === lista.length - 1}
                  >
                    <ArrowDown size={14} />
                  </BotaoIcone>
                </>
              )}
              <BotaoIcone
                titulo={item.oculto ? `Mostrar ${titulo} no currículo` : `Tirar ${titulo} do currículo`}
                pressionado={!item.oculto}
                onClick={() => onAlternarOculto(item.id)}
              >
                {item.oculto ? <EyeOff size={15} /> : <Eye size={15} />}
              </BotaoIcone>
              <BotaoIcone titulo={`Editar ${titulo}`} onClick={() => onEditar(item)}>
                <Edit2 size={14} />
              </BotaoIcone>
              <BotaoIcone titulo={`Excluir ${titulo}`} onClick={() => onExcluir(item.id, titulo)}>
                <Trash2 size={14} />
              </BotaoIcone>
            </div>
          </div>
        );
      })}
    </section>
  );
}
