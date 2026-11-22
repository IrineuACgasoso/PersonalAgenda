// src/components/telaCadeira/AbaDatasImportantes.jsx
// Aba "Datas importantes": TODAS as datas da cadeira em ordem (as que já
// passaram em cinza, as próximas ≤ 7 dias em âmbar, como no card). O sininho
// de cada uma abre os lembretes DAQUELA data — a única coisa editável da tela.
import { useState } from "react";
import { Bell, BellOff, GraduationCap } from "lucide-react";
import { DIAS } from "../../constants.js";
import { parseISO } from "../../utils/afazeres.js";
import { DIAS_DESTAQUE_AVALIACAO, diasEntre } from "../../utils/cadeiras.js";
import { lembretesDaAvaliacao, textoListaLembretes } from "../../utils/lembretes.js";
import { formatarNota, notasPorData } from "../../utils/notas.js";
import ModalLembretesData from "./ModalLembretesData.jsx";

const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function textoQuando(dias) {
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias === -1) return "ontem";
  return dias > 0 ? `em ${dias} dias` : `há ${-dias} dias`;
}

export default function AbaDatasImportantes({ cadeira, hojeISO, lembretesPadrao, estiloCor, onAtualizar }) {
  const [abertaId, setAbertaId] = useState(null);
  const notas = notasPorData(cadeira.notas);
  const datas = [...(cadeira.datas || [])]
    .filter((d) => d && d.data)
    .sort((a, b) => `${a.data}T${a.hora || "00:00"}`.localeCompare(`${b.data}T${b.hora || "00:00"}`));
  const aberta = datas.find((d) => d.id === abertaId);

  if (datas.length === 0) {
    return <p className="tc-vazio">Nenhuma data importante. Adicione no lápis (editar).</p>;
  }

  return (
    <>
      <ul className="tc-datas">
        {datas.map((d) => {
          const dias = diasEntre(hojeISO, d.data);
          const passada = dias < 0;
          const destaque = !passada && dias <= DIAS_DESTAQUE_AVALIACAO;
          const lembretes = lembretesDaAvaliacao(d, lembretesPadrao);
          const nota = notas[d.id];
          const dt = parseISO(d.data);
          return (
            <li key={d.id} className={`tc-data${passada ? " passada" : ""}${destaque ? " destaque" : ""}`}>
              <div className="tc-data-dia" aria-hidden="true">
                <strong>{d.data.slice(8, 10)}</strong>
                <span>{MESES[dt.getMonth()]}</span>
              </div>
              <div className="tc-data-texto">
                <span className="tc-data-titulo">{d.titulo}</span>
                <span className="tc-data-sub">
                  {DIAS[(dt.getDay() + 6) % 7]}, {d.data.slice(8, 10)}/{d.data.slice(5, 7)}
                  {d.hora ? ` · ${d.hora}` : ""} · {textoQuando(dias)}
                </span>
              </div>
              {nota && nota.nota !== undefined && (
                <span className="tc-data-nota" title="Nota desta avaliação">
                  <GraduationCap size={12} /> {formatarNota(nota.nota)}
                </span>
              )}
              <button
                type="button"
                className={`tc-sino${lembretes ? " ativo" : ""}`}
                onClick={() => setAbertaId(d.id)}
                aria-label={`Lembretes de ${d.titulo}: ${lembretes ? textoListaLembretes(lembretes) : "desativados"}`}
                title={lembretes ? `Lembretes: ${textoListaLembretes(lembretes)}` : "Lembretes desativados"}
              >
                {lembretes ? <Bell size={15} /> : <BellOff size={15} />}
              </button>
            </li>
          );
        })}
      </ul>

      {aberta && (
        <ModalLembretesData
          data={aberta}
          lembretesPadrao={lembretesPadrao}
          estiloCor={estiloCor}
          onSalvar={(patch) =>
            onAtualizar((c) => ({ datas: c.datas.map((d) => (d.id === aberta.id ? { ...d, ...patch } : d)) }))
          }
          onFechar={() => setAbertaId(null)}
        />
      )}
    </>
  );
}
