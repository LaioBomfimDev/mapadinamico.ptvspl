import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { cleanCommentText, commentsFrom, handleInstagramComments, validMetaSignature, verifySubscription } from '../lib/war/instagram-webhook.ts';
import { syncInstagramComments } from '../lib/war/instagram-sync.ts';
import { stateForUsername } from '../lib/war/game.ts';
import { loadGameState } from '../lib/war/server-game.ts';
import { deleteServerProfile } from '../lib/war/server-privacy.ts';
import { postLiveMessage } from '../lib/war/server-live.ts';
import { createLocalSupabase } from '../scripts/supabase-local.mjs';

const municipalities = JSON.parse(await readFile(new URL('../public/war-assets/bahia-municipality-index.json', import.meta.url), 'utf8'));
const env = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SECRET_KEY: 'local-secret', INSTAGRAM_APP_SECRET: 'segredo-do-app-de-teste', INSTAGRAM_VERIFY_TOKEN: 'palavra-de-teste', INSTAGRAM_ACCOUNT_ID: '17840000000000001' };
const time = Math.floor(Date.parse('2026-10-17T21:00:00Z') / 1000);
let local;
before(async () => { local = await createLocalSupabase(env.SUPABASE_SECRET_KEY); });
after(async () => { await local.close(); });
const sign = (raw, secret = env.INSTAGRAM_APP_SECRET) => `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`;
const comment = (id, text, fromId, username, extra = {}) => ({ field: 'comments', value: { id, text, from: { id: fromId, username }, media: { id: '1801', media_product_type: 'FEED' }, ...extra } });
const payload = (...changes) => JSON.stringify({ object: 'instagram', entry: [{ id: env.INSTAGRAM_ACCOUNT_ID, time, changes }] });
const deliver = (raw, signature = sign(raw), target = env) => handleInstagramComments(target, raw, signature, municipalities, local.fetcher);
const bases = async () => (await loadGameState(env, local.fetcher)).bases;

test('the Meta panel confirmation only passes with the right token', () => {
  assert.equal(verifySubscription(new URLSearchParams('hub.mode=subscribe&hub.verify_token=palavra-de-teste&hub.challenge=987'), env.INSTAGRAM_VERIFY_TOKEN), '987');
  assert.equal(verifySubscription(new URLSearchParams('hub.mode=subscribe&hub.verify_token=errada&hub.challenge=987'), env.INSTAGRAM_VERIFY_TOKEN), null);
  assert.equal(verifySubscription(new URLSearchParams('hub.mode=subscribe&hub.challenge=987'), env.INSTAGRAM_VERIFY_TOKEN), null);
  assert.equal(verifySubscription(new URLSearchParams('hub.mode=subscribe&hub.verify_token=&hub.challenge=1'), undefined), null);
});

test('only bodies signed with the app secret are accepted; nothing is saved otherwise', async () => {
  const raw = payload(comment('c-sig', 'SP 22', '9001', 'assinatura'));
  assert.equal(validMetaSignature(raw, sign(raw), env.INSTAGRAM_APP_SECRET), true);
  assert.equal(validMetaSignature(raw + ' ', sign(raw), env.INSTAGRAM_APP_SECRET), false);
  assert.equal((await deliver(raw, sign(raw, 'outro-segredo'))).status, 401);
  assert.equal((await deliver(raw, null)).status, 401);
  assert.equal((await deliver(raw, 'sha256=zz')).status, 401);
  assert.equal((await handleInstagramComments({ ...env, INSTAGRAM_APP_SECRET: '' }, raw, sign(raw), municipalities, local.fetcher)).status, 503);
  assert.equal((await bases()).some(b => b.username === 'assinatura'), false);
});

