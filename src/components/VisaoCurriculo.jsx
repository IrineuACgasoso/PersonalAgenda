// src/components/VisaoCurriculo.jsx
// Gerador de currículo: à esquerda os módulos editáveis, à direita a prévia
// da página (no celular, um ou outro). "Baixar PDF" sempre gera a versão
// atual, no próprio aparelho (funciona offline). Formato e regras em
// utils/curriculo.js; diagramação em utils/curriculoLayout.js.
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Download, Edit2, Lightbulb } from "lucide-react";
import { useHoje } from "../hooks/useHoje";
import useDialogos from "../hooks/useDialogos";
import { salvarNoAparelho } from "../arquivos";
import {
  CAMPOS_DADOS,
  CAMPOS_RESUMO,
  DICAS_FIXAS,
  documentoDoCurriculo,
  moduloPorId,
  nomeDoArquivo,
  sanitizarCurriculo,
} from "../utils/curriculo.js";
import { PAGINA, montarPaginas } from "../utils/curriculoLayout.js";
import { revisarCurriculo } from "../utils/curriculoRevisao.js";
import { pdfDeTexto } from "../utils/pdf.js";
import FormularioCurriculo from "./curriculo/FormularioCurriculo.jsx";
import ModuloCurriculo from "./curriculo/ModuloCurriculo.jsx";
import PreviaCurriculo from "./curriculo/PreviaCurriculo.jsx";

