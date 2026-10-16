import { dayInBrazil, forceOf, type Base, type GameState } from './game.ts';
import { awardPoints, ledgerOf, SOCIAL_RULES, type PointKind } from './points.ts';

/** Domain input only. A production adapter must authenticate and validate Meta receipts before calling it. */
export type EngagementEvent = { id: string; post: string; kind: 'mention' | 'support' | 'story'; actor: string; target?: string; at: number; verified: boolean };
export function processEngagement(game: GameState, event: EngagementEvent) {
  const profile = (value = '') => value.replace(/^@/, '').trim().toLowerCase();
  const actor = profile(event.actor), target = profile(event.target), receipt = `social:${event.id}`;
  if (!event.id || event.id.length > 150 || !event.post || event.post.length > 100 || !Number.isFinite(event.at) || !/^[a-z\d._]{1,30}$/.test(actor) || (event.kind !== 'story' && !/^[a-z\d._]{1,30}$/.test(target)) || !['mention', 'support', 'story'].includes(event.kind)) throw Error('Evento de participação inválido.');
  if (!event.verified) throw Error('Ação aguardando confirmação. Abrir ou copiar um link não comprova participação.');
  if (game.receipts.includes(receipt)) return { game, awarded: false, reason: 'Evento já recebido.' };
  if (game.receipts.length >= 5000) throw Error('Limite de eventos desta demonstração atingido.');
  if (actor === target) throw Error('Marcar ou apoiar o próprio perfil não dá pontos.');
  const owner = game.bases.find(b => b.username === (event.kind === 'support' ? target : actor));
  if (!owner) throw Error('O perfil que recebe os pontos precisa ter uma base.');
  const day = dayInBrazil(event.at), entries = ledgerOf(owner).entries;
  const key = event.kind === 'story' ? `story:${day}` : event.kind === 'mention' ? `mention:${event.post}:${target}` : `support:${event.post}:${actor}`;
  const limit = event.kind === 'mention' ? SOCIAL_RULES.mentionsPerDay : event.kind === 'support' ? SOCIAL_RULES.supportsPerDay : SOCIAL_RULES.storiesPerDay;
  const capped = entries.filter(e => e.kind === event.kind && dayInBrazil(Date.parse(e.at)) === day).length >= limit;
  const duplicate = entries.some(e => e.key === key);
  const points = event.kind === 'mention' ? SOCIAL_RULES.mention : event.kind === 'support' ? SOCIAL_RULES.support : SOCIAL_RULES.story;
  const credited = capped || duplicate ? owner : awardPoints(owner, { key, kind: event.kind as PointKind, points, at: new Date(event.at).toISOString(), post: event.post, subject: event.kind === 'support' ? actor : target || undefined });
  return { game: { ...game, receipts: [...game.receipts, receipt], bases: game.bases.map(b => b.id === owner.id ? credited : b) }, awarded: credited !== owner, reason: duplicate ? 'Esta ação já pontuou.' : capped ? 'Limite diário desta ação atingido.' : `+${points} pontos para @${owner.username}.` };
}
export const ARMY_TIERS = [{ name: 'Acampamento', force: 0 }, { name: 'Destacamento', force: 100 }, { name: 'Pelotão', force: 250 }, { name: 'Companhia', force: 500 }, { name: 'Batalhão', force: 1000 }, { name: 'Divisão', force: 2500 }] as const;
export function armyTier(base: Base) {
  const force = forceOf(base), index = ARMY_TIERS.findLastIndex(t => force >= t.force), current = ARMY_TIERS[index], next = ARMY_TIERS[index + 1];
  return { index, current, next, missing: next ? next.force - force : 0, percent: next ? (force - current.force) / (next.force - current.force) * 100 : 100 };
}
export type RankingScope = 'all' | 'state' | 'team';
export function rankBases(bases: Base[], scope: RankingScope = 'all', base?: Base) { return bases.filter(b => scope === 'all' || scope === 'state' && b.uf === base?.uf || scope === 'team' && b.team === base?.team).sort((a, b) => forceOf(b) - forceOf(a) || a.id.localeCompare(b.id)); }
