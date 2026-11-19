# todo.md — Backlog

**Níveis:** 🔴 **ALTO** (bugs, problemas graves, race conditions, fallbacks, feats fundamentais, cibersegurança) · 🟡 **MÉDIO** (bom funcionamento, feats importantes, outros tratamentos, reformulações visuais) · 🟢 **BAIXO** (o resto).

**Ordem:** o número `#N` é a **ordem de execução recomendada**. Ela foi montada para nada quebrar: segurança e fundação primeiro, depois os bugs de dados, depois as reformulações (que mudam o schema), e o resto por último. Respeite o `Depende de`.
**Regra para cada item:** `npm run check` verde + teste novo/ajustado em `tests/` + entrada no `log.md`.
Marcação: `[ ]` aberto · `[~]` em andamento · `[x]` feito (manter 1–2 sessões e depois apagar; o histórico fica no `log.md`).

---

## 🔴 ALTO

### Fase 1 — Segurança e fundação
- [~] **#1 Versionar e endurecer as Firestore Rules.** `firestore.rules` + `firebase.json` + `.firebaserc` criados e validados (compila no servidor via `--dry-run`, 4 testes de sincronia em `integridade.test.js`). **Falta o usuário publicar:** `firebase deploy --only firestore:rules` e confirmar que o app sincroniza. Opcional depois: testes de comportamento com o emulador (precisa de Java).
- [x] **#2 Dependências vulneráveis.** Produção: **0 vulnerabilidades** (firebase 12.19 + override `@grpc/grpc-js ^1.14.7`). Dev: Vite 5→6.4.6, Vitest 2→4.1, plugin-react 4.7. Restam 4 *moderate* no `glob/minimatch` do `workbox-build` (vite-plugin-pwa), que roda só no build sobre padrões do próprio projeto: **risco aceito**, revisar em #30.
- [ ] **#3 Code review completa do projeto** (correção, dados, segurança, performance, a11y, CSS morto). Cada achado novo entra aqui com nível e posição na ordem.
- [x] **#4 Schema versionado + migrações.** `src/utils/migracoes.js` (`VERSAO_ATUAL = 1`, baseline), aplicado dentro de `sanitizarDados`. Proteção: a versão antiga do app **não grava** sobre dados de versão futura (status "desatualizado"), e import/restore recusam backup futuro. `importarBackup` agora preserva `versao`.

### Fase 2 — Bugs de dados, race conditions e fallbacks
- [ ] **#5 `sanitizarDados` não normaliza cadeiras/compromissos** (`horarios/links/datas`). Um backup sem `links` quebra `VisaoCadeiras`. _Teste `it.fails` já existe em `sanitizarDados.test.js`._
- [ ] **#6 Race condition em `persist()`:** ele usa o `data` do closure, então duas ações no mesmo tick (ex.: blur do nome no drawer + clique) fazem a primeira se perder. Migrar para `persist(updater)` funcional, mantendo a fila serializada.
- [ ] **#7 Loop de reload offline:** logado, sem cache local e sem rede → `status=error`, `data=null`, e o watchdog recarrega a cada 12s para sempre. Trocar por uma tela de erro com "tentar de novo"/"continuar offline".
- [ ] **#8 `useCloudBackup` faz snapshot a cada abertura** (`ultimoBackupRef` zera no reload), o que gira o histórico de 10 backups em poucas horas. Basear no timestamp do backup mais recente no Firestore e não recriar o interval a cada mudança de `data`.
- [ ] **#9 `useAutoBackup` não está ligado** (o README promete backup diário em .json + histórico local). Decidir com o usuário: religar em `App.jsx` ou remover o hook e o trecho do README.
- [ ] **#10 Chaves de evento por nome em vez de id** (aulas/compromissos por `c.nome`, avaliações por `titulo`). Renomear perde concluídos/excluídos, e nomes iguais colidem. Migrar para `id` com migração das chaves salvas. _Depende de #4._
- [ ] **#11 Concluir rotina na aba Afazeres marca a rotina inteira como `feito`** → "Apagar concluídos" apaga a rotina toda. Correção mínima agora: na aba, o check de uma rotina conclui só a ocorrência de hoje. A semântica final é definida em #22.
- [ ] **#12 Rotina mensal em dia 29–31 pula meses** (hoje gera 31/jan → 03/mar → 01/mai). Limitar ao último dia do mês. _Teste `it.fails` já existe em `afazeres.test.js`._
- [ ] **#13 "Hoje" em UTC na `VisaoAgenda`** (`toISOString()`): depois das 21h os itens de hoje aparecem como passados. Usar `toISO(new Date())`. Mesmo padrão no nome do arquivo de `exportarBackup`.
- [ ] **#14 `datasConcluidas` usa a data já movida** (`ev.data`), enquanto o drag usa `dataOriginal` → mover uma ocorrência concluída perde o check. Padronizar em `dataOriginal`, com migração.
- [ ] **#15 Ícone maskable inexistente:** `icon-maskable-512.png` é citado em `vite.config.js` e `site.webmanifest`. Apontar para `web-app-manifest-512x512.png` e remover o `site.webmanifest` não usado. _Teste `it.fails` já existe em `integridade.test.js`._

