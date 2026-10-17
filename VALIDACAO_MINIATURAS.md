# Validação — Projeto 2, miniaturas

2026-10-16. Resultados reais da implementação local, sem campanha, banco compartilhado ou Instagram real.

## Instalação e build

- `npm ci` em `sites/projeto-2` sem `node_modules`: 692 pacotes instalados, saída 0. Nenhuma dependência direta ou lockfile alterado nesta entrega.
- `npm run build:vercel`: compilação, TypeScript, geração estática e manifesto Next aprovados. Home e `/arsenal` geradas; APIs herdadas permanecem disponíveis como legado.
- `next start` local: home, arsenal, geometria, atlas PNG e ZIP retornaram HTTP 200 com seus tipos corretos. Não é um deploy remoto na Vercel.

## Testes automatizados executados

`node --test tests/war-game.test.mjs tests/war-assets.test.mjs tests/vercel.test.mjs`: **22 aprovados, zero falhas**.

- 11 testes de regras/geografia: vitória por força apesar da diferença na quantidade de bases; participação de perfis sem comentário novo; snapshot imutável; reprodução por semente; alvos de times diferentes; inventário e saldo preservados; conclusão idempotente; deduplicação; limite diário e dia de Brasília; compras, saldo insuficiente e bloqueio de compra; cores/empates; validação de saves; 27 IDs IBGE e ruas/lotes dentro das UFs, incluindo DF.
- 5 testes de assets/VFX: dez combinações modelo/time; coordenadas finitas; dimensões/apoio; isolamento de materiais; GLBs e hashes; atlas RGBA/32 quadros; limite, expiração e descarte dos efeitos.
- 6 testes do adaptador Vercel herdado: parâmetros de SQL, batch, falhas, autorização administrativa e modo demo sem configuração.

## Verificação no navegador

- WebGL abriu o mapa dos 27 territórios, selecionou a base inicial e mostrou os modelos volumétricos no zoom.
- Compra de tanque: saldo 180 → 120, tanques 1 → 2 e força da base 230 → 310. Aumento nacional vermelho 13.495 → 13.575.
- Comentário fictício `@teste_mapa BA 13`: 82 → 83 bases, três soldados iniciais, força 30 e crédito 10.
- Batalha completa em 24×: vencedor azul, força 13.620 contra 13.605, mesmo com 40 bases azuis contra 43 vermelhas. Cores estaduais renderizadas; inventário total permaneceu em 962 unidades. Pausa e controle de velocidade também operados.
- Atlas de explosão renderizado na galeria; visualização real de tanque 3D conferida.
- Build de produção local conferida em 1280 × 800 e 390 × 844. Na tela estreita, opções → mapa vazio gerou zero bases e bloqueou iniciar batalha; comentário fictício `@teste_df DF 22` criou uma base azul com três soldados/10 pontos.
- Recarregar a produção local e abrir o arsenal manteve `@teste_df`, três soldados e saldo 10. Isso verifica persistência local, não persistência compartilhada ou autenticação de conta.
- Enquadramento, textos estaduais, limites de cartão e nível de detalhe foram refinados após inspeção visual. Mapas nacionais usam marcadores; miniaturas detalhadas são criadas sob demanda nas bases dentro da câmera. O fundo é suspenso ao abrir a galeria em modal.

Capturas em `outputs/prototipo-miniaturas/` (ignoradas pelo Git): mapa de produção, arsenal, batalha, resultado e teste mobile do DF. A captura `base-df-mobile.png` registra a situação inicial; `base-df-mobile-final.png` confirma a unidade visível, etiqueta depois do lote e painel sem cobrir a tropa. Não foi medida uma taxa de FPS nem feito teste em aparelho físico.

## Limites

Sem teste humano de balanceamento, carga com milhares de participantes, integração Meta, conta/post Instagram, autorização de perfil real, banco de produção, transmissão sincronizada entre visitantes ou agendamento automático às 22h. Essas etapas continuam separadas da demonstração.

## Atualização — miniaturas desmontáveis e símbolos

