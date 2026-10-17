import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CATALOG, RULES, forceOf } from '../lib/war/game.ts';
import { earnedPoints } from '../lib/war/points.ts';
import { GameServerError, adminAuthorized, baseFromRow, buyServerUnit, loadGameState, registerServerComment, serverConfigured } from '../lib/war/server-game.ts';
import { createLocalSupabase } from '../scripts/supabase-local.mjs';

const municipalities = JSON.parse(await readFile(new URL('../public/war-assets/bahia-municipality-index.json', import.meta.url), 'utf8'));
const env = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SECRET_KEY: 'local-secret' };
const day = Date.parse('2026-10-17T15:00:00Z'), nextDay = Date.parse('2026-10-18T15:00:00Z');
let local;
before(async () => { local = await createLocalSupabase(env.SUPABASE_SECRET_KEY); });
after(async () => { await local.close(); });
const register = (text, commentId, at = day, extra = {}) => registerServerComment(env, { text, commentId, at, ...extra }, municipalities, local.fetcher);
const state = () => loadGameState(env, local.fetcher);

test('first comment creates the base with three soldiers and arrival points; a repeated comment counts once', async () => {
  const first = await register('@fulano Catu BA 13', 'c-1');
  assert.deepEqual({ ...first }, { status: 'ok', base_id: 'u-fulano', created: true, awarded: true });
  assert.equal((await register('@fulano Catu BA 13', 'c-1')).status, 'duplicate');
  const base = (await state()).bases.find(b => b.username === 'fulano');
  assert.deepEqual(base.inventory, { infantry: 3, tank: 0, artillery: 0, drone: 0, aircraft: 0 });
  assert.equal(base.municipalityId, '2907509'); assert.equal(base.team, 'red'); assert.equal(base.credits, RULES.pointsPerComment);
  assert.equal(earnedPoints(base), RULES.pointsPerComment); assert.equal(base.progress.entries[0].kind, 'arrival');
});

test('points stop at the daily cap in Brasília and restart the next day', async () => {
  for (let i = 0; i < 8; i++) await register('@cap_teste SP 22', `cap-${i}`);
  let base = (await state()).bases.find(b => b.username === 'cap_teste');
  assert.equal(base.credits, RULES.pointsPerComment * RULES.dailyCommentCap); assert.equal(base.rewardedComments, RULES.dailyCommentCap);
  assert.equal((await register('@cap_teste SP 22', 'cap-next', nextDay)).awarded, true);
  base = (await state()).bases.find(b => b.username === 'cap_teste');
  assert.equal(base.credits, RULES.pointsPerComment * (RULES.dailyCommentCap + 1)); assert.equal(base.commentDay, '2026-10-18');
});

test('state, city and team stay locked; Bahia requires an official city', async () => {
  await register('@travado RJ 13', 't-1');
  await assert.rejects(register('@travado SP 13', 't-2'), { message: /já tem uma base/ });
  await assert.rejects(register('@travado RJ 22', 't-3'), { message: /já tem uma base/ });
  await assert.rejects(register('@semcidade BA 13', 't-4'), { message: /cidade|município/i });
  assert.equal((await state()).bases.filter(b => b.username === 'travado').length, 1);
  await assert.rejects(register('bora 13', 't-5'), { message: /Use @seunome/ });
});

test('Instagram identity comes from Meta: the same account keeps one base, another account cannot take the @', async () => {
  const created = await register('Feira de Santana BA 22', 'ig-1', day, { instagramId: '1789', instagramUsername: 'perfil_real' });
  assert.match(created.base_id, /^ig-[0-9a-f]{20}$/);
  assert.equal((await register('@qualquer_coisa Feira de Santana BA 22', 'ig-2', day, { instagramId: '1789', instagramUsername: 'perfil_real' })).base_id, created.base_id);
  await assert.rejects(register('Feira de Santana BA 22', 'ig-3', day, { instagramId: '9999', instagramUsername: 'perfil_real' }), { message: /outra conta/ });
  const body = await (await local.fetcher(`${env.SUPABASE_URL}/rest/v1/rpc/game_state`, { method: 'POST', headers: { apikey: env.SUPABASE_SECRET_KEY }, body: '{}' })).json();
  assert.ok(!JSON.stringify(body).includes('1789"') && !('instagram_id' in body.bases[0]), 'o ID do Instagram não sai do servidor');
});

