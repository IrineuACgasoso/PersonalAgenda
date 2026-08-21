# Contexto do Projeto: Minha Agenda Pessoal (Cadeiras, Compromissos, Afazeres & Agenda)

## 1. Visão Geral do Projeto
Aplicação web React (SPA) para organização pessoal e acadêmica. Permite ao usuário gerenciar **Períodos** (ex: 2026.1, 2026.2) e suas **Cadeiras** (disciplinas), com horários de aula, links/materiais e datas importantes (provas/trabalhos); **Compromissos** avulsos com horário recorrente semanal (ex: academia, reunião fixa), independentes de período; e **Afazeres** avulsos, não necessariamente ligados à faculdade, com recorrência, urgência e cor própria. Uma **Visão Geral** cruza tudo isso num calendário mensal filtrável e interativo, e a **Agenda da semana** mostra a grade semanal de Cadeiras + Compromissos.

- **Tech Stack:** React 18, Lucide React (ícones), CSS puro (Dark Theme), Vite, `vite-plugin-pwa`, Firebase (Auth + Firestore).
- **Tema Visual:** Dark mode (`#0f1115` fundo principal, `#15171c` cards/painéis, `#6366f1` accent/roxo).
- **Persistência:** híbrida — `localStorage` sempre, e sincronização em nuvem via **Firestore em tempo real** quando o usuário está logado (ver Seção 2.1). Exportação/importação manual de backup em `.json` como rede de segurança adicional.
- **PWA:** app instalável (Android/iOS/desktop) com manifest, ícones e service worker (`vite-plugin-pwa`), funciona offline usando os dados já salvos localmente.
- **Responsividade:** layout adaptado para mobile (sidebar vira menu deslizante abaixo de 860px de largura).

---

## 2. Autenticação & Sincronização em Nuvem (Firebase)

**Arquivo:** `src/firebase.js`

- Login via **Google (popup)**, restrito a **um único e-mail permitido**: `EMAIL_PERMITIDO = "cac@cin.ufpe.br"`. Qualquer outro e-mail é deslogado automaticamente (`signOut`) com um `alert` de acesso negado — trava tanto no clique de login quanto reativamente via `onAuthStateChanged`.
- `setPersistence(auth, browserLocalPersistence)` garante que a sessão continue entre aberturas do navegador/app.
- Exporta: `db` (Firestore), `auth`, `googleProvider`, `EMAIL_PERMITIDO`, `loginComGoogle()`, `fazerLogout()`.
- **Atenção de segurança:** as chaves em `firebaseConfig` (apiKey etc.) são públicas por natureza no client-side Firebase — isso é esperado. A segurança real precisa vir das **Firestore Security Rules** no console do Firebase (restringindo leitura/escrita de `users/{uid}` ao próprio usuário autenticado). Isso **não é feito pelo código** e deve ser configurado manualmente no Firebase Console.

### 2.1. `usePersistedData.js`
Retorna: `{ data, persist, status, user, loginWithGoogle, logout }`.

Lógica:
1. Escuta `onAuthStateChanged`: se **não logado**, carrega e persiste em `localStorage` (`STORAGE_KEY`) normalmente, com `DADOS_PADRAO` local (duplicado do que `utils/data.js` também define — ver observação na Seção 6). `DADOS_PADRAO` inclui `compromissos: []`.
2. Se **logado**, assina `onSnapshot(doc(db, "users", user.uid))` em tempo real: qualquer alteração no Firestore (de qualquer dispositivo logado com essa conta) atualiza a tela automaticamente. Se o documento não existir ainda, cria a partir do que tinha no `localStorage` (migração automática no primeiro login).
3. `persist(next)`: sempre atualiza o estado local imediatamente; se logado, grava no Firestore (`setDoc`); senão, grava no `localStorage`.
4. `status`: `"loading" | "saving" | "saved" | "error"`.

**Efeito prático para o usuário:** dados só sincronizam entre dispositivos **depois de fazer login com a conta Google permitida** em cada um deles. Sem login, cada navegador/dispositivo continua isolado em seu próprio `localStorage` (mesmo comportamento de antes).

