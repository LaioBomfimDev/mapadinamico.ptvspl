# Projeto 2 — bases e batalha no mapa

## Direção confirmada pelo usuário em 2026-10-16

- Preservar o projeto de casas como Projeto 1 e criar uma cópia independente chamada Projeto 2.
- Trocar imóveis, prefeitura e cargos por bases, tropas e equipamentos de jogo: infantaria, canhões, aviões e drones explosivos estilizados.
- Converter a pontuação em poder/armamento do exército do participante.
- Participação proposta pelo usuário: comentar nome/perfil, estado e escolha 13 ou 22; time vermelho associado a PT/13, time azul associado a PL/22.
- Realizar batalha diária às 22h, horário de Brasília (`America/Sao_Paulo`), com duração de 5 a 10 minutos.
- Exibir a disputa ao vivo, colorir o mapa em vermelho/azul conforme os resultados e mostrar vencedores.
- A intenção inicial do usuário é que mais tropas levem à vitória.
- Escolha confirmada: **uma batalha nacional; vence o time com maior força militar total**.
- Escolha confirmada: **acumular tropas e territórios entre os dias**. Reinício diário não foi escolhido.

Esses pontos descrevem a ideia solicitada, não funcionalidades já implementadas. O usuário confirmou a ordem de trabalho: **separar os projetos e definir as regras primeiro**. O protótipo visual fica para uma etapa posterior.

## Ordem atual de definição

| Tema | Estado |
| --- | --- |
| Separação dos projetos | Concluída: Projeto 1 preservado e Projeto 2 com Git local separado |
| Etapa atual | Confirmada: definição das regras antes do protótipo visual |
| Horário e duração | Direção do usuário: diariamente às 22h de Brasília; 5–10 minutos |
| Vitória | Direção inicial do usuário: maior exército vence; composição/posicionamento seguem apenas como alternativa sugerida |
| Vencedor nacional | Confirmado: maior força militar total em uma única batalha nacional |
| Continuidade entre dias | Confirmado: tropas e territórios acumulam entre os dias |
| Perdas de combate | Aguardando escolha: unidades destruídas são perdidas ou baixas apenas visuais |
| Cores dos estados | Aguardando escolha: controle por força acumulada local ou conquista gradual pelo vencedor nacional |
| Pontos convertidos em unidades | Intenção confirmada; valores, fontes e limites ainda por definir |
| Empates e troca de time | Ainda por definir |

O usuário respondeu às perguntas sobre vencedor e continuidade. Foram enviadas as perguntas seguintes sobre perdas e cores dos estados; nenhuma resposta foi presumida. Depois dessas decisões, definir inscrição por autor, momento de fechamento, ganho de unidades e limites por rodada. Não interpretar a decisão de definir regras primeiro como aprovação das propostas abaixo.

## Propostas do assistente — ainda não aprovadas

1. Apresentar 13/22 como times escolhidos voluntariamente **nesta partida**, sem inferir ou afirmar voto/filiação política real de uma pessoa a partir do perfil.
2. **Formato de batalhas estaduais descartado pela escolha posterior:** a disputa será nacional. Os estados continuam como referência visual para bases e territórios; a regra de cores ainda precisa de decisão.
3. Começar com três unidades fáceis de distinguir: infantaria, artilharia e apoio aéreo. Drones seriam uma evolução posterior, depois de validar a leitura da batalha.
4. Preferir uma sequência de 7 minutos de combate e até 1 minuto de resultado, dentro do máximo solicitado. Tempos por fase e empate ainda precisam de decisão.
5. **Não aprovada como alteração do vencedor:** composição, posições e tipos de unidade poderiam influenciar o combate. A decisão atual mantém a vitória do time com maior força militar total; pesos das unidades e empates ainda serão definidos.
6. Fechar um retrato das forças antes das 22h. O servidor produziria o combate com uma semente registrada; o navegador reproduziria os eventos, permitindo que todos acompanhassem o mesmo resultado e que atrasados retomassem a transmissão.
7. Contar participantes pelo identificador estável do Instagram, deduplicar comentários e definir limites de ganho antes de liberar a pontuação. Comentários repetidos não devem criar exércitos novos.
8. **Reinício diário descartado pela escolha posterior:** tropas e territórios acumulam. Temporadas, recuperação do lado derrotado e eventuais reinícios futuros ainda não foram escolhidos.

## Decisões em aberto

- Como calcular a força militar total de unidades diferentes e resolver empates?
- Tropas destruídas são perdidas de verdade ou as baixas são apenas visuais?
- Como o resultado nacional altera o controle de cada estado e os territórios acumulados?
- Como cada ação dá tropas, qual limite por pessoa/dia e como tratar bots/contas duplicadas?
- Como equilibrar tamanhos de time, resolver empates e permitir trocar de time?
- O ponto da base representa apenas o estado ou também uma cidade opcional? O novo formato não fornece cidade; não reutilizar automaticamente o parser de municípios.
- Transmissão no próprio site ou também vídeo em uma live do Instagram?
- Nome público, conta Instagram, post oficial, orçamento, domínio e repositório remoto do Projeto 2.

## Estado real da implementação

- Clone local separado do Projeto 1, baseado no commit `c9da86d`.
- Código, mapa 3D, modelos de imóveis e APIs originais preservados como base técnica; não são ainda modelos de guerra.
- Projeto 2 identificado no pacote/documentação e no título da aba. Configuração atual sem `project_id` Sites e sem Git remote.
- Não foram copiados banco local, dados de participação, variáveis de ambiente, credenciais, dependências instaladas ou caches.
- Não há exércitos, parser de times, pontuação militar, scheduler, combate, streaming ou resultado diário implementados. Nenhuma automação Codex ou campanha foi criada.
- As verificações anteriores validam a base do mapa; não validam batalha, balanceamento ou integração Instagram real.

## Primeira entrega sugerida

Depois de fechar as regras, um protótipo local com dados fictícios e botão de iniciar uma batalha curta, mostrando dois times no mapa do Brasil e o resultado nacional. Isso permitiria avaliar arte, ritmo e regras antes de conectar comentários reais ou agendar partidas. É uma proposta de próximo passo; a etapa atual permanece definição.
