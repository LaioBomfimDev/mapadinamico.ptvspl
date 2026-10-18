# Projeto 2 — bases e batalha no mapa

## Direção confirmada pelo usuário em 2026-10-16

- **Foco atual:** desenvolver apenas o Projeto 2. O Projeto 1 fica preservado como histórico. Após o alinhamento, o usuário escolheu miniaturas e pediu explicitamente prosseguir com criação e melhorias.
- Preservar o projeto de casas como Projeto 1 e criar uma cópia independente chamada Projeto 2.
- Trocar imóveis, prefeitura e cargos por bases, tropas e equipamentos de jogo: infantaria, canhões, aviões e drones explosivos estilizados.
- Converter a pontuação em poder/armamento do exército do participante.
- Participação proposta pelo usuário: comentar nome/perfil, estado e escolha 13 ou 22; time vermelho associado a PT/13, time azul associado a PL/22.
- Realizar batalha diária às 22h, horário de Brasília (`America/Sao_Paulo`), com duração de 5 a 10 minutos.
- Exibir a disputa ao vivo, colorir o mapa em vermelho/azul conforme os resultados e mostrar vencedores.
- **Vitória nacional reconfirmada nesta conversa:** vence o time com maior força militar total. A redação importada de outro chat, que dizia maior número de inscritos, foi explicitamente rejeitada ao esclarecer a divergência. Pesos das unidades e desempate ainda estão em aberto.
- Escolha confirmada: **acumular tropas e territórios entre os dias**. Reinício diário não foi escolhido.
- **Perdas apenas visuais:** todo o exército acumulado permanece entre os dias. Pedido visual mais recente: bonecos caídos e equipamentos desmontados em suas próprias peças, como brinquedos, com destroços e marcas da guerra. No protótipo, ficam na sessão até reconstruir, iniciar outra batalha ou recarregar; esse momento de restauração é escolha de implementação para avaliação. Isso não autoriza apagar inventário ou reiniciar territórios.
- **Identificação adicional confirmada:** estrela dourada acima das unidades vermelhas/13 e arma de brinquedo acima das azuis/22, além das cores. Implementação e downloads em [DESTRUICAO_MINIATURAS.md](DESTRUICAO_MINIATURAS.md).
- Escolha confirmada: **cada estado fica com a cor do time que tiver maior força acumulada nele**, mantendo uma única batalha nacional.
- **Decisão atual, substitui a escolha anterior:** quem já criou uma base participa automaticamente de todas as batalhas seguintes, mesmo sem comentar novamente naquele dia. A inscrição permanece no mapa.
- Escolha confirmada: **montagem manual do exército, usando pontos do jogo para escolher e comprar armamento**. Evolução automática não foi escolhida.
- **Mapa confirmado nesta conversa:** geografia do IBGE para os 26 estados e o Distrito Federal; territórios dos 417 municípios da Bahia em suas posições geográficas e todos pesquisáveis. Decisão mais recente (17/10): retirar as ruas externas, mostrar nomes sem caixas e priorizar cidades com bases e o primeiro colocado no ranking; a cidade buscada continua destacada. A camada municipal da Bahia já foi implementada nesta etapa. **Decisão de 17/10 (mais recente):** sem linhas de divisa municipal; só os nomes. As bases ficam numa espiral dentro do raio real de cada cidade, sem baixar os contornos (ver MAPA_LIMPO.md).
- **Marechal municipal confirmado:** em cada cidade, o título pertence ao perfil com mais pontos daquela mesma cidade. Pontuação de outras cidades não entra nessa disputa. O protótipo agora associa bases ao código IBGE da cidade, mostra a disputa na ficha e calcula o título pelos pontos acumulados no histórico do perfil. Em empate, ninguém recebe o título até haver uma liderança única; esse tratamento de empate ainda é provisório.
- **Áreas pessoais confirmadas:** pode haver várias pessoas na mesma cidade; cada uma precisa ter sua própria área, e os níveis podem ampliá-la sem ultrapassar o limite municipal. O método de distribuir áreas sem sobreposição ainda precisa ser definido.
- Escolha confirmada: **vários comentários válidos geram pontos, com limite diário por perfil**. Valor por comentário e teto numérico ainda não foram escolhidos.
- **Identidade e ao vivo, pedido de 2026-10-17:** a marca passa a ser a logo 13/22 enviada pelo usuário (caricaturas dos dois lados) com o título **"Você é 13 ou 22?"**, no lugar de "Brasil em Batalha". Ao lado da logo: selo online e número de pessoas assistindo, por enquanto fictício (~60, mudando a cada 5 s em ~5%). Visitantes podem mandar super chat ou áudio, e quem está vendo a tela vê a mensagem subir ao vivo. Implementação, escolhas provisórias e limites em [AO_VIVO.md](AO_VIVO.md).
- Todas as bases inscritas contam para a força nacional e para a força do respectivo estado, inclusive sem novo comentário. A nota importada do outro chat sobre conflitos e propagação entre municípios continua como proposta a discutir, sem aprovação nesta conversa.

