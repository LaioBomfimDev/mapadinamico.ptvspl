import { createClient } from '@supabase/supabase-js';
import { GameServerError, serverConfigured, type ServerEnv } from './server-game.ts';
import { LIVE_AUDIO_BUCKET } from './server-live.ts';

/**
 * Exclusão de dados de um perfil (página /exclusao-de-dados): apaga a base com pontos, compras e exército,
 * as mensagens do chat assinadas com o @ e os áudios delas. Os códigos de comentários já processados ficam,
 * sem ligação com a conta, para um comentário antigo reenviado pela Meta não recriar a base.
 */
type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;

export async function deleteServerProfile(env: ServerEnv, rawUsername: string, fetcher: Fetcher = fetch) {
  if (!serverConfigured(env)) throw new GameServerError('Servidor do jogo ainda não configurado.', 503);
  const username = rawUsername.trim().replace(/^@+/, '').toLowerCase();
  if (!/^[a-z\d._]{1,30}$/.test(username)) throw new GameServerError('Perfil inválido.', 400);
  const rows = async <T>(method: 'GET' | 'DELETE', table: 'bases' | 'live_messages', select: string) => {
    let response: Response;
    try {
      response = await fetcher(new URL(`/rest/v1/${table}?${table === 'bases' ? 'username' : 'author'}=eq.${encodeURIComponent(username)}&select=${select}`, env.SUPABASE_URL), { method, headers: { apikey: env.SUPABASE_SECRET_KEY!, Accept: 'application/json', ...(method === 'DELETE' ? { Prefer: 'return=representation' } : {}) }, cache: 'no-store' });
    } catch { throw new GameServerError('O servidor do jogo não respondeu. Tente novamente.'); }
    if (!response.ok) throw new GameServerError('Não foi possível apagar agora. Tente novamente.', 503);
    const data = await response.json().catch(() => []);
    return (Array.isArray(data) ? data : []) as T[];
  };
  // Primeiro os arquivos de áudio: se algo falhar, nada foi apagado do banco e é só rodar de novo.
  const prefix = `/storage/v1/object/public/${LIVE_AUDIO_BUCKET}/`;
  const audios = (await rows<{ audio_url?: string | null }>('GET', 'live_messages', 'audio_url'))
    .map(message => { try { const path = new URL(String(message.audio_url)).pathname; return path.startsWith(prefix) ? decodeURIComponent(path.slice(prefix.length)) : null; } catch { return null; } })
    .filter((path): path is string => !!path);
  if (audios.length) {
    const storage = createClient(env.SUPABASE_URL!, env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetcher as typeof fetch } }).storage.from(LIVE_AUDIO_BUCKET);
    const { error } = await storage.remove(audios);
    if (error) throw new GameServerError('Não foi possível apagar os áudios agora. Nada foi apagado do banco; tente novamente.', 503);
  }
  const messages = await rows<{ id: string }>('DELETE', 'live_messages', 'id');
  const bases = await rows<{ id: string }>('DELETE', 'bases', 'id');
  return { username, bases: bases.length, messages: messages.length, audios: audios.length };
}
