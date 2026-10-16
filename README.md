# Projeto 2 — Brasil em Batalha

Protótipo web em Next.js com mapa 3D do Brasil, bases militares, miniaturas de unidades e uma batalha demonstrativa. Este repositório é independente do Projeto 1.

## Rodar localmente

Requer Node.js 22.x e npm.

```sh
npm ci
npm run dev:vercel -- --hostname 127.0.0.1 --port 5179
```

Abra `http://127.0.0.1:5179`. A página `/cozinha-3d` abre o editor 3D da cozinha de 4 × 6 m.

## Vercel

O projeto usa a raiz deste repositório, Next.js e o comando `npm run build:vercel`, definidos em `vercel.json`. A configuração deixa a Vercel determinar a saída padrão do Next.js. `package.json` fixa o runtime em Node 22.x. Consulte [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md) para importar o repositório e configurar variáveis opcionais.

## Estado do produto

- A batalha e as bases de demonstração são executadas no navegador e salvas no `localStorage` daquele navegador. Não há estado compartilhado entre visitantes.
- Não há scheduler de produção para iniciar batalhas às 22h, autenticação de participantes, validação de comentários do Instagram ou serviço autoritativo de batalha.
- A integração D1 e as rotas de moradores herdadas ainda existem, mas não fornecem persistência às bases do jogo.
- A planta 3D da cozinha também salva neste navegador; a exportação baixa um arquivo JSON.

O deploy publica uma demonstração web. Ele não ativa campanha pública nem transforma os dados locais do jogo em um serviço multiplayer.

## Desenvolvimento e verificações

```sh
npm run build:vercel
npm run typecheck:vercel
node --test tests/war-game.test.mjs tests/war-base-camp.test.mjs tests/war-assets.test.mjs
```

Os valores do jogo continuam experimentais. As decisões e pendências estão em [PROJETO_2.md](PROJETO_2.md).
