import { GameServerError, serverConfigured } from '../../../lib/war/server-game';
import { liveRealtimeConfig, postLiveMessage, recentLiveMessages } from '../../../lib/war/server-live';

export const dynamic = 'force-dynamic';
const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const failure = (error: unknown) => error instanceof GameServerError ? reply({ error: error.message }, error.status) : reply({ error: 'O chat ao vivo não respondeu. Tente de novo.' }, 503);

/** Últimas mensagens e a configuração pública do tempo real. Sem Supabase, o chat fica só entre abas. */
export async function GET(request: Request) {
  if (!serverConfigured(process.env)) return reply({ online: false });
  try {
    const after = new URL(request.url).searchParams.get('after');
    return reply({ online: true, serverTime: new Date().toISOString(), realtime: liveRealtimeConfig(process.env), messages: await recentLiveMessages(process.env, after) });
  } catch (error) { return failure(error); }
}

/** Super chat (JSON) ou áudio (formulário com arquivo). O servidor valida, limita o ritmo e grava. */
export async function POST(request: Request) {
  if (!serverConfigured(process.env)) return reply({ error: 'O chat ao vivo ainda não está ligado ao servidor.' }, 503);
  // Só aceita envios da própria página: o host de origem precisa ser o mesmo que o navegador usou para chegar aqui.
  const origin = request.headers.get('origin'), host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (origin && (!host || (() => { try { return new URL(origin).host !== host; } catch { return true; } })())) return reply({ error: 'Origem não autorizada.' }, 403);
  if (Number(request.headers.get('content-length') || 0) > 1_200_000) return reply({ error: 'Envio grande demais.' }, 413);
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
  try {
    if ((request.headers.get('content-type') || '').startsWith('multipart/form-data')) {
      const form = await request.formData(), file = form.get('audio');
      return reply({ message: await postLiveMessage(process.env, { ip, kind: 'audio', team: String(form.get('team')), author: String(form.get('author') || ''), audio: file instanceof Blob ? file : null, durationMs: Number(form.get('durationMs')) }) });
    }
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return reply({ error: 'Envio inválido.' }, 400);
    return reply({ message: await postLiveMessage(process.env, { ip, kind: 'super', team: String(body.team), author: String(body.author || ''), text: typeof body.text === 'string' ? body.text : '' }) });
  } catch (error) { return failure(error); }
}
