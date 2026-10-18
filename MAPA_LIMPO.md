# Mapa com hierarquia de nomes — 2026-10-17

Pedido mais recente do usuário: remover as linhas das ruas e aproximar a apresentação de `naoeummapa.vercel.app`, com nomes em texto e destaque apenas para os primeiros colocados. Esta decisão substitui a escolha anterior de ruas retas no mapa e nomes de todos os municípios simultaneamente.

## Resultado

- Ruas externas e grade do oceano removidas do renderizador. Os polígonos e limites administrativos do IBGE continuam disponíveis; a organização interna dos quarteis é parte da miniatura.
- Nomes das cidades em branco, com contorno escuro; perfil do primeiro colocado em amarelo abaixo do nome. Não há caixa, fundo arredondado ou desenho de botão nesses rótulos.
- Uma cidade só gera rótulo se tiver base cadastrada. O primeiro colocado usa pontos acumulados do ranking municipal existente; a busca de uma cidade sem base cria um rótulo temporário prioritário. Todos os 417 municípios da Bahia continuam pesquisáveis.
- Os rótulos de cidades disputam espaço por posição no ranking, com prevenção de sobreposição e limite por tela/zoom. Não se criam 417 texturas de nome antecipadamente.
- Nomes de bases individuais aparecem para a base selecionada ou para o líder estadual, em zoom apropriado. O primeiro estadual usa força militar. Empates usam a mesma ordem estável do ranking para escolher a primeira linha visual; isso não concede um Marechal onde a regra existente determina empate.
- Clicar no texto do líder da cidade abre a ficha militar e o link `?u=perfil`. Base ou nome pesquisado também abrem a ficha.
- O Marechal usa uma pequena coroa junto ao @; o título detalhado fica na ficha. Não há uma faixa de texto atravessando as tropas.
- Marcadores distantes usam um sprite com estrela ou arma. Quarteis e tropas volumétricas aparecem quando o zoom e o tamanho em tela permitem enxergá-los. O foco em uma base municipal pequena pode ampliar além do antigo limite de 100×, mantendo as vagas separadas.
- A busca dá prioridade ao nome/sigla exatos: `BA` ou `Bahia` selecionam o estado antes de municípios que contenham “Bahia”.

## Ficha e participação

A ficha militar implementada nesta sequência apresenta saldo disponível, origem dos créditos, inventário, patamar por força, rankings, progresso, ações para ganhar pontos, histórico e imagem PNG de story. A abertura de links, cópia de convite ou geração de imagem não dá pontos. O simulador local exige confirmação fictícia do evento e aplica deduplicação/limites antes de creditar. Instagram real, autenticação e estado compartilhado continuam pendentes.

Valores sociais permanecem experimentais: story confirmado +30/dia, marcação +3 até 10/dia, primeiro convite convertido em inscrição +25 até 5/dia, apoio +5 até 20/dia. A regra anterior de comentários permanece +10 até cinco/dia. Compras reduzem o saldo sem apagar os pontos acumulados do histórico.

## Evidência

49 testes automatizados aprovados, incluindo seleção de líderes, desempate visual estável, limites de rótulos, sobreposição, cidade pesquisada, pontos, inventário, deduplicação, geografia, modelos, destroços e adaptador Vercel. O teste de ruas recortadas preservado cobre o utilitário geográfico histórico; esse utilitário não é chamado pelo renderizador atual.

No navegador: busca `Bahia` e `BA` levou ao estado; zero malhas de rua; quatro candidatas de cidades nos dados locais, com uma visível no enquadramento estadual por proximidade entre elas. Texto `Catu / @voce_demo` sem fundo conferido; clique no nome abriu a ficha de `@voce_demo`. O contador de chamadas de desenho é diagnóstico local, não uma medição de FPS em aparelho físico ou de desempenho online.

Fluxo de participação conferido no navegador de desenvolvimento: `@comandante_visual Catu BA 13` criou três soldados e saldo10. Gerar o PNG1080×1920 não mudou o saldo; processar story sem confirmação foi recusado. Confirmação fictícia levou o saldo a40. Comprar artilharia consumiu40, aumentou força30→85 e unidades3→4, mantendo40pontos registrados. Nenhum evento real foi enviado ao Instagram.

Build final Next/Vercel concluída com compilação, TypeScript e onze páginas geradas, saída0. Produção local reiniciada na porta5183; Bahia aberta com nomes sem caixas, zero malhas de rua e quatro cidades candidatas. Foco de `@voce_demo` chegou a598,20× e mostrou o quartel com as cinco vagas e a coroa pequena fora das tropas. Console capturado sem erros/avisos. Ficha conferida em390×844, sem rolagem horizontal (largura390). Viewport restaurado. Capturas em `outputs/mapa-limpo/bahia-producao.png`, `quartel-ficha-producao.png` e `ficha-mobile-producao.png`.

