// src/hooks/useCloudBackup.js
//
// O backup automático local (useAutoBackup.js) só protege contra perda de
// dados do NAVEGADOR/DISPOSITIVO (ex: limpar localStorage). Ele NÃO protege
// contra o próprio documento do Firestore sendo sobrescrito por engano —
// que foi o problema relatado. Este hook cobre esse caso: grava uma cópia
// datada em users/{uid}/backups/{timestamp} a cada 3h enquanto o usuário
// está logado, mantendo os últimos N. Se o documento principal for
// corrompido/sobrescrito, ainda é possível restaurar a partir daqui.
//
// IMPORTANTE: para isso funcionar com segurança, as Firestore Security
// Rules precisam liberar leitura/escrita de users/{uid}/backups/{id} para
// o próprio uid autenticado, igual ao documento principal. Ex.:
//
//   match /users/{uid} {
//     allow read, write: if request.auth != null && request.auth.uid == uid;
//     match /backups/{backupId} {
//       allow read, write: if request.auth != null && request.auth.uid == uid;
//     }
//   }

import { useEffect, useRef } from "react";
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";

// Lista os backups salvos na nuvem para o usuário logado, do mais recente
// para o mais antigo. Retorna [{ id, timestamp, dataHora, payload }].
export async function listarBackupsCloud(uid) {
  const backupsRef = collection(db, "users", uid, "backups");
  const q = query(backupsRef, orderBy("timestamp", "desc"), limit(10));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

const INTERVALO_3_HORAS = 3 * 60 * 60 * 1000;
const MAX_BACKUPS = 10;

export function useCloudBackup(user, data, dadosCarregados) {
  const ultimoBackupRef = useRef(0);

  useEffect(() => {
    if (!user || !dadosCarregados) return;
    if (!data || !Array.isArray(data.periodos) || data.periodos.length === 0) return;

    const executar = async () => {
      const agora = Date.now();
      if (agora - ultimoBackupRef.current < INTERVALO_3_HORAS) return;

      try {
        const backupsRef = collection(db, "users", user.uid, "backups");
        const idBackup = String(agora);
        await setDoc(doc(backupsRef, idBackup), {
          timestamp: agora,
          dataHora: new Date(agora).toLocaleString("pt-BR"),
          payload: data,
        });

        // Mantém só os MAX_BACKUPS mais recentes.
        const q = query(backupsRef, orderBy("timestamp", "desc"), limit(50));
        const snap = await getDocs(q);
        const excedentes = snap.docs.slice(MAX_BACKUPS);
        await Promise.all(excedentes.map((d) => deleteDoc(d.ref)));

        ultimoBackupRef.current = agora;
        console.log(`[CloudBackup] Snapshot salvo no Firestore às ${new Date(agora).toLocaleString("pt-BR")}`);
      } catch (err) {
        // Nunca deixa uma falha de backup quebrar o app — só loga.
        console.error("[CloudBackup] Falha ao salvar snapshot na nuvem:", err);
      }
    };

    executar();
    const timer = setInterval(executar, 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, [user, data, dadosCarregados]);
}
