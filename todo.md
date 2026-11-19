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
- [ ] **#43 `undefined` no estado trava todas as gravações:** o Firestore rejeita `setDoc` com campo `undefined`, e como o valor continua no estado, **toda** gravação seguinte também falha ("Erro ao salvar" permanente). Caminho possível hoje: desmarcar um afazer antigo que não tem `concluidoEm` (`App.jsx` `alternarFeitoAfazer` grava `concluidoEm: a.concluidoEm`). Rede de segurança: `ignoreUndefinedProperties: true` no `initializeFirestore` **e** o `sanitizarDados` removendo `undefined` (com teste). _Logo após #41._
- [ ] **#7 Loop de reload offline:** logado, sem cache local e sem rede → `status=error`, `data=null`, e o watchdog recarrega a cada 12s para sempre. Trocar por uma tela de erro com "tentar de novo"/"continuar offline".
- [ ] **#8 `useCloudBackup` faz snapshot a cada abertura** (`ultimoBackupRef` zera no reload), o que gira o histórico de 10 backups em poucas horas. Basear no timestamp do backup mais recente no Firestore e não recriar o interval a cada mudança de `data`. _Review:_ **offline é pior** — o `setDoc` do backup só resolve quando o servidor confirma, então `ultimoBackupRef` não é atualizado e **cada edição feita offline enfileira mais um snapshot completo**; ao reconectar, todos sobem de uma vez (e a rotação apaga backups bons). Marcar "backup em andamento" antes do `await` e pular quando `!navigator.onLine`.
- [ ] **#9 `useAutoBackup` não está ligado** (o README promete backup diário em .json + histórico local). Decidir com o usuário: religar em `App.jsx` ou remover o hook e o trecho do README.
- [ ] **#10 Chaves de evento por nome em vez de id** (aulas/compromissos por `c.nome`, avaliações por `titulo`). Renomear perde concluídos/excluídos, e nomes iguais colidem. Migrar para `id` com migração das chaves salvas. _Depende de #4._
- [ ] **#11 Concluir rotina na aba Afazeres marca a rotina inteira como `feito`** → "Apagar concluídos" apaga a rotina toda. Correção mínima agora: na aba, o check de uma rotina conclui só a ocorrência de hoje. A semântica final é definida em #22.
- [ ] **#12 Rotina mensal em dia 29–31 pula meses** (hoje gera 31/jan → 03/mar → 01/mai). Limitar ao último dia do mês. _Teste `it.fails` já existe em `afazeres.test.js`._
- [ ] **#40 Rotina sem data some do calendário:** um afazer "Diariamente/Semanalmente/A cada 15 dias/Mensalmente/Intervalo personalizado" criado **sem** marcar "Definir dia/hora" nunca aparece no calendário: `ocorrenciasNoIntervalo` devolve `[]` sem `data` e `projetarAfazeresSemData` exclui rotinas. O formulário aceita sem avisar. Correção: exigir a data-base nesses tipos (ou usar hoje como padrão ao salvar) + decidir o que fazer com os que já existem (ex.: na projeção, tratar como começando hoje). Teste novo em `afazeres.test.js`/`projecao.test.js`. _Logo após #12._
- [ ] **#13 "Hoje" em UTC na `VisaoAgenda`** (`toISOString()`): depois das 21h os itens de hoje aparecem como passados. Usar `toISO(new Date())`. Mesmo padrão no nome do arquivo de `exportarBackup`. _Review:_ confirmados só esses dois lugares (`VisaoAgenda.jsx` ~59 `hojeStr` e `App.jsx` ~270).
- [ ] **#14 `datasConcluidas` usa a data já movida** (`ev.data`), enquanto o drag usa `dataOriginal` → mover uma ocorrência concluída perde o check. Padronizar em `dataOriginal`, com migração.
- [ ] **#15 Ícone maskable inexistente:** `icon-maskable-512.png` é citado em `vite.config.js` e `site.webmanifest`. Apontar para `web-app-manifest-512x512.png` e remover o `site.webmanifest` não usado. _Teste `it.fails` já existe em `integridade.test.js`._
- [ ] **#42 "Novo afazer nesta data" fica preso:** o `+` do calendário guarda `gatilhoNovoAfazer` no `App` para sempre. Como o efeito do `FormularioAfazer` roda de novo a cada montagem, **toda** visita posterior à aba Afazeres abre o formulário com "Definir dia/hora" marcado e aquela data antiga. Correção: o `App` limpa o gatilho depois de consumido (callback `onGatilhoConsumido`) ou o formulário ignora gatilhos já vistos.
- [ ] **#50 Links salvos viram `href` sem validar o esquema** (`AbaLinks.jsx` ~214): a digitação passa por `normalizarUrl`, mas um backup `.json` adulterado/importado pode trazer `url: "javascript:..."`, que o React 18 renderiza (só avisa no console) e executa no clique. Risco baixo (app de 1 usuário), mas é cibersegurança: só renderizar `href` se for `http(s):`, senão mostrar como texto.