function Revisao({ avisos }) {
  const [aberta, setAberta] = useState(false);
  const essenciais = avisos.filter((a) => a.nivel === "essencial").length;
  if (avisos.length === 0) {
    return (
      <div className="curriculo-revisao ok">
        <span className="curriculo-revisao-topo">
          <CheckCircle2 size={16} /> Revisão: tudo certo.
        </span>
      </div>
    );
  }
  const texto = [
    essenciais > 0 && `${essenciais} ${essenciais === 1 ? "item essencial" : "itens essenciais"}`,
    avisos.length > essenciais &&
      `${avisos.length - essenciais} ${avisos.length - essenciais === 1 ? "sugestão" : "sugestões"}`,
  ]
    .filter(Boolean)
    .join(" e ");
  return (
    <div className={`curriculo-revisao${essenciais > 0 ? " essencial" : ""}`}>
      <button
        type="button"
        className="curriculo-revisao-topo"
        onClick={() => setAberta((a) => !a)}
        aria-expanded={aberta}
      >
        {essenciais > 0 ? <AlertTriangle size={16} /> : <Lightbulb size={16} />}
        <span>Revisão: {texto}</span>
        <ChevronDown size={15} className={`secao-lista-seta${aberta ? "" : " fechada"}`} />
      </button>
      {aberta && (
        <ul className="curriculo-revisao-lista">
          {avisos.map((a) => (
            <li key={a.id} className={a.nivel}>
              {a.texto}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BlocoFixo({ titulo, onEditar, children }) {
  return (
    <section className="curriculo-modulo" aria-label={titulo}>
      <div className="curriculo-modulo-cabecalho">
        <h2 className="titulo-secao">{titulo}</h2>
        <span className="curriculo-modulo-acoes">
          <button type="button" className="btn-secundario btn-pequeno curriculo-adicionar" onClick={onEditar}>
            <Edit2 size={12} /> Editar
          </button>
        </span>
      </div>
      {children}
    </section>
  );
}

export default function VisaoCurriculo({
  curriculo: bruto,
  onSalvarDados,
  onSalvarResumo,
  onSalvarItem,
  onAlternarOculto,
  onMoverItem,
  onMoverModulo,
  onExcluirItem,
}) {
  const mesAtual = useHoje().slice(0, 7);
  const { avisar } = useDialogos();
  // Formulário aberto: { tipo: "dados" | "resumo" } ou { tipo: "item", modulo, item? }.
  const [edicao, setEdicao] = useState(null);
  const [vista, setVista] = useState("editar"); // só muda algo no celular

  const curriculo = useMemo(() => sanitizarCurriculo(bruto), [bruto]);
  const { doc, paginas, avisos } = useMemo(() => {
    const doc = documentoDoCurriculo(curriculo, mesAtual);
    const { paginas, perdidos } = montarPaginas(doc);
    const avisos = revisarCurriculo(curriculo, { paginas: paginas.length, perdidos, mesAtual });
    return { doc, paginas, avisos };
  }, [curriculo, mesAtual]);

  const baixar = () => {
    if (!doc.nome) {
      avisar("Preencha pelo menos o seu nome em “Dados e contato”.", { titulo: "Baixar currículo" });
      return;
    }
    const pdf = pdfDeTexto(paginas, { ...PAGINA, titulo: `Currículo - ${doc.nome}`, autor: doc.nome });
    salvarNoAparelho(new Blob([pdf], { type: "application/pdf" }), nomeDoArquivo(curriculo));
  };

  const modulos = curriculo.ordem.map(moduloPorId);
  const fechar = () => setEdicao(null);

  return (
    <div className={`curriculo vista-${vista}`}>
      <div className="curriculo-topo">
        <h1 className="titulo-pagina">Currículo</h1>
        <button type="button" className="btn-primario" onClick={baixar}>
          <Download size={16} /> Baixar PDF
        </button>
      </div>

      <div className="curriculo-vistas">
        {[
          ["editar", "Editar"],
          ["previa", "Prévia"],
        ].map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            className={`filtro-chip${vista === id ? " ativo" : ""}`}
            aria-pressed={vista === id}
            onClick={() => setVista(id)}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div className="curriculo-corpo">
        <div className="curriculo-edicao">
          <Revisao avisos={avisos} />

          <BlocoFixo titulo="Dados e contato" onEditar={() => setEdicao({ tipo: "dados" })}>
            {doc.nome || doc.cargo || doc.contatos.length > 0 ? (
              <>
                {doc.nome && <div className="item-lista-titulo">{doc.nome}</div>}
                <div className="subtle curriculo-contatos">
                  {[doc.cargo, ...doc.contatos.map((c) => c.texto)].filter(Boolean).join(" · ")}
                </div>
              </>
            ) : (
              <p className="curriculo-dica">{DICAS_FIXAS.dados}</p>
            )}
          </BlocoFixo>

          <BlocoFixo titulo="Resumo" onEditar={() => setEdicao({ tipo: "resumo" })}>
            <p className="curriculo-dica">{curriculo.resumo.trim() || DICAS_FIXAS.resumo}</p>
          </BlocoFixo>

          {modulos.map((m, i) => (
            <ModuloCurriculo
              key={m.id}
              modulo={m}
              itens={curriculo.secoes[m.id]}
              mesAtual={mesAtual}
              primeiro={i === 0}
              ultimo={i === modulos.length - 1}
              onMoverModulo={(passo) => onMoverModulo(m.id, passo)}
              onAdicionar={() => setEdicao({ tipo: "item", modulo: m })}
              onEditar={(item) => setEdicao({ tipo: "item", modulo: m, item })}
              onExcluir={(id, titulo) => onExcluirItem(m.id, id, titulo)}
              onAlternarOculto={(id) => onAlternarOculto(m.id, id)}
              onMover={(id, passo) => onMoverItem(m.id, id, passo)}
            />
          ))}
        </div>

        <div className="curriculo-previa">
          <PreviaCurriculo paginas={paginas} />
        </div>
      </div>

      {edicao?.tipo === "dados" && (
        <FormularioCurriculo
          titulo="Dados e contato"
          dica={DICAS_FIXAS.dados}
          campos={CAMPOS_DADOS}
          valor={curriculo.dados}
          onSalvar={onSalvarDados}
          onFechar={fechar}
        />
      )}
      {edicao?.tipo === "resumo" && (
        <FormularioCurriculo
          titulo="Resumo"
          dica={DICAS_FIXAS.resumo}
          campos={CAMPOS_RESUMO}
          valor={{ resumo: curriculo.resumo }}
          onSalvar={(r) => onSalvarResumo(r.resumo)}
          onFechar={fechar}
        />
      )}
      {edicao?.tipo === "item" && (
        <FormularioCurriculo
          titulo={edicao.item ? `Editar: ${edicao.modulo.titulo}` : edicao.modulo.novo}
          dica={edicao.modulo.dica}
          campos={edicao.modulo.campos}
          valor={edicao.item}
          onSalvar={(r) => onSalvarItem(edicao.modulo.id, { ...r, id: edicao.item?.id })}
          onFechar={fechar}
        />
      )}
    </div>
  );
}
