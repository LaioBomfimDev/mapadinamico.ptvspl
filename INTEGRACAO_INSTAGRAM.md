# Conectar o Instagram quando a conta for escolhida

## Projeto 2 — situação em 17/10/2026

**Conta escolhida pelo usuário:** `@vocee13ou22` (criada em 17/10/2026). Nenhum app Meta, token, post oficial ou variável de ambiente foi configurado ainda.

**Requisitos conferidos na documentação oficial da Meta em 17/10/2026** ([webhooks](https://developers.facebook.com/docs/instagram-platform/webhooks/), [respostas privadas](https://developers.facebook.com/docs/instagram-platform/private-replies)):

- A conta precisa ser **profissional** (Criador ou Empresa) e **pública** para gerar notificações de comentários.
- Webhook de `comments` exige app em modo **Live**, **Acesso Avançado** e **Verificação da Empresa**, com `instagram_business_basic` + `instagram_business_manage_comments`. Acesso Avançado passa por **Análise do App** (política de privacidade, termos, exclusão de dados e vídeo mostrando o uso).
- A conta é inscrita no app por `POST /{id}/subscribed_apps?subscribed_fields=comments`. Notificações podem vir em lote, ser repetidas por até 36 h e precisam de resposta `200` rápida; deduplicar sempre.
- Resposta privada (DM) ao autor de um comentário: uma única mensagem, até 7 dias após o comentário; continuação só se a pessoa responder (janela de 24 h).

**Lacunas do Projeto 2, independentes da Meta:** ~~banco compartilhado~~, ~~cadastro, pontos e compras no servidor~~, ~~site lendo o estado do servidor~~, ~~receptor de comentários~~, ~~páginas de privacidade/termos/exclusão de dados~~ (feitos em 17/10); faltam batalha das 22h no servidor e forma de o dono acessar a própria base.

## Receptor de comentários do Projeto 2 (17/10/2026, pedido do usuário)

- `POST /api/instagram/webhook` (`lib/war/instagram-webhook.ts`) aceita só lotes com assinatura `X-Hub-Signature-256` válida, lê o campo `comments`, ignora a própria conta do jogo, outras contas (`INSTAGRAM_ACCOUNT_ID`) e posts fora da lista (`INSTAGRAM_MEDIA_IDS`, opcional) e chama o servidor do jogo com o ID e o @ **informados pela Meta**. Respostas a comentários também contam.
- Formato do comentário: `SP 22` ou, na Bahia, `Catu BA 13`. Um @ no começo (marcando alguém) é ignorado; emojis e pontuação são retirados. Comentários fora do formato, Bahia sem cidade ou troca de estado/time são ignorados sem erro. Se o banco cair, responde 503 para a Meta reenviar; o recibo do comentário impede duplicar.
- `GET` confirma o painel da Meta com `INSTAGRAM_VERIFY_TOKEN`.
- Variáveis na Vercel: `INSTAGRAM_APP_SECRET` (chave secreta do app do Instagram), `INSTAGRAM_VERIFY_TOKEN` (palavra criada pelo usuário e repetida no painel), `INSTAGRAM_ACCOUNT_ID` (ID da conta @vocee13ou22, recomendado) e `INSTAGRAM_MEDIA_IDS` (opcional). Também precisam das variáveis do Supabase.
- Endereços para o painel da Meta (projeto Vercel `vocee13ou22`): webhook `https://vocee13ou22.vercel.app/api/instagram/webhook`; privacidade `https://vocee13ou22.vercel.app/privacidade`; termos `https://vocee13ou22.vercel.app/termos`; exclusão de dados `https://vocee13ou22.vercel.app/exclusao-de-dados`.
- Exclusão de dados: pedido por mensagem direta ao @vocee13ou22; o administrador roda `node scripts/game-admin.mjs --site https://vocee13ou22.vercel.app apagar @perfil` (apaga base, pontos, compras, mensagens do chat com aquele @ e os áudios; ficam só os códigos de comentários já processados).
- Verificação: 7 testes em `tests/war-instagram.test.mjs` com o Supabase local (assinatura, confirmação, criação de bases, ignorados, reenvio, falha do banco, limpeza de texto, exclusão). Não testado com um envio real da Meta.
- **Escolhas do assistente nas páginas legais, para o usuário revisar** (não são decisões aprovadas nem orientação jurídica): contato apenas por DM do Instagram (sem e-mail), prazo de 15 dias para exclusão, aviso de que 13/22 pode ser entendido como opinião política (dado sensível na LGPD), recomendação para menores de 18 participarem com conhecimento dos responsáveis, aviso de que o jogo não é oficial de partidos/candidatos/Meta. Recomenda-se revisão por profissional antes da campanha. O teste legado `tests/integration.mjs` ainda descreve o receptor do Projeto 1.

**Caminho sem CNPJ nem análise (conferido na documentação em 17/10, ainda não testado na prática):** a página [Comment Moderation](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/comment-moderation) pede `instagram_business_basic` + `instagram_business_manage_comments` com **Acesso Padrão** quando o app serve contas profissionais "que você possui ou gerencia e adicionou ao app". O [nível de acesso](https://developers.facebook.com/docs/graph-api/overview/access-levels) padrão é automático e não cita análise nem verificação de empresa; o avançado exige ambos. Logo, ler os comentários dos próprios posts do @vocee13ou22 por consulta periódica (`GET /{media-id}/comments`) deve funcionar sem aprovação; só o webhook de `comments` exige Acesso Avançado. Falta confirmar com um token real se a lista traz o @ e o ID de quem comentou (o exemplo da documentação mostra só `id`, `text` e `timestamp`). Proposta de raspagem (scraper) foi discutida e não recomendada: viola os termos do Instagram sobre coleta automatizada, arrisca bloquear a própria conta da campanha e quebra com facilidade.

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
