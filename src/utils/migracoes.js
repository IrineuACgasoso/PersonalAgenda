// src/utils/migracoes.js
//
// Versionamento do schema do AppData. Toda mudança ESTRUTURAL nos dados
// (renomear campo, mover dados de um lugar pra outro, trocar formato de
// chave) precisa de uma migração aqui — não basta mudar o código, porque o
// documento no Firestore e os backups .json antigos continuam no formato
// velho.
//
// COMO ADICIONAR UMA MIGRAÇÃO:
//   1. Incremente VERSAO_ATUAL.
//   2. Adicione MIGRACOES[nova] = (dados na versão anterior) => dados novos.
//      - Função PURA: nunca mutar a entrada; devolva objetos novos.
//      - Deve tolerar campos ausentes (backups antigos são incompletos);
//        o sanitizarDados roda DEPOIS e completa os padrões.
//   3. Teste em tests/unit/migracoes.test.js (entrada antiga → saída nova).
//
// Campos que só ganham um valor padrão NÃO precisam de migração: basta
// registrá-los no sanitizarDados.

export const VERSAO_ATUAL = 1;

export const MIGRACOES = {
  // v0 → v1: baseline. Todos os dados anteriores a 2026-11 (sem `versao`)
  // já estão no formato v1; a migração só passa a marcar a versão.
  1: (dados) => ({ ...dados }),
};

// Versão declarada nos dados. Ausente/inválida = 0 (dados pré-versionamento).
export function versaoDos(dados) {
  const v = dados?.versao;
  return Number.isInteger(v) && v >= 0 ? v : 0;
}

// Dados gravados por uma versão MAIS NOVA do app (ex: outro aparelho já
// atualizou e este ainda roda o PWA antigo em cache). Esta versão não sabe
// interpretá-los, então NÃO pode gravar por cima — ver persist() em
// usePersistedData.js.
export function ehVersaoFutura(dados) {
  return versaoDos(dados) > VERSAO_ATUAL;
}

// Leva os dados de qualquer versão antiga até VERSAO_ATUAL, aplicando as
// migrações em sequência. Dados de versão futura são devolvidos intactos.
export function migrarDados(dados) {
  if (!dados || typeof dados !== "object") return dados;
  let versao = versaoDos(dados);
  if (versao >= VERSAO_ATUAL) return dados;

  let atual = dados;
  while (versao < VERSAO_ATUAL) {
    const migrar = MIGRACOES[versao + 1];
    if (typeof migrar !== "function") {
      throw new Error(`Migração ausente para a versão ${versao + 1} do schema.`);
    }
    versao += 1;
    atual = { ...migrar(atual), versao };
  }
  return atual;
}
