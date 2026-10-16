import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createTeamBadge } from './team-badges.ts';

export type UnitKind = 'infantry' | 'tank' | 'artillery' | 'drone' | 'aircraft';
export type Team = 'red' | 'blue';

export const UNIT_MODELS: { kind: UnitKind; name: string; description: string }[] = [
  { kind: 'infantry', name: 'Infantaria', description: 'Soldado de miniatura, com capacete, mochila e braços articulados.' },
  { kind: 'tank', name: 'Tanque', description: 'Blindado de esteiras com torre giratória, escotilha e rodas de apoio.' },
  { kind: 'artillery', name: 'Artilharia', description: 'Canhão de campanha com escudo, recuo e estabilizadores.' },
  { kind: 'drone', name: 'Drone', description: 'Quadricóptero com câmera suspensa, quatro hélices e trem de pouso.' },
  { kind: 'aircraft', name: 'Avião', description: 'Avião de apoio com asas largas, hélice e acabamento de brinquedo.' },
];

type Shade = 'team' | 'light' | 'dark' | 'metal' | 'rubber' | 'cream' | 'glass' | 'gold' | 'skin';
type Palette = Record<Shade, THREE.MeshStandardMaterial>;

/** Each model owns its palette. Meshes within that model share materials. */
function palette(team: Team): Palette {
  const colors = {
    team: team === 'red' ? '#e35449' : '#4389db',
    light: team === 'red' ? '#ff8570' : '#83bcf6',
    dark: team === 'red' ? '#923e3f' : '#315c91',
    metal: '#586c74', rubber: '#283940', cream: '#fff0cf', glass: '#9ee0e4', gold: '#f7cf69', skin: '#e5b78a',
  };
  return Object.fromEntries(Object.entries(colors).map(([key, color]) => [key, new THREE.MeshStandardMaterial({
    color, roughness: key === 'glass' ? 0.25 : 0.72, metalness: key === 'metal' ? 0.38 : 0,
    flatShading: true,
  })])) as Palette;
}

/** Batch static geometry per colour inside each articulated subassembly. */
class Parts {
  private parts = new Map<Shade, THREE.BufferGeometry[]>();
  private materials: Palette;
  private target: THREE.Group;
  constructor(materials: Palette, target: THREE.Group) { this.materials = materials; this.target = target; }

  add(geometry: THREE.BufferGeometry, shade: Shade, x = 0, y = 0, z = 0, rotation?: THREE.Euler) {
    geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(rotation ?? new THREE.Euler()), new THREE.Vector3(1, 1, 1)));
    const normalized = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    geometry.dispose();
    normalized.deleteAttribute('uv');
    if (!normalized.hasAttribute('normal')) normalized.computeVertexNormals();
    const list = this.parts.get(shade) ?? [];
    list.push(normalized);
    this.parts.set(shade, list);
  }

  box(w: number, h: number, d: number, shade: Shade, x: number, y: number, z: number, turn?: THREE.Euler) {
    this.add(new THREE.BoxGeometry(w, h, d), shade, x, y, z, turn);
  }

  softBox(w: number, h: number, d: number, radius: number, shade: Shade, x: number, y: number, z: number, turn?: THREE.Euler) {
    const bevel = Math.min(radius * 0.3, d * 0.1);
    w -= bevel * 2; h -= bevel * 2; radius = Math.max(0.001, radius - bevel);
    const shape = new THREE.Shape();
    const a = w / 2 - radius, b = h / 2 - radius;
    shape.moveTo(-a, -h / 2); shape.lineTo(a, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -b); shape.lineTo(w / 2, b);
    shape.quadraticCurveTo(w / 2, h / 2, a, h / 2); shape.lineTo(-a, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, b); shape.lineTo(-w / 2, -b);
    shape.quadraticCurveTo(-w / 2, -h / 2, -a, -h / 2);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: d - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 3, steps: 1 });
    geometry.center();
    this.add(geometry, shade, x, y, z, turn);
  }

  cylinder(radius: number, length: number, shade: Shade, x: number, y: number, z: number, axis: 'x' | 'y' | 'z' = 'y', segments = 10, endRadius = radius) {
    const rotation = axis === 'x' ? new THREE.Euler(0, 0, Math.PI / 2) : axis === 'z' ? new THREE.Euler(Math.PI / 2, 0, 0) : undefined;
    this.add(new THREE.CylinderGeometry(endRadius, radius, length, segments), shade, x, y, z, rotation);
  }

  ball(radius: number, shade: Shade, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) {
    const geometry = new THREE.IcosahedronGeometry(radius, 1);
    geometry.scale(sx, sy, sz);
    this.add(geometry, shade, x, y, z);
  }

  finish() {
    for (const [shade, geometries] of this.parts) {
      let start = 0;
      const pieceRanges = geometries.map((geometry, index) => {
        const count = geometry.getAttribute('position').count;
        const range = { start, count, piece: index, shade, assembly: this.target.name };
        start += count;
        return range;
      });
      const combined = mergeGeometries(geometries, false);
      geometries.forEach(geometry => geometry.dispose());
      if (!combined) throw new Error(`Cannot combine miniature geometry: ${shade}`);
      combined.userData.pieceRanges = pieceRanges;
      const mesh = new THREE.Mesh(combined, this.materials[shade]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = `${this.target.name}-${shade}`;
      this.target.add(mesh);
    }
    this.parts.clear();
  }
}

