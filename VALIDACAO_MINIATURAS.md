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
