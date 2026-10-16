'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createUnit, animateUnit } from '../lib/war/unit-models';
import { WarEffects } from '../lib/war/vfx';
import { ToyDebris } from '../lib/war/destruction';
import { createTeamBadge, faceTeamBadge } from '../lib/war/team-badges';
import { createBaseCamp, CAMP_SLOTS, CAMP_SURFACE_Y } from '../lib/war/base-camp';
import { baseLots, clippedStreet, projectedState, project, stateBounds, type Point, type StateGeometry } from '../lib/war/geography';
import { CATALOG, STATES, type Base, type Battle, type Control, type UnitKind } from '../lib/war/game';

export type CameraCommand = { action: 'in' | 'out' | 'reset' | 'focus' | 'focus-city' | 'rotate' | 'rebuild'; serial: number; baseId?: string; uf?: string; cityId?: string };
type MunicipalityGeometry = { id: string; name: string; polygons: Point[][][]; label: Point; labelSize: number };
type Props = { bases: Base[]; controls: Control; selected?: string; selectedUF?: string; selectedMunicipality?: string; command?: CameraCommand; battle?: Battle | null; elapsed: number; suspended?: boolean; onBase: (id: string) => void; onState: (uf: string) => void };
const COLORS = { red: '#db655c', blue: '#5d93ca', neutral: '#95b86f' };
function disposeTree(object: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  object.traverse(child => { const mesh = child as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) { materials.add(mat); const map = (mat as THREE.MeshStandardMaterial).map; if (map) textures.add(map); } });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
}
function plaque(text: string, color: string, width: number, paper = false) {
  const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')!; const font = `900 ${paper ? 34 : 47}px Arial`; ctx.font = font; canvas.width = Math.max(paper ? 160 : 90, Math.ceil(ctx.measureText(text).width + (paper ? 44 : 28))); canvas.height = 96;
  if (paper) { ctx.fillStyle = '#fffdf4'; ctx.beginPath(); ctx.roundRect(3, 3, canvas.width - 6, 90, 28); ctx.fill(); ctx.strokeStyle = '#263d43'; ctx.lineWidth = 5; ctx.stroke(); }
  ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = paper ? 0 : 8; ctx.strokeStyle = '#263d43'; if (!paper) ctx.strokeText(text, canvas.width / 2, 48, canvas.width - 24); ctx.fillStyle = color; ctx.fillText(text, canvas.width / 2, 48, canvas.width - 24);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, depthTest: false, transparent: true })); sprite.scale.set(width, width * 96 / canvas.width, 1); sprite.renderOrder = 8; return sprite;
}
type Runtime = { scene: THREE.Scene; renderer: THREE.WebGLRenderer; camera: THREE.OrthographicCamera; orbit: OrbitControls; bases: THREE.Group; labels: THREE.Group; municipalityBorders: THREE.Group; municipalityLabels: THREE.Group; terrain: Map<string, THREE.MeshStandardMaterial>; geographies: StateGeometry[]; positions: Map<string, THREE.Vector3>; groups: Map<string, THREE.Group>; effects: WarEffects; debris: ToyDebris; casualties: Set<string>; draw: () => void; focus: (baseId?: string, uf?: string, cityId?: string) => void; reset: () => void };

