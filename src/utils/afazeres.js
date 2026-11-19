/* Utilidades para lidar com recorrência de afazeres. */

function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Gera as ocorrências de um afazer dentro do intervalo [inicioISO, fimISO]
 * (inclusivo), respeitando o limite de repetições.
 *
 * Retorna uma lista de objetos { data, dataOriginal }:
 * - `data` é o dia em que a ocorrência deve de fato aparecer no calendário
 *   (já considerando instâncias que o usuário arrastou para outro dia).
 * - `dataOriginal` é o dia "natural" da regra de recorrência (o que teria
 *   sido usado se a instância nunca tivesse sido movida). É essa chave que
 *   identifica a ocorrência de forma estável, mesmo depois de um drag.
 */
export function ocorrenciasNoIntervalo(afazer, inicioISO, fimISO) {
  const tipo = afazer.rotina?.tipo || "nenhuma";
  const inicioRange = parseISO(inicioISO);
  const fimRange = parseISO(fimISO);
  const excecoes = afazer.excecoesData && typeof afazer.excecoesData === "object" ? afazer.excecoesData : {};

  const resultado = [];
  const origensComExcecao = new Set(Object.keys(excecoes));

  // Instâncias que foram arrastadas para outro dia: entram no resultado pela
  // data de destino, independente de onde a data "natural" da regra caia —
  // é assim que uma ocorrência de quarta adiada pra quinta continua visível
  // mesmo que a regra em si não tenha mudado.
  Object.entries(excecoes).forEach(([origem, destino]) => {
    if (!destino) return; // reservado para "instância removida", se algum dia precisar
    const dDestino = parseISO(destino);
    if (dDestino >= inicioRange && dDestino <= fimRange) {
      resultado.push({ data: destino, dataOriginal: origem });
    }
  });

  const naturais = [];

  if (tipo === "nenhuma") {
    if (afazer.data) {
      const base = parseISO(afazer.data);
      if (base >= inicioRange && base <= fimRange) naturais.push(toISO(base));
    }
  } else if (tipo === "dias_especificos") {
    // Dias específicos da semana (ex: toda Seg/Qua/Sex). A data-base agora é
    // OPCIONAL: sem ela, a regra é tratada como sempre ativa (sem "início"),
    // e simplesmente projetamos as ocorrências dentro da janela pedida.
    const dias = Array.isArray(afazer.rotina?.diasSemana) ? afazer.rotina.diasSemana : [];
    if (dias.length > 0) {
      const temDataBase = !!afazer.data;
      const limiteRepeticoes =
        temDataBase && Number(afazer.rotina?.totalRepeticoes) > 0 ? Number(afazer.rotina.totalRepeticoes) : null;

      let cursor = temDataBase ? new Date(parseISO(afazer.data)) : new Date(inicioRange);

      if (temDataBase && cursor > fimRange) {
        cursor = null; // data-base é depois da janela pedida: nada a gerar aqui
      } else if (temDataBase && !limiteRepeticoes && cursor < inicioRange) {
        // sem limite de repetições, adianta o cursor perto do início da
        // janela visualizada (evita iterar dia a dia desde uma data-base antiga)
        const diffDias = Math.floor((inicioRange - cursor) / 86400000);
        cursor = new Date(cursor.getTime() + Math.max(0, diffDias - 7) * 86400000);
      }

      if (cursor) {
        let contador = 0;
        let guarda = 0;
        while (cursor <= fimRange && guarda < 3000) {
          if (limiteRepeticoes && contador >= limiteRepeticoes) break;
          const diaSemana = (cursor.getDay() + 6) % 7; // 0 = Segunda ... 6 = Domingo
          if (dias.includes(diaSemana)) {
            contador++;
            if (cursor >= inicioRange) naturais.push(toISO(cursor));
          }
          cursor = new Date(cursor.getTime() + 86400000);
          guarda++;
        }
      }
    }
    naturais.forEach((d) => {
      if (origensComExcecao.has(d)) return; // foi movida (ou removida) — não duplica na data natural
      resultado.push({ data: d, dataOriginal: d });
    });
    resultado.sort((a, b) => a.data.localeCompare(b.data));
    return resultado;
  } else {
    if (!afazer.data) return resultado;
    const inicioBase = parseISO(afazer.data);
    if (inicioBase <= fimRange) {
      gerarOcorrenciasComData(afazer, tipo, inicioBase, inicioRange, fimRange, naturais);
    }
  }

  naturais.forEach((d) => {
    if (origensComExcecao.has(d)) return;
    resultado.push({ data: d, dataOriginal: d });
  });
  resultado.sort((a, b) => a.data.localeCompare(b.data));
  return resultado;
}

