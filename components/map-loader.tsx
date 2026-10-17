'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, Flag, Shield, Swords } from 'lucide-react';

export type MapLoadingStatus = { progress: number; message: string; ready?: boolean; error?: boolean };

export default function MapLoader({ status }: { status: MapLoadingStatus }) {
  const [introDone, setIntroDone] = useState(false), [dismissed, setDismissed] = useState(false), [leaving, setLeaving] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setIntroDone(true), 3000); return () => clearTimeout(timer); }, []);
  useEffect(() => { if (status.ready && introDone) setLeaving(true); }, [status.ready, introDone]);
  useEffect(() => { if (leaving) { const timer = setTimeout(() => setDismissed(true), 300); return () => clearTimeout(timer); } }, [leaving]);
  if (status.error || dismissed) return null;
  return <div className={`map-boot ${leaving ? 'is-leaving' : ''}`} role="dialog" aria-modal="true" aria-labelledby="map-boot-title" aria-busy={!status.ready}>
    <div className="map-boot-card">
      <span className="map-boot-kicker">VOCÊ É 13 OU 22?</span>
      <div className="map-boot-scene" aria-hidden="true"><i /><span className="boot-base red"><Shield size={31} /></span><span className="boot-center"><Flag size={35} /></span><span className="boot-base blue"><Swords size={31} /></span><b /><b /><b /></div>
      <h2 id="map-boot-title">Um Brasil.<br /><em>Seu próximo território.</em></h2>
      <p>O campo está sendo preparado para você.</p>
      <div className="map-boot-progress" role="progressbar" aria-label="Preparação do mapa" aria-valuemin={0} aria-valuemax={100} aria-valuenow={status.progress}><span style={{ width: `${status.progress}%` }} /></div>
      <div className="map-boot-status" role="status"><span>{status.ready ? <Check size={15} /> : <i />}{status.message}</span><b>{status.progress}%</b></div>
      <button className="map-boot-enter" disabled={!status.ready} onClick={() => setLeaving(true)}>{status.ready ? 'Entrar no mapa' : 'Preparando o mapa'}<ArrowRight size={18} /></button>
      <small>27 estados · bases em miniatura · uma batalha por dia</small>
    </div>
  </div>;
}