### 2.2. Backup manual (`exportarBackup` / `importarBackup`, em `App.jsx`)
Independente da nuvem — funciona sempre, logado ou não:
- **Exportar dados**: baixa um `.json` com todo o `data` atual (nome do arquivo `agenda-backup-YYYY-MM-DD.json`), incluindo `compromissos`.
- **Importar dados**: lê um `.json`, valida se tem `periodos` (array), pede confirmação (`window.confirm`) porque **substitui tudo**, e chama `persist(...)` com todos os campos (`periodos`, `cadeiras`, `compromissos`, `afazeres`, `periodoAtivoId`) — cada um com fallback `?? []`/`?? null` para compatibilidade com backups antigos que não tinham `compromissos`.
- Botões ficam na Sidebar, seção "Backup" (ver Seção 4).

---

## 3. Modelo de Dados & Tipagem (TypeScript Spec)

```typescript
type AppData = {
  periodos: Periodo[];
  cadeiras: Cadeira[];
  compromissos: Compromisso[]; // NOVO
  afazeres: Afazer[];
  periodoAtivoId: string | null;
};

type Periodo = {
  id: string;
  nome: string; // ex: "2026.1"
  dataInicio?: string; // YYYY-MM-DD — define vigência do período
  dataFim?: string;    // YYYY-MM-DD
};

type Cadeira = {
  id: string;
  periodoId: string;
  nome: string;
  cor: string; // hex livre (#RRGGBB), escolhido via seletor de cor
  horarios: Horario[];
  links: LinkItem[];
  datas: DataImportante[];
};

type Horario = {
  id: string;
  dia: number; // 0 (Segunda) a 6 (Domingo) conforme DIAS_FULL
  inicio: string; // HH:MM (ex: "08:00")
  fim: string; // HH:MM (ex: "10:00")
  local?: string; // ex: "Bloco A - Sala 102"
};

type LinkItem = {
  id: string;
  titulo: string;
  url: string;
  isClassroom?: boolean;     // true quando o item é um código de turma, não um link
  codigoClassroom?: string;  // preenchido quando isClassroom === true
};

type DataImportante = {
  id: string;
  titulo: string;
  data: string; // YYYY-MM-DD
  hora?: string; // HH:MM
};

// NOVO — compromisso avulso, independente de período/faculdade,
// com recorrência semanal (mesma estrutura de Horario que Cadeira usa).
// Não tem "datas importantes" nem "links" — só nome, cor e horários.
type Compromisso = {
  id: string;
  nome: string;
  cor: string; // hex livre (#RRGGBB)
  horarios: Horario[];
  periodoId: string; // OBRIGATÓRIO — todo compromisso pertence a exatamente um período (igual cadeira)
};

type Afazer = {
  id: string;
  nome: string;
  data?: string;   // YYYY-MM-DD — opcional; se definida, o afazer entra no calendário geral
  hora?: string;   // HH:MM — opcional, só faz sentido se `data` estiver preenchida
  rotina: Rotina;
  urgencia: 1 | 2 | 3; // exibida como "bateria" de barrinhas em cor flamejante
  feito: boolean;
  cor?: string; // hex livre, escolhido no formulário; fallback "#221e1e" se ausente
};

type Rotina = {
  tipo: "nenhuma" | "diaria" | "semanal" | "quinzenal" | "mensal" | "personalizada";
  intervaloDias?: number; // usado apenas quando tipo === "personalizada"
};
```

**Nota sobre `periodoAtivoId` e vigência (`dataInicio`/`dataFim`):** são conceitos independentes. `periodoAtivoId` controla qual período está selecionado no seletor de período/telas de Cadeiras/Agenda. `dataInicio`/`dataFim` servem só para o cálculo de `cadeiraEstaAtivaNaData()` na Visão Geral — decidir se as aulas de uma cadeira devem "aparecer" projetadas num dia do calendário fora do intervalo do período. Se o período não tiver essas datas definidas, a cadeira é considerada sempre ativa (sem filtro). **Compromissos não têm vigência** (`dataInicio`/`dataFim`), mas **pertencem obrigatoriamente a um único período** via `periodoId` (mesmo modelo de `Cadeira.periodoId`). Um compromisso só é exibido na Agenda da semana e na Visão Geral quando `periodoId` for igual ao `periodoAtivoId` corrente. Essa filtragem é feita em `App.jsx` (`compromissosDoPeriodo = compromissos.filter(c => c.periodoId === periodoAtivo?.id)`), e a própria tela de gerenciamento `VisaoCompromissos` também usa essa lista filtrada — ou seja, só é possível ver/criar/editar compromissos do período atualmente selecionado, exatamente como já acontecia com Cadeiras.

