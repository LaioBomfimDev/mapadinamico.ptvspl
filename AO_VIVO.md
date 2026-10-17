# Ao vivo: logo 13/22, contador e chat — 17/10/2026

## Pedido do usuário (decisão confirmada)

- Trocar a marca "Brasil em batalha" pela logo 13/22 enviada pelo usuário e mudar o título para **"Você é 13 ou 22?"**.
- Ao lado da logo: símbolo de online e quantidade de pessoas vendo a tela ao vivo. Por enquanto, números fictícios em torno de 60, mudando a cada 5 s com variação pequena (~5%).
- Pessoas podem mandar **super chat** (texto) ou **áudio**; quem está vendo a tela vê a mensagem subindo ao vivo.

## O que foi implementado

- Logo recortada em círculo a partir da arte enviada: `public/war-assets/brand/logo-13-22-{128,256,512}.webp` (o cabeçalho usa 128/256). Título da aba, cabeçalho e tela de abertura agora dizem "Você é 13 ou 22?".
- `components/live-audience.tsx` + `lib/war/live-audience.ts`: selo **AO VIVO** e "N assistindo". Começa entre 56 e 64, muda a cada 5 s em no máximo ~5% do valor (±1 a ±3), sempre um número diferente, puxado de volta para 60 e preso entre 48 e 72. **O número é simulado** (`LIVE_AUDIENCE.simulated`); não mede visitantes reais.
- `components/live-chat.tsx` + `lib/war/live-chat.ts` + `components/live.css`: botão "Mande seu recado ao vivo" no lado esquerdo do mapa. O painel permite escolher 13 ou 22, informar o @ (vem preenchido com a base do navegador), escrever um super chat (até 120 caracteres) ou gravar um áudio (até 15 s, com prévia, descarte e envio).
- As mensagens entram pela borda de baixo da faixa e sobem com velocidade constante (40 px/s), em vermelho ou azul conforme o time, com o @ e o número do time. Uma só nasce quando a anterior abriu espaço, então os balões não se sobrepõem, mesmo com alturas diferentes ou com o painel aberto. O balão de áudio tem botão de tocar/pausar. A própria mensagem ganha contorno dourado.
- No desktop o painel abre ao lado da faixa; no celular ocupa a largura da tela. Com a ficha de uma base aberta, a faixa vai para a direita da ficha (desktop) ou some (celular). A legenda "Seu exército faz parte dessa história" se esconde enquanto houver mensagens ou painel aberto.
- Escolhas provisórias do assistente para testar, **não aprovadas pelo usuário**: super chat gratuito, limite de 120 caracteres e 15 s de áudio, intervalo de 4 s entre mensagens da mesma aba, links recusados, fila de até 30 mensagens esperando para subir, áudio só toca quando alguém clica (sem reprodução automática).

## Limite importante

**Nesta prévia, "todo mundo" significa as abas abertas no mesmo navegador.** O envio usa `BroadcastChannel`; não há servidor. Para que todos os visitantes do site vejam a mensagem, falta escolher e ligar um serviço em tempo real (por exemplo WebSocket próprio, Supabase Realtime, Pusher ou Ably), guardar os áudios em algum armazenamento, e moderar o conteúdo antes de exibir (palavrões, ataques, spam, contas falsas). Também falta decidir se o super chat é pago (dinheiro ou pontos do jogo); não há pagamento implementado.

O contador de pessoas assistindo é fictício. Quando houver o servidor ao vivo, ele pode contar conexões reais; mostrar um número inventado num site público engana os visitantes.

A logo usa caricaturas de políticos reais e o site associa 13/22 aos partidos durante o período eleitoral. Antes de publicar, vale conferir as regras da Justiça Eleitoral para propaganda na internet e conteúdo gerado por IA envolvendo candidatos. Isso é um alerta do assistente, não uma decisão.

## Verificação executada

- `tests/war-live.test.mjs` (5 testes): contador (passo ≤5%, nunca repete, média ~60, limites), validação do super chat (corte em 120, @ normalizado, links/time/id inválidos recusados), validação do áudio (tipo, duração mínima, tamanho, corte em 15 s), formato do gravador e garantia de que balões de alturas diferentes nunca se encostam. Suíte completa: 60 testes aprovados. TypeScript sem erros; lint dos arquivos novos sem avisos.
- Navegador de desenvolvimento (Chromium do app, porta 5182): super chat enviado numa aba apareceu subindo na outra aba; áudio gravado (com um tom sintético no lugar do microfone) chegou à outra aba e tocou lá; intervalo de 4 s recusou a segunda mensagem; mensagem com link recusada; rajada de 7 mensagens com painel abrindo/fechando no meio: zero sobreposições e todas removidas ao final; contador mudou a cada 5 s (58→57→59→60). Celular 375×812 e desktop 1366×768 sem rolagem horizontal.
- Não verificado: microfone físico real, Safari/iOS (gravação em `audio/mp4`), build de produção e deploy na Vercel.
