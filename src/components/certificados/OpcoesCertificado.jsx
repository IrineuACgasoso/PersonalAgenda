// src/components/certificados/OpcoesCertificado.jsx
// Tocar num certificado: Abrir ou Baixar. No PWA instalado o arquivo abre sem
// as opções do navegador, então o "baixar" precisa existir aqui dentro.
import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { Modal } from "../ui/Dialogos.jsx";
import useDialogos from "../../hooks/useDialogos";
import { baixarArquivo, imagemEmPdf, salvarNoAparelho } from "../../arquivos";
import { hrefSeguro } from "../../utils/links";
import { mensagemErroDownload, nomeParaBaixar, opcoesDeDownload, resumoDoArquivo } from "../../utils/certificados";

export default function OpcoesCertificado({ certificado, cor, onFechar }) {
  const { notificar } = useDialogos();
  const [baixando, setBaixando] = useState(null); // id da opção em andamento
  const [erro, setErro] = useState(null);
  const controleRef = useRef(null);
  const { arquivo, titulo } = certificado;
  const href = hrefSeguro(arquivo?.url);

  // Fechou no meio: não continua baixando escondido.
  useEffect(() => () => controleRef.current?.abort(), []);

  const baixar = async (opcao) => {
    if (baixando) return;
    const controle = new AbortController();
    controleRef.current = controle;
    setErro(null);
    setBaixando(opcao.id);
    const r = await baixarArquivo(href, controle.signal);
    let { blob, motivo } = r;
    if (r.ok && opcao.converter) {
      blob = await imagemEmPdf(r.blob);
      if (!blob) motivo = "conversao";
    }
    if (controle.signal.aborted) return;
    setBaixando(null);
    if (motivo) return setErro(mensagemErroDownload(motivo));
    const nome = nomeParaBaixar(titulo, opcao.extensao);
    salvarNoAparelho(blob, nome);
    notificar(`"${nome}" baixado.`);
    onFechar();
  };

  return (
    <Modal
      titulo={titulo}
      rotuloId="opcoes-certificado"
      classe="opcoes-certificado"
      estilo={{ "--cor-item": cor }}
      onFechar={onFechar}
    >
      <span className="chip-meta">{resumoDoArquivo(arquivo)}</span>
      <div className="opcoes-certificado-lista">
        {/* Link de verdade: o navegador abre sem bloqueio de popup. */}
        <a
          className="opcao-certificado"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onFechar}
          data-autofoco=""
        >
          <ExternalLink size={18} /> Abrir
        </a>
        {/* aria-disabled, e não disabled: um botão desabilitado perde o foco e
            o Esc deixaria de fechar a caixa. */}
        {opcoesDeDownload(arquivo).map((o) => (
          <button
            key={o.id}
            type="button"
            className="opcao-certificado"
            aria-disabled={!!baixando}
            onClick={() => baixar(o)}
          >
            <Download size={18} /> {baixando === o.id ? "Baixando…" : o.rotulo}
          </button>
        ))}
      </div>
      {erro && (
        <p className="form-erro opcoes-certificado-erro" role="alert">
          {erro}
        </p>
      )}
    </Modal>
  );
}