---

## 4. Estrutura de Arquivos e Padrão de Exportações
Todos os componentes utilitários e UI utilizam `export default` (exceto os hooks de calendário e `utils/calendario.js`, que usam **named exports** — ver abaixo).

```
├── index.html                     # PWA: meta tags iOS, theme-color, ícone
├── vite.config.js                 # plugin react() + VitePWA() (manifest, ícones, service worker)
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-maskable-512.png
src/
├── main.jsx                       # Renderiza o App e importa styles/app.css
├── App.jsx                        # Estado global, ações CRUD (períodos, cadeiras, compromissos, afazeres), backup export/import (export default)
├── firebase.js                    # config Firebase, auth Google restrita, exports db/auth/login/logout
├── constants.js                   # CORES, DIAS, DIAS_FULL, HORA_INICIO, HORA_FIM, STORAGE_KEY,
│                                   # SIDEBAR_STATE_KEY (não usado mais — sidebar não tem mais seção colapsável),
│                                   # ROTINA_OPCOES, URGENCIA_CORES, URGENCIA_LABELS
├── styles/
│   └── app.css                    # Estilos globais completos (ver Seção 6)
├── utils/
│   ├── id.js                      # export function uid()
│   ├── formatarData.js            # export function formatarData(dataStr)
│   ├── data.js                    # export function dadosVazios() -> AppData inicial (com compromissos: [], afazeres: [])
│   ├── afazeres.js                # export function ocorrenciasNoIntervalo(afazer, inicioISO, fimISO)
│   │                               #        export function toISO(date), parseISO(iso)
│   └── calendario.js               # named exports:
│                                   #   NOME_MESES (array)
│                                   #   getIntervaloMes(ano, mes) -> { primeiroDia, ultimoDia, inicioISO, fimISO }
│                                   #   gerarCelulasMes(ano, mes) -> array de dias (null = célula vazia de padding)
│                                   #   cadeiraEstaAtivaNaData(cadeira, dataISO, periodos) -> boolean
│                                   #     (reaproveitada para compromissos: como eles não têm periodoId,
│                                   #      a função sempre retorna true para eles — sem precisar de variante própria)
├── hooks/
│   ├── usePersistedData.js        # export default -> { data, persist, status, user, loginWithGoogle, logout }
│   ├── useFiltrosCalendario.js    # named export useFiltrosCalendario() -> { filtros, alternarFiltro }
│   │                               #   persiste em localStorage "painel-academico-filtros-calendario"
│   │                               #   filtros: { aulas, avaliacoes, compromissos, afazeres } — merge com
│   │                               #   padrão garante que usuários antigos ganhem "compromissos: true" de graça
│   └── useEventosCalendario.js    # named export useEventosCalendario({ cadeiras, compromissos, afazeres, periodos, ano, mes, filtros })
│                                   #   -> mapa { "YYYY-MM-DD": Evento[] }, já ordenado por hora
└── components/
    ├── Sidebar.jsx                # Menu lateral: seletor de período (dropdown), navegação, backup, conta/login (export default)
    ├── VisaoCadeiras.jsx          # Grid de cadeiras do período ativo + edição de vigência do período (export default)
    ├── VisaoCompromissos.jsx      # NOVO — Grid de compromissos (cadastro só de nome; cor/horários se editam no painel) (export default)
    ├── VisaoAgenda.jsx            # Grade semanal de horários (cadeiras + compromissos, com filtro) + lista de próximas datas (export default)
    ├── VisaoAfazeres.jsx          # Aba "Afazeres": form (com seletor de cor hexa + edição) + lista com checkbox (export default)
    ├── VisaoGeral.jsx             # Aba "Visão Geral": calendário mensal com filtros (aulas/avaliações/compromissos/afazeres) (export default)
    ├── PainelCadeira.jsx          # Drawer lateral para editar detalhes da cadeira (export default)
    ├── PainelCompromisso.jsx      # NOVO — Drawer lateral para editar nome/cor/horários de um compromisso (export default)
    ├── abas/
    │   ├── AbaHorarios.jsx        # (export default) — reaproveitado por PainelCadeira E PainelCompromisso
    │   ├── AbaLinks.jsx           # (export default) — códigos de Classroom sempre listados antes dos links web
    │   └── AbaDatas.jsx           # (export default)
    └── ui/
        ├── EstadoVazio.jsx        # (export default)
        ├── ModalTexto.jsx         # (export default) — usado hoje só para "Novo período"
        ├── SeletorCor.jsx         # color-picker nativo (roda de cores) + campo de texto hexadecimal (export default)
        └── SeletorPeriodo.jsx     # NOVO — título grande clicável + dropdown de períodos (selecionar/renomear/excluir/criar);
                                    #   usado no lugar do <h1> em VisaoCadeiras.jsx (export default)
```