function part(parent: THREE.Group, name: string, materials: Palette, position: [number, number, number] = [0, 0, 0]) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(...position);
  parent.add(group);
  return { group, build: new Parts(materials, group) };
}

function infantry(root: THREE.Group, materials: Palette) {
  const { group: body, build: b } = part(root, 'body', materials);
  b.softBox(0.47, 0.55, 0.32, 0.08, 'team', 0, 1.07, 0);
  b.softBox(0.35, 0.43, 0.21, 0.045, 'dark', 0, 1.08, -0.23);
  b.box(0.42, 0.085, 0.35, 'rubber', 0, 0.84, 0);
  b.box(0.08, 0.1, 0.035, 'gold', 0, 0.85, 0.195);
  for (const x of [-0.13, 0.13]) {
    b.box(0.055, 0.42, 0.045, 'cream', x, 1.11, 0.18);
    b.softBox(0.12, 0.13, 0.09, 0.018, 'dark', x, 0.96, 0.22);
  }
  b.cylinder(0.08, 0.09, 'skin', 0, 1.39, 0);
  b.ball(0.21, 'skin', 0, 1.57, 0.015, 0.84, 1, 0.9);
  b.ball(0.245, 'team', 0, 1.72, -0.015, 1, 0.64, 1);
  b.box(0.49, 0.045, 0.39, 'dark', 0, 1.64, 0.025);
  b.softBox(0.29, 0.095, 0.05, 0.025, 'glass', 0, 1.59, 0.19);
  b.box(0.035, 0.07, 0.02, 'cream', 0, 1.6, 0.225);
  b.cylinder(0.016, 0.27, 'rubber', -0.16, 1.46, -0.31);
  b.finish();

  for (const side of [-1, 1]) {
    const { group, build: leg } = part(body, `leg-${side}`, materials, [side * 0.135, 0.8, 0]);
    leg.softBox(0.21, 0.39, 0.26, 0.035, 'dark', 0, -0.2, 0);
    leg.softBox(0.23, 0.18, 0.29, 0.035, 'team', 0, -0.39, 0.015);
    leg.softBox(0.2, 0.23, 0.24, 0.03, 'dark', 0, -0.55, -0.005);
    leg.softBox(0.23, 0.16, 0.39, 0.03, 'rubber', 0, -0.72, 0.055);
    leg.box(0.23, 0.035, 0.38, 'metal', 0, -0.7825, 0.055);
    leg.finish();
    group.userData.side = side;

    const { group: arm, build: a } = part(body, `arm-${side}`, materials, [side * 0.3, 1.28, 0]);
    a.ball(0.155, 'light', 0, 0, 0, 0.8, 1, 1);
    a.softBox(0.17, 0.25, 0.22, 0.03, 'team', 0, -0.16, 0.015);
    a.ball(0.1, 'dark', 0, -0.29, 0.055);
    a.softBox(0.145, 0.2, 0.19, 0.025, 'team', 0, -0.37, 0.1, new THREE.Euler(-0.4, 0, 0));
    a.ball(0.085, 'rubber', 0, -0.46, 0.15);
    if (side === 1) {
      a.softBox(0.1, 0.15, 0.5, 0.015, 'rubber', 0, -0.4, 0.35);
      a.cylinder(0.028, 0.24, 'metal', 0, -0.35, 0.67, 'z', 8);
      a.box(0.065, 0.08, 0.17, 'gold', 0, -0.5, 0.32);
    }
    a.finish();
    arm.userData.side = side;
  }
}

