# Projeto 2 — bases e batalha no mapa

## Direção confirmada pelo usuário em 2026-10-16

- Preservar o projeto de casas como Projeto 1 e criar uma cópia independente chamada Projeto 2.
- Trocar imóveis, prefeitura e cargos por bases, tropas e equipamentos de jogo: infantaria, canhões, aviões e drones explosivos estilizados.
- Converter a pontuação em poder/armamento do exército do participante.
- Participação proposta pelo usuário: comentar nome/perfil, estado e escolha 13 ou 22; time vermelho associado a PT/13, time azul associado a PL/22.
- Realizar batalha diária às 22h, horário de Brasília (`America/Sao_Paulo`), com duração de 5 a 10 minutos.
- Exibir a disputa ao vivo, colorir o mapa em vermelho/azul conforme os resultados e mostrar vencedores.
- A intenção inicial do usuário é que mais tropas levem à vitória.

Esses pontos descrevem a ideia solicitada, não funcionalidades já implementadas. O usuário confirmou a ordem de trabalho: **separar os projetos e definir as regras primeiro**. O protótipo visual fica para uma etapa posterior.

## Ordem atual de definição

| Tema | Estado |
| --- | --- |
| Separação dos projetos | Concluída: Projeto 1 preservado e Projeto 2 com Git local separado |
| Etapa atual | Confirmada: definição das regras antes do protótipo visual |
| Horário e duração | Direção do usuário: diariamente às 22h de Brasília; 5–10 minutos |
| Vitória | Direção inicial do usuário: maior exército vence; composição/posicionamento seguem apenas como alternativa sugerida |
| Vencedor nacional | Aguardando escolha: mais estados conquistados ou maior força nacional total |
| Continuidade entre dias | Aguardando escolha: reiniciar tropas/territórios, manter só territórios ou acumular ambos |
| Pontos convertidos em unidades | Intenção confirmada; valores, fontes e limites ainda por definir |
| Empates e troca de time | Ainda por definir |

Foram enviadas duas perguntas sobre vencedor nacional e continuidade entre dias. Nenhuma opção foi adotada automaticamente. Depois dessas decisões, definir inscrição por autor, momento de fechamento, ganho de unidades e limites por rodada. Não interpretar a decisão de definir regras primeiro como aprovação das propostas abaixo.

## Propostas do assistente — ainda não aprovadas

1. Apresentar 13/22 como times escolhidos voluntariamente **nesta partida**, sem inferir ou afirmar voto/filiação política real de uma pessoa a partir do perfil.
2. Usar as 27 unidades da federação como frentes. Cada estado teria bases vermelhas e azuis; o vencedor da frente pinta o estado e contribui para o resultado nacional. A interface deve mostrar contagens absolutas de participantes, além da cor.
3. Começar com três unidades fáceis de distinguir: infantaria, artilharia e apoio aéreo. Drones seriam uma evolução posterior, depois de validar a leitura da batalha.
4. Preferir uma sequência de 7 minutos de combate e até 1 minuto de resultado, dentro do máximo solicitado. Tempos por fase e empate ainda precisam de decisão.
5. Mais tropas dariam vantagem; composição, posições e tipos de unidade também poderiam alterar o resultado. Isso é uma alternativa à vitória garantida por quantidade, não uma regra aprovada.
6. Fechar um retrato das forças antes das 22h. O servidor produziria o combate com uma semente registrada; o navegador reproduziria os eventos, permitindo que todos acompanhassem o mesmo resultado e que atrasados retomassem a transmissão.
7. Contar participantes pelo identificador estável do Instagram, deduplicar comentários e definir limites de ganho antes de liberar a pontuação. Comentários repetidos não devem criar exércitos novos.
8. Iniciar com temporada/rodadas reiniciáveis para evitar que uma vantagem acumulada torne todas as próximas batalhas previsíveis. Recompensas permanentes poderiam ser cosméticas.

## Decisões em aberto

- Disputa nacional única, uma batalha por estado, ou confrontos entre bases individuais?
- Confirmar vitória estritamente por quantidade ou adotar composição/posicionamento?
- O exército reinicia diariamente? Tropas derrotadas são perdidas? Territórios persistem?
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

Um protótipo local, com dados fictícios e botão de iniciar uma batalha curta, mostrando duas bases em um estado e o resultado. Isso permitiria avaliar arte, ritmo e regras antes de conectar comentários reais ou agendar partidas. É uma proposta de próximo passo.
