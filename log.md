# log.md — Alterações recentes e pendências entre sessões

> Entrada mais nova no topo. Manter só as últimas ~10 sessões; o resto o git guarda.
> Formato: data · resumo · arquivos tocados · estado (build/testes) · pendências de curto prazo.

---

## 2026-11-18 (3) — #1 Rules, #2 npm audit, #4 schema versionado
- **Push** do commit anterior (`a966a2d`) para `origin/main`.
- **#1 Firestore Rules** (`firestore.rules`, `firebase.json`, `.firebaserc`): uid + e-mail permitido + `email_verified` no servidor; formato mínimo do AppData (`periodos` não vazio, listas obrigatórias, `versao` int); doc principal não pode ser apagado; backups só create/delete com id = timestamp; resto negado. Compilado no servidor com `--dry-run` ✅. **O deploy real foi bloqueado pela permissão do modo automático → o usuário precisa rodar `firebase deploy --only firestore:rules`.**
- **#2 Dependências:** firebase 12.17→12.19; `overrides` `@grpc/grpc-js ^1.14.7` (o firebase, até o 13, fixa `~1.9`, e o grpc só é usado no Node, não no bundle); Vite 5→6.4.6, Vitest 2→4.1.12, plugin-react 4.7. `npm audit --omit=dev` = 0. Restam 4 moderate (workbox/glob, só no build) → #30. Dev server conferido (200 em index/main/App/projecao).
- **#4 Versionamento:** `src/utils/migracoes.js` (`VERSAO_ATUAL=1`, v0→v1 baseline), chamado no início do `sanitizarDados`; `DADOS_PADRAO.versao`. `persist()` bloqueia gravação se os dados forem de versão futura (novo status `desatualizado` na Sidebar). Import/restore da nuvem recusam backup de versão futura; `importarBackup` preserva `versao` (sem isso, um backup migrado seria migrado de novo).
- **Testes:** +`migracoes.test.js` (12) e +4 de Rules em `integridade.test.js`. Total 86 (83 ✅ + 3 `it.fails` conhecidos). `npm run check` ✅.
- **Docs:** `CLAUDE.md` (pedir `/clear` ao fim de cada feature; git na main só com check verde; regras de migração e Rules), `organization.md`, `todo.md`, `README.md` (Rules via arquivo, Vite 6, testes).
- **➡ Próximo passo recomendado:** o usuário publica as Rules e testa o app (login, editar algo, ver "Nuvem sincronizada"). Depois, **#3 code review completa**, que vai alimentar a fase 2 (#5–#15, bugs de dados). Começar a fase 2 por **#5** e **#6**.
- **Pendências de curto prazo:**
  - [ ] Usuário: `firebase deploy --only firestore:rules` e confirmar a sincronização. Se der "Erro ao salvar"/permissão negada, reverter no console (Firestore → Regras → histórico) e me avisar.
  - [ ] Usuário: testar no celular a lista do calendário com nome longo (sessão 2).
  - [ ] #9: decidir sobre o `useAutoBackup`.

---

## 2026-11-18 (2) — Bug do nome cortado no mobile + pasta tests/ + TODO por nível
- **Bug corrigido:** na lista "Eventos em DD/MM" do calendário geral, o nome do evento era cortado com "..." (`nowrap` inline). Agora quebra linha e o item/faixa cresce em altura. No mobile, as colunas de urgência e hora ficaram mais estreitas e a faixa mais grossa. O "fantasma" do drag passou a ter largura máxima com reticências.
  - `src/components/VisaoGeral.jsx` (estilos inline → classes), `src/styles/agenda.css` (`.data-item-texto/-titulo-quebra/-sub/-urgencia/-hora`, `.drag-ghost-titulo`), `src/styles/mobile.css`.
- **Testes:** Vitest 2.1.9 (dev). `vitest.config.js`, `tests/` (setup com relógio fixo, fábricas, 5 arquivos, 69 testes, ~1s). Scripts `test`, `test:watch`, `check`.
  - 3 bugs conhecidos documentados como `it.fails` (mensal dia 31, cadeira sem `links`, ícone maskable).
- **Refatoração (sem mudança de comportamento):** a projeção do calendário saiu de `useEventosCalendario.js` para `src/utils/projecao.js` (puro), e o hook agora só memoiza. A ordem de concatenação e a ordenação são idênticas.
- **Docs:** `todo.md` reorganizado em 🔴 ALTO / 🟡 MÉDIO / 🟢 BAIXO, com ordem de execução `#1–#38` e dependências. Ideias aprovadas pelo usuário entraram como BAIXO (#31–#38), exceto modais próprios/undo (MÉDIO #17–#18). `CLAUDE.md` passa a exigir `npm run check`.
- **Achados novos:** `npm audit` aponta `@grpc/grpc-js` e `re2js` (via firebase) e `esbuild`/`brace-expansion`/`fast-uri` (dev) → `todo.md` #2. A rotina mensal no dia 31 é pior do que o anotado: pula fevereiro e abril.
- **Estado:** `npm run check` ✅ (69 testes + build). Correção do mobile validada só por teste/CSS; **falta conferir no celular de verdade.**
- **➡ Próximo passo recomendado:** **#1 Firestore Rules versionadas e endurecidas** (inclui a trava por e-mail no servidor), seguido de **#2 `npm audit`** (atualizar `firebase`). Os dois são pequenos, isolados e fecham a parte de segurança antes de mexer em dados. Depois, **#4 schema versionado**, que destrava a maioria dos itens.
- **Pendências de curto prazo:**
  - [ ] Usuário testar no celular a lista do calendário geral com um nome longo.
  - [ ] #9: usuário decidir se religa o backup diário (`useAutoBackup`) ou remove.
  - [ ] #23: usuário escolher a abordagem dos lembretes (a/b/c) quando chegar lá.

---

## 2026-11-18 (1) — Documentação para o Claude
- **Feito:** leitura completa do projeto; criados `CLAUDE.md` (regras + escopo), `organization.md` (árvore + atalhos), `todo.md` (backlog priorizado com os pedidos do usuário + achados da leitura), `log.md`.
- **Código:** nenhuma alteração.
- **Estado:** `npm run build` ✅ (aviso de chunk de 970 kB, conhecido). Sem testes automatizados.
- **Achados principais da leitura** (detalhes no `todo.md` P0): `useAutoBackup` não é usado; `icon-maskable-512.png` inexistente; "hoje" em UTC na Agenda; rotina mensal deriva em dias 29–31; chaves de evento por nome; concluir rotina na aba Afazeres marca a rotina toda.
- **Pendências:** resolvidas na sessão (2). Ideias aprovadas, docs vão para o git, bug do mobile e `tests/` feitos.

---

## Histórico anterior (resumo do git)
- 2026-10-21 `Clean README` — README com screenshots em `docs/screenshots/`.
- 2026-09-30 — removidos `agenda.zip` e `contexto-projeto.md` (doc antigo, disponível em `git show e2c8770:contexto-projeto.md`).
- 2026-09-22 `Auto reload + Offline` — watchdog de 12s, fallback cache Firestore, `ultimaSincronizacao`, status offline.
- 2026-09-18 `FIXED bug de afazeres com rotinas`; antes: dias específicos, deletar afazer no dia, remake visual, ícones Android, cadastro de cadeiras reformulado, backups automáticos, Firebase seguro contra deleções, drag-and-drop no calendário.
