# Contexto do Projeto: Minha Agenda Pessoal (Cadeiras, Afazeres & Agenda)

## 1. Visão Geral do Projeto
Aplicação web React (SPA) para organização pessoal e acadêmica. Permite ao usuário gerenciar **Períodos** (ex: 2026.1, 2026.2) e suas **Cadeiras** (disciplinas), com horários de aula, links/materiais e datas importantes (provas/trabalhos) — e também **Afazeres** avulsos, não necessariamente ligados à faculdade, com recorrência, urgência e cor própria. Uma **Visão Geral** cruza tudo isso num calendário mensal filtrável e interativo.

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

### 2.1. `usePersistedData.js` (reescrito para nuvem)
Retorna: `{ data, persist, status, user, loginWithGoogle, logout }`.

Lógica:
1. Escuta `onAuthStateChanged`: se **não logado**, carrega e persiste em `localStorage` (`STORAGE_KEY`) normalmente, com `DADOS_PADRAO` local (duplicado do que `utils/data.js` também define — ver observação na Seção 6).
2. Se **logado**, assina `onSnapshot(doc(db, "users", user.uid))` em tempo real: qualquer alteração no Firestore (de qualquer dispositivo logado com essa conta) atualiza a tela automaticamente. Se o documento não existir ainda, cria a partir do que tinha no `localStorage` (migração automática no primeiro login).
3. `persist(next)`: sempre atualiza o estado local imediatamente; se logado, grava no Firestore (`setDoc`); senão, grava no `localStorage`.
4. `status`: `"loading" | "saving" | "saved" | "error"`.

**Efeito prático para o usuário:** dados só sincronizam entre dispositivos **depois de fazer login com a conta Google permitida** em cada um deles. Sem login, cada navegador/dispositivo continua isolado em seu próprio `localStorage` (mesmo comportamento de antes).

### 2.2. Backup manual (`exportarBackup` / `importarBackup`, em `App.jsx`)
Independente da nuvem — funciona sempre, logado ou não:
- **Exportar dados**: baixa um `.json` com todo o `data` atual (nome do arquivo `agenda-backup-YYYY-MM-DD.json`).
- **Importar dados**: lê um `.json`, valida se tem `periodos` (array), pede confirmação (`window.confirm`) porque **substitui tudo**, e chama `persist(...)`.
- Botões ficam na Sidebar, seção "Backup" (ver Seção 4).

---

## 3. Modelo de Dados & Tipagem (TypeScript Spec)

```typescript
type AppData = {
  periodos: Periodo[];
  cadeiras: Cadeira[];
  afazeres: Afazer[];
  periodoAtivoId: string | null;
};

type Periodo = {
  id: string;
  nome: string; // ex: "2026.1"
  dataInicio?: string; // YYYY-MM-DD — NOVO: define vigência do período
  dataFim?: string;    // YYYY-MM-DD — NOVO
};

type Cadeira = {
  id: string;
  periodoId: string;
  nome: string;
  cor: string; // Hex color da paleta CORES
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
};

type DataImportante = {
  id: string;
  titulo: string;
  data: string; // YYYY-MM-DD
  hora?: string; // HH:MM
};

type Afazer = {
  id: string;
  nome: string;
  data?: string;   // YYYY-MM-DD — opcional; se definida, o afazer entra no calendário geral
  hora?: string;   // HH:MM — opcional, só faz sentido se `data` estiver preenchida
  rotina: Rotina;
  urgencia: 1 | 2 | 3; // exibida como "bateria" de barrinhas em cor flamejante
  feito: boolean;
  cor?: string; // NOVO — hex da paleta CORES, escolhido no formulário; fallback "#8b5cf6" se ausente
};

type Rotina = {
  tipo: "nenhuma" | "diaria" | "semanal" | "quinzenal" | "mensal" | "personalizada";
  intervaloDias?: number; // usado apenas quando tipo === "personalizada"
};
```

