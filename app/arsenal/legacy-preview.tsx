'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

type Unit = 'infantry' | 'tank' | 'artillery' | 'drone' | 'aircraft';
const units: { id: Unit; label: string; detail: string }[] = [
  { id: 'infantry', label: 'Infantaria', detail: 'Linha de frente' },
  { id: 'tank', label: 'Tanque', detail: 'Blindado pesado' },
  { id: 'artillery', label: 'Artilharia', detail: 'Disparo de longo alcance' },
  { id: 'drone', label: 'Enxame de drones', detail: 'Ataque em área' },
  { id: 'aircraft', label: 'Apoio aéreo', detail: 'Passagem rápida' },
];

function createUnit(kind: Unit) {
  const group = new THREE.Group();
  const mat = (color: string, roughness = 0.8) => new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });
  const olive = mat('#687b58'), light = mat('#9aa875'), dark = mat('#30383a'), metal = mat('#758188', 0.54), glass = mat('#a6d1cf', 0.38), cloth = mat('#85765d');
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
  };
  const box = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number, rz = 0) => add(new THREE.BoxGeometry(w, h, d), material, x, y, z, 0, 0, rz);
  const cylinder = (rTop: number, rBottom: number, h: number, material: THREE.Material, x: number, y: number, z: number, sides = 10, rx = 0, rz = 0) => add(new THREE.CylinderGeometry(rTop, rBottom, h, sides), material, x, y, z, rx, 0, rz);

  if (kind === 'tank') {
    box(1.35, .42, 2.05, dark, -.63, .32, 0); box(1.35, .42, 2.05, dark, .63, .32, 0);
    box(1.28, .56, 1.72, olive, 0, .57, 0); box(1.12, .1, 1.42, light, 0, .9, -.06);
    cylinder(.52, .58, .32, olive, 0, 1.02, .05, 12); cylinder(.16, .16, 1.02, dark, 0, 1.08, .78, 8, Math.PI / 2);
    cylinder(.12, .13, .16, metal, 0, 1.08, 1.31, 8, Math.PI / 2);
    for (const x of [-.67, .67]) for (const z of [-.7, -.25, .2, .65]) cylinder(.14, .14, .08, metal, x, .32, z, 8, 0, Math.PI / 2);
  } else if (kind === 'drone') {
    box(.55, .2, .55, dark, 0, 1.25, 0); box(.27, .12, .28, olive, 0, 1.4, 0);
    box(.16, .1, .28, glass, 0, 1.16, .36);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const arm = box(.92, .08, .08, metal, sx * .48, 1.28, sz * .48, -sx * sz * .68);
      arm.material = metal;
      cylinder(.05, .05, .06, dark, sx * .84, 1.31, sz * .84, 8);
      const rotor = box(.58, .035, .09, light, sx * .84, 1.36, sz * .84); rotor.userData.rotor = true;
    }
  } else if (kind === 'artillery') {
    box(1.05, .2, 1.2, dark, 0, .27, 0); box(.85, .24, .9, olive, 0, .48, -.12);
    cylinder(.35, .42, .18, metal, 0, .68, .06, 10); cylinder(.12, .15, 1.42, dark, 0, .77, .56, 8, Math.PI / 2);
    for (const x of [-.64, .64]) cylinder(.22, .22, .14, dark, x, .37, -.1, 12, 0, Math.PI / 2);
  } else if (kind === 'aircraft') {
    const fuselage = add(new THREE.CapsuleGeometry(.19, 1.62, 3, 8), olive, 0, .55, 0, Math.PI / 2);
    fuselage.scale.set(1, 1, .72);
    box(2.25, .08, .52, olive, 0, .53, -.08); box(.82, .07, .37, light, 0, .58, -.8);
    box(.12, .3, .35, dark, 0, .69, .53); add(new THREE.SphereGeometry(.18, 8, 6), glass, 0, .68, .35);
  } else {
    box(.48, .52, .35, cloth, 0, .73, 0); add(new THREE.SphereGeometry(.22, 8, 6), light, 0, 1.18, .02);
    box(.18, .48, .2, dark, -.17, .22, .02); box(.18, .48, .2, dark, .17, .22, .02);
    box(.15, .47, .18, cloth, -.35, .75, .03, -.18); box(.15, .47, .18, cloth, .35, .75, .03, .18);
    box(.12, .1, .95, metal, .38, .8, .33, -.2); box(.15, .13, .2, dark, .38, .8, .83, -.2);
    box(.34, .34, .28, olive, 0, .8, -.26);
  }
  group.traverse((obj) => { if (obj instanceof THREE.Mesh) { obj.castShadow = true; obj.receiveShadow = true; } });
  group.userData.rotors = group.children.filter((child) => child.userData.rotor);
  return group;
}

