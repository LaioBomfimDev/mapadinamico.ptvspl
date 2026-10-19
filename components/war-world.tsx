'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { animateUnit } from '../lib/war/unit-models';
import { WarEffects } from '../lib/war/vfx';
import { ToyDebris } from '../lib/war/destruction';
import { faceTeamBadge } from '../lib/war/team-badges';
import { CAMP_SLOTS, CAMP_SURFACE_Y } from '../lib/war/base-camp';
import { baseLots, boardCityLots, cityRadius, projectedState, project, stateBounds, type MunicipalityIndexItem, type StateGeometry } from '../lib/war/geography';
import { CATALOG, STATES, type Base, type Battle, type Control, type UnitKind, type Team } from '../lib/war/game';
import { armyTier, cityMarechals } from '../lib/war/engagement';
import { mapRankingLeaders, fitMapLabels, type LabelCandidate } from '../lib/war/map-labels';
import { earnedPoints } from '../lib/war/points';
import { MapModelCache, isMapSharedResource } from '../lib/war/map-model-cache';
import { approachZoom, labelScreenSize, mapGeometryKey } from '../lib/war/map-performance';
import { applyCampCombatMotion, BattleChoreographer } from '../lib/war/battle-choreography';
import type { MapLoadingStatus } from './map-loader';

export type CameraCommand = { action: 'in' | 'out' | 'reset' | 'focus' | 'focus-city' | 'rotate' | 'rebuild'; serial: number; baseId?: string; uf?: string; cityId?: string };
type Props = { bases: Base[]; controls: Control; municipalityIndex: MunicipalityIndexItem[]; selected?: string; selectedUF?: string; selectedMunicipality?: string; command?: CameraCommand; battle?: Battle | null; elapsed: number; suspended?: boolean; onLoading: (status: MapLoadingStatus) => void; onBase: (id: string) => void; onState: (uf: string) => void; onMunicipality: (id: string) => void };
const COLORS = { red: '#db655c', blue: '#5d93ca', neutral: '#95b86f' };
function disposeTree(object: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  object.traverse(child => { for (const variant of [child.userData.fullMap, child.userData.compactMap]) if (variant instanceof THREE.Texture) textures.add(variant); const mesh = child as THREE.Mesh; if (mesh.geometry && !isMapSharedResource(mesh.geometry)) geometries.add(mesh.geometry); if (mesh.material) for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) { if (isMapSharedResource(mat)) continue; materials.add(mat); const map = (mat as THREE.MeshStandardMaterial).map; if (map) textures.add(map); } });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
}
function markerMaterial(team: Team) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 96; const c = canvas.getContext('2d')!;
  c.fillStyle = '#fff9e3'; c.strokeStyle = '#253b44'; c.lineWidth = 7; c.beginPath(); c.arc(48, 48, 40, 0, Math.PI * 2); c.fill(); c.stroke();
  c.beginPath(); c.lineWidth = 3;
  if (team === 'red') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 12 : 28; if (!i) c.moveTo(48 + Math.cos(a)*r,48 + Math.sin(a)*r); else c.lineTo(48 + Math.cos(a)*r,48 + Math.sin(a)*r); } c.fillStyle = '#f5ca53'; }
  else { [[20,31],[71,31],[75,37],[75,44],[49,44],[52,64],[41,69],[34,46],[22,46]].forEach(([x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.fillStyle = '#599bd8'; }
  c.closePath(); c.fill(); c.stroke(); const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map, transparent:true, depthTest:false, depthWrite:false, toneMapped:false, side:THREE.DoubleSide });
}
let measureContext: CanvasRenderingContext2D | null = null;
function plaqueSize(text: string, subtitle?: string) {
  const ctx = measureContext ??= document.createElement('canvas').getContext('2d')!;
  ctx.font = '900 47px Arial'; const main = ctx.measureText(text).width;
  ctx.font = '900 38px Arial'; const sub = subtitle ? ctx.measureText(subtitle).width : 0;
  return { width: Math.max(90, Math.ceil(Math.max(main, sub) + 24)), height: subtitle ? 126 : 90 };
}
function plaqueTexture(text: string, color: string, subtitle?: string) {
  const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')!, size = plaqueSize(text, subtitle);
  canvas.width = size.width; canvas.height = size.height;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#17222b';
  const line = (value: string, y: number, font: number, fill: string) => { ctx.font = `900 ${font}px Arial`; ctx.lineWidth = font === 47 ? 9 : 7; ctx.strokeText(value, canvas.width / 2, y); ctx.fillStyle = fill; ctx.fillText(value, canvas.width / 2, y); };
  line(text, subtitle ? 39 : 45, 47, color); if (subtitle) line(subtitle, 94, 38, '#ffffff');
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; return map;
}
function plaque(text: string, color: string, width: number, subtitle?: string) {
  const map = plaqueTexture(text, color, subtitle), canvas = map.image as HTMLCanvasElement;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, depthTest: false, transparent: true, toneMapped: false })); sprite.scale.set(width, width * canvas.height / canvas.width, 1); sprite.renderOrder = 8; sprite.userData.labelStyle = 'outlined-text'; sprite.userData.textureWidth = canvas.width; sprite.userData.textureHeight = canvas.height; sprite.userData.twoLines = !!subtitle; return sprite;
}
type Runtime = { modelCache: MapModelCache; scene: THREE.Scene; renderer: THREE.WebGLRenderer; camera: THREE.OrthographicCamera; orbit: OrbitControls; bases: THREE.Group; labels: THREE.Group; municipalityLabels: THREE.Group; terrain: Map<string, THREE.MeshStandardMaterial>; geographies: StateGeometry[]; positions: Map<string, THREE.Vector3>; groups: Map<string, THREE.Group>; effects: WarEffects; debris: ToyDebris; choreographer: BattleChoreographer; casualties: Set<string>; draw: (refreshShadows?: boolean) => void; wake: () => void; invalidateLayout: () => void; zoomBy: (factor: number) => void; focus: (baseId?: string, uf?: string, cityId?: string) => void; reset: () => void };

