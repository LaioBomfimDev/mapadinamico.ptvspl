import { createHash, timingSafeEqual } from 'node:crypto';
import { CATALOG, RULES, STATES, parseComment, parseInstagramComment, type Base, type BattleRecord, type UnitKind } from './game.ts';
import { validLedger, type PointEntry } from './points.ts';

/**
 * Servidor do jogo no Supabase. Só roda no servidor do site: usa a chave secreta, que ignora as regras
 * de linha do banco. O navegador nunca recebe essa chave nem acessa o banco diretamente.
 */
export type ServerEnv = { SUPABASE_URL?: string; SUPABASE_SECRET_KEY?: string; MAP_ADMIN_TOKEN?: string; [key: string]: string | undefined };
type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;
type Municipality = { id: string; name: string };

export class GameServerError extends Error {
  status: number;
  constructor(message: string, status = 503) { super(message); this.status = status; }
}
const MESSAGES: Record<string, [string, number]> = {
  base_ja_definida: ['Este perfil já tem uma base. Estado, município e time permanecem os mesmos.', 409],
  perfil_em_uso: ['Este @ já está ligado a outra conta do Instagram.', 409],
  pontos_insuficientes: ['Faltam pontos para esse equipamento.', 409],
  limite_do_equipamento: ['Limite deste equipamento atingido.', 409],
  base_nao_encontrada: ['Base não encontrada.', 404],
  equipamento_invalido: ['Equipamento desconhecido.', 400],
  comentario_invalido: ['Comentário sem identificação válida.', 400],
  pedido_invalido: ['Pedido de compra sem identificação válida.', 400],
  time_invalido: ['Escolha 13 ou 22.', 400],
  muito_rapido: ['Aguarde alguns segundos para mandar outra mensagem.', 429],
  visitante_invalido: ['Não foi possível identificar este envio.', 400],
};

export const serverConfigured = (env: ServerEnv) => !!(env.SUPABASE_URL && env.SUPABASE_SECRET_KEY);

/** Chamada às funções do banco pelo PostgREST do Supabase; a chave vai no cabeçalho apikey. */
export async function callGameFunction<T>(env: ServerEnv, name: string, args: Record<string, unknown>, fetcher: Fetcher = fetch): Promise<T> {
  if (!serverConfigured(env)) throw new GameServerError('Servidor do jogo ainda não configurado.', 503);
  let response: Response;
  try {
    response = await fetcher(new URL(`/rest/v1/rpc/${name}`, env.SUPABASE_URL), { method: 'POST', headers: { apikey: env.SUPABASE_SECRET_KEY!, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(args), cache: 'no-store' });
  } catch { throw new GameServerError('O servidor do jogo não respondeu. Tente novamente.'); }
  const text = await response.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* resposta não JSON tratada abaixo */ }
  if (!response.ok) {
    const code = typeof (data as { message?: unknown })?.message === 'string' ? (data as { message: string }).message : '';
    const known = MESSAGES[code];
    throw new GameServerError(known?.[0] || (response.status === 401 ? 'Chave do servidor do jogo recusada.' : 'O servidor do jogo não respondeu. Tente novamente.'), known?.[1] || 503);
  }
  return data as T;
}

const int = (value: unknown, max: number) => Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= max ? value as number : null;
const iso = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;

/** Converte uma linha do banco em Base; devolve null se algo vier fora do formato esperado. */
export function baseFromRow(row: unknown): Base | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>, inventory = Object.fromEntries(CATALOG.map(unit => [unit.kind, int(r[unit.kind], 10000)])) as Record<UnitKind, number | null>;
  const credits = int(r.credits, 10000000), rewarded = int(r.rewarded_comments, 1000), joinedAt = iso(r.joined_at);
  if (typeof r.id !== 'string' || typeof r.username !== 'string' || !/^[a-z\d._]{1,30}$/.test(r.username) || !STATES.some(state => state.uf === r.uf) || (r.team !== 'red' && r.team !== 'blue')) return null;
  if (Object.values(inventory).some(value => value === null) || credits === null || rewarded === null || !joinedAt || typeof r.comment_day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.comment_day)) return null;
  const municipalityId = typeof r.municipality_id === 'string' && r.uf === 'BA' && /^29\d{5}$/.test(r.municipality_id) ? r.municipality_id : undefined;
  const entries = (Array.isArray(r.entries) ? r.entries : []).map(entry => {
    const e = entry as Record<string, unknown>, at = iso(e?.at);
    return { key: e?.key, kind: e?.kind, points: e?.points, at, ...(typeof e?.subject === 'string' ? { subject: e.subject } : {}), ...(typeof e?.post === 'string' ? { post: e.post } : {}) } as PointEntry;
  });
  const progress = { entries };
  if (!validLedger(progress)) return null;
  return { id: r.id, username: r.username, uf: r.uf as string, ...(municipalityId ? { municipalityId } : {}), team: r.team, inventory: inventory as Record<UnitKind, number>, credits, joinedAt, commentDay: r.comment_day, rewardedComments: Math.min(rewarded, RULES.dailyCommentCap), progress };
}