test('a comment on the official post creates the base of whoever commented, with the @ given by Meta', async () => {
  const raw = payload(comment('c-1', '@vocee13ou22 Catu BA 13 🔥🔥', '9101', 'Fulano.Real'), comment('c-2', 'Vitória da Conquista BA 22!!!', '9102', 'conquista_real'), comment('c-3', 'SP 22', '9103', 'resposta_sp', { parent_id: 'c-1' }));
  const result = await deliver(raw);
  assert.equal(result.status, 200); assert.deepEqual({ counted: result.body.counted, created: result.body.created, ignored: result.body.ignored }, { counted: 3, created: 3, ignored: 0 });
  const all = await bases(), catu = all.find(b => b.username === 'fulano.real'), conquista = all.find(b => b.username === 'conquista_real');
  assert.equal(catu.municipalityId, '2907509'); assert.equal(catu.team, 'red'); assert.match(catu.id, /^ig-[0-9a-f]{20}$/);
  assert.equal(conquista.municipalityId, '2933307'); assert.equal(conquista.team, 'blue');
  assert.ok(all.some(b => b.username === 'resposta_sp' && b.uf === 'SP'));
  assert.equal((await deliver(raw)).body.counted, 0, 'a Meta reenviando o mesmo lote não duplica nada');
});

test('comments without team, from the game account, from other posts or other accounts are ignored; comments without city spread across Brazil by @', async () => {
  const before = (await bases()).length;
  const raw = payload(comment('c-10', 'que jogo legal', '9201', 'curioso'), comment('c-11', 'SP 22', env.INSTAGRAM_ACCOUNT_ID, 'vocee13ou22'), comment('c-12', '13', '9202', 'sem_cidade'), comment('c-13', 'Catu BA 22', '9101', 'fulano.real'), { field: 'mentions', value: {} });
  const result = await deliver(raw);
  assert.equal(result.status, 200); assert.equal(result.body.counted, 1); assert.equal(result.body.created, 1); assert.equal(result.body.ignored, 2, 'sem time e troca de time são ignorados; só time cria base pelo @');
  const semCidade = (await bases()).find(b => b.username === 'sem_cidade');
  assert.equal(semCidade?.uf, stateForUsername('sem_cidade').uf);
  assert.equal(semCidade?.team, 'red');
  const other = JSON.stringify({ object: 'instagram', entry: [{ id: '999', time, changes: [comment('c-14', 'SP 13', '9203', 'outra_conta')] }] });
  assert.equal((await deliver(other)).body.counted, 0);
  const onlyOnePost = { ...env, INSTAGRAM_MEDIA_IDS: '1802, 1803' };
  assert.equal((await deliver(payload(comment('c-15', 'SP 13', '9204', 'post_errado')), undefined, onlyOnePost)).body.counted, 0);
  assert.equal((await bases()).length, before + 1);
  assert.equal((await deliver('{json quebrado')).status, 400);
});

