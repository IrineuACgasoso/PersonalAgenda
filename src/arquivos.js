// src/arquivos.js
//
// Arquivos dos certificados no Firebase Storage (users/{uid}/certificados/*).
// É o único lugar que fala com o Storage. O SDK entra por import() só na hora
// de enviar/apagar (como o messaging): a abertura do app não baixa nada, e
// ABRIR um certificado nem passa por aqui (é um link comum, com a URL salva).
//
// Não passa pelo persist(): quem grava o registro no AppData é o App, depois
// que o arquivo já subiu. A segurança está em storage.rules.
import { app } from "./firebase";
import { uid as gerarId } from "./utils/id";
import { caminhoDoArquivo, mensagemErroArquivo, tipoDoArquivo } from "./utils/certificados";

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