function battleFromRow(row: unknown): BattleRecord | null {
  const r = row as Record<string, unknown>, at = iso(r?.at), red = int(r?.red, Number.MAX_SAFE_INTEGER), blue = int(r?.blue, Number.MAX_SAFE_INTEGER), controls = r?.controls as Record<string, unknown>;
  if (typeof r?.id !== 'string' || !at || red === null || blue === null || !['red', 'blue', 'draw'].includes(r.winner as string) || !controls || !STATES.every(state => ['red', 'blue', 'neutral'].includes(controls[state.uf] as string))) return null;
  return { id: r.id, at, winner: r.winner as BattleRecord['winner'], red, blue, controls: controls as BattleRecord['controls'] };
}

/** Estado compartilhado do mapa. Linhas fora do formato são descartadas em vez de quebrar a tela. */
export async function loadGameState(env: ServerEnv, fetcher?: Fetcher) {
  const data = await callGameFunction<{ bases?: unknown[]; history?: unknown[] }>(env, 'game_state', {}, fetcher);
  return {
    bases: (data?.bases || []).map(baseFromRow).filter((base): base is Base => !!base),
    history: (data?.history || []).map(battleFromRow).filter((battle): battle is BattleRecord => !!battle).slice(0, 10),
  };
}

/**
 * Inscrição por comentário. Quando vier do Instagram, aceita tanto comentários com cidade/estado
 * ("Catu BA 13", "SP 22") quanto comentários só com o time ("13", "22", "PT", "PL"), espalhando
 * quem não informou cidade entre os estados do Brasil pelo @ da pessoa.
 */
export async function registerServerComment(
  env: ServerEnv,
  input: { text: string; commentId: string; at: number; instagramId?: string; instagramUsername?: string; allowTeamFallback?: boolean },
  municipalities: readonly Municipality[],
  fetcher: Fetcher = fetch,
) {
  const parsed = input.instagramUsername
    ? parseInstagramComment(input.text, input.instagramUsername, municipalities, { allowTeamFallback: input.allowTeamFallback })
    : parseComment(input.text, municipalities);
  if (parsed.uf === 'BA' && !parsed.municipalityId) throw new GameServerError('Na Bahia, informe a cidade oficial no comentário, por exemplo: Catu BA 13.', 400);
  if (!Number.isFinite(input.at) || !input.commentId.trim() || input.commentId.length > 200) throw new GameServerError('Comentário sem identificação válida.', 400);
  if (input.instagramId !== undefined && !/^\d{1,30}$/.test(input.instagramId)) throw new GameServerError('ID do Instagram inválido.', 400);
  const rpcArgs = {
    p_comment_id: input.commentId, p_username: parsed.username, p_uf: parsed.uf, p_municipality_id: parsed.municipalityId ?? null, p_team: parsed.team,
    p_at: new Date(input.at).toISOString(), p_instagram_id: input.instagramId ?? null, p_points: RULES.pointsPerComment, p_daily_cap: RULES.dailyCommentCap,
  };
  try {
    return await callGameFunction<{ status: 'ok' | 'duplicate'; base_id?: string; created?: boolean; awarded?: boolean }>(env, 'game_register_comment', rpcArgs, fetcher);
  } catch (error) {
    if (input.instagramUsername && error instanceof GameServerError && error.message === MESSAGES.base_ja_definida[0]) {
      const current = await loadGameState(env, fetcher).catch(() => null);
      const existing = current?.bases.find(b => b.username === parsed.username);
      if (existing) {
        if (parsed.locationExplicit && env.SUPABASE_URL && env.SUPABASE_SECRET_KEY) {
          await fetcher(new URL(`/rest/v1/bases?id=eq.${encodeURIComponent(existing.id)}`, env.SUPABASE_URL), {
            method: 'PATCH',
            headers: { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ uf: parsed.uf, municipality_id: parsed.municipalityId ?? null, team: parsed.team }),
            cache: 'no-store',
          }).catch(() => null);
          return callGameFunction<{ status: 'ok' | 'duplicate'; base_id?: string; created?: boolean; awarded?: boolean }>(env, 'game_register_comment', rpcArgs, fetcher);
        }
        return callGameFunction<{ status: 'ok' | 'duplicate'; base_id?: string; created?: boolean; awarded?: boolean }>(env, 'game_register_comment', {
          ...rpcArgs,
          p_uf: existing.uf,
          p_municipality_id: existing.municipalityId ?? null,
          p_team: existing.team,
        }, fetcher);
      }
    }
    throw error;
  }
}

export async function buyServerUnit(env: ServerEnv, input: { requestId: string; baseId: string; kind: string }, fetcher?: Fetcher) {
  if (!CATALOG.some(unit => unit.kind === input.kind)) throw new GameServerError('Equipamento desconhecido.', 400);
  return callGameFunction<{ status: 'ok' | 'duplicate'; credits?: number }>(env, 'game_buy_unit', { p_request_id: input.requestId, p_base_id: input.baseId, p_kind: input.kind }, fetcher);
}

/** Token administrativo (Authorization: Bearer) com pelo menos 32 caracteres, comparado em tempo constante. */
export function adminAuthorized(header: string | null, token: string | undefined) {
  if (!token || token.length < 32 || !header?.startsWith('Bearer ')) return false;
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(header.slice(7)), digest(token));
}