export default function WarWorld(props: Props) {
  const host = useRef<HTMLDivElement>(null), runtime = useRef<Runtime | null>(null), latest = useRef(props), fired = useRef(new Set<number>()), lastBattle = useRef('');
  latest.current = props;
  const geometryKey = mapGeometryKey(props.bases);
  const [ready, setReady] = useState(false), [failure, setFailure] = useState('');
  useEffect(() => {
    if (!host.current) return;
    setReady(false);
    const container = host.current, abort = new AbortController(), bootStarted = performance.now(); let cancelled = false, raf = 0, frameCount = 0, observer: ResizeObserver | undefined, owned: Runtime | undefined, cleanup = () => {}, wake = () => {}, shadowDirty = true, layoutDirty = true;
    const boot = async () => {
      try {
        latest.current.onLoading({ progress: 18, message: 'Abrindo o cenário 3D' });
        const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(devicePixelRatio || 1, container.clientWidth < 680 ? 1.1 : 1.3)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
        renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
        renderer.domElement.setAttribute('aria-label', 'Brasil em miniatura. Arraste para mover, amplie para explorar as bases e clique em um estado.'); renderer.domElement.dataset.renderer = 'war-three-webgl'; container.appendChild(renderer.domElement);
        const scene = new THREE.Scene(); scene.background = new THREE.Color('#acd9e8'); scene.fog = new THREE.Fog('#acd9e8', 150, 240);
        const camera = new THREE.OrthographicCamera(-45, 45, 38, -38, .1, 400); camera.position.set(0, 78, 47);
        const orbit = new OrbitControls(camera, renderer.domElement); orbit.enableDamping = true; orbit.dampingFactor = .12; orbit.minZoom = .6; orbit.maxZoom = 1800; orbit.minPolarAngle = .18; orbit.maxPolarAngle = 1.13; orbit.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }; orbit.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
        orbit.target.set(0, 0, 0); orbit.update();
        let cameraAnimating = false, desiredZoom = camera.zoom, desiredTarget: THREE.Vector3 | null = null, wheelAnchor: THREE.Vector2 | null = null;
        const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const markerClouds = new Map<Team, THREE.InstancedMesh>();
        for (const team of ['red', 'blue'] as const) {
          const cloud = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), markerMaterial(team), Math.max(256, latest.current.bases.length));
          cloud.name = `base-markers-${team}`; cloud.count = 0; cloud.frustumCulled = false; cloud.renderOrder = 4;
          cloud.instanceMatrix.setUsage(THREE.DynamicDrawUsage); cloud.userData.baseIds = []; cloud.userData.capacity = Math.max(256, latest.current.bases.length); markerClouds.set(team, cloud);
        }
        scene.add(new THREE.HemisphereLight('#fff4dc', '#7b9e79', 1.6));
        const sun = new THREE.DirectionalLight('#fff6db', 2.1); sun.position.set(-30, 70, 25); sun.castShadow = true; sun.shadow.mapSize.set(512, 512); Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38 }); sun.shadow.normalBias = .08; scene.add(sun);
        const ocean = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: '#acd9e8', toneMapped: false })); ocean.rotation.x = -Math.PI / 2; ocean.position.y = -.3; scene.add(ocean);
        const bases = new THREE.Group(), labels = new THREE.Group(), municipalityLabels = new THREE.Group(); municipalityLabels.visible = false; scene.add(bases, labels, municipalityLabels);
        markerClouds.forEach(cloud => scene.add(cloud));
        const modelCache = new MapModelCache(), terrain = new Map<string, THREE.MeshStandardMaterial>(), effects = new WarEffects(scene), debris = new ToyDebris(scene), casualties = new Set<string>();
        const ensureModels = (group: THREE.Group, single = false) => {
          const kinds = group.userData.kinds as {kind: UnitKind}[];
          const level = Number(group.userData.level || 1);
          const missing = kinds.filter(unit => !(group.userData.models as THREE.Group[]).some(model => model.userData.visualKey === `${group.userData.baseId}:${unit.kind}`));
          for (const unit of single ? missing.slice(0, 1) : missing) { const model = modelCache.unit(unit.kind, group.userData.team, level), size = group.userData.size, slot = CAMP_SLOTS[unit.kind]; model.scale.setScalar(size * slot.scale); model.position.set(slot.x * size, CAMP_SURFACE_Y * size, slot.z * size); model.userData.visualKey = `${group.userData.baseId}:${unit.kind}`; model.userData.groundY = group.position.y + CAMP_SURFACE_Y * size; group.add(model); group.userData.models.push(model); }
        };
        const choreographer = new BattleChoreographer(scene, modelCache, effects, debris, strike => {
          const group = owned?.groups.get(strike.targetId);
          if (!group) return;
          if (group.userData.models.length < group.userData.kinds.length) ensureModels(group, true);
          const survivors = (group.userData.models as THREE.Group[]).filter(unit => !casualties.has(unit.userData.visualKey));
          const victim = survivors[strike.index % Math.max(1, survivors.length)];
          if (victim && debris.shatter(victim, strike.index * 7919 + (latest.current.battle?.seed ?? 0))) {
            casualties.add(victim.userData.visualKey);
            shadowDirty = true;
          }
        });
        const renderTimes: number[] = [];
        const renderFrame = () => {
          if (shadowDirty) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; }
          const started = performance.now(); renderer.render(scene, camera); renderTimes.push(performance.now() - started); if (renderTimes.length > 120) renderTimes.shift();
          const data = renderer.domElement.dataset;
          Object.assign(data, { drawCalls: String(renderer.info.render.calls), renderCount: String(++frameCount), roadBatches: '0', mapMarkers: String([...markerClouds.values()].reduce((n,c) => n+c.count,0)), cityLabels: String(municipalityLabels.visible ? municipalityLabels.children.filter(o => o.visible).length : 0), cityLabelCandidates: String(municipalityLabels.children.length), cityLabelNames: municipalityLabels.visible ? municipalityLabels.children.filter(o => o.visible).map(o => `${o.userData.cityName}${(o as THREE.Sprite).material.map === o.userData.compactMap ? '*' : ''}`).join('|') : '', labelStyle: 'white-outlined-text', mapZoom: camera.zoom.toFixed(2), wreckCount: String(debris.count), activeStrikes: String(choreographer.activeCount), geometries: String(renderer.info.memory.geometries), textures: String(renderer.info.memory.textures), residentCamps: String([...owned!.groups.values()].filter(g => g.userData.decorations.length).length), residentUnits: String([...owned!.groups.values()].reduce((n,g) => n + g.userData.models.length, 0)), renderCpuMeanMs: (renderTimes.reduce((n,v) => n+v,0)/renderTimes.length).toFixed(2), renderCpuMaxMs: Math.max(...renderTimes).toFixed(2) });
        };
        const draw = (refreshShadows = false) => { layoutDirty = true; if (refreshShadows) shadowDirty = true; if (latest.current.suspended) return; renderFrame(); wake(); };
        const reset = (immediate = false) => { const z = container.clientWidth < 680 ? -16 : 0; desiredZoom = 1; desiredTarget = new THREE.Vector3(0, 0, z); wheelAnchor = null; if (immediate || reducedMotion) { camera.zoom = 1; orbit.target.copy(desiredTarget); camera.position.set(0, 78, 47 + z); desiredTarget = null; } camera.updateProjectionMatrix(); orbit.update(); layoutDirty = true; };
        owned = { modelCache, scene, renderer, camera, orbit, bases, labels, municipalityLabels, terrain, effects, debris, choreographer, casualties, positions: new Map(), groups: new Map(), geographies: [], draw, wake: () => wake(), invalidateLayout: () => { layoutDirty = true; }, zoomBy: factor => { desiredZoom = THREE.MathUtils.clamp(desiredZoom * factor, .6, 1800); wheelAnchor = null; wake(); }, reset: () => reset(), focus: (id, uf, cityId) => {
          const r = runtime.current; if (!r) return;
          let zoom = camera.zoom;
          const base = latest.current.bases.find(b => b.id === id), state = r.geographies.find(s => s.uf === (uf || base?.uf));
          const cityLabel = cityId ? r.municipalityLabels.children.find(label => label.userData.cityId === cityId) as THREE.Sprite | undefined : undefined;
          const cityIndex = cityId ? latest.current.municipalityIndex.find(item => item.id === cityId) : undefined;
          const cityPoint = cityIndex ? project(cityIndex.label[0], cityIndex.label[1]) : undefined;
          const cityGroups = cityId ? [...r.groups.values()].filter(g => g.userData.municipalityId === cityId) : [];
          let cityCenterPoint: THREE.Vector3 | undefined;
          if (cityGroups.length > 0) {
            const cx = cityGroups.reduce((sum, g) => sum + g.position.x, 0) / cityGroups.length;
            const cz = cityGroups.reduce((sum, g) => sum + g.position.z, 0) / cityGroups.length;
            cityCenterPoint = new THREE.Vector3(cx, .69, cz);
          }
          let p = (id ? r.positions.get(id)?.clone() : undefined) ?? cityCenterPoint ?? cityLabel?.position.clone() ?? (cityPoint ? new THREE.Vector3(cityPoint[0], .69, cityPoint[1]) : undefined);
          if (cityId && !id) {
            if (cityGroups.length > 1) {
              const spanX = Math.max(...cityGroups.map(g => g.position.x)) - Math.min(...cityGroups.map(g => g.position.x)) + (cityGroups[0].userData.size || 0.2) * 3.2;
              const spanZ = Math.max(...cityGroups.map(g => g.position.z)) - Math.min(...cityGroups.map(g => g.position.z)) + (cityGroups[0].userData.size || 0.2) * 3.2;
              zoom = THREE.MathUtils.clamp(24 / Math.max(spanX, spanZ, 0.7), 14, 34);
            } else {
              zoom = cityIndex ? THREE.MathUtils.clamp(20 / Math.max(cityRadius(cityIndex) * 4, .65), 14, 32) : Math.min(32, Math.max(12, 22 / Math.max(cityLabel?.scale.x ?? 0, .18)));
            }
          }
          if (!p && state) { const b = stateBounds(state); p = new THREE.Vector3((b.minX + b.maxX) / 2, .7, (b.minZ + b.maxZ) / 2); zoom = Math.min(24, 35 / Math.max(b.maxX - b.minX, b.maxZ - b.minZ)); }
          else if (p && id) { const size = r.groups.get(id!)?.userData.size ?? 1; zoom = Math.min(1800, 22 / size); }
          if (!p) return;
          if (id && container.clientWidth < 680) p.z += 44 / zoom;
          else if (id) p.x -= (camera.right - camera.left) / zoom * Math.min(.25, 220 / container.clientWidth);
          desiredZoom = zoom; desiredTarget = p; wheelAnchor = null; if (reducedMotion) { camera.zoom = zoom; orbit.target.copy(p); camera.position.copy(p).add(new THREE.Vector3(0,78,47)); desiredTarget = null; camera.updateProjectionMatrix(); orbit.update(); } layoutDirty = true; wake();
        } };
        runtime.current = owned;
        const resize = () => { const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return; renderer.setSize(w, h); const half = w < 680 ? Math.max(46, 42 / (w / h)) : Math.max(33, 31 / (w / h)); camera.left = -half * w / h; camera.right = half * w / h; camera.top = half; camera.bottom = -half; if (camera.zoom === 1) reset(true); camera.updateProjectionMatrix(); layoutDirty = true; draw(); };
        observer = new ResizeObserver(resize); observer.observe(container); resize();
        latest.current.onLoading({ progress: 32, message: 'Carregando os 27 estados do IBGE' });
        const response = await fetch('/war-assets/brazil-states.json', { signal: abort.signal });
        if (!response.ok) throw Error('Não foi possível carregar os contornos do IBGE.');
        const raw = await response.json() as StateGeometry[]; if (cancelled) return;
        if (raw.length !== 27) throw Error('A geografia precisa conter 27 unidades da federação.');
        latest.current.onLoading({ progress: 55, message: 'Desenhando o território brasileiro' });
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); if (cancelled) return;
        const geographies = raw.map(projectedState); owned.geographies = geographies;
        const stateBorderPositions: number[] = [];
        for (const state of geographies) {
          const shapes: THREE.Shape[] = [];
          for (const polygon of state.polygons) {
            const shape = new THREE.Shape(); polygon.forEach((ring, index) => { const path = index ? new THREE.Path() : shape; ring.forEach(([x, z], i) => { if (i) path.lineTo(x, -z); else path.moveTo(x, -z); }); path.closePath(); if (index) shape.holes.push(path); }); shapes.push(shape);
            const ring = polygon[0]; for (let i=0;i<ring.length;i++) { const a=ring[i], b=ring[(i+1)%ring.length]; stateBorderPositions.push(a[0],.665,a[1],b[0],.665,b[1]); }
          }
          const geometry = new THREE.ExtrudeGeometry(shapes, { depth: .65, bevelEnabled: false, steps: 1 }); geometry.rotateX(-Math.PI / 2);
          const surface = new THREE.MeshStandardMaterial({ color: COLORS.neutral, roughness: 1, flatShading: true }), edge = new THREE.MeshStandardMaterial({ color: '#c6b887', roughness: 1 });
          const mesh = new THREE.Mesh(geometry, [surface, edge]); mesh.receiveShadow = true; mesh.userData.uf = state.uf; scene.add(mesh); terrain.set(state.uf, surface);
          const location = STATES.find(s => s.uf === state.uf)!; const p = project(location.lng, location.lat);
          const text = plaque(state.uf, '#fffdf0', ['DF', 'SE', 'AL', 'ES', 'RJ', 'RN', 'PB'].includes(state.uf) ? 2.0 : 2.9); text.position.set(p[0], .85, p[1]); text.userData.uf = state.uf; text.userData.aspect = text.scale.y / text.scale.x; labels.add(text);
        }
        const stateBorders = new THREE.BufferGeometry(); stateBorders.setAttribute('position',new THREE.Float32BufferAttribute(stateBorderPositions,3));
        scene.add(new THREE.LineSegments(stateBorders,new THREE.LineBasicMaterial({color:'#71835a',transparent:true,opacity:.65})));
        // One instanced vegetation draw call, seeded and kept away from the coast.
        const treePositions: THREE.Vector3[] = []; let seed = 1337; const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        for (const s of geographies) { const b = stateBounds(s); for (let i = 0; i < 22; i++) { const x = b.minX + rand() * (b.maxX - b.minX), z = b.minZ + rand() * (b.maxZ - b.minZ); if (s.polygons.some(p => { let inside = false; for (let k = 0, j = p[0].length - 1; k < p[0].length; j = k++) { const a = p[0][k], c = p[0][j]; if ((a[1] > z) !== (c[1] > z) && x < (c[0] - a[0]) * (z - a[1]) / (c[1] - a[1]) + a[0]) inside = !inside; } return inside; })) treePositions.push(new THREE.Vector3(x, .92, z)); } }
        const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(.16, .55, 5), new THREE.MeshStandardMaterial({ color: '#6a9862', roughness: 1 }), treePositions.length), matrix = new THREE.Matrix4(); treePositions.forEach((p, i) => { matrix.makeTranslation(p.x, p.y, p.z); trees.setMatrixAt(i, matrix); }); scene.add(trees);
        const ray = new THREE.Raycaster(), start = new THREE.Vector2();
        const down = (event: PointerEvent) => start.set(event.clientX, event.clientY);
        const up = (event: PointerEvent) => { if (event.button !== 0 || Math.abs(start.x - event.clientX) + Math.abs(start.y - event.clientY) > 6) return; const rect = renderer.domElement.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera); if (municipalityLabels.visible) for (const hit of ray.intersectObjects(municipalityLabels.children.filter(label => label.visible), false)) { const cityCount = Number(hit.object.userData.cityCount || 0); if (hit.object.userData.cityId && (cityCount > 1 || latest.current.selectedMunicipality !== hit.object.userData.cityId)) { latest.current.onMunicipality(hit.object.userData.cityId); return; } if (hit.object.userData.baseId) { latest.current.onBase(hit.object.userData.baseId); return; } if (hit.object.userData.cityId) { latest.current.onMunicipality(hit.object.userData.cityId); return; } } for (const cloud of markerClouds.values()) for (const hit of ray.intersectObject(cloud)) { const id = hit.instanceId === undefined ? undefined : cloud.userData.baseIds[hit.instanceId]; if (id) { latest.current.onBase(id); return; } } for (const hit of ray.intersectObject(bases, true)) { let node: THREE.Object3D | null = hit.object; while (node) { if (node.userData.baseId) { latest.current.onBase(node.userData.baseId); return; } node = node.parent; } } for (const hit of ray.intersectObjects(scene.children, true)) if (hit.object.userData.uf) { latest.current.onState(hit.object.userData.uf); return; } };
        const wheel = (event: WheelEvent) => {
          event.preventDefault(); event.stopImmediatePropagation(); desiredTarget = null;
          const rect = renderer.domElement.getBoundingClientRect(), delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
          wheelAnchor = new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1, -(event.clientY-rect.top)/rect.height*2+1);
          desiredZoom = THREE.MathUtils.clamp(desiredZoom * Math.exp(-THREE.MathUtils.clamp(delta, -500, 500) * .002), .6, 1800); wake();
        };
        const interactionStart = () => { desiredZoom = camera.zoom; desiredTarget = null; wheelAnchor = null; };
        renderer.domElement.addEventListener('wheel', wheel, { passive: false, capture: true }); orbit.addEventListener('start', interactionStart);
        const onOrbitChange = () => { if (!cameraAnimating && !desiredTarget && !wheelAnchor) desiredZoom = camera.zoom; wake(); }, onVisibilityChange = () => { if (!document.hidden) wake(); };
        renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointerup', up); orbit.addEventListener('change', onOrbitChange); document.addEventListener('visibilitychange', onVisibilityChange);
        cleanup = () => { renderer.domElement.removeEventListener('wheel', wheel, true); orbit.removeEventListener('start', interactionStart); renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointerup', up); orbit.removeEventListener('change', onOrbitChange); document.removeEventListener('visibilitychange', onVisibilityChange); };
        let previous = 0, lastMunicipalityScope = '', lastSelectedBase = '', wasInBattle = false; const frustum = new THREE.Frustum(), projection = new THREE.Matrix4(), bounds = new THREE.Sphere();
        const impacts: { source: string; target: string; at: number; index: number; kind: UnitKind }[] = [];
        const markerMatrix = new THREE.Matrix4(), markerPosition = new THREE.Vector3(), markerScale = new THREE.Vector3(), projectedPoint = new THREE.Vector3(), anchorPlane = new THREE.Plane(new THREE.Vector3(0,1,0), -.7), beforeAnchor = new THREE.Vector3(), afterAnchor = new THREE.Vector3();
        const animate = (time: number) => {
          raf = 0; if (cancelled || document.hidden) return;
          const current = latest.current; if (current.suspended) return;
          const frameStarted = performance.now(), dt = Math.min((time - previous) / 1000, .1); previous = time;
          let dirty = layoutDirty, pendingDetails = false;
          cameraAnimating = true;
          if (desiredTarget) {
            const delta = desiredTarget.clone().sub(orbit.target).multiplyScalar(reducedMotion ? 1 : 1-Math.exp(-18*dt));
            orbit.target.add(delta); camera.position.add(delta); dirty = true;
            if (orbit.target.distanceToSquared(desiredTarget) < 1e-8) desiredTarget = null;
          }
          if (camera.zoom !== desiredZoom) {
            camera.updateMatrixWorld(); if (wheelAnchor) { ray.setFromCamera(wheelAnchor,camera); ray.ray.intersectPlane(anchorPlane,beforeAnchor); }
            camera.zoom = reducedMotion ? desiredZoom : approachZoom(camera.zoom,desiredZoom,dt); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
            if (wheelAnchor) { ray.setFromCamera(wheelAnchor,camera); if (ray.ray.intersectPlane(anchorPlane,afterAnchor)) { beforeAnchor.sub(afterAnchor); camera.position.add(beforeAnchor); orbit.target.add(beforeAnchor); } }
            dirty = true; if (camera.zoom === desiredZoom) wheelAnchor = null;
          }
          dirty = orbit.update(dt) || dirty; cameraAnimating = false; if (dirty) layoutDirty = true;
          const activeBattle = current.battle;
          if (activeBattle && lastBattle.current !== activeBattle.id) { debris.clear(); choreographer.clear(); casualties.clear(); fired.current.clear(); impacts.length = 0; lastBattle.current = activeBattle.id; dirty = true; shadowDirty = true; }
          if (wasInBattle && !activeBattle) {
            // Restore units to their resting pad slots after battle finishes
            choreographer.clear();
            for (const group of owned!.groups.values()) {
              (group.userData.models as THREE.Group[]).forEach((unit, idx) => applyCampCombatMotion(unit, unit.userData.kind, group.userData.size, 0, false, idx));
            }
            dirty = true;
          }
          wasInBattle = !!activeBattle;
          const municipalityScope = `${current.selectedUF || ''}:${current.selectedMunicipality || ''}`;
          if (municipalityScope !== lastMunicipalityScope) { lastMunicipalityScope = municipalityScope; layoutDirty = true; }
          if ((current.selected || '') !== lastSelectedBase) { lastSelectedBase = current.selected || ''; dirty = true; }
          camera.updateMatrixWorld(); frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
          const visible = (object: THREE.Object3D, value: boolean) => { if (object.visible !== value) { object.visible = value; dirty = true; if (!(object instanceof THREE.Sprite)) shadowDirty = true; } };
          if (layoutDirty) for (const child of labels.children) { const label = child as THREE.Sprite, width = Number(label.userData.textureWidth) * 23/47 * (camera.right - camera.left) / (camera.zoom * container.clientWidth); label.scale.set(width, width * Number(label.userData.aspect), 1); }
          const showLabels = camera.zoom < 3.8; if (labels.visible !== showLabels) { labels.visible = showLabels; dirty = true; }
          visible(municipalityLabels, camera.zoom >= 2.2);
          if (municipalityLabels.visible && layoutDirty) {
            const rect = renderer.domElement.getBoundingClientRect(), mobile = rect.width < 680, candidates = new Map<string, LabelCandidate>();
            for (const child of municipalityLabels.children) {
              const label = child as THREE.Sprite, selected = label.userData.cityId === current.selectedMunicipality, compactSize = label.userData.compactSize as { width: number; height: number } | undefined;
              const full = labelScreenSize(label.userData.textureWidth, label.userData.textureHeight, label.userData.twoLines, mobile), compact = compactSize && labelScreenSize(compactSize.width, compactSize.height, false, mobile);
              const point = projectedPoint.copy(label.position).project(camera);
              if (point.z < -1 || point.z > 1) continue;
              candidates.set(label.userData.cityId, { id: label.userData.cityId as string, x: (point.x + 1) * rect.width / 2, y: (1 - point.y) * rect.height / 2, w: full.width, h: full.height, compact: compact && { w: compact.width, h: compact.height }, priority: Number(label.userData.points || 0), selected });
            }
            const placements = fitMapLabels([...candidates.values()], rect.width, rect.height, mobile ? 8 : camera.zoom < 8 ? 14 : 22);
            for (const child of municipalityLabels.children) {
              const label = child as THREE.Sprite, place = placements.get(label.userData.cityId), candidate = candidates.get(label.userData.cityId);
              visible(label, !!place); if (!place || !candidate) continue;
              const size = place.compact && candidate.compact ? candidate.compact : candidate, map = place.compact ? label.userData.compactMap ??= plaqueTexture(label.userData.cityName, '#fffdf4') : label.userData.fullMap;
              if (map && label.material.map !== map) { label.material.map = map; label.material.needsUpdate = true; }
              label.scale.set(size.w * (camera.right - camera.left) / (camera.zoom * rect.width), size.h * (camera.top - camera.bottom) / (camera.zoom * rect.height), 1);
              const dy = place.dy === 0 && place.dx === 0 ? size.h * 0.78 : place.dy;
              label.center.set(.5 - place.dx / size.w, .5 + dy / size.h);
            }
          }
          layoutDirty = false;
          if (trees.visible !== (camera.zoom < 12)) { trees.visible = camera.zoom < 12; dirty = true; }
          for (const cloud of markerClouds.values()) {
            if (cloud.userData.capacity < owned!.groups.size) { cloud.dispose(); cloud.instanceMatrix = new THREE.InstancedBufferAttribute(new Float32Array(owned!.groups.size * 16),16).setUsage(THREE.DynamicDrawUsage); cloud.userData.capacity = owned!.groups.size; }
            cloud.count = 0; cloud.userData.baseIds.length = 0;
          }
          let detailJobs = 0, residentCamps = [...owned!.groups.values()].filter(g => g.userData.decorations.length).length;
          for (const [id, group] of owned!.groups) {
            bounds.center.copy(group.position); bounds.radius = group.userData.size * 2; visible(group, frustum.intersectsSphere(bounds));
            if (!group.visible && current.selected !== id && residentCamps > 24 && group.userData.decorations.length) {
              for (const object of [...group.userData.models, ...group.userData.decorations]) { group.remove(object); disposeTree(object); }
              group.userData.models = []; group.userData.decorations = []; residentCamps--; shadowDirty = true;
            }
            if (!group.visible) continue;
            const projectedWidth = group.userData.size * 1.28 * camera.zoom * container.clientWidth / (camera.right - camera.left);
            const inFocusedMunicipality = Boolean(current.selectedMunicipality && group.userData.municipalityId === current.selectedMunicipality);
            const inFocusedState = Boolean(current.selectedUF && group.userData.uf === current.selectedUF && camera.zoom >= 2.4);
            const detail = (camera.zoom >= 3.2 && projectedWidth >= 10) || inFocusedMunicipality || inFocusedState || current.selected === id;
            if (detail && (group.userData.models.length < group.userData.kinds.length || !group.userData.decorations.length)) {
              pendingDetails = true;
              if (detailJobs === 0 || performance.now() - frameStarted < 5) {
                if (!group.userData.decorations.length) { const camp = modelCache.camp(group.userData.team, group.userData.size, Number(group.userData.level || 1)); group.add(camp); group.userData.decorations.push(camp); residentCamps++; }
                else ensureModels(group, true);
                detailJobs++; dirty = true; shadowDirty = true;
              }
            }
            if (detail) group.userData.lastDetail = time;
            if (!detail && group.userData.models.length && time - (group.userData.lastDetail || 0) > 1500 && residentCamps > 24) {
              for (const object of [...group.userData.models, ...group.userData.decorations]) { group.remove(object); disposeTree(object); } group.userData.models = []; group.userData.decorations = []; residentCamps--; dirty = true; shadowDirty = true;
            }
            for (const decoration of group.userData.decorations as THREE.Object3D[]) visible(decoration, detail);
            (group.userData.models as THREE.Group[]).forEach((unit: THREE.Group, idx: number) => {
              visible(unit, detail && !casualties.has(unit.userData.visualKey));
              if (unit.visible && (dirty || activeBattle)) {
                applyCampCombatMotion(unit, unit.userData.kind, group.userData.size, time / 1000, !!activeBattle, idx);
                animateUnit(unit, time / 1000, !!activeBattle);
                faceTeamBadge(unit, camera);
              }
            });
            if (!detail || !group.userData.decorations.length) {
              const cloud = markerClouds.get(group.userData.team)!;
              const levelBoost = 1 + (Number(group.userData.level || 1) - 1) * 0.08;
              const width = (camera.zoom < 2 ? 13 : 18) * levelBoost * (camera.right-camera.left)/(camera.zoom*container.clientWidth);
              markerPosition.copy(group.position);
              const clusterCenter = group.userData.clusterCenter as [number, number] | undefined;
              const lotSpacing = Number(group.userData.lotSpacing || 0);
              if (clusterCenter && Number(group.userData.cityCount || 1) > 1 && lotSpacing > 0 && width * 0.85 > lotSpacing) {
                const factor = (width * 0.85) / lotSpacing;
                markerPosition.x = clusterCenter[0] + (group.position.x - clusterCenter[0]) * factor;
                markerPosition.z = clusterCenter[1] + (group.position.z - clusterCenter[1]) * factor;
              }
              markerPosition.y += Math.max(.35, group.userData.size*.8); markerScale.set(width,width,1);
              markerMatrix.compose(markerPosition,camera.quaternion,markerScale); cloud.setMatrixAt(cloud.count++,markerMatrix); cloud.userData.baseIds.push(id);
            }
            const showName = current.selected === id
              || inFocusedMunicipality
              || (Boolean(group.userData.municipalityId) && (inFocusedState || camera.zoom >= 5.5) && projectedWidth >= 14)
              || (group.userData.rankingLeader && !group.userData.municipalityId && camera.zoom > 3.8);
            if (showName && !group.userData.name) {
              const name = plaque(group.userData.labelText, '#ffffff', 1); name.userData.aspect = name.scale.y/name.scale.x; name.position.set(0,group.userData.size*.18,group.userData.size*.86); group.add(name); group.userData.name = name; dirty = true;
            }
            const name = group.userData.name as THREE.Sprite | undefined;
            if (name) { const screen = labelScreenSize(name.userData.textureWidth,name.userData.textureHeight,false,container.clientWidth<680), width = screen.width*(camera.right-camera.left)/(camera.zoom*container.clientWidth); name.scale.set(width,width*Number(name.userData.aspect),1); visible(name,showName); }
          }
          markerClouds.forEach(cloud => { cloud.instanceMatrix.needsUpdate = true; cloud.boundingSphere = null; });
          if (activeBattle) {
            activeBattle.events.forEach((event, index) => { if (event.at <= current.elapsed && !fired.current.has(index)) { fired.current.add(index); impacts.push({ source: event.source, target: event.target, at: event.at, index, kind: event.kind }); } });
          }
          for (let budget = 0; budget < 3 && impacts.length; budget++) {
            const event = impacts.shift()!, target = owned!.positions.get(event.target), source = owned!.positions.get(event.source);
            const sourceGroup = owned!.groups.get(event.source), targetGroup = owned!.groups.get(event.target);
            if (target && source && sourceGroup) {
              choreographer.spawn({
                index: event.index,
                kind: event.kind,
                team: sourceGroup.userData.team,
                level: Number(sourceGroup.userData.level || 1),
                sourceId: event.source,
                targetId: event.target,
                sourcePos: source.clone(),
                targetPos: target.clone(),
                targetSize: targetGroup?.userData.size || 1,
              });
              dirty = true;
            }
          }
          const changedStrikes = choreographer.update(dt, time / 1000, camera);
          for (const object of [...scene.children]) if (object.userData.ttl !== undefined) { object.userData.ttl -= dt; if (object.userData.ttl <= 0) { scene.remove(object); disposeTree(object); } }
          debris.setDetail(camera.zoom > 2.5, frustum); const changedDebris = debris.update(dt);
          const hadEffects = effects.activeCount > 0; effects.update(dt); const shouldRender = dirty || activeBattle || hadEffects || changedDebris || changedStrikes;
          if (shouldRender) renderFrame();
          if (dirty || activeBattle || hadEffects || changedDebris || changedStrikes || impacts.length || pendingDetails || desiredTarget || camera.zoom !== desiredZoom) wake();
        };
        wake = () => { if (!cancelled && !document.hidden && raf === 0) raf = requestAnimationFrame(animate); };
        latest.current.onLoading({ progress: 82, message: 'Preparando as miniaturas' });
        const warmups = (['red','blue'] as const).flatMap(team => [() => modelCache.camp(team,1,1), ...CATALOG.map(unit => () => modelCache.unit(unit.kind,team,1))]);
        for (let i=0;i<warmups.length;i++) {
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); if (cancelled) return;
          warmups[i](); latest.current.onLoading({progress:Math.round(82+14*(i+1)/warmups.length),message:'Preparando as miniaturas'});
        }
        latest.current.onLoading({progress:98,message:'Ajustando a primeira imagem'});
        await renderer.compileAsync(scene, camera); if (cancelled) return;
        renderer.domElement.dataset.bootMs = (performance.now()-bootStarted).toFixed(0);
        setReady(true); draw(true); wake();
      } catch (error) { if (!cancelled) { setFailure(error instanceof Error ? error.message : 'Falha ao iniciar o 3D.'); latest.current.onLoading({progress:0,message:'Não foi possível abrir o mapa',error:true}); } }
    };
    void boot();
    return () => { cancelled = true; abort.abort(); cancelAnimationFrame(raf); observer?.disconnect(); cleanup(); if (owned) { owned.choreographer.dispose(); owned.debris.dispose(); owned.effects.dispose(); owned.orbit.dispose(); disposeTree(owned.scene); owned.modelCache.dispose(); owned.renderer.dispose(); owned.renderer.domElement.remove(); } runtime.current = null; };
  }, []);
  useEffect(() => {
    const r = runtime.current; if (!r || !ready) return;
    for (const child of [...r.bases.children]) { r.bases.remove(child); disposeTree(child); } r.positions.clear(); r.groups.clear();
    const leaders = mapRankingLeaders(latest.current.bases);
    const addBase = (base: Base, lot: { x: number; z: number; size: number; spacing: number }, cityMeta?: { count: number; center: [number, number] }) => {
      const tier = armyTier(base);
      const size = Math.min(lot.size * (0.88 + (tier.level - 1) * 0.024), 2.5);
      const group = new THREE.Group(); group.position.set(lot.x, .68, lot.z); group.userData = { baseId: base.id, uf: base.uf, municipalityId: base.municipalityId, baseLotSize: lot.size, lotSpacing: lot.spacing, cityCount: cityMeta?.count ?? 1, clusterCenter: cityMeta?.center, size, level: tier.level, team: base.team, models: [], rankingLeader: leaders.states.get(base.uf)?.id === base.id, kinds: CATALOG.filter(u => base.inventory[u.kind] > 0) }; r.positions.set(base.id, group.position.clone());
      group.userData.decorations = []; group.userData.labelText = `@${base.username}`;
      r.bases.add(group); r.groups.set(base.id, group);
    };
    for (const state of r.geographies) {
      const members = props.bases.filter(b => b.uf === state.uf); if (!members.length) continue;
      if (state.uf === 'BA') {
        const byCity = new Map<string, Base[]>();
        for (const base of members) if (base.municipalityId) { const residents = byCity.get(base.municipalityId) || []; residents.push(base); byCity.set(base.municipalityId, residents); }
        for (const [cityId, residents] of byCity) {
          const city = props.municipalityIndex.find(item => item.id === cityId); if (!city) continue;
          const ordered = [...residents].sort((x, y) => x.joinedAt.localeCompare(y.joinedAt) || x.id.localeCompare(y.id));
          const lots = boardCityLots(project(city.label[0], city.label[1]), cityRadius(city), ordered.length, state);
          const cx = lots.reduce((s, l) => s + l.x, 0) / Math.max(1, lots.length);
          const cz = lots.reduce((s, l) => s + l.z, 0) / Math.max(1, lots.length);
          ordered.forEach((base, i) => addBase(base, lots[i], { count: ordered.length, center: [cx, cz] }));
        }
        const unassigned = members.filter(base => !base.municipalityId || !props.municipalityIndex.some(city => city.id === base.municipalityId));
        if (unassigned.length) { const lots = baseLots(state, unassigned.length); unassigned.forEach((base, i) => addBase(base, lots[i])); }
      } else {
        const lots = baseLots(state, members.length); members.forEach((base, i) => addBase(base, lots[i]));
      }
    }
    r.draw(true);
  }, [geometryKey, props.municipalityIndex, ready]);
  useEffect(() => {
    const r = runtime.current; if (!r || !ready) return;
    const leaders = mapRankingLeaders(props.bases), marechals = cityMarechals(props.bases);
    for (const base of props.bases) { const group = r.groups.get(base.id); if (!group) continue; group.userData.rankingLeader = leaders.states.get(base.uf)?.id === base.id;
      const tier = armyTier(base);
      if (group.userData.level !== tier.level) {
        group.userData.level = tier.level;
        group.userData.size = Math.min((group.userData.baseLotSize || group.userData.size) * (0.88 + (tier.level - 1) * 0.024), 2.5);
        for (const object of [...group.userData.models, ...group.userData.decorations]) { group.remove(object); disposeTree(object); }
        group.userData.models = []; group.userData.decorations = [];
      }
      const text = `${base.municipalityId && marechals.get(base.municipalityId)?.id === base.id ? '♛ ' : ''}@${base.username}`;
      if (text !== group.userData.labelText) { if (group.userData.name) { group.remove(group.userData.name); disposeTree(group.userData.name); group.userData.name = undefined; } group.userData.labelText = text; }
    }
    r.invalidateLayout(); r.wake();
  }, [props.bases, ready]);
  useEffect(() => { if (ready) { const frame = requestAnimationFrame(() => latest.current.onLoading({progress:100,message:'Seu mapa está pronto',ready:true})); return () => cancelAnimationFrame(frame); } }, [ready]);
  useEffect(() => {
    const r = runtime.current; if (!r || !ready) return;
    for (const child of [...r.municipalityLabels.children]) { r.municipalityLabels.remove(child); disposeTree(child); }
    const leaders = mapRankingLeaders(props.bases), ids = new Set(leaders.cities.keys()); if (props.selectedMunicipality) ids.add(props.selectedMunicipality);
    for (const cityId of ids) {
      const city = props.municipalityIndex.find(item => item.id === cityId); if (!city) continue;
      const leader = leaders.cities.get(cityId), [x,z] = project(city.label[0], city.label[1]);
      const cityCount = props.bases.filter(b => b.municipalityId === cityId).length;
      const label = plaque(city.name, '#fffdf4', .4, leader ? `@${leader.username}` : undefined);
      label.position.set(x, .69, z); label.userData.cityId = city.id; label.userData.baseId = leader?.id; label.userData.cityCount = cityCount; label.userData.cityName = city.name; label.userData.points = leader ? earnedPoints(leader) : 0; label.userData.aspect = label.scale.y / label.scale.x;
      if (leader) { label.userData.fullMap = label.material.map; label.userData.compactSize = plaqueSize(city.name); }
      r.municipalityLabels.add(label);
    }
    r.invalidateLayout(); r.draw();
  }, [props.bases, props.municipalityIndex, props.selectedMunicipality, ready]);
  useEffect(() => { const r = runtime.current; if (r && ready && !props.suspended) r.wake(); }, [props.battle, props.selected, props.suspended, ready]);
  useEffect(() => { const r = runtime.current; if (!r || !ready) return; for (const [uf, material] of r.terrain) material.color.set(COLORS[props.controls[uf] || 'neutral']); r.draw(); }, [props.controls, ready]);
  useEffect(() => { const r = runtime.current, command = props.command; if (!r || !ready || !command) return; if (command.action === 'reset') r.reset(); else if (command.action === 'rebuild') { r.choreographer.clear(); r.debris.clear(); r.casualties.clear(); r.draw(true); } else if (command.action === 'focus-city') { r.focus(command.baseId, command.uf, command.cityId); } else if (command.action === 'focus') r.focus(command.baseId, command.uf); else if (command.action === 'rotate') { const p = r.camera.position.clone().sub(r.orbit.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6); r.camera.position.copy(r.orbit.target).add(p); r.orbit.update(); r.invalidateLayout(); } else { r.zoomBy(command.action === 'in' ? 1.5 : 1/1.5); } r.draw(); }, [props.command, ready]);
  return <div ref={host} className="war-world">{failure && <div className="war-loading"><strong>O cenário 3D não abriu</strong><p>{failure}</p><p>Confira se o navegador tem WebGL 2 ativado.</p></div>}</div>;
}
