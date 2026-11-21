# organization.md — Mapa do projeto

> Números de linha são **aproximados** (referência de 2026-11-18). Busque pelo nome da função se tiver desviado.

## Atalhos rápidos ("quero mexer em X → vá em Y")

| Quero… | Onde |
|---|---|
| Criar/editar/excluir período, cadeira, rotina, compromisso, afazer | `src/App.jsx` (ações CRUD; todas gravam via `gravar()`) |
| Tela de erro da carga inicial / watchdog de reload (#7) | `src/App.jsx` (watchdog, 1 reload por sessão) + `src/components/ui/TelaErroCarga.jsx`; decisões em `src/utils/carregamento.js`; `erroCarga`/`tentarDeNovo` no `usePersistedData` |
| Mudar como os dados são salvos/carregados, status de sync | `src/hooks/usePersistedData.js` → `persist()` ~228, auth ~86, Firestore ~115; decisões puras em `src/utils/persistencia.js` |
| Adicionar campo novo ao modelo de dados | `src/utils/sanitizarDados.js` → `sanitizarDados()` (**obrigatório**) |
| Mudança estrutural no schema (renomear/mover dados) | `src/utils/migracoes.js` → `VERSAO_ATUAL` + `MIGRACOES[n]` + teste em `tests/unit/migracoes.test.js` |
| Regras de segurança do Firestore | `firestore.rules` (deploy: `firebase deploy --only firestore:rules`, feito pelo usuário) |
| Status "App desatualizado" (dados de versão mais nova) | `usePersistedData.js` (efeito + trava em `persist()`), `Sidebar.jsx` |
| Lógica de recorrência de afazeres (diária, semanal, dias específicos…) | `src/utils/afazeres.js` → `datasDaRegra()` (dias naturais, sem fim/exceções), `ocorrenciasNoIntervalo()` (corta em `rotina.dataFim`, aplica exceções de drag); check de rotina na aba (`ocorrenciaAtual`) |
| Data de fim do afazer recorrente (só dias da repetição) | `VisaoAfazeres.jsx` (`datasPossiveisDeFim` → `SeletorData permitidas`) + `ehDataDaRegra` (`utils/afazeres.js`) |
| Seletor de data próprio (popover, desabilitar dias) | `src/components/ui/SeletorData.jsx` + `src/styles/seletor-data.css`; fecha fora/Esc com `hooks/useFecharAoClicarFora.js` |
| Seções das abas Afazeres / Compromissos | `secoesDosAfazeres` (`utils/afazeres.js`), `secoesDosCompromissos` (`utils/compromissos.js`); componente `ui/SecaoLista.jsx`; CSS `listas.css` |
| Card/drawer de rotina (faixa da semana, próxima, h/semana, vigência) | `VisaoRotinas.jsx`, `PainelRotina.jsx`, `ui/ResumoRotina.jsx`; puro em `utils/rotinas.js`; CSS `rotinas.css` |
| Campos De/Até da vigência (cadeira e rotina) | `src/components/ui/CampoVigencia.jsx` (valida com `erroDeVigencia`/`dataCompleta`) |
| Marcadores na célula do calendário (★ compromisso, livro, bandeiras) | `marcadoresDoDia` / `resumirMarcadores` (`utils/projecao.js`) + render em `VisaoGeral.jsx` (`.calendario-marcos` em `calendario.css`) |
| Formato das chaves de evento (concluído/excluído no calendário) | `src/utils/projecao.js` → `chaveAula/chaveRotina/chaveCompromisso/chaveAvaliacao`; mudar formato ⇒ migração |
| O que aparece em cada dia do calendário geral | `src/utils/projecao.js` (puro): `projetarAvaliacoes/Aulas/Rotinas/Compromissos/Afazeres/AfazeresSemData`, `compararEventosDoDia` (ordenação), `agruparPorDia`, `projetarEventos` (tudo de uma vez). O hook `useEventosCalendario.js` só memoiza |
| Tela Hoje (#31, tela inicial) | `src/components/VisaoHoje.jsx` (< > por `deslocamento` a partir de hoje; projeta só o dia com `projetarEventos`); datas: `somarDias`/`diaPorExtenso` (`utils/calendario.js`); CSS `hoje.css` |
| Aviso de atrasados na Hoje (afazer avulso/compromisso com data passada e sem check) | `itensAtrasados`, `textoAtrasados` (`utils/projecao.js`) + `.aviso-atrasados` em `VisaoHoje.jsx`/`hoje.css`; clicar abre o calendário no dia: `abrirCalendarioNaData` (App) → `VisaoGeral` `diaInicial` (consumido ao montar) |
| Ordem da lista do dia (horário → sem hora não-afazer → afazeres de data única → afazeres repetidos → sem data; urgência desempata; concluídos no fim) e textos "Hoje / N d atrás / Daqui a N d / Pendente / Concluído" | `compararEventosDoDia`, `ordenarEventosDoDia`, `subtituloEvento`, `textoDistanciaDeHoje` (`utils/projecao.js`) |
| "Hoje" que vira à meia-noite (#49) | `src/hooks/useHoje.js` (timer até 00:00 + `visibilitychange`/`focus`); usado por `VisaoHoje`, `VisaoGeral` → `useEventosCalendario({ hojeISO })` |
| Rodar/escrever testes | `tests/README.md`; dados de exemplo em `tests/fixtures/fabricas.js` |
| Vigência da cadeira (#19) | Regra: `src/utils/calendario.js` → `vigenciaDaCadeira`, `cadeiraEstaAtivaNaData`, `erroDeVigencia`, `vigenciaPadraoParaNovaCadeira`; edição no drawer `PainelCadeira.jsx` (bloco "Vigência"); marcos no calendário: `projetarMarcosVigencia` (`projecao.js`) + `VisaoGeral.jsx` (`.calendario-marcos`, `.marco-vigencia` em `calendario.css`) |
| Grade do mês (células, dias de meses vizinhos) | `src/utils/calendario.js` → `gerarCelulasMes()` ~40 |
| Lista do dia (Hoje e "Eventos em DD/MM" embaixo do calendário) | `src/components/ui/ListaDoDia.jsx` (check, lixeira, "+", marcos; arrasto opcional via prop `arrasto`); estilos `.detalhe-dia` em `calendario.css`, `.data-item-*` em `agenda.css` (fim do arquivo) e `mobile.css` |
| Drag-and-drop de afazeres e compromissos no calendário | `src/components/VisaoGeral.jsx` (`podeArrastar`, `finalizarArrasto`; identidade `idArrasto` = tipo + id, em `projecao.js`) |
| Lixeira da lista do dia (exclui pontual × remove só o dia) | `ui/ListaDoDia.jsx` → `excluirInstancia` / `tituloLixeira` (#45) |
| Estilo da célula do calendário (hoje/selecionada/avaliação/destino do arrasto) | `src/styles/calendario.css` (classes + `--sombra-estado`/`--sombra-avaliacao` que somam; #24). `VisaoGeral.jsx` só passa `--cor-rgb` da avaliação |
| Lista "Próximas datas importantes" (futuras primeiro, "Anteriores" recolhida, #46) | `datasImportantes` (`utils/cadeiras.js`) + `VisaoAgenda.jsx` |
| Divisão do bundle em chunks / build falha com ciclo entre chunks (#25) | `vite.chunks.js` (`nomeDoChunk`, `cicloEntreChunks`, plugin `semCiclosEntreChunks`) |
| Formulário de afazer (repetição, data de fim, urgência, cor) | `src/components/VisaoAfazeres.jsx` → `FormularioAfazer` (`rascunho`, `submit`); frase-resumo `descreverAfazer` |
| Formulário/lista de compromissos | `src/components/VisaoCompromissos.jsx`; validação `erroDoCompromisso` (`utils/compromissos.js`) |
| Cards da tela Cadeiras | `src/components/VisaoCadeiras.jsx` + `src/styles/cadeiras.css`; resumo (próx. aula/avaliação, barra da vigência) em `ui/ResumoCadeira.jsx`, lógica pura em `src/utils/cadeiras.js` (#21) |
| Drawer da cadeira (resumo + seções recolhíveis Horários/Links/Datas) | `src/components/PainelCadeira.jsx` (`Secao`) + `src/components/abas/*` (conteúdo de cada seção); CSS `.painel-secao*` em `painel.css` |
| Conflito de horário aulas × rotinas (#32, só aviso) | puro em `src/utils/conflitos.js` (`conflitosDoHorario`, `fontesDeHorarios`, `distribuirEmColunas`); aviso em `abas/AbaHorarios.jsx` (prop `conflitosDe`, montada no `App`); Agenda: blocos lado a lado + ⚠ em `VisaoAgenda.jsx`; CSS `.aviso-conflito` (painel.css), `.agenda-bloco.conflito` (agenda.css) |
| Faltas (#34): ✗ na lista do dia, contagem em horas × 25% da carga | puro em `src/utils/frequencia.js` (`marcarFalta`, `alternarConclusaoEvento`, `resumoFaltas`, `cargaHorariaEstimada`); `ev.falta` em `projetarAulas`/`eventoConcluido`/`subtituloEvento` (`projecao.js`); botão em `ui/ListaDoDia.jsx` (`onMarcarFalta`); ação `marcarFaltaAula` no `App`; campo "Carga horária" em `PainelCadeira.jsx`; chip em `ui/ResumoCadeira.jsx` |
| Notas e média (#35) | puro em `src/utils/notas.js` (cálculo, situação UFPE, edição da árvore, sanitização); UI `abas/AbaNotas.jsx` (seção "Notas" do drawer) + `ui/CampoNumero.jsx`; criar nota a partir de uma data: `abrirAvaliacao` (`PainelCadeira.jsx`) + botão em `abas/AbaDatas.jsx`; CSS `.nota*`/`.notas-*` no fim de `painel.css`, `.resumo-chip` em `cadeiras.css` |
| Grade semanal (faixa de horas = 1º início → último fim, dentro de 06h–23h) | `src/components/VisaoAgenda.jsx` + `src/styles/agenda.css`; faixa/posição em `src/utils/agendaSemanal.js` |
| Agenda **deitada** no celular em pé (girar o aparelho para ler) | `VisaoAgenda.jsx` (`useMediaQuery` → classe `.agenda-girada`, sem zoom) + `mobile.css` (caixa `container-type: size`, grade girada 90° com cqw/cqh) |
| Zoom da Agenda (pinça, Ctrl+roda, − 100% +; só desktop/paisagem) | `src/hooks/useZoomAgenda.js` (listeners nativos não passivos, foco sob os dedos, salva em `ZOOM_AGENDA_KEY`) + puro em `src/utils/zoomAgenda.js`; CSS via `--agenda-zoom` |
| Cores de texto e escala tipográfica (#24) | tokens em `src/styles/base.css` (`--texto`, `--texto-fraco`, `--texto-sutil`, `--fs-*`); teste de contraste em `integridade.test.js` |
| Menu lateral, backup, login, indicador de status | `src/components/Sidebar.jsx` + `src/styles/sidebar.css` |
| Backup na nuvem (snapshots a cada 3h) | `src/hooks/useCloudBackup.js`; decisões puras (quando fazer, rotação) em `src/utils/backupNuvem.js` |
| Seletor de cor (prévia local, grava ao soltar/fechar) | `src/components/ui/SeletorCor.jsx` + `src/utils/confirmacaoAdiada.js` |
| Exportar/importar `.json`, restaurar da nuvem | `src/App.jsx` → `exportarBackup`, `importarBackup`, `abrirRestaurarNuvem`/`restaurarBackupNuvem`; lista em `src/components/ui/ModalRestaurarNuvem.jsx` |
| Aviso/confirmação/toast (nada de `alert/confirm/prompt`) | `useDialogos()` (`src/hooks/useDialogos.js`) → `avisar`, `confirmar`, `notificar`; provider + casca `Modal` em `src/components/ui/Dialogos.jsx`; fila/dedupe e textos em `src/utils/dialogos.js`; CSS em `src/styles/modal.css` |
| Aviso quando o `persist()` recusa (#44) | `src/App.jsx` → `gravar()` + `mensagemDeRecusa` (`utils/dialogos.js`) |
| Desfazer exclusão (#18) | `src/App.jsx` → `excluirComDesfazer`, `excluirPeriodo`, `excluirInstanciaEvento`, `limparAfazeresConcluidos`; listas internas dos drawers em `src/hooks/useListaInterna.js`; puro em `src/utils/desfazer.js` |
| Lint / formatação | `eslint.config.js`, `.prettierrc.json`, `.prettierignore`; `npm run lint` / `npm run format` |
| Navegação por Enter em formulários | `src/hooks/useNavegacaoEnter.js` |
| Acessibilidade (#51): Esc/foco preso nos modais e drawers; `div` clicável como botão | `src/hooks/useCaixaModal.js` (Modal + PainelCadeira/PainelRotina); `propsDeBotao` em `src/utils/acessibilidade.js` (cards, células do calendário, blocos/datas da Agenda) |
| Limpar chaves órfãs ao excluir (#52) | `src/utils/chavesOrfas.js` (`limparChavesOrfas`/`devolverChaves`), usado em `excluirComDesfazer`, `excluirPeriodo` e nos "apagar" em massa do `App.jsx` |
| Constantes (cores, dias, rotinas, urgência, chaves de storage) | `src/constants.js` |
| Qualquer coisa de layout mobile | `src/styles/mobile.css` (único `@media (max-width: 860px)`) |
| Manifest/ícones/service worker | `vite.config.js` (VitePWA) + `public/`. Ícone da tela inicial do Android = os `maskable` (`web-app-manifest-*.png`, fundo opaco); os `icon-*.png` são transparentes |
| Login Google / e-mail permitido | `src/firebase.js` |
| Lembretes (#23): quando disparam, textos do push, padrões | `src/utils/lembretes.js` (PURO, **sem imports**; cópia em `functions/compartilhado/` via `npm run funcoes:sincronizar`) |
| Lembretes: envio no servidor (agendador 1/min, FCM, tokens inválidos, testes) | `functions/index.js` (deploy pelo usuário: `firebase deploy --only functions`) |
| Lembretes: ativar/desativar/testar no aparelho, token FCM | `src/notificacoes.js` (registro em `users/{uid}/dispositivos`, não passa pelo persist); estado puro em `src/utils/aparelho.js` |
| Lembretes: UI | `ui/ModalLembretes.jsx` (Sidebar → Ajustes → Lembretes), `ui/SeletorLembretes.jsx` (form do compromisso, `AbaDatas`); CSS `lembretes.css` |
| Push / clique na notificação / cache offline | `src/sw.js` (service worker próprio, `injectManifest` no `vite.config.js`) |
| Cor quase preta invisível no fundo escuro (#55) | `corVisivel` (`utils/calendario.js`), aplicada em `projecao.js`, listas e agenda — só exibição |

## Modelo de dados (`AppData`, um único documento `users/{uid}` ou `localStorage["painel-academico-data"]`)

```
versao            int — versão do schema (atual: 6; ausente = 0). Ver utils/migracoes.js
periodos[]        { id, nome }                                   ← sem datas desde a v4 (#20)
periodoAtivoId    string | null
cadeiras[]        { id, periodoId, nome, cor, dataInicio?, dataFim?, horarios[], links[], datas[],   ← vigência (#19)
                    faltas[] (chaves de aula com ✗, #34), cargaHoraria? (h, #34),
                    notas[] (árvore #35: { id, titulo, tipo nota|grupo, modo peso|bonus, valor, nota?, itens?, dataId? }), notaFinal? }
  horarios[]      { id, dia(0=Seg..6=Dom), inicio "HH:MM", fim, local? }
  links[]         { id, titulo, url, isClassroom?, codigoClassroom? }
  datas[]         { id, titulo, data "YYYY-MM-DD", hora?, lembretes?: number[] }  ← avaliações
rotinas[]         { id, nome, cor, horarios[], dataInicio?, dataFim? }  ← semanais (eram "compromissos" até a v4); sem período desde a v6 (#56)
compromissos[]    { id, nome, cor, data, inicio "HH:MM", fim?, feito, concluidoEm?, lembretes?: number[] }  ← pontuais (v5)
lembretes         { compromissos: number[], avaliacoes: number[] }  ← padrões (#23, minutos antes; padrão 15 / 1440).
                  `lembretes` ausente no item = padrão; [] = sem lembrete. Sem migração (só valor padrão no sanitizarDados)
afazeres[]        { id, nome, data?, cor?, urgencia 1|2|3, feito, concluidoEm?,      ← sem hora desde a v5
                    rotina{ tipo, intervaloDias, dataFim ("" = para sempre), diasSemana[] },
                    datasConcluidas[] (por ocorrência, pela data NATURAL = origem), excecoesData{ origem: destino } (drag) }
eventosConcluidos[]  chaves de evento (aulas/avaliações/rotinas), por id — ver abaixo (compromisso guarda `feito` no item)
eventosExcluidos[]   chaves de ocorrências removidas (todas as fontes)
```
Fora do AppData (subcoleções de `users/{uid}`, não passam pelo `persist()`): `backups/{ts}` (snapshots, #8),
`dispositivos/{id}` `{ token, aparelho, criadoEm, atualizadoEm, testeEm?, testeRespondidoEm? }` (app grava; Rules limitam campos),
`sistema/lembretes` `{ enviados: { chave: disparoMs }, ultimaExecucao }` (só a Cloud Function, Admin SDK).
`rotina.tipo` (repetição do AFAZER — não confundir com a entidade `rotinas[]`): `nenhuma | diaria | semanal | quinzenal | mensal | dias_especificos | personalizada`.
Chaves de evento (v2+, montadas em `utils/projecao.js` → `chaveAula/chaveCompromisso/chaveAvaliacao`) — aulas: `aulas|ISO|idCadeira|idHorario`; rotinas: `rotinas|ISO|idRotina|idHorario` (v5; antes `compromissos|…`); compromissos pontuais: `compromissos|id` (só identifica, não é gravada); avaliações: `avaliacoes|idCadeira|idAvaliacao` (sem data); afazeres: `afazeres|id|dataOriginal` (v3) ou `afazeres-semdata|id`.

## Fluxo de dados
```
usePersistedData ──data──▶ App.jsx (deriva periodoAtivo, cadeirasDoPeriodo, compromissosDoPeriodo)
      ▲                       │ props + callbacks (criarX/atualizarX/excluirX)
      └── persist((d) => novo) ◀┘   (updater recebe o estado mais recente; devolve { ok, motivo })
VisaoHoje  → projetarEventos(janela de 1 dia) ─┐
VisaoGeral → useEventosCalendario(cadeiras TODAS + rotinas TODAS (filtradas pela vigência) + compromissos + afazeres)
           → utils/projecao.js (puro) → { "YYYY-MM-DD": evento[] } → ui/ListaDoDia (ordenarEventosDoDia)
```

## Árvore arquivo por arquivo

```
UFPE/
├── CLAUDE.md            Regras e escopo (ler primeiro)
├── log.md               Alterações recentes + pendências entre sessões
├── organization.md      Este mapa
├── todo.md              Backlog priorizado
├── README.md            Doc pública (portfólio) com screenshots — atualizar quando features mudarem
├── index.html           Shell HTML, metas iOS/PWA, favicons; título "Minha Agenda" (= short_name, teste em integridade)
├── vite.config.js       Vite + React + VitePWA (manifest com id/lang, ícones any + maskable 192/512, injectManifest) + manualChunks
├── vite.chunks.js       #25: nomeDoChunk (firebase · react · vendor; messaging fica sob demanda) + plugin que aborta o build com ciclo entre chunks
├── package.json         scripts: dev, build, preview, test (vitest run), test:watch, lint (eslint + prettier --check, `src`
│                        explícito: OneDrive faz o Node ver a pasta como symlink), format, check (lint + test + build)
├── eslint.config.js     ESLint 10 flat: recommended + react-hooks + react-refresh + prettier; catch vazio e `_` liberados
├── .prettierrc.json     printWidth 120, aspas duplas, trailing comma, endOfLine auto · .prettierignore
│                        overrides: @grpc/grpc-js ^1.14.7 (o firebase fixa ~1.9 vulnerável; só usado no Node)
├── firestore.rules      Security Rules: uid + e-mail permitido + email_verified, formato mínimo do AppData,
│                        doc principal não pode ser apagado, backups só create/delete, resto negado
├── firebase.json        Aponta firestore.rules + functions (nodejs22, predeploy `npm run funcoes:sincronizar`) · .firebaserc: projeto default
├── functions/           Cloud Functions (pacote próprio, ESM, Node 22; deploy pelo usuário, plano Blaze)
│   ├── index.js         enviarLembretes: onSchedule a cada 1 min (America/Recife) → para cada users/{uid} com dispositivos:
│   │                    testes pedidos (testeEm > testeRespondidoEm), lembretesPendentes (janela 10 min, dedupe em
│   │                    sistema/lembretes), sendEachForMulticast (só `data`; TTL até o evento), apaga tokens inválidos.
│   │                    NUNCA grava no doc principal (teste em integridade)
│   └── compartilhado/lembretes.js  CÓPIA de src/utils/lembretes.js (teste exige igualdade)
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
│       ├── backupNuvem.test.js    Backup na nuvem: sem snapshot por reabertura/offline, sem estado vazio, rotação (#8)
│       ├── carregamento.test.js   Tela inicial (app/erro/travado/carregando) e watchdog sem loop (#7)
│       ├── confirmacaoAdiada.test.js  Seletor de cor: 1 gravação por arrasto, dedupe, confirmar/cancelar (#41)
│       ├── migracoes.test.js      Registro de migrações completo, v0→atual, v1→v2 (#10), v2→v3 (#14), v3→v4 (#20), v4→v5 (#22), não muta, versão futura intocada
│       ├── links.test.js          normalizarUrl / hrefSeguro (#50)
│       ├── dialogos.test.js       Fila/dedupe de diálogos (#17), mensagemDeRecusa (#44), resumoDoBackup
│       ├── desfazer.test.js       reinserirPorId / reinserirVarios / separarRemovidos (#18)
│       ├── cadeiras.test.js       Resumo da cadeira (#21): próxima aula/avaliação, progresso da vigência, textos, datasImportantes (#46), motivoParaNaoExcluirPeriodo (#53)
│       ├── zoomAgenda.test.js     #24: limites, pinça, passos de 25%, foco sob os dedos
│       ├── agendaSemanal.test.js  faixaDeHoras (corte, mínimo de 8 h, limites, lixo) e percentualNaGrade
│       ├── frequencia.test.js     #34: falta/check, projeção com "Falta", horas × carga, níveis, estimativa
│       ├── notas.test.js          #35: casos reais (Lógica com bônus, unidades 60/30/10), necessária, situação UFPE, árvore
│       ├── conflitos.test.js      #32: sobreposição, vigência, próprio horário/mesmo dono, aviso, colunas da Agenda
│       ├── chavesOrfas.test.js    #52: donoDaChave (formatos da projeção), limparChavesOrfas, devolverChaves
│       ├── acessibilidade.test.js #51: propsDeBotao (Enter/Espaço, botão de dentro)
│       ├── nomes.test.js          #48: nomeAoSair (vazio volta ao atual)
│       ├── id.test.js             #29: uid() UUID + fallback sem contexto seguro
│       ├── chunks.test.js         #25: nomeDoChunk (Firebase num chunk só, messaging sob demanda) e cicloEntreChunks
│       ├── projecao.test.js       Eventos por dia (aulas, avaliações, rotinas, compromissos, afazeres) + ordenação + marcos + marcadores
│       ├── rotinas.test.js        Faixa da semana, horas/semana, próxima ocorrência da rotina
│       ├── compromissos.test.js   Validação, seções e textos dos compromissos
│       ├── lembretes.test.js      #23: sanitização, fuso, listarLembretes (padrão/próprio/[]/feito/excluída/vigência/sem hora), textos do push, dedupe, estado do aparelho
│       └── integridade.test.js    Estático: ícones PWA (existem; maskable 192/512 opacos), título da aba, ordem/escopo do CSS, .env, regressões de UI,
│                                  Rules em sincronia (e-mail = EMAIL_PERMITIDO, campos ⊂ DADOS_PADRAO),
│                                  sem alert/confirm/prompt nativos (#17), check roda o lint (#16)
├── public/
│   ├── capacete-carregando.png   Imagem da tela de loading
│   └── icon-192/512.png, web-app-manifest-192/512.png (maskable; o 512 é o do manifest), favicon.*, apple-touch-icon.png
└── src/
    ├── main.jsx         Monta <DialogosProvider><App/></DialogosProvider> em StrictMode e importa styles/app.css
    ├── App.jsx          Raiz: estado de UI (aba, drawer aberto, modal período, gatilho novo afazer),
    │                    watchdog de 12s no loading (reload no máx. 1×/sessão, depois TelaErroCarga), TODAS as ações CRUD, alternar concluído,
    │                    mover instância, excluir instância, limpar concluídos, export/import/restore,
    │                    gravar() (persist + aviso de recusa, #44), excluir com Desfazer (#18), entrar() (aviso de login),
    │                    roteamento por `aba` ("hoje" = inicial | "visaogeral" | "afazeres" | "compromissos" | "rotinas" | "cadeiras" | "agenda");
    │                    cadeiras/agenda exigem período ativo; rotinas/compromissos/afazeres não
    ├── sw.js            Service worker (injectManifest): precache do app shell + fallback /index.html, `push` (mostra a
    │                    notificação a partir de `data` {titulo, corpo, tag, url}), `notificationclick` (foca/abre o app)
    ├── notificacoes.js  Lembretes (#23) no aparelho: estadoNotificacoes, ativar (permissão + getToken com o SW + setDoc em
    │                    dispositivos + testeEm), desativar, testar, renovarTokenSeAtivo (App, 1×/login). SDK messaging via import()
    ├── firebase.js      `app` exportado (FCM), initializeApp, Firestore com persistentLocalCache(multipleTab, #47) + ignoreUndefinedProperties, auth,
    │                    EMAIL_PERMITIDO, loginComGoogle() (popup + trava de e-mail; devolve { ok, user | mensagem }), fazerLogout()
    ├── constants.js     DIAS, DIAS_FULL, CORES (paleta p/ novas cadeiras), HORA_INICIO/FIM (6–23),
    │                    STORAGE_KEY, ULTIMA_SINCRONIZACAO_KEY,
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
│   │                         erroCarga + tentarDeNovo(): carga sem base local falhou → App mostra TelaErroCarga;
│   │                         nova tentativa automática no `online` e a cada 30s (sem reload, #7)
    │   ├── useEventosCalendario.js  Memoiza, por mês visível e por filtro, as funções de utils/projecao.js → { eventosPorDia, marcosVigencia }
    │   ├── useHoje.js            hojeISO que vira à meia-noite (timer + visibilitychange/focus, #49)
    │   ├── useFiltrosCalendario.js  Filtros {aulas, avaliacoes, rotinas, compromissos, afazeres} em localStorage ("rotinas" herda o antigo "compromissos")
    │   ├── useFecharAoClicarFora.js Fecha popover (seletor de data, menu "+") ao clicar fora / Esc (Esc na captura: não fecha o drawer junto)
    │   ├── useCaixaModal.js      #51: Esc fecha, Tab preso, foco volta ao fechar; focoInicial "primeiro" (Modal) | "caixa" (drawers)
    │   ├── useMediaQuery.js      true enquanto a media query casa (Agenda girada)
    │   ├── useCloudBackup.js     useCloudBackup(): snapshot em users/{uid}/backups a cada 3h contadas do backup mais
    │   │                         recente NO SERVIDOR (checa a cada 15min; timer não depende de `data`; 1 por vez;
    │   │                         offline não tenta — #8), mantém 10. listarBackupsCloud(uid)
    │   ├── useNavegacaoEnter.js  Enter avança foco / clica botões dentro de um container (ref)
    │   ├── useZoomAgenda.js      #24: zoom da Agenda (pinça/Ctrl+roda/botões), mantém o ponto sob os dedos; callback ref `definirArea`
    │   ├── useDialogos.js        Contexto + hook: { avisar, confirmar, notificar } (provider em ui/Dialogos.jsx, #17/#18)
    │   └── useListaInterna.js    adicionar/editar/remover (com Desfazer) nas listas internas de cadeira/rotina;
    │                             usa onAtualizar(fn) → lê o item mais recente
    ├── utils/
    │   ├── agendaSemanal.js      PURO: faixaDeHoras(blocos) (mín. 8 h), percentualNaGrade
    │   ├── frequencia.js         PURO (#34): partesDaChaveAula, marcarFalta, alternarConclusaoEvento, ehFalta, cargaHorariaEstimada, resumoFaltas, textoFaltas, textoDepoisDaFalta
    │   ├── notas.js              PURO (#35): sanitizarItensNota/sanitizarNota, mediaParcial, notasPendentes, notaNecessaria, situacaoDasNotas, resumoCurtoDasNotas,
    │   │                         formatarNota (corta em 2 casas), edição da árvore (inserir/editar/remover/mover/duplicar, destinosPossiveis), notasPorData
    │   ├── conflitos.js          PURO (#32): horariosSeSobrepoem, vigenciasSeCruzam, fontesDeHorarios, conflitosDoHorario, avisoDeConflitos, distribuirEmColunas (Agenda)
    │   ├── chavesOrfas.js        PURO (#52): donoDaChave, limparChavesOrfas, devolverChaves
    │   ├── acessibilidade.js     propsDeBotao(acao, extras) (#51)
    │   ├── nomes.js              nomeAoSair(digitado, atual) (#48, drawers)
    │   ├── zoomAgenda.js         PURO (#24): limitarZoom, zoomDaPinca, zoomNoPasso (múltiplos de 25%), deslocamentoParaFoco, textoZoom
    │   ├── sanitizarDados.js     DADOS_PADRAO (período "p1", versao atual), sanitizarDados() (1º migra, depois
    │   │                         normaliza; whitelist de afazeres/rotina; listas internas de cadeira
    │   │                         (horarios/links/datas) e compromisso (horarios) sempre arrays de objetos;
│   │                         por último removerUndefined() em profundidade — o Firestore recusa undefined, #43),
    │   │                         pareceVazio() (trava anti-sobrescrita)
    │   ├── persistencia.js       resolverGravacao(atual, entrada) → { ok, motivo, dados } (versão futura,
    │   │                         sanitiza, trava pareceVazio, "sem-mudanca"); statusDoSnapshot(metadata, online);
    │   │                         criarDespachante() → { enviar(gravar), pendentes } (setDoc na hora, sem fila — #54)
    │   ├── backupNuvem.js        deveFazerBackup({agora, ultimoBackup, online, dados}) → {fazer, motivo}, backupsParaApagar (#8)
│   ├── carregamento.js       telaInicial({temDados, erroCarga, travou}), acaoDoWatchdog (1 reload/sessão), constantes (#7)
│   ├── confirmacaoAdiada.js  criarConfirmacaoAdiada(aoConfirmar, ms) → mudar/confirmar/cancelar/sincronizar (#41)
    │   ├── migracoes.js          VERSAO_ATUAL (6), MIGRACOES{n: fn pura}: 1 baseline, 2 chaves por id (#10), 3 data natural
    │   │                         das ocorrências movidas (#14), 4 vigência na cadeira (#20), 5 rotinas/compromissos pontuais/
    │   │                         dataFim (#22), 6 rotina sem período + vigência herdada (#56); versaoDos, ehVersaoFutura, migrarDados
    │   ├── afazeres.js           parseISO, toISO, datasDaRegra/ehDataDaRegra/dataFimDaRotina (Fase 5), ocorrenciasNoIntervalo(afazer, ini, fim)
    │   │                         → [{data, dataOriginal}], mesmoDiaMesesDepois (mensal, #12), ehRotina, afazerConcluido (rotina nunca, #11),
    │   │                         ocorrenciaAtual (check da aba, #11), ROTINAS_COM_DATA_BASE/dataAoSalvarAfazer/rotinaSemDataBase (#40),
    │   │                         textoRepeticao/textoFimRepeticao/descreverAfazer, secoesDosAfazeres
    │   ├── calendario.js         NOME_MESES, hexParaRgb, corVisivel (#55), getIntervaloMes, gerarCelulasMes, vigência da cadeira (#19): vigenciaDaCadeira,
    │   │                         cadeiraEstaAtivaNaData (aliases vigenciaDe/estaAtivoNaData p/ rotinas), textoVigencia, ehDataISO, dataCompleta, erroDeVigencia, vigenciaPadraoParaNovaCadeira
    │   ├── rotinas.js            PURO (Fase 5): diasAtivosDaRotina, minutosPorSemana, textoDuracao, proximaOcorrenciaRotina (vigência), rotinaEncerrada,
    │   │                         horariosNaSemana (agenda semanal, #56) — ui/ResumoRotina.jsx
    │   ├── lembretes.js          PURO, SEM IMPORTS (#23; copiado p/ functions/): LEMBRETES_PADRAO, OPCOES_LEMBRETE, sanitizar*, textoAntecedencia,
    │   │                         instanteLocal/partesLocais (Recife UTC-3 fixo), listarLembretes, montarNotificacao, lembretesPendentes, podarEnviados
    │   ├── aparelho.js           PURO: estadoDoAparelho (sem-login/ios-instalar/sem-suporte/bloqueado/ativo/inativo), descreverAparelho
    │   ├── compromissos.js       PURO (Fase 5): erroDoCompromisso, secoesDosCompromissos, textoHorarioCompromisso, textoDataComSemana, rotuloRelativo
    │   ├── cadeiras.js           PURO (#21): diasEntre, proximoHorarioSemanal (genérico, usado por rotinas), proximaAula (vigência + excluídas), proximasAvaliacoes (destaque ≤7 dias), datasImportantes (#46: próximas ↑ / anteriores ↓), progressoVigencia,
    │   │                         rotuloDias, textoProximaAula, textoQuandoAvaliacao — usados por ui/ResumoCadeira.jsx; motivoParaNaoExcluirPeriodo (#53)
    │   ├── projecao.js           PURO: projeta eventos de uma janela [inicioISO, fimISO] — avaliações, aulas (vigência),
    │   │                         rotinas, compromissos pontuais, afazeres (ocorrenciasNoIntervalo), afazeres sem data (em "hoje");
    │   │                         marcadoresDoDia/resumirMarcadores (★/livro/bandeiras da célula);
    │   │                         agruparPorDia (remove eventosExcluidos + ordena), projetarEventos (tudo junto);
    │   │                         lista do dia: compararEventosDoDia, eventoConcluido, ordenarEventosDoDia, subtituloEvento, textoDistanciaDeHoje, idArrasto;
    │   │                         aviso da Hoje: itensAtrasados, textoAtrasados
    │   ├── formatarData.js       "YYYY-MM-DD" → "DD/MM/YYYY"
    │   ├── links.js              normalizarUrl, hrefSeguro (só http(s) vira href, #50)
    │   ├── dialogos.js           enfileirarDialogo (dedupe por chave), removerDialogo, mensagemDeRecusa (#44), resumoDoBackup (migra antes de contar)
    │   ├── desfazer.js           reinserirPorId, reinserirVarios, separarRemovidos (#18)
    │   └── id.js                 uid() — crypto.randomUUID (#29); sem contexto seguro, 16 chars aleatórios
    ├── components/
    │   ├── Sidebar.jsx           Nav (Cadeiras, Rotinas, Compromissos, Afazeres, Agenda · Visão geral: Hoje, Calendário geral), Backup
    │   │                         (exportar/importar/restaurar nuvem), conta/login, status de sync. Menu deslizante no mobile
    │   ├── VisaoHoje.jsx         Tela inicial (#31): aviso de atrasados (abre o calendário no dia) + < data > + ListaDoDia do dia (sem filtros, sem arrasto); botão "Hoje" volta
    │   ├── VisaoGeral.jsx        Calendário geral: filtros, calendário e, EMBAIXO, a ListaDoDia "Eventos em DD/MM";
    │   │                         calendário mensal com pontos coloridos, marcadores ★/livro/bandeiras, glow em dias de avaliação, drag-and-drop (afazer e compromisso)
    │   │                         (mouse direto; toque com long-press 350ms; autoscroll; troca de mês sobre as setas)
    │   ├── VisaoAfazeres.jsx     FormularioAfazer (nome, dia/começa em, repetição, dias da semana, termina em, urgência, cor, frase-resumo)
    │   │                         + seções Atrasados/Hoje/Próximos/Sem data/Recorrentes/Concluídos (ItemAfazer)
    │   ├── VisaoCadeiras.jsx     SeletorPeriodo no título, adicionar cadeira, grid de cards (contagem horários/links/datas + vigência)
    │   ├── VisaoRotinas.jsx      Adicionar + grid de cards de todas as rotinas (ResumoRotina)
    │   ├── VisaoCompromissos.jsx Compromissos pontuais: FormularioCompromisso (nome, data, início, fim?, cor) + Hoje/Próximos/Passados
    │   ├── VisaoAgenda.jsx       Filtros cadeiras/rotinas, grade semanal posicionada por %, lista de próximas datas
    │   ├── PainelCadeira.jsx     Drawer: nome (salva no blur), cor, vigência De/Até (grava a cada data válida, #19), resumo e seções recolhíveis Horários/Links/Datas (#21)
    │   ├── PainelRotina.jsx      Drawer: nome, ResumoRotina, cor, vigência opcional (CampoVigencia), seção Horários (AbaHorarios)
    │   ├── abas/
    │   │   ├── AbaHorarios.jsx   CRUD de {dia, inicio, fim, local}; valida início < fim
    │   │   ├── AbaLinks.jsx      CRUD de links web e códigos Classroom (copiar), drop de URL; Classroom primeiro
    │   │   ├── AbaDatas.jsx      CRUD de datas importantes {titulo, data, hora}; 🎓 cria/abre a nota ligada (#35)
    │   │   └── AbaNotas.jsx      #35: resumo (média, quanto precisa, final) + árvore de notas/grupos editável
    │   └── ui/
    │       ├── BarraUrgencia.jsx   "Bateria" de 3 segmentos
    │       ├── CampoNumero.jsx     Número com vírgula que grava no blur/Enter (vazio = undefined)
    │       ├── ListaDoDia.jsx      Lista de um dia (Hoje e calendário): ordem/textos de projecao.js, check, lixeira, "+", marcos, arrasto opcional
    │       ├── CarregandoPainel.jsx Tela de loading (capacete + órbitas CSS)
    │       ├── EstadoVazio.jsx     Mensagem de vazio + botão opcional
    │       ├── Dialogos.jsx        DialogosProvider (fila de diálogos + toast com ação) e a casca `Modal` (Esc/foco via useCaixaModal)
    │       ├── ModalTexto.jsx      Modal com 1 input (usado p/ novo período), sobre a casca `Modal`
    │       ├── ModalRestaurarNuvem.jsx  Lista de backups da nuvem (data + resumo); confirmação/gravação no App
│       ├── ModalLembretes.jsx  #23: este aparelho (ativar/testar/desativar) + padrões de compromissos e avaliações
│       ├── SeletorLembretes.jsx Chips de antecedência (Padrão · opções · Nenhum); padrão herdado aparece tracejado
│       ├── TelaErroCarga.jsx   Erro da carga inicial (#7): "Tentar de novo" + "Usar sem login" (estilos no fim de painel.css)
    │       ├── ResumoRotina.jsx    Faixa S T Q Q S S D (dias ativos na cor), caixa "Próxima" (ou "Encerrada"), h/semana, vigência
    │       ├── SeletorData.jsx     Seletor de data próprio: popover do mês, `permitidas(ini, fim) → Set`, minimo/maximo, marcada, limpavel
    │       ├── SecaoLista.jsx      Seção recolhível com contagem e ação no cabeçalho (abas Afazeres/Compromissos)
    │       ├── ResumoCadeira.jsx   Caixas "Próx. aula"/"Próx. avaliações" (cor da cadeira; vazia = tracejada compacta; até 3 avaliações no card, 5 no drawer, + "+N") · barra da vigência + % (#21)
    │       ├── SeletorCor.jsx      Color picker nativo + campo hex; arrastar só muda a prévia, onChange no `change`/blur/400ms
    │       │                       (`adiarMs={0}` p/ estado local; drawers passam `key` = id do item)
    │       └── SeletorPeriodo.jsx  Título-dropdown: trocar/criar/renomear/excluir período
    └── styles/
        ├── app.css             Só @imports (ordem importa; mobile.css por último)
        ├── base.css            :root (tokens de cor/vidro/raio), layout .app/.main, botões, inputs, .vazio
        ├── sidebar.css         Sidebar, nav-btn, status-dot, lista de períodos
        ├── cadeiras.css        grid-cadeiras, card-cadeira (também usado por rotinas), .resumo-caixa
        ├── painel.css          overlay, painel-lateral, tabs, item-linha, link-item, seletor de cor, loading
        ├── periodo-seletor.css SeletorPeriodo + barra de duração do período
        ├── agenda.css          Grade semanal, proximas-datas, data-item (+ .data-item-texto/-titulo-quebra/-sub/
        │                       -urgencia/-hora da lista do calendário geral), drag-ghost
        ├── listas.css          .form-card/.form-campo, .secao-lista, .item-lista, .chip-meta (Afazeres e Compromissos)
        ├── afazeres.css        Urgência, dias da semana, check-btn
        ├── rotinas.css         .resumo-rotina, .faixa-semana
        ├── seletor-data.css    SeletorData (campo + popover; fundo sólido de propósito)
        ├── lembretes.css       Chips de lembrete, modal de lembretes, .lembrete-proprio
        ├── calendario.css      filtro-chip, cabeçalho e grid do calendário, células (estados hoje/selecionada/avaliação/arrasto, #24), pontos, marcadores, menu "+", .detalhe-dia (lista do dia, sem altura fixa)
        ├── hoje.css            Cabeçalho < data > da tela Hoje (.hoje-nav centralizada, largura fixa; "+" absoluto à direita), atalho "Hoje" na linha do título (.hoje-header, absoluto + padding reservado), menu do + abre para dentro, aviso de atrasados (.aviso-atrasados)
        ├── modal.css           .modal-overlay/.modal (z 100), .btn-perigo, lista de restaurar, .toast (z 90) + .toast-progresso (barra de tempo do Desfazer)
        └── mobile.css          Todas as regras ≤860px
```
