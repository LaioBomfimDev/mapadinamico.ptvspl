# Projeto 2 — alinhamento do mapa e da arte

Registro de 2026-10-16. O usuário pediu alinhar as ideias antes de prosseguir com implementação, pois houve mistura de decisões entre chats. Esta ficha distingue decisões, propostas e código existente.

**Atualização posterior:** usuário escolheu miniaturas e pediu prosseguir com criação e melhorias. Mapa IBGE, ruas, cinco unidades 3D, sprites de explosão e protótipo local foram implementados. Estado atual em [PROTOTIPO_MINIATURAS.md](PROTOTIPO_MINIATURAS.md); as seções de inspeção abaixo registram a situação anterior à implementação. Números da economia, empates e apresentação das fases continuam experimentais.

**Pedido visual seguinte, implementado:** miniaturas desmontam nas próprias peças, infantaria fica caída, marcas e destroços permanecem na sessão. Estrela dourada acima do vermelho/13 e arma de brinquedo acima do azul/22. Galeria permite explodir/reconstruir. [Comportamento, limites e downloads](DESTRUICAO_MINIATURAS.md). O momento de limpar o campo na sessão é uma escolha do protótipo, não uma decisão adicional do usuário.

## Confirmado diretamente nesta conversa

- Desenvolvimento ativo apenas do Projeto 2; Projeto 1 preservado como histórico.
- Usar geografia do IBGE para os estados brasileiros e o Distrito Federal.
- Ruas retas estilizadas para organizar as bases. Reproduzir rodovias reais não foi escolhido.
- Vence a maior força militar total. O texto de outro chat sobre vitória por quantidade de inscritos foi esclarecido e substituído.
- Toda base já inscrita participa automaticamente, mesmo sem comentário naquele dia.
- As regras de acúmulo de tropas, perdas apenas visuais, montagem manual com pontos e cores estaduais pela força acumulada permanecem conforme [PROJETO_2.md](PROJETO_2.md).

## Proposta de mapa — ainda para discutir

- Usar a API de Localidades para identificadores, nomes e siglas oficiais; usar a API de Malhas v3 para os contornos.
- Preparar uma versão leve e armazenada do mapa para o navegador, registrando origem e período dos dados. Não depender de baixar a malha inteira a cada visita.
- Manter os contornos estaduais geográficos. Desenhar as ruas retas como uma camada do cenário, recortada ao território e organizada em quadras para as bases.
- Na visão nacional, mostrar cores estaduais e agrupamentos com contagem/força. Aproximar a câmera para revelar bases e equipamentos individuais.
- Não colocar automaticamente todos os municípios detalhados na primeira tela. Conquista municipal, propagação e necessidade de município no cadastro continuam pendentes.

A API de Malhas fornece limites administrativos simplificados, com formatos GeoJSON, TopoJSON e SVG. Ela não fornece uma rede de ruas retas para as bases. Fontes consultadas: [Malhas v3](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3) e [Localidades](https://servicodados.ibge.gov.br/api/docs/localidades).

## Proposta de arte — ainda para discutir

- Unidades como miniaturas 3D estilizadas, com poucos polígonos: infantaria, tanque, canhão/artilharia, drone e aeronave como catálogo inicial sugerido.
- Usar a mesma família de modelos para os dois times, com identificação vermelha/azul. Evitar que a aparência de um time sugira vantagem mecânica não definida nas regras.
- Modelos finais em GLB, com escala, orientação e pontos de disparo consistentes. Animações sugeridas: repouso, deslocamento, ataque e perda visual.
- Explosões em folhas de quadros 2D com transparência, exibidas em planos voltados para a câmera dentro da cena 3D. Isso permite unidades volumétricas e efeitos em sprites no mesmo mapa.
- Efeitos sugeridos: clarão de disparo, impacto pequeno, explosão maior e fumaça. Quantidade de quadros, resolução, duração e estilo ainda não escolhidos.
- Preferência proposta pelo assistente: explosões desenhadas com bordas suaves e estilo compatível com as miniaturas. Pixel art e realismo continuam alternativas a discutir, não decisões aprovadas.

## Evidência da implementação atual

Inspeção de arquivos, sem nova execução de gameplay nesta etapa:

- `public/brazil-geometry.json` contém 27 entradas de geometria estadual; é a base herdada do mapa.
- `components/world-3d.tsx` ainda renderiza o mapa e os imóveis herdados; as unidades da prévia não estão ligadas à batalha ou às bases.
- `app/arsenal/page.tsx` contém cinco modelos 3D procedurais provisórios: infantaria, tanque, artilharia, drone e aeronave.
- A explosão dessa página usa partículas 3D com geometria `IcosahedronGeometry`, seguida de reaparecimento demonstrativo do equipamento. Não é uma folha de sprites nem um combate real.
- Os arquivos GLB de `public/models/` ainda representam imóveis. Não há exportações GLB finais das unidades nesse diretório.
- Há links de estudos de sprites e GIF no documento de regras, mas esses efeitos não estão integrados ao renderizador do mapa.
- Há dados municipais locais novos, inclusive um GeoJSON de aproximadamente 41,7 MB; presença do arquivo não comprova integração ou validação da malha. Esses dados foram preservados.

## Próximas decisões de conversa

1. Aparência das unidades: miniaturas estilizadas escolhidas pelo usuário; revisão visual da entrega pendente.
2. Aparência das explosões: desenho suave, pixel art ou realista?
3. Escala de navegação: Brasil → estado → base, e necessidade ou não de municípios.
4. Pesos de força, preços e limite diário de pontos, depois de fechar a direção visual.

Nenhum novo modelo, sprite, combate, agendamento, integração Instagram ou publicação foi implementado durante este alinhamento.
