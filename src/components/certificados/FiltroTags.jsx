// src/components/certificados/FiltroTags.jsx
// Botão de filtro ao lado da busca: marca as tags a mostrar, cria tag nova
// ("+") e exclui tag (com Desfazer no App). As tags são do usuário; nenhuma
// vem pronta.
import { useRef, useState } from "react";
import { Check, ListFilter, Plus, Trash2, X } from "lucide-react";
import useFecharAoClicarFora from "../../hooks/useFecharAoClicarFora";
import { erroDaTag } from "../../utils/certificados";

export default function FiltroTags({ tags, selecionadas, onMudar, onCriar, onExcluir }) {
  const [aberto, setAberto] = useState(false);
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState(null);
  const caixaRef = useRef(null);

  const pararDeCriar = () => {
    setCriando(false);
    setNome("");
    setErro(null);
  };
  useFecharAoClicarFora(caixaRef, aberto, () => {
    setAberto(false);
    pararDeCriar();
  });

  const alternar = (id) =>
    onMudar(selecionadas.includes(id) ? selecionadas.filter((t) => t !== id) : [...selecionadas, id]);

  const criar = (e) => {
    e.preventDefault();
    const problema = erroDaTag(tags, nome);
    if (problema) return setErro(problema);
    if (onCriar(nome.trim()).ok) pararDeCriar();
  };

  return (
    <div className="filtro-tags" ref={caixaRef}>
      <button
        type="button"
        className={`filtro-tags-botao${selecionadas.length ? " ativo" : ""}`}
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-label={selecionadas.length ? `Filtrar por tag (${selecionadas.length} ativas)` : "Filtrar por tag"}
        title="Filtrar por tag"
      >
        <ListFilter size={17} />
        {selecionadas.length > 0 && <span className="filtro-tags-contagem">{selecionadas.length}</span>}
      </button>

      {aberto && (
        <div className="filtro-tags-popover" role="group" aria-label="Tags">
          <div className="filtro-tags-topo">
            <span className="form-card-titulo">Tags</span>
            <button
              type="button"
              className="icon-btn-sm"
              onClick={() => (criando ? pararDeCriar() : setCriando(true))}
              title={criando ? "Cancelar" : "Criar tag"}
              aria-label={criando ? "Cancelar" : "Criar tag"}
            >
              {criando ? <X size={14} /> : <Plus size={14} />}
            </button>
          </div>

          {criando && (
            <form className="filtro-tags-nova" onSubmit={criar}>
              <input
                className="input"
                placeholder="ex: Monitoria"
                value={nome}
                maxLength={40}
                autoFocus
                aria-label="Nome da tag"
                onChange={(e) => {
                  setNome(e.target.value);
                  setErro(null);
                }}
              />
              <button className="btn-primario" title="Criar tag" aria-label="Salvar tag">
                <Check size={15} />
              </button>
            </form>
          )}
          {erro && <span className="form-erro">{erro}</span>}

          {tags.length === 0 && !criando && (
            <p className="subtle filtro-tags-vazio">Nenhuma tag ainda. Toque no + para criar a primeira.</p>
          )}
          {tags.length > 0 && (
            <ul className="lista-tags">
              {tags.map((t) => (
                <li key={t.id} className="lista-tags-item">
                  <label className="lista-tags-opcao">
                    <input type="checkbox" checked={selecionadas.includes(t.id)} onChange={() => alternar(t.id)} />
                    <span>{t.nome}</span>
                  </label>
                  <button
                    type="button"
                    className="icon-btn-ghost"
                    onClick={() => onExcluir(t.id)}
                    title="Excluir tag"
                    aria-label={`Excluir a tag ${t.nome}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selecionadas.length > 0 && (
            <button type="button" className="btn-secundario btn-pequeno" onClick={() => onMudar([])}>
              Limpar filtro
            </button>
          )}
        </div>
      )}
    </div>
  );
}
