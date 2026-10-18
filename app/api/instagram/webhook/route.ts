import municipalities from '../../../../public/war-assets/bahia-municipality-index.json';
import { MAX_WEBHOOK_BYTES, handleInstagramComments, verifySubscription } from '../../../../lib/war/instagram-webhook';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

/** Confirmação do webhook no painel da Meta (hub.challenge). */
export async function GET(request: Request) {
  const challenge = verifySubscription(new URL(request.url).searchParams, process.env.INSTAGRAM_VERIFY_TOKEN);
  return challenge === null ? Response.json({ error: 'Verificação não autorizada.' }, { status: 403, headers }) : new Response(challenge, { headers: { ...headers, 'Content-Type': 'text/plain' } });
}

/** Comentários do Instagram: cria ou pontua bases no Supabase (ver lib/war/instagram-webhook.ts). */
export async function POST(request: Request) {
  if (Number(request.headers.get('content-length') || 0) > MAX_WEBHOOK_BYTES) return Response.json({ error: 'Limite excedido.' }, { status: 413, headers });
  const result = await handleInstagramComments(process.env, await request.text(), request.headers.get('x-hub-signature-256'), municipalities);
  return Response.json(result.body, { status: result.status, headers });
}
