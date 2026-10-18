/**
 * Público "ao vivo" simulado e relógio em tempo real da demonstração.
 * A média gira em torno de 40 pessoas, com ondas de 2 em 2 minutos (24 passos de 5 s)
 * que sobem e mantêm um patamar ou descem e mantêm, imitando o fluxo orgânico de uma live real.
 */
export const LIVE_AUDIENCE = {
  simulated: true,
  average: 40,
  intervalMs: 5000,
  waveMs: 120_000,
  ticksPerWave: 24,
  maxStepRatio: 0.15,
  min: 18,
  max: 66,
} as const;

type WaveState = {
  tick: number;
  regime: 'mid' | 'high' | 'low' | 'mid-return';
  target: number;
};

const waveStates = new WeakMap<() => number, WaveState>();

function pickRegimeTarget(regime: WaveState['regime'], random: () => number): number {
  const r = random();
  if (regime === 'high') return Math.round(48 + r * 10); // Sobe e mantém entre 48 e 58
  if (regime === 'low') return Math.round(22 + r * 10);  // Abaixa e mantém entre 22 e 32
  return Math.round(36 + r * 8);                         // Patamar central entre 36 e 44
}

function nextRegime(current: WaveState['regime'], random: () => number): WaveState['regime'] {
  if (current === 'mid') return random() < 0.5 ? 'high' : 'low';
  if (current === 'high') return random() < 0.65 ? 'low' : 'mid-return';
  if (current === 'low') return random() < 0.65 ? 'high' : 'mid-return';
  return random() < 0.5 ? 'high' : 'low';
}

export function initialViewers(random = Math.random): number {
  const startRegime: WaveState['regime'] = random() < 0.35 ? 'high' : random() < 0.7 ? 'low' : 'mid';
  const target = pickRegimeTarget(startRegime, random);
  waveStates.set(random, { tick: 0, regime: startRegime, target });
  return Math.max(LIVE_AUDIENCE.min, Math.min(LIVE_AUDIENCE.max, Math.round(34 + random() * 12)));
}

/**
 * Avança um passo de 5 s: a cada 2 minutos (24 ticks) pode mudar de tendência
 * (aumentar e manter, abaixar e manter, ou estabilizar perto de 40), com micro-variações naturais.
 */
export function nextViewers(current: number, random = Math.random): number {
  const { average, min, max, maxStepRatio, ticksPerWave } = LIVE_AUDIENCE;
  const safe = Number.isFinite(current) ? Math.min(max, Math.max(min, Math.round(current))) : average;
  let state = waveStates.get(random);
  if (!state) {
    state = { tick: 0, regime: 'high', target: pickRegimeTarget('high', random) };
    waveStates.set(random, state);
  }
  state.tick += 1;
  if (state.tick % ticksPerWave === 0) {
    state.regime = nextRegime(state.regime, random);
    state.target = pickRegimeTarget(state.regime, random);
  }

  const limit = Math.max(2, Math.floor(safe * maxStepRatio));
  const diff = state.target - safe;
  // Quando está longe do patamar da onda de 2 min, puxa com firmeza; quando já chegou no patamar, mantém com pequenas oscilações reais (-2 a +2).
  const pull = Math.abs(diff) > 4 ? diff * 0.38 : diff * 0.18;
  const jitter = (random() * 2 - 1) * (Math.abs(diff) > 5 ? 2.6 : 1.8);
  let step = Math.round(pull + jitter);
  step = Math.max(-limit, Math.min(limit, step));
  // Permite pequenas manutenções ou micro-variações de ±1 para nunca parecer travado.
  if (step === 0 && random() < 0.72) {
    step = diff > 0 ? 1 : diff < 0 ? -1 : random() < 0.5 ? 1 : -1;
  }
  const next = safe + step;
  if (next > max) return max - (random() < 0.5 ? 1 : 0);
  if (next < min) return min + (random() < 0.5 ? 1 : 0);
  return next;
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
