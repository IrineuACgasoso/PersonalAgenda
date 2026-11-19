// src/hooks/useListaInterna.js
// Operações nas listas internas de um item (horários/links/datas de uma
// cadeira, horários de um compromisso), usadas pelos drawers.
//
// Tudo vai por `onAtualizar(fn)`, onde `fn` recebe o item do estado MAIS
// RECENTE (ver atualizarCadeira no App): antes os drawers montavam a lista a
// partir da prop do render, e duas ações seguidas podiam se sobrescrever.
// Excluir não pede confirmação: mostra um toast com "Desfazer" (#18).
import { uid } from "../utils/id";
import { reinserirPorId, separarRemovidos } from "../utils/desfazer";
import useDialogos from "./useDialogos";

export default function useListaInterna(campo, onAtualizar, textoExcluido) {
  const { notificar } = useDialogos();

  const adicionar = (novo) => onAtualizar((atual) => ({ [campo]: [...(atual[campo] || []), { id: uid(), ...novo }] }));

  const editar = (id, patch) =>
    onAtualizar((atual) => ({ [campo]: (atual[campo] || []).map((x) => (x.id === id ? { ...x, ...patch } : x)) }));

  const remover = (id) => {
    let removido = null;
    const r = onAtualizar((atual) => {
      const { restantes, removidos } = separarRemovidos(atual[campo] || [], (x) => x.id === id);
      removido = removidos[0] || null;
      return { [campo]: restantes };
    });
    if (!r?.ok || !removido) return;
    const { item, indice } = removido;
    notificar(textoExcluido(item), {
      acao: {
        rotulo: "Desfazer",
        aoClicar: () => onAtualizar((atual) => ({ [campo]: reinserirPorId(atual[campo] || [], item, indice) })),
      },
    });
  };

  return { adicionar, editar, remover };
}