**Nota sobre `periodoAtivoId` e vigência (`dataInicio`/`dataFim`):** são conceitos independentes. `periodoAtivoId` controla qual período está selecionado na Sidebar/telas de Cadeiras/Agenda. `dataInicio`/`dataFim` (novo) servem só para o cálculo de `cadeiraEstaAtivaNaData()` na Visão Geral — decidir se as aulas de uma cadeira devem "aparecer" projetadas num dia do calendário fora do intervalo do período. Se o período não tiver essas datas definidas, a cadeira é considerada sempre ativa (sem filtro).

---

## 4. Estrutura de Arquivos e Padrão de Exportações
Todos os componentes utilitários e UI utilizam `export default` (exceto os novos hooks de calendário e `utils/calendario.js`, que usam **named exports** — ver abaixo).

```
├── index.html                     # PWA: meta tags iOS, theme-color, ícone
├── vite.config.js                 # plugin react() + VitePWA() (manifest, ícones, service worker)
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-maskable-512.png
src/
├── main.jsx                       # Renderiza o App e importa styles/app.css
├── App.jsx                        # Estado global, ações CRUD, backup export/import (export default)
├── firebase.js                    # NOVO: config Firebase, auth Google restrita, exports db/auth/login/logout
├── constants.js                   # CORES, DIAS, DIAS_FULL, HORA_INICIO, HORA_FIM, STORAGE_KEY,
│                                   # SIDEBAR_STATE_KEY, ROTINA_OPCOES, URGENCIA_CORES, URGENCIA_LABELS
├── styles/
│   └── app.css                    # Estilos globais completos (ver Seção 5)
├── utils/
│   ├── id.js                      # export function uid()
│   ├── formatarData.js            # export function formatarData(dataStr)
│   ├── data.js                    # export function dadosVazios() -> AppData inicial (com afazeres: [])
│   ├── afazeres.js                # export function ocorrenciasNoIntervalo(afazer, inicioISO, fimISO)
│   │                               #        export function toISO(date), parseISO(iso)
│   └── calendario.js              # NOVO — named exports:
│                                   #   NOME_MESES (array)
│                                   #   getIntervaloMes(ano, mes) -> { primeiroDia, ultimoDia, inicioISO, fimISO }
│                                   #   gerarCelulasMes(ano, mes) -> array de dias (null = célula vazia de padding)
│                                   #   cadeiraEstaAtivaNaData(cadeira, dataISO, periodos) -> boolean
├── hooks/
│   ├── usePersistedData.js        # export default -> { data, persist, status, user, loginWithGoogle, logout }
│   ├── useFiltrosCalendario.js    # NOVO — named export useFiltrosCalendario() -> { filtros, alternarFiltro }
│   │                               #   persiste em localStorage "painel-academico-filtros-calendario"
│   └── useEventosCalendario.js    # NOVO — named export useEventosCalendario({ cadeiras, afazeres, periodos, ano, mes, filtros })
│                                   #   -> mapa { "YYYY-MM-DD": Evento[] }, já ordenado por hora
└── components/
    ├── Sidebar.jsx                # Menu lateral: períodos, navegação, backup, conta/login (export default)
    ├── VisaoCadeiras.jsx          # Grid de cadeiras do período ativo + edição de vigência do período (export default)
    ├── VisaoAgenda.jsx            # Grade semanal de horários + lista de próximas datas (export default)
    ├── VisaoAfazeres.jsx          # Aba "Afazeres": form (com cor + edição) + lista com checkbox (export default)
    ├── VisaoGeral.jsx             # Aba "Visão Geral": calendário mensal com filtros (agora usa os hooks de calendário) (export default)
    ├── PainelCadeira.jsx          # Drawer lateral para editar detalhes da cadeira (export default) — inalterado
    ├── abas/
    │   ├── AbaHorarios.jsx        # (export default) — inalterado
    │   ├── AbaLinks.jsx           # (export default) — inalterado
    │   └── AbaDatas.jsx           # (export default) — inalterado
    └── ui/
        ├── EstadoVazio.jsx        # (export default) — inalterado
        └── ModalTexto.jsx         # (export default) — usado hoje só para "Novo período"
```

