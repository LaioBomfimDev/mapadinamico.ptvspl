import { dayInBrazil, forceOf, type Base, type GameState } from './game.ts';
import { awardPoints, earnedPoints, ledgerOf, SOCIAL_RULES, type PointKind } from './points.ts';

/** Domain input only. A production adapter must authenticate and validate Meta receipts before calling it. */
export type EngagementEvent = { id: string; post: string; kind: 'mention' | 'support' | 'story'; actor: string; target?: string; at: number; verified: boolean };
export function processEngagement(game: GameState, event: EngagementEvent) {
  const profile = (value = '') => value.replace(/^@/, '').trim().toLowerCase();
  const actor = profile(event.actor), target = profile(event.target), receipt = `social:${event.id}`;
  if (!event.id || event.id.length > 150 || !event.post || event.post.length > 100 || !Number.isFinite(event.at) || !/^[a-z\d._]{1,30}$/.test(actor) || (event.kind !== 'story' && !/^[a-z\d._]{1,30}$/.test(target)) || !['mention', 'support', 'story'].includes(event.kind)) throw Error('Evento de participação inválido.');
  if (!event.verified) throw Error('Ação aguardando confirmação. Abrir ou copiar um link não comprova participação.');
  if (game.receipts.includes(receipt)) return { game, awarded: false, reason: 'Evento já recebido.' };
  if (game.receipts.length >= 5000) throw Error('Limite de eventos desta demonstração atingido.');
  if (event.kind !== 'story' && actor === target) throw Error('Marcar ou apoiar o próprio perfil não dá pontos.');
  const owner = game.bases.find(b => b.username === (event.kind === 'support' ? target : actor));
  if (!owner) throw Error('O perfil que recebe os pontos precisa ter uma base.');
  const day = dayInBrazil(event.at), entries = ledgerOf(owner).entries;
  const key = event.kind === 'story' ? `story:${day}` : event.kind === 'mention' ? `mention:${event.post}:${target}` : `support:${event.post}:${actor}`;
  const limit = event.kind === 'mention' ? SOCIAL_RULES.mentionsPerDay : event.kind === 'support' ? SOCIAL_RULES.supportsPerDay : SOCIAL_RULES.storiesPerDay;
  const capped = entries.filter(e => e.kind === event.kind && dayInBrazil(Date.parse(e.at)) === day).length >= limit;
  const duplicate = entries.some(e => e.key === key);
  const points = event.kind === 'mention' ? SOCIAL_RULES.mention : event.kind === 'support' ? SOCIAL_RULES.support : SOCIAL_RULES.story;
  const credited = capped || duplicate ? owner : awardPoints(owner, { key, kind: event.kind as PointKind, points, at: new Date(event.at).toISOString(), post: event.post, subject: event.kind === 'support' ? actor : event.kind === 'mention' ? target : undefined });
  return { game: { ...game, receipts: [...game.receipts, receipt], bases: game.bases.map(b => b.id === owner.id ? credited : b) }, awarded: credited !== owner, reason: duplicate ? 'Esta ação já pontuou.' : capped ? 'Limite diário desta ação atingido.' : `+${points} pontos para @${owner.username}.` };
}

export type ArmyTierLevel = 1 | 2 | 3 | 4 | 5 | 6;

export const ARMY_TIERS = [
  { level: 1 as ArmyTierLevel, name: 'Acampamento', points: 0, force: 0, title: 'Recruta de Fronteira', status: 'Posto Inicial', skinName: 'Skin I · Recruta de Campanha', campScale: 1.0 },
  { level: 2 as ArmyTierLevel, name: 'Destacamento', points: 50, force: 100, title: 'Cabo de Esquadra', status: 'Guarnição Ativa', skinName: 'Skin II · Patrulha de Fronteira', campScale: 1.08 },
  { level: 3 as ArmyTierLevel, name: 'Pelotão', points: 120, force: 250, title: 'Sargento de Assalto', status: 'Bastião Tático', skinName: 'Skin III · Assalto Veterano', campScale: 1.16 },
  { level: 4 as ArmyTierLevel, name: 'Companhia', points: 250, force: 500, title: 'Capitão de Brigada', status: 'Comando Blindado', skinName: 'Skin IV · Brigada de Choque', campScale: 1.24 },
  { level: 5 as ArmyTierLevel, name: 'Batalhão', points: 500, force: 1000, title: 'Coronel de Divisão', status: 'Fortaleza de Elite', skinName: 'Skin V · Guarda de Elite', campScale: 1.32 },
  { level: 6 as ArmyTierLevel, name: 'Divisão', points: 1000, force: 2500, title: 'General Supremo', status: 'Cidadela Imperial', skinName: 'Skin VI · Legião Suprema', campScale: 1.4 },
] as const;

export function clampTierLevel(level = 1): ArmyTierLevel {
  if (!Number.isFinite(level)) return 1;
  return Math.max(1, Math.min(6, Math.round(level))) as ArmyTierLevel;
}

export function armyTier(base: Base) {
  const force = forceOf(base), points = earnedPoints(base);
  const pointsIndex = ARMY_TIERS.findLastIndex(t => points >= t.points);
  const forceIndex = ARMY_TIERS.findLastIndex(t => force >= t.force);
  const index = Math.max(0, pointsIndex, forceIndex);
  const current = ARMY_TIERS[index], next = ARMY_TIERS[index + 1];
  const pointsProgress = next ? Math.min(100, Math.max(0, (points - current.points) / (next.points - current.points) * 100)) : 100;
  const forceProgress = next ? Math.min(100, Math.max(0, (force - current.force) / (next.force - current.force) * 100)) : 100;
  return {
    index,
    level: current.level,
    current,
    next,
    points,
    force,
    missing: next ? Math.max(0, next.force - force) : 0,
    missingPoints: next ? Math.max(0, next.points - points) : 0,
    percent: Math.max(pointsProgress, forceProgress),
  };
}

export type RankingScope = 'all' | 'state' | 'team' | 'city';
export function rankBases(bases: Base[], scope: RankingScope = 'all', base?: Base) {
  const eligible = bases.filter(b => scope === 'all' || scope === 'state' && b.uf === base?.uf || scope === 'team' && b.team === base?.team || scope === 'city' && !!base?.municipalityId && b.municipalityId === base.municipalityId);
  return eligible.sort((a, b) => scope === 'city' ? earnedPoints(b) - earnedPoints(a) || a.id.localeCompare(b.id) : forceOf(b) - forceOf(a) || a.id.localeCompare(b.id));
}
export function cityStanding(bases: Base[], base: Base) {
  const residents = rankBases(bases, 'city', base), points = earnedPoints(base), rank = residents.filter(resident => earnedPoints(resident) > points).length + 1;
  const topPoints = residents.length ? earnedPoints(residents[0]) : 0, leaders = residents.filter(resident => earnedPoints(resident) === topPoints);
  return { residents, points, rank, topPoints, leaders, marechal: leaders.length === 1 && topPoints > 0 ? leaders[0] : null, tied: leaders.length > 1 || topPoints === 0 && residents.length > 0 };
}
export function cityMarechals(bases: Base[]) {
  const cities = new Map<string, Base[]>();
  for (const base of bases) if (base.municipalityId) { const residents = cities.get(base.municipalityId) || []; residents.push(base); cities.set(base.municipalityId, residents); }
  const result = new Map<string, Base>();
  for (const [cityId, residents] of cities) {
    const top = Math.max(...residents.map(earnedPoints)), leaders = residents.filter(base => earnedPoints(base) === top);
    if (top > 0 && leaders.length === 1) result.set(cityId, leaders[0]);
  }
  return result;
}
