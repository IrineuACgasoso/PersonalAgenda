# Contexto do Projeto: Minha Agenda Pessoal (Cadeiras, Afazeres & Agenda)

## 1. Visão Geral do Projeto
Aplicação web React (SPA) para organização pessoal e acadêmica. Permite ao usuário gerenciar **Períodos** (ex: 2026.1, 2026.2) e suas **Cadeiras** (disciplinas), com horários de aula, links/materiais e datas importantes (provas/trabalhos) — e também **Afazeres** avulsos, não necessariamente ligados à faculdade, com recorrência e nível de urgência. Uma **Visão Geral** cruza tudo isso num calendário mensal filtrável.

- **Tech Stack:** React 18, Lucide React (ícones), CSS puro (Dark Theme), Vite.
- **Tema Visual:** Dark mode (`#0f1115` fundo principal, `#15171c` cards/painéis, `#6366f1` accent/roxo).
- **Persistência:** `localStorage`, com debounce de 300ms (`usePersistedData`).
- **Responsividade:** layout adaptado para mobile (sidebar vira menu deslizante abaixo de 860px de largura).

---

## 2. Modelo de Dados & Tipagem (TypeScript Spec)

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

// NOVO: afazeres pessoais, independentes de cadeira/período
type Afazer = {
  id: string;
  nome: string;
  data?: string;   // YYYY-MM-DD — opcional; se definida, o afazer entra no calendário geral
  hora?: string;   // HH:MM — opcional, só faz sentido se `data` estiver preenchida
  rotina: Rotina;
  urgencia: 1 | 2 | 3; // exibida como "bateria" de barrinhas em cor flamejante
  feito: boolean;
};

type Rotina = {
  tipo: "nenhuma" | "diaria" | "semanal" | "quinzenal" | "mensal" | "personalizada";
  intervaloDias?: number; // usado apenas quando tipo === "personalizada"
};
```

---

## 3. Estrutura de Arquivos e Padrão de Exportações
Todos os componentes utilitários e UI utilizam `export default`:

```
src/
├── main.jsx                       # Renderiza o App e importa styles/app.css
├── App.jsx                        # Estado global, gerenciamento de modais e ações CRUD (export default)
├── constants.js                   # CORES, DIAS, DIAS_FULL, HORA_INICIO, HORA_FIM, STORAGE_KEY,
│                                   # SIDEBAR_STATE_KEY, ROTINA_OPCOES, URGENCIA_CORES, URGENCIA_LABELS
├── styles/
│   └── app.css                    # Estilos globais completos (inclui seções novas — ver Seção 5)
├── utils/
│   ├── id.js                      # export function uid()
│   ├── formatarData.js            # export function formatarData(dataStr)
│   ├── data.js                    # export function dadosVazios() -> AppData inicial (com afazeres: [])
│   └── afazeres.js                # NOVO: export function ocorrenciasNoIntervalo(afazer, inicioISO, fimISO)
│                                   #        export function toISO(date), parseISO(iso)
├── hooks/
│   └── usePersistedData.js        # export default function usePersistedData() -> { data, persist, status }
└── components/
    ├── Sidebar.jsx                # Menu lateral: períodos (recolhível), abas de Visão e Visão Geral (export default)
    ├── VisaoCadeiras.jsx          # Grid de cards com as cadeiras do período ativo (export default)
    ├── VisaoAgenda.jsx            # Grade semanal de horários + lista de próximas datas (export default)
    ├── VisaoAfazeres.jsx          # NOVO: aba "Afazeres" — form de criação + lista com checkbox (export default)
    ├── VisaoGeral.jsx             # NOVO: aba "Visão Geral" — calendário mensal com filtros (export default)
    ├── PainelCadeira.jsx          # Drawer lateral para editar detalhes da cadeira (export default)
    ├── abas/
    │   ├── AbaHorarios.jsx        # Sub-aba de horários dentro do painel (export default)
    │   ├── AbaLinks.jsx           # Sub-aba de links dentro do painel (export default)
    │   └── AbaDatas.jsx           # Sub-aba de datas dentro do painel (export default)
    └── ui/
        ├── EstadoVazio.jsx        # Tela de estado vazio genérica (export default)
        └── ModalTexto.jsx         # Modal simples de input de texto para criar/renomear período (export default)