function tank(root: THREE.Group, materials: Palette) {
  const { build: b } = part(root, 'hull', materials);
  b.softBox(1.23, 0.41, 1.5, 0.12, 'team', 0, 0.64, -0.03);
  b.softBox(1.02, 0.19, 1.43, 0.07, 'light', 0, 0.86, -0.025);
  b.softBox(1.03, 0.17, 0.43, 0.05, 'dark', 0, 0.58, 0.76, new THREE.Euler(-0.18, 0, 0));
  for (const x of [-0.72, 0.72]) {
    b.softBox(0.29, 0.49, 1.78, 0.15, 'rubber', x, 0.27, -0.04);
    b.softBox(0.3, 0.09, 1.81, 0.03, 'dark', x, 0.55, -0.04);
    for (let i = 0; i < 9; i++) {
      const z = -0.76 + i * 0.18;
      b.box(0.32, 0.035, 0.09, 'metal', x, 0.0175, z);
      b.box(0.32, 0.035, 0.09, 'metal', x, 0.5, z);
    }
    for (let i = 0; i < 6; i++) {
      b.cylinder(0.14, 0.025, 'metal', x + Math.sign(x) * 0.155, 0.27, -0.66 + i * 0.25, 'x', 10);
      b.cylinder(0.055, 0.035, 'gold', x + Math.sign(x) * 0.172, 0.27, -0.66 + i * 0.25, 'x', 8);
    }
  }
  for (const x of [-0.4, 0.4]) {
    b.ball(0.075, 'cream', x, 0.77, 0.73, 1, 0.8, 0.7);
    b.box(0.06, 0.11, 0.4, 'cream', x, 0.97, -0.5);
  }
  for (let i = 0; i < 6; i++) b.box(0.61, 0.022, 0.035, 'rubber', 0, 0.968, -0.4 - i * 0.065);
  b.finish();
  const { build: t } = part(root, 'turret', materials, [0, 0.96, 0.12]);
  t.cylinder(0.42, 0.11, 'metal', 0, 0, 0);
  t.softBox(0.79, 0.3, 0.72, 0.1, 'team', 0, 0.19, -0.02);
  t.softBox(0.54, 0.08, 0.5, 0.05, 'light', 0, 0.38, -0.06);
  t.cylinder(0.16, 0.07, 'dark', -0.12, 0.44, -0.12);
  t.cylinder(0.1, 0.025, 'gold', -0.12, 0.49, -0.12);
  t.softBox(0.26, 0.19, 0.22, 0.035, 'dark', 0, 0.19, 0.39);
  t.cylinder(0.065, 0.75, 'team', 0, 0.22, 0.82, 'z', 10);
  t.cylinder(0.085, 0.13, 'metal', 0, 0.22, 1.22, 'z', 10);
  t.cylinder(0.05, 0.012, 'rubber', 0, 0.22, 1.292, 'z', 10);
  t.cylinder(0.012, 0.56, 'rubber', 0.28, 0.66, -0.22, 'y', 6);
  t.box(0.09, 0.08, 0.018, 'cream', 0.28, 0.88, -0.22);
  t.finish();
}

