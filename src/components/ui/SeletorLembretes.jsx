// src/components/ui/SeletorLembretes.jsx
// Chips de antecedência dos lembretes (#23).
//
// valor: undefined = "Padrão" (usa o padrão global) · [] = sem lembrete ·
// [15, 1440] = minutos antes. Com `semPadrao` (modal de padrões) não existe
// o chip "Padrão" e `valor` é sempre uma lista.
// Os chips do padrão aparecem "apagados" quando o item segue o padrão, para
// mostrar o que vai acontecer sem precisar abrir o modal.
// Com `personalizavel` (form do compromisso) aparece o "+ Adicionar"
// (valor | h/dia/semana): o valor vale só para o item editado, nunca vira
// opção nem padrão global. Antecedência fora de `opcoes` fica em itálico.
import { Bell, BellOff } from "lucide-react";
import AdicionarLembrete from "./AdicionarLembrete.jsx";
import { MAX_LEMBRETES_POR_ITEM, rotuloAntecedencia, textoListaLembretes } from "../../utils/lembretes.js";

export default function SeletorLembretes({
  valor,
  onChange,
  padrao = [],
  opcoes,
  rotulo = "Lembrete",
  semPadrao = false,
  personalizavel = false,
  unidadeInicial,
}) {
  const usandoPadrao = !semPadrao && valor === undefined;
  const lista = usandoPadrao ? padrao : valor || [];
  // Opções da UI + qualquer valor já salvo que não esteja nelas.
  const todas = [...new Set([...opcoes, ...lista])].sort((a, b) => a - b);

  const alternar = (min) => {
    const base = usandoPadrao ? [] : lista;
    onChange(base.includes(min) ? base.filter((m) => m !== min) : [...base, min].sort((a, b) => a - b));
  };

  // Adicionar a partir do "Padrão" começa uma lista própria (como clicar
  // num chip). Já existente = nada muda.
  const adicionar = (min) => {
    const base = usandoPadrao ? [] : lista;
    if (!base.includes(min)) onChange([...base, min].sort((a, b) => a - b));
  };
  const cheia = !usandoPadrao && lista.length >= MAX_LEMBRETES_POR_ITEM;

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
          const classe =
            (marcado ? (usandoPadrao ? " herdado" : " ativo") : "") + (opcoes.includes(min) ? "" : " proprio");
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
        {personalizavel && <AdicionarLembrete onAdicionar={adicionar} cheia={cheia} unidadeInicial={unidadeInicial} />}
      </div>
    </div>
  );
}
