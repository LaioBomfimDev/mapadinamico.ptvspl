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
- **Perdas apenas visuais:** todo o exército acumulado permanece entre os dias. A prévia importada do outro chat faz o equipamento desaparecer e reaparecer; momento de restauração, nomes e efeitos ainda precisam de alinhamento visual. Isso não autoriza apagar inventário ou reiniciar territórios.
- Escolha confirmada: **cada estado fica com a cor do time que tiver maior força acumulada nele**, mantendo uma única batalha nacional.
- **Decisão atual, substitui a escolha anterior:** quem já criou uma base participa automaticamente de todas as batalhas seguintes, mesmo sem comentar novamente naquele dia. A inscrição permanece no mapa.
- Escolha confirmada: **montagem manual do exército, usando pontos do jogo para escolher e comprar armamento**. Evolução automática não foi escolhida.
- **Mapa confirmado nesta conversa:** geografia do IBGE para os 26 estados e o Distrito Federal; ruas retas estilizadas para organizar as bases. Não foi escolhido reproduzir rodovias reais. Propostas de apresentação e evidências dos modelos em [DIRECAO_VISUAL.md](DIRECAO_VISUAL.md).
- Escolha confirmada: **vários comentários válidos geram pontos, com limite diário por perfil**. Valor por comentário e teto numérico ainda não foram escolhidos.
- Todas as bases inscritas contam para a força nacional e para a força do respectivo estado, inclusive sem novo comentário. A nota importada do outro chat sobre conflitos e propagação entre municípios continua como proposta a discutir, sem aprovação nesta conversa.

As regras foram alinhadas antes do protótipo. O usuário depois autorizou sua implementação com miniaturas. A entrega atual é uma demonstração local funcional, descrita em [PROTOTIPO_MINIATURAS.md](PROTOTIPO_MINIATURAS.md); integração real e estado compartilhado de produção permanecem pendentes. Valores numéricos experimentais não substituem decisões finais da campanha.

## Ordem atual de definição

| Tema | Estado |
| --- | --- |
| Separação dos projetos | Concluída: Projeto 1 preservado e Projeto 2 com Git local separado |
| Etapa atual | Protótipo local com miniaturas implementado; 22 testes e build Next aprovados, verificação visual executada |
| Horário e duração | Direção do usuário: diariamente às 22h de Brasília; 5–10 minutos |
| Vitória | Direção inicial do usuário: maior exército vence; composição/posicionamento seguem apenas como alternativa sugerida |
| Vencedor nacional | Reconfirmado: maior força militar total em uma única batalha nacional |
| Continuidade entre dias | Confirmado: tropas e territórios acumulam entre os dias |
| Remoção e restauração visual | Baixas apenas visuais; inventário preservado. Momento de restauração e tratamento dos nomes pendentes |
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
- Unidades podem desaparecer temporariamente como representação de perdas. A restauração dessa apresentação e o tratamento dos nomes ainda precisam ser discutidos; inventário e força acumulada permanecem preservados.
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
- O ponto da base representa apenas o estado ou também uma cidade opcional? O novo formato não fornece cidade; não reutilizar automaticamente o parser de municípios.
- Transmissão no próprio site ou também vídeo em uma live do Instagram?
- Nome público, conta Instagram, post oficial, orçamento, domínio e repositório remoto do Projeto 2.

## Estado real da implementação

- Clone local separado do Projeto 1, baseado no commit `c9da86d`.
- Código e modelos de imóveis herdados preservados como legado; a home ativa agora usa mapa, bases e unidades de guerra próprios.
- Projeto 2 identificado no pacote/documentação e no título da aba. Configuração atual sem `project_id` Sites e sem Git remote.
- Não foram copiados banco local, dados de participação, variáveis de ambiente, credenciais, dependências instaladas ou caches.
- Implementados localmente exércitos, simulador de comentário/time, pontos com teto experimental, compras manuais, batalha visual por semente, cores estaduais, resultados e persistência no navegador. Não há scheduler, autenticação do dono da conta ou batalha compartilhada de produção. Nenhuma automação Codex ou campanha foi criada.
- `/arsenal` agora apresenta as cinco miniaturas próprias, cores vermelha/azul, teste de explosão e downloads GLB/ZIP. A prévia anterior foi preservada em `app/arsenal/legacy-preview.tsx`.
- Explosão integrada usa atlas transparente original de 32 quadros. Modelos GLB das unidades ficam em `public/war-assets/models/`; os imóveis herdados continuam em `public/models/`. Proveniência em [ASSETS.md](public/war-assets/ASSETS.md).
- Estudos gratuitos de arte (arquivos na saída do PixelLab; não integrados ao repositório; sem créditos de geração): [sprite de tanque](https://api.pixellab.ai/mcp/pixel-tools/cb1c54a7-7680-4035-99ac-f585b2b6a740/assets/topdown/full.png), [folha de infantaria/drone/artilharia/apoio aéreo](https://api.pixellab.ai/mcp/pixel-tools/f84da9b4-4b81-4dbe-a5ec-bea2ec9b1d60/assets/units/full.png), [GIF de explosão de área](https://api.pixellab.ai/mcp/pixel-tools/0f60cb3e-a511-4df1-b795-54b4659bebff/projeto2-explosao-area-drone.gif).
- As verificações anteriores validam a base do mapa; não validam batalha, balanceamento ou integração Instagram real.

## Primeira entrega sugerida

Entregue o protótipo local com dados fictícios, mapa vazio opcional, arsenal e batalha acelerada. Agora o usuário pode avaliar arte, ritmo e valores antes da integração real. A próxima etapa de produção requer backend autoritativo, acesso pessoal à base, banco, conta/post Instagram e agendamento compartilhado; não foi declarada concluída por esta prévia.
