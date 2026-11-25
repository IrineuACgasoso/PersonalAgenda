// src/components/curriculo/EscolherCertificado.jsx
// "Puxar dos certificados" (#58): escolhe um certificado guardado no app para
// começar um item de "Certificações e cursos". Só o título é COPIADO (mexer no
// certificado depois não muda o currículo). O link do arquivo não vai junto de
// propósito: quem tiver esse endereço abre o arquivo sem login.
import { useState } from "react";
import { Award, Search } from "lucide-react";
import { CORES } from "../../constants";
import { corVisivel } from "../../utils/calendario.js";
import { Modal } from "../ui/Dialogos.jsx";
import EstadoVazio from "../ui/EstadoVazio.jsx";
import { filtrarCertificados, normalizarTexto, tagsDoCertificado } from "../../utils/certificados.js";

export default function EscolherCertificado({ certificados, tags, titulosUsados, onEscolher, onFechar }) {
  const [busca, setBusca] = useState("");
  const visiveis = filtrarCertificados(certificados, { busca });
  const usados = new Set(titulosUsados.map(normalizarTexto));

  return (
    <Modal titulo="Puxar dos certificados" rotuloId="escolher-certificado" classe="modal-curriculo" onFechar={onFechar}>
      <div className="escolher-certificado">
        <p className="curriculo-dica">O título vem pronto; emissor, data e link oficial você completa a seguir.</p>
        <div className="certificados-campo">
          <Search size={15} className="certificados-lupa" />
          <input
            className="input"
            placeholder="Buscar por título"
            aria-label="Buscar certificado por título"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        {visiveis.length === 0 ? (
          <EstadoVazio texto="Nenhum certificado com essa busca" pequeno />
        ) : (
          <div className="escolher-certificado-lista">
            {visiveis.map((c) => (
              <button
                key={c.id}
                type="button"
                className="opcao-certificado"
                style={{ "--cor-item": corVisivel(c.cor || CORES[0]) }}
                onClick={() => onEscolher(c)}
              >
                <Award size={18} />
                <span className="item-lista-texto">
                  <span className="escolher-certificado-titulo">{c.titulo}</span>
                  <span className="item-lista-meta">
                    {usados.has(normalizarTexto(c.titulo)) && <span className="chip-meta">Já no currículo</span>}
                    {tagsDoCertificado(c, tags).map((t) => (
                      <span key={t.id} className="chip-meta">
                        {t.nome}
                      </span>
                    ))}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