```

**Atenção em Importações:** Todos os componentes em `src/components/` utilizam `export default`. Importá-los sem chaves (ex: `import VisaoAgenda from "./components/VisaoAgenda"`).

---

## 4. Responsabilidade dos Componentes

### App.jsx
- Mantém estado da aba ativa: `aba: "cadeiras" | "agenda" | "afazeres" | "visaogeral"`.
- Mantém `cadeiraAbertaId`, `modalPeriodo` (boolean) e `editandoPeriodoId`.
- Ações de períodos: `criarPeriodo`, `renomearPeriodo`, `excluirPeriodo`.
- Ações de cadeiras: `criarCadeira`, `atualizarCadeira`, `excluirCadeira`.
- **NOVO** — Ações de afazeres: `criarAfazer`, `atualizarAfazer`, `alternarFeitoAfazer`, `excluirAfazer`, `limparAfazeresConcluidos` (apaga em massa, com `window.confirm`, todos os afazeres com `feito: true`).
- As abas `"afazeres"` e `"visaogeral"` são renderizadas **fora** da checagem de `periodoAtivo`, pois não dependem de período (afazeres e a visão geral existem independentemente da faculdade).

### Sidebar.jsx
- Seção **"Período(s)"**: recolhível via botão de chevron (`>`) à esquerda do rótulo. Estado (`periodosAberto`) persistido em `localStorage` sob `SIDEBAR_STATE_KEY`. Quando recolhida, a lista de períodos some e o rótulo abrevia para "Período".
- Seção **"Visão"** (restrita ao período ativo, como antes): botões **Cadeiras**, **Afazeres** (novo, logo abaixo de Cadeiras) e **Agenda da semana**.
- Seção **"Visão geral"** (nova, abaixo de "Visão"): botão **Calendário geral**, que agrega dados de todos os períodos/cadeiras + afazeres.
- Indicador visual do status de persistência (`saved`/`saving`/`error`) no rodapé.
- **NOVO (mobile)**: botão hambúrguer fixo (`.mobile-menu-btn`) que abre a sidebar como painel deslizante com scrim (`.sidebar-scrim`) em telas < 860px.

### VisaoCadeiras.jsx
- Renderiza os cards das disciplinas do período ativo.
- Permite adicionar nova cadeira rapidamente.

### VisaoAgenda.jsx
- Calcula a posição dos blocos na grade de horários via cálculo proporcional `minutosParaTopo(hhmm, totalHoras)`.
- Exibe uma lista cronológica das próximas datas importantes agrupadas abaixo da grade.

### VisaoAfazeres.jsx *(novo)*
- Formulário de criação (`FormularioAfazer`, componente interno) com: nome, checkbox "Definir dia/hora" (revela campos `date`/`time`), seletor de rotina (`ROTINA_OPCOES`), campo numérico de intervalo quando `rotina.tipo === "personalizada"`, e seletor de urgência (1–3) via `BarraUrgencia`.
- `BarraUrgencia`: renderiza 3 segmentos (`.urgencia-segmento`), preenchidos até o nível escolhido, na cor de `URGENCIA_CORES[nivel]` (amarelo → laranja → vermelho conforme a urgência sobe).
- Lista de afazeres ordenada: pendentes com data primeiro (cronológico), depois pendentes sem data (por urgência desc), depois concluídos.
- Cada item tem: botão de check (`.check-btn`, vira `.marcado` ao concluir), nome, metadados (data/hora e rótulo de rotina via `rotinaLabel()`), a barra de urgência e botão de excluir individual.
- Botão **"Apagar concluídos (N)"** no `header-bar` da própria aba (topo da tela ao entrar em Afazeres) — desabilitado quando não há concluídos; dispara `window.confirm` antes de apagar definitivamente via `onLimparConcluidos`.

### VisaoGeral.jsx *(novo)*
- Calendário mensal navegável (mês anterior/próximo), calculado a partir de `ano`/`mes` em estado local.
- Filtros multi-seleção (chips `.filtro-chip`, toggle independente): **Aulas**, **Avaliações**, **Afazeres/Eventos** — todos ativos por padrão.
- **Aulas**: projeta os `horarios` fixos de todas as cadeiras (`cadeiras` prop, todos os períodos) nos dias do mês correspondentes ao `dia` da semana.
- **Avaliações**: usa as `datas` importantes de cada cadeira que caem dentro do mês exibido.
- **Afazeres/Eventos**: usa `ocorrenciasNoIntervalo()` (de `utils/afazeres.js`) para expandir afazeres rotineiros dentro do intervalo do mês.
- Eventos agrupados por dia (`eventosPorDia`); célula do calendário mostra até 4 pontos coloridos (`.calendario-ponto`) + contador "+N" se houver mais.
- Ao clicar num dia, abre lista de detalhes abaixo do calendário (reaproveita `.data-item`/`.lista-proximas-datas`, mesmo padrão visual da lista de "próximas datas" da Agenda).

### PainelCadeira.jsx
- Drawer slide-over que abre ao clicar numa cadeira.
- Permite editar nome, cor e gerenciar as sub-abas (`horarios`, `links`, `datas`). Inalterado nesta rodada.

### EstadoVazio.jsx
- Propriedades: `{ texto, onAcao, acaoTexto, pequeno }`.
- Se `pequeno={true}`, aplica a classe CSS `.vazio.pequeno`.

### utils/afazeres.js *(novo)*
- `ocorrenciasNoIntervalo(afazer, inicioISO, fimISO)`: dado um afazer com `data` e `rotina`, retorna todas as datas (`YYYY-MM-DD`) em que ele ocorre dentro do intervalo fornecido (inclusive). Afazeres sem `data` retornam `[]` (não entram no calendário). Suporta `diaria`, `semanal` (7 dias), `quinzenal` (15 dias), `mensal` (mesmo dia do mês) e `personalizada` (intervalo em dias definido pelo usuário).
- `toISO(date)` / `parseISO(iso)`: conversão entre `Date` e string `YYYY-MM-DD` em fuso local (evita bugs de UTC).

---

## 5. Mapeamento Estrito do CSS (`app.css`)
Além das classes já existentes, foram adicionadas as seguintes (mantenha esses nomes ao construir novas telas para ficar consistente):

| Elemento / Componente | Classe CSS | Notas |
|---|---|---|
| Container do Drawer (slide-over) | `.painel-lateral` | Inalterado |
| Overlay / Backdrop do Drawer | `.overlay` | Inalterado, reaproveitado também pelo modal |
| Aba ativa no Painel Lateral | `.painel-tab.ativa` | Inalterado |
| Estado vazio reduzido | `.vazio.pequeno` | Inalterado |
| Botões primários/secundários | `.btn-primario`, `.btn-secundario` | `.btn-secundario:disabled` agora estilizado (opacidade 0.4) |
| Botões de ícone | `.icon-btn-ghost`, `.icon-btn-sm` | Inalterado |
| Grade de cadeiras | `.grid-cadeiras` | Vira 1 coluna em mobile |
| Bloco da agenda semanal | `.agenda-bloco` | Inalterado; `.agenda-wrap` ganhou scroll horizontal em mobile |
| Indicador de status | `.status-dot.saved/.saving/.error` | Inalterado |
| **Chevron de colapso (Períodos)** | `.chevron-btn` | Ícone `ChevronRight` do lucide, rotaciona 90° via `style` inline quando aberto |
| **Rótulo clicável da seção Períodos** | `.sidebar-secao-titulo` | Também alterna o colapso ao clicar no texto |
| **Seção de períodos recolhida** | `.periodos-secao.recolhida` | Reduz a margem inferior quando fechada |
| **Formulário de novo afazer** | `.afazer-form` | Card com borda, envolve todo o formulário |
| **Checkbox "definir dia/hora"** | `.checkbox-linha` | `accent-color: #6366f1` no input |
| **Seletor de urgência (grupo de botões)** | `.urgencia-picker` | Container flex dos 3 níveis |
| **Botão individual de nível de urgência** | `.urgencia-opcao`, `.urgencia-opcao.ativa` | Borda na cor do nível; fundo muda quando ativo |
| **Bateria de urgência (barrinhas)** | `.urgencia-bateria`, `.urgencia-segmento` | 3 segmentos; preenchidos até o nível, cor de `URGENCIA_CORES` |
| **Item de afazer na lista** | `.item-afazer`, `.item-afazer.feito` | `.feito` aplica opacidade + `line-through` no título |
| **Botão de check do afazer** | `.check-btn`, `.check-btn.marcado` | Marcado fica verde (`#10b981`) com ícone `Check` |
| **Metadados do afazer (data/rotina)** | `.afazer-meta` | Flex com wrap, ícones `Clock`/`Repeat` inline |
| **Chip de filtro (Visão Geral)** | `.filtro-chip`, `.filtro-chip.ativo` | Toggle multi-seleção; ativo com borda roxa `#6366f1` |
| **Cabeçalho do calendário mensal** | `.calendario-header`, `.calendario-titulo` | Navegação mês anterior/próximo |
| **Grade do calendário mensal** | `.calendario-grid-head`, `.calendario-grid` | 7 colunas (dias da semana) |
| **Célula de dia do calendário** | `.calendario-celula`, `.vazia`, `.hoje`, `.selecionada` | `.hoje` com borda roxa; `.selecionada` com fundo destacado |
| **Pontos de evento na célula** | `.calendario-pontos`, `.calendario-ponto`, `.calendario-mais` | Até 4 pontos coloridos por dia + contador "+N" |
| **Botão hambúrguer (mobile)** | `.mobile-menu-btn` | `display: none` em desktop; fixo no canto superior esquerdo abaixo de 860px |
| **Scrim ao abrir sidebar mobile** | `.sidebar-scrim` | Fundo escuro semi-transparente atrás do menu deslizante |
| **Sidebar em modo mobile** | `.sidebar.mobile-aberta` | `transform: translateX(0)` — desliza para dentro da tela |

