# Super chat e áudio em produção — 17/10/2026

## Resultado final

**Corrigido no projeto Vercel vocee13ou22**, após autorização explícita do usuário para conectar o Supabase e republicar. Produção: https://vocee13ou22.vercel.app .

As quatro variáveis `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` e `MAP_ADMIN_TOKEN` foram salvas como **Secret**, exclusivamente em **Production**. Valores não foram impressos, colocados em Git, gravados em arquivo local ou enviados ao cliente. Apenas a chave publicável é devolvida ao navegador para receber mensagens. As chaves do Supabase existente foram reutilizadas; não foram criadas/rotacionadas chaves desse serviço nem alteradas regras RLS ou migrações.

Redeploy da fonte atual9b0a9fd confirmado **Ready** na Vercel: `9Q3FtRFdaQrB3XpNKEV3Agrvog6w`. A build exibiu1min17s. Outro chat criou posteriormente o commit822f763, de lotes/linhas municipais; essa alteração não foi parte da correção do chat.

## Causa original confirmada

- `api/live` e `api/game` dos dois domínios Vercel retornavam200/`online:false`.
- O painel do projeto principal mostrava **No Environment Variables Added**.
- A mensagem técnica aparecia no Chrome e não no Edge.
- MP3 sintético de2s/8376bytes era recusado com503: chat ainda não ligado ao servidor.

Sem as variáveis, `serverConfigured` era falso e o cliente utilizava `BroadcastChannel`, restrito ao navegador/perfil/origem. O evento não passava pelo banco. Não foi atribuído o problema a zoom, WebSocket, RLS ou microfone sem evidência.

## Validação executada após o deploy

1. `GET /api/game`:200/`online:true`, banco compartilhado com0bases. A demonstração anterior era local e não foi importada como participantes reais.
2. `GET /api/live`:200/`online:true`, configuração pública de tempo real presente.
3. Chrome e Edge recarregados, ambos mostrando **SERVIDOR CONECTADO · dados compartilhados**.
4. Super chat enviado pela UI do Chrome chegou ao Edge. Segundo texto enviado pela UI do Edge chegou ao Chrome. Capturas de ambos os sentidos.
5. Envio multipart de áudio sintético MP3/`audio/mpeg`,2s,8376bytes:200, arquivo público no Storage com200 e MIME correto. Download idêntico ao original por SHA256 e decodificação com FFmpeg sem erro.
6. Novo envio sintético, seguido imediatamente da conferência das telas: botão do áudio presente nos dois navegadores; clique ativou **Pausar áudio** em ambos. Captura do Edge reproduzindo. Nenhum erro de reprodução na UI nem erro nos consoles de Chrome/Edge.
7. Verificação final da API:2textos e2áudios de teste registrados, chave pública com prefixo publicável, nenhuma chave secreta exposta.
8. Tentativa de executar a gravação diretamente com a chave publicável no banco foi recusada com401. Envios válidos continuam passando pela API do site.

O áudio de teste foi um tom gerado localmente: nenhum microfone ou voz privada foi captado. A captura real do microfone não foi retestada nesta ativação. A reprodução exige clique, conforme a implementação atual. Os cartões animados desaparecem; a segunda conferência de áudio coordenou o envio com a UI para não perder esse intervalo.

A alteração foi de ambiente. Não houve mudança no código do aplicativo nem nova suíte de testes unitários nesta etapa; a build e os testes acima foram realizados na produção real.

## Uso e escopo

Recarregar abas antigas é necessário para carregarem a versão conectada. O projeto separado `mapadinamicoptvspl.vercel.app` não recebeu estas variáveis. `.env.local` não foi criado nesta ativação de produção. Instagram e contador real de visitantes continuam em etapas próprias.

## Evidências locais

Em `outputs/chat-producao/`, ignorado pelo Git:

- Antes: `vercel-sem-variaveis.png`, `chrome-envio-local.png`, `edge-sem-mensagem.png`, `diagnostico-audio.json`.
- Depois: `deploy-ready.png`, `edge-recebeu-texto.png`, `chrome-recebeu-texto.png`, `edge-reproduzindo-audio.png`.
- Arquivos/checagens: `tom-teste.mp3`, `audio-producao-baixado.mp3`, `audio-producao-resultado.json`, `verificacao-final.json`, `send-audio-test.mjs`.

Essas evidências não contêm credenciais. Os arquivos de teste enviados ao servidor são tons sintéticos públicos, identificados como teste; não foram apagados dados da produção.
