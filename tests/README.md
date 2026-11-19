# tests/

Checagem automática do projeto. Roda em Node puro (sem browser, sem React), em ~1s.

```bash
npm test          # só testes
npm run test:watch
npm run check     # testes + build — rodar SEMPRE antes de dar uma tarefa como pronta
```

## Estrutura
| Caminho | O quê |
|---|---|
| `setup.js` | Relógio fixo em **18/11/2026 10:00 (quarta)**, fuso `America/Recife` (definido em `vitest.config.js`) |
| `fixtures/fabricas.js` | Construtores `periodo/cadeira/horario/compromisso/afazer/appData/backupAntigo` no formato real do `AppData` |
| `unit/afazeres.test.js` | Recorrência: todos os tipos de rotina, limite de repetições, exceções de drag |
| `unit/calendario.test.js` | Grade do mês, intervalo do mês, vigência, `hexParaRgb`, `formatarData` |
| `unit/sanitizarDados.test.js` | Proteção contra perda de dados: campos preservados, retrocompatibilidade, `pareceVazio` |
| `unit/persistencia.test.js` | Decisões do `persist()`: updater sem race (#6), travas, status do snapshot (#39) |
| `unit/projecao.test.js` | O que aparece em cada dia do calendário geral (`src/utils/projecao.js`) e a ordenação |
| `unit/integridade.test.js` | Checagens estáticas: ícones do PWA, ordem do CSS, `@media` só no `mobile.css`, `.env` ignorado, regressões de UI |

## Convenções
- **`it.fails(...)` = bug conhecido, documentado no `todo.md`.** O teste descreve o comportamento CORRETO e hoje falha. Quando o bug for corrigido o Vitest acusa erro: troque `it.fails` por `it`.
- Bug corrigido ⇒ adicionar teste de regressão.
- Lógica nova deve ser **pura** (em `src/utils/`) para ser testável aqui; hooks só memoizam (ver `useEventosCalendario` → `utils/projecao.js`).
- Datas nos testes sempre como string `YYYY-MM-DD`. Referência de novembro/2026 no topo de `fabricas.js`.
- Mantenha a suíte rápida: nada de rede, Firebase real ou timers reais.
