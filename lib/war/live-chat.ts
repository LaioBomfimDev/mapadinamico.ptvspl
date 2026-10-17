import type { Team } from './game.ts';

/**
 * Chat ao vivo: super chat em texto ou áudio curto.
 * Com o servidor (Supabase) ligado, as mensagens passam pela API do site e chegam a todos pelo tempo real.
 * Sem servidor, na demonstração local, circulam só entre abas do mesmo navegador (BroadcastChannel).
 */
export const LIVE_CHAT = { channel: 'projeto2:ao-vivo:v1', maxText: 120, minAudioMs: 600, maxAudioMs: 15_000, maxAudioBytes: 900_000, cooldownMs: 4_000, risePxPerSecond: 40, minRisePx: 180, gapPx: 10, maxQueue: 30 } as const;

export type LiveMessageKind = 'super' | 'audio';
/** audio: gravado neste navegador (demonstração); audioUrl: arquivo guardado pelo servidor ao vivo. */
export type LiveMessage = { id: string; kind: LiveMessageKind; team: Team; author: string; text: string; at: number; audio?: Blob; audioUrl?: string; durationMs?: number };

const AUDIO_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

export const cleanLiveText = (text: string) => text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, LIVE_CHAT.maxText);

export const liveAuthor = (raw: unknown) => (typeof raw === 'string' ? raw.replace(/^@+/, '').toLowerCase().replace(/[^a-z\d._]/g, '').slice(0, 30) : '') || 'visitante';

export const pickAudioType = (isTypeSupported: (type: string) => boolean) => AUDIO_TYPES.find(type => { try { return isTypeSupported(type); } catch { return false; } }) || '';

export const formatAudioTime = (ms: number) => { const seconds = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; };

/** Valida tanto o que esta aba envia quanto o que chega de outra aba; retorna o motivo da recusa. */
export function liveMessageFrom(input: unknown): { message?: LiveMessage; error?: string } {
  if (!input || typeof input !== 'object') return { error: 'Mensagem inválida.' };
  const raw = input as Record<string, unknown>;
  if (raw.kind !== 'super' && raw.kind !== 'audio') return { error: 'Tipo de mensagem inválido.' };
  if (raw.team !== 'red' && raw.team !== 'blue') return { error: 'Escolha 13 ou 22.' };
  if (typeof raw.id !== 'string' || !/^[\w-]{6,80}$/.test(raw.id)) return { error: 'Identificador inválido.' };
  const at = typeof raw.at === 'number' && Number.isFinite(raw.at) ? raw.at : 0;
  const text = typeof raw.text === 'string' ? cleanLiveText(raw.text) : '';
  if (/(https?:\/\/|www\.)/i.test(text)) return { error: 'Links não são permitidos no chat ao vivo.' };
  const base = { id: raw.id, kind: raw.kind, team: raw.team, author: liveAuthor(raw.author), text, at } as LiveMessage;
  if (raw.kind === 'super') return text ? { message: base } : { error: 'Escreva a mensagem do super chat.' };
  const audio = raw.audio, durationMs = typeof raw.durationMs === 'number' && Number.isFinite(raw.durationMs) ? Math.round(raw.durationMs) : 0;
  if (typeof Blob === 'undefined' || !(audio instanceof Blob) || !audio.type.startsWith('audio/')) return { error: 'Áudio inválido.' };
  if (audio.size > LIVE_CHAT.maxAudioBytes) return { error: 'Áudio grande demais.' };
  if (durationMs < LIVE_CHAT.minAudioMs) return { error: 'Áudio curto demais.' };
  return { message: { ...base, audio, durationMs: Math.min(durationMs, LIVE_CHAT.maxAudioMs) } };
}

/** Linha da tabela live_messages (servidor ao vivo) convertida para a faixa; null se vier fora do formato. */
export function liveMessageFromRow(row: unknown): LiveMessage | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>, at = typeof r.created_at === 'string' ? Date.parse(r.created_at) : NaN;
  if (typeof r.id !== 'string' || !/^[\w-]{6,80}$/.test(r.id) || (r.kind !== 'super' && r.kind !== 'audio') || (r.team !== 'red' && r.team !== 'blue') || !Number.isFinite(at)) return null;
  const text = typeof r.text === 'string' ? cleanLiveText(r.text) : '', author = liveAuthor(r.author);
  if (r.kind === 'super') return text && !/(https?:\/\/|www\.)/i.test(text) ? { id: r.id, kind: 'super', team: r.team, author, text, at } : null;
  const audioUrl = typeof r.audio_url === 'string' && /^https?:\/\/[^\s]{1,590}$/.test(r.audio_url) ? r.audio_url : '', durationMs = Number(r.duration_ms);
  if (!audioUrl || !Number.isFinite(durationMs) || durationMs < LIVE_CHAT.minAudioMs || durationMs > LIVE_CHAT.maxAudioMs) return null;
  return { id: r.id, kind: 'audio', team: r.team, author, text: '', at, audioUrl, durationMs: Math.round(durationMs) };
}

/** Mensagem devolvida pela nossa API (já no formato da faixa), conferida pelas mesmas regras da linha do banco. */
export function liveMessageFromApi(value: unknown) {
  const m = (value && typeof value === 'object' ? value : {}) as Partial<LiveMessage>;
  return liveMessageFromRow({ id: m.id, kind: m.kind, team: m.team, author: m.author, text: m.text, audio_url: m.audioUrl ?? null, duration_ms: m.durationMs ?? null, created_at: typeof m.at === 'number' && Number.isFinite(m.at) ? new Date(m.at).toISOString() : null });
}

/**
 * Cada mensagem nasce com o topo na borda de baixo da faixa e sobe até sair pelo alto.
 * Todas usam a mesma velocidade em pixels, mesmo se a faixa mudar de altura; assim uma nunca alcança a outra.
 */
export const risePath = (laneHeightPx: number, heightPx: number) => { const distance = Math.max(LIVE_CHAT.minRisePx, Math.round(laneHeightPx)) + Math.max(0, Math.round(heightPx)); return { distance, durationMs: Math.round(distance / LIVE_CHAT.risePxPerSecond * 1000) }; };
/** A próxima só nasce quando a anterior subiu a própria altura mais o intervalo. */
export const nextSpawnAt = (spawnedAt: number, previousHeightPx: number) => spawnedAt + (Math.max(0, previousHeightPx) + LIVE_CHAT.gapPx) / LIVE_CHAT.risePxPerSecond * 1000;
