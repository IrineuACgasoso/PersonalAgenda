// src/components/ui/ModalRestaurarNuvem.jsx
// Lista de backups da nuvem para restaurar (#17). Antes era um
// window.prompt pedindo para digitar o número do backup.
// A confirmação e a gravação ficam no App (onEscolher).
import { useEffect, useState } from "react";
import { listarBackupsCloud } from "../../hooks/useCloudBackup";
import { resumoDoBackup } from "../../utils/dialogos";
import { Modal } from "./Dialogos";

export default function ModalRestaurarNuvem({ uid, onEscolher, onFechar }) {
  // estado: "carregando" | "erro" | "pronto"
  const [estado, setEstado] = useState("carregando");
  const [backups, setBackups] = useState([]);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let ativo = true;
    listarBackupsCloud(uid)
      .then((lista) => {
        if (!ativo) return;
        setBackups(lista);
        setEstado("pronto");
      })
      .catch((err) => {
        console.error(err);
        if (ativo) setEstado("erro");
      });
    return () => {
      ativo = false;
    };
  }, [uid]);

  const escolher = async (backup) => {
    setOcupado(true);
    try {
      await onEscolher(backup);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Modal titulo="Restaurar da nuvem" rotuloId="restaurar-nuvem-titulo" onFechar={onFechar} largo>
      {estado === "carregando" && <p className="restaurar-estado">Buscando backups…</p>}
      {estado === "erro" && (
        <p className="restaurar-estado">Não foi possível buscar os backups na nuvem. Verifique sua conexão.</p>
      )}
      {estado === "pronto" && backups.length === 0 && (
        <p className="restaurar-estado">
          Ainda não existe nenhum backup salvo na nuvem (eles são criados automaticamente a cada 3h, com o app aberto e
          online).
        </p>
      )}
      {estado === "pronto" && backups.length > 0 && (
        <>
          <p className="restaurar-estado" style={{ marginBottom: 12 }}>
            Escolha o backup (mais recente primeiro). Restaurar substitui todos os dados atuais.
          </p>
          <ul className="restaurar-lista">
            {backups.map((b) => (
              <li key={b.id}>
                <button className="restaurar-item" onClick={() => escolher(b)} disabled={ocupado}>
                  <span>{b.dataHora}</span>
                  <span className="restaurar-item-resumo">{resumoDoBackup(b.payload)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="modal-acoes">
        <button className="btn-secundario" onClick={onFechar}>
          Fechar
        </button>
      </div>
    </Modal>
  );
}