**Atenção em Importações:** componentes em `src/components/` usam `export default` (importar sem chaves). Os novos arquivos `utils/calendario.js`, `hooks/useFiltrosCalendario.js` e `hooks/useEventosCalendario.js` usam **named exports** (importar com chaves, ex: `import { useEventosCalendario } from "../hooks/useEventosCalendario.js"`).

---

## 5. Responsabilidade dos Componentes (atualizada)

### App.jsx
- Estado: `aba`, `cadeiraAbertaId`, `modalPeriodo` — **`editandoPeriodoId` foi removido**; a renomeação de período agora é feita **inline na própria Sidebar**, não mais via `ModalTexto`.
- Ações de períodos: `selecionarPeriodo`, `criarPeriodo`, `atualizarPeriodo` (novo — faz patch genérico no período, usado tanto para nome quanto para `dataInicio`/`dataFim`), `excluirPeriodo`.
- Ações de cadeiras: `criarCadeira`, `atualizarCadeira`, `excluirCadeira` — inalteradas.
- Ações de afazeres: `criarAfazer`, `atualizarAfazer` (passado para `VisaoAfazeres` como prop `onEditar`, usado para edição via formulário, não só patches simples), `alternarFeitoAfazer`, `excluirAfazer`, `limparAfazeresConcluidos`.
- **NOVO:** `exportarBackup`, `importarBackup` (ver Seção 2.2).
- Repassa `user`, `loginWithGoogle`, `logout` (vindos de `usePersistedData`) para a `Sidebar`.

### Sidebar.jsx
- Seção **"Período(s)"**: recolhível (inalterado). **Renomeação agora é inline**: clique no lápis (`Edit2`) troca a linha por um `input` editável com botões de confirmar (`Check`)/cancelar (`X`), via estados locais `editandoId`/`nomeTemp` e função `salvarEdicaoInline`.

  > ⚠️ **Bug conhecido:** `salvarEdicaoInline` chama a prop `onEditarPeriodo`, mas `App.jsx` **não passa mais essa prop** para `<Sidebar>` (só `onAtualizarPeriodo`). Resultado: hoje, renomear um período pelo lápis da Sidebar **não salva** — só fecha o campo de edição silenciosamente. Corrigir exigiria renomear a prop recebida em `Sidebar.jsx` de `onEditarPeriodo` para `onAtualizarPeriodo` (chamando `onAtualizarPeriodo(id, { nome })`), OU passar `onEditarPeriodo={atualizarPeriodo}` a partir de `App.jsx`.

- Seção **"Visão"**: Cadeiras / Afazeres / Agenda da semana — inalterado.
- Seção **"Visão geral"**: Calendário geral — inalterado.
- **NOVO** Seção **"Backup"**: botões "Exportar dados" e "Importar dados" (input de arquivo oculto, `accept="application/json"`).
- **NOVO** Rodapé (`status-footer`) reestruturado, agora em coluna:
  - Se `user` existe: mostra foto (ou `logo-dot` como placeholder), nome/e-mail, botão de logout (`LogOut`).
  - Se não: botão "Entrar p/ Sincronizar" (`LogIn`), chama `loginWithGoogle`.
  - Abaixo, o indicador de status de salvamento (`status-dot`), agora com texto contextual: "Nuvem sincronizada" (logado + saved), "Salvo localmente" (deslogado + saved), "Salvando...", "Carregando...", "Erro ao salvar".
- Botão hambúrguer mobile (`.mobile-menu-btn`) — inalterado.

