"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Box, ChevronLeft, CircleHelp, Download, Grid2X2, Minus, MousePointer2, Plus, RotateCw, Save, Trash2, Undo2 } from "lucide-react";
import styles from "./planner.module.css";

type Kind = "cabinet" | "upper" | "pantry" | "counter" | "stove" | "hood" | "fridge" | "microwave" | "dishwasher" | "washer" | "table" | "chair" | "shelf" | "sink" | "sewing" | "trash" | "plant";
type Item = { id: string; kind: Kind; x: number; z: number; rot: number; label: string };
type Wall = "north" | "south" | "east" | "west";
const WIDTH = 4, DEPTH = 6, SNAP = .25;
const labels: Record<Kind, string> = { cabinet: "Armário baixo", upper: "Armário aéreo", pantry: "Despenseiro", counter: "Balcão central", stove: "Fogão", hood: "Coifa", fridge: "Geladeira", microwave: "Micro-ondas", dishwasher: "Lava-louças", washer: "Máquina de lavar", table: "Mesa", chair: "Cadeira", shelf: "Prateleira", sink: "Pia", sewing: "Máquina de costura", trash: "Lixeira", plant: "Planta" };
const sizes: Record<Kind, [number, number, number]> = { cabinet: [1.15, .92, .52], upper: [1.15, .72, .4], pantry: [.72, 2.05, .62], counter: [1.45, .92, .72], stove: [.72, .9, .62], hood: [.8, .55, .52], fridge: [.76, 1.85, .72], microwave: [.56, .34, .4], dishwasher: [.6, .86, .58], washer: [.66, .9, .66], table: [1.65, .78, .9], chair: [.46, .9, .46], shelf: [1.05, 1.7, .32], sink: [.8, .9, .58], sewing: [.75, .72, .42], trash: [.38, .62, .38], plant: [.36, .82, .36] };
const defaults: Item[] = [
  { id: "a", kind: "cabinet", x: -1.28, z: -2.55, rot: 0, label: "Armário alto" },
  { id: "b", kind: "cabinet", x: -.12, z: -2.55, rot: 0, label: "Balcão" },
  { id: "k", kind: "upper", x: -.7, z: -2.58, rot: 0, label: "Armário aéreo" },
  { id: "c", kind: "sink", x: .96, z: -2.55, rot: 0, label: "Pia" },
  { id: "l", kind: "microwave", x: .6, z: -2.55, rot: 0, label: "Micro-ondas" },
  { id: "d", kind: "stove", x: 1.55, z: -1.72, rot: 0, label: "Fogão" },
  { id: "m", kind: "hood", x: 1.55, z: -1.72, rot: 0, label: "Coifa" },
  { id: "e", kind: "fridge", x: -1.52, z: -1.75, rot: 0, label: "Geladeira" },
  { id: "f", kind: "table", x: 0, z: .15, rot: 0, label: "Mesa de trabalho" },
  { id: "g", kind: "chair", x: -1.13, z: .1, rot: Math.PI / 2, label: "Cadeira" },
  { id: "h", kind: "chair", x: 1.12, z: .1, rot: -Math.PI / 2, label: "Cadeira" },
  { id: "i", kind: "sewing", x: 0, z: .1, rot: 0, label: "Máquina de costura" },
  { id: "j", kind: "shelf", x: 1.52, z: 2.35, rot: Math.PI / 2, label: "Estante" },
];
const color: Record<Kind, string> = { cabinet: "#b98350", upper: "#c49a71", pantry: "#ad8058", counter: "#a8754b", stove: "#343b3e", hood: "#6d7776", fridge: "#c5c9c6", microwave: "#596264", dishwasher: "#aeb9b7", washer: "#c4ccca", table: "#9c643f", chair: "#8c634d", shelf: "#785943", sink: "#b98350", sewing: "#87999a", trash: "#343b3e", plant: "#73906b" };