2026-10-16, pedido posterior à primeira entrega. Testes executados: `node --test tests/war-game.test.mjs tests/war-assets.test.mjs tests/war-destruction.test.mjs tests/war-wreck-assets.test.mjs` (**27 aprovados**) e `node --test tests/vercel.test.mjs` (**6 aprovados**), total **33 aprovados, zero falhas**. TypeScript `tsc --noEmit` aprovado.

Novas verificações: intervalos originais dos vértices sem lacunas; símbolos acima das unidades, opcionais e voltados para a câmera; conservação de peças, triângulos e cores; infantaria caída; apoio no chão; posições iniciais sob escala/rotação; final determinístico independente do passo de tempo; limites e impactos repetidos; reconstrução sem consumir inventário nem destruir recursos do modelo original. Dez GLBs quebrados, hashes e doze entradas do ZIP conferidos por CRC.

Navegador com WebGL na prévia de desenvolvimento: tanque azul explodido/reconstruído (contador 1 → 0), infantaria vermelha deitada com capacete solto, símbolos de estrela/arma conferidos. Rodada completa em 24× terminou com azul 13.620 contra vermelho 13.605 e **86 destroços**; após fechar o resultado, os destroços permaneceram. **Reconstruir só as miniaturas** zerou-os e preservou as **962 unidades**, 83 bases e placar. Nenhum aviso/erro nos consoles capturados da galeria e do mapa. Detalhes e limites em [DESTRUICAO_MINIATURAS.md](DESTRUICAO_MINIATURAS.md).

Build final `npm run build:vercel` concluída com saída 0 (compilação, TypeScript e dez páginas geradas). Prévia de produção reiniciada em `http://127.0.0.1:5183/`: home, arsenal, ZIP intacto, ZIP quebrado e GLB quebrado retornaram HTTP 200/MIME correto. Infantaria foi explodida na galeria de produção, contador 1 e nenhum aviso/erro de console. Capturas reais em `outputs/desmontagem/infantaria-caida-producao.png` e `mapa-distintivos-producao.png`; viewport restaurado e novas abas finais preservadas. Sem deploy remoto.

## Atualização — municípios da Bahia

2026-10-16. `node scripts/sync-ibge.mjs` consultou as APIs oficiais de Localidades e Malhas v3 e salvou a lista completa de **417 municípios** com códigos IBGE, polígonos em qualidade intermediária e pontos internos para os nomes. A geração rejeita contagens divergentes, códigos repetidos, geometrias inválidas e rótulos fora de seus territórios. Arquivo final: `public/war-assets/bahia-municipalities.json` (~795 KB); origem, data e SHA-256 em `geography-source.json`.

A camada de limites aparece ao selecionar Bahia. Os rótulos entram com zoom e suprimem temporariamente colisões visuais; aproximar e arrastar revela os demais. Ruas seguem como linhas retas estilizadas, sem dados de vias do IBGE. `npm run build:vercel` compilou a alteração e concluiu a checagem TypeScript. Não foi feito teste visual WebGL nesta atualização nem deploy remoto.

## Atualização — vínculo IBGE, Marechal e lotes municipais

2026-10-17. Bases da Bahia passam a salvar o código IBGE vindo do nome oficial no comentário; a ficha apresenta o ranking por pontos acumulados da própria cidade, sem descontar pontos gastos. O líder único recebe o título e a marca visual “MARECHAL”; em empate, o título fica vazio. Bases antigas fictícias recebem municípios demonstrativos, e uma base local antiga sem município pode ser vinculada uma vez.

Ao abrir Bahia ou selecionar uma base baiana, a geometria é carregada sob demanda e os lotes/ruas da cidade são recalculados dentro do polígono municipal. As ruas de cada município são desenhadas em uma única malha para conter chamadas WebGL. As outras UFs continuam usando lotes estaduais. `npm run typecheck:vercel` e `npm run build:vercel` passaram na versão final. Não rodei os testes automatizados nem fiz nova inspeção visual no navegador nesta revisão; o build não valida o comportamento espacial em aparelho real. Não foi feito deploy remoto.
