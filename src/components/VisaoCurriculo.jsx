// src/components/VisaoCurriculo.jsx
// Gerador de currículo: à esquerda os módulos editáveis, à direita a prévia
// da página (no celular, um ou outro). "Baixar PDF" sempre gera a versão
// atual, no próprio aparelho (funciona offline). Formato e regras em
// utils/curriculo.js; diagramação em utils/curriculoLayout.js.
// Português | Inglês (#59): mesma tela; em inglês o lápis vira tradução.
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Download, Edit2, Languages, Lightbulb, Plus } from "lucide-react";
import { useHoje } from "../hooks/useHoje";
import useDialogos from "../hooks/useDialogos";
import { salvarNoAparelho } from "../arquivos";
import {
  CAMPOS_DADOS,
  CAMPOS_MODULO_LIVRE,
  CAMPOS_RESUMO,
  DICAS_FIXAS,
  camposDeTraducao,
  camposSemTraducao,
  documentoDoCurriculo,
  erroDoModuloLivre,
  modulosDoCurriculo,
  nomeDoArquivo,
  resumoComTraducao,
  sanitizarCurriculo,
  traducaoPodeEstarVelha,
} from "../utils/curriculo.js";
import { IDIOMAS, TEXTOS } from "../utils/curriculoIdiomas.js";
import { PAGINA, montarPaginas } from "../utils/curriculoLayout.js";
import { revisarCurriculo } from "../utils/curriculoRevisao.js";
import { pdfDeTexto } from "../utils/pdf.js";
import EscolherCertificado from "./curriculo/EscolherCertificado.jsx";
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

function BlocoFixo({ titulo, ingles, faltaTraduzir, onEditar, children }) {
  return (
    <section className="curriculo-modulo" aria-label={titulo}>
      <div className="curriculo-modulo-cabecalho">
        <h2 className="titulo-secao">{titulo}</h2>
        <span className="curriculo-modulo-acoes">
          <button type="button" className="btn-secundario btn-pequeno curriculo-adicionar" onClick={onEditar}>
            {ingles ? <Languages size={13} /> : <Edit2 size={12} />} {ingles ? "Traduzir" : "Editar"}
          </button>
        </span>
      </div>
      {children}
      {faltaTraduzir && <div className="curriculo-falta">Falta traduzir</div>}
    </section>
  );
}