**Atenção em Importações:** componentes em `src/components/` usam `export default` (importar sem chaves). Os arquivos `utils/calendario.js`, `hooks/useFiltrosCalendario.js` e `hooks/useEventosCalendario.js` usam **named exports** (importar com chaves, ex: `import { useEventosCalendario } from "../hooks/useEventosCalendario.js"`).

---

## 5. Responsabilidade dos Componentes (atualizada)

### App.jsx
- Estado: `aba`, `cadeiraAbertaId`, `compromissoAbertoId` (**NOVO**), `modalPeriodo`.
- Ações de períodos: `selecionarPeriodo`, `criarPeriodo`, `atualizarPeriodo` (patch genérico no período, usado tanto para nome quanto para `dataInicio`/`dataFim`), `excluirPeriodo`.
- Ações de cadeiras: `criarCadeira`, `atualizarCadeira`, `excluirCadeira`.
- **NOVO** — Ações de compromissos: `criarCompromisso(nome)` (exige `periodoAtivo`; atribui `periodoId: periodoAtivo.id` automaticamente — não cria compromisso sem período selecionado; cor auto-atribuída ciclando `CORES`, igual `criarCadeira`), `atualizarCompromisso(id, patch)`, `excluirCompromisso(id)` (com `window.confirm`).
- **NOVO** — deriva `compromissosDoPeriodo = compromissos.filter(c => c.periodoId === periodoAtivo?.id)` (correspondência exata, sem fallback para "sem período" — `periodoId` é obrigatório). É essa lista filtrada que vai para `VisaoAgenda`, `VisaoGeral` **e também** `VisaoCompromissos` — ou seja, a tela de gerenciamento de compromissos só mostra/cria/edita os do período atualmente selecionado, igual à tela de Cadeiras.
- **`excluirPeriodo` agora também remove em cascata os compromissos daquele período** (além das cadeiras), já que todo compromisso pertence obrigatoriamente a um período.
- Ações de afazeres: `criarAfazer`, `atualizarAfazer` (passado para `VisaoAfazeres` como prop `onEditar`), `alternarFeitoAfazer`, `excluirAfazer`, `limparAfazeresConcluidos`.
- `exportarBackup`, `importarBackup` (ver Seção 2.2, agora inclui `compromissos`).
- Repassa `user`, `loginWithGoogle`, `logout` (vindos de `usePersistedData`) para a `Sidebar`. **A `Sidebar` não recebe mais nada relacionado a período** (`data`, `periodoAtivo`, `onSelecionarPeriodo`, `onNovoPeriodo`, `onAtualizarPeriodo`, `onExcluirPeriodo`) — essas props agora vão para `VisaoCadeiras`, que é quem renderiza o seletor de período.
- Roteamento de `aba`: `afazeres` → `visaogeral` → guarda `!periodoAtivo` → `compromissos` → `cadeiras` → `agenda`. A aba "compromissos" fica **depois** da checagem de período vazio (junto com "cadeiras"), já que agora todo compromisso exige um período selecionado — sem período ativo, a tela mostra o mesmo `EstadoVazio` "Crie um período para começar" que a aba Cadeiras usaria.
- Renderiza `<PainelCompromisso>` (**NOVO**) condicionalmente, igual ao `<PainelCadeira>`.