---

## 🟡 MÉDIO

### Fase 3 — Infra de qualidade (antes das reformulações)
- [ ] **#16 ESLint + Prettier** (com `react-hooks`). Já existem `eslint-disable` no código sem lint configurado. Adicionar `npm run lint` ao `check`.
- [ ] **#17 Modais próprios no lugar de `alert/confirm/prompt`** (ruins no PWA/iOS). Inclui a tela de "Restaurar da nuvem" com a lista de backups (hoje é um `window.prompt`).
- [ ] **#44 Gravações recusadas falham em silêncio:** quando `persist()` bloqueia (trava `pareceVazio`, versão futura), só a bolinha de status muda. Ex.: com só o período padrão `p1`, excluir a última cadeira/afazer é recusado sem aviso; importar um backup "vazio" idem; e "Restaurar da nuvem" mostra **"Backup restaurado com sucesso"** mesmo quando o `persist()` recusou. Correção: `persist()` devolve `{ ok, motivo }` e a UI avisa (modal do #17). _Logo após #17; combina com #6 (a assinatura do `persist` muda nos dois)._
- [ ] **#18 Desfazer (undo)** com toast após excluir/concluir, para reduzir os `confirm()`. _Depende de #6 e #17._

### Fase 4 — Cadeiras
- [ ] **#19 Cadeiras com início/fim próprios** (opcionais), para cadeiras que duram mais ou menos que o período. Campos `cadeira.dataInicio/dataFim` em `sanitizarDados`; `cadeiraEstaAtivaNaData` olha primeiro a cadeira; o calendário geral mostra aulas/avaliações só na vigência dela e marca visualmente o início e o fim. _Depende de #4._
- [ ] **#20 Remover a "Duração do período"** (barra De/Até em `VisaoCadeiras` + CSS `periodo-duracao-*` em `periodo-seletor.css` e `mobile.css`). Migração: copiar `periodo.dataInicio/dataFim` para as cadeiras sem datas próprias. _Depende de #19._
- [ ] **#21 Reformulação da aba Cadeiras e do drawer da cadeira.** Combinar o layout com o usuário antes. Ideias: card com o próximo horário/avaliação e a vigência; drawer com cabeçalho mais rico; seções no lugar de 3 abas no mobile. _Depende de #19 e #20._

### Fase 5 — Afazeres / Rotinas / Compromissos
- [ ] **#22 Reformulação em 3 abas na sidebar.** _Depende de #4, #10 e #11._
  - **Afazeres:** pontuais, sem hora definida, urgência baixa/média, ou rotinas de curta duração (com limite de repetições).
  - **Rotinas:** substituem os "compromissos" atuais (recorrência semanal com horários fixos).
  - **Compromissos (novo):** eventos pontuais com data/hora fixa, alta urgência, que não podem ser esquecidos.
  - Migração: `compromissos[]` → `rotinas[]`; chaves `compromissos|…` → `rotinas|…`; novo `compromissos[] = { id, nome, data, hora, local?, cor, feito, lembretes[] }`. Atualizar filtros do calendário, `VisaoAgenda`, Sidebar e import de backup antigo.
  - Resolver junto: o calendário geral recebe as cadeiras de **todos** os períodos, mas os compromissos/rotinas só do **ativo**. Padronizar por vigência.
  - Decidir: formulário base compartilhado? Rotinas presas a período?
  - **#45 (review) "Remover da agenda" num afazer avulso** só põe a chave em `eventosExcluidos`: o afazer continua pendente na aba Afazeres, reaparece no calendário se a data mudar, e um afazer **sem data** some do calendário para sempre (`afazeres-semdata|id`). Na reformulação, para itens não recorrentes a lixeira do calendário deve oferecer excluir/concluir de verdade.