test('syncInstagramComments fetches existing comments from Instagram posts without city and creates bases spread across states by @', async () => {
  const syncEnv = { ...env, INSTAGRAM_ACCESS_TOKEN: 'IG-fake-token' };
  const graphFetcher = async (input, init) => {
    const url = String(input);
    if (url.includes('graph.instagram.com')) {
      if (url.includes('/media?')) {
        return new Response(JSON.stringify({ data: [
          { id: 'm-1', shortcode: 'DemLNxBxY22', permalink: 'https://www.instagram.com/p/DemLNxBxY22/' },
          { id: 'm-2', shortcode: 'Demxskmpibh', permalink: 'https://www.instagram.com/p/Demxskmpibh/' },
        ] }), { status: 200 });
      }
      if (url.includes('/m-1/comments')) {
        return new Response(JSON.stringify({ data: [
          { id: 'igc-101', text: '13 🔥', timestamp: '2026-10-18T12:00:00Z', username: 'pessoa_post1_a', from: { id: '7001', username: 'pessoa_post1_a' } },
          { id: 'igc-102', text: 'Aqui é 22!', timestamp: '2026-10-18T12:05:00Z', username: 'pessoa_post1_b', from: { id: '7002', username: 'pessoa_post1_b' } },
        ] }), { status: 200 });
      }
      if (url.includes('/m-2/comments')) {
        return new Response(JSON.stringify({ data: [
          { id: 'igc-201', text: 'Bora participar!', timestamp: '2026-10-18T14:00:00Z', username: 'pessoa_post2_a', from: { id: '7003', username: 'pessoa_post2_a' } },
          { id: 'igc-202', text: '22 neles', timestamp: '2026-10-18T14:10:00Z', username: 'pessoa_post2_b', from: { id: '7004', username: 'pessoa_post2_b' } },
        ] }), { status: 200 });
      }
    }
    return local.fetcher(input, init);
  };
  const syncResult = await syncInstagramComments(syncEnv, municipalities, { force: true, fetcher: graphFetcher });
  assert.equal(syncResult.synced, true);
  assert.equal(syncResult.postsChecked, 2);
  assert.equal(syncResult.commentsFound, 4);
  assert.equal(syncResult.created, 4);
  const all = await bases();
  for (const handle of ['pessoa_post1_a', 'pessoa_post1_b', 'pessoa_post2_a', 'pessoa_post2_b']) {
    const found = all.find(b => b.username === handle);
    assert.ok(found, `base criada para ${handle}`);
    assert.equal(found.uf, stateForUsername(handle).uf);
  }
  const secondSync = await syncInstagramComments(syncEnv, municipalities, { force: true, fetcher: graphFetcher });
  assert.equal(secondSync.created, 0);
  assert.equal(secondSync.duplicates, 4);
});

test('if the database is down the webhook answers 503 so Meta delivers again later', async () => {
  const raw = payload(comment('c-20', 'RJ 13', '9301', 'banco_fora'));
  assert.equal((await handleInstagramComments(env, raw, sign(raw), municipalities, async () => { throw new Error('offline'); })).status, 503);
  assert.equal((await deliver(raw)).body.created, 1, 'no reenvio o comentário entra normalmente');
});

test('cleaning keeps city names with accents, hyphens and apostrophes', () => {
  assert.equal(cleanCommentText("  Dias d’Ávila BA 13 ❤️ "), "Dias d'Ávila BA 13");
  assert.equal(cleanCommentText('Xique-Xique BA 22!!!'), 'Xique-Xique BA 22');
  assert.equal(commentsFrom({ object: 'page', entry: [] }).length, 0);
  assert.equal(commentsFrom(null).length, 0);
});

test('a data deletion request removes the base, its points, chat messages and audio files', async () => {
  await deliver(payload(comment('c-30', 'MG 22', '9401', 'quer_sair')));
  await postLiveMessage(env, { ip: '10.9.0.1', kind: 'super', team: 'blue', author: '@quer_sair', text: 'oi' }, local.fetcher);
  const audio = await postLiveMessage(env, { ip: '10.9.0.2', kind: 'audio', team: 'blue', author: 'quer_sair', audio: new Blob([new Uint8Array(2000)], { type: 'audio/webm' }), durationMs: 2000 }, local.fetcher);
  assert.equal((await local.fetcher(audio.audioUrl)).status, 200);
  const result = await deleteServerProfile(env, '@Quer_Sair', local.fetcher);
  assert.deepEqual(result, { username: 'quer_sair', bases: 1, messages: 2, audios: 1 });
  assert.equal((await bases()).some(b => b.username === 'quer_sair'), false);
  assert.equal((await local.fetcher(audio.audioUrl)).status, 404, 'o arquivo de áudio também some');
  assert.equal((await local.db.query("select count(*)::int as n from public.point_entries where base_id like 'ig-%' and key = 'comment:ig:c-30'")).rows[0].n, 0);
  assert.equal((await deliver(payload(comment('c-30', 'MG 22', '9401', 'quer_sair')))).body.created, 0, 'o mesmo comentário reenviado não recria a base');
  assert.deepEqual(await deleteServerProfile(env, 'ninguem', local.fetcher), { username: 'ninguem', bases: 0, messages: 0, audios: 0 });
  await assert.rejects(deleteServerProfile(env, 'nome com espaço', local.fetcher), { message: /inválido/ });
});

