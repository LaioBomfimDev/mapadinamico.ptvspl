'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createUnit, animateUnit, type UnitKind, type Team } from '../lib/war/unit-models';
import { WarEffects } from '../lib/war/vfx';
export default function UnitViewer({ kind, team = 'red', burst = 0 }: { kind: UnitKind; team?: Team; burst?: number }) {
  const host = useRef<HTMLDivElement>(null), effects = useRef<WarEffects | null>(null); const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    const container = host.current; let raf = 0, observer: ResizeObserver | undefined, renderer: THREE.WebGLRenderer | undefined, scene: THREE.Scene | undefined, controls: OrbitControls | undefined;
    try {
      scene = new THREE.Scene(); scene.background = new THREE.Color('#e8eddc');
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2; renderer.shadowMap.enabled = true;
      renderer.domElement.setAttribute('aria-label', `Miniatura 3D de ${kind}. Arraste para girar.`); container.appendChild(renderer.domElement);
      const camera = new THREE.PerspectiveCamera(35, 1, .1, 100); camera.position.set(4.5, 3.5, 5.2);
      controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, .7, 0); controls.enableDamping = true; controls.minDistance = 3; controls.maxDistance = 12; controls.maxPolarAngle = 1.42; controls.enablePan = false;
      scene.add(new THREE.HemisphereLight('#fff5db', '#66835f', 2.6)); const sun = new THREE.DirectionalLight('#fff9ed', 3); sun.position.set(-3, 8, 5); sun.castShadow = true; scene.add(sun);
      const stage = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.9, .16, 64), new THREE.MeshStandardMaterial({ color: '#c0cd9b', roughness: 1 })); stage.position.y = -.08; stage.receiveShadow = true; scene.add(stage);
      const unit = createUnit(kind, team); unit.rotation.y = -.25; scene.add(unit); effects.current = new WarEffects(scene);
      const resize = () => { const width = container.clientWidth, height = container.clientHeight; if (!width || !height) return; renderer!.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); }; observer = new ResizeObserver(resize); observer.observe(container); resize();
      let previous = 0;
      const animate = (time: number) => { raf = requestAnimationFrame(animate); if (document.hidden || time - previous < 33) return; const delta = Math.min((time - previous) / 1000, .1); previous = time; controls!.update(); animateUnit(unit, time / 1000, false); effects.current?.update(delta); renderer!.render(scene!, camera); }; raf = requestAnimationFrame(animate);
    } catch { setFailed(true); }
    return () => { cancelAnimationFrame(raf); observer?.disconnect(); controls?.dispose(); effects.current?.dispose(); effects.current = null; if (scene) { const materials = new Set<THREE.Material>(); scene.traverse(object => { const mesh = object as THREE.Mesh; mesh.geometry?.dispose(); if (mesh.material) for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(m); }); materials.forEach(m => m.dispose()); } renderer?.dispose(); renderer?.domElement.remove(); };
  }, [kind, team]);
  useEffect(() => { if (burst) effects.current?.spawn(new THREE.Vector3(0, .8, 0), 2.3); }, [burst]);
  return <div className="unit-viewer" ref={host}>{failed && <p>Ative o WebGL 2 para visualizar a miniatura.</p>}</div>;
}