- [ ] **#23 Lembretes programados e configuráveis.** _Depende de #22._ Decisão técnica antes: (a) notificação local só com o app aberto/SW vivo, que é simples mas pouco confiável; (b) FCM + Cloud Function agendada, que é confiável mas exige o plano Blaze; (c) exportar `.ics` e usar os lembretes nativos (ver #33). iOS só recebe push com o PWA instalado (16.4+). Modelo: `lembretes: [{ antecedenciaMin }]` por compromisso/avaliação + um padrão global.

### Fase 6 — Visual e performance
- [ ] **#24 Melhora na qualidade de exibição** (detalhar com o usuário): tirar os estilos inline de `VisaoGeral` (células do calendário) para CSS, hierarquia tipográfica, contraste, espaçamentos no mobile, título da aba (`index.html` diz "Painel acadêmico").
- [ ] **#25 Bundle de 970 kB** (Firebase): code-split / lazy load do Firestore e do Auth.
- [ ] **#46 "Próximas datas importantes" (`VisaoAgenda`) começa pelas passadas:** a lista mistura passadas e futuras em ordem crescente, então no fim do semestre as próximas provas ficam lá embaixo. Futuras primeiro; passadas recolhidas no fim (ou escondidas atrás de "ver anteriores").

---

## 🟢 BAIXO

### Limpeza técnica
- [ ] **#26** Remover código morto: `utils/data.js`, `primeiroDiaDoMes/ultimoDiaDoMes`, `SIDEBAR_STATE_KEY`, `.calendario-celula.vazia`. _Review (varredura de CSS):_ também sem uso `.loading-text` e `.vidro` (`base.css` ~50/~78) e `.chevron-btn` (`sidebar.css` ~151). O `useAutoBackup` depende da decisão do #9.
- [ ] **#27** `.gitignore`: `node_modules` duplicado; `.zip` → `*.zip`.
- [ ] **#28** `AbaLinks`: tratar o erro de `navigator.clipboard.writeText`.
- [ ] **#29** `uid()` → `crypto.randomUUID()` (mantendo os ids antigos).
- [ ] **#30** Upgrade `vite-plugin-pwa` (fecha os 4 *moderate* do workbox) e avaliar Vite 7/8 e `firebase@13` (major). Vite 6 + Vitest 4 já feitos no #2.
- [ ] **#47** App aberto em duas instâncias (PWA instalado + aba do navegador): com `persistentSingleTabManager`, a segunda cai para cache só em memória, então ela não abre offline. Avaliar `persistentMultipleTabManager` (`src/firebase.js`).
- [ ] **#48** Drawers de cadeira/compromisso: apagar o nome e sair do campo não grava (certo), mas o campo fica vazio na tela. No blur inválido, voltar ao nome atual.
- [ ] **#49** "Hoje" congelado com o app aberto depois da meia-noite: `hoje` em `VisaoGeral` e o memo de afazeres sem data em `useEventosCalendario` só atualizam em outro re-render/troca de mês.
- [ ] **#51** Acessibilidade: células do calendário e cards de cadeira/compromisso são `div` com `onClick` (sem teclado/`role`); drawers não fecham com Esc nem prendem o foco; o drag só funciona com ponteiro.
- [ ] **#52** `eventosConcluidos`/`eventosExcluidos` crescem para sempre e guardam chaves órfãs de cadeiras/afazeres já apagados. O documento único tem limite de 1 MB, e cada backup copia tudo. Limpar as chaves do item ao excluí-lo. _Fazer depois de #10 (o formato das chaves muda)._
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
- [x] #54 gravações offline sem fila em memória + #41 seletor de cor sem gravação por pixel (2026-11-19).
- [x] #6 `persist(updater)` sem race + #39 status de sync só com servidor confirmando (2026-11-19).
- [x] #5 `sanitizarDados` normaliza listas de cadeiras/compromissos (2026-11-19).
- [x] #3 Code review completa → achados #39–#53 (2026-11-18).
- [x] #2 `npm audit` (prod limpo) e #4 schema versionado (2026-11-18).
- [x] Mobile: nome longo cortado na lista "Eventos em DD/MM" → agora quebra linha (2026-11-18).
- [x] Pasta `tests/` com Vitest + `npm test` / `npm run check` (2026-11-18).
