# organization.md — Mapa do projeto

> Números de linha são **aproximados** (referência de 2026-11-18). Busque pelo nome da função se tiver desviado.

## Atalhos rápidos ("quero mexer em X → vá em Y")

| Quero… | Onde |
|---|---|
| Criar/editar/excluir período, cadeira, compromisso, afazer | `src/App.jsx` (ações CRUD, linhas 60–257) |
| Mudar como os dados são salvos/carregados, status de sync | `src/hooks/usePersistedData.js` → `persist()` ~228, auth ~86, Firestore ~115; decisões puras em `src/utils/persistencia.js` |
| Adicionar campo novo ao modelo de dados | `src/utils/sanitizarDados.js` → `sanitizarDados()` (**obrigatório**) |
| Mudança estrutural no schema (renomear/mover dados) | `src/utils/migracoes.js` → `VERSAO_ATUAL` + `MIGRACOES[n]` + teste em `tests/unit/migracoes.test.js` |
| Regras de segurança do Firestore | `firestore.rules` (deploy: `firebase deploy --only firestore:rules`, feito pelo usuário) |
| Status "App desatualizado" (dados de versão mais nova) | `usePersistedData.js` (efeito + trava em `persist()`), `Sidebar.jsx` |
| Lógica de recorrência de afazeres (diária, semanal, dias específicos…) | `src/utils/afazeres.js` → `ocorrenciasNoIntervalo()` ~26, `gerarOcorrenciasComData()` ~115 |
| O que aparece em cada dia do calendário geral | `src/utils/projecao.js` (puro): `projetarAvaliacoes/Aulas/Compromissos/Afazeres/AfazeresSemData`, `compararEventosDoDia` (ordenação), `agruparPorDia`, `projetarEventos` (tudo de uma vez). O hook `useEventosCalendario.js` só memoiza |
| Rodar/escrever testes | `tests/README.md`; dados de exemplo em `tests/fixtures/fabricas.js` |
| Vigência de cadeira/período no calendário | `src/utils/calendario.js` → `cadeiraEstaAtivaNaData()` ~68 |
| Grade do mês (células, dias de meses vizinhos) | `src/utils/calendario.js` → `gerarCelulasMes()` ~40 |
| Lista "Eventos em DD/MM" do calendário geral | `src/components/VisaoGeral.jsx` render ~366–420; estilos `.data-item-*` em `agenda.css` (fim do arquivo) e `mobile.css` |
| Drag-and-drop de afazeres no calendário | `src/components/VisaoGeral.jsx` ~186–325 |
| Estilo da célula do calendário (hoje/selecionada/avaliação) | `src/components/VisaoGeral.jsx` ~458–480 (inline) + `src/styles/calendario.css` |
| Formulário de afazer (rotina, urgência, cor) | `src/components/VisaoAfazeres.jsx` → `FormularioAfazer` ~37, `submit` ~93 |
| Ordem da lista de afazeres | `src/components/VisaoAfazeres.jsx` ~258–271 |
| Duração do período (De/Até) — a ser removida | `src/components/VisaoCadeiras.jsx` ~22–60 e ~85–140; CSS `periodo-seletor.css` ~91+, `mobile.css` ~157+ |
| Cards da tela Cadeiras | `src/components/VisaoCadeiras.jsx` ~157–190 + `src/styles/cadeiras.css` |
| Drawer da cadeira (Horários/Links/Datas) | `src/components/PainelCadeira.jsx` + `src/components/abas/*` |
| Grade semanal 06h–23h | `src/components/VisaoAgenda.jsx` + `src/styles/agenda.css` |
| Menu lateral, backup, login, indicador de status | `src/components/Sidebar.jsx` + `src/styles/sidebar.css` |
| Backup na nuvem (snapshots a cada 3h) | `src/hooks/useCloudBackup.js` |
| Seletor de cor (prévia local, grava ao soltar/fechar) | `src/components/ui/SeletorCor.jsx` + `src/utils/confirmacaoAdiada.js` |
| Exportar/importar `.json`, restaurar da nuvem | `src/App.jsx` → `exportarBackup` ~260, `importarBackup` ~275, `restaurarBackupNuvem` ~306 |
| Navegação por Enter em formulários | `src/hooks/useNavegacaoEnter.js` |
| Constantes (cores, dias, rotinas, urgência, chaves de storage) | `src/constants.js` |
| Qualquer coisa de layout mobile | `src/styles/mobile.css` (único `@media (max-width: 860px)`) |
| Manifest/ícones/service worker | `vite.config.js` (VitePWA) + `public/` |
| Login Google / e-mail permitido | `src/firebase.js` |

