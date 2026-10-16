# Miniaturas desmontáveis — Projeto 2

Pedido de 2026-10-16: após uma explosão, mostrar o boneco caído e as mesmas peças quebradas/desmontadas como brinquedos, deixando marcas engraçadas da guerra. Identificação adicional escolhida pelo usuário: arma acima das unidades azuis/22 e estrela dourada acima das vermelhas/13.

## Comportamento entregue

- As cinco miniaturas têm distintivos 3D voltados para a câmera. O mapa nacional também usa esses símbolos para identificar as bases.
- Impactos durante a batalha desmontam uma miniatura do lote atingido. Infantaria fica deitada, com capacete solto; veículos espalham suas peças, incluindo rodas, torre, canhão, asas ou hélices.
- As peças vêm da geometria original, mantendo formas e cores. Elas saltam, giram, quicam e assentam no chão em cerca de 1,7 segundo. Uma marca escura fica sob os destroços. Não há sangue.
- Os destroços permanecem depois do resultado, durante a sessão aberta. **Opções da demonstração → Reconstruir só as miniaturas** restaura o campo. Iniciar outra batalha ou recarregar a página também reconstrói a apresentação. Essa duração é uma escolha de implementação do protótipo, ainda sujeita à avaliação visual do usuário.
- Pontos, inventário, força militar e resultados não são consumidos pela desmontagem ou reconstrução. A cena continua representando uma miniatura por tipo presente no lote; não representa uma baixa por soldado do inventário.
- Na galeria `/arsenal`, **Explodir miniatura** e **Reconstruir** permitem experimentar cada unidade/time. Os downloads incluem cinco modelos intactos vermelhos e dez modelos desmontados nas duas cores.

## Arquivos e limites

- `lib/war/destruction.ts`: desmontagem determinística por semente, apoio no chão, limite de 128 destroços/12.000 peças e descarte dos recursos próprios. Peças assentadas são agrupadas por material para reduzir chamadas de desenho.
- `lib/war/unit-models.ts`: intervalos dos vértices de cada peça original; `lib/war/team-badges.ts`: símbolos e orientação para a câmera.
- `public/war-assets/wrecks/miniaturas-destrocos.zip`: dez GLBs estáticos, manifesto e licença. Sem clipes de animação gravados; o movimento é executado pelo site.
- Exportação reproduzível em `scripts/export-war-wrecks.mjs`; prévias em `public/war-assets/previews/miniaturas-broken.png`.

Não foi implementada persistência de destroços entre recargas, uma física de colisões entre todas as peças ou sincronização entre espectadores. O objetivo desta entrega é a apresentação local da batalha; a força continua determinada pelas regras existentes.

## Validação

Testes verificam conservação de peças/vértices/cores, exclusão dos distintivos, reprodução das coordenadas originais sob escala/rotação, apoio no chão, determinismo, limites, impactos repetidos, reconstrução e descarte sem alterar o modelo original ou inventário. Modelos exportados têm hashes e CRC conferidos.

Verificação WebGL: tanque azul desmontado e reconstruído (contador 1 → 0); infantaria vermelha caída; batalha completa com 86 destroços ainda presentes após o resultado; reconstrução do campo zerou os destroços e manteve as 962 unidades e placar 13.605 × 13.620. Sem avisos/erros no console capturado. Instalação e resultado da build final em [VALIDACAO_MINIATURAS.md](VALIDACAO_MINIATURAS.md).
