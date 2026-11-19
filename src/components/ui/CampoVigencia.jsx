// src/components/ui/CampoVigencia.jsx
// Campos "De / Até" da vigência (dataInicio/dataFim opcionais) nos drawers
// da cadeira (#19) e da rotina (#56). Estado local para o input não "pular"
// enquanto digita; grava a cada data completa e válida. Fim antes do início
// mostra o erro embaixo e não grava (sem diálogo: o valor pode estar no meio
// da edição). O pai passa `key={item.id}` para recomeçar ao trocar de item.
import { useState } from "react";
import { X } from "lucide-react";
import { dataCompleta, erroDeVigencia, vigenciaDe } from "../../utils/calendario";

export default function CampoVigencia({ item, onAtualizar, rotulo = "Vigência", dicaComDatas, dicaSemDatas }) {
  const [vigencia, setVigencia] = useState(() => vigenciaDe(item));
  const erro = erroDeVigencia(vigencia.inicio, vigencia.fim);

  const alterar = (campo, valor) => {
    const nova = { ...vigencia, [campo]: valor };
    setVigencia(nova);
    if (valor && !dataCompleta(valor)) return;
    if (erroDeVigencia(nova.inicio, nova.fim)) return;
    const atual = vigenciaDe(item);
    if (nova.inicio === atual.inicio && nova.fim === atual.fim) return;
    onAtualizar({ dataInicio: nova.inicio, dataFim: nova.fim });
  };

  return (
    <div className="painel-vigencia">
      <span className="subtle painel-vigencia-rotulo">{rotulo}</span>
      <div className="painel-vigencia-campos">
        {[
          ["inicio", "De"],
          ["fim", "Até"],
        ].map(([campo, texto]) => (
          <label key={campo} className="painel-vigencia-campo">
            <span className="subtle">{texto}</span>
            <input
              type="date"
              className="input"
              value={vigencia[campo]}
              max={campo === "inicio" ? vigencia.fim || undefined : undefined}
              min={campo === "fim" ? vigencia.inicio || undefined : undefined}
              onChange={(e) => alterar(campo, e.target.value)}
            />
            {vigencia[campo] && (
              <button
                type="button"
                className="icon-btn-ghost"
                title={`Limpar data de ${campo === "inicio" ? "início" : "fim"}`}
                onClick={() => alterar(campo, "")}
              >
                <X size={13} />
              </button>
            )}
          </label>
        ))}
      </div>
      {erro ? (
        <span className="painel-vigencia-erro">{erro}</span>
      ) : (
        <span className="subtle painel-vigencia-dica">
          {vigencia.inicio || vigencia.fim ? dicaComDatas : dicaSemDatas}
        </span>
      )}
    </div>
  );
}
