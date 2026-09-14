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
 * Gera as datas (strings "YYYY-MM-DD") em que um afazer ocorre dentro do
 * intervalo [inicioISO, fimISO] (inclusivo), respeitando o limite de repetições.
 */
export function ocorrenciasNoIntervalo(afazer, inicioISO, fimISO) {
  if (!afazer.data) return [];
  const inicioBase = parseISO(afazer.data);
  const inicioRange = parseISO(inicioISO);
  const fimRange = parseISO(fimISO);
  if (inicioBase > fimRange) return [];

  const tipo = afazer.rotina?.tipo || "nenhuma";
  const limiteRepeticoes = Number(afazer.rotina?.totalRepeticoes) > 0 
    ? Number(afazer.rotina.totalRepeticoes) 
    : null;
  const ocorrencias = [];

  if (tipo === "nenhuma") {
    if (inicioBase >= inicioRange && inicioBase <= fimRange) {
      ocorrencias.push(toISO(inicioBase));
    }
    return ocorrencias;
  }

  // Dias específicos da semana (ex: toda Seg/Qua/Sex), a partir da data-base.
  if (tipo === "dias_especificos") {
    const dias = Array.isArray(afazer.rotina?.diasSemana) ? afazer.rotina.diasSemana : [];
    if (dias.length === 0) return ocorrencias;

    let cursor = new Date(inicioBase);
    // sem limite de repetições, adianta o cursor perto do início da janela
    // visualizada (mesma otimização usada pelos outros tipos de rotina)
    if (!limiteRepeticoes && cursor < inicioRange) {
      const diffDias = Math.floor((inicioRange - cursor) / 86400000);
      cursor = new Date(cursor.getTime() + Math.max(0, diffDias - 7) * 86400000);
    }

    let contador = 0;
    let guarda = 0;
    while (cursor <= fimRange && guarda < 3000) {
      if (limiteRepeticoes && contador >= limiteRepeticoes) break;
      const diaSemana = (cursor.getDay() + 6) % 7; // 0 = Segunda ... 6 = Domingo
      if (dias.includes(diaSemana)) {
        contador++;
        if (cursor >= inicioRange) ocorrencias.push(toISO(cursor));
      }
      cursor = new Date(cursor.getTime() + 86400000);
      guarda++;
    }
    return ocorrencias;
  }

  const avancarData = (date) => {
    if (tipo === "mensal") {
      const diaFixo = inicioBase.getDate();
      return new Date(date.getFullYear(), date.getMonth() + 1, diaFixo);
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
      ocorrencias.push(toISO(cursor));
    }
    cursor = avancarData(cursor);
    guarda++;
  }

  return ocorrencias;
}

export function primeiroDiaDoMes(ano, mes) {
  return new Date(ano, mes, 1);
}

export function ultimoDiaDoMes(ano, mes) {
  return new Date(ano, mes + 1, 0);
}

export { toISO, parseISO };