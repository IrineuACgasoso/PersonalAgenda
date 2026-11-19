// src/components/ui/SeletorLembretes.jsx
// Chips de antecedência dos lembretes (#23).
//
// valor: undefined = "Padrão" (usa o padrão global) · [] = sem lembrete ·
// [15, 1440] = minutos antes. Com `semPadrao` (modal de padrões) não existe
// o chip "Padrão" e `valor` é sempre uma lista.
// Os chips do padrão aparecem "apagados" quando o item segue o padrão, para
// mostrar o que vai acontecer sem precisar abrir o modal.
import { Bell, BellOff } from "lucide-react";
import { rotuloAntecedencia, textoListaLembretes } from "../../utils/lembretes.js";

export default function SeletorLembretes({
  valor,
  onChange,
  padrao = [],
  opcoes,
  rotulo = "Lembrete",
  semPadrao = false,
}) {
  const usandoPadrao = !semPadrao && valor === undefined;
  const lista = usandoPadrao ? padrao : valor || [];
  // Opções da UI + qualquer valor já salvo que não esteja nelas.
  const todas = [...new Set([...opcoes, ...lista])].sort((a, b) => a - b);

  const alternar = (min) => {
    const base = usandoPadrao ? [] : lista;
    onChange(base.includes(min) ? base.filter((m) => m !== min) : [...base, min].sort((a, b) => a - b));
  };

  const resumo = usandoPadrao ? `Padrão: ${textoListaLembretes(padrao)}` : textoListaLembretes(lista);

  return (
    <div className="seletor-lembretes">
      <span className="form-campo-rotulo">
        <Bell size={12} /> {rotulo} <span className="seletor-lembretes-resumo">· {resumo}</span>
      </span>
      <div className="chips-lembrete" role="group" aria-label={rotulo}>
        {!semPadrao && (
          <button
            type="button"
            className={`chip-lembrete${usandoPadrao ? " ativo" : ""}`}
            onClick={() => onChange(undefined)}
            title={`Usar o padrão (${textoListaLembretes(padrao)}) — muda em Lembretes, no menu`}
          >
            Padrão
          </button>
        )}
        {todas.map((min) => {
          const marcado = lista.includes(min);
          const classe = marcado ? (usandoPadrao ? " herdado" : " ativo") : "";
          return (
            <button
              key={min}
              type="button"
              className={`chip-lembrete${classe}`}
              aria-pressed={marcado}
              onClick={() => alternar(min)}
            >
              {rotuloAntecedencia(min)}
            </button>
          );
        })}
        <button
          type="button"
          className={`chip-lembrete${!usandoPadrao && lista.length === 0 ? " ativo" : ""}`}
          onClick={() => onChange([])}
          title="Não lembrar"
        >
          <BellOff size={12} /> Nenhum
        </button>
      </div>
    </div>
  );
}
