import { GameServerError, loadGameState, serverConfigured } from '../../../lib/war/server-game';

export const dynamic = 'force-dynamic';
const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

/** Estado compartilhado do mapa. Sem Supabase configurado, o site continua na demonstração local. */
export async function GET() {
  if (!serverConfigured(process.env)) return reply({ online: false });
  try {
    const state = await loadGameState(process.env);
    return reply({ online: true, ...state, serverTime: new Date().toISOString() });
  } catch (error) {
    return reply({ online: true, error: error instanceof GameServerError ? error.message : 'O servidor do jogo não respondeu.' }, 503);
  }
}
