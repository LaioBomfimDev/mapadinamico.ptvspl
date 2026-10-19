'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, Swords } from 'lucide-react';

export type MapLoadingStatus = { progress: number; message: string; ready?: boolean; error?: boolean };

export default function MapLoader({ status }: { status: MapLoadingStatus }) {
  const [introDone, setIntroDone] = useState(false), [dismissed, setDismissed] = useState(false), [leaving, setLeaving] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setIntroDone(true), 3000); return () => clearTimeout(timer); }, []);
  useEffect(() => { if (status.ready && introDone) setLeaving(true); }, [status.ready, introDone]);
  useEffect(() => { if (leaving) { const timer = setTimeout(() => setDismissed(true), 300); return () => clearTimeout(timer); } }, [leaving]);
  if (status.error || dismissed) return null;
  return <div className={`map-boot ${leaving ? 'is-leaving' : ''}`} role="dialog" aria-modal="true" aria-labelledby="map-boot-title" aria-busy={!status.ready}>
    <div className="map-boot-card">
      <span className="map-boot-kicker"><b className="kicker-red">TIME 13</b> · GUERRA PELO BRASIL · <b className="kicker-blue">TIME 22</b></span>
      <div className="map-boot-scene" aria-hidden="true">
        <i />
        <span className="boot-base red"><strong>13</strong><small>VERMELHO</small></span>
        <span className="boot-center"><Swords size={30} /><b>VS</b></span>
        <span className="boot-base blue"><strong>22</strong><small>AZUL</small></span>
        <b className="spark-red" /><b className="spark-blue" /><b />
      </div>
      <h2 id="map-boot-title">Você é <em className="boot-red">13</em> ou <em className="boot-blue">22</em>?</h2>
      <p>O campo de batalha entre o <strong className="text-red">Vermelho (13)</strong> e o <strong className="text-blue">Azul (22)</strong> está sendo preparado.</p>
      <div className="map-boot-progress" role="progressbar" aria-label="Preparação do mapa" aria-valuemin={0} aria-valuemax={100} aria-valuenow={status.progress}><span style={{ width: `${status.progress}%` }} /></div>
      <div className="map-boot-status" role="status"><span>{status.ready ? <Check size={15} /> : <i />}{status.message}</span><b>{status.progress}%</b></div>
      <button className="map-boot-enter" disabled={!status.ready} onClick={() => setLeaving(true)}>{status.ready ? 'Entrar na guerra 13 vs 22' : 'Preparando o mapa'}<ArrowRight size={18} /></button>
      <small>27 estados · bases 13 e 22 em miniatura · uma batalha por dia</small>
    </div>
  </div>;
}
