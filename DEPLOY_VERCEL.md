# Publicar o Projeto 2 na Vercel

O repositório contém um app Next.js na raiz. A configuração em `vercel.json` seleciona Next.js, `npm ci` e `npm run build:vercel`; o diretório de saída fica sob a detecção padrão do framework.

## Importar o repositório

Na Vercel, crie um projeto e importe `LaioBomfimDev/mapadinamico.ptvspl` com estas opções:

| Opção | Valor |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | `.` (raiz do repositório) |
| Build Command | `npm run build:vercel` |
| Install Command | `npm ci` |
| Output Directory | padrão do Next.js, sem override |
| Node.js Version | 22.x |

O `package.json` seleciona Node 22.x para evitar que a Vercel interprete `>=22.13.0` como compatível com sua versão padrão mais nova. A documentação atual da Vercel lista 24.x como padrão e indica `22.x` para escolher a linha 22.[Node.js na Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

O comando `build:vercel` usa o Next.js instalado e gera o app com a saída padrão do framework. A build não precisa de credenciais Cloudflare ou Instagram para publicar a demonstração.

## Variáveis opcionais

Não configure nenhuma variável para publicar e experimentar o mapa de batalha local no navegador. Para usar as rotas herdadas de moradores com D1, configure apenas no servidor de produção:

| Variável | Finalidade |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Conta Cloudflare que contém o banco D1 |
| `CLOUDFLARE_D1_DATABASE_ID` | UUID do banco D1 |
| `CLOUDFLARE_D1_API_TOKEN` | Token Cloudflare com permissão D1 necessária |
| `MAP_ADMIN_TOKEN` | Opcional; Bearer token aleatório com pelo menos 32 caracteres para rotas administrativas |

Nunca use prefixo `NEXT_PUBLIC_` nessas credenciais. O arquivo `.env.vercel.example` contém valores vazios. Pré-visualizações devem usar um banco separado ou não receber credenciais.

Instagram permanece desligado até configurar uma integração verificada. Variáveis como `INSTAGRAM_APP_SECRET` e `INSTAGRAM_VERIFY_TOKEN` não iniciam uma campanha sozinhas.

## O que o deploy disponibiliza

- `/`: protótipo de batalha no cliente. Bases, compras e resultados ficam no `localStorage` de cada navegador e não sincronizam entre visitantes.
- `/arsenal`: galeria de miniaturas 3D.
- `/cozinha-3d`: editor 3D local de cozinha 4 × 6 m. O salvamento é por navegador; exporta JSON.
- `/api/map` e rotas herdadas: dependem de D1 para dados reais de moradores.

O Projeto 2 ainda não tem batalha compartilhada autoritativa, scheduler diário, autenticação de perfis ou confirmação de participação do Instagram. Publicar agora coloca a demonstração online; esses serviços ainda precisam ser construídos antes de uma campanha pública.

## Arquivos grandes

O arquivo fonte local `data/BR_Municipios_2025.zip` tem aproximadamente 237 MB, não é usado pela aplicação e está excluído do Git. Isso também evita exceder o limite de 100 MB de arquivos-fonte enviados pelo CLI nos projetos Hobby da Vercel. Os arquivos preparados `public/brazil-municipalities*.geojson` permanecem no repositório; não são usados pelas rotas atuais. Consulte [limites da Vercel](https://vercel.com/docs/limits#static-file-uploads).

## Verificação antes de publicar

Na raiz do projeto:

```sh
npm ci
npm run build:vercel
npm run typecheck:vercel
```

Depois da importação, confira o log do primeiro deploy. Nenhum deploy foi iniciado por este repositório local.