function material(hex: string, roughness = .75) { return new THREE.MeshStandardMaterial({ color: hex, roughness }); }
function box(parent: THREE.Group, name: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, hex: string, rough = .75) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material(hex, rough)); mesh.name = name; mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function buildItem(item: Item) {
  const root = new THREE.Group(); root.name = item.id; root.userData.baseY = item.kind === "upper" || item.kind === "microwave" || item.kind === "hood" ? 1.35 : .14; root.position.set(item.x, root.userData.baseY, item.z); root.rotation.y = item.rot; root.userData.itemId = item.id;
  const [w, h, d] = sizes[item.kind], wood = color[item.kind];
  if (item.kind === "chair") {
    box(root, "assento", 0, .48, 0, w, .1, d, wood); box(root, "encosto", 0, .82, -.17, w, .68, .09, wood);
    for (const x of [-w * .4, w * .4]) for (const z of [-d * .37, d * .37]) box(root, "pé", x, .23, z, .055, .46, .055, "#755039");
  } else if (item.kind === "table") {
    box(root, "tampo", 0, h - .1, 0, w, .12, d, wood);
    for (const x of [-w * .43, w * .43]) for (const z of [-d * .38, d * .38]) box(root, "pé", x, (h - .18) / 2, z, .08, h - .18, .08, "#765039");
  } else if (item.kind === "shelf") {
    box(root, "estrutura", 0, h / 2, 0, w, h, d, "#755841");
    for (const y of [.18, .58, .98, 1.38]) box(root, "prateleira", 0, y, d / 2 + .025, w - .1, .045, .08, "#c09a70");
  } else if (item.kind === "pantry") {
    box(root, "corpo", 0, h / 2, 0, w, h, d, "#9d7757");
    box(root, "porta", -w * .24, h / 2, d / 2 + .012, w * .46, h - .12, .025, "#c29870"); box(root, "porta", w * .24, h / 2, d / 2 + .012, w * .46, h - .12, .025, "#ba8d64");
    box(root, "puxador", -.035, h / 2, d / 2 + .035, .025, .28, .025, "#45413a", .35); box(root, "puxador", .035, h / 2, d / 2 + .035, .025, .28, .025, "#45413a", .35);
  } else if (item.kind === "fridge") {
    box(root, "corpo", 0, h / 2, 0, w, h, d, "#d9dcda", .28); box(root, "porta", 0, h / 2, d / 2 + .012, w - .07, h - .08, .025, "#bec5c4", .25); box(root, "puxador", w * .34, h * .55, d / 2 + .04, .035, .36, .04, "#687274", .35);
  } else if (item.kind === "microwave") {
    box(root, "corpo", 0, h / 2, 0, w, h, d, "#3e4647", .35); box(root, "porta", -.04, h * .53, d / 2 + .012, w * .67, h * .68, .018, "#252b2c", .28); box(root, "visor", -.04, h * .53, d / 2 + .025, w * .58, h * .53, .01, "#51615d", .22); box(root, "painel", w * .38, h * .52, d / 2 + .02, .08, h * .78, .02, "#aeb5b1", .35);
  } else if (item.kind === "washer" || item.kind === "dishwasher") {
    box(root, "corpo", 0, h / 2, 0, w, h, d, item.kind === "washer" ? "#d6dbd8" : "#b6bfbb", .3);
    if (item.kind === "washer") { const ring = new THREE.Mesh(new THREE.TorusGeometry(.22, .035, 8, 24), material("#75817e", .3)); ring.position.set(0, .48, d / 2 + .012); root.add(ring); const glass = new THREE.Mesh(new THREE.CircleGeometry(.185, 24), material("#536663", .25)); glass.position.set(0, .48, d / 2 + .018); root.add(glass); box(root, "painel", 0, .81, d / 2 + .01, w * .8, .11, .02, "#969f9b", .35); }
    else { box(root, "painel", 0, .72, d / 2 + .01, w * .82, .13, .025, "#77817e", .35); box(root, "puxador", 0, .78, d / 2 + .03, w * .45, .025, .025, "#e0e2df", .28); }
  } else if (item.kind === "stove") {
    box(root, "forno", 0, h / 2, 0, w, h, d, "#373c3e", .35); box(root, "mesa", 0, h + .025, 0, w + .04, .05, d + .04, "#24292b", .3);
    for (const x of [-.2, .2]) for (const z of [-.18, .18]) { const burner = new THREE.Mesh(new THREE.CylinderGeometry(.105, .105, .025, 12), material("#111718", .4)); burner.position.set(x, h + .06, z); root.add(burner); }
  } else if (item.kind === "sewing") {
    box(root, "base", 0, .36, 0, w, .12, d, "#a2aaa6"); box(root, "máquina", 0, .61, 0, w * .72, .4, d * .68, "#c4ceca"); box(root, "braço", .08, .84, .05, w * .45, .08, d * .45, "#d7dedb");
  } else if (item.kind === "trash") {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(w * .42, w * .34, h, 16), material("#343b3e", .45)); can.position.y = h / 2; can.castShadow = true; root.add(can); const lid = new THREE.Mesh(new THREE.CylinderGeometry(w * .44, w * .44, .055, 16), material("#202728", .35)); lid.position.y = h + .025; root.add(lid);
  } else if (item.kind === "plant") {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(.16, .12, .24, 12), material("#b87956")); pot.position.y = .12; pot.castShadow = true; root.add(pot);
    for (let i = 0; i < 5; i++) { const leaf = new THREE.Mesh(new THREE.ConeGeometry(.09, .44, 6), material(i % 2 ? "#729064" : "#8ba77a")); const angle = i * Math.PI * .4; leaf.position.set(Math.cos(angle) * .12, .43 + (i % 2) * .1, Math.sin(angle) * .12); leaf.rotation.z = Math.cos(angle) * .35; leaf.rotation.x = Math.sin(angle) * .35; leaf.castShadow = true; root.add(leaf); }
  } else if (item.kind === "hood") {
    box(root, "chaminé", 0, h * .79, -.04, .28, h * .42, .27, "#8a9491", .35); box(root, "corpo", 0, h * .37, .03, w, .16, d, "#aeb8b5", .32); box(root, "filtro", 0, h * .19, .03, w * .72, .06, d * .68, "#78827f", .45);
  } else {
    const isSink = item.kind === "sink";
    box(root, "corpo", 0, h / 2, 0, w, h - .1, d, wood);
    box(root, "tampo", 0, h - .08, 0, w + .07, .16, d + .07, isSink ? "#4d5656" : "#e2dcd1", .38);
    if (isSink) { box(root, "cuba", 0, h + .007, 0, .46, .012, .33, "#20292a", .3); box(root, "torneira", -.23, h + .13, -.06, .035, .24, .035, "#aeb8b5", .25); }
    for (const x of [-w * .25, w * .25]) { box(root, "porta", x, .43, d / 2 + .01, w * .43, .58, .018, item.kind === "cabinet" || item.kind === "counter" ? "#c28c5a" : "#b17d50"); box(root, "puxador", x + w * .13, .48, d / 2 + .035, .025, .13, .025, "#393938", .35); }
  }
  root.traverse((child) => { if (child instanceof THREE.Mesh) { child.userData.itemId = item.id; } });
  return root;
}

