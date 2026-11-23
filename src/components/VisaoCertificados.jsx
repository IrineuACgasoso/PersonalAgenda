// src/components/VisaoCertificados.jsx
// Certificados (faculdade, eventos, monitorias, cursos, idiomas…). Lista com
// busca por título e filtro por tags do usuário; tocar na linha abre o
// arquivo. Os arquivos ficam no Firebase Storage: aqui só há o link
// (utils/certificados.js), então a tela não carrega nenhum deles.
import { useState } from "react";
import { Edit2, ExternalLink, FileText, Image as ImagemIcone, Plus, Search, Trash2, X } from "lucide-react";
import { CORES } from "../constants";
import { corVisivel } from "../utils/calendario.js";
import { hrefSeguro } from "../utils/links.js";
import { filtrarCertificados, resumoDoArquivo, tagsDoCertificado } from "../utils/certificados.js";
import EstadoVazio from "./ui/EstadoVazio.jsx";
import FiltroTags from "./certificados/FiltroTags.jsx";
import FormularioCertificado from "./certificados/FormularioCertificado.jsx";

function LinhaCertificado({ c, tags, onEditar, onExcluir }) {
  const cor = corVisivel(c.cor || CORES[0]);
  const href = hrefSeguro(c.arquivo?.url);
  const Icone = c.arquivo?.tipo?.startsWith("image/") ? ImagemIcone : FileText;
  return (
    <div className={`item-lista certificado${href ? " abre" : ""}`} style={{ "--cor-item": cor }}>
      <span className="certificado-icone">
        <Icone size={18} />
      </span>
      <div className="item-lista-texto">
        {/* Link de verdade (o ::after dele cobre a linha): o navegador abre o
            PDF sem bloqueio de popup, e dá para copiar/abrir em nova aba. */}
        {href ? (
          <a className="item-lista-titulo certificado-link" href={href} target="_blank" rel="noopener noreferrer">
            {c.titulo}
          </a>
        ) : (
          <div className="item-lista-titulo">{c.titulo}</div>
        )}
        <div className="item-lista-meta">
          <span className="chip-meta">{resumoDoArquivo(c.arquivo)}</span>
          {tagsDoCertificado(c, tags).map((t) => (
            <span key={t.id} className="chip-meta certificado-tag">
              {t.nome}
            </span>
          ))}
        </div>
      </div>
      {href && <ExternalLink size={14} className="certificado-abrir" aria-hidden="true" />}
      <button
        className="icon-btn-ghost"
        onClick={() => onEditar(c.id)}
        title="Editar certificado"
        aria-label={`Editar ${c.titulo}`}
      >
        <Edit2 size={13} />
      </button>
      <button
        className="icon-btn-ghost"
        onClick={() => onExcluir(c.id)}
        title="Excluir certificado"
        aria-label={`Excluir ${c.titulo}`}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

export default function VisaoCertificados({ certificados, tags, uid, onSalvar, onExcluir, onCriarTag, onExcluirTag }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState([]);
  // null = fechado; "novo" ou o id do certificado em edição.
  const [formulario, setFormulario] = useState(null);

  // Tag excluída (aqui ou em outro aparelho) sai do filtro sozinha.
  const filtroValido = filtro.filter((id) => tags.some((t) => t.id === id));
  const visiveis = filtrarCertificados(certificados, { busca, tags: filtroValido });
  const emEdicao = certificados.find((c) => c.id === formulario);

  return (
    <div>
      <div className="certificados-topo">
        <h1 className="titulo-pagina">Certificados</h1>
        <div className="certificados-busca">
          <div className="certificados-campo">
            <Search size={15} className="certificados-lupa" />
            <input
              className="input"
              placeholder="Buscar por título"
              aria-label="Buscar certificado por título"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {busca && (
              <button className="certificados-limpar" onClick={() => setBusca("")} aria-label="Limpar busca">
                <X size={14} />
              </button>
            )}
          </div>
          <FiltroTags
            tags={tags}
            selecionadas={filtroValido}
            onMudar={setFiltro}
            onCriar={onCriarTag}
            onExcluir={onExcluirTag}
          />
        </div>
        <button
          className="btn-primario certificados-novo"
          onClick={() => setFormulario("novo")}
          title="Adicionar certificado"
          aria-label="Adicionar certificado"
        >
          <Plus size={18} />
        </button>
      </div>

      {certificados.length === 0 ? (
        <EstadoVazio texto="Nenhum certificado guardado ainda" />
      ) : visiveis.length === 0 ? (
        <EstadoVazio texto="Nenhum certificado com essa busca ou filtro" pequeno />
      ) : (
        <div className="certificados-lista">
          {visiveis.map((c) => (
            <LinhaCertificado key={c.id} c={c} tags={tags} onEditar={setFormulario} onExcluir={onExcluir} />
          ))}
        </div>
      )}

      {(formulario === "novo" || emEdicao) && (
        <FormularioCertificado
          key={formulario}
          certificado={emEdicao}
          corInicial={CORES[certificados.length % CORES.length]}
          tags={tags}
          uid={uid}
          onSalvar={onSalvar}
          onFechar={() => setFormulario(null)}
        />
      )}
    </div>
  );
}
