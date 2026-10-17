'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageCircle, Mic, Pause, Play, Send, Square, Trash2, X } from 'lucide-react';
import type { Team } from '../lib/war/game';
import { LIVE_CHAT, formatAudioTime, liveMessageFrom, nextSpawnAt, pickAudioType, risePath, type LiveMessage } from '../lib/war/live-chat';
import './live.css';

type Shown = LiveMessage & { url?: string; own: boolean };
type Draft = { blob: Blob; url: string; durationMs: number };
type Props = { author?: string; team?: Team; onNotice: (message: string) => void; onActivity?: (active: boolean) => void };

/** Super chat e áudio subindo pela tela. Nesta prévia, as outras abas do mesmo navegador recebem pelo BroadcastChannel. */
export default function LiveChat({ author, team, onNotice, onActivity }: Props) {
  const [shown, setShown] = useState<Shown[]>([]), [open, setOpen] = useState(false), [chosenTeam, setChosenTeam] = useState<Team>(team || 'red'), [name, setName] = useState(author || ''), [text, setText] = useState('');
  const [recording, setRecording] = useState(false), [recordMs, setRecordMs] = useState(0), [draft, setDraft] = useState<Draft | null>(null), [playing, setPlaying] = useState<string>();
  const lane = useRef<HTMLDivElement>(null), channel = useRef<BroadcastChannel | null>(null), queue = useRef<{ message: LiveMessage; own: boolean }[]>([]), freeAt = useRef(0), pumpTimer = useRef<number | undefined>(undefined), timers = useRef(new Set<number>());
  const seen = useRef(new Set<string>()), measured = useRef(new Set<string>()), spawnedAt = useRef(new Map<string, number>()), onScreen = useRef(new Set<string>()), urls = useRef(new Map<string, string>()), lastSent = useRef(0);
  const recorder = useRef<MediaRecorder | null>(null), recordStart = useRef(0), recordTimer = useRef<number | undefined>(undefined), discardRecording = useRef(false), player = useRef<HTMLAudioElement | null>(null), playingId = useRef<string | undefined>(undefined);
  useEffect(() => { if (author) setName(author); }, [author]);
  useEffect(() => { if (team) setChosenTeam(team); }, [team]);
  useEffect(() => { onActivity?.(open || shown.length > 0); }, [open, shown.length, onActivity]);
  const later = useCallback((callback: () => void, ms: number) => { const id = window.setTimeout(() => { timers.current.delete(id); callback(); }, ms); timers.current.add(id); }, []);
  const release = useCallback((id: string) => { const url = urls.current.get(id); if (url && playingId.current !== id) { URL.revokeObjectURL(url); urls.current.delete(id); } }, []);
  const stopAudio = useCallback(() => { const audio = player.current, id = playingId.current; player.current = null; playingId.current = undefined; setPlaying(undefined); if (audio) { audio.onended = audio.onpause = null; audio.pause(); } if (id && !onScreen.current.has(id)) release(id); }, [release]);
  const playUrl = (id: string, url?: string) => { const same = playingId.current === id; stopAudio(); if (same || !url) return; const audio = new Audio(url); player.current = audio; playingId.current = id; setPlaying(id); audio.onended = audio.onpause = () => { if (player.current === audio) stopAudio(); }; void audio.play().catch(() => { if (player.current === audio) stopAudio(); onNotice('O navegador não conseguiu tocar este áudio.'); }); };
  const remove = useCallback((id: string) => { onScreen.current.delete(id); measured.current.delete(id); spawnedAt.current.delete(id); setShown(list => list.filter(item => item.id !== id)); release(id); }, [release]);
  const pump = useCallback(function pump() {
    window.clearTimeout(pumpTimer.current);
    if (!queue.current.length) return;
    const wait = freeAt.current - performance.now();
    if (wait > 0) { pumpTimer.current = window.setTimeout(pump, wait); return; }
    const { message, own } = queue.current.shift()!, url = message.audio ? URL.createObjectURL(message.audio) : undefined;
    if (url) urls.current.set(message.id, url);
    onScreen.current.add(message.id); spawnedAt.current.set(message.id, performance.now());
    freeAt.current = performance.now() + 800; // provisório; a altura real é medida quando a mensagem aparece
    setShown(list => [...list, { ...message, url, own }]);
    later(() => remove(message.id), risePath(lane.current?.clientHeight || 0, 600).durationMs); // segurança caso a medição não ocorra
    if (queue.current.length) pumpTimer.current = window.setTimeout(pump, 800);
  }, [later, remove]);
  /** Mede a mensagem antes do primeiro quadro: define o percurso dela e quando a próxima pode nascer. */
  const measure = (element: HTMLElement | null, id: string) => {
    if (!element || measured.current.has(id)) return;
    measured.current.add(id);
    const height = element.offsetHeight, rise = risePath(lane.current?.clientHeight || 0, height);
    element.style.setProperty('--rise', `${rise.distance}px`); element.style.animationDuration = `${rise.durationMs}ms`;
    later(() => remove(id), rise.durationMs + 200);
    freeAt.current = nextSpawnAt(spawnedAt.current.get(id) ?? performance.now(), height); pump();
  };
  const enqueue = useCallback((message: LiveMessage, own: boolean) => {
    if (seen.current.has(message.id)) return;
    seen.current.add(message.id); if (seen.current.size > 400) seen.current = new Set([...seen.current].slice(-200));
    queue.current.push({ message, own }); if (queue.current.length > LIVE_CHAT.maxQueue) queue.current.splice(0, queue.current.length - LIVE_CHAT.maxQueue);
    pump();
  }, [pump]);
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel(LIVE_CHAT.channel); channel.current = bc;
    bc.onmessage = event => { const { message } = liveMessageFrom(event.data); if (message) enqueue(message, false); };
    return () => { bc.close(); channel.current = null; };
  }, [enqueue]);
  useEffect(() => { const pending = timers.current, created = urls.current; return () => { window.clearTimeout(pumpTimer.current); window.clearInterval(recordTimer.current); pending.forEach(id => window.clearTimeout(id)); if (recorder.current?.state === 'recording') { discardRecording.current = true; recorder.current.stop(); } const audio = player.current; if (audio) { audio.onended = audio.onpause = null; audio.pause(); } created.forEach(url => URL.revokeObjectURL(url)); }; }, []);
  useEffect(() => () => { if (draft) URL.revokeObjectURL(draft.url); }, [draft]);

  const deliver = (raw: Partial<LiveMessage>) => {
    const now = Date.now(), wait = LIVE_CHAT.cooldownMs - (now - lastSent.current);
    if (wait > 0) { onNotice(`Aguarde ${Math.ceil(wait / 1000)} s para mandar outra mensagem.`); return false; }
    const { message, error } = liveMessageFrom({ ...raw, id: crypto.randomUUID(), at: now, author: name || author, team: chosenTeam });
    if (!message) { onNotice(error || 'Mensagem inválida.'); return false; }
    lastSent.current = now; enqueue(message, true);
    try { channel.current?.postMessage(message); } catch { onNotice('A mensagem apareceu só nesta aba.'); }
    return true;
  };
  const submitText = (event: FormEvent) => { event.preventDefault(); if (deliver({ kind: 'super', text })) setText(''); };
  const discardDraft = () => { if (playingId.current === 'draft') stopAudio(); setDraft(null); };
  const sendAudio = () => { if (draft && deliver({ kind: 'audio', text: '', audio: draft.blob, durationMs: draft.durationMs })) discardDraft(); };
  const stopRecording = (discard: boolean) => { discardRecording.current = discard; if (recorder.current?.state === 'recording') recorder.current.stop(); };
  const startRecording = async () => {
    if (recording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { onNotice('Este navegador não grava áudio aqui. A gravação exige HTTPS ou localhost.'); return; }
    stopAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }), type = pickAudioType(value => MediaRecorder.isTypeSupported(value)), chunks: Blob[] = [];
      const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      rec.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      rec.onstop = () => {
        stream.getTracks().forEach(track => track.stop()); window.clearInterval(recordTimer.current); recorder.current = null; setRecording(false);
        if (discardRecording.current) { discardRecording.current = false; return; }
        const durationMs = Math.min(LIVE_CHAT.maxAudioMs, performance.now() - recordStart.current), mime = rec.mimeType || type, blob = new Blob(chunks, { type: mime.startsWith('audio/') ? mime : 'audio/webm' });
        if (durationMs < LIVE_CHAT.minAudioMs || !blob.size) { onNotice('Áudio curto demais. Grave pelo menos um segundo.'); return; }
        if (blob.size > LIVE_CHAT.maxAudioBytes) { onNotice('Áudio grande demais para o chat ao vivo.'); return; }
        setDraft({ blob, url: URL.createObjectURL(blob), durationMs });
      };
      discardRecording.current = false; recorder.current = rec; recordStart.current = performance.now(); setRecordMs(0); setRecording(true); rec.start(250);
      recordTimer.current = window.setInterval(() => { const ms = performance.now() - recordStart.current; setRecordMs(ms); if (ms >= LIVE_CHAT.maxAudioMs && rec.state === 'recording') rec.stop(); }, 200);
    } catch (error) { onNotice((error as DOMException).name === 'NotAllowedError' ? 'Permita o uso do microfone para gravar o áudio.' : 'Não foi possível acessar o microfone.'); }
  };
  const close = () => { if (recording) stopRecording(true); discardDraft(); setOpen(false); };

  return <section className={`live-chat ${open ? 'is-open' : ''}`} aria-label="Chat ao vivo">
    <div className="live-lane" ref={lane} aria-live="polite">
      {shown.map(item => <article key={item.id} ref={element => measure(element, item.id)} className={`live-message ${item.team} ${item.kind} ${item.own ? 'own' : ''}`}>
        <header><span className="live-team">{item.team === 'red' ? '13' : '22'}</span><strong>@{item.author}</strong><small>{item.kind === 'audio' ? 'ÁUDIO' : 'SUPER CHAT'}</small></header>
        {item.kind === 'super' ? <p>{item.text}</p> : <button className={`live-audio ${playing === item.id ? 'playing' : ''}`} onClick={() => playUrl(item.id, item.url)} aria-label={playing === item.id ? 'Pausar áudio' : `Ouvir áudio de @${item.author}`}>{playing === item.id ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}<span className="live-wave" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></span><b>{formatAudioTime(item.durationMs || 0)}</b></button>}
      </article>)}
    </div>
    {open ? <form className="live-panel" onSubmit={submitText}>
      <div className="live-panel-head"><span className="live-on"><i aria-hidden="true" />AO VIVO</span><strong>Todos no mapa veem sua mensagem subir</strong><button type="button" className="live-close" onClick={close} aria-label="Fechar chat ao vivo"><X size={16} /></button></div>
      <div className="live-identity"><div className="live-teams" role="radiogroup" aria-label="Seu time">{(['red', 'blue'] as const).map(option => <button type="button" role="radio" aria-checked={chosenTeam === option} key={option} className={`${option} ${chosenTeam === option ? 'active' : ''}`} onClick={() => setChosenTeam(option)}>{option === 'red' ? '13' : '22'}</button>)}</div><input className="live-name" aria-label="Seu @" placeholder="@seu_perfil" value={name} maxLength={31} onChange={event => setName(event.target.value)} autoComplete="off" /></div>
      {recording ? <div className="live-recording" role="status"><i aria-hidden="true" /><span>Gravando <b>{formatAudioTime(recordMs)}</b> / {formatAudioTime(LIVE_CHAT.maxAudioMs)}</span><button type="button" onClick={() => stopRecording(false)}><Square size={12} fill="currentColor" />Parar</button><button type="button" className="live-icon" onClick={() => stopRecording(true)} aria-label="Descartar gravação"><Trash2 size={15} /></button></div>
        : draft ? <div className="live-draft"><button type="button" className="live-icon" onClick={() => playUrl('draft', draft.url)} aria-label={playing === 'draft' ? 'Pausar prévia do áudio' : 'Ouvir prévia do áudio'}>{playing === 'draft' ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}</button><span>Áudio <b>{formatAudioTime(draft.durationMs)}</b></span><button type="button" className="live-icon" onClick={discardDraft} aria-label="Descartar áudio"><Trash2 size={15} /></button><button type="button" className="live-send" onClick={sendAudio}><Send size={15} />Enviar áudio</button></div>
        : <><div className="live-text"><textarea aria-label="Mensagem do super chat" placeholder="Escreva seu super chat…" maxLength={LIVE_CHAT.maxText} rows={2} value={text} onChange={event => setText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /><small>{text.length}/{LIVE_CHAT.maxText}</small></div>
          <div className="live-actions"><button type="button" className="live-mic" onClick={() => void startRecording()}><Mic size={16} />Gravar áudio</button><button type="submit" className="live-send" disabled={!text.trim()}><Send size={15} />Enviar super chat</button></div></>}
      <p className="live-note">Prévia: chega às abas abertas deste navegador. Para todos os visitantes, falta ligar o servidor ao vivo.</p>
    </form> : <button className="live-open" onClick={() => setOpen(true)}><span className="live-open-icon"><MessageCircle size={18} /></span><span><strong>Mande seu recado ao vivo</strong><small>Super chat ou áudio · até {LIVE_CHAT.maxAudioMs / 1000} s</small></span></button>}
  </section>;
}
