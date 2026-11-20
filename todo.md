# todo.md — Backlog

**Níveis:** 🔴 **ALTO** (bugs, problemas graves, race conditions, fallbacks, feats fundamentais, cibersegurança) · 🟡 **MÉDIO** (bom funcionamento, feats importantes, outros tratamentos, reformulações visuais) · 🟢 **BAIXO** (o resto).

**Ordem:** o número `#N` é a **ordem de execução recomendada**. Ela foi montada para nada quebrar: segurança e fundação primeiro, depois os bugs de dados, depois as reformulações (que mudam o schema), e o resto por último. Respeite o `Depende de`.
**Itens `#39+`** vieram da code review (#3) e foram encaixados na fase certa sem renumerar os antigos: para eles, vale a **posição na lista** (e o "logo após #N"), não o número.
**Regra para cada item:** `npm run check` verde + teste novo/ajustado em `tests/` + entrada no `log.md`.
Marcação: `[ ]` aberto · `[~]` em andamento · `[x]` feito (manter 1–2 sessões e depois apagar; o histórico fica no `log.md`).

---

## 🔴 ALTO

### Fase 1 — Segurança e fundação
- [x] **#1 Versionar e endurecer as Firestore Rules.** `firestore.rules` + `firebase.json` + `.firebaserc`, 4 testes de sincronia em `integridade.test.js`. **Publicadas em 2026-11-18** pelo usuário. Falta só confirmar no app que a sincronização segue funcionando. Opcional depois: testes de comportamento com o emulador (precisa de Java).
- [x] **#2 Dependências vulneráveis.** Produção: **0 vulnerabilidades** (firebase 12.19 + override `@grpc/grpc-js ^1.14.7`). Dev: Vite 5→6.4.6, Vitest 2→4.1, plugin-react 4.7. Restam 4 *moderate* no `glob/minimatch` do `workbox-build` (vite-plugin-pwa), que roda só no build sobre padrões do próprio projeto: **risco aceito**, revisar em #30.
- [x] **#3 Code review completa do projeto** (2026-11-18). Todo o JS lido + varredura de CSS morto. Achados novos: **#39–#53** (espalhados nas fases abaixo); complementos em #6, #8, #13 e #26.
- [x] **#4 Schema versionado + migrações.** `src/utils/migracoes.js` (`VERSAO_ATUAL = 1`, baseline), aplicado dentro de `sanitizarDados`. Proteção: a versão antiga do app **não grava** sobre dados de versão futura (status "desatualizado"), e import/restore recusam backup futuro. `importarBackup` agora preserva `versao`.

### Fase 2 — Bugs de dados, race conditions e fallbacks
- [x] **#5 `sanitizarDados` normaliza cadeiras/compromissos** (2026-11-19). `horarios/links/datas` (cadeira) e `horarios` (compromisso) sempre viram arrays; itens que não são objetos (`null`, string) são descartados nas listas, inclusive em `afazeres`. `it.fails` virou teste de regressão + 3 testes novos.
- [x] **#6 Race condition em `persist()`** (2026-11-19). `persist((d) => novo)` lê um `dataRef` sempre atualizado; todas as ações do `App.jsx` migradas. Decisão pura em `utils/persistencia.js` (`resolverGravacao`), devolve `{ ok, motivo }` (base do #44). `onSnapshot` ignorado enquanto há `persist()` na fila (evitava a tela "voltar no tempo"). "Restaurar da nuvem" não diz mais "sucesso" quando o `persist()` recusa.
- [x] **#39 Status "sincronizado" só com o servidor confirmando** (2026-11-19). `statusDoSnapshot`: `saved` + `marcarSincronizado()` só com `!fromCache && !hasPendingWrites`; o fim do `setDoc` (que só resolve com o servidor) também marca.
- [x] **#54 Edições offline depois da 1ª ficavam só na memória** (2026-11-19). Sem fila: `criarDespachante` (`utils/persistencia.js`) chama `setDoc` na hora — cada edição entra logo na fila persistente do Firestore (IndexedDB), e o SDK garante a ordem. A promise só alimenta status/`pendentes`.
- [x] **#41 Seletor de cor gravava a cada pixel arrastado** (2026-11-19). Arrastar só muda a prévia; `onChange` sai no `change` nativo (fechar o seletor), no blur, ao desmontar ou após 400ms parado, sem repetir o mesmo valor (`utils/confirmacaoAdiada.js`). Drawers passam `key={id}` para a cor pendente ir pro item certo.
- [x] **#43 `undefined` no estado travava todas as gravações** (2026-11-19). `removerUndefined` (profundo) no fim do `sanitizarDados` + `ignoreUndefinedProperties: true` no `initializeFirestore`; a causa concreta (`alternarFeitoAfazer` gravando `concluidoEm: undefined` ao desmarcar) corrigida na origem. +6 testes.
- [x] **#7 Loop de reload offline** (2026-11-19). Erro de carga sem base local (`erroCarga` no `usePersistedData`) → `TelaErroCarga` com "Tentar de novo" (nova leitura sem reload; automática no evento `online` e a cada 30s) e "Usar sem login" (dados só do aparelho, com aviso). O watchdog do `App` recarrega no máximo 1× por sessão (sessionStorage); na 2ª vez mostra a tela de erro. Decisões puras em `utils/carregamento.js` + 8 testes.
- [x] **#8 `useCloudBackup` fazia snapshot a cada abertura / um por edição offline** (2026-11-19). O intervalo de 3h agora conta a partir do backup mais recente **no servidor** (`getDocsFromServer`), o timer não é recriado a cada mudança de `data` (lê de um ref), `emAndamento` é marcado antes do 1º `await` (nunca 2 ao mesmo tempo) e offline nem tenta. Estado vazio (`pareceVazio`) não entra na rotação. Decisões puras em `utils/backupNuvem.js` + 12 testes.
- [x] **#9 `useAutoBackup` removido** (2026-11-19). Decisão do usuário: o backup na nuvem já cobre; hook apagado e README atualizado (backup em 2 camadas: nuvem + exportar/importar `.json`).
- [x] **#10 Chaves de evento por id** (2026-11-19). Aulas `aulas|ISO|idCadeira|idHorario`, compromissos `compromissos|ISO|idComp|idHorario`, avaliações `avaliacoes|idCadeira|idAvaliacao` (sem data: mudar a data da prova mantém o check). Migração **v2** converte as chaves salvas (nome repetido vira uma chave por item; órfãs descartadas).
- [x] **#11 Check de rotina na aba Afazeres** (2026-11-19). Conclui só a ocorrência de hoje (ou a próxima), mostrada na linha ("hoje" / "próx.: DD/MM"). Rotina nunca entra em "concluídos" nem em "Apagar concluídos" (`afazerConcluido`), mesmo com `feito` antigo. A semântica final continua no #22.
- [x] **#12 Rotina mensal em dia 29–31** (2026-11-19). `mesmoDiaMesesDepois`: n-ésima ocorrência calculada da data-base, limitada ao último dia do mês.
- [x] **#40 Rotina sem data sumia do calendário** (2026-11-19). Diária/semanal/quinzenal/mensal/personalizada salva sem data começa hoje (`dataAoSalvarAfazer`). As antigas sem data mostram aviso na lista ("edite e salve"); não foram migradas (a data teria de ser inventada).
- [x] **#13 "Hoje" em UTC** (2026-11-19). `VisaoAgenda` e nome do arquivo de `exportarBackup` usam `toISO(new Date())`. Teste estático: nenhum `.toISOString()` em `src/`.
- [x] **#14 Conclusão/exclusão de ocorrência pela data natural** (2026-11-19). `datasConcluidas` e a chave `afazeres|id|data` usam `dataOriginal`. Migração **v3** adiciona a origem de cada ocorrência arrastada (mantendo o destino, para nada mudar na tela).
- [x] **#15 Ícone maskable** (2026-11-19). `vite.config.js` aponta para `web-app-manifest-512x512.png`; `public/site.webmanifest` (não usado) removido.
- [x] **#42 "Novo afazer nesta data" preso** (2026-11-19). O formulário chama `onGatilhoConsumido` e o `App` limpa o gatilho.
- [x] **#50 Links sem validar o esquema** (2026-11-19). `hrefSeguro` (`utils/links.js`): só `http(s)://` vira `href`; o resto aparece sem abrir.

---

## 🟡 MÉDIO

### Fase 3 — Infra de qualidade (antes das reformulações)
- [x] **#16 ESLint + Prettier** (2026-11-19). ESLint 10 (flat, `eslint.config.js`) + `react-hooks` (`rules-of-hooks`, `exhaustive-deps`) + `react-refresh` + `eslint-config-prettier`; Prettier (`printWidth` 120, `endOfLine: auto`). `npm run lint` (`--max-warnings 0`) entra no `check`; `npm run format` corrige. `src` vai explícito nos scripts (OneDrive: o Node vê a pasta como symlink e `eslint .` a pulava). As regras do React Compiler (`set-state-in-effect`, `refs`… ~27 achados) ficaram de fora — avaliar junto com o #24.
- [x] **#17 Modais próprios no lugar de `alert/confirm/prompt`** (2026-11-19). `useDialogos()` (`avisar`/`confirmar` com promise, fila com dedupe em `utils/dialogos.js`), casca `Modal` comum (Esc, foco preso, foco devolvido), `ModalRestaurarNuvem` com a lista de backups (data + resumo), login sem `alert` (o `firebase.js` devolve a mensagem). Teste estático contra os nativos.
- [x] **#44 Gravações recusadas falham em silêncio** (2026-11-19). Ações do `App` gravam por `gravar()`, que avisa a recusa do `persist()` (`mensagemDeRecusa`: parece-vazio, versão futura, carregando). Import/restaurar só anunciam sucesso quando gravou. **Pendente de decisão:** com só o período padrão, excluir a última cadeira/afazer continua bloqueado (agora com aviso) — relaxar o `pareceVazio` é mexer na trava (crítico).
- [x] **#18 Desfazer (undo)** (2026-11-19). Toast "… excluído · Desfazer" (6s) ao excluir cadeira, compromisso, afazer, horário, link, data, ocorrência do calendário e "Apagar concluídos" — sem `confirm()` nesses casos. Período, importar e restaurar continuam pedindo confirmação (período também tem desfazer). Desfazer reinsere na posição original sem duplicar (`utils/desfazer.js`). Concluir não ganhou toast (é um toggle).

### Fase 4 — Cadeiras
- [x] **#19 Cadeiras com início/fim próprios** (2026-11-19). `cadeira.dataInicio/dataFim` opcionais (sanitizados: só `YYYY-MM-DD`), editados no drawer (De/Até, botão de limpar, erro inline se fim < início). `cadeiraEstaAtivaNaData` olha **só** a cadeira; aulas e avaliações fora da vigência somem do calendário; início/fim viram bandeirinha na célula e linha "Início/Fim de X" no dia (seguem o filtro Aulas). Card mostra a vigência. Cadeira nova herda a vigência da última do período com datas.
- [x] **#20 Remover a "Duração do período"** (2026-11-19). Barra e CSS `periodo-duracao-*` removidos. **Schema v4:** `MIGRACOES[4]` copia as datas do período para as cadeiras (campo a campo, sem sobrescrever) e tira `dataInicio/dataFim` dos períodos.
- [x] **#21 Reformulação da aba Cadeiras e do drawer da cadeira** (2026-11-19). Layout escolhido pelo usuário: card "próximo" (próxima aula — pulando as removidas da agenda —, próximas avaliações com destaque se faltam ≤7 dias, barra de progresso + % da vigência, contadores menores; ajuste do usuário: caixas na cor da cadeira, vazias compactas) e drawer com o mesmo resumo no cabeçalho + **seções recolhíveis** (Horários/Links/Datas com contagem) no lugar das 3 abas. Lógica pura em `utils/cadeiras.js`; componente `ui/ResumoCadeira.jsx`.

### Fase 5 — Afazeres / Rotinas / Compromissos
- [x] **#22 Reformulação em 3 abas na sidebar** (2026-11-19). **Schema v5.** Rotinas (ex-compromissos semanais, presas ao período, cards com faixa da semana), Compromissos pontuais (data + início, fim opcional, ★ no calendário, check, "Passados"), Afazeres sem hora com data de fim escolhida num calendário que só mostra os dias da repetição (vazio = para sempre) e lista em seções. Marcadores ★/livro/bandeiras na célula. Ver `log.md` (9).
  - **#45** resolvido junto: a lixeira do calendário exclui de verdade compromisso e afazer sem repetição (com Desfazer).
- [x] **#23 Lembretes programados e configuráveis** (2026-11-19). Opção (b): FCM + Cloud Function agendada (`functions/index.js`, a cada 1 min). Padrões globais (`lembretes`, compromissos 15 min / avaliações 1 dia) + `lembretes` por compromisso e por avaliação; modal "Lembretes" no menu (ativar no aparelho, teste). **Falta o deploy (usuário):** `firebase deploy --only functions,firestore:rules`. _Ideias futuras (perguntar):_ lembrete de afazer com data (resumo do dia às 8h), de aulas/rotinas.

### Fase 6 — Visual e performance
- [x] **#24 Melhora na qualidade de exibição** (2026-11-20). Células do calendário sem inline (pixel-idêntico); título da aba "Minha Agenda"; contraste (`--texto-fraco` mais claro + `--texto-sutil` no lugar dos cinzas soltos, ≥ 4,5:1 com teste); escala tipográfica (`--fs-*`; grupos das listas em MAIÚSCULAS); **Agenda da semana**: semana inteira na largura do celular + zoom (pinça, Ctrl+roda, − 100% +), dias/horas fixos ao rolar.
- [x] **#25 Bundle** (2026-11-20). Chunks estáveis `firebase` (757 kB) · `react` · `vendor` + app (~125 kB); `messaging` continua sob demanda. Lazy load do Firestore/Auth **descartado** (são necessários na abertura offline-first; mexeria no `usePersistedData`). O build aborta se houver ciclo entre chunks (`vite.chunks.js`).
- [x] **#46 "Próximas datas importantes"** (2026-11-20). Futuras primeiro (↑); as que passaram vão para "Anteriores" (recolhida, mais recente primeiro). `datasImportantes` (`utils/cadeiras.js`).

---

## 🟢 BAIXO

### Limpeza técnica
- [ ] **#26** Remover código morto: `utils/data.js`, `primeiroDiaDoMes/ultimoDiaDoMes`, `SIDEBAR_STATE_KEY`, `.calendario-celula.vazia`. _Review (varredura de CSS):_ também sem uso `.loading-text` e `.vidro` (`base.css` ~50/~78) e `.chevron-btn` (`sidebar.css` ~151). (`useAutoBackup` já removido no #9.)
- [ ] **#27** `.gitignore`: `node_modules` duplicado; `.zip` → `*.zip`.
- [ ] **#28** `AbaLinks`: tratar o erro de `navigator.clipboard.writeText`.
- [ ] **#29** `uid()` → `crypto.randomUUID()` (mantendo os ids antigos).
- [ ] **#30** Upgrade `vite-plugin-pwa` (fecha os 4 *moderate* do workbox) e avaliar Vite 7/8 e `firebase@13` (major). Vite 6 + Vitest 4 já feitos no #2.
- [ ] **#47** App aberto em duas instâncias (PWA instalado + aba do navegador): com `persistentSingleTabManager`, a segunda cai para cache só em memória, então ela não abre offline. Avaliar `persistentMultipleTabManager` (`src/firebase.js`).
- [ ] **#48** Drawers de cadeira/compromisso: apagar o nome e sair do campo não grava (certo), mas o campo fica vazio na tela. No blur inválido, voltar ao nome atual.
- [ ] **#49** "Hoje" congelado com o app aberto depois da meia-noite: `hoje` em `VisaoGeral` e o memo de afazeres sem data em `useEventosCalendario` só atualizam em outro re-render/troca de mês.
- [ ] **#51** Acessibilidade: células do calendário e cards de cadeira/compromisso são `div` com `onClick` (sem teclado/`role`); drawers não fecham com Esc nem prendem o foco; o drag só funciona com ponteiro.
- [ ] **#52** `eventosConcluidos`/`eventosExcluidos` crescem para sempre e guardam chaves órfãs de cadeiras/afazeres já apagados. O documento único tem limite de 1 MB, e cada backup copia tudo. Limpar as chaves do item ao excluí-lo. _Fazer depois de #10 (o formato das chaves muda)._
- [x] **#55** Cor padrão do afazer (2026-11-19): padrão agora `#8b5cf6`; cores quase pretas (inclusive afazeres antigos `#221e1e`) são clareadas **só na exibição** (`corVisivel`, `utils/calendario.js`) no calendário, nas listas e na agenda. `#221e1e` saiu da paleta de cadeiras novas.
- [x] **#56 Rotinas sem período** (2026-11-19). `periodoId` removido; vigência própria opcional (`dataInicio`/`dataFim`) limita calendário, agenda semanal e "Próxima". **Schema v6**: a rotina herda menor início / maior fim das cadeiras do seu período.
- [ ] **#53** Excluir o último período recria em silêncio um "2026.1" (`id: "p1"`, via `sanitizarDados`). Bloquear a exclusão do único período ou avisar. _Combina com #38._

### Ideias aprovadas pelo usuário (implementar depois das fases acima)
- [ ] **#31 Tela "Hoje"**: resumo do dia (aulas, compromissos, afazeres urgentes) como home no mobile. Reaproveitar `projetarEventos` de `utils/projecao.js`.
- [ ] **#32 Detecção de conflito de horário** entre aulas e rotinas.
- [ ] **#33 Exportar `.ics`** (assinar no Google Calendar). Também cobre parte dos lembretes.
- [ ] **#34 Controle de faltas por cadeira** (contador vs. limite de 25% da carga horária, alerta ao se aproximar).
- [ ] **#35 Notas e média por cadeira** (pesos por avaliação, quanto precisa tirar na próxima).
- [ ] **#36 Agenda semanal navegável** (semana anterior/próxima) incluindo afazeres e compromissos pontuais.
- [ ] **#37 Busca global** (cadeiras, links, afazeres).
- [ ] **#38 Arquivar períodos antigos** em vez de só excluir.

---

## ✅ Feito recentemente
- [x] Ícone do Android com fundo branco: maskable 192 + `id`/`lang` no manifest; precisa reinstalar o app (2026-11-20).
- [x] #25 chunks do bundle · #46 datas importantes · #24 exibição + Agenda com zoom (2026-11-20). **Fase 6 concluída.**
- [x] #56 rotinas sem período, com vigência própria (schema v6) (2026-11-19).
- [x] #22 Fase 5: Rotinas / Compromissos / Afazeres (schema v5) + #45 lixeira exclui item pontual (2026-11-19).
- [x] #16 ESLint + Prettier · #17 diálogos próprios · #44 aviso de gravação recusada · #18 desfazer com toast (2026-11-19).
- [x] #9 autobackup removido · #10 chaves por id (migração v2) · #11 check de rotina por ocorrência · #12 mensal no fim do mês · #13 hoje local · #14 data natural (migração v3) · #15 ícone maskable · #40 rotina sem data · #42 gatilho preso · #50 href seguro (2026-11-19).
- [x] #8 backup na nuvem sem snapshot por abertura/edição offline (2026-11-19).
- [x] #7 tela de erro no lugar do loop de reload offline (2026-11-19).
- [x] #43 `undefined` no estado não trava mais as gravações (2026-11-19).
- [x] #54 gravações offline sem fila em memória + #41 seletor de cor sem gravação por pixel (2026-11-19).
- [x] #6 `persist(updater)` sem race + #39 status de sync só com servidor confirmando (2026-11-19).
- [x] #5 `sanitizarDados` normaliza listas de cadeiras/compromissos (2026-11-19).
- [x] #3 Code review completa → achados #39–#53 (2026-11-18).
- [x] #2 `npm audit` (prod limpo) e #4 schema versionado (2026-11-18).
- [x] Mobile: nome longo cortado na lista "Eventos em DD/MM" → agora quebra linha (2026-11-18).
- [x] Pasta `tests/` com Vitest + `npm test` / `npm run check` (2026-11-18).
