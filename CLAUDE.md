# CLAUDE.md — Minha Agenda Pessoal (UFPE)

PWA pessoal (single-user) para vida acadêmica + rotina: **períodos → cadeiras** (horários, links, datas importantes), **compromissos** semanais, **afazeres** com recorrência e um **calendário geral** que cruza tudo. Offline-first, sync via Firebase quando logado.

**Stack:** React 18 · Vite 5 · Firebase 12 (Auth Google + Firestore com cache IndexedDB) · vite-plugin-pwa · lucide-react · CSS puro (dark). Sem TypeScript, sem state manager, sem framework de UI.

## Antes de trabalhar (economia de tokens)
1. Leia **`log.md`** (o que mudou recentemente + pendências da última sessão).
2. Use **`organization.md`** para achar o arquivo/função certo **antes** de abrir código. Não releia o projeto inteiro.
3. Escopo de trabalho vem de **`todo.md`** (backlog priorizado).
4. Ao fim de cada sessão: adicione entrada no `log.md`, marque itens do `todo.md`, e atualize `organization.md` se criar/mover/remover arquivos ou funções relevantes.

## Comandos
- `npm run dev` → http://localhost:5173 (precisa de `.env` com `VITE_FIREBASE_*`, mesmo sem login)
- `npm run check` → testes + build. **Verificação obrigatória antes de dar qualquer tarefa como pronta.**
- `npm test` → só os testes (Vitest, ~1s) · `npm run test:watch` · `npm run build` · `npm run preview`
- Convenções dos testes em `tests/README.md`. `it.fails` = bug conhecido; ao corrigir o bug, trocar por `it`. Bug corrigido ⇒ teste de regressão.
- Lógica nova vai para funções **puras** em `src/utils/` (testáveis); hooks só memoizam.

## Regras do código (invioláveis)
- **Toda escrita passa por `persist()`** (`src/hooks/usePersistedData.js`). Nunca gravar direto em localStorage/Firestore para dados do app.
- **Campo novo no modelo de dados ⇒ registrar em `src/utils/sanitizarDados.js`.** Campos não listados lá podem ser apagados no próximo `persist()` (já causou bug com `rotina.diasSemana` e `excecoesData`).
- **Nunca** criar caminho que grave estado vazio por cima do documento remoto. Respeitar `pareceVazio()` e a leitura forçada no servidor.
- **Ocorrências recorrentes nunca são persistidas** — são derivadas sob demanda (`useEventosCalendario`, `ocorrenciasNoIntervalo`). Só exceções são salvas (`eventosConcluidos`, `eventosExcluidos`, `datasConcluidas`, `excecoesData`).
- **Edição de listas é atômica**: um único `.map()` por `id`. Nunca "remover + adicionar" em duas chamadas (closure com array velho ⇒ duplicata).
- Mudança de schema ⇒ manter **retrocompatibilidade** com backups `.json` antigos e com o documento atual no Firestore (migração em `sanitizarDados`).
- Datas são strings locais `YYYY-MM-DD` / `HH:MM`. Use `toISO`/`parseISO` de `utils/afazeres.js`; **não use `toISOString()`** para "hoje" (UTC ≠ Recife, UTC-3).
- Dia da semana: **0 = Segunda … 6 = Domingo** (`(getDay() + 6) % 7`).
- CSS: regras vão no arquivo temático em `src/styles/`; `app.css` só importa. **Tudo de mobile (≤860px) fica em `mobile.css`**, que é importado por último.
- Não alterar `EMAIL_PERMITIDO` (`src/firebase.js`) nem a trava de login sem pedido explícito.

## Convenções
- Idioma: **PT-BR** em UI, nomes de variáveis/funções e comentários (ex.: `criarCadeira`, `onAlternarFeito`).
- Comentários explicam o **porquê** (o código atual é bem comentado — manter o padrão).
- Componentes: `Visao*` = telas da sidebar; `Painel*` = drawers de edição; `abas/` = sub-abas do drawer; `ui/` = peças reutilizáveis.
- Commits: só quando o usuário pedir. Mensagens curtas em PT.