export default function WarWorld(props: Props) {
  const host = useRef<HTMLDivElement>(null), runtime = useRef<Runtime | null>(null), latest = useRef(props), fired = useRef(new Set<number>()), lastBattle = useRef('');
  latest.current = props;
  const [ready, setReady] = useState(false), [failure, setFailure] = useState('');
  useEffect(() => {
    if (!host.current) return;
    setReady(false);
    const container = host.current, abort = new AbortController(); let cancelled = false, raf = 0, observer: ResizeObserver | undefined, owned: Runtime | undefined, cleanup = () => {};
    const boot = async () => {
      try {
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
        renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
        renderer.domElement.setAttribute('aria-label', 'Brasil em miniatura. Arraste para mover, amplie para explorar as bases e clique em um estado.'); renderer.domElement.dataset.renderer = 'war-three-webgl'; container.appendChild(renderer.domElement);
        const scene = new THREE.Scene(); scene.background = new THREE.Color('#acd9e8'); scene.fog = new THREE.Fog('#acd9e8', 150, 240);
        const camera = new THREE.OrthographicCamera(-45, 45, 38, -38, .1, 400); camera.position.set(0, 78, 47);
        const orbit = new OrbitControls(camera, renderer.domElement); orbit.enableDamping = true; orbit.dampingFactor = .1; orbit.minZoom = .6; orbit.maxZoom = 110; orbit.minPolarAngle = .18; orbit.maxPolarAngle = 1.13; orbit.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }; orbit.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
        orbit.target.set(0, 0, 0); orbit.update();
        scene.add(new THREE.HemisphereLight('#fff4dc', '#7b9e79', 1.6));
        const sun = new THREE.DirectionalLight('#fff6db', 2.1); sun.position.set(-30, 70, 25); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38 }); sun.shadow.normalBias = .08; scene.add(sun);
        const ocean = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: '#acd9e8', toneMapped: false })); ocean.rotation.x = -Math.PI / 2; ocean.position.y = -.3; scene.add(ocean);
        const grid = new THREE.GridHelper(300, 100, '#d7eef2', '#d7eef2'); grid.position.y = -.27; (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = .28; scene.add(grid);
        const bases = new THREE.Group(), labels = new THREE.Group(), municipalityBorders = new THREE.Group(), municipalityLabels = new THREE.Group(); scene.add(bases, labels, municipalityBorders, municipalityLabels);
        const terrain = new Map<string, THREE.MeshStandardMaterial>(), effects = new WarEffects(scene), debris = new ToyDebris(scene), casualties = new Set<string>();
        const reset = () => { const z = container.clientWidth < 680 ? -16 : 0; camera.zoom = 1; orbit.target.set(0, 0, z); camera.position.set(0, 78, 47 + z); camera.updateProjectionMatrix(); orbit.update(); };
        const draw = () => { renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera); };
        owned = { scene, renderer, camera, orbit, bases, labels, municipalityBorders, municipalityLabels, terrain, effects, debris, casualties, positions: new Map(), groups: new Map(), geographies: [], draw, reset, focus: (id, uf, cityId) => {
          const r = runtime.current; if (!r) return;
          const base = latest.current.bases.find(b => b.id === id), state = r.geographies.find(s => s.uf === (uf || base?.uf));
          const cityLabel = cityId ? r.municipalityLabels.children.find(label => label.userData.cityId === cityId) as THREE.Sprite | undefined : undefined;
          let p = cityLabel?.position.clone() ?? (id ? r.positions.get(id)?.clone() : undefined);
          if (cityLabel) camera.zoom = Math.min(42, Math.max(12, 22 / Math.max(cityLabel.scale.x, .5)));
          if (!p && state) { const b = stateBounds(state); p = new THREE.Vector3((b.minX + b.maxX) / 2, .7, (b.minZ + b.maxZ) / 2); camera.zoom = Math.min(24, 35 / Math.max(b.maxX - b.minX, b.maxZ - b.minZ)); }
          else if (p && !cityLabel) { const size = r.groups.get(id!)?.userData.size ?? 1; camera.zoom = Math.min(100, 22 / size); }
          if (!p) return;
          if (id && container.clientWidth < 680) p.z += 44 / camera.zoom;
          else if (id) p.x -= (camera.right - camera.left) / camera.zoom * Math.min(.25, 220 / container.clientWidth);
          orbit.target.copy(p); camera.position.copy(p).add(new THREE.Vector3(0, 78, 47)); camera.updateProjectionMatrix(); orbit.update(); draw();
        } };
        runtime.current = owned;
        const resize = () => { const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return; renderer.setSize(w, h); const half = w < 680 ? Math.max(46, 42 / (w / h)) : Math.max(33, 31 / (w / h)); camera.left = -half * w / h; camera.right = half * w / h; camera.top = half; camera.bottom = -half; if (camera.zoom === 1) reset(); camera.updateProjectionMatrix(); draw(); };
        observer = new ResizeObserver(resize); observer.observe(container); resize();
        const [response, municipalityResponse] = await Promise.all([fetch('/war-assets/brazil-states.json', { signal: abort.signal }), fetch('/war-assets/bahia-municipalities.json', { signal: abort.signal })]);
        if (!response.ok) throw Error('Não foi possível carregar os contornos do IBGE.');
        if (!municipalityResponse.ok) throw Error('Não foi possível carregar os municípios da Bahia.');
        const [raw, municipalities] = await Promise.all([response.json() as Promise<StateGeometry[]>, municipalityResponse.json() as Promise<MunicipalityGeometry[]>]); if (cancelled) return;
        if (raw.length !== 27) throw Error('A geografia precisa conter 27 unidades da federação.');
        if (municipalities.length !== 417 || new Set(municipalities.map(city => city.id)).size !== 417) throw Error('A Bahia precisa conter os 417 municípios do IBGE.');
        const geographies = raw.map(projectedState); owned.geographies = geographies;
        for (const state of geographies) {
          const shapes: THREE.Shape[] = [];
          for (const polygon of state.polygons) {
            const shape = new THREE.Shape(); polygon.forEach((ring, index) => { const path = index ? new THREE.Path() : shape; ring.forEach(([x, z], i) => { if (i) path.lineTo(x, -z); else path.moveTo(x, -z); }); path.closePath(); if (index) shape.holes.push(path); }); shapes.push(shape);
            const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(polygon[0].map(([x, z]) => new THREE.Vector3(x, .665, z))), new THREE.LineBasicMaterial({ color: '#71835a', transparent: true, opacity: .65 })); scene.add(line);
          }
          const geometry = new THREE.ExtrudeGeometry(shapes, { depth: .65, bevelEnabled: false, steps: 1 }); geometry.rotateX(-Math.PI / 2);
          const surface = new THREE.MeshStandardMaterial({ color: COLORS.neutral, roughness: 1, flatShading: true }), edge = new THREE.MeshStandardMaterial({ color: '#c6b887', roughness: 1 });
          const mesh = new THREE.Mesh(geometry, [surface, edge]); mesh.receiveShadow = true; mesh.userData.uf = state.uf; scene.add(mesh); terrain.set(state.uf, surface);
          const location = STATES.find(s => s.uf === state.uf)!; const p = project(location.lng, location.lat);
          const text = plaque(state.uf, '#fffdf0', ['DF', 'SE', 'AL', 'ES', 'RJ', 'RN', 'PB'].includes(state.uf) ? 2.0 : 2.9); text.position.set(p[0], .85, p[1]); text.userData.uf = state.uf; labels.add(text);
        }
        for (const city of municipalities) {
          for (const polygon of city.polygons) for (const ring of polygon) {
            const points = ring.map(([lng, lat]) => { const [x, z] = project(lng, lat); return new THREE.Vector3(x, .666, z); });
            municipalityBorders.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#71835a', transparent: true, opacity: .78 })));
          }
          const [x, z] = project(city.label[0], city.label[1]), labelWidth = Math.max(.5, city.labelSize, Math.min(2.4, city.name.length * .12)), text = plaque(city.name, '#334b43', labelWidth, true);
          text.position.set(x, .84, z); text.userData.cityId = city.id; text.userData.cityName = city.name; municipalityLabels.add(text);
        }
        // One instanced vegetation draw call, seeded and kept away from the coast.
        const treePositions: THREE.Vector3[] = []; let seed = 1337; const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        for (const s of geographies) { const b = stateBounds(s); for (let i = 0; i < 22; i++) { const x = b.minX + rand() * (b.maxX - b.minX), z = b.minZ + rand() * (b.maxZ - b.minZ); if (s.polygons.some(p => { let inside = false; for (let k = 0, j = p[0].length - 1; k < p[0].length; j = k++) { const a = p[0][k], c = p[0][j]; if ((a[1] > z) !== (c[1] > z) && x < (c[0] - a[0]) * (z - a[1]) / (c[1] - a[1]) + a[0]) inside = !inside; } return inside; })) treePositions.push(new THREE.Vector3(x, .92, z)); } }
        const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(.16, .55, 5), new THREE.MeshStandardMaterial({ color: '#6a9862', roughness: 1 }), treePositions.length), matrix = new THREE.Matrix4(); treePositions.forEach((p, i) => { matrix.makeTranslation(p.x, p.y, p.z); trees.setMatrixAt(i, matrix); }); scene.add(trees);
        const ray = new THREE.Raycaster(), start = new THREE.Vector2();
        const down = (event: PointerEvent) => start.set(event.clientX, event.clientY);
        const up = (event: PointerEvent) => { if (event.button !== 0 || Math.abs(start.x - event.clientX) + Math.abs(start.y - event.clientY) > 6) return; const rect = renderer.domElement.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera); for (const hit of ray.intersectObject(bases, true)) { let node: THREE.Object3D | null = hit.object; while (node) { if (node.userData.baseId) { latest.current.onBase(node.userData.baseId); return; } node = node.parent; } } for (const hit of ray.intersectObjects(scene.children, true)) if (hit.object.userData.uf) { latest.current.onState(hit.object.userData.uf); return; } };
        renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointerup', up); cleanup = () => { renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointerup', up); };
        let previous = 0; const frustum = new THREE.Frustum(), projection = new THREE.Matrix4(), bounds = new THREE.Sphere();
        const impacts: { source: string; target: string; at: number; index: number }[] = [];
        const ensureModels = (group: THREE.Group) => { if (group.userData.models.length) return; (group.userData.kinds as { kind: UnitKind }[]).forEach(unit => { const model = createUnit(unit.kind, group.userData.team), size = group.userData.size, slot = CAMP_SLOTS[unit.kind]; model.scale.setScalar(size * slot.scale); model.position.set(slot.x * size, CAMP_SURFACE_Y * size, slot.z * size); model.userData.visualKey = `${group.userData.baseId}:${unit.kind}`; model.userData.groundY = group.position.y + CAMP_SURFACE_Y * size; group.add(model); group.userData.models.push(model); }); };
        const animate = (time: number) => {
          if (cancelled) return; raf = requestAnimationFrame(animate); if (document.hidden || time - previous < 33) return;
          const dt = Math.min((time - previous) / 1000, .1); previous = time; const current = latest.current; if (current.suspended) return; let dirty = orbit.update();
          const activeBattle = current.battle;
          if (activeBattle && lastBattle.current !== activeBattle.id) { debris.clear(); casualties.clear(); fired.current.clear(); impacts.length = 0; lastBattle.current = activeBattle.id; dirty = true; }
          camera.updateMatrixWorld(); frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
          const visible = (object: THREE.Object3D, value: boolean) => { if (object.visible !== value) { object.visible = value; dirty = true; } };
          const showLabels = camera.zoom < 3.8; if (labels.visible !== showLabels) { labels.visible = showLabels; dirty = true; }
          const showMunicipalities = current.selectedUF === 'BA';
          visible(municipalityBorders, showMunicipalities && camera.zoom > 1.4);
          visible(municipalityLabels, showMunicipalities && camera.zoom >= 3.2);
          if (municipalityLabels.visible) {
            const rect = renderer.domElement.getBoundingClientRect(), occupied: { x: number; y: number; w: number; h: number }[] = [];
            const orderedLabels = [...municipalityLabels.children as THREE.Sprite[]].sort((a, b) => Number(b.userData.cityId === current.selectedMunicipality) - Number(a.userData.cityId === current.selectedMunicipality));
            for (const label of orderedLabels) {
              const point = label.position.clone().project(camera), x = (point.x + 1) * rect.width / 2, y = (1 - point.y) * rect.height / 2;
              const w = label.scale.x * camera.zoom * rect.width / (camera.right - camera.left), h = label.scale.y * camera.zoom * rect.height / (camera.top - camera.bottom);
              const inView = point.z >= -1 && point.z <= 1 && x + w / 2 > 0 && x - w / 2 < rect.width && y + h / 2 > 0 && y - h / 2 < rect.height;
              const overlaps = occupied.some(box => Math.abs(box.x - x) < (box.w + w) * .54 && Math.abs(box.y - y) < (box.h + h) * .6);
              const show = inView && (label.userData.cityId === current.selectedMunicipality || !overlaps);
              if (label.visible !== show) { label.visible = show; dirty = true; }
              if (show) occupied.push({ x, y, w, h });
            }
          }
          if (trees.visible !== (camera.zoom < 12)) { trees.visible = camera.zoom < 12; dirty = true; }
          for (const [id, group] of owned!.groups) {
            bounds.center.copy(group.position); bounds.radius = group.userData.size * 2; visible(group, frustum.intersectsSphere(bounds)); if (!group.visible) continue;
            const detail = camera.zoom > 2.5 || current.selected === id;
            if (detail && !group.userData.models.length) { ensureModels(group); dirty = true; }
            for (const decoration of group.userData.decorations as THREE.Object3D[]) visible(decoration, detail);
            group.userData.models.forEach((unit: THREE.Group) => { visible(unit, detail && !casualties.has(unit.userData.visualKey)); if (unit.visible) { animateUnit(unit, time / 1000, !!activeBattle); faceTeamBadge(unit, camera); } });
            visible(group.userData.marker, !detail); faceTeamBadge(group.userData.marker, camera); visible(group.userData.name, current.selected === id || camera.zoom > 9);
          }
          for (const child of bases.children) if (child.userData.street) visible(child, camera.zoom > 2.5);
          if (activeBattle) {
            activeBattle.events.forEach((event, index) => { if (event.at <= current.elapsed && !fired.current.has(index)) { fired.current.add(index); impacts.push({ source: event.source, target: event.target, at: event.at, index }); } });
          }
          for (let budget = 0; budget < 2 && impacts.length; budget++) {
            const event = impacts.shift()!, target = owned!.positions.get(event.target), source = owned!.positions.get(event.source); if (target && source) {
              effects.spawn(target.clone().add(new THREE.Vector3(0, .4, 0)), Math.max(.5, owned!.groups.get(event.target)?.userData.size || 1));
              const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([source.clone().add(new THREE.Vector3(0, .25, 0)), source.clone().lerp(target, .5).add(new THREE.Vector3(0, 4, 0)), target.clone().add(new THREE.Vector3(0, .2, 0))]), new THREE.LineBasicMaterial({ color: '#ffe5a0', transparent: true, opacity: .8 })); line.userData.ttl = .6; scene.add(line);
              const group = owned!.groups.get(event.target);
              if (group && event.at > 40) { ensureModels(group); const survivors = (group.userData.models as THREE.Group[]).filter(unit => !casualties.has(unit.userData.visualKey)); const victim = survivors[event.index % Math.max(1, survivors.length)]; if (victim && debris.shatter(victim, event.index * 7919 + (activeBattle?.seed ?? 0))) { casualties.add(victim.userData.visualKey); dirty = true; renderer.shadowMap.needsUpdate = true; } }
            }
          }
          for (const object of [...scene.children]) if (object.userData.ttl !== undefined) { object.userData.ttl -= dt; if (object.userData.ttl <= 0) { scene.remove(object); disposeTree(object); } }
          debris.setDetail(camera.zoom > 2.5, frustum); const changedDebris = debris.update(dt);
          const hadEffects = effects.activeCount > 0; effects.update(dt); if (dirty || activeBattle || current.selected || hadEffects || changedDebris) { renderer.render(scene, camera); renderer.domElement.dataset.drawCalls = String(renderer.info.render.calls); renderer.domElement.dataset.wreckCount = String(debris.count); }
        };
        setReady(true); draw(); raf = requestAnimationFrame(animate);
      } catch (error) { if (!cancelled) setFailure(error instanceof Error ? error.message : 'Falha ao iniciar o 3D.'); }
    };
    void boot();
    return () => { cancelled = true; abort.abort(); cancelAnimationFrame(raf); observer?.disconnect(); cleanup(); if (owned) { owned.debris.dispose(); owned.effects.dispose(); owned.orbit.dispose(); disposeTree(owned.scene); owned.renderer.dispose(); owned.renderer.domElement.remove(); } runtime.current = null; };
  }, []);
  useEffect(() => {
    const r = runtime.current; if (!r || !ready) return;
    for (const child of [...r.bases.children]) { r.bases.remove(child); disposeTree(child); } r.positions.clear(); r.groups.clear();
    for (const state of r.geographies) {
      const members = props.bases.filter(b => b.uf === state.uf); if (!members.length) continue;
      const lots = baseLots(state, members.length), streets = new Set<string>();
      members.forEach((base, i) => {
        const lot = lots[i], size = Math.min(lot.size, 2.3), halfStep = lot.spacing / 2;
        for (const x of [lot.x - halfStep, lot.x + halfStep]) streets.add(`z:${x}`); for (const z of [lot.z - halfStep, lot.z + halfStep]) streets.add(`x:${z}`);
        const group = new THREE.Group(); group.position.set(lot.x, .68, lot.z); group.userData = { baseId: base.id, size, team: base.team, models: [], kinds: CATALOG.filter(u => base.inventory[u.kind] > 0) }; r.positions.set(base.id, group.position.clone());
        const camp = createBaseCamp(base.team, size); group.add(camp); group.userData.decorations = [camp];
        const marker = createTeamBadge(base.team); marker.scale.setScalar(1.8); marker.position.y = Math.max(.5, size * .8); group.add(marker); group.userData.marker = marker;
        const name = plaque(`@${base.username}`, '#263d43', Math.max(size * 1.05, .08), true); name.position.set(0, size * .18, size * .86); name.visible = false; group.add(name); group.userData.name = name;
        r.bases.add(group); r.groups.set(base.id, group);
      });
      for (const street of streets) { const [axis, raw] = street.split(':'); for (const [a, b] of clippedStreet(state, axis as 'x' | 'z', Number(raw))) { const length = Math.hypot(b[0] - a[0], b[1] - a[1]), width = Math.min(lots[0].size * .13, .11); const road = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? length : width, .012, axis === 'x' ? width : length), new THREE.MeshStandardMaterial({ color: '#d6d0af', roughness: 1 })); road.position.set((a[0] + b[0]) / 2, .666, (a[1] + b[1]) / 2); road.receiveShadow = true; road.userData.street = true; r.bases.add(road); } }
    }
    r.draw();
  }, [props.bases, ready]);
  useEffect(() => { const r = runtime.current; if (!r || !ready) return; for (const [uf, material] of r.terrain) material.color.set(COLORS[props.controls[uf] || 'neutral']); r.draw(); }, [props.controls, ready]);
  useEffect(() => { const r = runtime.current, command = props.command; if (!r || !ready || !command) return; if (command.action === 'reset') r.reset(); else if (command.action === 'rebuild') { r.debris.clear(); r.casualties.clear(); } else if (command.action === 'focus-city') r.focus(undefined, command.uf, command.cityId); else if (command.action === 'focus') r.focus(command.baseId, command.uf); else if (command.action === 'rotate') { const p = r.camera.position.clone().sub(r.orbit.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6); r.camera.position.copy(r.orbit.target).add(p); r.orbit.update(); } else { r.camera.zoom = THREE.MathUtils.clamp(r.camera.zoom * (command.action === 'in' ? 1.5 : 1 / 1.5), .6, 110); r.camera.updateProjectionMatrix(); r.orbit.update(); } r.draw(); }, [props.command, ready]);
  return <div ref={host} className="war-world">{!ready && !failure && <div className="war-loading"><span className="loader" /><strong>Preparando o campo…</strong><small>27 territórios. Um Brasil em miniatura.</small></div>}{failure && <div className="war-loading"><strong>O cenário 3D não abriu</strong><p>{failure}</p><p>Confira se o navegador tem WebGL 2 ativado.</p></div>}</div>;
}