### VisaoCadeiras.jsx
- Grid de cards das cadeiras — inalterado.
- **NOVO:** bloco "Duração do período" no topo — dois `<input type="date">` (`dataInicio`/`dataFim`) com estado local (sincronizado via `useEffect` quando `periodoAtivo.id` muda) e botão "Salvar datas" que chama `onAtualizarPeriodo(periodoAtivo.id, { dataInicio, dataFim })`, com feedback visual temporário ("Salvo!" por 2s).

### VisaoAgenda.jsx
- Inalterado (grade semanal + próximas datas).

### VisaoAfazeres.jsx
- **NOVO:** seletor de **cor** no formulário (paleta `CORES`, círculos clicáveis) — todo afazer agora carrega um `cor` próprio (independente da cor de cadeiras).
- **NOVO:** suporte a **edição** de afazer existente: clicar no ícone de lápis (`Edit2`) na lista abre o mesmo formulário preenchido (`itemEmEdicao`), trocando o botão para "Salvar alterações" e liberando um botão de cancelar (`X`). Ao salvar, chama `onEditar(id, dados)` em vez de `onCriar`.
- Item da lista agora tem uma borda lateral (`borderLeft`) na cor do afazer.
- Resto do comportamento (ordenação, urgência, rotina, apagar concluídos) inalterado.

### VisaoGeral.jsx *(refatorado)*
- A lógica de cálculo de eventos foi **extraída para hooks reutilizáveis**: `useFiltrosCalendario()` (estado dos filtros + persistência em `localStorage`) e `useEventosCalendario(...)` (monta o mapa de eventos do mês). O componente ficou só com a parte visual.
- Recebe também `periodos` como prop (novo), usado para respeitar `dataInicio`/`dataFim` de cada período ao projetar aulas recorrentes (via `cadeiraEstaAtivaNaData`).
- Clique num dia agora **seleciona/deseleciona** (clique de novo no mesmo dia fecha os detalhes) e aplica destaque visual (`selecionada`, `hoje`, ou ambos) com `boxShadow`/`transform` inline.
- Lista de detalhes do dia mostra: faixa colorida, título, origem (`sala`/dia da semana para aulas, nome da cadeira para avaliações, "pendente"/"concluído" para afazeres) e horário.

### PainelCadeira.jsx / abas/* / ui/*
- Sem alterações estruturais nesta rodada.

### utils/calendario.js *(novo)*
- `getIntervaloMes(ano, mes)`: retorna início/fim do mês (Date e ISO).
- `gerarCelulasMes(ano, mes)`: array de células do grid (com `null` para padding antes do dia 1, considerando semana começando na segunda).
- `cadeiraEstaAtivaNaData(cadeira, dataISO, periodos)`: true se a cadeira deve aparecer nesse dia, checando `dataInicio`/`dataFim` do período correspondente.

### hooks/useEventosCalendario.js *(novo)*
- Combina 3 fontes de eventos para o mês visível, cada uma memoizada e condicionada ao filtro correspondente:
  1. **Avaliações** — `datas` de cada cadeira dentro do mês, respeitando vigência do período.
  2. **Aulas** — projeta `horarios` fixos de cada cadeira em todos os dias do mês que batem com o dia da semana, respeitando vigência do período.
  3. **Afazeres** — usa `ocorrenciasNoIntervalo()` para expandir recorrências dentro do mês.
- Retorna mapa `{ "YYYY-MM-DD": Evento[] }`, cada lista já ordenada por `hora`.

### hooks/useFiltrosCalendario.js *(novo)*
- Estado `{ aulas, avaliacoes, afazeres }` (todos `true` por padrão), persistido em `localStorage` sob a chave `"painel-academico-filtros-calendario"`.

---

## 6. Mapeamento Estrito do CSS (`app.css`) — adições desta rodada

