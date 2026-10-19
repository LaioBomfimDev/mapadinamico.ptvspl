import municipalities from '../../../../public/war-assets/bahia-municipality-index.json';
import { syncInstagramComments } from '../../../../lib/war/instagram-sync';
import { GameServerError, adminAuthorized, buyServerUnit, registerServerComment } from '../../../../lib/war/server-game';
import { deleteServerProfile } from '../../../../lib/war/server-privacy';

export const dynamic = 'force-dynamic';
const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

/**
 * Cadastro administrativo e sincronização do Instagram. Exige MAP_ADMIN_TOKEN no cabeçalho
 * Authorization: Bearer. Ações: { action: "comment", text: "@fulano Catu BA 13" },
 * { action: "buy", baseId: "u-fulano", kind: "tank" }, { action: "delete", username: "fulano" }
 * e { action: "sync-instagram" }.
 */
export async function POST(request: Request) {
  if (!adminAuthorized(request.headers.get('authorization'), process.env.MAP_ADMIN_TOKEN)) return reply({ error: 'Acesso administrativo não autorizado.' }, 401);
  const raw = await request.text();
  if (raw.length > 4096) return reply({ error: 'Pedido grande demais.' }, 413);
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return reply({ error: 'JSON inválido.' }, 400); }
  try {
    if (body.action === 'sync-instagram')
      return reply(await syncInstagramComments(process.env, municipalities, { force: true }));
    if (body.action === 'comment' && typeof body.text === 'string')
      return reply(await registerServerComment(process.env, { text: body.text, commentId: typeof body.commentId === 'string' ? body.commentId : `admin:${crypto.randomUUID()}`, at: Date.now() }, municipalities));
    if (body.action === 'buy' && typeof body.baseId === 'string' && typeof body.kind === 'string')
      return reply(await buyServerUnit(process.env, { requestId: typeof body.requestId === 'string' ? body.requestId : `admin:${crypto.randomUUID()}`, baseId: body.baseId, kind: body.kind }));
    if (body.action === 'delete' && typeof body.username === 'string')
      return reply(await deleteServerProfile(process.env, body.username));
    return reply({ error: 'Ação desconhecida. Use "comment", "buy", "delete" ou "sync-instagram".' }, 400);
  } catch (error) {
    if (error instanceof GameServerError) return reply({ error: error.message }, error.status);
    return reply({ error: (error as Error).message || 'Pedido inválido.' }, 400);
  }
}

