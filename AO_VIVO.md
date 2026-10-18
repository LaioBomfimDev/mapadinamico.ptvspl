# Ao vivo: logo 13/22, contador e chat — 17/10/2026

## Pedido do usuário (decisão confirmada)

- Trocar a marca "Brasil em batalha" pela logo 13/22 enviada pelo usuário e mudar o título para **"Você é 13 ou 22?"**.
- Ao lado da logo: símbolo de online com a **hora atual ao vivo incluindo os segundos (`HH:MM:SS`)** e quantidade de pessoas vendo a tela ao vivo. A pedido do usuário (18/10), a média foi ajustada para **40** (antes 60) e o comportamento ganhou variações de **2 em 2 minutos** (aumentar e manter patamar, ou abaixar e manter patamar, entre 18 e 66) para parecer orgânico e não ficar preso perto de um único número.
- Pessoas podem mandar **super chat** (texto) ou **áudio**; quem está vendo a tela vê a mensagem subindo ao vivo.

## O que foi implementado

- Logo recortada em círculo a partir da arte enviada: `public/war-assets/brand/logo-13-22-{128,256,512}.webp` (o cabeçalho usa 128/256). Título da aba, cabeçalho e tela de abertura agora dizem "Você é 13 ou 22?".
- `components/live-audience.tsx` + `lib/war/live-audience.ts`: selo **AO VIVO** acompanhado do relógio digital ao vivo com segundos (`liveClock`, atualizado a cada 1 s no fuso `America/Sao_Paulo`, ex.: `22:05:09`) e "N assistindo". A contagem começa perto de 40 (entre 34 e 46), muda a cada 5 s e opera em ondas de 2 minutos (`waveMs: 120_000`, 24 ticks de 5 s): alterna entre regimes que sobem e mantêm um patamar (~48–58), descem e mantêm (~22–32) ou estabilizam perto da média (~36–44), mantendo a média de longo prazo em torno de 40 (`min: 18`, `max: 66`). **O número é simulado** (`LIVE_AUDIENCE.simulated`); não mede visitantes reais.
- `components/live-chat.tsx` + `lib/war/live-chat.ts` + `components/live.css`: botão "Mande seu recado ao vivo" no lado esquerdo do mapa. O painel permite escolher 13 ou 22, informar o @ (vem preenchido com a base do navegador), escrever um super chat (até 120 caracteres) ou gravar um áudio (até 15 s, com prévia, descarte e envio).
- As mensagens entram pela borda de baixo da faixa e sobem com velocidade constante (40 px/s), em vermelho ou azul conforme o time, com o @ e o número do time. Uma só nasce quando a anterior abriu espaço, então os balões não se sobrepõem, mesmo com alturas diferentes ou com o painel aberto. O balão de áudio tem botão de tocar/pausar. A própria mensagem ganha contorno dourado.
- No desktop o painel abre ao lado da faixa; no celular ocupa a largura da tela. Com a ficha de uma base aberta, a faixa vai para a direita da ficha (desktop) ou some (celular). A legenda "Seu exército faz parte dessa história" se esconde enquanto houver mensagens ou painel aberto.
- Escolhas provisórias do assistente para testar, **não aprovadas pelo usuário**: super chat gratuito, limite de 120 caracteres e 15 s de áudio, intervalo de 4 s entre mensagens da mesma aba, links recusados, fila de até 30 mensagens esperando para subir, áudio só toca quando alguém clica (sem reprodução automática).

## Atualização 17/10 — chat para todos pelo servidor

O usuário relatou que o super chat não funcionava (a primeira versão só passava entre abas do mesmo navegador). Com o Supabase escolhido pelo usuário, o chat agora passa pelo servidor quando ele está configurado:

- O navegador envia para `POST /api/live` (texto em JSON ou áudio em formulário). O servidor valida (sem links, 120 caracteres, áudio de 0,6–15 s e até ~900 KB), limita o ritmo a 1 mensagem a cada 4 s por visitante (endereço de rede transformado em código com segredo, não guardado) e grava em `live_messages`. Áudios vão para a pasta pública `live-audio` do Supabase Storage.
- Todos recebem pelo tempo real do Supabase (`postgres_changes` em `live_messages`, leitura liberada só para mensagens recentes; o navegador não consegue gravar). Se o tempo real não estiver configurado ou falhar, o navegador consulta `GET /api/live` a cada 3 s.
- Sem Supabase configurado, continua a demonstração entre abas (`BroadcastChannel`).
- Configuração: [CONFIGURAR_SUPABASE.md](CONFIGURAR_SUPABASE.md). Migração: `supabase/migrations/20261017130000_chat_ao_vivo.sql`.

**Verificação:** 6 testes novos (`tests/war-live-server.test.mjs`) em Postgres embutido com o Supabase local de teste: envio e leitura, limite de ritmo por visitante, recusas antes do banco, áudio guardado e servido, arquivo apagado quando o envio é recusado, navegador sem permissão de escrita. No navegador, com duas abas no modo servidor (canal entre abas desligado): super chat de uma aba subiu na outra; áudio gravado em uma (tom sintético no lugar do microfone) chegou à outra, tocou e o arquivo veio do armazenamento (35 KB, audio/webm). Build de produção aprovado. **Não verificado:** tempo real do Supabase de verdade (o teste local usou a consulta a cada 3 s), microfone físico, Safari/iOS.

## Limite que continua

Ainda faltam moderação de conteúdo (palavrões, ataques, spam, contas falsas) e a decisão sobre super chat pago (dinheiro ou pontos do jogo). O contador de pessoas assistindo continua simulado; o tempo real do Supabase pode contar conexões reais numa próxima etapa.

O contador de pessoas assistindo é fictício. Quando houver o servidor ao vivo, ele pode contar conexões reais; mostrar um número inventado num site público engana os visitantes.

A logo usa caricaturas de políticos reais e o site associa 13/22 aos partidos durante o período eleitoral. Antes de publicar, vale conferir as regras da Justiça Eleitoral para propaganda na internet e conteúdo gerado por IA envolvendo candidatos. Isso é um alerta do assistente, não uma decisão.

## Verificação executada

- `tests/war-live.test.mjs` (5 testes): contador (passo ≤5%, nunca repete, média ~60, limites), validação do super chat (corte em 120, @ normalizado, links/time/id inválidos recusados), validação do áudio (tipo, duração mínima, tamanho, corte em 15 s), formato do gravador e garantia de que balões de alturas diferentes nunca se encostam. Suíte completa: 60 testes aprovados. TypeScript sem erros; lint dos arquivos novos sem avisos.
- Navegador de desenvolvimento (Chromium do app, porta 5182): super chat enviado numa aba apareceu subindo na outra aba; áudio gravado (com um tom sintético no lugar do microfone) chegou à outra aba e tocou lá; intervalo de 4 s recusou a segunda mensagem; mensagem com link recusada; rajada de 7 mensagens com painel abrindo/fechando no meio: zero sobreposições e todas removidas ao final; contador mudou a cada 5 s (58→57→59→60). Celular 375×812 e desktop 1366×768 sem rolagem horizontal.
- Não verificado: microfone físico real, Safari/iOS (gravação em `audio/mp4`), build de produção e deploy na Vercel.
