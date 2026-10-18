import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { emptyGame, registerComment, buyUnit, makeBattle, finishBattle, validateSaved } from '../lib/war/game.ts';
import { processEngagement, rankBases, armyTier, ARMY_TIERS } from '../lib/war/engagement.ts';
import { earnedPoints, pointsByKind, ledgerOf, SOCIAL_RULES } from '../lib/war/points.ts';
import { baseLots, projectedState, insideState } from '../lib/war/geography.ts';
const now = Date.parse('2026-10-16T20:00:00Z');
const initial = () => registerComment(emptyGame(), '@comandante BA 13', 'join-1', now).game;
const receipt = (change = {}) => ({ id: 'event-1', post: 'post-1', kind: 'mention', actor: 'comandante', target: 'amigo', at: now + 1000, verified: true, ...change });

test('comment ledger retains earned totals while manual purchases only reduce available points', () => {
  let game = initial(); game = registerComment(game, '@comandante BA 13', 'comment-2', now).game;
  const before = game.bases[0], bought = buyUnit(game, before.id, 'infantry').bases[0];
  assert.equal(earnedPoints(before), 20); assert.equal(earnedPoints(bought), 20); assert.equal(bought.credits, 10);
  assert.equal(pointsByKind(bought).arrival, 10); assert.equal(pointsByKind(bought).comment, 10); assert.equal(bought.inventory.infantry, 4);
  assert.equal(game.bases[0].credits, 20);
});
test('unverified, self, malformed and missing-base events cannot credit points', () => {
  const game = initial(), copy = structuredClone(game);
  for (const change of [{ verified: false }, { target: 'comandante' }, { kind: 'bogus' }, { actor: 'missing' }, { at: NaN }, { id: '' }, { post: '' }]) assert.throws(() => processEngagement(game, receipt(change)));
  assert.deepEqual(game, copy);
});
test('mentions deduplicate receipts and friend/post pairs, and respect the Brazil daily cap', () => {
  let game = processEngagement(initial(), receipt()).game;
  assert.equal(game.bases[0].credits, 13);
  assert.equal(processEngagement(game, receipt()).game, game);
  game = processEngagement(game, receipt({ id: 'same-mention' })).game; assert.equal(game.bases[0].credits, 13);
  for (let i = 1; i < 15; i++) game = processEngagement(game, receipt({ id: `mention-${i}`, target: `amigo${i}` })).game;
  assert.equal(pointsByKind(game.bases[0]).mention, SOCIAL_RULES.mention * SOCIAL_RULES.mentionsPerDay);
  game = processEngagement(game, receipt({ id: 'tomorrow', post: 'post-2', at: now + 86400000 })).game;
  assert.equal(pointsByKind(game.bases[0]).mention, 33);
});
test('only the earliest prior invitation earns recruitment once; existing bases and repeated comments do not', () => {
  let game = initial(); game = registerComment(game, '@outro SP 22', 'join-2', now).game;
  game = processEngagement(game, receipt()).game;
  game = processEngagement(game, receipt({ id: 'event-2', actor: 'outro', at: now + 2000 })).game;
  game = registerComment(game, '@amigo BA 22', 'join-friend', now + 3000).game;
  assert.equal(pointsByKind(game.bases.find(b => b.username === 'comandante')).recruit, 25);
  assert.equal(pointsByKind(game.bases.find(b => b.username === 'outro')).recruit, 0);
  game = registerComment(game, '@amigo BA 22', 'friend-again', now + 4000).game;
  assert.equal(pointsByKind(game.bases.find(b => b.username === 'comandante')).recruit, 25);
  game = processEngagement(game, receipt({ id: 'late', target: 'outro' })).game;
  game = registerComment(game, '@outro SP 22', 'existing-again', now + 5000).game;
  assert.equal(pointsByKind(game.bases.find(b => b.username === 'comandante')).recruit, 25);
});
test('recruitment has a daily cap and never falls through to a later inviter', () => {
  let game = initial();
  for (let i = 0; i < 8; i++) { game = processEngagement(game, receipt({ id: `invite-${i}`, target: `recruta${i}` })).game; game = registerComment(game, `@recruta${i} BA 22`, `join-${i}`, now + 5000).game; }
  assert.equal(pointsByKind(game.bases.find(b => b.username === 'comandante')).recruit, SOCIAL_RULES.recruit * SOCIAL_RULES.recruitsPerDay);
});
test('supports credit the recipient once per actor/post, with a daily limit and no inventory changes', () => {
  let game = initial(); const army = structuredClone(game.bases[0].inventory);
  for (let i = 0; i < 25; i++) game = processEngagement(game, receipt({ id: `support-${i}`, kind: 'support', actor: `vizinho${i}`, target: 'comandante' })).game;
  assert.equal(pointsByKind(game.bases[0]).support, 100);
  game = processEngagement(game, receipt({ id: 'support-repeat', kind: 'support', actor: 'vizinho0', target: 'comandante' })).game;
  assert.equal(pointsByKind(game.bases[0]).support, 100); assert.deepEqual(game.bases[0].inventory, army);
});
test('story rewards require confirmation, are once per Brazil day and ignore unrelated hidden targets', () => {
  let game = initial();
  game = processEngagement(game, receipt({ kind: 'story', target: 'comandante' })).game;
  game = processEngagement(game, receipt({ id: 'story-repeat', kind: 'story' })).game;
  assert.equal(pointsByKind(game.bases[0]).story, 30);
  game = processEngagement(game, receipt({ id: 'story-tomorrow', kind: 'story', at: now + 86400000 })).game;
  assert.equal(pointsByKind(game.bases[0]).story, 60);
  assert(ledgerOf(game.bases[0]).entries.filter(e => e.kind === 'story').every(e => e.subject === undefined));
});
test('legacy wallets preserve known credit without inventing prior comments, and invalid ledgers are rejected', () => {
  const game = initial(); delete game.bases[0].progress; game.bases[0].credits = 60;
  assert(validateSaved(game));
  const bought = buyUnit(game, game.bases[0].id, 'tank'); assert.equal(bought.bases[0].credits, 0); assert.equal(earnedPoints(bought.bases[0]), 60); assert.equal(pointsByKind(bought.bases[0]).comment, 0);
  const corrupted = structuredClone(bought); corrupted.bases[0].progress.entries.push({ ...corrupted.bases[0].progress.entries[0] }); assert.equal(validateSaved(corrupted), null);
  const invalid = structuredClone(bought); invalid.bases[0].progress.entries[0].points = -1; assert.equal(validateSaved(invalid), null);
  assert.equal(validateSaved(JSON.parse(JSON.stringify(bought)))?.bases[0].credits, 0);
});
test('rankings and tiers use force, preserve national winner rules, and battle completion preserves the ledger', () => {
  let game = initial(); game = registerComment(game, '@outro SP 22', 'other', now).game;
  game = processEngagement(game, receipt({ kind: 'story' })).game;
  game = buyUnit(game, game.bases[0].id, 'artillery');
  assert.equal(armyTier(game.bases[0]).current.name, 'Acampamento');
  assert.equal(rankBases(game.bases)[0].username, 'comandante'); assert.equal(rankBases(game.bases, 'state', game.bases[0]).length, 1); assert.equal(rankBases(game.bases, 'team', game.bases[0]).length, 1);
  const battle = makeBattle(game, 8, now), result = finishBattle(game, battle); assert.equal(battle.winner, 'red'); assert.deepEqual(result.bases, game.bases);
});
test('accumulated points unlock 6 progressive army levels, titles, statuses and skins', () => {
  assert.equal(ARMY_TIERS.length, 6);
  const base = initial().bases[0];
  for (const tier of ARMY_TIERS) {
    const sample = { ...base, credits: tier.points, progress: undefined };
    const info = armyTier(sample);
    assert.equal(info.level, tier.level);
    assert.equal(info.current.title, tier.title);
    assert.equal(info.current.status, tier.status);
    assert.equal(info.current.skinName, tier.skinName);
  }
});
test('compound corners stay within all 27 UFs and neighbouring compounds leave a clear street corridor', async () => {
  const states = JSON.parse(await fs.readFile(new URL('../public/war-assets/brazil-states.json', import.meta.url))).map(projectedState);
  for (const state of states) {
    const lots = baseLots(state, 12);
    for (const lot of lots) for (const [x,z] of [[-.64,-.59],[.64,-.59],[-.64,.59],[.64,.59]]) assert(insideState([lot.x + lot.size*x,lot.z + lot.size*z],state), state.uf);
    for (let i=0;i<lots.length;i++) for (let j=i+1;j<lots.length;j++) { const a=lots[i],b=lots[j]; assert(Math.abs(a.x-b.x) >= (a.size+b.size)*.64+.001 || Math.abs(a.z-b.z) >= (a.size+b.size)*.59+.001, `${state.uf}: overlapping compounds`); }
  }
});
