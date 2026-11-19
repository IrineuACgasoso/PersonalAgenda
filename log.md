# log.md — Alterações recentes e pendências entre sessões

> Entrada mais nova no topo. Manter só as últimas ~10 sessões; o resto o git guarda.
> Formato: data · resumo · arquivos tocados · estado (build/testes) · pendências de curto prazo.

---

## 2026-11-19 (4) — #43 undefined, #7 tela de erro de carga, #8 backup na nuvem
- **Processo:** usuário liberou **commit + push direto na main** para itens não críticos com `npm run check` verde (memória atualizada). Cada item abaixo foi um commit + push separado.
- **#43 (`9dc3b6c`):** `removerUndefined()` (profundo, não muta) no fim do `sanitizarDados` + `ignoreUndefinedProperties: true` no `initializeFirestore` (`src/firebase.js`). Causa concreta corrigida na origem: `alternarFeitoAfazer` não grava mais `concluidoEm: undefined` ao desmarcar. +6 testes (`sanitizarDados`, `persistencia`).
- **#7 (`2eeb4d3`):** `usePersistedData` expõe `erroCarga` + `tentarDeNovo()` (refaz a carga sem reload, via `tentativa` nas deps do efeito 2; automático no evento `online` e a cada 30s). `App` mostra `ui/TelaErroCarga.jsx` ("Tentar de novo" e "Usar sem login", com aviso de que o que for editado assim fica só no aparelho). Watchdog: no máximo **1 reload por sessão** (`sessionStorage`); na 2ª vez, tela "travado". Decisões em `utils/carregamento.js`; CSS no fim de `painel.css`. +8 testes.
- **#8:** `useCloudBackup` reescrito: intervalo de 3h contado do backup mais recente **no servidor**, efeito depende só de `[user, dadosCarregados]` (lê `data` de um ref), `emAndamento` antes do 1º `await`, offline não tenta, estado vazio não entra na rotação (que agora lê do servidor). `App` só liga o backup com `data` presente. Decisões em `utils/backupNuvem.js`. +12 testes. Texto do "sem backups" no restaurar atualizado.
- **Testes:** 134 ✅ + 2 `it.fails` conhecidos. `npm run check` ✅. Dev server conferido (módulos novos compilam, 200).
- **Docs:** `todo.md`, `organization.md`, `tests/README.md`.
- **➡ Próximo passo recomendado:** **#9** precisa de decisão do usuário (religar `useAutoBackup` ou remover). Depois **#10** (chaves de evento por id — mexe em schema/migração ⇒ **crítico, perguntar antes de commitar**) ou, se preferir algo leve antes, **#11/#12**.
- **Testar no app:** (1) desmarcar um afazer antigo já concluído → bolinha volta a "sincronizado" (não fica em "Erro ao salvar"); (2) janela anônima, logar, DevTools → Offline, recarregar → em vez de recarregar sem parar, aparece "Sem conexão" com "Tentar de novo"; voltar a rede → carrega sozinho em até 30s; (3) recarregar o app várias vezes seguidas → a lista de "Restaurar da nuvem" **não** ganha um backup novo por reload.

---

