// src/arquivos.js
//
// Arquivos dos certificados no Firebase Storage (users/{uid}/certificados/*).
// É o único lugar que fala com o Storage. O SDK entra por import() só na hora
// de enviar/apagar (como o messaging): a abertura do app não baixa nada, e
// ABRIR um certificado nem passa por aqui (é um link comum, com a URL salva).
//
// BAIXAR também não usa o SDK: é um fetch da mesma URL, que o bucket precisa
// liberar (storage.cors.json; é configuração do bucket, não das regras).
//
// Não passa pelo persist(): quem grava o registro no AppData é o App, depois
// que o arquivo já subiu. A segurança está em storage.rules.
import { app } from "./firebase";
import { uid as gerarId } from "./utils/id";
import { caminhoDoArquivo, mensagemErroArquivo, tipoDoArquivo } from "./utils/certificados";
import { pdfDeJpeg } from "./utils/pdf";

// Limite do canvas no iOS (~16,7 megapixels).
const LADO_MAXIMO_IMAGEM = 4000;

async function abrirStorage() {
  const sdk = await import("firebase/storage");
  const storage = sdk.getStorage(app);
  // Padrão do SDK: insistir 10 min (o usuário ficaria olhando para 0%).
  storage.maxUploadRetryTime = 45000;
  storage.maxOperationRetryTime = 15000;
  return { sdk, storage };
}

/** Apaga do Storage. true = não existe mais (inclusive se já não existia). */
export async function apagarArquivo(caminho) {
  try {
    const { sdk, storage } = await abrirStorage();
    await sdk.deleteObject(sdk.ref(storage, caminho));
    return true;
  } catch (err) {
    if (err?.code === "storage/object-not-found") return true;
    console.warn("Não foi possível apagar o arquivo:", caminho, err?.code || err);
    return false;
  }
}

/**
 * Envia o arquivo. Devolve { promessa, cancelar }; a promessa nunca rejeita:
 * { ok: true, arquivo } | { ok: false, cancelado, mensagem }.
 */
export function enviarArquivo({ uid, arquivo, aoProgredir }) {
  let tarefa = null;
  let cancelado = false;

  const enviar = async () => {
    try {
      const { sdk, storage } = await abrirStorage();
      if (cancelado) return { ok: false, cancelado: true, mensagem: null };
      const caminho = caminhoDoArquivo(uid, gerarId(), arquivo.name);
      const tipo = tipoDoArquivo(arquivo.name);
      const destino = sdk.ref(storage, caminho);
      tarefa = sdk.uploadBytesResumable(destino, arquivo, {
        contentType: tipo,
        // Abre no navegador em vez de baixar, com o nome original.
        contentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(arquivo.name)}`,
        // O nome no Storage é único e o conteúdo nunca muda: o navegador pode
        // guardar para sempre, e abrir de novo não gasta rede.
        cacheControl: "private, max-age=31536000, immutable",
      });
      tarefa.on("state_changed", (s) => aoProgredir?.(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0));
      await tarefa;
      const url = await sdk.getDownloadURL(destino);
      if (cancelado) {
        // Cancelou no instante em que terminou: não deixa o arquivo solto.
        await apagarArquivo(caminho);
        return { ok: false, cancelado: true, mensagem: null };
      }
      return { ok: true, arquivo: { caminho, url, nome: arquivo.name, tipo, tamanho: arquivo.size } };
    } catch (err) {
      if (cancelado || err?.code === "storage/canceled") return { ok: false, cancelado: true, mensagem: null };
      console.error("Erro ao enviar arquivo:", err);
      return { ok: false, cancelado: false, mensagem: mensagemErroArquivo(err?.code) };
    }
  };

  return {
    promessa: enviar(),
    cancelar: () => {
      cancelado = true;
      tarefa?.cancel();
    },
  };
}

/**
 * Baixa o arquivo para a memória (o atributo `download` de um link é ignorado
 * em outro domínio). Nunca rejeita: { ok: true, blob } | { ok: false, motivo }
 * (texto em mensagemErroDownload).
 */
export async function baixarArquivo(url, sinal) {
  try {
    // no-store: uma resposta guardada antes de liberar o CORS no bucket não
    // tem o cabeçalho e seria recusada para sempre (o cache é de 1 ano).
    const r = await fetch(url, { cache: "no-store", credentials: "omit", signal: sinal });
    if (r.ok) return { ok: true, blob: await r.blob() };
    return { ok: false, motivo: r.status === 404 ? "naoExiste" : "outro" };
  } catch (err) {
    if (sinal?.aborted) return { ok: false, motivo: "cancelado" };
    console.warn("Erro ao baixar arquivo:", err);
    // O navegador não diz se foi CORS ou rede; offline pelo menos dá para saber.
    return { ok: false, motivo: navigator.onLine ? "bloqueado" : "offline" };
  }
}

/** Imagem (PNG, JPG, WEBP) → Blob de um PDF de uma página; null se não deu. */
export async function imagemEmPdf(blob) {
  const url = URL.createObjectURL(blob);
  try {
    // Passa sempre pelo canvas, até o JPG: aplica a rotação da foto (EXIF),
    // que o PDF ignoraria, e garante JPEG RGB.
    const imagem = new Image();
    imagem.src = url;
    await imagem.decode();
    const escala = Math.min(1, LADO_MAXIMO_IMAGEM / Math.max(imagem.naturalWidth, imagem.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(imagem.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(imagem.naturalHeight * escala));
    const ctx = canvas.getContext("2d");
    // JPEG não tem transparência: sem isto, PNG transparente sairia preto.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height);
    const jpeg = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    const bytes = new Uint8Array(await jpeg.arrayBuffer());
    return new Blob([pdfDeJpeg(bytes, canvas.width, canvas.height)], { type: "application/pdf" });
  } catch (err) {
    console.warn("Erro ao converter imagem em PDF:", err);
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Entrega o arquivo ao aparelho (pasta Downloads). */
export function salvarNoAparelho(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Não na hora: o Android ainda está lendo o arquivo depois do clique.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
