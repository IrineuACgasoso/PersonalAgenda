# log.md — Alterações recentes e pendências entre sessões

> Entrada mais nova no topo. Manter só as últimas ~10 sessões; o resto o git guarda.
> Formato: data · resumo · arquivos tocados · estado (build/testes) · pendências de curto prazo.

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

---

## 2026-11-18 (1) — Documentação para o Claude
- **Feito:** leitura completa do projeto; criados `CLAUDE.md` (regras + escopo), `organization.md` (árvore + atalhos), `todo.md` (backlog priorizado com os pedidos do usuário + achados da leitura), `log.md`.
- **Código:** nenhuma alteração.
- **Estado:** `npm run build` ✅ (aviso de chunk de 970 kB, conhecido). Sem testes automatizados.
- **Achados principais da leitura** (detalhes no `todo.md` P0): `useAutoBackup` não é usado; `icon-maskable-512.png` inexistente; "hoje" em UTC na Agenda; rotina mensal deriva em dias 29–31; chaves de evento por nome; concluir rotina na aba Afazeres marca a rotina toda.
- **Pendências:** resolvidas na sessão (2). Ideias aprovadas, docs vão para o git, bug do mobile e `tests/` feitos.

---

## Histórico anterior (resumo do git)
- 2026-10-21 `Clean README` — README com screenshots em `docs/screenshots/`.
- 2026-09-30 — removidos `agenda.zip` e `contexto-projeto.md` (doc antigo, disponível em `git show e2c8770:contexto-projeto.md`).
- 2026-09-22 `Auto reload + Offline` — watchdog de 12s, fallback cache Firestore, `ultimaSincronizacao`, status offline.
- 2026-09-18 `FIXED bug de afazeres com rotinas`; antes: dias específicos, deletar afazer no dia, remake visual, ícones Android, cadastro de cadeiras reformulado, backups automáticos, Firebase seguro contra deleções, drag-and-drop no calendário.
