# Ligar o servidor do jogo (Supabase) — passo a passo

Com o Supabase ligado, todos os visitantes veem o **mesmo mapa** e o **super chat / áudio chega ao vivo para todo mundo**. Sem ele, o site continua na demonstração local (cada navegador com seus próprios dados, chat só entre abas do mesmo navegador).

Nunca cole a chave secreta (`sb_secret_...`) ou o token de administração em chat, e-mail ou no código. Eles vão só no arquivo `.env.local` do seu computador e nas variáveis da Vercel.

## 1. Criar o projeto (você, no site do Supabase)

1. Entre em [supabase.com](https://supabase.com) e crie a conta (pode ser com o GitHub).
2. **New project** → nome `vocee13ou22` → região **South America (São Paulo)** → crie uma senha forte para o banco e guarde com você.
3. Espere o projeto terminar de criar (alguns minutos).

## 2. Criar as tabelas (copiar e colar duas vezes)

No menu do projeto, abra **SQL Editor** → **New query**, cole o conteúdo inteiro de cada arquivo abaixo, **nesta ordem**, e clique em **Run**:

1. `supabase/migrations/20261017120000_servidor_do_jogo.sql` — bases, pontos, compras, batalhas.
2. `supabase/migrations/20261017130000_chat_ao_vivo.sql` — super chat, áudios e tempo real.

Deve aparecer "Success. No rows returned". Em **Table Editor** aparecem `bases`, `point_entries`, `comment_receipts`, `purchases`, `battles`, `live_messages` e `live_rate`; em **Storage**, a pasta `live-audio`.

## 3. Pegar os três valores

Em **Project Settings → API Keys** (ou no botão **Connect**):

| Valor no Supabase | Nome da variável | Pode ir para o navegador? |
| --- | --- | --- |
| Project URL (`https://xxxx.supabase.co`) | `SUPABASE_URL` | sim |
| Publishable key (`sb_publishable_...`) | `SUPABASE_PUBLISHABLE_KEY` | sim (só lê o chat) |
| Secret key (`sb_secret_...`) | `SUPABASE_SECRET_KEY` | **não** |

Crie também um token de administração (32+ caracteres aleatórios). No PowerShell:

```powershell
-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 40 | ForEach-Object {[char]$_})
```

Guarde o resultado como `MAP_ADMIN_TOKEN`.

## 4. Colocar os valores no seu computador

Na pasta `sites/projeto-2`, crie o arquivo `.env.local` (ele não vai para o GitHub) com:

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
MAP_ADMIN_TOKEN=o-token-que-voce-gerou
```

Reinicie o site (`npm run dev:vercel -- --hostname 127.0.0.1 --port 5182`). A faixa abaixo do título deve mostrar **SERVIDOR CONECTADO · dados compartilhados**. O mapa começa vazio: é o jogo de verdade.

## 5. Colocar os mesmos valores na Vercel

Projeto na Vercel → **Settings → Environment Variables** → adicione as quatro variáveis (Production e Preview) → **Deployments → Redeploy**.

## 6. Testar

- **Criar uma base** (até o Instagram estar conectado): na pasta `sites/projeto-2`,
  ```
  node scripts/game-admin.mjs comentario "@seu_perfil Catu BA 13"
  ```
  Para o site publicado, acrescente `--site https://seu-site.vercel.app` e use o mesmo `MAP_ADMIN_TOKEN` da Vercel.
- **Comprar para uma base**: `node scripts/game-admin.mjs comprar u-seu_perfil infantry`.
- **Super chat ao vivo**: abra o site em dois aparelhos (ex.: computador e celular), mande um super chat ou áudio em um; ele deve subir no outro em cerca de 1 s.

## Testar sem Supabase (opcional, para desenvolvimento)

`node scripts/supabase-local.mjs` liga um Supabase de teste neste computador (Postgres embutido, dados só na memória). Use no `.env.local`: `SUPABASE_URL=http://127.0.0.1:54321`, `SUPABASE_SECRET_KEY=local-secret` e um `MAP_ADMIN_TOKEN`. Ele não tem tempo real: o chat consulta a cada 3 s.

## Situação em 17/10/2026

- Projeto Supabase do usuário: `utatdfchtnwxfurgbfqn` (URL `https://utatdfchtnwxfurgbfqn.supabase.co`). As duas migrações foram executadas pelo SQL Editor com conteúdo conferido por hash contra os arquivos do repositório. Conferência: 7 de 7 tabelas com RLS, `live_messages` na publicação de tempo real, pasta `live-audio` pública (limite 921600 bytes), funções sem execução para `anon`, `anon` lê o chat mas não grava nem lê `bases`.
- Falta: colocar `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` e `MAP_ADMIN_TOKEN` na Vercel e no `.env.local`.
- Na Vercel existem dois projetos ligados ao mesmo repositório: `vocee13ou22` (https://vocee13ou22.vercel.app) e `mapadinamico.ptvspl` (https://mapadinamicoptvspl.vercel.app). Ambos publicam o `main`; as variáveis precisam ir no projeto que será usado.
