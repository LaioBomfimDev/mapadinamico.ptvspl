# Mapa: legibilidade, zoom e carregamento — 17/10/2026

## Decisão confirmada

O usuário pediu nomes maiores e semelhantes à referência, sem o amarelo, mais fluidez no zoom e na renderização e uma abertura clara de aproximadamente 3–4 segundos. Permanecem os nomes sem caixas, os destaques dos líderes e a ausência de ruas externas. A biblioteca Three.js já instalada foi suficiente; nenhuma dependência nova ou asset pago foi necessário.

## Implementação

- Texto branco com contorno escuro. Cidade com fonte equivalente a 23px no desktop / 20px no celular; @ na segunda linha equivale a aproximadamente 19px / 16px. Nome individual de base: 19px / 17px. O tamanho segue a medida real do texto, incluindo nomes compridos, em vez do tamanho do lote. Siglas dos estados: 23px. Limite e colisão de rótulos continuam ativos.
- Zoom dos botões, roda do mouse e foco da busca interpolados pelo tempo em escala logarítmica. A roda mantém o ponto sob o cursor. Arraste/pinça continuam nos controles nativos do mapa. Movimento reduzido do sistema é respeitado.
- Pontos distantes desenhados com duas malhas instanciadas, uma por time; bordas estaduais agrupadas em uma malha de linhas. Clique no marcador continua direcionado ao perfil correto.
- Quarteis/unidades são instanciados apenas quando o tamanho em tela exige detalhes. Montagem distribuída entre quadros com orçamento de aproximadamente 5ms; uma operação individual pode ultrapassá-lo. O cache de detalhes fora da tela é podado acima de 24 bases. Isso não limita o número de participantes ou de bases visíveis.
- Dois modelos de quartel e dez modelos de unidade compartilham geometria/material imutáveis dentro desta cena. Transformações, animações e baixas são independentes. Recursos compartilhados são liberados uma vez ao encerrar a cena.
- Mudanças apenas em pontos ou na quantidade de um tipo de unidade já representado não reconstruem a geometria de todas as bases. Um novo tipo de unidade ou mudança no posicionamento invalida a montagem.
- Mapa parado não mantém animação contínua por haver uma ficha selecionada. Batalha, efeitos, câmera e detalhes pendentes acordam o renderizador; aba oculta e modal suspendem a cena.
- Abertura clara com ilustração CSS, progresso por etapas reais, preparação das miniaturas e compilação inicial de shaders. Apresentação automática de cerca de 3,3s quando o mapa fica pronto a tempo; botão **Entrar no mapa** permite antecipar a entrada assim que estiver pronto. Se carregar mais lentamente, permanece até concluir. Erro não vira 100% nem fica oculto pelo loader.

## Validação executada

55 testes aprovados: regras, economia, eventos sociais, geografia, assets, destroços, rótulos, adaptador Vercel, cache e zoom. Os testes novos verificam convergência/limites e independência da taxa de quadros, geometria estável em mudanças de saldo, tamanho de texto longo, animação/baixa isoladas entre clones e liberação única dos recursos compartilhados.

Na prévia de desenvolvimento, a preparação da cena com cache levou 1141ms no navegador usado. O loader oferece a introdução separadamente; esse número não mede download frio em produção nem garante tempo em outro aparelho. O foco de Catu chegou a 598,20×; nomes brancos e tropas foram conferidos visualmente. Uma batalha completa gerou 85 destroços; placar 13.690 × 13.620 e 966 unidades permaneceram na interface. Console sem erros/avisos. Tela390×844: largura do corpo e conteúdo390px, sem overflow horizontal.

A instrumentação no canvas registra contagens de desenhos/recursos, tempo de CPU de renderer.render e número de renders. Esse tempo não inclui toda a aplicação, não mede GPU nem equivale a FPS. Não há benchmark de milhares de usuários simultâneos ou garantia de 60FPS. Build final Next/TypeScript aprovada, com11páginas, e servidor reiniciado na porta5183. Na mesma tela484×668, zoom1, 82bases e sem batalha: chamadas de desenho221→106 (aproximadamente52% menos); a nova cena tinha0quarteis e0unidades residentes e82marcadores em lote. Capturas de DOM em outputs/otimizacao/baseline.json e producao-nacional.json. Preparação da cena1052ms. Clique no texto branco Catu/@voce_demo abriu a ficha correta. Na aproximação12,07× em desktop, foram conferidos dois rótulos municipais sem colisão, detalhe3D e ausência de ruas; console sem erros/avisos. Capturas nomes-producao.png, loader-producao.png e mobile.png em outputs/otimizacao/. Esses valores são observações locais, sem garantia de rede fria ou FPS.

## Limites preservados

Estado e simulação locais. Instagram, autenticação, banco compartilhado e agenda real de batalha ainda aguardam configuração. Projeto1, página Cozinha3D e regras de força militar não foram alterados nesta entrega. O envio Git não comprova deploy remoto da Vercel.
