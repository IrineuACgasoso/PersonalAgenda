# log.md — Alterações recentes e pendências entre sessões

> Entrada mais nova no topo. Manter só as últimas ~10 sessões; o resto o git guarda.
> Formato: data · resumo · arquivos tocados · estado (build/testes) · pendências de curto prazo.

---

## 2026-11-19 (9) — Fase 5 (#22 + #45): Rotinas, Compromissos pontuais e Afazeres novos — **schema v5**
- **Decisões do usuário (perguntas da sessão):** afazer pontual com data+hora vira compromisso na migração, recorrente com hora perde a hora; compromisso = nome, cor, data, início obrigatório, fim opcional, sem campos extras, com check e seção "Passados"; afazer sem hora, "intervalo" = repetição + data de fim (não existe pontual com intervalo); pontual atrasado fica na data com selo "atrasado"; seletor de data próprio também no início e no compromisso; lista de afazeres em seções; marcadores em linha (até 3, depois 2 + "+N"); Rotinas com faixa da semana; lixeira exclui de verdade item pontual (#45); extras: arrastar compromisso, "+" com menu, filtro próprio de Rotinas.
- **Schema v5 (`MIGRACOES[5]`):** `compromissos` semanais → `rotinas` (chaves `compromissos|ISO|id|h` → `rotinas|ISO|id|h`); `compromissos` agora = pontuais `{ id, nome, cor, data, inicio, fim?, feito, concluidoEm? }` (afazeres sem repetição com data + hora viram compromisso, mesmo id); afazer perde `hora`; `rotina.totalRepeticoes` → `rotina.dataFim` (dia da última ocorrência; sem data-base = sem fim, como era). Lógica da v4 copiada dentro da migração (não importa de `afazeres.js`).
- **`sanitizarDados`:** `rotinas` (horários sempre lista), `sanitizarCompromisso` (data/hora só no formato certo, fim inválido some, `feito` booleano), `rotina.dataFim` ("" = para sempre) no lugar de `totalRepeticoes`; `pareceVazio` conta `rotinas`. **Rules:** `rotinas` obrigatório e lista (+ teste: toda lista do `DADOS_PADRAO` tem que estar no `hasAll`).
- **Recorrência (`utils/afazeres.js`):** `datasDaRegra` (dias naturais sem fim/exceções — alimenta o seletor de fim), `ehDataDaRegra`, `dataFimDaRotina`; `ocorrenciasNoIntervalo` corta no fim (ocorrência arrastada cuja origem passou do fim some); avanço por calendário (`somarDias`), sem milissegundos. Textos: `textoRepeticao`, `textoFimRepeticao`, `descreverAfazer`; seções: `secoesDosAfazeres`. `dataAoSalvarAfazer` não recebe mais `temData`. Removidos `primeiroDiaDoMes/ultimoDiaDoMes` (mortos, #26).
- **UI:** `ui/SeletorData.jsx` (popover próprio; `permitidas(ini, fim) → Set` desabilita dias; `marcada` = início; fundo **sólido** — com alpha o texto de baixo vazava por causa do backdrop-filter do card). `ui/SecaoLista.jsx` (seção recolhível com contagem). Afazeres: card "Novo afazer" (Dia/Começa em, Repetição, dias da semana, a cada N dias, **Termina em** só com dias da repetição, urgência, cor, frase-resumo) + seções Atrasados/Hoje/Próximos/Sem data/Recorrentes/Concluídos. Compromissos (`VisaoCompromissos.jsx`, novo): mesmo card + Hoje/Próximos/Passados ("Apagar passados" com Desfazer). Rotinas: `VisaoRotinas`/`PainelRotina` (git mv dos antigos de compromisso) + `ui/ResumoRotina.jsx` (faixa S T Q Q S S D na cor, "Próxima", h/semana). Sidebar: Cadeiras · Rotinas · Compromissos · Afazeres · Agenda.
- **Calendário:** filtros Aulas · Avaliações (livro) · Rotinas · Compromissos (★) · Afazeres; marcadores na célula por `marcadoresDoDia`/`resumirMarcadores` (`projecao.js`); ★/livro antes do título na lista do dia; check do compromisso no próprio item; lixeira: compromisso e afazer sem repetição **excluem** (toast Desfazer), recorrentes removem só o dia; arrastar compromisso muda a data; "+" abre menu Afazer/Compromisso (`useFecharAoClicarFora`). Agenda semanal: `compromissos` → `rotinas` (filtro salvo herda o antigo).
- **Puro novo:** `utils/rotinas.js` (dias ativos, minutos/semana, `textoDuracao`, `proximaOcorrenciaRotina`), `utils/compromissos.js` (validação, seções, textos); `proximoHorarioSemanal` extraído de `proximaAula` (`cadeiras.js`). `resumoDoBackup` migra antes de contar e mostra rotinas.
- **CSS:** novos `listas.css`, `seletor-data.css`, `rotinas.css`; `afazeres.css` sem as classes mortas (`.afazer-form`, `.item-afazer`, `.checkbox-linha`…); marcadores e menu em `calendario.css`; mobile em `mobile.css`.
- **Testes:** 271 ✅ (+47): v4→v5, datas de fim, seções, marcadores, rotinas, compromissos, Rules. `npm run check` ✅. **Verificado no navegador** (Playwright + Chrome, dados v4 semeados no localStorage): migração ao abrir, seletor de fim (semanal só libera as quintas; dias específicos sem domingo), criar/concluir compromisso, lixeira exclui com Desfazer, gravação em v5 sem `hora`, desktop e mobile, sem erros no console.
- **⚠ Deploy das Rules (usuário):** `firebase deploy --only firestore:rules` **depois** de abrir a versão nova pelo menos uma vez (o doc precisa já ter `rotinas`, senão um PWA antigo em cache teria gravações recusadas). PWA antigo vê o doc v5 como "desatualizado" (esperado).
- **Testar no app:** (1) Rotinas: os antigos compromissos semanais estão lá, com a faixa da semana e "Próxima"; (2) Compromissos: os afazeres que tinham hora viraram compromissos; ★ no calendário; (3) afazer recorrente com "qtd. de vezes" agora mostra "até DD/MM"; (4) criar afazer semanal → "Termina em" só deixa clicar no mesmo dia da semana; (5) "+" no calendário → Compromisso abre a aba com a data; (6) arrastar um compromisso para outro dia; (7) lixeira num afazer sem repetição → some da aba também (Desfazer volta).
- **Pendências novas:** #55 (cor padrão do afazer, `#221e1e`, quase invisível no calendário), #56 (calendário: cadeiras de todos os períodos × rotinas só do ativo — não mexido).

---

## 2026-11-19 (8) — Ajustes do resumo da cadeira (#21) pedidos pelo usuário
- **Causa das "caixas cinzas":** a linha vazia usava a classe `vazio`, que colidia com o `.vazio` global do `EstadoVazio` (`base.css`: tracejado + 50px de padding). O usuário gostou do visual, então virou estilo próprio: `.resumo-caixa` / `.resumo-caixa-vazia` (`cadeiras.css`). **Não reutilizar `vazio` como modificador.**
- Caixa vazia: tracejada, cinza, centrada e **compacta** (padding 5px). Caixa com conteúdo: preenchimento leve na cor da cadeira (`--cor-rgb` inline via `hexParaRgb`).
- Avaliações: `proximasAvaliacoes` (lista, substitui `proximaAvaliacao`) — card mostra até 3, drawer até 5, o resto vira "+N outras"; título com "…" para não deformar; **≤7 dias em destaque âmbar** (`DIAS_DESTAQUE_AVALIACAO`). `textoProximaAvaliacao` → `textoQuandoAvaliacao` ("26/11 · em 8d").
- Vigência: `%` concluído ao lado da barra; as datas vão para o lado (descem de linha em card estreito).
- **Testes:** 224 ✅ (`cadeiras.test.js` reescrito para a lista/destaque). `npm run check` ✅.
- **Testar no app:** cadeira encerrada → caixas cinzas pequenas; cadeira ativa → caixas na cor dela; cadeira com 4+ avaliações → 3 no card + "+N outras", 5 no drawer; avaliação a ≤7 dias em âmbar; "52%" ao lado da barra.

---

## 2026-11-19 (7) — Barra de tempo do Desfazer + Fase 4 completa: #19 vigência por cadeira, #20 sem "Duração do período", #21 card e drawer novos
- **Toast (#18):** barrinha embaixo do toast que esvazia em `duracaoMs` (6s), para saber quanto tempo resta para "Desfazer" (`.toast-progresso` em `modal.css`; duração passada inline pelo `Toast`, mesma do timer).
- **#19:** `cadeira.dataInicio/dataFim` opcionais. Regra em `utils/calendario.js` (`vigenciaDaCadeira`, `cadeiraEstaAtivaNaData` agora **sem** `periodos`, `erroDeVigencia`, `dataCompleta`, `textoVigencia`, `vigenciaPadraoParaNovaCadeira`). Drawer da cadeira ganhou bloco "Vigência" (De/Até, limpar, erro inline se fim < início; grava a cada data completa — ignora os anos 0002/0020… ao digitar no desktop). Calendário geral: `projetarMarcosVigencia` → bandeirinha (Flag/FlagOff na cor da cadeira) na célula + linha "Início/Fim de X" no topo do dia; seguem o filtro **Aulas**; não são eventos (sem check/lixeira/ponto). `useEventosCalendario` agora devolve `{ eventosPorDia, marcosVigencia }`. Card da cadeira mostra a vigência. `criarCadeira` herda a vigência da última cadeira do período com datas (mantém o comportamento de antes do #20). `sanitizarCadeira` só deixa passar `YYYY-MM-DD`. `.calendario-celula` ganhou `position: relative` (o `zIndex` inline da célula selecionada passou a valer).
- **#20 (schema v4):** barra "Duração do período" e CSS `periodo-duracao-*` removidos (`periodo-seletor.css`, `mobile.css`). `MIGRACOES[4]`: cadeiras herdam `dataInicio/dataFim` do período (campo a campo, sem sobrescrever) e os períodos perdem as datas ⇒ o calendário mostra as mesmas aulas de antes. Rules não mudaram (campos opcionais).
- **Commit 1 (pushado, com o ok do usuário):** barra do toast + #19 + #20.
- **#21 (layout escolhido pelo usuário entre opções):** card "próximo" — `ui/ResumoCadeira.jsx` com próxima aula (hoje/amanhã/dia da semana/data, "agora (até HH:MM)" se em andamento, pula ocorrências removidas da agenda, respeita a vigência), próxima avaliação (âmbar se ≤3 dias) e barra de progresso da vigência na cor da cadeira; contadores viraram rodapé menor. Drawer: mesmo resumo abaixo do nome e **seções recolhíveis** (`Secao` em `PainelCadeira.jsx`, todas abertas por padrão, contagem no cabeçalho) no lugar das 3 abas (CSS `.painel-tabs/.painel-tab` removido). Lógica pura em `utils/cadeiras.js`. `VisaoCadeiras`/`PainelCadeira` recebem `eventosExcluidos`.
- **Testes:** 223 ✅ (+31: vigência/validação/herança em `calendario.test.js`, marcos e avaliação fora da vigência em `projecao.test.js`, v3→v4 em `migracoes.test.js`, sanitização em `sanitizarDados.test.js`, novo `cadeiras.test.js`). `npm run check` ✅.
- **Docs:** `README.md`, `organization.md` (modelo de dados v4), `tests/README.md`, `todo.md`.
- **⚠ Schema subiu para v4:** aparelho com o PWA antigo mostra "desatualizado" e não grava até atualizar (esperado, #4).
- **➡ Próximo passo:** Fase 5 — **#22** (Afazeres/Rotinas/Compromissos em 3 abas; schema grande, combinar decisões antes). Decisão antiga ainda aberta: relaxar o `pareceVazio` para excluir a última cadeira (ver sessão 6).
- **Testar no app:** (1) excluir algo → barrinha esvaziando no toast; (2) Cadeiras: a barra "Duração do período" sumiu e cada card mostra a vigência herdada do período (ex.: "01/08/2026 – 15/12/2026"); (3) drawer → mudar o fim de uma cadeira → aulas somem depois dessa data no calendário; (4) fim antes do início → texto vermelho, nada salvo; (5) calendário: bandeirinha no 1º e no último dia de cada cadeira, e "Início de X" ao clicar no dia; desligar o filtro Aulas esconde; (6) criar cadeira nova → já nasce com a vigência das outras; (7) card: "Próx. aula" e "Próx. avaliação" batem com a agenda, barra da vigência na cor da cadeira; remover a aula de amanhã no calendário → card pula para a seguinte; (8) drawer: resumo embaixo do nome, seções Horários/Links/Datas abrem/fecham pela seta.

---

## 2026-11-19 (6) — Fase 3: #16 lint, #17 diálogos, #44 avisos de recusa, #18 desfazer
- **#16:** ESLint 10 (flat, `eslint.config.js`: recommended + `react-hooks` [rules-of-hooks, exhaustive-deps] + `react-refresh` + `eslint-config-prettier`) e Prettier (`.prettierrc.json`, printWidth 120, `endOfLine: auto` p/ não brigar com o CRLF do Windows). `npm run lint` (`--max-warnings 0`) agora é o 1º passo do `check`; `npm run format` corrige. Lint pegou: `import React` sem uso (removidos), 2 atribuições inúteis; os 5 `exhaustive-deps` intencionais ganharam `eslint-disable` com o motivo. O `eslint-plugin-react` ficou de fora (não suporta ESLint 10; o 10 já rastreia JSX). As regras do React Compiler (~27 achados) **não** foram ligadas — ver #24.
  - **Pegadinha:** `src/` é um ponto de reparse do OneDrive (o Node a vê como symlink), e `eslint .`/`prettier .` a pulavam **em silêncio**. Os scripts passam `src` explícito; teste em `integridade.test.js` garante.
  - Formatação aplicada em todo o código (diff grande, só de formato).
- **#17:** `useDialogos()` → `avisar`/`confirmar` (promise) + `notificar` (toast). `ui/Dialogos.jsx`: `DialogosProvider` (no `main.jsx`) e casca `Modal` (Esc, foco preso, foco devolvido, botões largos no mobile). Fila e dedupe de avisos iguais em `utils/dialogos.js`. "Restaurar da nuvem" virou `ModalRestaurarNuvem` (lista com data + "N cadeiras · N compromissos · N afazeres"). `ModalTexto` (novo período) passou a usar a casca — antes não tinha CSS nenhum (`.modal-pequeno` não existia). Login: `loginComGoogle` devolve `{ ok, user | mensagem }` e o App mostra o aviso (fechar o popup não avisa mais nada); **trava de e-mail intocada**. CSS novo em `styles/modal.css`. Teste estático: nenhum `alert/confirm/prompt` em `src/`.
- **#44:** ações do `App` gravam por `gravar()` → se o `persist()` recusar, diálogo "Alteração não salva" com o motivo (`mensagemDeRecusa`). Importar/restaurar só anunciam sucesso se gravou. `persist()`/travas **não mudaram**.
- **#18:** excluir cadeira/compromisso/afazer/horário/link/data/ocorrência do calendário e "Apagar concluídos" não pedem mais confirmação: toast de 6s com **Desfazer** (reinsere na posição original, sem duplicar — `utils/desfazer.js`). Item e posição lidos dentro do updater (estado mais recente). Período, importar e restaurar continuam com confirmação (período também tem desfazer). Drawers: listas internas via `hooks/useListaInterna.js` com `onAtualizar(fn)` (lê a cadeira/compromisso mais recente — antes montavam a lista da prop do render).
- **Testes:** 192 ✅ (+18: `dialogos.test.js`, `desfazer.test.js`, 2 em `integridade`). `npm run check` ✅ (lint + testes + build).
- **Docs:** `CLAUDE.md` (comandos + regra "nada de alert/confirm/prompt", `gravar()`), `todo.md`, `organization.md`, `tests/README.md`, `README.md`.
- **➡ Decisão pendente (crítico, perguntar):** com só o período padrão `p1`, excluir a **última** cadeira/afazer/compromisso continua bloqueado pelo `pareceVazio` (agora com aviso). Relaxar exige mexer na trava. Proposta: considerar "vazio" só quando também não há período criado pelo usuário **e** o estado anterior já veio do servidor — ou simplesmente aceitar quando a ação é uma exclusão explícita.
- **➡ Próximo passo recomendado:** Fase 4 — **#19** (cadeiras com início/fim próprios; campo novo ⇒ `sanitizarDados` + Rules?). Alternativa leve: limpezas 🟢 (#26, #27, #28, #48).
- **Testar no app:** (1) excluir um link/horário no drawer → toast "… excluído · Desfazer" → Desfazer volta no mesmo lugar; (2) excluir uma cadeira pela lixeira do card → some na hora, Desfazer traz de volta com horários/links; (3) Sidebar → Restaurar da nuvem → lista com datas e resumo; escolher → confirmação vermelha → "Backup … restaurado"; (4) com só o período padrão, excluir a única cadeira → aviso "Alteração não salva"; (5) "Novo período" → modal centralizado, Esc fecha; (6) login com outro e-mail → aviso em modal (não `alert`); (7) no celular: botões do modal ocupam a largura; toast acima da barra de gestos.

---

## 2026-11-19 (5) — #9 removido, #10 chaves por id, #11 #12 #13 #14 #15 #40 #42 #50
- **Processo:** usuário pediu **1 commit por prompt** (listando as etapas), em vez de 1 por item. Memória atualizada.
- **#9:** decisão do usuário: sem backup manual automático. `useAutoBackup.js` apagado; README fala em backup em 2 camadas (nuvem + exportar/importar).
- **#10 (schema v2):** chaves por id montadas em `projecao.js` (`chaveAula/chaveCompromisso/chaveAvaliacao`); avaliação sem data na chave. `MIGRACOES[2]` converte `eventosConcluidos/eventosExcluidos` (título com `|` ok, usa o dia da semana p/ achar o horário, nome repetido ⇒ uma chave por item, órfãs descartadas). O formato está **copiado** na migração de propósito (não importa da projeção).
- **#14 (schema v3):** `datasConcluidas` e a chave `afazeres|id|…` usam `dataOriginal` (projeção + `VisaoGeral`). `MIGRACOES[3]` adiciona a origem das ocorrências arrastadas (mantém o destino ⇒ nada muda na tela).
- **#11:** check de rotina na aba Afazeres conclui só a ocorrência de hoje/próxima (`ocorrenciaAtual`), linha mostra "hoje"/"próx.: DD/MM"; `afazerConcluido` tira rotinas de "concluídos"/"Apagar concluídos"; `alternarFeitoAfazer` sem data numa rotina não faz nada.
- **#12:** `mesmoDiaMesesDepois` (31/jan → 28/fev → 31/mar → 30/abr). `it.fails` virou `it` + 2 testes.
- **#13:** `toISO(new Date())` em `VisaoAgenda` e no nome do backup exportado; teste estático contra `.toISOString()` em `src/`.
- **#15:** maskable → `web-app-manifest-512x512.png`; `public/site.webmanifest` apagado. `it.fails` virou `it`.
- **#40:** rotina com data-base salva sem data começa hoje (`dataAoSalvarAfazer`); antigas sem data ganham aviso vermelho na lista (`.afazer-aviso`).
- **#42:** `onGatilhoConsumido` (App limpa o gatilho depois que o formulário usa).
- **#50:** `utils/links.js` (`normalizarUrl` movido p/ cá + `hrefSeguro`).
- **Testes:** 174 ✅, **nenhum `it.fails` restante**. Novo `tests/unit/links.test.js`. `npm run check` ✅.
- **Docs:** `todo.md`, `organization.md`, `tests/README.md`, `README.md`.
- **⚠ Schema subiu para v3:** um aparelho com o PWA antigo em cache mostra "desatualizado" e não grava até atualizar (comportamento esperado do #4).
- **➡ Próximo passo recomendado:** Fase 3 — **#16** (ESLint + Prettier) e **#17** (modais no lugar de `alert/confirm/prompt`), depois **#44**. Alternativa leve: limpezas do 🟢 (#26, #27, #28).
- **Testar no app:** (1) marcar uma aula como concluída, renomear a cadeira → continua marcada; (2) aba Afazeres: check numa rotina marca só "hoje" (o calendário mostra só o dia de hoje marcado) e "Apagar concluídos" não a apaga; (3) concluir uma ocorrência de rotina no calendário e arrastar para outro dia → continua concluída; (4) criar rotina semanal sem marcar "Definir dia/hora" → aparece no calendário a partir de hoje; (5) "+" no calendário → aba Afazeres com a data; sair e voltar à aba → formulário limpo; (6) concluídos/excluídos antigos de aulas e provas continuam iguais depois de abrir o app.

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
