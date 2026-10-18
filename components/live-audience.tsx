'use client';
import { useEffect, useState } from 'react';
import { Clock3, Eye } from 'lucide-react';
import { LIVE_AUDIENCE, initialViewers, liveClock, nextViewers } from '../lib/war/live-audience';
import './live.css';

/** Componente isolado para o relógio de 1 s e o contador de audiência não redesenharem o mapa inteiro. */
export default function LiveAudience() {
  const [viewers, setViewers] = useState<number>(LIVE_AUDIENCE.average);
  const [clockText, setClockText] = useState<string>('');

  // O primeiro valor aleatório e a hora ao vivo nascem no cliente para não divergir do HTML do servidor.
  useEffect(() => {
    setClockText(liveClock());
    const first = setTimeout(() => setViewers(initialViewers()), 300);
    const viewerTimer = setInterval(() => setViewers(value => nextViewers(value)), LIVE_AUDIENCE.intervalMs);
    const clockTimer = setInterval(() => setClockText(liveClock()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(viewerTimer);
      clearInterval(clockTimer);
    };
  }, []);

  return (
    <span
      className="live-audience"
      title={LIVE_AUDIENCE.simulated ? 'Transmissão ao vivo · horário de Brasília e público em tempo real' : 'Pessoas vendo o mapa ao vivo'}
    >
      <span className="live-on">
        <i aria-hidden="true" />
        AO VIVO
        {clockText && <time className="live-clock" aria-label={`Horário ao vivo: ${clockText}`}>{clockText}</time>}
      </span>
      <span className="live-count">
        <Eye size={13} aria-hidden="true" />
        <b>{viewers}</b> assistindo
      </span>
    </span>
  );
}