### Sidebar.jsx *(simplificado)*
- **O seletor de período saiu da Sidebar.** A antiga seção expansível "Período(s)" e, depois, o dropdown de período no topo da Sidebar foram removidos — o seletor agora vive no título da própria tela de Cadeiras (ver `VisaoCadeiras.jsx`/`SeletorPeriodo.jsx` abaixo). A Sidebar não recebe mais `data`, `periodoAtivo`, `onSelecionarPeriodo`, `onNovoPeriodo`, `onAtualizarPeriodo` nem `onExcluirPeriodo`.
- Com isso, a seção **"Visão"** volta a ser o primeiro bloco visível logo abaixo do logo, ganhando o espaço vertical que antes era ocupado pelo seletor de período.
- Seção **"Visão"**: Cadeiras / Compromissos / Afazeres / Agenda da semana.
- Seção **"Visão geral"**: Calendário geral — inalterado.
- Seção **"Backup"**: botões "Exportar dados" e "Importar dados" — inalterado.
- Rodapé (`status-footer`) de conta/nuvem/status — inalterado.
- Botão hambúrguer mobile (`.mobile-menu-btn`) — inalterado.

### VisaoCadeiras.jsx *(seletor de período movido para cá)*
- **NOVO:** o `<h1 className="titulo-pagina">{periodoAtivo.nome}</h1>` foi substituído por `<SeletorPeriodo>` (ver `components/ui/SeletorPeriodo.jsx`) — o próprio título grande da página agora é clicável e abre um dropdown com a lista de períodos (selecionar, renomear inline, excluir, criar novo). Recebe as props `periodos`, `onSelecionarPeriodo`, `onNovoPeriodo`, `onAtualizarPeriodo`, `onExcluirPeriodo` (antes vivas em `Sidebar.jsx`).
  - O bug antigo do `onEditarPeriodo` (prop nunca repassada por `App.jsx`) continua corrigido: `App.jsx` e `SeletorPeriodo.jsx` usam consistentemente `onAtualizarPeriodo`.
- Resto da tela (bloco de vigência do período, formulário de nova cadeira, grid de cards) sem mudanças estruturais.

### components/ui/SeletorPeriodo.jsx *(novo)*
- Componente extraído da antiga lógica de dropdown de período da Sidebar, agora reutilizável fora dela. Props: `periodos`, `periodoAtivo`, `onSelecionar`, `onNovo`, `onAtualizar` (rename), `onExcluir`.
- Renderiza um botão com o nome do período ativo em estilo de título de página (reaproveita a classe `.titulo-pagina`, agora genérica — deixou de exigir a tag `h1`) + chevron; ao clicar, abre `.periodo-dropdown` com a lista completa de períodos, cada um com edição inline (lápis → input + check/x) e exclusão, mais um botão "+" para criar um novo período. Um `.click-fora-overlay` fecha o dropdown ao clicar fora, mesmo padrão usado em outros popups do app.
- Estilizado via a classe modificadora `.periodo-seletor-titulo` em `app.css`, que remove o fundo/borda "de bloco de sidebar" e deixa o botão com a cara de título inline (fundo transparente, padding menor, largura automática).

### VisaoCompromissos.jsx
- **Agora escopada ao período ativo, igual `VisaoCadeiras`**: recebe `periodoAtivo` e a lista já filtrada `compromissosDoPeriodo` — só mostra, cria e edita compromissos do período selecionado no momento. O contador no cabeçalho mostra "N compromissos em {nome do período}".
- Formulário de cadastro continua só com o nome; `periodoId` é atribuído automaticamente ao período ativo em `App.jsx` no momento da criação (não é possível criar um compromisso sem período selecionado — `criarCompromisso` simplesmente não faz nada se `periodoAtivo` for `null`).
- A cor é atribuída automaticamente ao criar (igual cadeira) e pode ser trocada depois no painel; o período também pode ser trocado depois (reatribuído a outro período existente) via `PainelCompromisso`, mas nunca removido/deixado vazio.

### VisaoAgenda.jsx *(atualizado)*
- Agora recebe também `compromissos` (além de `cadeiras`) e monta os blocos da grade semanal combinando horários de ambos, cada bloco marcado com `tipo: "cadeira" | "compromisso"`.
- **NOVO:** dois filtros (`filtro-chip`) no topo — "Cadeiras" e "Compromissos" — que ligam/desligam cada fonte na grade. Estado persistido em `localStorage` (`"painel-academico-filtros-agenda"`), seguindo o mesmo padrão de `useFiltrosCalendario`.
- Clique num bloco da grade abre o painel correto: `onAbrirCadeira(id)` para blocos de cadeira, `onAbrirCompromisso(id)` para blocos de compromisso (props renomeadas de `onAbrir` para deixar explícito qual painel cada clique abre).
- "Próximas datas importantes" continua exclusiva de Cadeiras (compromissos não têm `datas`), sem filtro adicional.
- **NOVO:** a prop `compromissos` que `App.jsx` repassa para esta tela já vem pré-filtrada por período (`compromissosDoPeriodo` — ver Seção 3); `VisaoAgenda.jsx` não precisa saber nada sobre `periodoId`, só recebe a lista já certa.

