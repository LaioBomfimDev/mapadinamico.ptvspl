import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIVE_AUDIENCE, initialViewers, liveClock, nextViewers } from '../lib/war/live-audience.ts';
import { LIVE_CHAT, formatAudioTime, liveAuthor, liveMessageFrom, nextSpawnAt, pickAudioType, risePath } from '../lib/war/live-chat.ts';

const seeded = (seed = 7) => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

test('simulated audience starts and changes between 1 and 5 every 5 seconds', () => {
  assert.equal(LIVE_AUDIENCE.average, 3);
  assert.equal(LIVE_AUDIENCE.intervalMs, 5000);
  assert.equal(LIVE_AUDIENCE.min, 1);
  assert.equal(LIVE_AUDIENCE.max, 5);
  const random = seeded(42);
  for (let i = 0; i < 200; i++) {
    const start = initialViewers(random);
    assert.ok(Number.isInteger(start) && start >= 1 && start <= 5, `start=${start}`);
  }
  let viewers = initialViewers(random);
  const seen = new Set();
  for (let tick = 0; tick < 3000; tick++) {
    const next = nextViewers(viewers, random);
    assert.ok(Number.isInteger(next) && next >= 1 && next <= 5);
    assert.notEqual(next, viewers);
    seen.add(next);
    viewers = next;
  }
  assert.deepEqual([...seen].sort(), [1, 2, 3, 4, 5]);
  assert.equal(initialViewers(() => 0), 1);
  assert.equal(initialViewers(() => 0.999999), 5);
  for (const current of [Number.NaN, Infinity, -Infinity, -100, 100, 2.6]) {
    for (const roll of [0, 0.999999]) {
      const next = nextViewers(current, () => roll);
      assert.ok(Number.isInteger(next) && next >= 1 && next <= 5);
    }
  }
  const clockStr = liveClock(Date.UTC(2026, 9, 18, 1, 5, 9), 'America/Sao_Paulo');
  assert.match(clockStr, /^\d{2}:\d{2}:\d{2}$/);
  assert.equal(clockStr, '22:05:09');
});

test('super chat is trimmed, limited and keeps the chosen team; links and bad payloads are refused', () => {
  const id = 'abc-123-def';
  const ok = liveMessageFrom({ id, kind: 'super', team: 'blue', author: '@Azul.Paulista!', text: `  São   Paulo é 22 \u0007${'!'.repeat(200)}`, at: 1 });
  assert.equal(ok.message?.team, 'blue');
  assert.equal(ok.message?.author, 'azul.paulista');
  assert.equal(ok.message?.text.length, LIVE_CHAT.maxText);
  assert.ok(ok.message?.text.startsWith('São Paulo é 22 !'));
  assert.equal(liveAuthor(''), 'visitante');
  assert.match(liveMessageFrom({ id, kind: 'super', team: 'red', text: 'veja https://golpe.example' }).error, /Links/);
  assert.match(liveMessageFrom({ id, kind: 'super', team: 'red', text: 'www.golpe.example' }).error, /Links/);
  assert.ok(liveMessageFrom({ id, kind: 'super', team: 'red', text: '   ' }).error);
  assert.ok(liveMessageFrom({ id, kind: 'super', team: 'green', text: 'oi' }).error);
  assert.ok(liveMessageFrom({ id: 'x', kind: 'super', team: 'red', text: 'oi' }).error);
  assert.ok(liveMessageFrom({ id, kind: 'video', team: 'red', text: 'oi' }).error);
  assert.ok(liveMessageFrom(null).error);
});

test('audio messages need a real audio blob, minimum length and size cap', () => {
  const id = 'audio-123456', audio = new Blob([new Uint8Array(2000)], { type: 'audio/webm;codecs=opus' });
  const ok = liveMessageFrom({ id, kind: 'audio', team: 'red', text: '', audio, durationMs: 99_000 });
  assert.equal(ok.message?.durationMs, LIVE_CHAT.maxAudioMs);
  assert.equal(ok.message?.audio, audio);
  assert.ok(liveMessageFrom({ id, kind: 'audio', team: 'red', audio: new Blob(['oi'], { type: 'text/plain' }), durationMs: 2000 }).error);
  assert.ok(liveMessageFrom({ id, kind: 'audio', team: 'red', audio, durationMs: 100 }).error);
  assert.ok(liveMessageFrom({ id, kind: 'audio', team: 'red', audio: new Blob([new Uint8Array(LIVE_CHAT.maxAudioBytes + 1)], { type: 'audio/webm' }), durationMs: 2000 }).error);
  assert.ok(liveMessageFrom({ id, kind: 'audio', team: 'red', durationMs: 2000 }).error);
  assert.equal(formatAudioTime(6400), '0:06');
  assert.equal(formatAudioTime(15_000), '0:15');
});

test('recorder format falls back in order and tolerates browsers that throw', () => {
  assert.equal(pickAudioType(type => type === 'audio/mp4'), 'audio/mp4');
  assert.equal(pickAudioType(() => true), 'audio/webm;codecs=opus');
  assert.equal(pickAudioType(() => false), '');
  assert.equal(pickAudioType(() => { throw Error('sem suporte'); }), '');
});

test('messages enter from the lane bottom at one constant speed and never touch, even with different heights or lane sizes', () => {
  const heights = [62, 104, 44, 88, 62], lanes = [380, 120, 600, 380, 20], spawns = [0];
  for (const height of heights.slice(0, -1)) spawns.push(nextSpawnAt(spawns.at(-1), height));
  const paths = heights.map((height, i) => risePath(lanes[i], height));
  for (const path of paths) assert.ok(Math.abs(path.distance / path.durationMs * 1000 - LIVE_CHAT.risePxPerSecond) < .1);
  assert.equal(risePath(20, 50).distance, LIVE_CHAT.minRisePx + 50);
  const laneBottom = 1000, top = (i, t) => laneBottom - (t - spawns[i]) / 1000 * LIVE_CHAT.risePxPerSecond;
  for (let t = 0; t < 60_000; t += 25) {
    for (let i = 1; i < heights.length; i++) {
      const alive = j => t >= spawns[j] && t <= spawns[j] + paths[j].durationMs;
      if (!alive(i) || !alive(i - 1)) continue;
      assert.ok(top(i - 1, t) + heights[i - 1] + LIVE_CHAT.gapPx <= top(i, t) + 1e-6, `mensagens ${i - 1} e ${i} em ${t} ms`);
    }
  }
});