As regras foram alinhadas antes do protótipo. O usuário depois autorizou sua implementação com miniaturas. A entrega atual é uma demonstração local funcional, descrita em [PROTOTIPO_MINIATURAS.md](PROTOTIPO_MINIATURAS.md); integração real e estado compartilhado de produção permanecem pendentes. Valores numéricos experimentais não substituem decisões finais da campanha.

## Ordem atual de definição

| Tema | Estado |
| --- | --- |
| Separação dos projetos | Concluída: Projeto 1 preservado; Projeto 2 usa repositório independente `LaioBomfimDev/mapadinamico.ptvspl` |
| Etapa atual | Protótipo web e planta 3D disponíveis; Vercel preparada para importar o repositório. Campanha pública e serviços compartilhados continuam pendentes |
| Horário e duração | Direção do usuário: diariamente às 22h de Brasília; 5–10 minutos |
| Vitória | Direção inicial do usuário: maior exército vence; composição/posicionamento seguem apenas como alternativa sugerida |
| Vencedor nacional | Reconfirmado: maior força militar total em uma única batalha nacional |
| Continuidade entre dias | Confirmado: tropas e territórios acumulam entre os dias |
| Remoção e restauração visual | Peças desmontadas e boneco caído; inventário preservado. Protótipo restaura ao reconstruir, iniciar outra batalha ou recarregar; duração entre sessões e nomes pendentes |
| Cores dos estados | Confirmado: cor do time com maior força acumulada no estado |
| Participação diária | Confirmado pela alteração mais recente: toda base inscrita participa automaticamente, sem exigir novo comentário |
| Conversão de pontos | Confirmado: escolha manual de armamento com pontos do jogo |
| Pontos por comentário | Confirmado: vários comentários válidos, com limite diário por perfil; números pendentes |
| Bases sem comentário novo e território | Participam e contam para a força do estado pela inscrição permanente |
| Pontos convertidos em unidades | Intenção confirmada; valores, fontes e limites ainda por definir |
| Empates e troca de time | Ainda por definir |

O usuário reconfirmou a vitória por força militar total após esclarecer a contradição entre chats. Bases existentes batalham automaticamente, sem comentário diário obrigatório, e contam na força de seu estado. Permanecem pendentes valores de pontos/unidades, teto diário, identificação por perfil, desempates, apresentação das perdas e fechamento da rodada. Não interpretar propostas abaixo como decisões aprovadas.

### Consequências das escolhas confirmadas

- O vencedor nacional depende da soma da força militar das bases inscritas em cada time. O número de participantes, isoladamente, não decide a vitória. A fórmula e os pesos por equipamento ainda não foram definidos.
- A cor de um estado depende da comparação das forças dos participantes da batalha ali; com a inscrição permanente, todas as bases existentes entram na comparação mesmo sem comentário novo. Um time pode vencer nacionalmente e ainda ter menos força em alguns estados.
- Unidades atingidas viram destroços das mesmas peças, com infantaria caída. No protótipo a reconstrução restaura a apresentação sem alterar inventário ou força; persistência entre sessões e tratamento dos nomes ainda podem ser discutidos.
- Uma baixa mostrada durante o combate não remove permanentemente o equipamento nem autoriza apagar territórios acumulados.
- A batalha nacional inclui todos os exércitos inscritos. Deixar de comentar no dia não remove a base, não guarda o exército fora da batalha e não reduz sua força. Novos comentários podem dar pontos dentro do limite diário ainda por definir.
- A pessoa escolhe o que comprar; catálogo, preços, força por unidade, pontos não gastos, venda/troca e fechamento das compras ainda precisam de regras.
- A montagem manual exigirá definir um acesso pessoal à base. Buscar um @ no mapa não pode dar a qualquer visitante o poder de gastar os pontos daquele perfil. O mecanismo de autenticação ainda não foi escolhido ou implementado.
- Ainda é necessário decidir o fechamento dos dados às 22h, o momento de atualizar as cores e o tratamento de empates nacional/estadual.