### VisaoAfazeres.jsx
- **Seletor de cor trocado**: em vez da paleta fixa de círculos (`CORES`), o formulário agora usa `<SeletorCor>` — um `<input type="color">` nativo (roda de cores do sistema) acoplado a um campo de texto para digitar/colar o hexadecimal direto. Cor padrão de um afazer novo continua `"#221e1e"` (mesmo hex que a paleta antiga usava no índice 6), então nenhum dado existente muda de aparência.
- Resto do comportamento (edição, urgência, rotina, apagar concluídos) inalterado.

### VisaoGeral.jsx
- Recebe também `compromissos` (prop nova, já filtrada por `periodoId` em `App.jsx` — ver Seção 3) e passa para `useEventosCalendario`.
- Filtro/chip "Compromissos" na linha de filtros do calendário, ao lado de Aulas/Avaliações/Afazeres.
- **NOVO:** `diaSelecionado` agora inicia com o dia de hoje (`toISO(new Date())`) em vez de `null`, então o calendário já abre com o dia atual selecionado e o painel de detalhes ("Eventos em ...") preenchido — antes era preciso clicar manualmente no dia. Trocar de mês (`irMesAnterior`/`irProximoMes`) continua limpando a seleção (`setDiaSelecionado(null)`), já que o dia de hoje pode não existir no mês visível.

### PainelCadeira.jsx
- **Bug de duplicata corrigido:** antes, o painel não passava a prop `onEditar` para `AbaHorarios`/`AbaLinks`/`AbaDatas`, então editar um item caía no fallback `onRemover(id); onAdd(novo)` dentro da própria Aba — e como as duas chamadas aconteciam no mesmo ciclo de render (mesmo `cadeira.links` "congelado" nas duas), o `onAdd` recriava o item a partir do array **anterior à remoção**, resultando em duplicata (o item antigo continuava lá e um novo era criado). Agora `PainelCadeira.jsx` define `editHorario`, `editLink`, `editData` — cada um faz um único `.map()` substituindo o item pelo `id` (edição atômica, sem passar por remove+add) — e os passa como `onEditar` para as três Abas.
- **Seletor de cor trocado**: a antiga paleta com scroll lateral (`.painel-cores`/`.cor-swatch`) foi substituída por `<SeletorCor>`, mesmo componente usado em Afazeres e Compromissos.
- Resto do painel (edição de nome inline, abas, exclusão) inalterado.

### PainelCompromisso.jsx
- Drawer lateral no mesmo estilo visual de `PainelCadeira` (`.overlay` + `.painel-lateral`): cabeçalho com nome editável inline + excluir + fechar, `<SeletorCor>` para a cor, e diretamente a aba de Horários (reaproveita `AbaHorarios.jsx` sem sub-abas, já que compromissos não têm links nem datas importantes).
- `editHorario` já nasce correto (`.map()` atômico), sem o bug de duplicata que existia em `PainelCadeira`.
- Recebe também `periodos` e renderiza um `<select>` **"Período (obrigatório)"** logo abaixo do seletor de cor, listando só os períodos existentes — **sem** opção de "nenhum/todos os períodos"; o `onChange` ignora seleção vazia, então não há como deixar o compromisso sem período pela UI. Um texto auxiliar abaixo do select lembra que o compromisso só aparece na agenda/calendário quando aquele período estiver ativo. Muda via `onAtualizar({ periodoId })`.

### abas/AbaHorarios.jsx / AbaDatas.jsx
- Sem mudanças de comportamento — já tinham confirmação de exclusão (`window.confirm`) implementada em rodada anterior. `AbaHorarios` agora também é usado por `PainelCompromisso.jsx`, então precisa continuar agnóstica sobre o "dono" do horário (cadeira ou compromisso) — e já era, pois só recebe `horarios`/`onAdd`/`onRemover`/`onEditar` via props.