## Modelo de dados (`AppData`, um único documento `users/{uid}` ou `localStorage["painel-academico-data"]`)

```
versao            int — versão do schema (atual: 1; ausente = 0). Ver utils/migracoes.js
periodos[]        { id, nome, dataInicio?, dataFim? }
periodoAtivoId    string | null
cadeiras[]        { id, periodoId, nome, cor, horarios[], links[], datas[] }
  horarios[]      { id, dia(0=Seg..6=Dom), inicio "HH:MM", fim, local? }
  links[]         { id, titulo, url, isClassroom?, codigoClassroom? }
  datas[]         { id, titulo, data "YYYY-MM-DD", hora? }       ← avaliações
compromissos[]    { id, periodoId, nome, cor, horarios[] }       ← semanais (viram "rotinas" no todo)
afazeres[]        { id, nome, data?, hora?, cor?, urgencia 1|2|3, feito, concluidoEm?,
                    rotina{ tipo, intervaloDias, totalRepeticoes, diasSemana[] },
                    datasConcluidas[] (por ocorrência), excecoesData{ origem: destino } (drag) }
eventosConcluidos[]  chaves "tipo|data|nome|hora" (aulas/avaliações/compromissos)
eventosExcluidos[]   chaves de ocorrências removidas (todas as fontes)
```
`rotina.tipo`: `nenhuma | diaria | semanal | quinzenal | mensal | dias_especificos | personalizada`.
Chaves de evento — aulas: `aulas|ISO|nomeCadeira|inicio`; avaliações: `avaliacoes|ISO|titulo|hora`; compromissos: `compromissos|ISO|nome|inicio`; afazeres: `afazeres|id|ISO` ou `afazeres-semdata|id`.

## Fluxo de dados
```
usePersistedData ──data──▶ App.jsx (deriva periodoAtivo, cadeirasDoPeriodo, compromissosDoPeriodo)
      ▲                       │ props + callbacks (criarX/atualizarX/excluirX)
      └── persist((d) => novo) ◀┘   (updater recebe o estado mais recente; devolve { ok, motivo })
VisaoGeral → useEventosCalendario(cadeiras TODAS + compromissos DO PERÍODO ATIVO + afazeres)
           → utils/projecao.js (puro) → { "YYYY-MM-DD": evento[] }
```

## Árvore arquivo por arquivo

