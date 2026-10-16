export type PointKind = 'opening' | 'arrival' | 'comment' | 'mention' | 'recruit' | 'support' | 'story';
export type PointEntry = { key: string; kind: PointKind; points: number; at: string; subject?: string; post?: string };
export type PointLedger = { entries: PointEntry[] };
export const POINT_LABELS: Record<PointKind, string> = { opening: 'Saldo anterior / demo', arrival: 'Primeira inscrição', comment: 'Comentários', mention: 'Marcações', recruit: 'Recrutamento', support: 'Apoios recebidos', story: 'Stories confirmados' };
export const SOCIAL_RULES = { mention: 3, mentionsPerDay: 10, recruit: 25, recruitsPerDay: 5, support: 5, supportsPerDay: 20, story: 30, storiesPerDay: 1, experimental: true } as const;
type Wallet = { credits: number; joinedAt: string; id: string; progress?: PointLedger };
export function ledgerOf(base: Wallet): PointLedger {
  return base.progress ?? { entries: base.credits ? [{ key: `opening:${base.id}`, kind: 'opening', points: base.credits, at: base.joinedAt }] : [] };
}
export function awardPoints<T extends Wallet>(base: T, entry: PointEntry): T {
  const progress = ledgerOf(base);
  if (progress.entries.some(item => item.key === entry.key)) return base;
  if (progress.entries.length >= 5000 || !Number.isSafeInteger(entry.points) || entry.points <= 0 || base.credits + entry.points > 10000000) throw Error('Limite de pontos desta demonstração atingido.');
  return { ...base, credits: base.credits + entry.points, progress: { entries: [...progress.entries, entry] } };
}
export function pointsByKind(base: Wallet) {
  const total = Object.fromEntries(Object.keys(POINT_LABELS).map(key => [key, 0])) as Record<PointKind, number>;
  for (const entry of ledgerOf(base).entries) total[entry.kind] += entry.points;
  return total;
}
export function earnedPoints(base: Wallet) { return ledgerOf(base).entries.reduce((sum, item) => sum + item.points, 0); }
export function validLedger(value: unknown) {
  if (!value || typeof value !== 'object' || !Array.isArray((value as PointLedger).entries) || (value as PointLedger).entries.length > 5000) return false;
  const keys = new Set<string>();
  return (value as PointLedger).entries.every(e => {
    if (!e || typeof e.key !== 'string' || !e.key.length || e.key.length > 300 || keys.has(e.key) || !Object.hasOwn(POINT_LABELS, e.kind) || !Number.isSafeInteger(e.points) || e.points < 1 || e.points > 10000000 || typeof e.at !== 'string' || !Number.isFinite(Date.parse(e.at)) || (e.subject !== undefined && !/^[a-z\d._]{1,30}$/.test(e.subject)) || (e.post !== undefined && (typeof e.post !== 'string' || !e.post.length || e.post.length > 100))) return false;
    keys.add(e.key); return true;
  });
}
