/**
 * Público "ao vivo" simulado da demonstração. Não mede visitantes reais:
 * gira em torno da média e muda pouco a cada intervalo, como pedido para a prévia.
 */
export const LIVE_AUDIENCE = { simulated: true, average: 60, intervalMs: 5000, maxStepRatio: .05, min: 48, max: 72 } as const;

export function initialViewers(random = Math.random) {
  return Math.round(LIVE_AUDIENCE.average - 4 + random() * 8);
}

/** Passo de no máximo ~5% do valor atual, sempre diferente de zero, puxado de volta para a média. */
export function nextViewers(current: number, random = Math.random) {
  const { average, maxStepRatio, min, max } = LIVE_AUDIENCE;
  const safe = Number.isFinite(current) ? Math.min(max, Math.max(min, Math.round(current))) : average;
  const limit = Math.max(1, Math.floor(safe * maxStepRatio));
  let step = Math.round((random() * 2 - 1) * limit + (average - safe) * .3);
  step = Math.max(-limit, Math.min(limit, step)) || (random() < .5 ? -1 : 1);
  const next = safe + step;
  return next > max || next < min ? safe - step : next;
}