Breakpoint mobile: `@media (max-width: 860px)` — sidebar vira painel deslizante, `.main` ganha padding-top extra (espaço pro botão hambúrguer), grids viram 1 coluna, painel lateral ocupa 100% da largura, agenda semanal ganha scroll horizontal.

---

## 6. Regras de Ouro para Alterações / Novas Funcionalidades
1. **Padrão de Import/Export:** Mantenha a convenção de `export default` em todos os componentes React.
2. **Imutabilidade do Estado:** Todas as alterações nas estruturas de arrays (`periodos`, `cadeiras`, `horarios`, `links`, `datas`, `afazeres`) devem ser passadas de forma imutável usando a função `persist({...data})`.
3. **Cascatas de Exclusão:** Excluir um período requer remover todas as cadeiras associadas (`c.periodoId === periodoId`). Excluir uma cadeira requer limpar `cadeiraAbertaId` caso seja a cadeira atualmente aberta. Afazeres **não** têm cascata — são independentes de período/cadeira por design.
4. **Afazeres sem data não aparecem no calendário:** só entram em `VisaoGeral` (e teriam entrado em qualquer futura visualização de calendário) quando `data` está preenchida — regra vinda diretamente do pedido original do usuário.
5. **Recorrência é calculada sob demanda:** não persistir ocorrências futuras no `localStorage`; sempre gerar via `ocorrenciasNoIntervalo()` a partir da `data` base + `rotina`, para o intervalo visível no momento (mês atual do calendário).
6. **Exclusão em massa exige confirmação:** qualquer ação destrutiva em lote (como `limparAfazeresConcluidos`) deve usar `window.confirm` antes de persistir, seguindo o padrão já usado em `excluirPeriodo`/`excluirCadeira`.
7. **Alinhamento de Classes CSS:** Sempre respeite as classes documentadas na Seção 5 para garantir integração visual perfeita com `src/styles/app.css`. Novas telas devem reaproveitar `.data-item`/`.lista-proximas-datas` para listas de eventos, e `.item-linha`/`.lista-itens` para listas de sub-itens dentro de painéis.
8. **Mobile-first para novas telas:** qualquer novo componente de tela cheia deve ser testado sob o breakpoint `860px`; formulários com `.form-grid` devem funcionar tanto em `1fr` (mobile) quanto na grade original (desktop).