| Elemento / Componente | Classe CSS | Notas |
|---|---|---|
| Seção de backup na Sidebar | `.backup-secao` | Agrupa os botões de exportar/importar |
| Rodapé de status/conta | `.status-footer` | Agora renderizado em coluna (`flexDirection: column` via `style` inline no JSX, não só CSS) para acomodar o bloco de login |
| Linha de filtros do calendário | `.filtros-linha` | Container dos `.filtro-chip` |
| Cabeçalho dos dias da semana (calendário) | `.calendario-dia-head` | Abreviação de 3 letras |
| Número do dia na célula | `.calendario-numero` | Estilo condicional inline (hoje = pílula verde; selecionado = destaque branco) |
| Bloco de detalhes do dia selecionado | `.proximas-datas` | Reaproveitado da Agenda, agora com `minHeight` fixo pra não "pular" o layout ao trocar de dia |
| Item de evento passado/concluído | `.data-item.passada` | Aplicado quando `ev.feito` é true (afazeres concluídos) |

As classes já documentadas na rodada anterior (`.painel-lateral`, `.chevron-btn`, `.urgencia-*`, `.item-afazer`, `.calendario-grid`, `.mobile-menu-btn`, `.sidebar-scrim`, etc.) continuam válidas e sem mudanças de contrato.

Breakpoint mobile: `@media (max-width: 860px)` — inalterado.

---

## 7. Regras de Ouro para Alterações / Novas Funcionalidades

1. **Padrão de Import/Export:** componentes React usam `export default`; os novos `utils/calendario.js` e hooks de calendário usam **named exports** — não confundir ao importar.
2. **Imutabilidade do Estado:** todas as alterações em arrays (`periodos`, `cadeiras`, `horarios`, `links`, `datas`, `afazeres`) devem passar por `persist({...data})`.
3. **`persist()` agora tem dois destinos:** local (`localStorage`, sempre) e nuvem (Firestore, só se `user` estiver definido). Qualquer novo fluxo de escrita de dados **precisa** passar por `persist()` do hook — nunca escrever direto em `localStorage` ou `Firestore` em outro lugar, pra não quebrar a sincronização.
4. **Login restrito a um único e-mail:** `EMAIL_PERMITIDO` em `firebase.js`. Se o projeto crescer para mais de um usuário, essa trava (hoje client-side) precisa virar regra de negócio no backend/Firestore Rules — hoje é só uma camada de conveniência, não uma segurança forte sozinha.
5. **Cascatas de Exclusão:** excluir período remove cadeiras associadas; excluir cadeira limpa `cadeiraAbertaId` se for a aberta. Afazeres continuam sem cascata (independentes).
6. **Afazeres sem data não aparecem no calendário** — regra mantida.
7. **Recorrência calculada sob demanda** via `ocorrenciasNoIntervalo()` — nunca persistir ocorrências futuras.
8. **Exclusão em massa exige `window.confirm`** — padrão mantido (`limparAfazeresConcluidos`, `excluirPeriodo`, `excluirCadeira`, e agora também `importarBackup`, que sobrescreve tudo).
9. **Vigência de período (`dataInicio`/`dataFim`) é opcional** — qualquer novo cálculo de "a cadeira está ativa nesse dia" deve usar `cadeiraEstaAtivaNaData()` em vez de reimplementar a checagem, para manter consistência entre Agenda semanal (que hoje **não** filtra por vigência) e Visão Geral (que filtra).
10. **PWA/offline:** o app deve continuar funcionando 100% a partir do `localStorage` mesmo sem rede — qualquer nova feature de nuvem deve ter fallback local gracioso (seguir o padrão de try/catch + `status: "error"` já usado em `usePersistedData`).
11. **Antes de mexer em `Sidebar.jsx`/`App.jsx` na parte de renomear período, corrigir o bug descrito na Seção 5** (prop `onEditarPeriodo` ausente).
12. **Deploy (Vercel):** sem `vercel.json` necessário (Vite detectado automaticamente). Variáveis do Firebase estão hardcoded em `firebase.js` (não usam `import.meta.env`) — funcionam em qualquer ambiente sem configuração extra na Vercel, mas isso significa que **trocar de projeto Firebase exige editar o código-fonte**, não só variáveis de ambiente.