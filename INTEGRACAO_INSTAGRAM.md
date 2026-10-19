# Integração do Instagram — Projeto 2

## Projeto 2 — situação em 19/10/2026

**Conta escolhida pelo usuário:** `@vocee13ou22` (criada em 17/10/2026). O usuário criou o app e aceitou o convite de Testador do Instagram. Dados públicos conferidos no painel da Meta em 19/10:

- App Meta `voce é 13 ou 22`: `1671673207920987`.
- App Instagram `voce é 13 ou 22-IG`: `1091176320498657`.
- Conta do Instagram `vocee13ou22`: `17841457747543561`, com assinatura de webhook **Ativado**.
- Permissões adicionadas com autorização do usuário: `instagram_business_basic` e `instagram_business_manage_comments` (status observado inicialmente: **Pronto para teste**). Não foram adicionadas permissões de mensagens.
- O próprio usuário gerou e salvou `INSTAGRAM_ACCESS_TOKEN` na Vercel. O valor não foi lido pelo assistente nem validado diretamente contra a API da Meta; o código atual do receptor não o consome em tempo de execução.
- Após o usuário concluir a reautenticação exigida pela Meta, a chave do app Instagram foi transferida diretamente do painel para `INSTAGRAM_APP_SECRET` na Vercel. `INSTAGRAM_VERIFY_TOKEN` foi gerado criptograficamente (48 bytes aleatórios), e `INSTAGRAM_ACCOUNT_ID` recebeu o ID público acima. As quatro variáveis do Instagram são **Secret**, somente **Production**, no projeto Vercel `vocee13ou22`. Nenhum valor de credencial foi impresso, gravado em arquivos ou enviado ao chat; os valores temporários foram descartados após a validação.
- **Deployment atual:** `A6BA76tjKH8TdcQZwis1CfErxJSL`, fonte `786882a42a3e85ec45bb4e1eae7266bc4ac09023`, Production, **Ready**, duração 1 min 16 s, domínio `https://vocee13ou22.vercel.app`. Substitui o redeploy intermediário `5aB3iqBdG6Wxfqyw3p2x3CyadU3Z`, que tinha somente o token de acesso e ainda respondia 503 para o receptor de comentários.
- **Callback validado e salvo na Meta:** `https://vocee13ou22.vercel.app/api/instagram/webhook`. A Meta confirmou o endereço; logs Vercel registram `GET 200` em 19/10 às 10:37:12 BRT.
- **Campos de webhook:** somente `comments`, versão `v26.0`, está assinado. `live_comments` e todos os campos de mensagens ficaram desligados. Isso foi conferido novamente após publicar o app; estados sem credenciais em `outputs/instagram-setup/assinaturas-finais.json`.
- **Teste oficial Meta → servidor:** o painel enviou o exemplo `comments` / `This is an example.`; logs Vercel registram `POST 200` às 10:42:24 BRT. O receptor aceitou a assinatura. O exemplo não criou base: a consulta posterior a `/api/game` retornou 200 / `online:true` / 0 bases. Uma chamada própria sem assinatura foi recusada com 401, como esperado. Evidências: `webhook-entrega-meta.json`, `webhook-logs-200.png` e `servidor-apos-configurar-webhook.json`, em `outputs/instagram-setup/`.
- **Metadados do app salvos:** links existentes `/privacidade`, `/termos` e `/exclusao-de-dados`; todos retornaram HTTP 200. Nenhum texto dessas páginas foi alterado nesta configuração. A Meta confirmou `As alterações foram salvas` e depois `Todas as configurações necessárias do app foram concluídas`.
- **App publicado:** o usuário autorizou explicitamente `Sim, publicar o app na Meta`. A ação foi concluída e confirmada em outra sessão do painel: **Publicado** e botão **Tirar do ar**. Evidência: `outputs/instagram-setup/meta-app-publicado.png`. Isso não comprova aprovação de Acesso Avançado ou Verificação da Empresa.
- **Pendente:** link do post oficial e comentário real feito por outro perfil. Não declarar ainda que comentários reais estão criando/pontuando bases. A pergunta sobre o post foi enviada ao usuário. Não publicar posts ou comentários em nome dele para simular essa validação.
- **Incidentes da configuração:** a geração automatizada de token não abriu a autorização; o usuário concluiu manualmente. Causa não confirmada. Durante o ajuste da tabela de webhooks, uma ação automatizada atingiu o controle de assinatura ao tentar abrir Teste; `comments` foi restaurado e todos os estados finais conferidos. O teste oficial foi aberto visualmente no Chrome e a entrega comprovada nos logs. Não atribuir essas ocorrências ao código do mapa.

