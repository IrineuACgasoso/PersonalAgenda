# Painel acadêmico

App pessoal para organizar períodos, cadeiras, horários, links e datas importantes.
Os dados ficam salvos no seu navegador (localStorage) — nada sai da sua máquina.

## Como rodar

Pré-requisito: ter o [Node.js](https://nodejs.org) instalado (versão 18 ou mais recente).

1. Abra o terminal dentro desta pasta.
2. Instale as dependências (só precisa fazer isso uma vez):
   ```
   npm install
   ```
3. Rode o app:
   ```
   npm run dev
   ```
4. Abra o link que aparecer no terminal (geralmente `http://localhost:5173`).

Pronto — o app abre no navegador e fica rodando enquanto o terminal estiver aberto.
Pra parar, aperte `Ctrl+C` no terminal.

## Atenção: os dados ficam presos a este navegador

Como o armazenamento é `localStorage`, os dados só existem:
- Nesse navegador específico (Chrome, Firefox etc);
- Nesse computador específico.

Se limpar o cache do navegador, os dados somem. Se quiser acessar de outro
computador ou celular, isso vai exigir um passo extra (banco de dados
real + backend, ou sincronização via nuvem) — me avise se quiser evoluir
para isso depois.

## Gerar uma versão para publicar (opcional)

Se um dia quiser colocar isso num site de verdade (ex: Vercel, Netlify):
```
npm run build
```
Isso gera a pasta `dist/`, pronta para hospedar em qualquer serviço de site estático.
