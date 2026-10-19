import { cleanCommentText } from './instagram-webhook.ts';
import { GameServerError, registerServerComment, serverConfigured, type ServerEnv } from './server-game.ts';

type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;
type Municipality = { id: string; name: string };

export type SyncedCommentDetail = {
  mediaId: string;
  shortcode?: string;
  commentId: string;
  username: string;
  status: 'created' | 'counted' | 'duplicate' | 'ignored';
  baseId?: string;
};

export type InstagramSyncResult = {
  synced: boolean;
  reason?: string;
  postsChecked: number;
  commentsFound: number;
  created: number;
  counted: number;
  duplicates: number;
  ignored: number;
  details: SyncedCommentDetail[];
};

type GraphMedia = { id?: string; shortcode?: string; permalink?: string; timestamp?: string };
type GraphComment = {
  id?: string;
  text?: string;
  timestamp?: string;
  username?: string;
  from?: { id?: string; username?: string };
  replies?: { data?: GraphComment[] };
};

let lastAutoSyncAt = 0;
const AUTO_SYNC_INTERVAL_MS = 25_000;

function extractShortcode(media: GraphMedia): string | undefined {
  if (typeof media.shortcode === 'string' && media.shortcode) return media.shortcode;
  if (typeof media.permalink === 'string') {
    const match = media.permalink.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
    if (match) return match[1];
  }
  return undefined;
}