function gerarOcorrenciasComData(afazer, tipo, inicioBase, inicioRange, fimRange, naturais) {
  const limiteRepeticoes = Number(afazer.rotina?.totalRepeticoes) > 0 ? Number(afazer.rotina.totalRepeticoes) : null;

  // Mensal (#12): a n-ésima ocorrência é calculada a partir da data-base, e
  // não do cursor anterior, limitada ao último dia do mês. Antes,
  // `new Date(ano, mes + 1, 31)` transbordava (31/jan → 03/mar → 01/mai) e o
  // erro se acumulava. Agora: 31/jan → 28/fev → 31/mar → 30/abr.
  let mesesAvancados = 0;
  const avancarData = (date) => {
    if (tipo === "mensal") {
      mesesAvancados += 1;
      return mesmoDiaMesesDepois(inicioBase, mesesAvancados);
    }
    let passoDias = 1;
    if (tipo === "diaria") passoDias = 1;
    else if (tipo === "semanal") passoDias = 7;
    else if (tipo === "quinzenal") passoDias = 15;
    else if (tipo === "personalizada") passoDias = Math.max(1, Number(afazer.rotina?.intervaloDias) || 1);

    return new Date(date.getTime() + passoDias * 86400000);
  };

  let cursor = new Date(inicioBase);
  let contador = 0;
  let guarda = 0;

  // Se não houver limite de repetições, avança rapidamente até o início da janela visualizada
  if (!limiteRepeticoes && tipo !== "mensal") {
    let passoDias = 1;
    if (tipo === "diaria") passoDias = 1;
    else if (tipo === "semanal") passoDias = 7;
    else if (tipo === "quinzenal") passoDias = 15;
    else if (tipo === "personalizada") passoDias = Math.max(1, Number(afazer.rotina?.intervaloDias) || 1);

    if (cursor < inicioRange) {
      const diffDias = Math.floor((inicioRange - cursor) / 86400000);
      const passos = Math.floor(diffDias / passoDias);
      cursor = new Date(cursor.getTime() + passos * passoDias * 86400000);
    }
  }

  while (cursor <= fimRange && guarda < 1000) {
    contador++;
    if (limiteRepeticoes && contador > limiteRepeticoes) break;

    if (cursor >= inicioRange) {
      naturais.push(toISO(cursor));
    }
    cursor = avancarData(cursor);
    guarda++;
  }
}

export function ehRotina(afazer) {
  return !!afazer?.rotina?.tipo && afazer.rotina.tipo !== "nenhuma";
}

// "Concluído" como um todo (aba Afazeres, "Apagar concluídos"): só afazeres
// comuns. Rotina nunca é concluída inteira — a conclusão é por ocorrência,
// em `datasConcluidas` (#11). Antes, o check da aba marcava `feito` na
// rotina e "Apagar concluídos" apagava a rotina toda. Um `feito: true`
// antigo numa rotina passa a ser ignorado.
export function afazerConcluido(afazer) {
  return !ehRotina(afazer) && !!afazer?.feito;
}

// Ocorrência a que o check da aba Afazeres se refere numa rotina (#11): a de
// hoje, se houver; senão, a próxima (procura até ~2 anos à frente). Devolve
// { data, dataOriginal, concluida } ou null (rotina sem ocorrências futuras).
// A conclusão é guardada pela `dataOriginal` (#14), igual ao calendário.
export function ocorrenciaAtual(afazer, hojeISO, diasAFrente = 731) {
  const fim = parseISO(hojeISO);
  fim.setDate(fim.getDate() + diasAFrente);
  const [primeira] = ocorrenciasNoIntervalo(afazer, hojeISO, toISO(fim));
  if (!primeira) return null;
  const concluidas = Array.isArray(afazer.datasConcluidas) ? afazer.datasConcluidas : [];
  return { ...primeira, concluida: concluidas.includes(primeira.dataOriginal) };
}

// Rotinas que só existem a partir de uma data-base (ocorrenciasNoIntervalo
// devolve [] sem ela). "Dias específicos" funciona sem data.
export const ROTINAS_COM_DATA_BASE = ["diaria", "semanal", "quinzenal", "mensal", "personalizada"];

// Data gravada ao salvar o formulário de afazer (#40). Uma rotina dessas
// salva SEM "Definir dia/hora" nunca aparecia no calendário (nem na
// projeção de "sem data", que exclui rotinas); agora ela começa hoje.
export function dataAoSalvarAfazer({ rotinaTipo, temData, data }, hojeISO) {
  if (temData && data) return data;
  return ROTINAS_COM_DATA_BASE.includes(rotinaTipo) ? hojeISO : "";
}

// Rotina antiga gravada sem data-base (antes do #40): a lista avisa para
// editar e salvar de novo.
export function rotinaSemDataBase(afazer) {
  return ROTINAS_COM_DATA_BASE.includes(afazer?.rotina?.tipo) && !afazer.data;
}

// Mesmo dia do mês `meses` meses depois de `base`; se o mês de destino for
// mais curto, cai no último dia dele (dia 31 → 30/abr, 28 ou 29/fev).
export function mesmoDiaMesesDepois(base, meses) {
  const ano = base.getFullYear();
  const mes = base.getMonth() + meses;
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  return new Date(ano, mes, Math.min(base.getDate(), ultimoDia));
}

export function primeiroDiaDoMes(ano, mes) {
  return new Date(ano, mes, 1);
}

export function ultimoDiaDoMes(ano, mes) {
  return new Date(ano, mes + 1, 0);
}

export { toISO, parseISO };
