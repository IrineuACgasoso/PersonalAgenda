// Envio/exclusão de arquivos no Storage (src/arquivos.js), com o SDK simulado.
import { describe, it, expect, vi, beforeEach } from "vitest";

const sdk = vi.hoisted(() => ({
  getStorage: vi.fn(() => ({})),
  ref: vi.fn((_s, caminho) => ({ caminho })),
  uploadBytesResumable: vi.fn(),
  getDownloadURL: vi.fn(async (r) => `https://storage/${r.caminho}?token=1`),
  deleteObject: vi.fn(async () => {}),
}));
vi.mock("firebase/storage", () => sdk);
vi.mock("../../src/firebase", () => ({ app: {} }));

import { enviarArquivo, apagarArquivo } from "../../src/arquivos.js";

// Tarefa de envio controlada pelo teste (thenable, como a do SDK).
function tarefaFalsa() {
  let resolver, rejeitar, observar;
  const promessa = new Promise((ok, erro) => {
    resolver = ok;
    rejeitar = erro;
  });
  return {
    on: (_evento, fn) => (observar = fn),
    then: (...a) => promessa.then(...a),
    cancel: vi.fn(() => rejeitar({ code: "storage/canceled" })),
    terminar: () => resolver(),
    falhar: (code) => rejeitar({ code }),
    progresso: (a, b) => observar({ bytesTransferred: a, totalBytes: b }),
  };
}
const pdf = { name: "Inglês básico.pdf", size: 2048 };
const iniciar = async (extra) => {
  const tarefa = tarefaFalsa();
  sdk.uploadBytesResumable.mockReturnValueOnce(tarefa);
  const envio = enviarArquivo({ uid: "u1", arquivo: pdf, ...extra });
  await vi.waitFor(() => expect(sdk.uploadBytesResumable).toHaveBeenCalled());
  return { tarefa, envio };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("enviarArquivo", () => {
  it("devolve o registro leve, com tipo e nome no Storage e progresso", async () => {
    const aoProgredir = vi.fn();
    const { tarefa, envio } = await iniciar({ aoProgredir });
    tarefa.progresso(512, 2048);
    tarefa.terminar();
    const r = await envio.promessa;
    expect(aoProgredir).toHaveBeenCalledWith(0.25);
    expect(r.ok).toBe(true);
    expect(r.arquivo).toMatchObject({ nome: "Inglês básico.pdf", tipo: "application/pdf", tamanho: 2048 });
    expect(r.arquivo.caminho).toMatch(/^users\/u1\/certificados\/[\w-]+\.pdf$/);
    expect(r.arquivo.url).toMatch(/^https:/);
    const meta = sdk.uploadBytesResumable.mock.calls[0][2];
    expect(meta.contentType).toBe("application/pdf");
    expect(meta.contentDisposition).toBe("inline; filename*=UTF-8''Ingl%C3%AAs%20b%C3%A1sico.pdf");
  });

  it("falha vira mensagem, nunca exceção", async () => {
    const { tarefa, envio } = await iniciar();
    tarefa.falhar("storage/unauthorized");
    expect(await envio.promessa).toMatchObject({ ok: false, cancelado: false, mensagem: /regras/ });
  });

  it("cancelar no meio aborta o envio, sem mensagem", async () => {
    const { tarefa, envio } = await iniciar();
    envio.cancelar();
    expect(tarefa.cancel).toHaveBeenCalled();
    expect(await envio.promessa).toEqual({ ok: false, cancelado: true, mensagem: null });
    expect(sdk.deleteObject).not.toHaveBeenCalled();
  });

  it("cancelar antes de o SDK carregar nem começa o envio", async () => {
    const envio = enviarArquivo({ uid: "u1", arquivo: pdf });
    envio.cancelar();
    expect((await envio.promessa).cancelado).toBe(true);
    expect(sdk.uploadBytesResumable).not.toHaveBeenCalled();
  });

  it("cancelar quando já terminou apaga o arquivo (não fica solto no Storage)", async () => {
    let soltarUrl;
    sdk.getDownloadURL.mockReturnValueOnce(new Promise((ok) => (soltarUrl = ok)));
    const { tarefa, envio } = await iniciar();
    tarefa.terminar();
    await vi.waitFor(() => expect(sdk.getDownloadURL).toHaveBeenCalled());
    envio.cancelar();
    soltarUrl("https://x");
    expect((await envio.promessa).cancelado).toBe(true);
    expect(sdk.deleteObject).toHaveBeenCalledTimes(1);
  });
});

describe("apagarArquivo", () => {
  it("true se apagou ou se já não existia; false em falha (tenta de novo na próxima sessão)", async () => {
    expect(await apagarArquivo("p")).toBe(true);
    sdk.deleteObject.mockRejectedValueOnce({ code: "storage/object-not-found" });
    expect(await apagarArquivo("p")).toBe(true);
    sdk.deleteObject.mockRejectedValueOnce({ code: "storage/unauthorized" });
    expect(await apagarArquivo("p")).toBe(false);
  });
});
