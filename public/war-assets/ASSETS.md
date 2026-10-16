# Miniaturas e efeitos do Projeto 2

Arte original criada por código para este projeto. Não foram utilizados modelos de terceiros, texturas dos sites de referência, APIs de geração ou créditos pagos.

## Modelos 3D

`models/miniaturas-3d.zip` contém cinco GLBs e seu manifesto: infantaria, tanque, artilharia, drone e avião. São malhas volumétricas reais, com eixo Y para cima e frente +Z. Os veículos no chão têm base em Y=0; drone e avião incluem altura de voo. Com o distintivo, cada modelo exportado possui de 1.580 a 3.444 triângulos.

Os GLBs contêm a paleta vermelha, estrela dourada e uma pose estática. O código `lib/war/unit-models.ts` cria versões vermelha/azul e anima braços, pernas, torre, canhão, hélices e flutuação. Não há clipes de animação gravados nos GLBs. `disposeUnit` libera geometria e materiais compartilhados apenas dentro do próprio modelo.

Previews PNG/SVG em `previews/{kind}` e `previews/{kind}-blue` derivam dos vértices reais dos modelos por projeção ortográfica. `previews/miniaturas.png` e `previews/miniaturas-blue.png` reúnem cada equipe. São previews de catálogo; o mapa utiliza WebGL e modelos reais.

## Distintivos e peças originais

`lib/war/team-badges.ts` cria distintivos volumétricos leves: estrela dourada de cinco pontas para vermelho/13 e arma de brinquedo azul com contorno escuro para azul/22. Não utiliza logotipos comerciais. O grupo se chama `team-badge`; grupo, meshes e geometrias possuem `userData.teamBadge=true` para exclusão dos destroços. `faceTeamBadge(unit,camera)` compensa a rotação dos ancestrais e alinha o ícone à câmera sem girar a unidade.

`createUnit(kind,team,{badge:false})` omite o ícone, para previews de destroços. O batching preserva `mesh.geometry.userData.pieceRanges`: lista `{start,count,piece,shade,assembly}` de intervalos contíguos e completos dos vértices não indexados de cada primitiva original. Esses metadados permitem desmontar as mesmas peças do modelo sem substituir tudo por cubos genéricos. Os distintivos não recebem essa lista. A lista é um contrato da fábrica em tempo de execução; não se deve pressupor que o leitor GLB reconstrua esse metadado automaticamente.

## Modelos desmontados

`wrecks/miniaturas-destrocos.zip` contém dez GLBs estáticos (cinco tipos × duas equipes), manifesto e licença. Nomes: `{kind}-{red|blue}-broken.glb`. As peças são cópias dos intervalos originais do modelo, posicionadas por `ToyDebris.shatter` em estado assentado; cada variante possui de 22 a 88 peças. O soldado fica caído, com capacete solto; veículos deixam rodas, carcaça, canhão, asas ou hélices espalhados. Os distintivos não caem nem aparecem no GLB desmontado.

`previews/{kind}-{team}-broken.png` e `previews/miniaturas-broken.png` mostram as dez variantes. O manifesto guarda semente, equipe, número de peças, dimensões, hashes e proveniência. A mesma semente produz as mesmas posições para vermelho e azul; muda a paleta. A pose exportada é a pose visual final, sem simulação física ou clipes gravados. Inventário permanece intacto.

## Explosões

`explosions.png`: PNG RGBA transparente, 2.048 × 1.024, atlas 8 colunas × 4 linhas, 32 quadros de 256 × 256. Ordem de leitura: esquerda para direita, de cima para baixo. Reprodução a 25 fps, duração 1,28 s. Último quadro inteiramente transparente. Fundo quadriculado aparece apenas no contact sheet, não no atlas.

`lib/war/vfx.ts` coloca o atlas em sprites que acompanham a câmera dentro da cena 3D. Até 24 efeitos simultâneos; a instância mais antiga é liberada ao alcançar o limite. Fumaça/clarão desaparecem ao terminar. Efeitos visuais não alteram inventário ou resultado.

## Reproduzir os assets

```sh
node scripts/export-war-models.mjs
node scripts/export-war-wrecks.mjs
python scripts/rasterize-war-previews.py
python scripts/generate-war-sprites.py
node --test tests/war-assets.test.mjs tests/war-wreck-assets.test.mjs
```

Exportação usa Three.js já declarado no projeto. Rasterização e sprites usam Python/Pillow, sem conexão de rede. Os manifestos registram dimensões e hashes SHA-256. Licença/autoria dos modelos em `models/LICENSE.txt`; direitos acompanham o projeto do usuário.

Esta entrega fornece apresentação e animações. Não representa integração real do Instagram ou validação de balanceamento militar.

## Validação desta entrega — 2026-10-16

Oito testes automatizados de assets aprovados: dez combinações modelo/time, coordenadas finitas, apoio no chão, orçamento de geometria, animações, isolamento/descarte de materiais, partições dos intervalos das peças, símbolos/elevacão/omissão de distintivos, alinhamento dos distintivos com ancestrais rotacionados, estrutura/hash dos cinco GLBs, atlas RGBA e limites/expiração/descarte dos efeitos. TypeScript dos módulos passou com resolução das extensões TypeScript habilitada. ZIP conferido por CRC, sete entradas válidas. PNG conferido com Pillow, inclusive último quadro transparente. Contact sheets das duas equipes e explosão inspecionados. Isso não substitui a verificação WebGL do mapa completo feita na integração.

Dois testes adicionais dos modelos desmontados aprovados: estrutura/hash/material dos dez GLBs, preservação de todas as peças e triângulos originais, distintivos ausentes, chão e poses consistentes entre equipes; doze entradas do ZIP comparadas byte a byte com os arquivos e verificadas por CRC. Contact sheet das dez poses desmontadas inspecionado.