test('purchases debit points atomically, never twice for the same request, and keep the earned history', async () => {
  await register('@comprador MG 13', 'b-1');
  for (let i = 2; i <= 5; i++) await register('@comprador MG 13', `b-${i}`);
  const id = (await state()).bases.find(b => b.username === 'comprador').id;
  assert.deepEqual({ ...(await buyServerUnit(env, { requestId: 'p-1', baseId: id, kind: 'artillery' }, local.fetcher)) }, { status: 'ok', credits: 10 });
  assert.equal((await buyServerUnit(env, { requestId: 'p-1', baseId: id, kind: 'artillery' }, local.fetcher)).status, 'duplicate');
  await assert.rejects(buyServerUnit(env, { requestId: 'p-2', baseId: id, kind: 'tank' }, local.fetcher), { message: /Faltam pontos/ });
  await assert.rejects(buyServerUnit(env, { requestId: 'p-3', baseId: 'nao-existe', kind: 'tank' }, local.fetcher), { message: /não encontrada/ });
  await assert.rejects(buyServerUnit(env, { requestId: 'p-4', baseId: id, kind: 'navio' }, local.fetcher), { message: /desconhecido/ });
  const base = (await state()).bases.find(b => b.id === id);
  assert.equal(base.credits, 10); assert.equal(base.inventory.artillery, 1); assert.equal(earnedPoints(base), 50);
  assert.equal(forceOf(base), 3 * 10 + 55);
});

test('database prices match the game catalog', async () => {
  for (const unit of CATALOG) assert.equal((await local.call('game_unit_cost', { p_kind: unit.kind })).body, unit.cost);
  assert.equal((await local.call('game_unit_cost', { p_kind: 'navio' })).body, null);
});

test('the browser key reaches nothing: tables and functions are closed to anon and authenticated', async () => {
  for (const role of ['anon', 'authenticated']) {
    assert.equal((await local.call('game_state', {}, role)).status, 401);
    assert.equal((await local.call('game_register_comment', { p_comment_id: 'x', p_username: 'invasor', p_uf: 'SP', p_municipality_id: null, p_team: 'red', p_at: new Date(day).toISOString() }, role)).status, 401);
    await assert.rejects(local.db.transaction(async tx => { await tx.exec(`set local role ${role}`); await tx.query('select * from public.bases'); }), /permission denied/);
  }
});

test('configuration, admin token and server errors are explicit', async () => {
  assert.equal(serverConfigured({}), false); assert.equal(serverConfigured(env), true);
  await assert.rejects(loadGameState({}), GameServerError);
  await assert.rejects(loadGameState({ ...env, SUPABASE_SECRET_KEY: 'errada' }, local.fetcher), { message: /Chave do servidor/ });
  await assert.rejects(loadGameState(env, async () => { throw new Error('offline'); }), { message: /não respondeu/ });
  const token = 'x'.repeat(40);
  assert.equal(adminAuthorized(`Bearer ${token}`, token), true);
  assert.equal(adminAuthorized(`Bearer ${token}y`, token), false);
  assert.equal(adminAuthorized(null, token), false);
  assert.equal(adminAuthorized('Bearer curto', 'curto'), false, 'token curto demais não libera nada');
});

test('malformed rows are dropped instead of breaking the map', () => {
  const good = { id: 'u-a', username: 'a', uf: 'SP', team: 'red', infantry: 3, tank: 0, artillery: 0, drone: 0, aircraft: 0, credits: 10, joined_at: '2026-10-17T12:00:00Z', comment_day: '2026-10-17', rewarded_comments: 1, entries: [{ key: 'comment:x', kind: 'arrival', points: 10, at: '2026-10-17T12:00:00Z', subject: null, post: null }] };
  assert.ok(baseFromRow(good));
  for (const bad of [{ ...good, team: 'green' }, { ...good, tank: -1 }, { ...good, uf: 'XX' }, { ...good, username: 'Com Espaço' }, { ...good, entries: [{ key: '', kind: 'arrival', points: 1, at: 'x' }] }, null]) assert.equal(baseFromRow(bad), null);
  assert.equal(baseFromRow({ ...good, uf: 'SP', municipality_id: '2907509' }).municipalityId, undefined);
});
