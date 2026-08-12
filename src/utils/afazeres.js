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
 * intervalo [inicioISO, fimISO] (inclusivo). Afazeres sem data não entram
 * no calendário e retornam [].
 */
export function ocorrenciasNoIntervalo(afazer, inicioISO, fimISO) {
  if (!afazer.data) return [];
  const inicioBase = parseISO(afazer.data);
  const inicioRange = parseISO(inicioISO);
  const fimRange = parseISO(fimISO);
  if (inicioBase > fimRange) return [];

  const tipo = afazer.rotina?.tipo || "nenhuma";
  const ocorrencias = [];

  if (tipo === "nenhuma") {
    if (inicioBase >= inicioRange && inicioBase <= fimRange) {
      ocorrencias.push(toISO(inicioBase));
    }
    return ocorrencias;
  }

  let passoDias = 1;
  if (tipo === "diaria") passoDias = 1;
  else if (tipo === "semanal") passoDias = 7;
  else if (tipo === "quinzenal") passoDias = 15;
  else if (tipo === "personalizada")
    passoDias = Math.max(1, Number(afazer.rotina?.intervaloDias) || 1);

  if (tipo === "mensal") {
    const diaFixo = inicioBase.getDate();
    let cursor = new Date(inicioBase);
    // avança até chegar perto do início do intervalo, mês a mês
    while (cursor < inicioRange) {
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, diaFixo);
    }
    while (cursor <= fimRange) {
      if (cursor >= inicioRange) ocorrencias.push(toISO(cursor));
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, diaFixo);
    }
    return ocorrencias;
  }

  let cursor = new Date(inicioBase);
  // avança em passos até entrar no intervalo, evitando laços gigantes
  if (cursor < inicioRange) {
    const diffDias = Math.floor((inicioRange - cursor) / 86400000);
    const passos = Math.floor(diffDias / passoDias);
    cursor = new Date(cursor.getTime() + passos * passoDias * 86400000);
  }
  let guarda = 0;
  while (cursor <= fimRange && guarda < 400) {
    if (cursor >= inicioRange) ocorrencias.push(toISO(cursor));
    cursor = new Date(cursor.getTime() + passoDias * 86400000);
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
