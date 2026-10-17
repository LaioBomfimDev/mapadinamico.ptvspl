import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { LIVE_CHAT, liveMessageFromRow } from '../lib/war/live-chat.ts';
import { liveClientKey, liveRealtimeConfig, postLiveMessage, recentLiveMessages } from '../lib/war/server-live.ts';
import { createLocalSupabase } from '../scripts/supabase-local.mjs';

const env = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SECRET_KEY: 'local-secret', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_teste' };
let local;
before(async () => { local = await createLocalSupabase(env.SUPABASE_SECRET_KEY); });
after(async () => { await local.close(); });
const post = (input) => postLiveMessage(env, { team: 'red', author: '@Torcida.13', ...input }, local.fetcher);
const audio = (bytes = 3000, type = 'audio/webm;codecs=opus') => new Blob([new Uint8Array(bytes).fill(7)], { type });

test('a super chat is saved by the server and anyone loading recent messages receives it', async () => {
  const sent = await post({ ip: '10.0.0.1', kind: 'super', text: '  A Bahia é 13!  ' });
  assert.equal(sent.kind, 'super'); assert.equal(sent.text, 'A Bahia é 13!'); assert.equal(sent.author, 'torcida.13'); assert.equal(sent.team, 'red');
  const recent = await recentLiveMessages(env, null, local.fetcher);
  assert.ok(recent.some(message => message.id === sent.id && message.text === 'A Bahia é 13!'));
  assert.equal((await recentLiveMessages(env, new Date(sent.at + 1000).toISOString(), local.fetcher)).length, 0, 'depois do horário pedido não vem nada antigo');
});

test('the same visitor waits before sending again; another visitor is not blocked', async () => {
  await post({ ip: '10.0.0.2', kind: 'super', text: 'primeira' });
  await assert.rejects(post({ ip: '10.0.0.2', kind: 'super', text: 'segunda' }), { message: /Aguarde/, status: 429 });
  assert.equal((await post({ ip: '10.0.0.3', kind: 'super', text: 'outro visitante' })).text, 'outro visitante');
  assert.notEqual(liveClientKey('10.0.0.2', 'a'), liveClientKey('10.0.0.2', 'b'), 'o código do visitante depende do segredo');
  assert.ok(!liveClientKey('10.0.0.2', 'a').includes('10.0.0.2'));
});

test('links, empty text, wrong team and bad audio are refused before reaching the database', async () => {
  await assert.rejects(post({ ip: '10.0.1.1', kind: 'super', text: 'veja https://golpe.example' }), { message: /Links/ });
  await assert.rejects(post({ ip: '10.0.1.2', kind: 'super', text: '   ' }), { message: /Escreva/ });
  await assert.rejects(post({ ip: '10.0.1.3', kind: 'super', text: 'oi', team: 'green' }), { message: /13 ou 22/ });
  await assert.rejects(post({ ip: '10.0.1.4', kind: 'audio', audio: audio(3000, 'text/plain'), durationMs: 3000 }), { message: /Áudio inválido/ });
  await assert.rejects(post({ ip: '10.0.1.5', kind: 'audio', audio: audio(LIVE_CHAT.maxAudioBytes + 1), durationMs: 3000 }), { message: /grande/ });
  await assert.rejects(post({ ip: '10.0.1.6', kind: 'audio', audio: audio(), durationMs: 100 }), { message: /curto/ });
  assert.equal(local.files.size, 0, 'nenhum arquivo guardado para pedidos recusados');
});

test('an audio is stored as a public file and the message points to it; a refused audio leaves no file behind', async () => {
  const sent = await post({ ip: '10.0.2.1', kind: 'audio', audio: audio(4321), durationMs: 99_000, team: 'blue', author: 'sp_22' });
  assert.equal(sent.kind, 'audio'); assert.equal(sent.durationMs, LIVE_CHAT.maxAudioMs); assert.match(sent.audioUrl, /^http:\/\/127\.0\.0\.1:54321\/storage\/v1\/object\/public\/live-audio\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.webm$/);
  const file = await local.fetcher(sent.audioUrl);
  assert.equal(file.status, 200); assert.equal(file.headers.get('content-type'), 'audio/webm'); assert.equal((await file.arrayBuffer()).byteLength, 4321);
  const before = local.files.size;
  await assert.rejects(post({ ip: '10.0.2.1', kind: 'audio', audio: audio(), durationMs: 2000 }), { message: /Aguarde/ });
  assert.equal(local.files.size, before, 'áudio recusado pelo limite de ritmo é apagado');
});

test('the browser key can read recent messages for real time, but cannot write, call functions or see visitor codes', async () => {
  const asRole = (role, sql) => local.db.transaction(async tx => { await tx.exec(`set local role ${role}`); return tx.query(sql); });
  assert.ok((await asRole('anon', 'select id, text from public.live_messages')).rows.length > 0);
  await assert.rejects(asRole('anon', "insert into public.live_messages (kind, team, author, text) values ('super', 'red', 'invasor', 'oi')"), /permission denied/);
  await assert.rejects(asRole('anon', 'select * from public.live_rate'), /permission denied/);
  assert.equal((await local.call('live_post_message', { p_client: 'x'.repeat(20), p_kind: 'super', p_team: 'red', p_author: 'invasor', p_text: 'oi' }, 'anon')).status, 401);
  assert.equal((await local.call('live_recent', {}, 'anon')).status, 401);
});

test('rows coming from the server are checked before rising on screen; realtime config never carries the secret', () => {
  const row = { id: '6b3c1c3e-1f0a-4c2b-9c55-0a0b0c0d0e0f', kind: 'super', team: 'blue', author: 'sp_22', text: 'SP é 22', audio_url: null, duration_ms: null, created_at: '2026-10-17T20:00:00Z' };
  assert.equal(liveMessageFromRow(row).text, 'SP é 22');
  for (const bad of [{ ...row, team: 'green' }, { ...row, text: 'www.golpe.example' }, { ...row, kind: 'audio', audio_url: 'javascript:alert(1)', duration_ms: 3000 }, { ...row, created_at: 'ontem' }, null]) assert.equal(liveMessageFromRow(bad), null);
  assert.deepEqual(liveRealtimeConfig(env), { url: env.SUPABASE_URL, key: 'sb_publishable_teste' });
  assert.equal(liveRealtimeConfig({ SUPABASE_URL: env.SUPABASE_URL, SUPABASE_SECRET_KEY: 'segredo' }), null);
});
