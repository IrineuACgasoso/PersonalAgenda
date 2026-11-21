// src/components/ui/Dialogos.jsx
// Provider dos diálogos próprios (#17) e do toast com "Desfazer" (#18).
// Os componentes usam `useDialogos()` (hooks/useDialogos.js):
//   avisar(texto, { titulo })                       → Promise<void>
//   confirmar(texto, { titulo, textoConfirmar, perigo }) → Promise<boolean>
//   notificar(texto, { acao: { rotulo, aoClicar }, duracaoMs })
// A fila/dedupe é pura (utils/dialogos.js); aqui só desenhamos e resolvemos
// as promises. Um diálogo por vez; os outros esperam na fila.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Info, X } from "lucide-react";
import { DialogosContexto } from "../../hooks/useDialogos";
import useCaixaModal from "../../hooks/useCaixaModal";
import { enfileirarDialogo, removerDialogo } from "../../utils/dialogos";

const DURACAO_TOAST_MS = 6000;

/**
 * Casca comum dos modais: overlay centralizado, Esc fecha, foco preso dentro
 * do modal enquanto aberto e devolvido a quem tinha o foco ao fechar.
 * Também usada por ModalTexto e ModalRestaurarNuvem.
 */
export function Modal({ titulo, onFechar, children, largo = false, rotuloId }) {
  const caixaRef = useRef(null);
  const onFecharRef = useRef(onFechar);
  useEffect(() => {
    onFecharRef.current = onFechar;
  });
  const aoTeclar = useCaixaModal(caixaRef, onFechar);

  return (
    <div className="modal-overlay" onClick={() => onFecharRef.current?.()}>
      <div
        ref={caixaRef}
        className={`modal${largo ? " modal-largo" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={rotuloId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={aoTeclar}
      >
        <div className="modal-cabecalho">
          <h2 className="modal-titulo" id={rotuloId}>
            {titulo}
          </h2>
          <button className="modal-fechar" onClick={() => onFecharRef.current?.()} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalDialogo({ dialogo, onResponder }) {
  const ehConfirmacao = dialogo.tipo === "confirmar";
  const Icone = dialogo.perigo ? AlertTriangle : Info;
  const rotuloId = `dialogo-${dialogo.id}`;
  return (
    <Modal titulo={dialogo.titulo} rotuloId={rotuloId} onFechar={() => onResponder(dialogo.id, false)}>
      <div className="modal-corpo">
        <Icone size={20} className={`modal-icone${dialogo.perigo ? " perigo" : ""}`} />
        <p className="modal-texto">{dialogo.texto}</p>
      </div>
      <div className="modal-acoes">
        {ehConfirmacao ? (
          <>
            {/* Ação destrutiva: o foco começa no "Cancelar" (Enter não apaga sem querer). */}
            <button
              className="btn-secundario"
              onClick={() => onResponder(dialogo.id, false)}
              data-autofoco={dialogo.perigo ? "" : undefined}
            >
              Cancelar
            </button>
            <button
              className={dialogo.perigo ? "btn-perigo" : "btn-primario"}
              onClick={() => onResponder(dialogo.id, true)}
              data-autofoco={dialogo.perigo ? undefined : ""}
            >
              {dialogo.textoConfirmar}
            </button>
          </>
        ) : (
          <button className="btn-primario" onClick={() => onResponder(dialogo.id, true)} data-autofoco="">
            OK
          </button>
        )}
      </div>
    </Modal>
  );
}

function Toast({ toast, onFechar }) {
  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast-texto">{toast.texto}</span>
      {toast.acao && (
        <button
          className="toast-acao"
          onClick={() => {
            toast.acao.aoClicar();
            onFechar(toast.id);
          }}
        >
          {toast.acao.rotulo}
        </button>
      )}
      <button className="toast-fechar" onClick={() => onFechar(toast.id)} aria-label="Fechar aviso">
        <X size={15} />
      </button>
      {/* Barra de tempo: esvazia em `duracaoMs`, junto com o timer que fecha o
          toast, para o usuário saber quanto tempo ainda tem para "Desfazer".
          Só visual (a duração vem do mesmo valor); a key do Toast reinicia a
          animação quando um toast novo substitui o anterior. */}
      <span className="toast-progresso" style={{ animationDuration: `${toast.duracaoMs}ms` }} aria-hidden="true" />
    </div>
  );
}

export function DialogosProvider({ children }) {
  const [fila, setFila] = useState([]);
  // A fila "de verdade" fica no ref: abrir() e responder() são chamados de
  // handlers e decidem com o valor atual, sem efeito colateral dentro de um
  // updater de setState (o StrictMode roda updaters 2×).
  const filaRef = useRef([]);
  const resolvedoresRef = useRef(new Map()); // id → [resolve, ...]
  const contadorRef = useRef(0);
  const [toast, setToast] = useState(null);

  const abrir = useCallback(
    (dialogo) =>
      new Promise((resolve) => {
        const id = ++contadorRef.current;
        const { fila: nova, duplicado } = enfileirarDialogo(filaRef.current, { ...dialogo, id });
        if (duplicado) {
          // Aviso repetido: responde junto com o que já está na fila.
          resolvedoresRef.current.get(duplicado.id)?.push(resolve);
          return;
        }
        resolvedoresRef.current.set(id, [resolve]);
        filaRef.current = nova;
        setFila(nova);
      }),
    [],
  );

  const responder = useCallback((id, valor) => {
    for (const resolve of resolvedoresRef.current.get(id) || []) resolve(valor);
    resolvedoresRef.current.delete(id);
    filaRef.current = removerDialogo(filaRef.current, id);
    setFila(filaRef.current);
  }, []);

  const fecharToast = useCallback((id) => {
    setToast((atual) => (atual && atual.id === id ? null : atual));
  }, []);

  // Some sozinho depois de `duracaoMs`; um toast novo substitui o anterior.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => fecharToast(toast.id), toast.duracaoMs);
    return () => clearTimeout(timer);
  }, [toast, fecharToast]);

  const api = useMemo(
    () => ({
      avisar: (texto, opcoes = {}) => {
        const titulo = opcoes.titulo ?? "Aviso";
        return abrir({ tipo: "aviso", texto, titulo, chave: `aviso|${titulo}|${texto}` }).then(() => undefined);
      },
      confirmar: (texto, opcoes = {}) =>
        abrir({
          tipo: "confirmar",
          texto,
          titulo: opcoes.titulo ?? "Confirmar",
          textoConfirmar: opcoes.textoConfirmar ?? "Confirmar",
          perigo: !!opcoes.perigo,
        }),
      notificar: (texto, opcoes = {}) => {
        const id = ++contadorRef.current;
        setToast({ id, texto, acao: opcoes.acao || null, duracaoMs: opcoes.duracaoMs ?? DURACAO_TOAST_MS });
      },
    }),
    [abrir],
  );

  return (
    <DialogosContexto.Provider value={api}>
      {children}
      {fila.length > 0 && <ModalDialogo key={fila[0].id} dialogo={fila[0]} onResponder={responder} />}
      {toast && <Toast key={toast.id} toast={toast} onFechar={fecharToast} />}
    </DialogosContexto.Provider>
  );
}
