# Projeto 2 — protótipo de miniaturas

Entrega de 2026-10-16, após o usuário escolher miniaturas e pedir prosseguir com criação e melhorias. `Brasil em Batalha` é apresentação provisória; não é um nome público escolhido pelo usuário.

## O que funciona localmente

- Home própria de guerra, com mapa 3D em tela cheia e 27 UFs obtidas das APIs oficiais do IBGE. Geografia armazenada em aproximadamente 97 KB, com fonte, data de consulta e hash.
- Busca de perfis/estados, seleção de base, zoom, pan, rotação, tela cheia e interface adaptada a telas estreitas.
- Bases em quadras com ruas horizontais/verticais recortadas nos polígonos estaduais, incluindo o Distrito Federal. A posição é ilustrativa e representa o estado, sem endereço pessoal ou afirmação de localização municipal.
- Cinco miniaturas volumétricas próprias: infantaria, tanque, artilharia, drone e avião; versões vermelha e azul, partes animadas, galeria `/arsenal`, GLBs e ZIP.
- O lote mostra uma miniatura por tipo de equipamento presente. Quantidades reais aparecem no painel e entram integralmente no cálculo de força; a cena não desenha um objeto para cada soldado acumulado.
- Explosão/fumaça em atlas transparente de 32 quadros, projetado como sprite na cena 3D. Limite de 24 efeitos simultâneos e descarte de texturas.
- Simulador de comentário `@perfil BA 13`, com uma base por perfil, deduplicação de identificador, teto diário e compra manual de unidades com pontos.
- Demonstração com 82 bases fictícias, ou mapa vazio pelo botão **Opções da demonstração**. A base inicial editável é `@voce_demo`, na Bahia.
- Batalha demonstrativa de sete minutos, com velocidades 1×, 12× (35 s) e 24×, pausa, trajetórias, explosões, perdas visuais, pintura gradual e resultado.
- Resultado nacional pela maior força militar total, com todas as bases inscritas. Cada estado recebe a cor da maior força local. Inventários não são consumidos.
- Histórico dos dez últimos resultados e persistência da demonstração em `localStorage` com validação de estrutura. Dados restritos a esse navegador/origem.

## Valores experimentais, não regras finais aprovadas

Em `lib/war/game.ts`: 10 pontos por comentário, até cinco comentários pontuados por perfil/dia de Brasília; três soldados iniciais; custos/forças definidos em `CATALOG`; empate nacional mostrado como empate e empate estadual mostrado neutro. A escolha de montagem manual, inscrição permanente e vitória por força foi confirmada pelo usuário. Os valores acima e a apresentação das fases foram escolhidos para tornar o protótipo testável.

A batalha tira um retrato das forças antes de iniciar. As animações ilustram o confronto; não são uma simulação física/tática capaz de inverter o vencedor. Compras ficam bloqueadas durante a rodada. A pintura gradual segue uma ordem visual fixa de UFs; não implementa avanço municipal ou conquista por vizinhança.

## Como executar

```powershell
npm ci
npm run dev:vercel -- --hostname 127.0.0.1 --port 5182
```

Para a prévia da build de produção:

```powershell
npm run build:vercel
npm run start:vercel -- --hostname 127.0.0.1 --port 5183
```

Na home, explore a base inicial, abra o arsenal e compre uma unidade. **Criar base** abre o simulador de comentário. **Simular batalha** reproduz a rodada. Em telas estreitas, criação também está disponível em **Como funciona**; o botão de opções permite iniciar com mapa vazio ou restaurar a demonstração.

## Limites reais antes de uma campanha pública

- Instagram não conectado: não há conta, post, tokens ou campanha configurados. O simulador não lê nem publica comentários reais.
- As APIs/webhooks herdadas de casas permanecem como código legado e não alimentam o novo jogo. O front de guerra não chama esses endpoints.
- Estado autoritativo compartilhado, autenticação do dono da base, economia no servidor e adaptador de comentários militares ainda precisam de implementação/ativação antes da produção pública. Informar um @ nesta prévia somente seleciona a base editável local; não comprova propriedade do perfil.
- O contador de 22h informa o horário planejado em Brasília. Não existe scheduler de batalha compartilhada ativado. Não foi criada automação Codex para executar o jogo.
- O repositório do Projeto 2 continua local, separado do Projeto 1. Nenhum deploy ou push desta entrega foi feito.

## Fontes e reprodução

- `node scripts/sync-ibge.mjs` consulta Localidades e Malhas v3, valida 27 UFs e salva a geografia. A API escolheu seu período padrão; o manifesto não atribui um ano que a resposta não informou.
- [Documentação IBGE](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3).
- [Assets e proveniência](public/war-assets/ASSETS.md): geradores, limites, hashes, GLBs e sprites originais, sem créditos pagos.
- Prévia anterior preservada em `app/arsenal/legacy-preview.tsx`; home e modelos de imóveis legados preservados nos arquivos anteriores, sem uso pela home nova.

## Verificação

Testes de regras e geografia em `tests/war-game.test.mjs`; testes de arte/exportação/VFX em `tests/war-assets.test.mjs`. Build oficial Next.js/Vercel e verificação visual são registrados separadamente em `VALIDACAO_MINIATURAS.md`.
