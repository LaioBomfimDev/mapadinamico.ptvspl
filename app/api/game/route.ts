import municipalities from '../../../public/war-assets/bahia-municipality-index.json';
import { syncInstagramComments } from '../../../lib/war/instagram-sync';
import { GameServerError, loadGameState, serverConfigured } from '../../../lib/war/server-game';

export const dynamic = 'force-dynamic';
const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

/** Estado compartilhado do mapa. Sem Supabase configurado, o site continua na demonstração local. */
export async function GET(request: Request) {
  if (!serverConfigured(process.env)) return reply({ online: false });
  try {
    const forceSync = request?.url ? new URL(request.url).searchParams.get('sync') === '1' : false;
    const instagramSync = await syncInstagramComments(process.env, municipalities, { force: forceSync }).catch(() => null);
    const state = await loadGameState(process.env);
    return reply({
      online: true,
      ...state,
      ...(forceSync && instagramSync ? { instagramSync } : {}),
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    return reply({ online: true, error: error instanceof GameServerError ? error.message : 'O servidor do jogo não respondeu.' }, 503);
  }
}