export default function KitchenPlanner() {
  const host = useRef<HTMLDivElement>(null), sceneRef = useRef<THREE.Scene | null>(null), cameraRef = useRef<THREE.PerspectiveCamera | null>(null), controlsRef = useRef<OrbitControls | null>(null), itemsRef = useRef<Item[]>(defaults), groupRef = useRef<THREE.Group | null>(null), shadowRef = useRef<THREE.LightShadow | null>(null), rayRef = useRef(new THREE.Raycaster()), planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)), draggingRef = useRef<string | null>(null), invalidateRef = useRef<() => void>(() => {});
  const [items, setItems] = useState<Item[]>(defaults), [selected, setSelected] = useState("f"), [walls, setWalls] = useState<Wall[]>(["north", "south", "east", "west"]), [status, setStatus] = useState("Projeto salvo neste navegador"), [grid, setGrid] = useState(true), [tab, setTab] = useState<"objetos" | "paredes">("objetos");
  const sync = useCallback((next: Item[]) => { itemsRef.current = next; setItems(next); const group = groupRef.current; if (!group) return; group.traverse(child => { if (child instanceof THREE.Mesh) { child.geometry.dispose(); const mats = Array.isArray(child.material) ? child.material : [child.material]; for (const mat of mats) mat.dispose(); } }); group.clear(); for (const item of next) group.add(buildItem(item)); if (shadowRef.current) shadowRef.current.needsUpdate = true; invalidateRef.current(); }, []);
  useEffect(() => {
    if (!host.current) return; const container = host.current, scene = new THREE.Scene(); scene.background = new THREE.Color("#eee9df"); scene.fog = new THREE.Fog("#eee9df", 13, 25); sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(43, container.clientWidth / container.clientHeight, .1, 100); camera.position.set(7.5, 8.4, 8.8); cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio <= 1.5, alpha: false, powerPreference: "high-performance" }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18; container.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, .7, 0); controls.enableDamping = true; controls.dampingFactor = .09; controls.rotateSpeed = .72; controls.zoomSpeed = .8; controls.panSpeed = .8; controls.maxPolarAngle = Math.PI * .48; controls.minDistance = 4.2; controls.maxDistance = 16; controlsRef.current = controls;
    scene.add(new THREE.HemisphereLight(0xfff7e9, 0x828b82, 2)); const sun = new THREE.DirectionalLight(0xffedce, 3.2); sun.position.set(-4, 9, 4); sun.castShadow = true; sun.shadow.mapSize.set(768, 768); sun.shadow.camera.left = -5; sun.shadow.camera.right = 5; sun.shadow.camera.top = 7; sun.shadow.camera.bottom = -7; sun.shadow.camera.near = .5; sun.shadow.camera.far = 20; sun.shadow.radius = 3; sun.shadow.needsUpdate = true; shadowRef.current = sun.shadow; scene.add(sun);
    const room = new THREE.Group(); scene.add(room);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH, DEPTH), new THREE.MeshStandardMaterial({ color: "#ddd3c1", roughness: .9 })); floor.rotation.x = -Math.PI / 2; floor.position.y = .005; floor.receiveShadow = true; floor.name = "floor"; room.add(floor);
    const tile = new THREE.Group(); tile.name = "grid";
    const gridMaterial = new THREE.LineBasicMaterial({ color: "#bdb5a8", transparent: true, opacity: .66 });
    for (let x = -WIDTH / 2; x <= WIDTH / 2 + .001; x += SNAP) { const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, .155, -DEPTH / 2), new THREE.Vector3(x, .155, DEPTH / 2)]), gridMaterial); tile.add(line); }
    for (let z = -DEPTH / 2; z <= DEPTH / 2 + .001; z += SNAP) { const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-WIDTH / 2, .155, z), new THREE.Vector3(WIDTH / 2, .155, z)]), gridMaterial); tile.add(line); }
    room.add(tile);
    const base = new THREE.Mesh(new THREE.BoxGeometry(WIDTH + .12, .13, DEPTH + .12), material("#b4a58e")); base.position.y = .065; base.receiveShadow = true; room.add(base); floor.position.y = .14;
    const furniture = new THREE.Group(); groupRef.current = furniture; room.add(furniture);
    const wallGroup = new THREE.Group(); wallGroup.name = "walls"; room.add(wallGroup);
    let raf = 0;
    const invalidate = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; controls.update(); renderer.render(scene, camera); }); };
    invalidateRef.current = invalidate;
    controls.addEventListener("change", invalidate);
    renderer.domElement.addEventListener("wheel", invalidate, { passive: true });
    const resize = () => { if (!container.clientWidth) return; camera.aspect = container.clientWidth / container.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(container.clientWidth, container.clientHeight); invalidate(); };
    const observer = new ResizeObserver(resize); observer.observe(container); resize(); sync(itemsRef.current);
    const pointer = (event: PointerEvent) => {
      if (event.type === "pointermove" && !draggingRef.current) { invalidate(); return; }
      const rect = renderer.domElement.getBoundingClientRect(), mouse = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1); rayRef.current.setFromCamera(mouse, camera);
      if (event.type === "pointerdown") { const hits = rayRef.current.intersectObjects(furniture.children, true), id = hits[0]?.object.userData.itemId as string | undefined; if (id) { draggingRef.current = id; controls.enabled = false; setSelected(id); renderer.domElement.setPointerCapture(event.pointerId); } }
      if (event.type === "pointermove" && draggingRef.current) { const p = new THREE.Vector3(); if (rayRef.current.ray.intersectPlane(planeRef.current, p)) { const id = draggingRef.current; const x = THREE.MathUtils.clamp(Math.round(p.x / SNAP) * SNAP, -WIDTH / 2 + .3, WIDTH / 2 - .3), z = THREE.MathUtils.clamp(Math.round(p.z / SNAP) * SNAP, -DEPTH / 2 + .3, DEPTH / 2 - .3); itemsRef.current = itemsRef.current.map(item => item.id === id ? { ...item, x, z } : item); const obj = furniture.getObjectByName(id); if (obj) { obj.position.set(x, obj.userData.baseY as number, z); invalidate(); } } }
      if (event.type === "pointerup") { if (draggingRef.current) { setItems(itemsRef.current); sun.shadow.needsUpdate = true; } draggingRef.current = null; controls.enabled = true; invalidate(); }
    };
    renderer.domElement.addEventListener("pointerdown", pointer); renderer.domElement.addEventListener("pointermove", pointer); renderer.domElement.addEventListener("pointerup", pointer); renderer.domElement.addEventListener("pointercancel", pointer);
    return () => { cancelAnimationFrame(raf); invalidateRef.current = () => {}; shadowRef.current = null; observer.disconnect(); controls.removeEventListener("change", invalidate); controls.dispose(); scene.traverse(child => { if (child instanceof THREE.Mesh || child instanceof THREE.Line) { child.geometry.dispose(); const mats = Array.isArray(child.material) ? child.material : [child.material]; for (const mat of mats) mat.dispose(); } }); sun.shadow.dispose(); renderer.dispose(); renderer.domElement.removeEventListener("pointerdown", pointer); renderer.domElement.removeEventListener("pointermove", pointer); renderer.domElement.removeEventListener("pointerup", pointer); renderer.domElement.removeEventListener("pointercancel", pointer); renderer.domElement.removeEventListener("wheel", invalidate); container.removeChild(renderer.domElement); };
  }, [sync]);
  useEffect(() => { const group = groupRef.current; if (!group) return; for (const object of group.children) object.traverse(child => { if (child instanceof THREE.Mesh) { const mat = child.material as THREE.MeshStandardMaterial; mat.emissive.set(object.name === selected ? "#bb7832" : "#000000"); mat.emissiveIntensity = object.name === selected ? .17 : 0; } }); invalidateRef.current(); }, [selected, items]);
  useEffect(() => { const group = sceneRef.current?.getObjectByName("walls"); if (group) { group.traverse(child => { if (child instanceof THREE.Mesh) { child.geometry.dispose(); const mats = Array.isArray(child.material) ? child.material : [child.material]; for (const mat of mats) mat.dispose(); } }); group.clear(); for (const side of walls) { const along = side === "north" || side === "south", length = along ? WIDTH : DEPTH, x = side === "west" ? -WIDTH / 2 : side === "east" ? WIDTH / 2 : 0, z = side === "north" ? -DEPTH / 2 : side === "south" ? DEPTH / 2 : 0; const m = new THREE.Mesh(new THREE.BoxGeometry(along ? length : .1, 2.65, along ? .1 : length), material("#f4f0e7")); m.position.set(x, 1.46, z); m.castShadow = true; group.add(m); const trim = new THREE.Mesh(new THREE.BoxGeometry(along ? length : .13, .14, along ? .13 : length), material("#d8c5a8")); trim.position.set(x, .28, z); group.add(trim); } } if (shadowRef.current) shadowRef.current.needsUpdate = true; invalidateRef.current(); }, [walls]);
  useEffect(() => { const g = sceneRef.current?.getObjectByName("grid"); if (g) g.visible = grid; invalidateRef.current(); }, [grid]);
  const updateItem = (id: string, fn: (item: Item) => Item) => sync(itemsRef.current.map(item => item.id === id ? fn(item) : item));
  const addItem = (kind: Kind) => { const id = crypto.randomUUID(), [w, , d] = sizes[kind], xStart = -WIDTH / 2 + w / 2, zStart = -DEPTH / 2 + d / 2, xSteps = Math.floor((WIDTH - w) / SNAP), zSteps = Math.floor((DEPTH - d) / SNAP); let x = 0, z = 0, found = false; for (let zi = 0; zi <= zSteps && !found; zi++) for (let xi = 0; xi <= xSteps && !found; xi++) { const candidateX = xStart + xi * SNAP, candidateZ = zStart + zi * SNAP; if (itemsRef.current.every(other => { const [ow0, , od0] = sizes[other.kind], quarterTurn = Math.abs(Math.sin(other.rot)) > .5, ow = quarterTurn ? od0 : ow0, od = quarterTurn ? ow0 : od0; return Math.abs(candidateX - other.x) >= (w + ow) * .5 + .08 || Math.abs(candidateZ - other.z) >= (d + od) * .5 + .08; })) { x = candidateX; z = candidateZ; found = true; } } if (!found) { setStatus("Sem espaço livre: mova uma peça para liberar lugar"); return; } const item = { id, kind, x, z, rot: 0, label: labels[kind] }; setSelected(id); sync([...itemsRef.current, item]); };
  const remove = () => { const next = itemsRef.current.filter(item => item.id !== selected); setSelected(next.at(-1)?.id ?? ""); sync(next); };
  const save = () => { localStorage.setItem("cozinha-4x6-planta", JSON.stringify({ items: itemsRef.current, walls })); setStatus("Planta salva neste navegador"); };
  const load = () => { try { const data = JSON.parse(localStorage.getItem("cozinha-4x6-planta") ?? "null"); if (data?.items) { sync(data.items); setWalls(data.walls ?? []); setStatus("Planta carregada"); } else setStatus("Ainda não há um salvamento"); } catch { setStatus("Não foi possível abrir o salvamento"); } };
  const exportPlan = () => { const blob = new Blob([JSON.stringify({ version: 1, room: { width: WIDTH, depth: DEPTH }, items, walls }, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "minha-cozinha-4x6.json"; a.click(); URL.revokeObjectURL(a.href); setStatus("Arquivo da planta baixado"); };
  const selectedItem = items.find(item => item.id === selected);
  const toggleWall = (side: Wall) => setWalls(current => current.includes(side) ? current.filter(w => w !== side) : [...current, side]);
  const zoomCamera = (factor: number) => { const camera = cameraRef.current, controls = controlsRef.current; if (!camera || !controls) return; const offset = camera.position.clone().sub(controls.target).multiplyScalar(factor); const distance = THREE.MathUtils.clamp(offset.length(), controls.minDistance, controls.maxDistance); camera.position.copy(controls.target).add(offset.setLength(distance)); controls.update(); invalidateRef.current(); };
  const resetCamera = () => { if (cameraRef.current && controlsRef.current) { cameraRef.current.position.set(7.5, 8.4, 8.8); controlsRef.current.target.set(0, .7, 0); controlsRef.current.update(); invalidateRef.current(); } };
  return <main className={styles.app}>
    <header className={styles.top}><a className={styles.back} href="/"><ChevronLeft size={17}/><span>Voltar</span></a><div className={styles.brand}><span className={styles.brandIcon}><Box size={18}/></span><div><strong>PLANTA 3D</strong><small>COZINHA DA CASA</small></div></div><div className={styles.dimensions}><span className={styles.liveDot}/><strong>4,0 × 6,0 m</strong><i/> <span>24 m²</span></div><div className={styles.topActions}><button onClick={load} title="Abrir último salvamento"><Undo2 size={16}/><span>Abrir</span></button><button onClick={save} title="Salvar no navegador"><Save size={16}/><span>Salvar</span></button><button className={styles.export} onClick={exportPlan}><Download size={16}/><span>Exportar planta</span></button></div></header>
    <section className={styles.workspace}>
      <aside className={styles.panel}>
        <div className={styles.panelHead}><div><span className={styles.eyebrow}>MODO DE EDIÇÃO</span><h1>Monte sua cozinha</h1></div><button className={styles.help} title="Arraste móveis para mover; botão direito ou arraste o fundo para girar a câmera"><CircleHelp size={17}/></button></div>
        <div className={styles.tabs}><button className={tab === "objetos" ? styles.active : ""} onClick={() => setTab("objetos")}><Box size={15}/> Objetos</button><button className={tab === "paredes" ? styles.active : ""} onClick={() => setTab("paredes")}><Grid2X2 size={15}/> Paredes</button></div>
        {tab === "objetos" ? <><div className={styles.sectionTitle}><span>ADICIONAR PEÇAS</span><small>{Object.keys(labels).length} modelos</small></div><div className={styles.catalog}>{(Object.keys(labels) as Kind[]).map(kind => <button key={kind} className={styles.catalogItem} onClick={() => addItem(kind)}><span className={styles.swatch} style={{ background: color[kind] }}><Box size={16}/></span><span>{labels[kind]}</span><Plus size={15}/></button>)}</div>
          <div className={styles.sectionTitle}><span>NA SUA PLANTA</span><small>{items.length} itens</small></div><div className={styles.objectList}>{items.map((item) => <button key={item.id} className={`${styles.objectRow} ${selected === item.id ? styles.selectedRow : ""}`} onClick={() => setSelected(item.id)}><span className={styles.objectDot} style={{ background: color[item.kind] }}/><span className={styles.objectName}>{item.label}</span><span className={styles.objectType}>{labels[item.kind]}</span></button>)}</div>
          {selectedItem && <div className={styles.selection}><div className={styles.selectionHead}><div><span className={styles.eyebrow}>ITEM SELECIONADO</span><strong>{selectedItem.label}</strong></div><button onClick={remove} title="Excluir móvel"><Trash2 size={16}/></button></div><div className={styles.transform}><span><MousePointer2 size={14}/> Posição encaixada na grade</span><button onClick={() => updateItem(selected, item => ({ ...item, rot: item.rot + Math.PI / 2 }))}><RotateCw size={15}/> Girar 90°</button></div></div>}
        </> : <><div className={styles.sectionTitle}><span>SEGMENTOS DE PAREDE</span><small>clique para alternar</small></div><p className={styles.wallHelp}>As paredes podem ser retiradas para abrir a vista da planta. Cada lado pode ser ligado ou desligado.</p><div className={styles.wallList}>{(["north", "east", "south", "west"] as Wall[]).map((side, i) => <button key={side} className={styles.wallRow} onClick={() => toggleWall(side)}><span className={`${styles.wallGlyph} ${walls.includes(side) ? styles.wallOn : ""}`}/><span>{["Norte · 4 m", "Leste · 6 m", "Sul · 4 m", "Oeste · 6 m"][i]}</span><span className={`${styles.switch} ${walls.includes(side) ? styles.switchOn : ""}`}><i/></span></button>)}</div><div className={styles.wallNote}>Paredes com acabamento claro · altura 2,65 m</div></>}
        <div className={styles.panelFoot}><span className={styles.statusDot}/><span>{status}</span></div>
      </aside>
      <section className={styles.viewport}><div className={styles.viewLabel}><span className={styles.viewIcon}><Grid2X2 size={15}/></span><div><strong>VISÃO 3D</strong><small>Arraste os móveis para posicionar</small></div></div><div ref={host} className={styles.canvas}/><div className={styles.hint}><MousePointer2 size={14}/><span>Arraste para mover</span><i/> <span>Botão direito para girar a câmera</span></div><div className={styles.camera}><button onClick={() => zoomCamera(.84)} title="Aproximar"><Plus size={17}/></button><button onClick={() => zoomCamera(1.19)} title="Afastar"><Minus size={17}/></button><button onClick={resetCamera} title="Centralizar"><Undo2 size={16}/></button></div><button className={`${styles.gridToggle} ${grid ? styles.gridEnabled : ""}`} onClick={() => setGrid(v => !v)}><Grid2X2 size={15}/><span>Grade de encaixe</span><span className={`${styles.switch} ${grid ? styles.switchOn : ""}`}><i/></span></button><div className={styles.scale}><span>0</span><i/><span>1 m</span></div></section>
    </section><footer className={styles.footer}><span><strong>PLANTA 01</strong><i/> Cozinha</span><span>24 m² <i/> Grade 25 cm <i/> Altura das paredes 2,65 m</span><span className={styles.footerEnd}>Rascunho local</span></footer>
  </main>;
}