## Propostas do assistente — ainda não aprovadas

1. Apresentar 13/22 como times escolhidos voluntariamente **nesta partida**, sem inferir ou afirmar voto/filiação política real de uma pessoa a partir do perfil.
2. **Formato de batalhas estaduais descartado pela escolha posterior:** a disputa será nacional. Os estados representam bases e controle pela força acumulada local, conforme escolha posterior do usuário.
3. A prévia traz infantaria, tanque, artilharia, drone e aeronave. O catálogo final, habilidades, custos e pesos de força continuam em aberto. Placar dinâmico com resumo e porcentagens foi registrado pelo outro chat e fica como proposta a alinhar aqui.
4. Preferir uma sequência de 7 minutos de combate e até 1 minuto de resultado, dentro do máximo solicitado. Tempos por fase e empate ainda precisam de decisão.
5. Composição e posições poderiam orientar a encenação da batalha. A regra reconfirmada dá a vitória nacional ao lado com maior força militar total; não foi aprovada uma simulação tática que inverta esse vencedor. Pesos de força e empate ainda precisam de regra.
6. Fechar um retrato das forças antes das 22h. O servidor produziria o combate com uma semente registrada; o navegador reproduziria os eventos, permitindo que todos acompanhassem o mesmo resultado e que atrasados retomassem a transmissão.
7. Contar participantes pelo identificador estável do Instagram, deduplicar comentários e definir limites de ganho antes de liberar a pontuação. Comentários repetidos não devem criar exércitos novos.
8. **Reinício diário descartado pela escolha posterior:** tropas e territórios acumulam. Temporadas, recuperação do lado derrotado e eventuais reinícios futuros ainda não foram escolhidos.

## Decisões em aberto

- Como calcular a força de cada equipamento e resolver empate na força militar nacional?
- Quantos pontos cada comentário válido dá e qual o teto diário por perfil?
- Qual o catálogo inicial, preços, força por unidade e tratamento dos pontos não gastos?
- Como o dono acessa sua base e autoriza compras sem permitir edição por outro visitante?
- Quando atualizar a cor dos estados e como resolver um empate local?
- Como a linha de frente avança entre municípios vizinhos e qual o alcance de cada rodada?
- Quando restaurar os elementos temporários da batalha e como apresentar nomes e equipamentos? Inventário e territórios acumulados não devem ser reiniciados sem nova decisão do usuário.
- Como tratar comentários duplicados, bots e contas duplicadas?
- Como equilibrar tamanhos de time, resolver empates e permitir trocar de time?
- O protótipo local exige o município oficial no comentário da Bahia e grava seu código IBGE. Antes de uma campanha pública, definir como validar que a cidade informada pertence ao participante e permitir correção/contestação sem misturar cidades.
- O Marechal é calculado por pontos acumulados no histórico do perfil, isolados por código IBGE municipal. A janela temporal (acumulado total ou semanal) e o tratamento final de empate ainda precisam de confirmação.
- Ocupação de cidades: definir como distribuir uma parcela independente por pessoa, como os níveis ampliam área sem sobreposição e o limite quando a cidade estiver cheia. A expansão deve permanecer dentro do polígono IBGE do próprio município.
- Transmissão no próprio site ou também vídeo em uma live do Instagram?
- Post oficial, orçamento, domínio e projeto da Vercel do Projeto 2. **Conta Instagram definida em 17/10:** `@vocee13ou22`, criada pelo usuário; requisitos e lacunas da conexão em [INTEGRACAO_INSTAGRAM.md](INTEGRACAO_INSTAGRAM.md).
- Chat ao vivo: qual serviço em tempo real leva super chat/áudio a todos os visitantes, onde guardar os áudios, como moderar antes de exibir, se o super chat é pago (dinheiro ou pontos) e quando trocar o contador fictício por conexões reais.

## Estado real da implementação

