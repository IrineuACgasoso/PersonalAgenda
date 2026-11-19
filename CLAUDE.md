# CLAUDE.md — Minha Agenda Pessoal (UFPE)

PWA pessoal (single-user) para vida acadêmica + rotina: **períodos → cadeiras** (horários, links, datas importantes), **compromissos** semanais, **afazeres** com recorrência e um **calendário geral** que cruza tudo. Offline-first, sync via Firebase quando logado.

**Stack:** React 18 · Vite 6 · Firebase 12 (Auth Google + Firestore com cache IndexedDB) · vite-plugin-pwa · lucide-react · CSS puro (dark) · Vitest 4. Sem TypeScript, sem state manager, sem framework de UI.

## Antes de trabalhar (economia de tokens)
1. Leia **`log.md`** (o que mudou recentemente + pendências da última sessão).
2. Use **`organization.md`** para achar o arquivo/função certo **antes** de abrir código. Não releia o projeto inteiro.
3. Escopo de trabalho vem de **`todo.md`** (backlog priorizado).
4. Ao fim de cada sessão: adicione entrada no `log.md`, marque itens do `todo.md`, e atualize `organization.md` se criar/mover/remover arquivos ou funções relevantes.
5. **Ao terminar uma feature de ponta a ponta** (implementada, testada, docs atualizados, commit/push feitos): **peça ao usuário para rodar `/clear`** e limpar o contexto antes da próxima. O `log.md` garante a continuidade.

## Comandos
- `npm run dev` → http://localhost:5173 (precisa de `.env` com `VITE_FIREBASE_*`, mesmo sem login)
- `npm run check` → lint (ESLint + Prettier, `--max-warnings 0`) + testes + build. **Verificação obrigatória antes de dar qualquer tarefa como pronta.** Formatação quebrada ⇒ `npm run format`.
- Lint/Prettier recebem `src` **explicitamente**: no OneDrive a pasta é um ponto de reparse (o Node a vê como symlink) e `eslint .`/`prettier .` a pulam em silêncio.
- `npm run funcoes:sincronizar` → copia `src/utils/lembretes.js` para `functions/compartilhado/` (o teste de integridade exige que sejam iguais; o predeploy das funções também roda).
- `npm test` → só os testes (Vitest, ~1s) · `npm run test:watch` · `npm run build` · `npm run preview`
- Convenções dos testes em `tests/README.md`. `it.fails` = bug conhecido; ao corrigir o bug, trocar por `it`. Bug corrigido ⇒ teste de regressão.
- Lógica nova vai para funções **puras** em `src/utils/` (testáveis); hooks só memoizam.

## Regras do código (invioláveis)
- **Toda escrita passa por `persist()`** (`src/hooks/usePersistedData.js`). Nunca gravar direto em localStorage/Firestore para dados do app.
- **Campo novo no modelo de dados ⇒ registrar em `src/utils/sanitizarDados.js`.** Campos não listados lá podem ser apagados no próximo `persist()` (já causou bug com `rotina.diasSemana` e `excecoesData`).
- **Nunca** criar caminho que grave estado vazio por cima do documento remoto. Respeitar `pareceVazio()` e a leitura forçada no servidor.
- **Ocorrências recorrentes nunca são persistidas** — são derivadas sob demanda (`useEventosCalendario`, `ocorrenciasNoIntervalo`). Só exceções são salvas (`eventosConcluidos`, `eventosExcluidos`, `datasConcluidas`, `excecoesData`).
- **Edição de listas é atômica**: um único `.map()` por `id`. Nunca "remover + adicionar" em duas chamadas (closure com array velho ⇒ duplicata).
- **Mudança estrutural de schema ⇒ nova migração em `src/utils/migracoes.js`** (subir `VERSAO_ATUAL`, função pura, teste em `tests/unit/migracoes.test.js`). Backups `.json` antigos e o doc no Firestore continuam no formato velho. Campo que só ganha valor padrão não precisa de migração, só do `sanitizarDados`. Nunca descartar `versao` ao montar/importar dados.
- **Segurança:** `firestore.rules` é a fonte da verdade (e-mail precisa bater com `EMAIL_PERMITIDO`; os campos obrigatórios com `DADOS_PADRAO`, checado em `integridade.test.js`). Campo novo obrigatório no doc ⇒ atualizar as Rules. Deploy (`firebase deploy --only firestore:rules`) é feito **pelo usuário**.
- Datas são strings locais `YYYY-MM-DD` / `HH:MM`. Use `toISO`/`parseISO` de `utils/afazeres.js`; **não use `toISOString()`** para "hoje" (UTC ≠ Recife, UTC-3).
- Dia da semana: **0 = Segunda … 6 = Domingo** (`(getDay() + 6) % 7`).
- CSS: regras vão no arquivo temático em `src/styles/`; `app.css` só importa. **Tudo de mobile (≤860px) fica em `mobile.css`**, que é importado por último.
- **Nada de `window.alert/confirm/prompt`**: use `useDialogos()` (`avisar`, `confirmar`, `notificar` com "Desfazer"). Excluir item simples não pede confirmação: mostra toast com "Desfazer" (#18). Teste estático em `integridade.test.js`.
- Ações do `App.jsx` gravam por `gravar()` (wrapper do `persist()` que avisa recusas, #44), não chamam `persist()` direto.
- **Lembretes (#23):** `src/utils/lembretes.js` roda também na Cloud Function ⇒ **sem imports** e, ao mudar, `npm run funcoes:sincronizar`. Mudar onde ficam compromissos/avaliações no schema ⇒ ajustar `listarLembretes` e o usuário precisa redeployar as funções (`firebase deploy --only functions`). A função **só lê** o doc principal; registro de aparelho (`users/{uid}/dispositivos`) não é dado do app (não passa pelo `persist()`).
- Não alterar `EMAIL_PERMITIDO` (`src/firebase.js`) nem a trava de login sem pedido explícito.

## Convenções
- Idioma: **PT-BR** em UI, nomes de variáveis/funções e comentários (ex.: `criarCadeira`, `onAlternarFeito`).
- Comentários explicam o **porquê** (o código atual é bem comentado — manter o padrão).
- Componentes: `Visao*` = telas da sidebar; `Painel*` = drawers de edição; `abas/` = sub-abas do drawer; `ui/` = peças reutilizáveis.
- Git: commits **direto na `main`**, só com `npm run check` verde. Push para a `main` é como o usuário testa no app (deploy). Commit/push só quando o usuário pedir na sessão. Mensagens curtas em PT.