## Nomes das cidades com exército — 17/10/2026

Pedido do usuário: deixar aparecer os nomes das cidades que já têm exército, em vez de só Catu.

**Causa observada:** a demonstração tem exército em apenas quatro cidades da Bahia (Salvador, Feira de Santana, Alagoinhas e Catu), todas a menos de ~110 km umas das outras. Cada nome ficava centralizado na cidade e, quando dois nomes se encostavam, o de menor posição no ranking era escondido. Catu vence porque @voce_demo é o único líder com pontos no histórico. Na visão da Bahia aparecia 1 de 4; os quatro só surgiam a partir de ~22×. Fora da Bahia as bases não têm município, então não há nome de cidade.

**Mudança:** cidade isolada mantém o nome centralizado. Quando há outra cidade com exército por perto, o nome vai para o lado (direita, esquerda, cima, baixo ou diagonais); se nem assim couber, mostra só o nome da cidade, sem a linha do @. Nada é sobreposto, o limite por tela continua e a cidade buscada continua com prioridade. A versão só com o nome é criada apenas quando usada.

**Verificação:** 63 testes aprovados (3 novos: cidade isolada centralizada, grupo de cidades vizinhas lado a lado, recurso ao nome curto e grupos aleatórios sem sobreposição). No navegador (1366×768), visão da Bahia: 2 de 4 nomes (antes 1); 6,6×: 3; a partir de ~10×: 4 (antes só a 22×). No celular, Alagoinhas, Catu e Salvador apareceram juntos em ~10×. O número de nomes continua limitado pelas cidades que de fato têm bases.

**Demonstração espalhada pela Bahia (pedido do usuário, 17/10):** 24 bases fictícias novas em Vitória da Conquista, Juazeiro, Ilhéus, Barreiras, Itabuna, Porto Seguro, Jequié, Teixeira de Freitas, Camaçari, Lauro de Freitas, Paulo Afonso, Irecê, Bom Jesus da Lapa, Guanambi, Santo Antônio de Jesus, Senhor do Bonfim, Valença, Luís Eduardo Magalhães, Jacobina, Eunápolis, Brumado, Itaberaba, Lençóis e Xique-Xique (códigos IBGE conferidos no índice local, lista em `BAHIA_DEMO_CITIES`). Vermelho e azul se alternam com exércitos iguais em cada par, então o placar continua com o azul vencendo por força com menos bases (17.140 × 17.015; 52 × 54 bases). Os pontos fictícios (25–170) dão prioridade às cidades maiores; Catu/@voce_demo segue em primeiro. Demonstrações já salvas recebem as bases que faltam ao recarregar; um mapa vazio continua vazio. No navegador (1366×768): Bahia inteira 9 de 28 nomes, 3,6× 14, 8× 21, com miniaturas visíveis; no celular a 8×, 8 nomes (limite da tela pequena).

## Sem linhas de divisa municipal — 17/10/2026

**Pedido do usuário:** remover as linhas dos limites das cidades (demoravam para carregar e pesavam no desempenho), deixar só os nomes e distribuir as bases ponto a ponto conforme a cidade cresce, sempre dentro da posição real da cidade.

- O mapa não baixa mais `bahia-municipalities.json` (787 KB) nem desenha as divisas, o destaque amarelo ou o clique pelo polígono. Usa só o índice leve, que ganhou o campo `radius`: a distância do ponto do nome até a divisa mais próxima (`scripts/add-city-radius.mjs`; `sync-ibge.mjs` já grava o campo). O índice passou de 47 para 54 KB.
- Cada cidade recebe uma espiral (padrão girassol) a partir do ponto do nome, uma base por vez em ordem de chegada. O círculo do raio cabe inteiro na cidade; até 24 bases cada uma mantém o seu lugar e, acima disso, a espiral se aperta. Os quartéis nunca se encostam.
- Os nomes das cidades passaram para a altura do chão; antes ficavam 0,19 acima e, em zoom alto, apareciam centenas de pixels longe das bases.
- A cidade continua pesquisável pelo nome (busca ou clique no nome); clicar no terreno vazio não seleciona mais a cidade.

**Verificação:** teste com as divisas reais do IBGE mantidas no repositório: para as 417 cidades, com 1, 7, 24 e 80 bases, todos os cantos de todos os quartéis caem dentro do polígono oficial; sem sobreposição; posições estáveis ao crescer. 88 testes e build aprovados. No navegador: abrir a Bahia baixa só o índice leve; 9 de 28 nomes na visão do estado; Catu com 7 bases de teste mostrou 7 quartéis separados em espiral em volta do nome, sem linhas (bases de teste removidas depois). Em Node, distribuir 28 cidades caiu de 9,9 ms para 1,3 ms, sem contar o download de 787 KB e as milhares de linhas que deixaram de existir. FPS em aparelho físico não medido.
