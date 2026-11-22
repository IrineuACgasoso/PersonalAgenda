// src/components/ui/ModalLembretes.jsx
// Configuração dos lembretes (#23): ligar/desligar NESTE aparelho, pedir um
// teste e escolher os padrões (compromissos e avaliações).
//
// Os padrões são dados do app (gravados pelo App via gravar()/persist()).
// O registro do aparelho é técnico e fica em src/notificacoes.js.
import { useState } from "react";
import { BellRing, BellOff, Send } from "lucide-react";
import { Modal } from "./Dialogos";
import SeletorLembretes from "./SeletorLembretes";
import useDialogos from "../../hooks/useDialogos";
import { OPCOES_LEMBRETE, HORA_AVALIACAO_SEM_HORA } from "../../utils/lembretes.js";
import {
  estadoNotificacoes,
  ativarNotificacoes,
  desativarNotificacoes,
  testarNotificacoes,
} from "../../notificacoes.js";

const TEXTO_ESTADO = {
  "sem-login":
    "Entre com o Google para receber lembretes: quem manda as notificações é o servidor, mesmo com o app fechado.",
  "ios-instalar":
    "No iPhone/iPad as notificações só funcionam com o app instalado: Compartilhar → Adicionar à Tela de Início, e abra por lá.",
  "sem-suporte": "Este navegador não suporta notificações push.",
  bloqueado:
    "As notificações estão bloqueadas para este site. Libere nas configurações do navegador (ícone de cadeado na barra de endereço) e volte aqui.",
  ativo: "Ativos neste aparelho. Os lembretes chegam mesmo com o app fechado (com até ~1 min de atraso).",
  inativo: "Desligados neste aparelho.",
};

export default function ModalLembretes({ user, preferencias, onSalvarPreferencias, onFechar }) {
  const { avisar, notificar } = useDialogos();
  const [estado, setEstado] = useState(() => estadoNotificacoes(!!user));
  const [ocupado, setOcupado] = useState(false);

  const executar = async (acao, sucesso) => {
    setOcupado(true);
    try {
      const r = await acao(user.uid);
      if (r.ok) {
        if (sucesso) notificar(sucesso);
      } else if (r.mensagem) {
        avisar(r.mensagem, { titulo: "Lembretes" });
      }
    } finally {
      setEstado(estadoNotificacoes(!!user));
      setOcupado(false);
    }
  };

  return (
    <Modal titulo="Lembretes" rotuloId="lembretes-titulo" onFechar={onFechar} largo>
      <section className="lembretes-secao">
        <h3 className="lembretes-subtitulo">Este aparelho</h3>
        <p className={`lembretes-status estado-${estado}`}>{TEXTO_ESTADO[estado]}</p>
        <div className="lembretes-botoes">
          {estado === "inativo" && (
            <button
              className="btn-primario"
              disabled={ocupado}
              onClick={() => executar(ativarNotificacoes, "Lembretes ativados — um aviso de teste chega em até 1 min")}
            >
              <BellRing size={15} /> Ativar neste aparelho
            </button>
          )}
          {estado === "ativo" && (
            <>
              <button
                className="btn-secundario"
                disabled={ocupado}
                onClick={() => executar(testarNotificacoes, "Teste pedido — chega em até 1 min")}
              >
                <Send size={14} /> Enviar teste
              </button>
              <button
                className="btn-secundario"
                disabled={ocupado}
                onClick={() => executar(desativarNotificacoes, "Lembretes desligados neste aparelho")}
              >
                <BellOff size={14} /> Desativar
              </button>
            </>
          )}
        </div>
      </section>

      <section className="lembretes-secao">
        <h3 className="lembretes-subtitulo">Padrões</h3>
        <p className="subtle lembretes-ajuda">
          Valem para todo compromisso que não tiver um lembrete próprio (escolhido no formulário dele). Avaliações
          começam com os lembretes desativados: ligue cada data no sininho da tela da cadeira, onde a opção
          &quot;Padrão&quot; usa o valor abaixo. Avaliação sem hora conta a partir das {HORA_AVALIACAO_SEM_HORA} do dia.
        </p>
        <SeletorLembretes
          semPadrao
          rotulo="Compromissos"
          valor={preferencias.compromissos}
          opcoes={OPCOES_LEMBRETE.compromissos}
          onChange={(v) => onSalvarPreferencias({ ...preferencias, compromissos: v })}
        />
        <SeletorLembretes
          semPadrao
          rotulo="Avaliações"
          valor={preferencias.avaliacoes}
          opcoes={OPCOES_LEMBRETE.avaliacoes}
          onChange={(v) => onSalvarPreferencias({ ...preferencias, avaliacoes: v })}
        />
      </section>

      <div className="modal-acoes">
        <button className="btn-secundario" onClick={onFechar}>
          Fechar
        </button>
      </div>
    </Modal>
  );
}