### abas/AbaLinks.jsx
- **NOVO:** a lista de links agora é ordenada (`[...links].sort(...)`) para que itens com `isClassroom`/`codigoClassroom` sempre apareçam **antes** dos links web comuns, preservando a ordem relativa dentro de cada grupo. Continua com confirmação de exclusão em ambos os tipos de item.

### components/ui/SeletorCor.jsx *(novo)*
- Componente controlado reutilizável: `<SeletorCor valor={hex} onChange={fn} label={opcional} />`.
- Renderiza um `<input type="color">` (abre a roda de cores nativa do sistema/navegador) lado a lado com um `<input type="text">` para o hexadecimal, sincronizados nos dois sentidos. Valida o formato `#RRGGBB` antes de propagar `onChange`; enquanto o texto digitado é inválido, mantém o valor anterior no color-picker e só "trava" (reverte visualmente) o campo de texto ao perder o foco (`onBlur`).
- Usado em `PainelCadeira.jsx`, `VisaoAfazeres.jsx` (formulário de afazer) e `PainelCompromisso.jsx`.

---

## 6. Mapeamento Estrito do CSS (`app.css`) — adições desta rodada

| Elemento / Componente | Classe CSS | Notas |
|---|---|---|
| Título de página (genérico) | `.titulo-pagina` | Deixou de exigir a tag `h1` (era `h1.titulo-pagina`) — agora também é usada num `<span>` dentro do botão de `SeletorPeriodo` |
| Botão do seletor de período | `.periodo-seletor-btn` | Base compartilhada; visual "de bloco" (fundo/borda) |
| Variante do seletor de período como título de página | `.periodo-seletor-titulo` | Aplicada em `SeletorPeriodo.jsx` quando usado em `VisaoCadeiras.jsx`: remove fundo/borda do botão, deixa largura automática e o dropdown alinhado à esquerda com largura fixa (`260px`) em vez de esticar 100% |
| Nome do período dentro do botão | `.periodo-seletor-nome` | Trunca com `text-overflow: ellipsis` |
| Container do dropdown de períodos | `.periodo-dropdown` | Posicionado `absolute` abaixo do botão, com sombra |
| Overlay transparente pra fechar dropdown ao clicar fora | `.click-fora-overlay` | `position: fixed; inset: 0;` transparente, `z-index` abaixo do dropdown |
| Wrapper geral do seletor de período | `.periodo-seletor-wrap` | `position: relative`, ancora o dropdown |
| Linha do seletor de cor (swatch + hex) | `.seletor-cor-linha` | Usado dentro de `SeletorCor.jsx` |
| Input nativo de cor estilizado como quadrado | `.seletor-cor-swatch` | `input[type=color]`, cantos arredondados via pseudo-elementos webkit/moz |
| Campo de texto do hexadecimal | `.seletor-cor-hex` | Fonte monoespaçada, largura reduzida |

As classes já documentadas em rodadas anteriores (`.filtros-linha`, `.filtro-chip`, `.calendario-*`, `.agenda-*`, `.item-afazer`, `.card-cadeira`/`.grid-cadeiras` — agora **reaproveitadas por `VisaoCompromissos.jsx`** sem CSS novo — `.mobile-menu-btn`, `.sidebar-scrim`, etc.) continuam válidas.

**Removidas em rodadas anteriores** (não são mais usadas): `.periodos-secao.recolhida`, `.painel-cores`, `.painel-cores::-webkit-scrollbar*`, `.cor-swatch`/`.cor-swatch:hover` — substituídas pelo seletor de cor hexadecimal.

Breakpoint mobile: `@media (max-width: 860px)` — inalterado; o dropdown de período (agora no título da tela de Cadeiras, não mais na sidebar) continua abrindo normalmente em telas pequenas.

---

## 7. Regras de Ouro para Alterações / Novas Funcionalidades

