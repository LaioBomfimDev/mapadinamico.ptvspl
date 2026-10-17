import { createHash, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { LIVE_CHAT, cleanLiveText, liveAuthor, liveMessageFromRow, type LiveMessage } from './live-chat.ts';
import { GameServerError, callGameFunction, serverConfigured, type ServerEnv } from './server-game.ts';

/**
 * Chat ao vivo no Supabase: o servidor do site valida e grava; os navegadores recebem cada mensagem nova
 * pelo tempo real do Supabase (ou pela consulta periódica, quando o tempo real não está configurado).
 */
type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;
export const LIVE_AUDIO_BUCKET = 'live-audio';
const AUDIO_EXTENSIONS: Record<string, string> = { 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/aac': 'aac' };

/** Configuração pública para o navegador assinar o tempo real (URL e chave publicável, nunca a secreta). */
export const liveRealtimeConfig = (env: ServerEnv) => env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY ? { url: env.SUPABASE_URL, key: env.SUPABASE_PUBLISHABLE_KEY } : null;

/** Código do visitante para o limite de ritmo: o endereço de rede passa por hash com segredo e não é guardado. */
export const liveClientKey = (ip: string, secret: string) => createHash('sha256').update(`ao-vivo:${secret}:${ip}`).digest('hex').slice(0, 40);

export async function recentLiveMessages(env: ServerEnv, after?: string | null, fetcher?: Fetcher): Promise<LiveMessage[]> {
  const since = after && Number.isFinite(Date.parse(after)) ? new Date(after).toISOString() : null;
  const rows = await callGameFunction<unknown[]>(env, 'live_recent', { p_after: since }, fetcher);
  return (Array.isArray(rows) ? rows : []).map(liveMessageFromRow).filter((message): message is LiveMessage => !!message);
}

type LiveInput = { ip: string; kind: string; team: string; author: string; text?: string; audio?: Blob | null; durationMs?: number };

export async function postLiveMessage(env: ServerEnv, input: LiveInput, fetcher: Fetcher = fetch): Promise<LiveMessage> {
  if (!serverConfigured(env)) throw new GameServerError('Servidor ao vivo ainda não configurado.', 503);
  if (input.team !== 'red' && input.team !== 'blue') throw new GameServerError('Escolha 13 ou 22.', 400);
  const author = liveAuthor(input.author), client = liveClientKey(input.ip || 'desconhecido', env.SUPABASE_SECRET_KEY!);
  let text = '', audioUrl: string | null = null, durationMs: number | null = null, uploaded: string | null = null;
  if (input.kind === 'super') {
    text = cleanLiveText(input.text || '');
    if (!text) throw new GameServerError('Escreva a mensagem do super chat.', 400);
    if (/(https?:\/\/|www\.)/i.test(text)) throw new GameServerError('Links não são permitidos no chat ao vivo.', 400);
  } else if (input.kind === 'audio') {
    const audio = input.audio, type = (audio?.type || '').split(';')[0].trim().toLowerCase();
    durationMs = Math.round(Number(input.durationMs));
    if (!audio || !AUDIO_EXTENSIONS[type]) throw new GameServerError('Áudio inválido.', 400);
    if (audio.size > LIVE_CHAT.maxAudioBytes) throw new GameServerError('Áudio grande demais.', 413);
    if (!Number.isFinite(durationMs) || durationMs < LIVE_CHAT.minAudioMs) throw new GameServerError('Áudio curto demais.', 400);
    durationMs = Math.min(durationMs, LIVE_CHAT.maxAudioMs);
    uploaded = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${AUDIO_EXTENSIONS[type]}`;
    const storage = createClient(env.SUPABASE_URL!, env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetcher as typeof fetch } }).storage.from(LIVE_AUDIO_BUCKET);
    const { error } = await storage.upload(uploaded, new Uint8Array(await audio.arrayBuffer()), { contentType: type, upsert: false });
    if (error) throw new GameServerError('Não foi possível guardar o áudio. Tente de novo.', 503);
    audioUrl = new URL(`/storage/v1/object/public/${LIVE_AUDIO_BUCKET}/${uploaded}`, env.SUPABASE_URL).toString();
    try { return await save(); } catch (error) { await storage.remove([uploaded]).catch(() => {}); throw error; }
  } else throw new GameServerError('Tipo de mensagem inválido.', 400);
  return save();

  async function save() {
    const row = await callGameFunction<unknown>(env, 'live_post_message', { p_client: client, p_kind: input.kind, p_team: input.team, p_author: author, p_text: text, p_audio_url: audioUrl, p_duration_ms: durationMs, p_min_interval_ms: LIVE_CHAT.cooldownMs }, fetcher);
    const message = liveMessageFromRow(row);
    if (!message) throw new GameServerError('O servidor ao vivo devolveu uma mensagem inválida.', 503);
    return message;
  }
}
