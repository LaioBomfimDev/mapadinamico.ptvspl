'use client';
import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { LIVE_AUDIENCE, initialViewers, nextViewers } from '../lib/war/live-audience';
import './live.css';

/** Componente separado para o contador de 5 s não redesenhar a tela inteira. */
export default function LiveAudience() {
  const [viewers, setViewers] = useState<number>(LIVE_AUDIENCE.average);
  // O primeiro valor aleatório só nasce no navegador, para não divergir do HTML do servidor.
  useEffect(() => { const first = setTimeout(() => setViewers(initialViewers()), 300), timer = setInterval(() => setViewers(value => nextViewers(value)), LIVE_AUDIENCE.intervalMs); return () => { clearTimeout(first); clearInterval(timer); }; }, []);
  return <span className="live-audience" title={LIVE_AUDIENCE.simulated ? 'Pessoas vendo o mapa ao vivo · número simulado nesta demonstração' : 'Pessoas vendo o mapa ao vivo'}>
    <span className="live-on"><i aria-hidden="true" />AO VIVO</span>
    <span className="live-count"><Eye size={13} aria-hidden="true" /><b>{viewers}</b> assistindo</span>
  </span>;
}