1. **Padrão de Import/Export:** componentes React usam `export default`; `utils/calendario.js` e os hooks de calendário usam **named exports** — não confundir ao importar.
2. **Imutabilidade do Estado:** todas as alterações em arrays (`periodos`, `cadeiras`, `compromissos`, `horarios`, `links`, `datas`, `afazeres`) devem passar por `persist({...data})`.
3. **`persist()` tem dois destinos:** local (`localStorage`, sempre) e nuvem (Firestore, só se `user` estiver definido). Qualquer novo fluxo de escrita de dados **precisa** passar por `persist()` do hook — nunca escrever direto em `localStorage` ou `Firestore` em outro lugar, pra não quebrar a sincronização.
4. **Login restrito a um único e-mail:** `EMAIL_PERMITIDO` em `firebase.js`. Se o projeto crescer para mais de um usuário, essa trava (hoje client-side) precisa virar regra de negócio no backend/Firestore Rules — hoje é só uma camada de conveniência, não uma segurança forte sozinha.
5. **Cascatas de Exclusão:** excluir período remove cadeiras **e compromissos** associados a ele (compromissos deixaram de ser independentes de período); excluir cadeira limpa `cadeiraAbertaId` se for a aberta; excluir compromisso limpa `compromissoAbertoId` se for o aberto (e a exclusão em cascata de período também limpa `compromissoAbertoId` se o compromisso aberto era de um período excluído). Afazeres continuam totalmente independentes (sem cascata de/para nenhuma outra entidade).
6. **Afazeres sem data não aparecem no calendário** — regra mantida. **Todo compromisso pertence a exatamente um período (`periodoId` obrigatório, igual `Cadeira.periodoId`)** e só aparece na Agenda semanal, na Visão Geral e na própria tela de gerenciamento (`VisaoCompromissos`) quando aquele período for o `periodoAtivoId` corrente — não existe mais o conceito de compromisso "de todos os períodos".
7. **Recorrência calculada sob demanda** via `ocorrenciasNoIntervalo()` (afazeres) e projeção dia-a-dia dentro de `useEventosCalendario` (cadeiras/compromissos) — nunca persistir ocorrências futuras.
8. **Exclusão em massa/individual exige `window.confirm`** — padrão mantido para `limparAfazeresConcluidos`, `excluirPeriodo`, `excluirCadeira`, `excluirCompromisso`, `importarBackup`, e também nas exclusões unitárias de horário/link/data/afazer dentro das Abas (implementado em rodada anterior).
9. **Vigência de período (`dataInicio`/`dataFim`) é opcional e exclusiva de Cadeira** — qualquer novo cálculo de "a cadeira está ativa nesse dia" deve usar `cadeiraEstaAtivaNaData()` em vez de reimplementar a checagem. **Compromissos têm `periodoId` (obrigatório) mas não têm `dataInicio`/`dataFim`**, então nunca passam por `cadeiraEstaAtivaNaData()` — a filtragem deles é uma simples igualdade `periodoId === periodoAtivo?.id`, feita em `App.jsx`.
10. **PWA/offline:** o app deve continuar funcionando 100% a partir do `localStorage` mesmo sem rede — qualquer nova feature de nuvem deve ter fallback local gracioso (seguir o padrão de try/catch + `status: "error"` já usado em `usePersistedData`).
11. **Edição de itens em listas (horários, links, datas) deve sempre usar `.map()` substituindo pelo `id`** — nunca "remover + adicionar" em duas chamadas separadas de `onAtualizar`, pois ambas fecham sobre o mesmo array desatualizado no mesmo ciclo de render e causam duplicata (bug corrigido nesta rodada em `PainelCadeira.jsx`; `PainelCompromisso.jsx` já nasceu seguindo essa regra).
12. **Cores são sempre hexadecimais livres (`#RRGGBB`), nunca mais uma paleta fixa fechada** — usar sempre `<SeletorCor>` para qualquer novo campo de cor editável pelo usuário. Cores já existentes nos dados atuais (cadeiras, compromissos, afazeres criados antes desta mudança) continuam com o hex que já tinham; a troca foi só na UI de seleção, não nos dados.
13. **Deploy (Vercel):** sem `vercel.json` necessário (Vite detectado automaticamente). Variáveis do Firebase estão hardcoded em `firebase.js` (não usam `import.meta.env`) — funcionam em qualquer ambiente sem configuração extra na Vercel, mas isso significa que **trocar de projeto Firebase exige editar o código-fonte**, não só variáveis de ambiente.
14. **A Visão Geral sempre abre com o dia de hoje selecionado** (`diaSelecionado` inicializado com `toISO(new Date())` em vez de `null`). Qualquer navegação de mês limpa a seleção (`setDiaSelecionado(null)`) — não tenta re-selecionar "hoje" ao voltar pro mês atual, o usuário clica de novo se quiser.