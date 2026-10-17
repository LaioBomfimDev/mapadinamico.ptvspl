import { awardPoints, ledgerOf, SOCIAL_RULES, validLedger, type PointLedger } from './points.ts';
// Experimental values for the local prototype, not approved campaign rules.
export type Team = 'red' | 'blue';
export type UnitKind = 'infantry' | 'tank' | 'artillery' | 'drone' | 'aircraft';
export type Inventory = Record<UnitKind, number>;
export const RULES = { version: 'prototype-1', pointsPerComment: 10, dailyCommentCap: 5, battleSeconds: 420, timezone: 'America/Sao_Paulo', experimental: true } as const;
export const CATALOG: { kind: UnitKind; name: string; cost: number; force: number; description: string }[] = [
  { kind: 'infantry', name: 'Infantaria', cost: 10, force: 10, description: 'O primeiro passo da sua tropa.' },
  { kind: 'tank', name: 'Tanque', cost: 60, force: 80, description: 'Presença pesada na linha de frente.' },
  { kind: 'artillery', name: 'Artilharia', cost: 40, force: 55, description: 'Canhões que cruzam o campo.' },
  { kind: 'drone', name: 'Drone', cost: 30, force: 35, description: 'Pequeno, ágil e pronto para voar.' },
  { kind: 'aircraft', name: 'Apoio aéreo', cost: 100, force: 140, description: 'Seu esquadrão nos céus do Brasil.' },
];
export const STATES = [
  { id: '11', uf: 'RO', name: 'Rondônia', lng: -63.2, lat: -10.8 }, { id: '12', uf: 'AC', name: 'Acre', lng: -70, lat: -9.2 },
  { id: '13', uf: 'AM', name: 'Amazonas', lng: -64, lat: -4 }, { id: '14', uf: 'RR', name: 'Roraima', lng: -61.3, lat: 2 },
  { id: '15', uf: 'PA', name: 'Pará', lng: -53, lat: -4.1 }, { id: '16', uf: 'AP', name: 'Amapá', lng: -52, lat: 1 },
  { id: '17', uf: 'TO', name: 'Tocantins', lng: -48.3, lat: -10 }, { id: '21', uf: 'MA', name: 'Maranhão', lng: -45.2, lat: -5 },
  { id: '22', uf: 'PI', name: 'Piauí', lng: -42.5, lat: -7.2 }, { id: '23', uf: 'CE', name: 'Ceará', lng: -39.5, lat: -5 },
  { id: '24', uf: 'RN', name: 'Rio Grande do Norte', lng: -36.5, lat: -5.8 }, { id: '25', uf: 'PB', name: 'Paraíba', lng: -36.5, lat: -7.1 },
  { id: '26', uf: 'PE', name: 'Pernambuco', lng: -38.3, lat: -8.5 }, { id: '27', uf: 'AL', name: 'Alagoas', lng: -36.5, lat: -9.6 },
  { id: '28', uf: 'SE', name: 'Sergipe', lng: -37.4, lat: -10.6 }, { id: '29', uf: 'BA', name: 'Bahia', lng: -41.7, lat: -12 },
  { id: '31', uf: 'MG', name: 'Minas Gerais', lng: -44.5, lat: -18.5 }, { id: '32', uf: 'ES', name: 'Espírito Santo', lng: -40.5, lat: -19.7 },
  { id: '33', uf: 'RJ', name: 'Rio de Janeiro', lng: -42.7, lat: -22.3 }, { id: '35', uf: 'SP', name: 'São Paulo', lng: -49, lat: -22 },
  { id: '41', uf: 'PR', name: 'Paraná', lng: -51, lat: -24.6 }, { id: '42', uf: 'SC', name: 'Santa Catarina', lng: -50, lat: -27 },
  { id: '43', uf: 'RS', name: 'Rio Grande do Sul', lng: -53, lat: -30 }, { id: '50', uf: 'MS', name: 'Mato Grosso do Sul', lng: -55, lat: -20 },
  { id: '51', uf: 'MT', name: 'Mato Grosso', lng: -56, lat: -13 }, { id: '52', uf: 'GO', name: 'Goiás', lng: -49.7, lat: -16 },
  { id: '53', uf: 'DF', name: 'Distrito Federal', lng: -47.8, lat: -15.75 },
] as const;
export type Base = { id: string; username: string; uf: string; municipalityId?: string; team: Team; inventory: Inventory; credits: number; joinedAt: string; commentDay: string; rewardedComments: number; progress?: PointLedger };
export type Control = Record<string, Team | 'neutral'>;
export type BattleRecord = { id: string; at: string; winner: Team | 'draw'; red: number; blue: number; controls: Control };
export type GameState = { version: 1; bases: Base[]; receipts: string[]; history: BattleRecord[] };
export type Battle = BattleRecord & { seed: number; duration: number; bases: Base[]; events: BattleEvent[] };
export type BattleEvent = { at: number; source: string; target: string; kind: UnitKind };
export const emptyInventory = (): Inventory => ({ infantry: 0, tank: 0, artillery: 0, drone: 0, aircraft: 0 });
export const emptyGame = (): GameState => ({ version: 1, bases: [], receipts: [], history: [] });
export const forceOf = (base: Base) => CATALOG.reduce((sum, unit) => sum + base.inventory[unit.kind] * unit.force, 0);
export const unitCount = (base: Base) => CATALOG.reduce((sum, unit) => sum + base.inventory[unit.kind], 0);
export const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
export function dayInBrazil(now: number) { return new Intl.DateTimeFormat('en-CA', { timeZone: RULES.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); }
export function score(bases: Base[]) {
  const result = { red: 0, blue: 0, redBases: 0, blueBases: 0, units: 0, states: new Set<string>() };
  for (const base of bases) { result[base.team] += forceOf(base); result[base.team === 'red' ? 'redBases' : 'blueBases']++; result.units += unitCount(base); result.states.add(base.uf); }
  return result;
}
export function controlOf(bases: Base[]): Control {
  return Object.fromEntries(STATES.map(state => { const total = score(bases.filter(base => base.uf === state.uf)); return [state.uf, total.red === total.blue ? 'neutral' : total.red > total.blue ? 'red' : 'blue']; }));
}
export function parseComment(text: string, municipalities: readonly { id: string; name: string }[] = []) {
  const match = text.trim().match(/^@([a-z\d._]{1,30})\s+(.+?)\s+(13|22|pt|pl)$/i);
  if (!match) throw Error('Use @seunome Catu BA 13 na Bahia ou @seunome SP 22 nos outros estados.');
  const location = normalize(match[2]), city = municipalities.find(item => location === `${normalize(item.name)} ba` || location === `ba ${normalize(item.name)}`);
  const state = city ? STATES.find(s => s.uf === 'BA') : STATES.find(s => normalize(s.uf) === location || normalize(s.name) === location);
  if (!state) throw Error('Local não reconhecido. Na Bahia, informe também o município, por exemplo: @seunome Catu BA 13.');
  return { username: match[1].toLowerCase(), uf: state.uf, municipalityId: city?.id, team: /^(13|pt)$/i.test(match[3]) ? 'red' as const : 'blue' as const };
}
export function registerComment(game: GameState, text: string, commentId: string, now: number, municipalities: readonly { id: string; name: string }[] = []) {
  if (!Number.isFinite(now) || !commentId.trim() || commentId.length > 200) throw Error('Comentário sem identificação válida.');
  if (game.receipts.includes(commentId)) return { game, base: null, awarded: false, duplicate: true };
  if (game.receipts.length >= 5000) throw Error('Limite de comentários desta demonstração atingido.');
  const parsed = parseComment(text, municipalities), day = dayInBrazil(now);
  let base = game.bases.find(b => b.username === parsed.username);
  if (base && (base.uf !== parsed.uf || base.team !== parsed.team || (base.municipalityId && base.municipalityId !== parsed.municipalityId))) throw Error('Este perfil já tem uma base. Nesta prévia, estado, município e time permanecem os mesmos.');
  if (!base && game.bases.length >= 1000) throw Error('Limite de bases desta demonstração atingido.');
  const first = !base;
  base = base ? { ...base, municipalityId: base.municipalityId || parsed.municipalityId, inventory: { ...base.inventory } } : { ...parsed, id: `local-${parsed.username}`, inventory: { ...emptyInventory(), infantry: 3 }, credits: 0, joinedAt: new Date(now).toISOString(), commentDay: day, rewardedComments: 0, progress: { entries: [] } };
  if (base.commentDay !== day) { base.commentDay = day; base.rewardedComments = 0; }
  const awarded = base.rewardedComments < RULES.dailyCommentCap;
  if (awarded) { base = awardPoints(base, { key: `comment:${commentId}`, kind: first ? 'arrival' : 'comment', points: RULES.pointsPerComment, at: new Date(now).toISOString() }); base.rewardedComments++; }
  let members = game.bases.filter(b => b.id !== base.id);
  if (first) {
    const referrals = members.flatMap(owner => ledgerOf(owner).entries.filter(e => e.kind === 'mention' && e.subject === parsed.username && Date.parse(e.at) <= now).map(entry => ({ owner, entry }))).sort((a, b) => Date.parse(a.entry.at) - Date.parse(b.entry.at) || a.entry.key.localeCompare(b.entry.key));
    const referral = referrals[0];
    if (referral && ledgerOf(referral.owner).entries.filter(e => e.kind === 'recruit' && dayInBrazil(Date.parse(e.at)) === day).length < SOCIAL_RULES.recruitsPerDay) members = members.map(owner => owner.id === referral.owner.id ? awardPoints(owner, { key: `recruit:${parsed.username}`, kind: 'recruit', points: SOCIAL_RULES.recruit, at: new Date(now).toISOString(), subject: parsed.username }) : owner);
  }
  return { game: { ...game, bases: [...members, base], receipts: [...game.receipts, commentId] }, base, awarded, duplicate: false };
}
export function buyUnit(game: GameState, baseId: string, kind: UnitKind, locked = false): GameState {
  if (locked) throw Error('A batalha já começou. Monte seu exército após o resultado.');
  const unit = CATALOG.find(u => u.kind === kind), base = game.bases.find(b => b.id === baseId);
  if (!unit || !base) throw Error('Base ou equipamento não encontrado.');
  if (base.credits < unit.cost) throw Error('Faltam pontos para esse equipamento.');
  if (base.inventory[kind] >= 10000) throw Error('Limite deste equipamento atingido.');
  return { ...game, bases: game.bases.map(b => b.id === baseId ? { ...b, progress: ledgerOf(b), credits: b.credits - unit.cost, inventory: { ...b.inventory, [kind]: b.inventory[kind] + 1 } } : b) };
}
export function randomFrom(seed: number) { let value = seed >>> 0; return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; }; }
export function makeBattle(game: GameState, seed: number, now: number): Battle {
  const bases = game.bases.map(b => ({ ...b, inventory: { ...b.inventory } })), totals = score(bases);
  const rng = randomFrom(seed), events: BattleEvent[] = [];
  const red = bases.filter(b => b.team === 'red' && forceOf(b) > 0), blue = bases.filter(b => b.team === 'blue' && forceOf(b) > 0);
  if (red.length && blue.length) for (let i = 0; i < 96; i++) {
    const attackers = i % 2 ? red : blue, defenders = i % 2 ? blue : red;
    const source = attackers[Math.floor(rng() * attackers.length)], target = defenders[Math.floor(rng() * defenders.length)];
    const options = CATALOG.filter(u => source.inventory[u.kind] > 0);
    events.push({ at: (i + 1) / 98 * RULES.battleSeconds, source: source.id, target: target.id, kind: options[Math.floor(rng() * options.length)].kind });
  }
  return { id: `battle-${Math.floor(now)}-${seed >>> 0}`, at: new Date(now).toISOString(), winner: totals.red === totals.blue ? 'draw' : totals.red > totals.blue ? 'red' : 'blue', red: totals.red, blue: totals.blue, controls: controlOf(bases), seed, duration: RULES.battleSeconds, bases, events };
}
export function finishBattle(game: GameState, battle: Battle): GameState {
  if (game.history.some(item => item.id === battle.id)) return game;
  const { id, at, winner, red, blue, controls } = battle;
  return { ...game, history: [{ id, at, winner, red, blue, controls }, ...game.history].slice(0, 10) };
}
export function createDemo(): GameState {
  const rng = randomFrom(20261016), names = ['aurora', 'atlas', 'vento', 'lince', 'norte', 'bravo', 'farol', 'delta'];
  const bases: Base[] = [];
  STATES.forEach((state, i) => { for (let j = 0; j < 3; j++) {
    const team: Team = (i + j) % 2 ? 'blue' : 'red';
    bases.push({ id: `demo-${state.uf}-${j}`, username: `${names[(i + j) % names.length]}_${state.uf.toLowerCase()}_${j + 1}`, uf: state.uf, ...(state.uf === 'BA' ? { municipalityId: ['2927408', '2910800', '2900702'][j] } : {}), team, inventory: { infantry: 4 + Math.floor(rng() * 8), tank: Math.floor(rng() * 3), artillery: Math.floor(rng() * 3), drone: 1 + Math.floor(rng() * 3), aircraft: Math.floor(rng() * 2) }, credits: 0, joinedAt: '2026-10-15T18:00:00Z', commentDay: '2026-10-15', rewardedComments: 0 });
  } });
  bases.push({ id: 'demo-you', username: 'voce_demo', uf: 'BA', municipalityId: '2907509', team: 'red', inventory: { infantry: 6, tank: 1, artillery: 1, drone: 1, aircraft: 0 }, credits: 180, joinedAt: '2026-10-15T18:00:00Z', commentDay: '2026-10-15', rewardedComments: 0 });
  return { ...emptyGame(), bases };
}
export function validateSaved(value: unknown): GameState | null {
  if (!value || typeof value !== 'object') return null;
  const game = value as GameState;
  if (game.version !== 1 || !Array.isArray(game.bases) || game.bases.length > 1000 || !Array.isArray(game.receipts) || game.receipts.length > 5000 || !Array.isArray(game.history) || game.history.length > 10) return null;
  const ids = new Set(), names = new Set();
  for (const b of game.bases) {
    if (!b || typeof b.id !== 'string' || b.id.length > 80 || typeof b.username !== 'string' || !/^[a-z\d._]{1,30}$/.test(b.username) || ids.has(b.id) || names.has(b.username) || !STATES.some(s => s.uf === b.uf) || (b.municipalityId !== undefined && (b.uf !== 'BA' || !/^29\d{5}$/.test(b.municipalityId))) || !['red', 'blue'].includes(b.team) || !Number.isSafeInteger(b.credits) || b.credits < 0 || b.credits > 10000000 || !Number.isInteger(b.rewardedComments) || b.rewardedComments < 0 || b.rewardedComments > RULES.dailyCommentCap || typeof b.commentDay !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.commentDay) || typeof b.joinedAt !== 'string' || !Number.isFinite(Date.parse(b.joinedAt)) || !b.inventory || !CATALOG.every(u => Number.isInteger(b.inventory[u.kind]) && b.inventory[u.kind] >= 0 && b.inventory[u.kind] <= 10000)) return null;
    ids.add(b.id); names.add(b.username);
    if (b.progress !== undefined && !validLedger(b.progress)) return null;
  }
  if (!game.receipts.every(id => typeof id === 'string' && id.length > 0 && id.length <= 200) || new Set(game.receipts).size !== game.receipts.length) return null;
  if (!game.history.every(h => h && typeof h.id === 'string' && typeof h.at === 'string' && Number.isFinite(Date.parse(h.at)) && ['red', 'blue', 'draw'].includes(h.winner) && Number.isSafeInteger(h.red) && h.red >= 0 && Number.isSafeInteger(h.blue) && h.blue >= 0 && h.controls && STATES.every(s => ['red', 'blue', 'neutral'].includes(h.controls[s.uf])))) return null;
  return game;
}
export function secondsToBattle(now: number) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: RULES.timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0);
  const current = get('hour') * 3600 + get('minute') * 60 + get('second');
  return (22 * 3600 - current + 86400) % 86400;
}
