import { forceOf, type Base } from './game.ts';
import { earnedPoints } from './points.ts';

/** First row in each local ranking. Ties use the same stable id order as the ranking. */
export function mapRankingLeaders(bases: Base[]) {
  const cities = new Map<string, Base>(), states = new Map<string, Base>();
  for (const base of bases) {
    const state = states.get(base.uf);
    if (!state || forceOf(base) > forceOf(state) || forceOf(base) === forceOf(state) && base.id.localeCompare(state.id) < 0) states.set(base.uf, base);
    if (!base.municipalityId) continue;
    const city = cities.get(base.municipalityId);
    if (!city || earnedPoints(base) > earnedPoints(city) || earnedPoints(base) === earnedPoints(city) && base.id.localeCompare(city.id) < 0) cities.set(base.municipalityId, base);
  }
  return { cities, states };
}
export type LabelCandidate = { id: string; x: number; y: number; w: number; h: number; priority: number; selected?: boolean };
/** Fit the highest ranked labels first. The explicitly searched city may exceed the ordinary cap. */
export function fitMapLabels(candidates: LabelCandidate[], width: number, height: number, limit: number) {
  const accepted: LabelCandidate[] = [];
  const ordered = [...candidates].sort((a, b) => Number(!!b.selected) - Number(!!a.selected) || b.priority - a.priority || a.id.localeCompare(b.id));
  for (const label of ordered) {
    if (![label.x, label.y, label.w, label.h, label.priority].every(Number.isFinite) || label.w <= 0 || label.h <= 0 || label.x + label.w / 2 < 0 || label.x - label.w / 2 > width || label.y + label.h / 2 < 0 || label.y - label.h / 2 > height) continue;
    const overlaps = accepted.some(box => Math.abs(box.x - label.x) < (box.w + label.w) / 2 + 9 && Math.abs(box.y - label.y) < (box.h + label.h) / 2 + 7);
    if (!label.selected && (accepted.length >= limit || overlaps)) continue;
    accepted.push(label);
  }
  return new Set(accepted.map(label => label.id));
}
