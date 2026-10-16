# Miniaturas e efeitos do Projeto 2

Arte original criada por código para este projeto. Não foram utilizados modelos de terceiros, texturas dos sites de referência, APIs de geração ou créditos pagos.

## Modelos 3D

`models/miniaturas-3d.zip` contém cinco GLBs e seu manifesto: infantaria, tanque, artilharia, drone e avião. São malhas volumétricas reais, com eixo Y para cima e frente +Z. Os veículos no chão têm base em Y=0; drone e avião incluem altura de voo. Cada modelo possui de 1.228 a 3.092 triângulos.

Os GLBs contêm a paleta vermelha e uma pose estática. O código `lib/war/unit-models.ts` cria versões vermelha/azul e anima braços, pernas, torre, canhão, hélices e flutuação. Não há clipes de animação gravados nos GLBs. `disposeUnit` libera geometria e materiais compartilhados apenas dentro do próprio modelo.

Previews PNG/SVG em `previews/{kind}` derivam dos vértices reais dos modelos por projeção ortográfica. `previews/miniaturas.png` reúne os cinco. São previews de catálogo; o mapa utiliza WebGL e modelos reais.

## Explosões

`explosions.png`: PNG RGBA transparente, 2.048 × 1.024, atlas 8 colunas × 4 linhas, 32 quadros de 256 × 256. Ordem de leitura: esquerda para direita, de cima para baixo. Reprodução a 25 fps, duração 1,28 s. Último quadro inteiramente transparente. Fundo quadriculado aparece apenas no contact sheet, não no atlas.

`lib/war/vfx.ts` coloca o atlas em sprites que acompanham a câmera dentro da cena 3D. Até 24 efeitos simultâneos; a instância mais antiga é liberada ao alcançar o limite. Fumaça/clarão desaparecem ao terminar. Efeitos visuais não alteram inventário ou resultado.

## Reproduzir os assets

```sh
node scripts/export-war-models.mjs
python scripts/rasterize-war-previews.py
python scripts/generate-war-sprites.py
node --test tests/war-assets.test.mjs
```

Exportação usa Three.js já declarado no projeto. Rasterização e sprites usam Python/Pillow, sem conexão de rede. Os manifestos registram dimensões e hashes SHA-256. Licença/autoria dos modelos em `models/LICENSE.txt`; direitos acompanham o projeto do usuário.

Esta entrega fornece apresentação e animações. Não representa integração real do Instagram ou validação de balanceamento militar.

## Validação desta entrega — 2026-10-16

Cinco testes automatizados de assets aprovados: dez combinações modelo/time, coordenadas finitas, apoio no chão, orçamento de geometria, animações, isolamento/descarte de materiais, estrutura/hash dos cinco GLBs, atlas RGBA e limites/expiração/descarte dos efeitos. TypeScript dos dois módulos passou. ZIP conferido por CRC, sete entradas válidas. PNG conferido com Pillow, inclusive último quadro transparente. Contact sheets de miniaturas e explosão inspecionados. Isso não substitui a verificação WebGL do mapa completo feita na integração.
