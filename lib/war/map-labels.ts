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
export type LabelSize = { w: number; h: number };
/** x/y is the city point on screen; w/h is the full label (name + leader); compact is the name-only fallback. */
export type LabelCandidate = LabelSize & { id: string; x: number; y: number; priority: number; selected?: boolean; compact?: LabelSize };
/** Offset of the label centre from the city point, in screen pixels (y grows downwards). */
export type LabelPlacement = { dx: number; dy: number; compact: boolean };
type Box = { x: number; y: number; w: number; h: number };
const PAD_X = 9, PAD_Y = 7, GAP_X = 12, GAP_Y = 6;
const SIDES = [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]] as const;
/**
 * Fit the highest ranked labels first. An isolated city keeps its name centred on it; when another
 * city with an army is close, the name moves beside it and, if needed, drops the leader line, so
 * neighbouring cities can show their names together. The searched city may exceed the ordinary cap.
 */
export function fitMapLabels(candidates: LabelCandidate[], width: number, height: number, limit: number) {
  const valid = candidates.filter(label => [label.x, label.y, label.w, label.h, label.priority].every(Number.isFinite) && label.w > 0 && label.h > 0);
  const ordered = [...valid].sort((a, b) => Number(!!b.selected) - Number(!!a.selected) || b.priority - a.priority || a.id.localeCompare(b.id));
  const onScreen = (box: Box) => box.x + box.w / 2 >= 0 && box.x - box.w / 2 <= width && box.y + box.h / 2 >= 0 && box.y - box.h / 2 <= height;
  const boxes: Box[] = [], placed = new Map<string, LabelPlacement>();
  const free = (box: Box) => !boxes.some(other => Math.abs(other.x - box.x) < (other.w + box.w) / 2 + PAD_X && Math.abs(other.y - box.y) < (other.h + box.h) / 2 + PAD_Y);
  for (const label of ordered) {
    if (!onScreen(label)) continue;
    if (label.selected) { boxes.push(label); placed.set(label.id, { dx: 0, dy: 0, compact: false }); continue; }
    if (placed.size >= limit) continue;
    const crowded = valid.some(other => other.id !== label.id && Math.abs(other.x - label.x) < label.w / 2 + PAD_X && Math.abs(other.y - label.y) < label.h / 2 + PAD_Y);
    const offsets = crowded ? [...SIDES, [0, 0] as const] : [[0, 0] as const, ...SIDES];
    search: for (const variant of [{ ...label, compact: false }, ...(label.compact && label.compact.w > 0 && label.compact.h > 0 ? [{ ...label.compact, compact: true }] : [])]) {
      for (const [sx, sy] of offsets) {
        const dx = sx * (variant.w / 2 + GAP_X), dy = sy * (variant.h / 2 + GAP_Y), box = { x: label.x + dx, y: label.y + dy, w: variant.w, h: variant.h };
        if (!onScreen(box) || !free(box)) continue;
        boxes.push(box); placed.set(label.id, { dx, dy, compact: variant.compact });
        break search;
      }
    }
  }
  return placed;
}