**Requisitos conferidos na documentação oficial da Meta em 17/10/2026** ([webhooks](https://developers.facebook.com/docs/instagram-platform/webhooks/), [respostas privadas](https://developers.facebook.com/docs/instagram-platform/private-replies)):

- A conta precisa ser **profissional** (Criador ou Empresa) e **pública** para gerar notificações de comentários.
- O painel exige app publicado para receber webhooks reais. A publicação foi concluída em 19/10 com `instagram_business_basic` + `instagram_business_manage_comments`; a aprovação de **Acesso Avançado** e **Verificação da Empresa** não foi confirmada. A exigência registrada na consulta de 17/10 precisa ser conciliada com o uso apenas da conta própria e com a validação real, ainda pendente; um teste sintético 200 não resolve essa dúvida.
- A conta é inscrita no app por `POST /{id}/subscribed_apps?subscribed_fields=comments`. Notificações podem vir em lote, ser repetidas por até 36 h e precisam de resposta `200` rápida; deduplicar sempre.
- Resposta privada (DM) ao autor de um comentário: uma única mensagem, até 7 dias após o comentário; continuação só se a pessoa responder (janela de 24 h).

**Lacunas do Projeto 2, independentes da Meta:** ~~banco compartilhado~~, ~~cadastro, pontos e compras no servidor~~, ~~site lendo o estado do servidor~~, ~~receptor de comentários~~, ~~páginas de privacidade/termos/exclusão de dados~~ (feitos em 17/10); faltam batalha das 22h no servidor e forma de o dono acessar a própria base.

## Receptor e sincronização de comentários do Projeto 2 (19/10/2026, decisão do usuário)

- `POST /api/instagram/webhook` (`lib/war/instagram-webhook.ts`) aceita só lotes com assinatura `X-Hub-Signature-256` válida, lê o campo `comments`, ignora a própria conta do jogo, outras contas (`INSTAGRAM_ACCOUNT_ID`) e posts fora da lista (`INSTAGRAM_MEDIA_IDS`, opcional) e chama o servidor do jogo com o ID e o @ **informados pela Meta**. Respostas a comentários também contam.
- **Sincronização via Graph API (`lib/war/instagram-sync.ts`):** quando `INSTAGRAM_ACCESS_TOKEN` está configurado, `GET /api/game` (com intervalo mínimo de 25 s, ou imediatamente com `?sync=1`) e `POST /api/game/admin` (`{ action: "sync-instagram" }`) consultam os posts da conta `@vocee13ou22` (incluindo `DemLNxBxY22` e `Demxskmpibh`) e seus comentários/respostas na Graph API da Meta, criando as bases no Supabase sem duplicar recibos (`ig:<comment_id>`).
- **Regra de formato do comentário (atualizada em 19/10 por decisão do usuário):**
  - Se a pessoa informar cidade ou estado (`SP 22`, `Catu BA 13`, `Salvador 22`), a base nasce no local informado.
  - **Se a pessoa não informar cidade nem estado** (comentando apenas `13`, `22`, `PT`, `PL`, etc., ou comentando nos posts oficiais sem cidade), a base é **espalhada automaticamente entre os 27 estados do Brasil de forma determinística pelo `@` da pessoa** (`stateForUsername` em `lib/war/game.ts`; quando cai na Bahia, `bahiaCityForUsername` seleciona uma cidade baiana pelo `@`).
- `GET` confirma o painel da Meta com `INSTAGRAM_VERIFY_TOKEN`.
- Variáveis na Vercel: `INSTAGRAM_ACCESS_TOKEN` (leitura dos posts e comentários via Graph API), `INSTAGRAM_APP_SECRET` (chave secreta do app do Instagram), `INSTAGRAM_VERIFY_TOKEN` (palavra criada pelo usuário e repetida no painel), `INSTAGRAM_ACCOUNT_ID` (ID da conta @vocee13ou22, recomendado) e `INSTAGRAM_MEDIA_IDS` (opcional). Também precisam das variáveis do Supabase.
- Endereços para o painel da Meta (projeto Vercel `vocee13ou22`): webhook `https://vocee13ou22.vercel.app/api/instagram/webhook`; privacidade `https://vocee13ou22.vercel.app/privacidade`; termos `https://vocee13ou22.vercel.app/termos`; exclusão de dados `https://vocee13ou22.vercel.app/exclusao-de-dados`.
- Exclusão de dados: pedido por mensagem direta ao @vocee13ou22; o administrador roda `node scripts/game-admin.mjs --site https://vocee13ou22.vercel.app apagar @perfil` (apaga base, pontos, compras, mensagens do chat com aquele @ e os áudios; ficam só os códigos de comentários já processados).
- Verificação: 8 testes em `tests/war-instagram.test.mjs` com o Supabase local (assinatura, confirmação, criação de bases com e sem cidade, sincronização dos 4 comentários dos 2 posts via Graph API, ignorados, reenvio, falha do banco, limpeza de texto, exclusão).
- **Escolhas do assistente nas páginas legais, para o usuário revisar** (não são decisões aprovadas nem orientação jurídica): contato apenas por DM do Instagram (sem e-mail), prazo de 15 dias para exclusão, aviso de que 13/22 pode ser entendido como opinião política (dado sensível na LGPD), recomendação para menores de 18 participarem com conhecimento dos responsáveis, aviso de que o jogo não é oficial de partidos/candidatos/Meta. Recomenda-se revisão por profissional antes da campanha. O teste legado `tests/integration.mjs` ainda descreve o receptor do Projeto 1.

O texto a seguir descreve a integração herdada do Projeto 1 e permanece como histórico.

## Histórico do Projeto 1

O pedido atual é deixar o mapa funcionando e a integração aguardando. Nenhuma conta, post, senha ou token de Instagram foi configurado. O receptor está implementado; uma entrega real da Meta ainda precisa ser validada.

## Como funciona

Comentário em um post autorizado → webhook assinado pela Meta → identificação de cidade/UF → gravação transacional em D1 → mapa consulta atualizações a cada 10 segundos enquanto aberto.

- Uma casa por perfil e por identificador de usuário do Instagram.
- O primeiro registro aceito em cada cidade é fundador, por ordem de gravação, não necessariamente pela hora original no Instagram.
- Reentregas do mesmo comentário não duplicam casas. Comentários removidos administrativamente não recriam a casa quando o mesmo evento é repetido.
- Cidades homônimas ou não reconhecidas ficam em revisão. Não há geocodificação por endereço nem IA adivinhando cidades.
- Casas na mesma cidade são agrupadas em um marcador com contador; a lista mostra os moradores.
- O cadastro manual é administrativo e não comprova titularidade do perfil. A entrada via webhook usa o autor informado pela Meta, não o @ escrito no comentário.

## Ativação futura

1. Escolher uma conta profissional (Criador ou Empresa) e criar/configurar um app Meta para Instagram Login.
2. Autorizar `instagram_business_basic` e `instagram_business_manage_comments`. Confirmar os requisitos atuais no painel da Meta e na documentação oficial; contas externas ao app podem exigir análise/acesso avançado.
3. Configurar no servidor as variáveis abaixo, nunca em código ou no navegador.
4. Antes de tornar o mapa público, fixar `MAP_ADMIN_USER_ID` no ID de identidade Sites do proprietário. O padrão desta entrega depende da proteção owner-private da plataforma. Não liberar o público mantendo esse campo indefinido.
5. Disponibilizar um receptor HTTPS acessível à Meta: o site privado bloqueia chamadas externas antes do webhook. Ao lançar, publicar o site para o público com a proteção administrativa acima, ou hospedar o receptor separadamente. Não foi alterada a audiência nesta entrega.
6. No painel Meta, cadastrar `https://brasil-em-casas.breezyyak.chatgpt.site/api/instagram/webhook`, configurar o token de verificação e assinar o campo `comments` do objeto Instagram. Assinar também a conta profissional no aplicativo conforme a documentação vigente.
7. Fazer um comentário real no post escolhido (exemplo de formato: `São Paulo SP`) e verificar a casa no mapa. Só então considerar a conexão ativa.

| Variável | Conteúdo |
|---|---|
| `INSTAGRAM_APP_SECRET` | Segredo do app Meta, usado para validar HMAC SHA-256 do corpo recebido |
| `INSTAGRAM_VERIFY_TOKEN` | Segredo criado para confirmar o webhook no painel Meta |
| `INSTAGRAM_ACCOUNT_ID` | ID da conta profissional autorizada |
| `INSTAGRAM_MEDIA_IDS` | IDs dos posts permitidos, separados por vírgula |
| `INSTAGRAM_PROFILE` | Nome público opcional do perfil |
| `MAP_ADMIN_USER_ID` | ID de identidade Sites autorizado a cadastrar, remover e revisar |

Um token de acesso Meta é necessário no processo de autorização/assinatura, mas não é utilizado pelo receptor atual: ele recebe o autor e o comentário no payload. O site não implementa login OAuth do Instagram nem importa comentários históricos. Também não posta respostas ou mensagens automáticas.

## Referências

- [Meta: Instagram API com Instagram Login](https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login)
- [Meta: moderação de comentários](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/comment-moderation)
- [Meta: webhooks](https://developers.facebook.com/docs/instagram-platform/webhooks/)

As páginas de developers.facebook.com limitaram a consulta automática durante a implementação; as permissões foram conferidas na coleção publicada pela própria Meta no Postman. O formato usado pelo receptor tem testes locais e precisa de validação com o payload real da conta no momento da ativação.
