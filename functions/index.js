// functions/index.js — Cloud Functions da Minha Agenda Pessoal.
//
// Lembretes programados (#23). Uma função agendada roda a cada minuto e,
// para cada usuário com aparelhos registrados:
//   1. lê o documento users/{uid} (o mesmo AppData que o app grava);
//   2. calcula os lembretes que venceram nos últimos minutos
//      (compartilhado/lembretes.js — cópia de src/utils/lembretes.js);
//   3. manda um push (FCM) para cada aparelho em users/{uid}/dispositivos;
//   4. anota o que mandou em users/{uid}/sistema/lembretes (não manda de novo).
// Também responde aos pedidos de teste (`testeEm` no registro do aparelho).
//
// A função usa o Admin SDK, que ignora as Security Rules: o doc
// sistema/lembretes nem é acessível pelo app. Ela NUNCA grava no documento
// principal (users/{uid}) — só lê.
//
// Deploy (feito pelo usuário, exige o plano Blaze):
//   firebase deploy --only functions
// O predeploy (firebase.json) copia src/utils/lembretes.js para cá.
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { lembretesPendentes, montarNotificacao, podarEnviados } from "./compartilhado/lembretes.js";

initializeApp();
const db = getFirestore();

// Mensagem só de dados: quem desenha a notificação é o src/sw.js.
// TTL: lembrete que não chegou até o evento começar não serve mais.
function mensagem(tokens, { titulo, corpo, tag }, ttlSegundos) {
  return {
    tokens,
    data: { titulo, corpo, tag, url: "/" },
    webpush: { headers: { Urgency: "high", TTL: String(Math.max(60, Math.round(ttlSegundos))) } },
    android: { priority: "high" },
  };
}

// Tokens que o FCM diz que não valem mais (app desinstalado, permissão
// revogada): apaga o registro para não tentar de novo a cada minuto.
const TOKEN_INVALIDO = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token"]);

async function enviar(dispositivos, conteudo, ttlSegundos) {
  const tokens = dispositivos.map((d) => d.token);
  const r = await getMessaging().sendEachForMulticast(mensagem(tokens, conteudo, ttlSegundos));
  const invalidos = [];
  r.responses.forEach((resp, i) => {
    if (resp.success) return;
    const codigo = resp.error?.code;
    if (TOKEN_INVALIDO.has(codigo)) invalidos.push(dispositivos[i].ref);
    else logger.warn("Falha ao enviar push", { codigo, mensagem: resp.error?.message });
  });
  return { enviados: r.successCount, invalidos };
}

async function processarUsuario(docUsuario, agora) {
  const refUsuario = docUsuario.ref;
  const snapDispositivos = await refUsuario.collection("dispositivos").get();
  const dispositivos = snapDispositivos.docs
    .map((d) => ({ ref: d.ref, ...d.data() }))
    .filter((d) => typeof d.token === "string" && d.token.length > 0);
  if (dispositivos.length === 0) return;

  const invalidos = new Map();
  const marcarInvalidos = (refs) => refs.forEach((ref) => invalidos.set(ref.path, ref));

  // 1. Testes pedidos pelo app ("Ativar" e "Enviar teste").
  for (const d of dispositivos) {
    if (typeof d.testeEm !== "number" || d.testeEm <= (d.testeRespondidoEm || 0)) continue;
    const r = await enviar(
      [d],
      {
        titulo: "🔔 Lembretes ativados",
        corpo: `Tudo certo: este aparelho (${d.aparelho || "?"}) recebe os lembretes.`,
        tag: "teste",
      },
      600,
    );
    marcarInvalidos(r.invalidos);
    if (r.invalidos.length === 0) await d.ref.update({ testeRespondidoEm: agora });
  }

  // 2. Lembretes que venceram.
  const refEstado = refUsuario.collection("sistema").doc("lembretes");
  const estado = (await refEstado.get()).data() || {};
  const enviados = podarEnviados(estado.enviados, agora);
  const pendentes = lembretesPendentes(docUsuario.data(), enviados, agora);

  const validos = () => dispositivos.filter((d) => !invalidos.has(d.ref.path));
  for (const l of pendentes) {
    if (validos().length === 0) break;
    const r = await enviar(validos(), montarNotificacao(l, agora), (l.eventoMs - agora) / 1000);
    marcarInvalidos(r.invalidos);
    // Mesmo se nenhum aparelho recebeu, marca como enviado: tentar de novo
    // a cada minuto não ajudaria (o erro foi logado acima).
    enviados[l.chave] = l.disparoMs;
    logger.info("Lembrete enviado", { chave: l.chave, aparelhos: r.enviados });
  }

  await refEstado.set({ enviados, ultimaExecucao: agora });
  for (const ref of invalidos.values()) {
    logger.info("Removendo aparelho com token inválido", { caminho: ref.path });
    await ref.delete();
  }
}

export const enviarLembretes = onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "America/Recife",
    // Só um usuário: uma instância pequena basta. Sem retry: a próxima
    // execução (1 min depois) já cobre a janela (JANELA_MS = 10 min).
    maxInstances: 1,
    memory: "256MiB",
    timeoutSeconds: 50,
  },
  async () => {
    const agora = Date.now();
    const usuarios = await db.collection("users").get();
    for (const docUsuario of usuarios.docs) {
      try {
        await processarUsuario(docUsuario, agora);
      } catch (err) {
        logger.error("Erro ao processar lembretes", { uid: docUsuario.id, erro: String(err?.stack || err) });
      }
    }
  },
);
