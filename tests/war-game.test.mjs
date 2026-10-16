import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { CATALOG, RULES, STATES, emptyGame, createDemo, registerComment, buyUnit, forceOf, score, controlOf, makeBattle, finishBattle, validateSaved, dayInBrazil, secondsToBattle, parseComment } from '../lib/war/game.ts';
import { projectedState, baseLots, insideState, clippedStreet, stateBounds } from '../lib/war/geography.ts';
const instant = Date.parse('2026-10-16T20:00:00Z');
test('national winner follows military force, including bases with no new comment', () => {
  const demo = createDemo(), original = structuredClone(demo), battle = makeBattle(demo, 123, instant), totals = score(demo.bases);
  assert.equal(battle.red, totals.red); assert.equal(battle.blue, totals.blue);
  assert.equal(battle.winner, totals.red > totals.blue ? 'red' : 'blue');
  assert.notEqual(totals.redBases > totals.blueBases ? 'red' : 'blue', battle.winner, 'fixture must distinguish people count from military strength');
  assert.equal(battle.bases.length, demo.bases.length); assert.deepEqual(demo, original);
});
test('battle snapshot and deterministic events survive later inventory edits', () => {
  const demo = createDemo(), battle = makeBattle(demo, 12345, instant), again = makeBattle(demo, 12345, instant);
  assert.deepEqual(battle, again); assert.notDeepEqual(battle.events, makeBattle(demo, 54321, instant).events);
  demo.bases[0].inventory.tank += 999; assert.notEqual(battle.bases[0].inventory.tank, demo.bases[0].inventory.tank);
  assert(battle.events.every(e => e.at > 0 && e.at < RULES.battleSeconds && battle.bases.find(b => b.id === e.source).team !== battle.bases.find(b => b.id === e.target).team));
});
test('visual losses and repeated completion cannot consume armies, points or duplicate results', () => {
  const demo = createDemo(), inventory = structuredClone(demo.bases), battle = makeBattle(demo, 8, instant);
  const ended = finishBattle(demo, battle); assert.deepEqual(ended.bases, inventory); assert.equal(ended.history.length, 1); assert.equal(finishBattle(ended, battle), ended);
});
test('valid comments deduplicate by receipt and profile, apply the daily cap and permanent registration', () => {
  let game = emptyGame();
  for (let i = 0; i < 8; i++) game = registerComment(game, '@Teste BA 13', `comment-${i}`, instant).game;
  assert.equal(game.bases.length, 1); assert.equal(game.bases[0].credits, RULES.pointsPerComment * RULES.dailyCommentCap);
  assert.equal(game.bases[0].rewardedComments, RULES.dailyCommentCap);
  const duplicate = registerComment(game, '@teste BA 13', 'comment-0', instant); assert.equal(duplicate.game, game); assert(duplicate.duplicate);
  const nextDay = registerComment(game, '@teste BA 13', 'new-day', instant + 86400000).game;
  assert.equal(nextDay.bases.length, 1); assert.equal(nextDay.bases[0].credits, game.bases[0].credits + RULES.pointsPerComment);
  assert.equal(makeBattle(nextDay, 7, instant + 10 * 86400000).bases.length, 1);
});
test('state/team changes do not create duplicate bases or silently switch allegiance', () => {
  const game = registerComment(emptyGame(), '@teste BA 13', 'first', instant).game;
  assert.throws(() => registerComment(game, '@teste SP 13', 'second', instant));
  assert.throws(() => registerComment(game, '@teste BA 22', 'third', instant));
  assert.equal(game.receipts.length, 1); assert.equal(game.bases[0].uf, 'BA');
  assert.equal(parseComment('@demo São Paulo PL').uf, 'SP'); assert.throws(() => parseComment('@demo XX 13')); assert.throws(() => parseComment('<script> BA 13'));
});
test('purchases conserve points, add exactly one manual unit, reject shortages and battle lock', () => {
  const game = createDemo(), own = game.bases.find(b => b.id === 'demo-you'), tank = CATALOG.find(u => u.kind === 'tank');
  const bought = buyUnit(game, own.id, 'tank'), after = bought.bases.find(b => b.id === own.id);
  assert.equal(after.credits, own.credits - tank.cost); assert.equal(after.inventory.tank, own.inventory.tank + 1); assert.equal(forceOf(after), forceOf(own) + tank.force);
  assert.equal(game.bases.find(b => b.id === own.id).credits, 180);
  assert.throws(() => buyUnit(game, own.id, 'tank', true)); assert.throws(() => buyUnit(game, 'missing', 'tank'));
  assert.throws(() => buyUnit({ ...game, bases: [{ ...own, credits: 0 }] }, own.id, 'tank'));
});
test('state colors use force locally; empty and tied states stay neutral in the prototype', () => {
  const game = createDemo(); const colors = controlOf(game.bases);
  for (const state of STATES) { const totals = score(game.bases.filter(b => b.uf === state.uf)); assert.equal(colors[state.uf], totals.red === totals.blue ? 'neutral' : totals.red > totals.blue ? 'red' : 'blue'); }
  assert(Object.values(controlOf([])).every(c => c === 'neutral')); assert.equal(makeBattle(emptyGame(), 1, instant).winner, 'draw'); assert.equal(makeBattle(emptyGame(), 1, instant).events.length, 0);
});
test('Brazil day boundaries and 22h countdown do not use the host timezone', () => {
  assert.equal(dayInBrazil(Date.parse('2026-10-17T02:59:59Z')), '2026-10-16');
  assert.equal(dayInBrazil(Date.parse('2026-10-17T03:00:00Z')), '2026-10-17');
  assert.equal(secondsToBattle(Date.parse('2026-10-17T00:59:59Z')), 1); assert.equal(secondsToBattle(Date.parse('2026-10-17T01:00:00Z')), 0);
});
test('local saves reject malformed inventories, duplicate profiles and invalid battle controls', () => {
  const valid = createDemo(); assert(validateSaved(valid));
  const negative = structuredClone(valid); negative.bases[0].inventory.tank = -1; assert.equal(validateSaved(negative), null);
  const duplicate = structuredClone(valid); duplicate.bases.push(duplicate.bases[0]); assert.equal(validateSaved(duplicate), null);
  const bad = finishBattle(valid, makeBattle(valid, 1, instant)); bad.history[0].controls.BA = 'bogus'; assert.equal(validateSaved(bad), null);
  assert.equal(validateSaved({ version: 1, bases: [], receipts: [null], history: [] }), null);
});
test('fresh IBGE asset has exactly 27 matching official identifiers and finite closed rings', async () => {
  const records = JSON.parse(await fs.readFile(new URL('../public/war-assets/brazil-states.json', import.meta.url)));
  assert.equal(records.length, 27); assert.equal(new Set(records.map(s => s.uf)).size, 27);
  for (const state of records) { assert(STATES.some(s => s.id === state.id && s.uf === state.uf)); for (const polygon of state.polygons) for (const ring of polygon) { assert(ring.length >= 4); assert.deepEqual(ring[0], ring.at(-1)); assert(ring.every(p => p.every(Number.isFinite))); } }
});
test('lots and straight streets stay inside every UF, including DF and coastal small states', async () => {
  const records = JSON.parse(await fs.readFile(new URL('../public/war-assets/brazil-states.json', import.meta.url))).map(projectedState);
  for (const state of records) {
    const lots = baseLots(state, 4); assert.equal(lots.length, 4);
    for (const lot of lots) for (const [dx, dz] of [[0, 0], [-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]]) assert(insideState([lot.x + lot.size * dx, lot.z + lot.size * dz], state), `${state.uf}: lot outside`);
    const b = stateBounds(state);
    for (const axis of ['x', 'z']) for (const [a, c] of clippedStreet(state, axis, axis === 'x' ? (b.minZ + b.maxZ) / 2 : (b.minX + b.maxX) / 2)) { assert(axis === 'x' ? a[1] === c[1] : a[0] === c[0]); assert(insideState([(a[0] + c[0]) / 2, (a[1] + c[1]) / 2], state)); }
  }
});