function artillery(root: THREE.Group, materials: Palette) {
  const { build: b } = part(root, 'carriage', materials);
  b.softBox(0.73, 0.23, 0.71, 0.055, 'dark', 0, 0.46, -0.16);
  b.cylinder(0.06, 1.12, 'metal', 0, 0.3, -0.2, 'x', 8);
  for (const side of [-1, 1]) {
    b.cylinder(0.3, 0.18, 'rubber', side * 0.52, 0.3, -0.2, 'x', 12);
    b.cylinder(0.22, 0.195, 'team', side * 0.52, 0.3, -0.2, 'x', 10);
    b.cylinder(0.07, 0.215, 'gold', side * 0.52, 0.3, -0.2, 'x', 8);
    b.softBox(0.14, 0.13, 1.06, 0.025, 'team', side * 0.29, 0.18, -0.69, new THREE.Euler(0.15, side * 0.28, 0));
    b.box(0.3, 0.07, 0.26, 'metal', side * 0.43, 0.045, -1.12);
    b.cylinder(0.035, 0.37, 'gold', side * 0.2, 0.58, -0.3, 'z', 8);
  }
  b.softBox(1.0, 0.6, 0.09, 0.055, 'team', 0, 0.74, 0.16, new THREE.Euler(-0.1, 0, 0));
  b.box(0.05, 0.5, 0.035, 'cream', -0.4, 0.74, 0.23);
  b.box(0.05, 0.5, 0.035, 'cream', 0.4, 0.74, 0.23);
  b.finish();
  const { group, build: g } = part(root, 'gun', materials, [0, 0.8, 0]);
  group.rotation.x = -0.19;
  g.cylinder(0.13, 0.48, 'metal', 0, 0, 0.12, 'z', 10);
  g.cylinder(0.085, 0.76, 'light', 0, 0, 0.69, 'z', 10);
  g.cylinder(0.12, 0.15, 'dark', 0, 0, 1.13, 'z', 10);
  g.cylinder(0.065, 0.014, 'rubber', 0, 0, 1.214, 'z', 10);
  for (const x of [-0.17, 0.17]) g.cylinder(0.04, 0.62, 'gold', x, -0.14, 0.37, 'z', 8);
  g.softBox(0.3, 0.22, 0.26, 0.035, 'dark', 0, -0.02, -0.25);
  g.finish();
}

function drone(root: THREE.Group, materials: Palette) {
  const { group: body, build: b } = part(root, 'airframe', materials, [0, 1.05, 0]);
  b.softBox(0.53, 0.23, 0.64, 0.09, 'team', 0, 0, 0);
  b.softBox(0.38, 0.08, 0.4, 0.05, 'light', 0, 0.17, -0.02);
  b.box(0.08, 0.03, 0.34, 'cream', 0, 0.225, -0.02);
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    b.softBox(0.12, 0.11, 0.63, 0.025, 'dark', x * 0.38, 0, z * 0.34, new THREE.Euler(0, x * z * 0.8, 0));
    b.cylinder(0.105, 0.18, 'metal', x * 0.6, 0.08, z * 0.58, 'y', 10);
    b.ball(0.038, z > 0 ? 'cream' : 'gold', x * 0.59, 0.01, z * 0.69);
    const { build: rotor } = part(body, `rotor-${x}-${z}`, materials, [x * 0.6, 0.2, z * 0.58]);
    rotor.softBox(0.69, 0.025, 0.085, 0.025, 'rubber', 0, 0, 0);
    rotor.softBox(0.085, 0.025, 0.69, 0.025, 'rubber', 0, 0, 0);
    rotor.cylinder(0.06, 0.05, 'gold', 0, 0.04, 0, 'y', 8);
    rotor.finish();
  }
  for (const x of [-0.27, 0.27]) {
    b.cylinder(0.022, 0.3, 'metal', x, -0.25, 0.12, 'y', 6);
    b.cylinder(0.022, 0.3, 'metal', x, -0.25, -0.15, 'y', 6);
    b.softBox(0.06, 0.06, 0.52, 0.025, 'rubber', x, -0.4, 0);
  }
  b.cylinder(0.045, 0.14, 'metal', 0, -0.23, 0.17);
  b.ball(0.14, 'dark', 0, -0.35, 0.19, 1, 0.9, 0.9);
  b.cylinder(0.07, 0.07, 'glass', 0, -0.35, 0.31, 'z', 10);
  b.finish();
}

