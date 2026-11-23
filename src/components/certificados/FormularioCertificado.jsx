// src/components/certificados/FormularioCertificado.jsx
// Modal de adicionar/editar certificado. O arquivo sobe primeiro para o
// Storage; só depois o registro é gravado (nunca existe um certificado
// apontando para um arquivo que não subiu). Se a gravação for recusada, o
// arquivo recém-enviado é apagado.
import { useEffect, useRef, useState } from "react";
import { FileText, FileUp } from "lucide-react";
import { Modal } from "../ui/Dialogos.jsx";
import SeletorCor from "../ui/SeletorCor.jsx";
import SeletorTags from "./SeletorTags.jsx";
import { apagarArquivo, enviarArquivo } from "../../arquivos";
import { uid as gerarId } from "../../utils/id";
import { hrefSeguro } from "../../utils/links";
import { ACEITOS, erroDoArquivo, erroDoCertificado, resumoDoArquivo, textoTamanho } from "../../utils/certificados";

const MSG_SEM_LOGIN = "Entre com a sua conta Google (menu lateral) para guardar arquivos.";
const MSG_OFFLINE = "Você está sem internet. O arquivo precisa dela para ser enviado.";

export default function FormularioCertificado({ certificado, corInicial, tags, uid, onSalvar, onFechar }) {
  const [titulo, setTitulo] = useState(certificado?.titulo || "");
  const [cor, setCor] = useState(certificado?.cor || corInicial);
  const [tagsEscolhidas, setTagsEscolhidas] = useState(certificado?.tags || []);
  const [novoArquivo, setNovoArquivo] = useState(null);
  const [erro, setErro] = useState(null);
  // null = parado; 0..1 = enviando.
  const [progresso, setProgresso] = useState(null);
  const inputRef = useRef(null);
  const envioRef = useRef(null);
  const enviando = progresso !== null;
  const atual = certificado?.arquivo;

  // Fechou no meio do envio: não deixa subindo escondido.
  useEffect(() => () => envioRef.current?.cancelar(), []);

  const escolher = (e) => {
    const arquivo = e.target.files?.[0];
    // Permite escolher o mesmo arquivo de novo depois de um erro.
    e.target.value = "";
    if (!arquivo) return;
    const problema = erroDoArquivo(arquivo);
    setErro(problema);
    if (!problema) setNovoArquivo(arquivo);
  };

  const salvar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    const problema = erroDoCertificado({ titulo, arquivo: novoArquivo || atual });
    if (problema) return setErro(problema);

    let arquivo = atual;
    if (novoArquivo) {
      if (!uid) return setErro(MSG_SEM_LOGIN);
      if (!navigator.onLine) return setErro(MSG_OFFLINE);
      setErro(null);
      setProgresso(0);
      const envio = enviarArquivo({ uid, arquivo: novoArquivo, aoProgredir: setProgresso });
      envioRef.current = envio;
      const r = await envio.promessa;
      envioRef.current = null;
      if (r.cancelado) return;
      setProgresso(null);
      if (!r.ok) return setErro(r.mensagem);
      arquivo = r.arquivo;
    }

    const gravacao = onSalvar({
      id: certificado?.id || gerarId(),
      titulo: titulo.trim(),
      cor,
      tags: tagsEscolhidas.filter((id) => tags.some((t) => t.id === id)),
      arquivo,
    });
    if (gravacao.ok) return onFechar();
    if (novoArquivo) apagarArquivo(arquivo.caminho);
  };

  const fraseArquivo = novoArquivo
    ? `${textoTamanho(novoArquivo.size)} · será enviado ao salvar`
    : atual
      ? `${resumoDoArquivo(atual)} · toque para trocar`
      : "PDF, imagem, Word ou PowerPoint, até 20 MB";

  return (
    <Modal
      titulo={certificado ? "Editar certificado" : "Novo certificado"}
      rotuloId="form-certificado"
      largo
      // Um toque fora não pode abortar um envio no meio; o "Cancelar" pode.
      onFechar={() => !enviando && onFechar()}
    >
      <form className="form-certificado" onSubmit={salvar}>
        <div className="form-campo">
          <label className="form-campo-rotulo" htmlFor="certificado-titulo">
            Título
          </label>
          <input
            id="certificado-titulo"
            className="input"
            placeholder="ex: Monitoria de Cálculo 2026.1"
            value={titulo}
            maxLength={120}
            onChange={(e) => setTitulo(e.target.value)}
            data-autofoco=""
          />
        </div>

        <div className="form-campo">
          <SeletorCor valor={cor} onChange={setCor} adiarMs={0} label="Cor" />
        </div>

        <div className="form-campo">
          <span className="form-campo-rotulo">Tags</span>
          <SeletorTags tags={tags} valor={tagsEscolhidas} onMudar={setTagsEscolhidas} />
        </div>

        <div className="form-campo">
          <span className="form-campo-rotulo">Arquivo</span>
          <input ref={inputRef} type="file" accept={ACEITOS} onChange={escolher} hidden />
          <button
            type="button"
            className="certificado-arquivo"
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
          >
            {novoArquivo || atual ? <FileText size={18} /> : <FileUp size={18} />}
            <span className="certificado-arquivo-texto">
              <span className="certificado-arquivo-nome">{novoArquivo?.name || atual?.nome || "Escolher arquivo"}</span>
              <span className="subtle">{fraseArquivo}</span>
            </span>
          </button>
          {atual && !novoArquivo && hrefSeguro(atual.url) && (
            <a className="certificado-ver" href={hrefSeguro(atual.url)} target="_blank" rel="noopener noreferrer">
              Ver o arquivo atual
            </a>
          )}
          {!uid && <span className="subtle">{MSG_SEM_LOGIN}</span>}
        </div>

        {enviando && (
          <div
            className="certificado-progresso"
            role="progressbar"
            aria-label="Enviando o arquivo"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progresso * 100)}
          >
            <span style={{ width: `${Math.round(progresso * 100)}%` }} />
          </div>
        )}
        {erro && (
          <span className="form-erro" role="alert">
            {erro}
          </span>
        )}

        <div className="modal-acoes">
          <button type="button" className="btn-secundario" onClick={onFechar}>
            Cancelar
          </button>
          <button className="btn-primario" disabled={enviando}>
            {enviando ? `Enviando ${Math.round(progresso * 100)}%` : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
