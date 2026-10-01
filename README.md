# 📅 Minha Agenda Pessoal

Painel pessoal para organizar a vida acadêmica e a rotina: **períodos, cadeiras, compromissos semanais, afazeres e um calendário geral** que cruza tudo isso. Funciona como **PWA** (instalável no celular/desktop), **offline-first** e sincroniza entre dispositivos via **Firebase** quando logado.

![Visão geral do calendário](docs/screenshots/visao-geral.png)
<!-- PLACEHOLDER: print da aba "Calendário geral" com um dia selecionado e o painel de eventos aberto -->

**Stack:** React 18 · Vite 5 · Firebase (Auth + Firestore) · vite-plugin-pwa · Lucide React · CSS puro (dark theme)

---

## Sumário

- [Funcionalidades](#funcionalidades)
- [Como funciona](#como-funciona)
- [Stack](#stack)
- [Como rodar](#como-rodar)
- [Configuração do Firebase](#configuração-do-firebase)
- [Build e deploy](#build-e-deploy)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Decisões técnicas](#decisões-técnicas)
- [Limitações conhecidas](#limitações-conhecidas)

---

## Funcionalidades

### 🎓 Períodos e Cadeiras
- Múltiplos **períodos** (ex.: `2026.1`, `2026.2`) com seletor no próprio título da tela, com criação, renomeação inline e exclusão.
- **Vigência opcional** do período (`dataInicio` / `dataFim`): aulas só são projetadas no calendário dentro desse intervalo.
- Cada **cadeira** tem cor própria, **horários de aula** (dia, início, fim, local), **links/materiais** e **datas importantes** (provas, trabalhos).
- Suporte a **códigos de turma do Google Classroom**, sempre listados antes dos links comuns.

![Tela de cadeiras](docs/screenshots/cadeiras.png)
<!-- PLACEHOLDER: print da aba "Cadeiras" com o grid de cards e o seletor de período aberto -->

![Painel lateral da cadeira](docs/screenshots/painel-cadeira.png)
<!-- PLACEHOLDER: print do drawer lateral de uma cadeira (abas Horários / Links / Datas) -->

### 🗓️ Compromissos
- Compromissos recorrentes semanais (academia, reunião fixa etc.), vinculados a um período.
- Reaproveitam o mesmo editor de horários das cadeiras.

### ✅ Afazeres
- Afazeres avulsos com **data/hora opcionais**, **cor livre** (seletor hexadecimal) e **urgência** em 3 níveis (barra de "bateria").
- **Rotinas:** diária, semanal, quinzenal, mensal, **dias específicos da semana** ou intervalo personalizado, com limite opcional de repetições.
- Conclusão **por ocorrência** (concluir só o dia de hoje de um afazer recorrente, sem afetar os outros).
- Afazeres com data aparecem automaticamente no calendário geral.

![Tela de afazeres](docs/screenshots/afazeres.png)
<!-- PLACEHOLDER: print da aba "Afazeres" mostrando o formulário e a lista com urgência/rotina -->

### 📆 Calendário geral
- Visão mensal que **cruza aulas, avaliações, compromissos e afazeres**, com filtros por tipo.
- Abre com o dia atual selecionado e painel de detalhes do dia.
- **Arrastar e soltar** ocorrências de afazeres para outro dia (mouse, e toque com *long-press*), com troca automática de mês ao arrastar até a borda.
- Em afazeres recorrentes, mover uma ocorrência **não altera a regra**: a exceção é guardada só para aquela data.
- Marcar eventos como concluídos e **excluir apenas uma ocorrência** (ex.: aula cancelada) sem apagar o horário.

![Arrastar afazer no calendário](docs/screenshots/drag-and-drop.png)
<!-- PLACEHOLDER: print/GIF do drag-and-drop de um afazer entre dias do calendário -->

### 🧭 Agenda da semana
- Grade semanal (06h–23h) combinando horários de cadeiras e compromissos, com filtro por origem.
- Clicar num bloco abre o painel de edição correspondente.
- Lista de próximas datas importantes.

![Agenda da semana](docs/screenshots/agenda-semana.png)
<!-- PLACEHOLDER: print da aba "Agenda da semana" com a grade preenchida -->

### ☁️ Sincronização e backup
- **Sem login:** dados salvos em `localStorage`.
- **Com login Google:** sincronização em tempo real entre dispositivos via Firestore, com indicador de status (salvo, salvando, offline, erro) e horário da última sincronização.
- **Backups em 3 camadas:**
  - Exportar/importar `.json` manual.
  - Backup automático diário (download `.json` + histórico local dos últimos 10).
  - Snapshots na nuvem a cada 3h (últimos 10), com restauração pela Sidebar.

![Sidebar e status de sincronização](docs/screenshots/sidebar-backup.png)
<!-- PLACEHOLDER: print da sidebar mostrando seção Backup, conta logada e status "Nuvem sincronizada" -->

### 📱 PWA e UX
- Instalável (Android, iOS, desktop) e funciona offline.
- Layout responsivo: abaixo de 860px a sidebar vira menu deslizante.
- Navegação por **Enter** em formulários e painéis (avança o foco e aciona botões), útil para cadastro rápido só no teclado.

![Versão mobile](docs/screenshots/mobile.png)
<!-- PLACEHOLDER: print(s) da versão mobile (calendário + menu lateral aberto) -->

---

## Como funciona

### Modelo de dados

Todo o estado é um único objeto (`AppData`), persistido como um documento só:

```ts
type AppData = {
  periodos: Periodo[];            // { id, nome, dataInicio?, dataFim? }
  cadeiras: Cadeira[];            // { id, periodoId, nome, cor, horarios[], links[], datas[] }
  compromissos: Compromisso[];    // { id, periodoId, nome, cor, horarios[] }
  afazeres: Afazer[];             // { id, nome, data?, hora?, rotina, urgencia, feito, cor?, ... }
  eventosConcluidos: string[];    // chaves de ocorrências marcadas como concluídas
  eventosExcluidos: string[];     // chaves de ocorrências removidas (ex.: aula cancelada)
  periodoAtivoId: string | null;
};
```

### Recorrência calculada sob demanda
Ocorrências futuras **nunca são persistidas**. Aulas e compromissos são projetados dia a dia em `useEventosCalendario`; afazeres rotineiros usam `ocorrenciasNoIntervalo()` (`utils/afazeres.js`). Exceções (concluído, excluído, movido) ficam em listas/mapas indexados pela data da ocorrência.

### Camada de persistência (`usePersistedData`)
Todo write do app passa por `persist()`, que decide o destino:

| Estado | Destino | Leitura |
|---|---|---|
| Não logado | `localStorage` | Na inicialização |
| Logado | Firestore `users/{uid}` | Checagem inicial no servidor + `onSnapshot` em tempo real |

Proteções contra perda de dados:
- **Leitura inicial forçada no servidor** (`getDocFromServer`, com timeout de 8s) antes de decidir criar o documento, para não sobrescrever dados reais com um "não existe" vindo do cache.
- **Fila de escrita serializada**: `setDoc` é encadeado para que respostas de rede fora de ordem não apaguem alterações mais novas.
- **Trava anti-sobrescrita**: `persist()` recusa gravar um estado que sanitiza para "vazio" por cima de um estado com conteúdo.
- **`sanitizarDados`** como fonte única de normalização (campos ausentes, tipos inválidos, retrocompatibilidade com backups antigos).
- **Fallback offline:** se o servidor não responde, usa o cache persistente do Firestore (IndexedDB) e o SDK sincroniza as escritas pendentes ao reconectar.

### Autenticação
Login via Google (popup). O acesso é restrito a **um único e-mail** definido em `EMAIL_PERMITIDO` (`src/firebase.js`); qualquer outra conta é deslogada automaticamente.

> ⚠️ A trava de e-mail no client é só conveniência. A segurança real depende das **Firestore Security Rules** (veja abaixo).

---

## Stack

| Camada | Tecnologia |
|---|---|
| UI | React 18, Lucide React, CSS puro |
| Build | Vite 5 |
| PWA | vite-plugin-pwa (Workbox, `autoUpdate`) |
| Auth e dados | Firebase Auth (Google) + Firestore (cache persistente) |
| Persistência local | `localStorage` + IndexedDB (via Firestore) |

---

## Como rodar

**Pré-requisitos:** [Node.js](https://nodejs.org) 18+ e npm.

```bash
# 1. Clone o repositório
git clone https://github.com/<seu-usuario>/<nome-do-repo>.git
cd <nome-do-repo>

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# edite o .env com as credenciais do seu projeto Firebase

# 4. Rode em desenvolvimento
npm run dev
```

Abra `http://localhost:5173`.

> O app **inicializa o Firebase ao carregar**, então o `.env` precisa estar preenchido mesmo que você só vá usar o modo local (sem login). Sem ele, o SDK falha na inicialização.

---

## Configuração do Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com).
2. Em **Authentication → Sign-in method**, ative o provedor **Google**.
3. Em **Authentication → Settings → Authorized domains**, adicione o domínio de produção (ex.: `seu-app.vercel.app`). `localhost` já vem autorizado.
4. Em **Firestore Database**, crie o banco.
5. Em **Project settings → Your apps**, registre um app Web e copie as credenciais para o `.env`:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

6. Troque o e-mail permitido em `src/firebase.js`:

```js
export const EMAIL_PERMITIDO = "seu-email@exemplo.com";
```

7. **Obrigatório:** configure as **Security Rules** do Firestore. Sem isso, qualquer usuário autenticado no seu projeto poderia ler/escrever dados de outros:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;

      match /backups/{backupId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```

> As chaves `VITE_FIREBASE_*` são públicas por natureza (vão para o bundle do client). Usar `.env` aqui serve para facilitar a troca de projeto e não commitar credenciais, **não** para escondê-las. A proteção real são as Security Rules.

---

## Build e deploy

```bash
npm run build     # gera dist/
npm run preview   # serve o build localmente
```

Deploy estático em qualquer provedor (Vercel, Netlify, Firebase Hosting). Na Vercel/Netlify, cadastre as variáveis `VITE_FIREBASE_*` no painel do projeto e adicione o domínio final em *Authorized domains* do Firebase Auth.

---

## Estrutura do projeto

```
src/
├── App.jsx                  # Estado global, ações CRUD, backup, roteamento de abas
├── firebase.js              # Config Firebase, login Google, e-mail permitido
├── constants.js             # Cores, dias, rotinas, chaves de storage
├── hooks/
│   ├── usePersistedData.js  # Persistência híbrida (local / Firestore), fila de escrita, offline
│   ├── useEventosCalendario.js  # Projeção de aulas, avaliações, compromissos e afazeres por mês
│   ├── useFiltrosCalendario.js  # Filtros do calendário (persistidos)
│   ├── useAutoBackup.js     # Backup diário (.json + histórico local)
│   ├── useCloudBackup.js    # Snapshots no Firestore a cada 3h
│   └── useNavegacaoEnter.js # Navegação por Enter em formulários
├── utils/
│   ├── sanitizarDados.js    # Normalização única dos dados persistidos
│   ├── afazeres.js          # Cálculo de recorrência
│   ├── calendario.js        # Células do mês, vigência de período
│   └── ...
└── components/
    ├── Sidebar.jsx
    ├── VisaoGeral.jsx       # Calendário mensal + drag-and-drop
    ├── VisaoAgenda.jsx      # Grade semanal
    ├── VisaoCadeiras.jsx / VisaoCompromissos.jsx / VisaoAfazeres.jsx
    ├── PainelCadeira.jsx / PainelCompromisso.jsx   # Drawers de edição
    ├── abas/                # Horários, Links, Datas
    └── ui/                  # SeletorCor, SeletorPeriodo, ModalTexto, ...
```

---

## Decisões técnicas

- **Sem gerenciador de estado externo:** um único objeto `AppData` + `persist()` centralizado basta para o escopo e garante que toda escrita passe pela camada de sincronização.
- **Sem ocorrências persistidas:** recorrência é derivada; só exceções são salvas. Evita dados inconsistentes quando a regra muda.
- **Edição atômica de listas:** itens são editados com um único `.map()` por `id`, nunca "remover + adicionar" em duas chamadas (causava duplicatas por closure sobre array desatualizado).
- **Offline-first sem reinventar sincronização:** o cache persistente do Firestore cuida da fila de escritas pendentes.
- **CSS puro:** sem framework de UI, por ser um projeto de escopo pequeno.

---

## Limitações conhecidas

- **Single-user:** o acesso é restrito a um e-mail fixo no código. Multiusuário exigiria remover essa trava (as Rules já isolam por `uid`).
- **Cache do Firestore em modo single-tab** (`persistentSingleTabManager`): o uso offline simultâneo em várias abas do mesmo navegador não é coordenado.
- **Sem testes automatizados.**
- Backups automáticos diários disparam um download `.json` a cada dia em que o app é aberto.

---

## Licença

Projeto pessoal, publicado para fins de portfólio. Defina uma licença (ex.: MIT) antes de aceitar contribuições.