export default function VisaoCurriculo({
  curriculo: bruto,
  certificados,
  tagsCertificados,
  onSalvarDados,
  onSalvarTraducaoDados,
  onSalvarResumo,
  onSalvarItem,
  onSalvarTraducao,
  onSalvarModulo,
  onExcluirModulo,
  onAlternarOculto,
  onMoverItem,
  onMoverModulo,
  onExcluirItem,
}) {
  const mesAtual = useHoje().slice(0, 7);
  const { avisar, notificar } = useDialogos();
  // Formulário aberto: { tipo: "dados" | "resumo" | "certificados" },
  // { tipo: "item", modulo, item?, inicial? } ou { tipo: "modulo", modulo? }.
  // Em inglês, dados/resumo/item abrem com `traducao: campos a traduzir`.
  const [edicao, setEdicao] = useState(null);
  const [idioma, setIdioma] = useState("pt");
  const ingles = idioma === "en";
  const [vista, setVista] = useState("editar"); // só muda algo no celular

  const curriculo = useMemo(() => sanitizarCurriculo(bruto), [bruto]);
  const { doc, paginas, avisos } = useMemo(() => {
    const doc = documentoDoCurriculo(curriculo, mesAtual, idioma);
    const { paginas, perdidos } = montarPaginas(doc);
    const avisos = revisarCurriculo(curriculo, { paginas: paginas.length, perdidos, mesAtual, idioma });
    return { doc, paginas, avisos };
  }, [curriculo, mesAtual, idioma]);

  const baixar = () => {
    if (!doc.nome) {
      avisar("Preencha pelo menos o seu nome em “Dados e contato”.", { titulo: "Baixar currículo" });
      return;
    }
    const { documento, lang } = TEXTOS[idioma];
    const pdf = pdfDeTexto(paginas, { ...PAGINA, titulo: `${documento} - ${doc.nome}`, autor: doc.nome, lang });
    salvarNoAparelho(new Blob([pdf], { type: "application/pdf" }), nomeDoArquivo(curriculo, idioma));
  };

  const modulos = modulosDoCurriculo(curriculo);
  const fechar = () => setEdicao(null);
  const resumo = resumoComTraducao(curriculo);

  // Em português abre o formulário normal; em inglês, o de tradução.
  const editar = (alvo, campos, valor) => {
    if (!ingles) return setEdicao(alvo);
    const traducao = camposDeTraducao(campos, valor);
    if (traducao.length === 0) {
      avisar("Não há texto para traduzir aqui. Preencha primeiro em português.", { titulo: "Traduzir" });
      return;
    }
    setEdicao({ ...alvo, traducao });
  };

  // Mudou o português de algo já traduzido: lembra de conferir o inglês.
  const lembrarTraducao = (r, campos, antes, depois) => {
    if (r.ok && antes && traducaoPodeEstarVelha(campos, antes, depois)) {
      notificar("Salvo. Confira também a tradução em inglês.");
    }
    return r;
  };

  const salvarItem = ({ modulo, item }, rascunho) => {
    if (!modulos.some((m) => m.id === modulo.id)) {
      avisar(`O módulo “${modulo.titulo}” foi excluído. Copie o que precisar antes de fechar.`);
      return { ok: false };
    }
    const r = onSalvarItem(modulo.id, { ...rascunho, id: item?.id });
    return lembrarTraducao(r, modulo.campos, item, rascunho);
  };

  return (
    <div className={`curriculo vista-${vista}`}>
      <div className="curriculo-topo">
        <h1 className="titulo-pagina">Currículo</h1>
        <div className="curriculo-idiomas" role="group" aria-label="Língua do currículo">
          {IDIOMAS.map(({ id, rotulo }) => (
            <button
              key={id}
              type="button"
              className={`filtro-chip${idioma === id ? " ativo" : ""}`}
              aria-pressed={idioma === id}
              onClick={() => setIdioma(id)}
            >
              {rotulo}
            </button>
          ))}
        </div>
        <button type="button" className="btn-primario" onClick={baixar}>
          <Download size={16} /> {ingles ? "Baixar PDF em inglês" : "Baixar PDF"}
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

          {ingles && (
            <p className="curriculo-dica">
              É o mesmo currículo: itens, datas, links, ordem e o que está oculto valem para as duas línguas. Aqui você
              só traduz os textos; o que ficar sem tradução sai em português.
            </p>
          )}

          <BlocoFixo
            titulo="Dados e contato"
            ingles={ingles}
            faltaTraduzir={ingles && camposSemTraducao(CAMPOS_DADOS, curriculo.dados).length > 0}
            onEditar={() => editar({ tipo: "dados" }, CAMPOS_DADOS, curriculo.dados)}
          >
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

          <BlocoFixo
            titulo="Resumo"
            ingles={ingles}
            faltaTraduzir={ingles && camposSemTraducao(CAMPOS_RESUMO, resumo).length > 0}
            onEditar={() => editar({ tipo: "resumo" }, CAMPOS_RESUMO, resumo)}
          >
            <p className="curriculo-dica">
              {(resumo.resumo && ingles && curriculo.resumoEn.trim()) || resumo.resumo || DICAS_FIXAS.resumo}
            </p>
          </BlocoFixo>

          {modulos.map((m, i) => (
            <ModuloCurriculo
              key={m.id}
              modulo={m}
              itens={curriculo.secoes[m.id]}
              mesAtual={mesAtual}
              idioma={idioma}
              primeiro={i === 0}
              ultimo={i === modulos.length - 1}
              onMoverModulo={(passo) => onMoverModulo(m.id, passo)}
              onAdicionar={() => setEdicao({ tipo: "item", modulo: m })}
              onPuxar={
                m.id === "certificacoes" && certificados.length > 0
                  ? () => setEdicao({ tipo: "certificados", modulo: m })
                  : undefined
              }
              onEditarModulo={() => setEdicao({ tipo: "modulo", modulo: m })}
              onExcluirModulo={() => onExcluirModulo(m.id, m.titulo, curriculo.secoes[m.id].length)}
              onEditar={(item) => editar({ tipo: "item", modulo: m, item }, m.campos, item)}
              onExcluir={(id, titulo) => onExcluirItem(m.id, id, titulo)}
              onAlternarOculto={(id) => onAlternarOculto(m.id, id)}
              onMover={(id, passo) => onMoverItem(m.id, id, passo)}
            />
          ))}

          <button
            type="button"
            className="btn-secundario curriculo-novo-modulo"
            onClick={() => setEdicao({ tipo: "modulo" })}
          >
            <Plus size={15} /> Adicionar módulo
          </button>
        </div>

        <div className="curriculo-previa">
          <PreviaCurriculo paginas={paginas} />
        </div>
      </div>

      {edicao?.tipo === "dados" && (
        <FormularioCurriculo
          titulo={edicao.traducao ? "Traduzir: Dados e contato" : "Dados e contato"}
          dica={edicao.traducao ? undefined : DICAS_FIXAS.dados}
          campos={edicao.traducao || CAMPOS_DADOS}
          valor={edicao.traducao ? curriculo.dados.en : curriculo.dados}
          onSalvar={(r) =>
            edicao.traducao
              ? onSalvarTraducaoDados(r)
              : lembrarTraducao(onSalvarDados(r), CAMPOS_DADOS, curriculo.dados, r)
          }
          onFechar={fechar}
        />
      )}
      {edicao?.tipo === "resumo" && (
        <FormularioCurriculo
          titulo={edicao.traducao ? "Traduzir: Resumo" : "Resumo"}
          dica={edicao.traducao ? undefined : DICAS_FIXAS.resumo}
          campos={edicao.traducao || CAMPOS_RESUMO}
          valor={edicao.traducao ? resumo.en : resumo}
          onSalvar={(r) =>
            edicao.traducao
              ? onSalvarResumo(r.resumo, "en")
              : lembrarTraducao(onSalvarResumo(r.resumo, "pt"), CAMPOS_RESUMO, resumo, r)
          }
          onFechar={fechar}
        />
      )}
      {edicao?.tipo === "item" && edicao.traducao && (
        <FormularioCurriculo
          titulo={`Traduzir: ${edicao.modulo.titulo}`}
          campos={edicao.traducao}
          valor={edicao.item.en}
          onSalvar={(r) => onSalvarTraducao(edicao.modulo.id, edicao.item.id, r)}
          onFechar={fechar}
        />
      )}
      {edicao?.tipo === "item" && !edicao.traducao && (
        <FormularioCurriculo
          titulo={edicao.item ? `Editar: ${edicao.modulo.titulo}` : edicao.modulo.novo}
          dica={edicao.modulo.dica}
          campos={edicao.modulo.campos}
          valor={edicao.item || edicao.inicial}
          onSalvar={(r) => salvarItem(edicao, r)}
          onFechar={fechar}
        />
      )}
      {edicao?.tipo === "modulo" && (
        <FormularioCurriculo
          titulo={edicao.modulo ? "Renomear módulo" : "Novo módulo"}
          dica="Para o que não cabe nos outros (voluntariado, liderança, hobbies técnicos). Os itens têm título, organização, período e pontos."
          campos={CAMPOS_MODULO_LIVRE}
          valor={edicao.modulo}
          validar={(r) => erroDoModuloLivre(curriculo, r.titulo, edicao.modulo?.id)}
          onSalvar={(r) => onSalvarModulo({ ...r, id: edicao.modulo?.id })}
          onFechar={fechar}
        />
      )}
      {edicao?.tipo === "certificados" && (
        <EscolherCertificado
          certificados={certificados}
          tags={tagsCertificados}
          titulosUsados={curriculo.secoes.certificacoes.map((i) => i.titulo)}
          onEscolher={(c) => setEdicao({ tipo: "item", modulo: edicao.modulo, inicial: { titulo: c.titulo } })}
          onFechar={fechar}
        />
      )}
    </div>
  );
}
