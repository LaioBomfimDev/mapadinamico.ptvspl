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
