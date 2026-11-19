// src/components/ui/SeletorData.jsx
//
// Seletor de data próprio (Fase 5), no lugar do <input type="date"> nativo:
// o nativo não sabe desabilitar dias, e a data de fim de um afazer
// recorrente só pode cair num dia da repetição (diária mostra tudo,
// semanal só aquele dia da semana, etc.). Usado também na data de início
// do afazer e na data do compromisso, para tudo ter o mesmo visual.
//
// - `permitidas(inicioISO, fimISO)` → Set de datas clicáveis no mês visível
//   (ausente = todas). `minimo`/`maximo` cortam o resto.
// - `marcada`: data de referência destacada (ex.: o início da repetição).
// - `limpavel`: mostra o "×" e o botão "Limpar" (valor "" = sem data).
import { useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { DIAS_FULL } from "../../constants.js";
import { toISO, parseISO } from "../../utils/afazeres.js";
import { NOME_MESES, gerarCelulasMes, getIntervaloMes } from "../../utils/calendario.js";
import { textoDataComSemana } from "../../utils/compromissos.js";
import useFecharAoClicarFora from "../../hooks/useFecharAoClicarFora.js";

const LETRAS = DIAS_FULL.map((d) => d[0]);

export default function SeletorData({
  valor,
  onChange,
  placeholder = "Escolher data",
  permitidas,
  minimo = "",
  maximo = "",
  marcada = "",
  rotuloMarcada = "Início",
  limpavel = false,
  invalido = false,
  mesInicial = "",
  titulo,
}) {
  const hojeISO = toISO(new Date());
  const [aberto, setAberto] = useState(false);
  const [cursor, setCursor] = useState(null); // { ano, mes } do mês visível
  const caixaRef = useRef(null);
  useFecharAoClicarFora(caixaRef, aberto, () => setAberto(false));

  const abrir = () => {
    if (aberto) return setAberto(false);
    // Abre no mês da data escolhida; senão no mês sugerido; senão no atual.
    const ref = parseISO(valor || mesInicial || (minimo > hojeISO ? minimo : hojeISO));
    setCursor({ ano: ref.getFullYear(), mes: ref.getMonth() });
    setAberto(true);
  };

  const mudarMes = (delta) =>
    setCursor((c) => {
      const d = new Date(c.ano, c.mes + delta, 1);
      return { ano: d.getFullYear(), mes: d.getMonth() };
    });

  const celulas = useMemo(() => (cursor ? gerarCelulasMes(cursor.ano, cursor.mes) : []), [cursor]);

  // Datas permitidas na grade inteira (inclui os dias dos meses vizinhos que aparecem).
  const conjunto = useMemo(() => {
    if (!cursor || !permitidas || celulas.length === 0) return null;
    const primeira = celulas[0];
    const ultima = celulas[celulas.length - 1];
    return permitidas(
      toISO(new Date(primeira.ano, primeira.mes, primeira.dia)),
      toISO(new Date(ultima.ano, ultima.mes, ultima.dia)),
    );
  }, [cursor, celulas, permitidas]);

  const podeEscolher = (iso) =>
    (!minimo || iso >= minimo) && (!maximo || iso <= maximo) && (!conjunto || conjunto.has(iso));

  const escolher = (iso) => {
    onChange(iso);
    setAberto(false);
  };

  const { inicioISO } = cursor ? getIntervaloMes(cursor.ano, cursor.mes) : { inicioISO: "" };
  const temPermitidaNoMes =
    cursor && celulas.some((c) => !c.foraDoMes && podeEscolher(toISO(new Date(c.ano, c.mes, c.dia))));

  return (
    <div className="seletor-data" ref={caixaRef}>
      <div className="seletor-data-linha">
        <button
          type="button"
          className={`input seletor-data-campo${valor ? "" : " sem-valor"}${invalido ? " invalido" : ""}`}
          onClick={abrir}
          title={titulo}
          aria-haspopup="dialog"
          aria-expanded={aberto}
        >
          <CalendarDays size={14} />
          <span>{valor ? `${textoDataComSemana(valor)}/${valor.slice(0, 4)}` : placeholder}</span>
        </button>
        {limpavel && valor && (
          <button type="button" className="icon-btn-ghost" onClick={() => onChange("")} title="Limpar data">
            <X size={14} />
          </button>
        )}
      </div>

      {aberto && cursor && (
        <div className="seletor-data-popover" role="dialog" aria-label="Escolher data">
          <div className="seletor-data-cabecalho">
            <button type="button" className="icon-btn-ghost" onClick={() => mudarMes(-1)} title="Mês anterior">
              <ChevronLeft size={16} />
            </button>
            <span>
              {NOME_MESES[cursor.mes]} {cursor.ano}
            </span>
            <button type="button" className="icon-btn-ghost" onClick={() => mudarMes(1)} title="Próximo mês">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="seletor-data-grade">
            {LETRAS.map((l, i) => (
              <span key={i} className="seletor-data-semana">
                {l}
              </span>
            ))}
            {celulas.map((c) => {
              const iso = toISO(new Date(c.ano, c.mes, c.dia));
              const permitido = podeEscolher(iso);
              const classes = [
                "seletor-data-dia",
                c.foraDoMes ? "fora" : "",
                iso === hojeISO ? "hoje" : "",
                iso === valor ? "escolhido" : "",
                iso === marcada ? "marcada" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  key={iso}
                  type="button"
                  className={classes}
                  disabled={!permitido}
                  onClick={() => escolher(iso)}
                  title={iso === marcada ? rotuloMarcada : undefined}
                >
                  {c.dia}
                </button>
              );
            })}
          </div>

          {!temPermitidaNoMes && inicioISO && <p className="seletor-data-aviso">Nenhum dia possível neste mês.</p>}

          <div className="seletor-data-rodape">
            {podeEscolher(hojeISO) && (
              <button type="button" className="btn-secundario" onClick={() => escolher(hojeISO)}>
                Hoje
              </button>
            )}
            {limpavel && (
              <button
                type="button"
                className="btn-secundario"
                onClick={() => escolher("")}
                style={{ marginLeft: "auto" }}
              >
                {placeholder}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