## 2026-11-19 (3) — #54 gravações offline sem fila + #41 seletor de cor
- **Commit** do trabalho da sessão (2) (`e3cb26b`), que estava pendente.
- **#54:** a fila serializada do `persist()` saiu. `criarDespachante()` (`utils/persistencia.js`) chama `setDoc` **na hora**; cada edição entra logo na fila persistente do Firestore (IndexedDB, sobrevive a fechar o app offline) e o SDK garante a ordem das escritas. A promise só serve para o status (`ultima` = só a mais recente muda a bolinha) e para `pendentes` (o `onSnapshot` segue ignorado enquanto > 0). Erro síncrono (localStorage cheio, deslogado) vira `ok=false` em vez de exceção.
- **#41:** `SeletorCor` mantém a prévia local enquanto arrasta; `onChange` só sai no `change` nativo (fechar o seletor), no blur do swatch, ao desmontar ou 400ms parado, sem regravar o mesmo valor (`utils/confirmacaoAdiada.js`). O campo hex continua gravando na hora. Drawers passam `key={id}` (trocar de item confirma a cor pendente no item anterior); o formulário de afazer usa `adiarMs={0}` (é só estado local).
- **Testes:** +5 em `persistencia.test.js` (despacho imediato com anterior pendente = regressão do #54), +6 em `confirmacaoAdiada.test.js`. Total 110 (108 ✅ + 2 `it.fails` conhecidos). `npm run check` ✅.
- **Docs:** `todo.md`, `organization.md`, `tests/README.md`.
- **➡ Próximo passo recomendado:** **#43** (`undefined` no estado trava todas as gravações: `ignoreUndefinedProperties` + `sanitizarDados` removendo `undefined`), depois **#7** (loop de reload offline).
- **Testar no app:** (1) no drawer de uma cadeira, arrastar na roda de cores e soltar → a bolinha de status deve ir para "salvando" só uma vez; (2) offline (DevTools → Network → Offline), fazer 2–3 edições, recarregar a página ainda offline → as edições devem continuar lá; voltar a rede → "sincronizado".

---

## 2026-11-19 (2) — #6 persist(updater) + #39 status de sync
- **Feito:** `persist()` aceita updater `(d) => novo` que lê um `dataRef` (estado mais recente, atualizado de forma síncrona em todo `setData`) — duas ações no mesmo tick não se sobrescrevem mais. Todas as ações do `App.jsx` migradas para a forma de updater. Lógica pura nova em `src/utils/persistencia.js`: `resolverGravacao` (versão futura, sanitiza, trava `pareceVazio`, `"sem-mudanca"` quando o updater devolve o próprio estado) e `statusDoSnapshot`. `persist()` agora devolve `{ ok, motivo }` na hora (pronto pro #44); "Restaurar da nuvem" usa isso para não anunciar sucesso falso.
- **#39:** snapshot só marca `saved`/`marcarSincronizado()` com `!fromCache && !hasPendingWrites` (escrita pendente → `saving`/`offline`); o `setDoc` resolvido também marca sincronizado. `pendentesRef`: enquanto há `persist()` na fila, o `onSnapshot` é ignorado (antes a confirmação do 1º write fazia a tela voltar ao estado anterior até o 2º sair da fila).
- **Testes:** `tests/unit/persistencia.test.js` (10). Total 99 (97 ✅ + 2 `it.fails` conhecidos). `npm run check` ✅.
- **Docs:** `todo.md` (#6/#39 feitos, **#54 novo**), `organization.md`, `tests/README.md`.
- **Achado novo (#54, aguarda aprovação):** offline, a fila serializada segura todo `setDoc` depois do 1º (ele só resolve com o servidor), então essas edições ficam só na memória e se perdem se o app fechar sem rede. Proposta: disparar `setDoc` na hora (o SDK já garante a ordem).
- **➡ Próximo passo recomendado:** decidir #54 (mesmo arquivo, rápido); depois #41 (seletor de cor com debounce).
- **Testar no app:** editar nome de cadeira e clicar direto em "Adicionar horário" → nome deve permanecer; bolinha de status deve ficar em "salvando" até o servidor confirmar.

---

## 2026-11-19 (1) — #5 sanitizarDados normaliza cadeiras/compromissos
- **Feito:** `src/utils/sanitizarDados.js` ganhou `listaDeObjetos`, `sanitizarCadeira` (`horarios/links/datas`) e `sanitizarCompromisso` (`horarios`). Lista ausente/inválida vira `[]`; itens que não são objeto (`null`, string, número) são descartados em `cadeiras`, `compromissos`, `afazeres` e nas listas internas (antes um `null` em `afazeres` fazia o próprio `sanitizarDados` lançar erro). Campos extras continuam preservados (spread).
- **Testes:** `it.fails` de `sanitizarDados.test.js` → `it` (regressão) + 3 novos (compromisso sem `horarios`, preservação de conteúdo/campos extras, descarte de lixo). Total 89 (87 ✅ + 2 `it.fails` conhecidos: mensal dia 31 e ícone maskable). `npm run check` ✅.
- **Docs:** `todo.md` (#5 feito), `organization.md` (descrição do `sanitizarDados`).
- **➡ Próximo passo recomendado:** **#6 + #39** juntos (`usePersistedData.js`: `persist(updater)` funcional + status "sincronizado" só quando `!hasPendingWrites`). Considerar já a assinatura `{ ok, motivo }` do #44 para não mexer no `persist` duas vezes.
- **Pendências de curto prazo:** as mesmas da sessão anterior (confirmar sync com as Rules recarregando a página; nome longo no celular; decidir #9).

---

## 2026-11-18 (4) — #3 Code review completa
- **Feito:** leitura de todo o JS (`src/` inteiro, `vite.config.js`, `firestore.rules`, `index.html`) + varredura de classes CSS sem uso. **Nenhuma alteração de código** — só `todo.md` e este log.
- **Achados novos → `todo.md` #39–#53**, encaixados nas fases (vale a posição, não o número):
  - 🔴 Fase 2: **#39** "Nuvem sincronizada" antes do servidor confirmar (`hasPendingWrites` ignorado) · **#41** seletor de cor grava a cada pixel arrastado (dezenas de `setDoc`/s) · **#43** um `undefined` no estado faz todas as gravações falharem · **#40** rotina sem data-base nunca aparece no calendário · **#42** gatilho "novo afazer na data" fica preso na aba Afazeres · **#50** `href` de link sem validar o esquema (`javascript:` via backup).
  - 🟡 **#44** `persist()` recusado falha em silêncio ("Backup restaurado com sucesso" mesmo bloqueado) · **#45** (dentro do #22) lixeira do calendário em afazer avulso só esconde · **#46** "Próximas datas" começa pelas passadas.
  - 🟢 **#47** multi-aba sem cache offline · **#48** nome vazio no drawer · **#49** "hoje" congelado após meia-noite · **#51** a11y · **#52** chaves de evento órfãs/crescimento do doc · **#53** excluir o último período recria "2026.1".
  - Complementos: **#6** (caso concreto: nome no drawer + clique em Adicionar), **#8** (offline, cada edição enfileira um backup completo), **#13** (confirmados só 2 lugares), **#26** (`.loading-text`, `.vidro`, `.chevron-btn` sem uso).
- **Estado:** código inalterado desde `7546946` → `npm run check` segue como na sessão (3).
- **➡ Próximo passo recomendado:** Fase 2 começando por **#5** (normalizar cadeiras/compromissos no `sanitizarDados`, já tem `it.fails`) e **#6 + #39** juntos (os dois mexem em `usePersistedData.js`; `persist(updater)` + status honesto).
- **Pendências de curto prazo:**
  - [ ] Usuário: confirmar no app que a sincronização segue OK com as Rules novas (login → editar → "Nuvem sincronizada"). Obs.: por causa do #39, esse texto aparece mesmo antes da confirmação; o teste que vale é **recarregar a página e ver a edição lá**.
  - [ ] Usuário: testar no celular a lista do calendário com nome longo (sessão 2).
  - [ ] #9: decidir sobre o `useAutoBackup`.

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
  - [x] Rules publicadas pelo usuário (`firebase deploy --only firestore:rules` → "released rules").
  - [ ] Usuário: confirmar no app (login → editar algo → "Nuvem sincronizada"). Se der "Erro ao salvar"/permissão negada, reverter no console (Firestore → Regras → histórico) e me avisar.
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
