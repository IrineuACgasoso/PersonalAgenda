# tests/

Checagem automática do projeto. Roda em Node puro (sem browser, sem React), em ~1s.

```bash
npm test          # só testes
npm run test:watch
npm run check     # lint (ESLint + Prettier) + testes + build — rodar SEMPRE antes de dar uma tarefa como pronta
npm run format    # corrige a formatação (Prettier) e o que o ESLint souber consertar
```

## Estrutura
| Caminho | O quê |
|---|---|
| `setup.js` | Relógio fixo em **18/11/2026 10:00 (quarta)**, fuso `America/Recife` (definido em `vitest.config.js`) |
| `fixtures/fabricas.js` | Construtores `periodo/cadeira/horario/compromisso/afazer/appData/backupAntigo` no formato real do `AppData` |
| `unit/afazeres.test.js` | Recorrência: todos os tipos de rotina, limite de repetições, exceções de drag, mensal no fim do mês (#12), check de rotina por ocorrência (#11), rotina sem data-base (#40) |
| `unit/calendario.test.js` | Grade do mês, intervalo do mês, vigência da cadeira (#19: regra, validação, texto, herança na cadeira nova), `hexParaRgb`, `formatarData` |
| `unit/sanitizarDados.test.js` | Proteção contra perda de dados: campos preservados, retrocompatibilidade, `pareceVazio` |
| `unit/persistencia.test.js` | Decisões do `persist()`: updater sem race (#6), travas, status do snapshot (#39), despacho imediato sem fila (#54) |
| `unit/backupNuvem.test.js` | Backup na nuvem: intervalo pelo último backup no servidor, nada offline, estado vazio fora da rotação (#8) |
| `unit/carregamento.test.js` | Tela inicial e watchdog: erro de carga vira tela de erro, no máximo 1 reload por sessão (#7) |
| `unit/confirmacaoAdiada.test.js` | Seletor de cor: arrastar gera 1 gravação, sem regravar o mesmo valor (#41) |
| `unit/projecao.test.js` | O que aparece em cada dia do calendário geral (`src/utils/projecao.js`), a ordenação e as chaves de evento por id (#10) / data natural (#14) |
| `unit/migracoes.test.js` | Registro de migrações, v0→atual, v1→v2 (chaves por id, #10), v2→v3 (data natural, #14), v3→v4 (vigência do período → cadeiras, #20), ponta a ponta com a projeção |
| `unit/dialogos.test.js` | Fila/dedupe dos diálogos próprios (#17), aviso de gravação recusada (#44, inclui excluir a última cadeira), resumo do backup na lista de restaurar |
| `unit/desfazer.test.js` | "Desfazer" (#18): reinserir na posição original, sem duplicar, excluir+desfazer = lista original |
| `unit/links.test.js` | `normalizarUrl` e `hrefSeguro` (só http(s) vira link, #50) |
| `unit/integridade.test.js` | Checagens estáticas: ícones do PWA (#15), ordem do CSS, `@media` só no `mobile.css`, `.env` ignorado, regressões de UI (#42, #50, sem `toISOString()` em `src/` #13, sem `alert/confirm/prompt` nativos #17), `check` roda o lint com `src` explícito (#16) |

## Convenções
- **`it.fails(...)` = bug conhecido, documentado no `todo.md`.** O teste descreve o comportamento CORRETO e hoje falha. Quando o bug for corrigido o Vitest acusa erro: troque `it.fails` por `it`.
- Bug corrigido ⇒ adicionar teste de regressão.
- Lógica nova deve ser **pura** (em `src/utils/`) para ser testável aqui; hooks só memoizam (ver `useEventosCalendario` → `utils/projecao.js`).
- Datas nos testes sempre como string `YYYY-MM-DD`. Referência de novembro/2026 no topo de `fabricas.js`.
- Mantenha a suíte rápida: nada de rede, Firebase real ou timers reais.