async function fetchGraphJson(url: string, token: string, fetcher: Fetcher): Promise<{ ok: boolean; status: number; data: Record<string, unknown> | null }> {
  const separator = url.includes('?') ? '&' : '?';
  const fullUrl = `${url}${separator}access_token=${encodeURIComponent(token)}`;
  try {
    const response = await fetcher(fullUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const text = await response.text();
    let data: Record<string, unknown> | null = null;
    try { data = text ? (JSON.parse(text) as Record<string, unknown>) : null; } catch { data = null; }
    return { ok: response.ok && !!data && !('error' in data), status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

async function listAccountMedia(token: string, accountId: string | undefined, fetcher: Fetcher): Promise<{ apiBase: string; media: GraphMedia[] }> {
  const bases = token.startsWith('EAA')
    ? ['https://graph.facebook.com/v22.0', 'https://graph.instagram.com/v22.0', 'https://graph.instagram.com']
    : ['https://graph.instagram.com/v22.0', 'https://graph.instagram.com', 'https://graph.facebook.com/v22.0'];

  const targets = ['me', ...(accountId ? [accountId] : [])];
  const fieldSets = ['id,shortcode,permalink,timestamp', 'id,permalink,timestamp', 'id,timestamp'];

  for (const apiBase of bases) {
    for (const target of targets) {
      for (const fields of fieldSets) {
        const res = await fetchGraphJson(`${apiBase}/${target}/media?fields=${fields}&limit=25`, token, fetcher);
        if (res.ok && Array.isArray(res.data?.data)) {
          return { apiBase, media: res.data.data as GraphMedia[] };
        }
      }
    }
  }
  return { apiBase: bases[0], media: [] };
}

async function listMediaComments(apiBase: string, mediaId: string, token: string, fetcher: Fetcher): Promise<GraphComment[]> {
  const fieldSets = [
    'id,text,timestamp,username,from,replies{id,text,timestamp,username,from}',
    'id,text,timestamp,username,replies{id,text,timestamp,username}',
    'id,text,timestamp,username,from',
    'id,text,timestamp,username',
    'id,text,timestamp',
  ];

  for (const fields of fieldSets) {
    const res = await fetchGraphJson(`${apiBase}/${mediaId}/comments?fields=${fields}&limit=100`, token, fetcher);
    if (res.ok && Array.isArray(res.data?.data)) {
      const top = res.data.data as GraphComment[];
      const flat: GraphComment[] = [];
      for (const item of top) {
        flat.push(item);
        if (Array.isArray(item.replies?.data)) {
          for (const reply of item.replies.data) flat.push(reply);
        }
      }
      return flat;
    }
  }
  return [];
}

async function resolveCommentUsername(apiBase: string, comment: GraphComment, token: string, fetcher: Fetcher, indexInMedia: number): Promise<{ username: string; fromId?: string }> {
  const directUser = (comment.username || comment.from?.username || '').trim().replace(/^@/, '').toLowerCase();
  const directFromId = comment.from?.id && /^\d{1,30}$/.test(String(comment.from.id)) ? String(comment.from.id) : undefined;
  if (directUser) return { username: directUser, fromId: directFromId };

  if (comment.id) {
    for (const fields of ['id,username,from', 'id,username']) {
      const detail = await fetchGraphJson(`${apiBase}/${comment.id}?fields=${fields}`, token, fetcher);
      if (detail.ok && detail.data) {
        const dUser = String((detail.data.username as string | undefined) || ((detail.data.from as { username?: string } | undefined)?.username) || '').trim().replace(/^@/, '').toLowerCase();
        const dFromId = (detail.data.from as { id?: string } | undefined)?.id;
        if (dUser) return { username: dUser, fromId: dFromId && /^\d{1,30}$/.test(String(dFromId)) ? String(dFromId) : directFromId };
      }
    }
  }

  const textMention = typeof comment.text === 'string' ? comment.text.match(/@([a-z\d._]{2,30})/i)?.[1]?.toLowerCase() : undefined;
  if (textMention && textMention !== 'vocee13ou22') return { username: textMention, fromId: directFromId };

  const suffix = String(comment.id || indexInMedia).replace(/\D/g, '').slice(-6) || String(indexInMedia + 1);
  return { username: `combatente_${suffix}`, fromId: directFromId };
}

/**
 * Busca comentários existentes nos posts da conta @vocee13ou22 via Graph API do Instagram
 * e cria/pontua as bases no Supabase aplicando a regra de espalhar sem-cidade pelos estados via @.
 */
export async function syncInstagramComments(
  env: ServerEnv,
  municipalities: readonly Municipality[],
  options: { force?: boolean; fetcher?: Fetcher } = {},
): Promise<InstagramSyncResult> {
  const token = env.INSTAGRAM_ACCESS_TOKEN?.trim();
  if (!token || !serverConfigured(env)) {
    return { synced: false, reason: !token ? 'missing_token' : 'server_not_configured', postsChecked: 0, commentsFound: 0, created: 0, counted: 0, duplicates: 0, ignored: 0, details: [] };
  }

  const now = Date.now();
  if (!options.force && now - lastAutoSyncAt < AUTO_SYNC_INTERVAL_MS) {
    return { synced: false, reason: 'throttled', postsChecked: 0, commentsFound: 0, created: 0, counted: 0, duplicates: 0, ignored: 0, details: [] };
  }
  lastAutoSyncAt = now;

  const fetcher = options.fetcher || fetch;
  const accountId = env.INSTAGRAM_ACCOUNT_ID?.trim() || undefined;
  const allowedIds = new Set((env.INSTAGRAM_MEDIA_IDS || '').split(',').map(s => s.trim()).filter(Boolean));

  const { apiBase, media } = await listAccountMedia(token, accountId, fetcher);
  const filteredMedia = allowedIds.size
    ? media.filter(m => (m.id && allowedIds.has(String(m.id))) || (extractShortcode(m) && allowedIds.has(extractShortcode(m)!)))
    : media;
  const targetMedia = filteredMedia.length > 0 ? filteredMedia : media;

  let commentsFound = 0, created = 0, counted = 0, duplicates = 0, ignored = 0;
  const details: SyncedCommentDetail[] = [];

  for (const post of targetMedia) {
    const mediaId = String(post.id || '');
    if (!mediaId) continue;
    const shortcode = extractShortcode(post);
    const comments = await listMediaComments(apiBase, mediaId, token, fetcher);

    for (let i = 0; i < comments.length; i++) {
      const c = comments[i];
      if (!c?.id || typeof c.text !== 'string') continue;
      commentsFound++;
      const { username, fromId } = await resolveCommentUsername(apiBase, c, token, fetcher, i);
      if (username === 'vocee13ou22' || (accountId && fromId === accountId)) {
        ignored++;
        details.push({ mediaId, shortcode, commentId: String(c.id), username, status: 'ignored' });
        continue;
      }

      const at = c.timestamp && Number.isFinite(Date.parse(c.timestamp)) ? Date.parse(c.timestamp) : Date.now();
      try {
        const result = await registerServerComment(
          env,
          {
            text: cleanCommentText(c.text) || c.text,
            commentId: `ig:${c.id}`,
            at,
            instagramId: fromId,
            instagramUsername: username,
            allowTeamFallback: true,
          },
          municipalities,
          fetcher,
        );
        if (result.status === 'ok') {
          counted++;
          if (result.created) created++;
          details.push({ mediaId, shortcode, commentId: String(c.id), username, status: result.created ? 'created' : 'counted', baseId: result.base_id });
        } else {
          duplicates++;
          details.push({ mediaId, shortcode, commentId: String(c.id), username, status: 'duplicate', baseId: result.base_id });
        }
      } catch (error) {
        if (error instanceof GameServerError && error.status === 409) {
          duplicates++;
          details.push({ mediaId, shortcode, commentId: String(c.id), username, status: 'duplicate' });
        } else {
          ignored++;
          details.push({ mediaId, shortcode, commentId: String(c.id), username, status: 'ignored' });
        }
      }
    }
  }

  return {
    synced: true,
    postsChecked: targetMedia.length,
    commentsFound,
    created,
    counted,
    duplicates,
    ignored,
    details,
  };
}
