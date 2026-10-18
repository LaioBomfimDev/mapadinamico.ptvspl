import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { GameServerError, registerServerComment, serverConfigured, type ServerEnv } from './server-game.ts';

/**
 * Receptor dos comentários do Instagram (webhook da Meta). Cada comentário nos posts do @vocee13ou22 no formato
 * "Catu BA 13" ou "SP 22" cria ou pontua a base de quem comentou. O @ e o ID vêm da Meta, não do texto.
 * Variáveis: INSTAGRAM_APP_SECRET (assinatura), INSTAGRAM_VERIFY_TOKEN (confirmação do painel),
 * INSTAGRAM_ACCOUNT_ID (opcional: só a conta do jogo), INSTAGRAM_MEDIA_IDS (opcional: só estes posts).
 */
type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;
type Municipality = { id: string; name: string };
export type InstagramComment = { commentId: string; text: string; fromId: string; username: string; mediaId: string; at: number };
export const MAX_WEBHOOK_BYTES = 262_144;

export const instagramConfigured = (env: ServerEnv) => !!(env.INSTAGRAM_APP_SECRET && env.INSTAGRAM_VERIFY_TOKEN) && serverConfigured(env);

const sameText = (a: string, b: string) => { const digest = (value: string) => createHash('sha256').update(value).digest(); return timingSafeEqual(digest(a), digest(b)); };

/** Confirmação do painel da Meta (GET com hub.challenge); null quando o token não confere. */
export function verifySubscription(params: URLSearchParams, token: string | undefined) {
  const given = params.get('hub.verify_token');
  return token && given && params.get('hub.mode') === 'subscribe' && sameText(given, token) ? params.get('hub.challenge') ?? '' : null;
}

/** Assinatura X-Hub-Signature-256: HMAC SHA-256 do corpo exato com a chave secreta do app. */
export function validMetaSignature(raw: string, header: string | null, secret: string | undefined) {
  if (!secret || !header?.startsWith('sha256=') || !/^[0-9a-f]{64}$/i.test(header.slice(7))) return false;
  const expected = createHmac('sha256', secret).update(raw, 'utf8').digest(), given = Buffer.from(header.slice(7), 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Tira emojis e pontuação que as pessoas costumam acrescentar ("Catu BA 13!!! 🔥" vira "Catu BA 13"). */
export const cleanCommentText = (text: string) => text.normalize('NFC').replace(/[’`´]/g, "'").replace(/[^\p{L}\p{N}@._'\s-]/gu, ' ').replace(/\s+/g, ' ').trim();

/** Comentários válidos do lote; ignora outros eventos, a própria conta do jogo e posts fora da lista. */
export function commentsFrom(payload: unknown, accountId?: string, mediaIds?: ReadonlySet<string>): InstagramComment[] {
  const body = payload as { object?: unknown; entry?: unknown };
  if (body?.object !== 'instagram' || !Array.isArray(body.entry)) return [];
  const comments: InstagramComment[] = [];
  for (const entry of body.entry as Record<string, unknown>[]) {
    if (!entry || (accountId && String(entry.id) !== accountId) || !Array.isArray(entry.changes)) continue;
    const time = Number(entry.time), at = Number.isFinite(time) && time > 1e9 ? (time < 1e12 ? time * 1000 : time) : Date.now();
    for (const change of entry.changes as Record<string, unknown>[]) {
      const value = change?.value as Record<string, unknown> | undefined, from = value?.from as Record<string, unknown> | undefined, media = value?.media as Record<string, unknown> | undefined;
      if (change?.field !== 'comments' || !value || typeof value.text !== 'string' || !value.id || !from?.id || typeof from.username !== 'string') continue;
      if (String(from.id) === String(entry.id) || (mediaIds?.size && !mediaIds.has(String(media?.id)))) continue;
      comments.push({ commentId: String(value.id), text: value.text, fromId: String(from.id), username: from.username, mediaId: String(media?.id ?? ''), at });
    }
  }
  return comments;
}

/** Processa um lote assinado. Comentários fora do formato são ignorados; queda do banco devolve 503 para a Meta reenviar. */
export async function handleInstagramComments(env: ServerEnv, raw: string, signature: string | null, municipalities: readonly Municipality[], fetcher?: Fetcher) {
  if (!instagramConfigured(env)) return { status: 503, body: { error: 'Integração com o Instagram ainda não configurada.' } };
  if (raw.length > MAX_WEBHOOK_BYTES) return { status: 413, body: { error: 'Limite excedido.' } };
  if (!validMetaSignature(raw, signature, env.INSTAGRAM_APP_SECRET)) return { status: 401, body: { error: 'Assinatura inválida.' } };
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return { status: 400, body: { error: 'JSON inválido.' } }; }
  const mediaIds = new Set((env.INSTAGRAM_MEDIA_IDS || '').split(',').map(id => id.trim()).filter(Boolean));
  let counted = 0, created = 0, ignored = 0;
  for (const comment of commentsFrom(payload, env.INSTAGRAM_ACCOUNT_ID?.trim() || undefined, mediaIds)) {
    try {
      const result = await registerServerComment(env, { text: cleanCommentText(comment.text), commentId: `ig:${comment.commentId}`, at: comment.at, instagramId: comment.fromId, instagramUsername: comment.username }, municipalities, fetcher);
      if (result.status === 'ok') { counted++; if (result.created) created++; } else ignored++;
    } catch (error) {
      if (error instanceof GameServerError && error.status >= 500) return { status: 503, body: { error: 'Falha temporária ao salvar; a Meta vai reenviar.' } };
      ignored++;
    }
  }
  return { status: 200, body: { received: true, counted, created, ignored } };
}
