# Brasil em Casas

Mapa 3D independente do Brasil, com 27 estados, busca em 5.571 localidades, imóveis volumétricos, câmera com zoom/rotação, ranking e integração Instagram em preparação.

## Executar localmente

**Produção na Vercel:** configuração pronta em `vercel.json`; usar `npm run build:vercel`, saída `.next` e raiz do repositório. [Passos de deploy, banco e variáveis](DEPLOY_VERCEL.md). Sem banco, a Vercel exibe a demonstração de Salvador e os cinco modelos; moradores reais exigem D1 configurado.

Node.js >=22.13.0. Dependências: `npm ci`. Banco: gerar a migração somente ao alterar o schema (`npm run db:generate`); migração inicial já incluída.

1. `node scripts/run-framework.mjs build`
2. `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_parallel_patriot.sql` (somente na criação do banco local).
3. Aplicar também `drizzle/0001_kind_gertrude_yorkes.sql` com o mesmo comando do passo 2, para criar a tabela de interações e índices.
4. `node scripts/run-framework.mjs dev --port 5178 --hostname 127.0.0.1`
5. Abrir o endereço exibido. Para editar, usar Adicionar uma casa → Entrar para administrar. O login local é simulado pelo starter; em produção a identidade é validada pela plataforma Sites.

## Verificar

- `node node_modules/typescript/bin/tsc --noEmit`
- `node tests/integration.mjs`: testes com SQLite isolado e assinatura HMAC; nunca altera o banco de produção.
- `node scripts/run-framework.mjs build`

O helper de build/instalação Sites encontrou falha de resolução do npm.cmd neste Windows; os mesmos scripts foram executados pelo entrypoint Node explícito. Build, starter e plugin de publicação Sites foram preservados.

## Estado da atualização

A atualização inclui o Hall da Cidade, cargos de prefeito/vice/vereador/mestre de obras, pontuação por interações e cinco tipos de edifícios. Esses valores são experimentais.

A apresentação foi reformulada para mapa em tela cheia com Three.js/WebGL. `/modelos` mostra cinco modelos 3D reais e permite baixar GLBs. Os cinco desenhos SVG anteriores foram preservados na galeria como originais 2D. O envio ao GitHub e a publicação Sites são operações separadas.

A migração inicial foi restaurada e a tabela/índices de interações agora têm migração própria 0001; não há criação de schema durante requisições. Ajustes de pontos no mapa agora exigem administrador e menções repetidas ao mesmo @ num comentário contam uma vez. Limites para comentários distintos e balanceamento continuam por definir. Veja [a revisão](REVISAO_2026-10-16.md).

## Uso

- O mapa publicado inicia vazio e privado para o proprietário.
- Adicionar uma casa: @ + cidade selecionada. O perfil manual não é autenticado no Instagram.
- Clique numa casa para ver moradores; casas da mesma cidade ficam agrupadas.
- Comunidade permite buscar, exportar JSON e remover registros administrativamente. A remoção exige um segundo clique; o fundador passa ao próximo cadastro da cidade.
- Instagram permite testar reconhecimento sem gravar casa e revisar comentários ambíguos.
- Atualização entre sessões a cada dez segundos enquanto o mapa estiver visível.

[Integração futura do Instagram](INTEGRACAO_INSTAGRAM.md) · [Dados e regras](DADOS_E_REGRAS.md)

A integração está implementada e desligada por solicitação do usuário. Não há OAuth Instagram nem histórico importado. Antes de abrir a campanha ao público, definir o proprietário administrativo, configurar Meta, disponibilizar o receptor publicamente e validar um comentário real.

## Entrega visual 3D

- `/` exibe o mapa em tela cheia; `/?cidade=salvador` abre a demonstração de perto.
- `@elielexgay` em Salvador é um exemplo visual solicitado pelo usuário. Não é registro recebido do Instagram e não entra no banco ou no total de moradores reais. Pode ser ocultado em Dados.
- `/modelos` permite girar os cinco imóveis, baixar os GLBs ou ver os SVGs originais.
- [Pacote de modelos](public/models/imoveis-3d.zip) e [manifesto técnico](public/models/manifest.json).
- Modelos originais procedurais, sem gerações pagas, PixelLab ou texturas externas.
- `node scripts/export-models.mjs` reproduz os GLBs/ZIP; `node scripts/export-legacy-models.mjs` exporta os SVGs preservados.
- `node --test tests/building-models.test.mjs tests/migrations.test.mjs` verifica geometria/arquivos 3D e a migração com dados existentes.
