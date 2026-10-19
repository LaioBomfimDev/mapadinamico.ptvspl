/**
 * Público "ao vivo" simulado e relógio em tempo real da demonstração.
 * Fase inicial: entre 1 e 5 pessoas, com novo valor a cada 5 segundos.
 * O comportamento anterior de ondas com média 40 está preservado no histórico Git.
 */
export const LIVE_AUDIENCE = {
  simulated: true,
  average: 3,
  intervalMs: 5000,
  min: 1,
  max: 5,
} as const;

export function initialViewers(random = Math.random): number {
  const { min, max } = LIVE_AUDIENCE;
  return min + Math.floor(random() * (max - min + 1));
}

/** Sorteia outro valor dentro da faixa, evitando repetir o anterior no próximo tick. */
export function nextViewers(current: number, random = Math.random): number {
  const { average, min, max } = LIVE_AUDIENCE;
  const safe = Number.isFinite(current) ? Math.min(max, Math.max(min, Math.round(current))) : average;
  const pick = min + Math.floor(random() * (max - min));
  return pick >= safe ? pick + 1 : pick;
}

/** Formata a hora ao vivo com segundos (HH:MM:SS) no fuso horário de Brasília. */
export function liveClock(now = Date.now(), timeZone = 'America/Sao_Paulo'): string {
  const safeNow = Number.isFinite(now) ? now : Date.now();
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(safeNow);
}