export default function ArsenalPage() {
  const host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const unitRef = useRef<THREE.Group | null>(null);
  const [selected, setSelected] = useState<Unit>('tank');
  const [inBattle, setInBattle] = useState(false);
  const [message, setMessage] = useState('Prévia de arte 3D · modelos provisórios');

  useEffect(() => {
    if (!host.current) return;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#a9d8eb'); scene.fog = new THREE.Fog('#a9d8eb', 16, 32); sceneRef.current = scene;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; host.current.appendChild(renderer.domElement);
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 100); camera.position.set(4.6, 5.1, 7.6);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.target.set(0, .55, 0); controls.maxPolarAngle = Math.PI * .48;
    scene.add(new THREE.HemisphereLight('#fff8e6', '#647454', 2)); const sun = new THREE.DirectionalLight('#fff0cf', 3); sun.position.set(-3, 8, 5); sun.castShadow = true; scene.add(sun);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(3.4, 48), new THREE.MeshStandardMaterial({ color: '#a1bd75', roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -.04; ground.receiveShadow = true; scene.add(ground);
    const grid = new THREE.GridHelper(7, 14, '#e9f4d5', '#d2e4c2'); grid.position.y = -.025; (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = .45; scene.add(grid);
    const resize = () => { if (!host.current) return; const w = host.current.clientWidth, h = host.current.clientHeight; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(host.current); resize(); let raf = 0;
    const animate = () => { raf = requestAnimationFrame(animate); controls.update(); for (const rotor of unitRef.current?.userData.rotors ?? []) rotor.rotation.y += .14; renderer.render(scene, camera); }; animate();
    return () => { cancelAnimationFrame(raf); observer.disconnect(); controls.dispose(); renderer.dispose(); renderer.domElement.remove(); sceneRef.current = null; };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current; if (!scene) return;
    if (unitRef.current) { scene.remove(unitRef.current); unitRef.current.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose()); else o.material.dispose(); } }); }
    const model = createUnit(selected); model.position.y = 0; model.rotation.y = -.38; scene.add(model); unitRef.current = model;
    setMessage(`${units.find((unit) => unit.id === selected)?.label} · estudo provisório`);
  }, [selected]);

  const burst = () => {
    const scene = sceneRef.current; if (!scene || inBattle) return;
    const group = new THREE.Group(); const colors = ['#fff0a1', '#ffb33f', '#ed633b', '#6c7474'];
    for (let i = 0; i < 26; i++) {
      const material = new THREE.MeshBasicMaterial({ color: colors[i % colors.length], transparent: true });
      const particle = new THREE.Mesh(new THREE.IcosahedronGeometry(.12 + Math.random() * .16, 0), material);
      const angle = Math.random() * Math.PI * 2, radius = .12 + Math.random() * .32;
      particle.position.set(Math.cos(angle) * radius, .4 + Math.random() * .7, Math.sin(angle) * radius); particle.userData.velocity = new THREE.Vector3(Math.cos(angle) * (.018 + Math.random() * .035), .025 + Math.random() * .04, Math.sin(angle) * (.018 + Math.random() * .035)); group.add(particle);
    }
    scene.add(group); if (unitRef.current) unitRef.current.visible = false; setInBattle(true); setMessage('Durante a guerra · nome e equipamento removidos'); let ticks = 0;
    const step = () => { ticks++; group.children.forEach((object) => { const p = object as THREE.Mesh; p.position.add(p.userData.velocity); p.scale.multiplyScalar(.975); (p.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - ticks / 42); }); if (ticks < 42) requestAnimationFrame(step); else { scene.remove(group); group.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); (object.material as THREE.Material).dispose(); } }); setMessage('Guerra encerrada · aguardando reset'); window.setTimeout(() => { if (unitRef.current) unitRef.current.visible = true; setInBattle(false); setMessage('Reset concluído · nome e equipamento restaurados'); }, 650); } }; step();
  };

  return <main style={{ minHeight: '100vh', background: '#eaf1e4', color: '#26372e', padding: 'clamp(16px, 4vw, 42px)', fontFamily: 'Arial, sans-serif' }}>
    <header style={{ maxWidth: 1120, margin: '0 auto 20px' }}><a href="/" style={{ color: '#426451' }}>← voltar ao mapa</a><p style={{ margin: '24px 0 6px', fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#597a60' }}>Projeto 2 · protótipo visual</p><h1 style={{ margin: 0, fontSize: 'clamp(30px, 5vw, 48px)' }}>Arsenal de guerra</h1><p style={{ maxWidth: 720, lineHeight: 1.55 }}>Estudos 3D originais e provisórios para revisar silhuetas antes de ligar as unidades ao mapa e à batalha.</p></header>
    <section style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 18 }}>
      <div style={{ minHeight: 420, height: 'min(62vh, 640px)', position: 'relative', overflow: 'hidden', borderRadius: 22, background: '#a9d8eb', boxShadow: '0 12px 38px #223b2720' }}><div ref={host} style={{ width: '100%', height: '100%', minHeight: 420 }} /><div style={{ position: 'absolute', left: 14, top: 14, padding: '9px 12px', borderRadius: 999, background: '#f8faf5e8', color: '#26372e', fontSize: 13, fontWeight: 700 }}>{inBattle ? 'identificação temporariamente removida' : '@participante_demo · equipamento visível'}</div></div>
      <aside style={{ display: 'grid', alignContent: 'start', gap: 10 }}><h2 style={{ margin: '4px 0 8px' }}>Unidades</h2>{units.map((unit) => <button key={unit.id} onClick={() => setSelected(unit.id)} style={{ textAlign: 'left', padding: '14px 16px', borderRadius: 14, border: selected === unit.id ? '2px solid #4e775c' : '1px solid #cbd7c4', background: selected === unit.id ? '#dce9d4' : '#f8faf5', color: '#26372e', cursor: 'pointer' }}><strong>{unit.label}</strong><span style={{ display: 'block', marginTop: 4, fontSize: 13, opacity: .75 }}>{unit.detail}</span></button>)}<button onClick={burst} disabled={inBattle} style={{ marginTop: 8, padding: 15, border: 0, borderRadius: 14, background: '#c9573e', color: 'white', fontWeight: 800, cursor: inBattle ? 'wait' : 'pointer', opacity: inBattle ? .7 : 1 }}>Simular combate e reset</button><p aria-live="polite" style={{ minHeight: 44, fontSize: 13, lineHeight: 1.5, color: '#4b6252' }}>{message}</p></aside>
    </section>
  </main>;
}