- Clone local separado do Projeto 1, baseado no commit `c9da86d`.
- Código e modelos de imóveis herdados preservados como legado; a home ativa agora usa mapa, bases e unidades de guerra próprios.
- Projeto 2 identificado no pacote/documentação e no título da aba. Remote Git independente: `https://github.com/LaioBomfimDev/mapadinamico.ptvspl.git`; sem `project_id` Sites.
- Não foram copiados banco local, dados de participação, variáveis de ambiente, credenciais, dependências instaladas ou caches.
- Implementados localmente exércitos, simulador de comentário/time, pontos com teto experimental, compras manuais, batalha visual por semente, cores estaduais, resultados e persistência no navegador. Não há scheduler, autenticação do dono da conta ou batalha compartilhada de produção. Nenhuma automação Codex ou campanha foi criada.
- `/cozinha-3d` é um editor 3D de cômodo 4 × 6 m, com peças movíveis, paredes alternáveis e salvamento local/exportação JSON.
- Build Vercel configurada na raiz do repositório, com Next.js, `npm ci`, `npm run build:vercel`, detecção padrão de saída e Node.js 22.x. A configuração não publica uma batalha autoritativa nem torna compartilhado o estado de jogo.
- `/arsenal` agora apresenta as cinco miniaturas próprias, cores vermelha/azul, teste de explosão e downloads GLB/ZIP. A prévia anterior foi preservada em `app/arsenal/legacy-preview.tsx`.
- Explosão integrada usa atlas transparente original de 32 quadros. Modelos GLB das unidades ficam em `public/war-assets/models/`; os imóveis herdados continuam em `public/models/`. Proveniência em [ASSETS.md](public/war-assets/ASSETS.md).
- **Bahia municipalizada no mapa:** 417 municípios do IBGE, polígonos intermediários e nomes oficiais, ligados por código do município. A geometria completa é carregada sob demanda ao abrir BA; as linhas de divisa são agrupadas em um único objeto WebGL. Ao selecionar a Bahia, aparecem limites e nomes prioritários de cidades com bases; a busca permite destacar qualquer um dos 417 municípios. Os nomes usam texto com contorno, sem caixas. As ruas externas foram removidas a pedido do usuário em 17/10. A camada municipal não marca a coordenada da sede urbana. Dados e reprodução em `scripts/sync-ibge.mjs`, `public/war-assets/bahia-municipalities.json` e `public/war-assets/bahia-municipality-index.json`.
- **Busca e seleção municipal:** os 417 nomes da Bahia são pesquisáveis. Selecionar ou tocar uma cidade na Bahia centraliza o mapa, prioriza o rótulo, destaca o polígono em amarelo e identifica o município pelo código IBGE na interface. O índice leve de nomes e pontos internos é de cerca de 47 KiB; a geometria de cerca de 788 KiB só é baixada quando BA é selecionada. Catu está no conjunto com código `2907509`.
- **Revisão de desempenho em 2026-10-17:** retirado `preserveDrawingBuffer`, reduzida a resolução interna do canvas e a sombra para aliviar GPU, desativada a atualização de sombra em cada redesenho, agrupadas as divisas municipais e o cálculo de colisões de rótulos passou a ocorrer apenas quando câmera/seleção mudam. O `requestAnimationFrame` agora acorda em interação/animação e para em repouso; durante movimento usa a cadência do navegador, sem o limite artificial de 30 FPS. Busca, centralização e destaque amarelo de Catu foram conferidos em Chromium local; TypeScript e build Vercel passaram. FPS em aparelho físico não foi medido e nenhuma implantação Vercel foi feita nesta revisão.
- **Lógica municipal da Bahia:** o cadastro de teste reconhece os nomes oficiais dos 417 municípios e registra o código IBGE no perfil. Repetir o cadastro não permite trocar cidade, estado ou time; perfis antigos sem cidade podem vinculá-la uma vez. Ao carregar os polígonos IBGE, o mapa distribui bases de cada cidade em lotes próprios dentro daquele limite e recorta as linhas estilizadas ao mesmo polígono. A ficha exibe ranking municipal por pontos acumulados e Marechal único; cidades diferentes não compartilham pontos. Não há regra de “primeiro participante”. Ocupação por níveis e expansão visual de uma área pessoal ainda não estão implementadas; o lote da base nesta prévia não é um sistema final de propriedade ou conquista.
- Estudos gratuitos de arte (arquivos na saída do PixelLab; não integrados ao repositório; sem créditos de geração): [sprite de tanque](https://api.pixellab.ai/mcp/pixel-tools/cb1c54a7-7680-4035-99ac-f585b2b6a740/assets/topdown/full.png), [folha de infantaria/drone/artilharia/apoio aéreo](https://api.pixellab.ai/mcp/pixel-tools/f84da9b4-4b81-4dbe-a5ec-bea2ec9b1d60/assets/units/full.png), [GIF de explosão de área](https://api.pixellab.ai/mcp/pixel-tools/0f60cb3e-a511-4df1-b795-54b4659bebff/projeto2-explosao-area-drone.gif).
- As verificações anteriores validam a base do mapa; não validam batalha, balanceamento ou integração Instagram real.
- **Ligação municipal e Marechal, 2026-10-17:** o comentário de cadastro da Bahia segue `@perfil Catu BA 13` (nome oficial + BA + time). O ID do município é persistido na base e permanece bloqueado para evitar troca oportunista da disputa. Bases fictícias antigas recebem códigos de cidades amostrais; perfis reais BA antigos sem município podem vinculá-lo uma vez na ficha. O ranking usa os pontos já ganhos no histórico (`progress`), sem subtrair compras. No empate do maior total, não há Marechal até surgir uma liderança única. Em visão nacional, bases BA ficam no ponto interno do município; ao abrir a Bahia, lotes são recalculados pelos polígonos IBGE para cada base ficar dentro do próprio município e ter um lote próprio. Atualização de 17/10: a camada de ruas foi retirada e os nomes seguem a hierarquia do ranking descrita em MAPA_LIMPO.md. Tudo permanece local no navegador, sem autenticação nem estado compartilhado.
- **Logo 13/22, contador e chat ao vivo, 2026-10-17:** logo enviada pelo usuário no cabeçalho, título "Você é 13 ou 22?", selo AO VIVO com contador fictício (~60, 5 s, ≤5%) e chat com super chat em texto ou áudio de até 15 s subindo pela tela. Nesta prévia as mensagens chegam só às abas abertas do mesmo navegador (`BroadcastChannel`); sem servidor, pagamento ou moderação. Detalhes e verificação em [AO_VIVO.md](AO_VIVO.md).
- **Servidor do jogo no Supabase, 2026-10-17 (escolha do usuário):** migrações em `supabase/migrations/` (bases, histórico de pontos, recibos de comentário, compras idempotentes, batalhas, chat ao vivo e áudios), tudo fechado para o navegador exceto a leitura das mensagens recentes do chat. Rotas `GET /api/game` (mapa compartilhado, atualização a cada 20 s), `POST /api/game/admin` (cadastro/compra com `MAP_ADMIN_TOKEN`, script `scripts/game-admin.mjs`) e `GET/POST /api/live` (super chat e áudio para todos, tempo real do Supabase com consulta a cada 3 s como reserva). Sem as variáveis do Supabase, o site continua na demonstração local. Com o servidor, as ações locais (simulador de comentário, compras, eventos e reinício) ficam desativadas; compras online esperam o acesso do dono à base. Batalha das 22h no servidor e conexão real com o Instagram continuam pendentes. Configuração em [CONFIGURAR_SUPABASE.md](CONFIGURAR_SUPABASE.md); 78 testes e build de produção aprovados, incluindo testes do SQL em Postgres embutido (`scripts/supabase-local.mjs`). Não verificado contra um projeto Supabase real.
- **Receptor do Instagram e páginas legais, 2026-10-17 (pedido do usuário):** `/api/instagram/webhook` agora cria/pontua bases no Supabase a partir de comentários assinados pela Meta (formato `SP 22` / `Catu BA 13`, @ e ID vindos da Meta). Páginas `/privacidade`, `/termos` e `/exclusao-de-dados`, com links no rodapé do mapa; exclusão executada por `scripts/game-admin.mjs apagar @perfil`. 85 testes e build aprovados. Textos legais são rascunho do assistente para revisão do usuário. Detalhes, endereços para o painel da Meta e o caminho por consulta com Acesso Padrão em [INTEGRACAO_INSTAGRAM.md](INTEGRACAO_INSTAGRAM.md).

## Primeira entrega sugerida

Entregue o protótipo local com dados fictícios, mapa vazio opcional, arsenal e batalha acelerada. Agora o usuário pode avaliar arte, ritmo e valores antes da integração real. A próxima etapa de produção requer backend autoritativo, acesso pessoal à base, banco, conta/post Instagram e agendamento compartilhado; não foi declarada concluída por esta prévia.
