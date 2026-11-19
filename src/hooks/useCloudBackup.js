// src/hooks/useCloudBackup.js
//
// Grava uma cópia datada em users/{uid}/backups/{timestamp} a cada 3h
// enquanto o usuário está logado, mantendo os últimos N. Se o documento
// principal for corrompido/sobrescrito, ainda é possível restaurar a
// partir daqui.
//
// Permissões: `firestore.rules` (backups só podem ser criados e apagados,
// nunca editados; id = timestamp).

import { useEffect, useRef } from "react";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDocsFromServer,
  deleteDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { INTERVALO_CHECAGEM_BACKUP_MS, MAX_BACKUPS, deveFazerBackup, backupsParaApagar } from "../utils/backupNuvem";

// Lista os backups salvos na nuvem para o usuário logado, do mais recente
// para o mais antigo. Retorna [{ id, timestamp, dataHora, payload }].
export async function listarBackupsCloud(uid) {
  const backupsRef = collection(db, "users", uid, "backups");
  const q = query(backupsRef, orderBy("timestamp", "desc"), limit(MAX_BACKUPS));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Timestamp do backup mais recente NO SERVIDOR (0 se não houver nenhum).
// Do servidor de propósito: o cache local pode não ter os backups criados
// em outro aparelho (#8).
async function buscarUltimoBackup(uid) {
  const backupsRef = collection(db, "users", uid, "backups");
  const snap = await getDocsFromServer(query(backupsRef, orderBy("timestamp", "desc"), limit(1)));
  return snap.empty ? 0 : Number(snap.docs[0].data().timestamp) || 0;
}

// #8: o intervalo é baseado no backup mais recente que existe na nuvem (não
// num ref que zera a cada abertura do app), o timer não é recriado a cada
// mudança de `data` (lê o estado mais recente de um ref), e nunca há mais de
// um backup em andamento — offline nem tenta (ver utils/backupNuvem.js).
export function useCloudBackup(user, data, dadosCarregados) {
  // Estado mais recente, lido na hora do backup (o efeito não depende de `data`).
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!user || !dadosCarregados) return;

    let cancelado = false;
    // null = ainda não sabemos quando foi o último backup na nuvem.
    let ultimoBackup = null;
    let emAndamento = false;

    const executar = async () => {
      if (emAndamento || !navigator.onLine) return;
      // Marca ANTES de qualquer await: um tick do timer durante uma gravação
      // lenta (ou pendurada por rede instável) não enfileira outro snapshot.
      emAndamento = true;
      try {
        if (ultimoBackup == null) ultimoBackup = await buscarUltimoBackup(user.uid);
        if (cancelado) return;

        const agora = Date.now();
        const dados = dataRef.current;
        const { fazer } = deveFazerBackup({ agora, ultimoBackup, online: navigator.onLine, dados });
        if (!fazer) return;

        // Conta como feito já agora: se o setDoc falhar (ex: Rules), tenta de
        // novo só no próximo intervalo, em vez de a cada 15 min.
        ultimoBackup = agora;
        const backupsRef = collection(db, "users", user.uid, "backups");
        await setDoc(doc(backupsRef, String(agora)), {
          timestamp: agora,
          dataHora: new Date(agora).toLocaleString("pt-BR"),
          payload: dados,
        });
        if (cancelado) return;

        // Mantém só os MAX_BACKUPS mais recentes (lendo do servidor, para
        // não apagar com base num cache incompleto).
        const snap = await getDocsFromServer(query(backupsRef, orderBy("timestamp", "desc"), limit(50)));
        const ids = backupsParaApagar(snap.docs.map((d) => ({ id: d.id, timestamp: d.data().timestamp })));
        await Promise.all(ids.map((id) => deleteDoc(doc(backupsRef, id))));

        console.log(`[CloudBackup] Snapshot salvo no Firestore às ${new Date(agora).toLocaleString("pt-BR")}`);
      } catch (err) {
        // Nunca deixa uma falha de backup quebrar o app — só loga.
        console.error("[CloudBackup] Falha no backup na nuvem:", err);
      } finally {
        emAndamento = false;
      }
    };

    executar();
    const timer = setInterval(executar, INTERVALO_CHECAGEM_BACKUP_MS);
    return () => {
      cancelado = true;
      clearInterval(timer);
    };
  }, [user, dadosCarregados]);
}