---

## 🟡 MÉDIO

### Fase 3 — Infra de qualidade (antes das reformulações)
- [ ] **#16 ESLint + Prettier** (com `react-hooks`). Já existem `eslint-disable` no código sem lint configurado. Adicionar `npm run lint` ao `check`.
- [ ] **#17 Modais próprios no lugar de `alert/confirm/prompt`** (ruins no PWA/iOS). Inclui a tela de "Restaurar da nuvem" com a lista de backups (hoje é um `window.prompt`).
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
- [ ] **#23 Lembretes programados e configuráveis.** _Depende de #22._ Decisão técnica antes: (a) notificação local só com o app aberto/SW vivo, que é simples mas pouco confiável; (b) FCM + Cloud Function agendada, que é confiável mas exige o plano Blaze; (c) exportar `.ics` e usar os lembretes nativos (ver #33). iOS só recebe push com o PWA instalado (16.4+). Modelo: `lembretes: [{ antecedenciaMin }]` por compromisso/avaliação + um padrão global.

### Fase 6 — Visual e performance
- [ ] **#24 Melhora na qualidade de exibição** (detalhar com o usuário): tirar os estilos inline de `VisaoGeral` (células do calendário) para CSS, hierarquia tipográfica, contraste, espaçamentos no mobile, título da aba (`index.html` diz "Painel acadêmico").
- [ ] **#25 Bundle de 970 kB** (Firebase): code-split / lazy load do Firestore e do Auth.

---

## 🟢 BAIXO

### Limpeza técnica
- [ ] **#26** Remover código morto: `utils/data.js`, `primeiroDiaDoMes/ultimoDiaDoMes`, `SIDEBAR_STATE_KEY`, `.calendario-celula.vazia`.
- [ ] **#27** `.gitignore`: `node_modules` duplicado; `.zip` → `*.zip`.
- [ ] **#28** `AbaLinks`: tratar o erro de `navigator.clipboard.writeText`.
- [ ] **#29** `uid()` → `crypto.randomUUID()` (mantendo os ids antigos).
- [ ] **#30** Upgrade `vite-plugin-pwa` (fecha os 4 *moderate* do workbox) e avaliar Vite 7/8 e `firebase@13` (major). Vite 6 + Vitest 4 já feitos no #2.

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
- [x] #2 `npm audit` (prod limpo) e #4 schema versionado (2026-11-18).
- [x] Mobile: nome longo cortado na lista "Eventos em DD/MM" → agora quebra linha (2026-11-18).
- [x] Pasta `tests/` com Vitest + `npm test` / `npm run check` (2026-11-18).