function aircraft(root: THREE.Group, materials: Palette) {
  const { group: body, build: b } = part(root, 'airframe', materials, [0, 1.0, 0]);
  b.ball(0.31, 'team', 0, 0, 0, 0.85, 0.85, 2.8);
  b.cylinder(0.16, 0.28, 'dark', 0, -0.005, 0.81, 'z', 12, 0.22);
  b.ball(0.22, 'gold', 0, -0.005, 0.97, 0.7, 0.7, 0.6);
  b.ball(0.24, 'glass', 0, 0.24, 0.13, 0.78, 0.6, 1.45);
  b.box(0.035, 0.025, 0.49, 'cream', 0, 0.38, 0.13);
  for (const x of [-1, 1]) {
    b.softBox(0.84, 0.075, 0.48, 0.11, 'team', x * 0.57, -0.02, 0.04, new THREE.Euler(0, x * -0.12, x * 0.035));
    b.softBox(0.19, 0.08, 0.47, 0.045, 'cream', x * 0.78, -0.01, 0.015, new THREE.Euler(0, x * -0.12, 0));
    b.softBox(0.34, 0.06, 0.25, 0.06, 'dark', x * 0.28, 0.08, -0.71, new THREE.Euler(0, x * 0.15, 0));
    b.cylinder(0.035, 0.27, 'metal', x * 0.32, -0.24, 0.27, 'y', 6);
    b.cylinder(0.11, 0.07, 'rubber', x * 0.32, -0.4, 0.27, 'x', 10);
    b.cylinder(0.045, 0.085, 'gold', x * 0.32, -0.4, 0.27, 'x', 8);
  }
  b.softBox(0.08, 0.37, 0.36, 0.08, 'team', 0, 0.27, -0.65, new THREE.Euler(-0.13, 0, 0));
  b.box(0.09, 0.055, 0.24, 'cream', 0, 0.43, -0.64);
  b.finish();
  const { build: p } = part(body, 'propeller', materials, [0, -0.005, 0.96]);
  p.softBox(0.07, 0.8, 0.045, 0.025, 'rubber', 0, 0, 0);
  p.softBox(0.8, 0.07, 0.045, 0.025, 'rubber', 0, 0, 0);
  p.cylinder(0.065, 0.09, 'gold', 0, 0, 0.05, 'z', 8);
  p.finish();
}

/** Original toy-scale meshes. Y up, +Z front, ground vehicles rest at y≈0. */
export function createUnit(kind: UnitKind, team: Team = 'red', options: { badge?: boolean } = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = `${kind}-${team}`;
  root.userData.kind = kind;
  root.userData.team = team;
  const materials = palette(team);
  const builders = { infantry, tank, artillery, drone, aircraft };
  builders[kind](root, materials);
  // Remove unused palette entries; used entries are shared only within this root.
  const used = new Set<THREE.Material>();
  root.traverse(object => { if (object instanceof THREE.Mesh) used.add(object.material as THREE.Material); });
  for (const material of Object.values(materials)) if (!used.has(material)) material.dispose();
  if (options.badge !== false) {
    const top = new THREE.Box3().setFromObject(root).max.y;
    const badge = createTeamBadge(team);
    badge.position.set(0, top + 0.51, 0);
    root.add(badge);
  }
  return root;
}

/** Decorative animation never changes troop inventory or a battle result. */
export function animateUnit(group: THREE.Group, time: number, moving = false): void {
  if (!Number.isFinite(time)) return;
  const kind = group.userData.kind as UnitKind;
  if (kind === 'infantry') {
    const body = group.getObjectByName('body');
    if (body) body.position.y = moving ? Math.abs(Math.sin(time * 8)) * 0.035 : Math.sin(time * 2) * 0.012;
    for (const side of [-1, 1]) {
      const leg = group.getObjectByName(`leg-${side}`);
      const arm = group.getObjectByName(`arm-${side}`);
      if (leg) leg.rotation.x = moving ? Math.sin(time * 8) * side * 0.32 : 0;
      if (arm) arm.rotation.x = moving ? Math.sin(time * 8) * side * -0.24 : Math.sin(time * 2) * 0.025;
    }
  }
  if (kind === 'tank') {
    const turret = group.getObjectByName('turret');
    if (turret) turret.rotation.y = Math.sin(time * 0.6) * 0.16;
  }
  if (kind === 'artillery') {
    const gun = group.getObjectByName('gun');
    if (gun) gun.rotation.x = -0.19 + Math.sin(time * 0.7) * 0.025;
  }
  if (kind === 'drone' || kind === 'aircraft') {
    const body = group.getObjectByName('airframe');
    if (body) {
      body.position.y = (kind === 'drone' ? 1.05 : 1) + Math.sin(time * 2.2) * 0.07;
      body.rotation.z = Math.sin(time * 1.6) * 0.025;
    }
    group.traverse(object => {
      if (object.name.startsWith('rotor-')) object.rotation.y = time * 32;
      if (object.name === 'propeller') object.rotation.z = time * 37;
    });
  }
}

/** Safe disposal for shared per-model materials and batched geometries. */
export function disposeUnit(group: THREE.Group): void {
  const materials = new Set<THREE.Material>();
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  materials.forEach(material => material.dispose());
}