```
UFPE/
├── CLAUDE.md            Regras e escopo (ler primeiro)
├── log.md               Alterações recentes + pendências entre sessões
├── organization.md      Este mapa
├── todo.md              Backlog priorizado
├── README.md            Doc pública (portfólio) com screenshots — atualizar quando features mudarem
├── index.html           Shell HTML, metas iOS/PWA, favicons; título "Painel acadêmico"
├── vite.config.js       Vite + React + VitePWA (manifest, workbox precache, navigateFallback)
│                        ⚠ referencia public/icon-maskable-512.png, que NÃO existe
├── package.json         scripts: dev, build, preview, test (vitest run), test:watch, check (test + build). Sem lint ainda.
│                        overrides: @grpc/grpc-js ^1.14.7 (o firebase fixa ~1.9 vulnerável; só usado no Node)
├── firestore.rules      Security Rules: uid + e-mail permitido + email_verified, formato mínimo do AppData,
│                        doc principal não pode ser apagado, backups só create/delete, resto negado
├── firebase.json        Aponta firestore.rules · .firebaserc: projeto default
├── vitest.config.js     Config dos testes (Node, TZ America/Recife, setup tests/setup.js). Separada do vite.config
├── .env.example         Chaves VITE_FIREBASE_* (o .env real é ignorado)
├── .gitignore
├── docs/screenshots/    JPEGs usados no README
├── tests/
│   ├── README.md        Como rodar + convenções (it.fails = bug conhecido)
│   ├── setup.js         Relógio fixo 18/11/2026 10:00 (quarta) via fake timers
│   ├── fixtures/fabricas.js   periodo/horario/cadeira/compromisso/afazer/appData/backupAntigo
│   └── unit/
│       ├── afazeres.test.js       Recorrência (todos os tipos, limite, exceções de drag)
│       ├── calendario.test.js     Grade do mês, intervalo, vigência, hexParaRgb, formatarData
│       ├── sanitizarDados.test.js Preservação de campos, retrocompat, pareceVazio
│       ├── persistencia.test.js   resolverGravacao (updater sem race #6, travas), statusDoSnapshot (#39), criarDespachante (#54)
│       ├── confirmacaoAdiada.test.js  Seletor de cor: 1 gravação por arrasto, dedupe, confirmar/cancelar (#41)
│       ├── migracoes.test.js      Registro de migrações completo, v0→atual, não muta, versão futura intocada
│       ├── projecao.test.js       Eventos por dia (aulas, avaliações, compromissos, afazeres) + ordenação
│       └── integridade.test.js    Estático: ícones PWA, ordem/escopo do CSS, .env, regressões de UI,
│                                  Rules em sincronia (e-mail = EMAIL_PERMITIDO, campos ⊂ DADOS_PADRAO)
├── public/
│   ├── capacete-carregando.png   Imagem da tela de loading
│   ├── icon-192/512.png, web-app-manifest-192/512.png (maskable), favicon.*, apple-touch-icon.png
│   └── site.webmanifest          Manifest antigo, não referenciado (o VitePWA gera o seu)
└── src/
    ├── main.jsx         Monta <App/> em StrictMode e importa styles/app.css
    ├── App.jsx          Raiz: estado de UI (aba, drawer aberto, modal período, gatilho novo afazer),
    │                    watchdog de 12s no loading (reload), TODAS as ações CRUD, alternar concluído,
    │                    mover instância, excluir instância, limpar concluídos, export/import/restore,
    │                    roteamento por `aba` ("visaogeral" | "afazeres" | "compromissos" | "cadeiras" | "agenda")
    ├── firebase.js      initializeApp, Firestore com persistentLocalCache(singleTab), auth,
    │                    EMAIL_PERMITIDO, loginComGoogle() (popup + trava de e-mail), fazerLogout()
    ├── constants.js     DIAS, DIAS_FULL, CORES (paleta p/ novas cadeiras), HORA_INICIO/FIM (6–23),
    │                    STORAGE_KEY, SIDEBAR_STATE_KEY (sem uso), ULTIMA_SINCRONIZACAO_KEY,
    │                    ROTINA_OPCOES, URGENCIA_CORES, URGENCIA_LABELS
    ├── hooks/
    │   ├── usePersistedData.js   {data, persist, status, online, ultimaSincronizacao, user, login, logout}
    │   │                         Sem login: localStorage. Logado: getDocFromServer (timeout 8s) → cria doc
    │   │                         se não existe (migra localStorage) → onSnapshot com metadata.
    │   │                         Fallback getDocFromCache offline. persist(entrada): entrada = updater
    │   │                         (d) => novo (lê dataRef, estado mais recente) ou objeto; decide via
    │   │                         resolverGravacao; fila serializada de setDoc, versão p/ status; devolve
    │   │                         { ok, motivo }. pendentesRef: onSnapshot ignorado enquanto há persist na fila.
    │   │                         Snapshot só marca "sincronizado" com !fromCache && !hasPendingWrites.
    │   │                         status: loading|saving|saved|offline|error|desatualizado
    │   ├── useEventosCalendario.js  Memoiza, por mês visível e por filtro, as funções de utils/projecao.js
    │   ├── useFiltrosCalendario.js  Filtros {aulas, avaliacoes, afazeres, compromissos} em localStorage
    │   ├── useCloudBackup.js     useCloudBackup(): snapshot em users/{uid}/backups a cada 3h (checa a cada 15min),
    │   │                         mantém 10. listarBackupsCloud(uid)
    │   ├── useAutoBackup.js      ⚠ NÃO USADO em lugar nenhum. Backup diário (download .json + 10 em localStorage)
    │   └── useNavegacaoEnter.js  Enter avança foco / clica botões dentro de um container (ref)
    ├── utils/
    │   ├── sanitizarDados.js     DADOS_PADRAO (período "p1", versao atual), sanitizarDados() (1º migra, depois
    │   │                         normaliza; whitelist de afazeres/rotina; listas internas de cadeira
    │   │                         (horarios/links/datas) e compromisso (horarios) sempre arrays de objetos),
    │   │                         pareceVazio() (trava anti-sobrescrita)
    │   ├── persistencia.js       resolverGravacao(atual, entrada) → { ok, motivo, dados } (versão futura,
    │   │                         sanitiza, trava pareceVazio, "sem-mudanca"); statusDoSnapshot(metadata, online);
    │   │                         criarDespachante() → { enviar(gravar), pendentes } (setDoc na hora, sem fila — #54)
    │   ├── confirmacaoAdiada.js  criarConfirmacaoAdiada(aoConfirmar, ms) → mudar/confirmar/cancelar/sincronizar (#41)
    │   ├── migracoes.js          VERSAO_ATUAL, MIGRACOES{n: fn pura}, versaoDos, ehVersaoFutura, migrarDados
    │   ├── afazeres.js           parseISO, toISO, ocorrenciasNoIntervalo(afazer, ini, fim) → [{data, dataOriginal}],
    │   │                         gerarOcorrenciasComData (interno), primeiroDiaDoMes/ultimoDiaDoMes (sem uso)
    │   ├── calendario.js         NOME_MESES, hexParaRgb, getIntervaloMes, gerarCelulasMes, cadeiraEstaAtivaNaData
    │   ├── projecao.js           PURO: projeta eventos de uma janela [inicioISO, fimISO] — avaliações, aulas (vigência),
    │   │                         compromissos, afazeres (ocorrenciasNoIntervalo), afazeres sem data (em "hoje");
    │   │                         agruparPorDia (remove eventosExcluidos + ordena), projetarEventos (tudo junto)
    │   ├── formatarData.js       "YYYY-MM-DD" → "DD/MM/YYYY"
    │   ├── id.js                 uid() — 8 chars aleatórios
    │   └── data.js               ⚠ dadosVazios() + doc de schema DESATUALIZADO, sem uso
    ├── components/
    │   ├── Sidebar.jsx           Nav (Cadeiras, Compromissos, Afazeres, Agenda, Calendário geral), Backup
    │   │                         (exportar/importar/restaurar nuvem), conta/login, status de sync. Menu deslizante no mobile
    │   ├── VisaoGeral.jsx        Tela inicial: filtros, painel "Eventos em DD/MM" (check, excluir instância, + novo afazer),
    │   │                         calendário mensal com pontos coloridos, glow em dias de avaliação, drag-and-drop
    │   │                         (mouse direto; toque com long-press 350ms; autoscroll; troca de mês sobre as setas)
    │   ├── VisaoAfazeres.jsx     FormularioAfazer (nome, cor, data/hora, rotina, repetições, dias da semana, urgência)
    │   │                         + lista (pendentes por data/urgência, concluídos por concluidoEm), editar/excluir, apagar concluídos
    │   ├── VisaoCadeiras.jsx     SeletorPeriodo no título, barra "Duração do período" (editar com lápis),
    │   │                         adicionar cadeira, grid de cards (contagem horários/links/datas)
    │   ├── VisaoCompromissos.jsx Adicionar + grid de cards de compromissos do período ativo
    │   ├── VisaoAgenda.jsx       Filtros cadeiras/compromissos, grade semanal posicionada por %, lista de próximas datas
    │   ├── PainelCadeira.jsx     Drawer: nome (salva no blur), cor, sub-abas Horários/Links/Datas
    │   ├── PainelCompromisso.jsx Drawer: nome, cor, período (select), AbaHorarios
    │   ├── abas/
    │   │   ├── AbaHorarios.jsx   CRUD de {dia, inicio, fim, local}; valida início < fim
    │   │   ├── AbaLinks.jsx      CRUD de links web e códigos Classroom (copiar), drop de URL; Classroom primeiro
    │   │   └── AbaDatas.jsx      CRUD de datas importantes {titulo, data, hora}
    │   └── ui/
    │       ├── BarraUrgencia.jsx   "Bateria" de 3 segmentos
    │       ├── CarregandoPainel.jsx Tela de loading (capacete + órbitas CSS)
    │       ├── EstadoVazio.jsx     Mensagem de vazio + botão opcional
    │       ├── ModalTexto.jsx      Modal com 1 input (usado p/ novo período)
    │       ├── SeletorCor.jsx      Color picker nativo + campo hex; arrastar só muda a prévia, onChange no `change`/blur/400ms
    │       │                       (`adiarMs={0}` p/ estado local; drawers passam `key` = id do item)
    │       └── SeletorPeriodo.jsx  Título-dropdown: trocar/criar/renomear/excluir período
    └── styles/
        ├── app.css             Só @imports (ordem importa; mobile.css por último)
        ├── base.css            :root (tokens de cor/vidro/raio), layout .app/.main, botões, inputs, .vazio
        ├── sidebar.css         Sidebar, nav-btn, status-dot, lista de períodos
        ├── cadeiras.css        grid-cadeiras, card-cadeira (também usado por compromissos)
        ├── painel.css          overlay, painel-lateral, tabs, item-linha, link-item, seletor de cor, loading
        ├── periodo-seletor.css SeletorPeriodo + barra de duração do período
        ├── agenda.css          Grade semanal, proximas-datas, data-item (+ .data-item-texto/-titulo-quebra/-sub/
        │                       -urgencia/-hora da lista do calendário geral), drag-ghost
        ├── afazeres.css        Formulário, urgência, dias da semana, item-afazer, check-btn
        ├── calendario.css      filtro-chip, cabeçalho e grid do calendário, células, pontos
        └── mobile.css          Todas as regras ≤860px
```
