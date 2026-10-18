import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Team, UnitKind } from './unit-models';

/** Local coordinates relative to size. Front/gate is +Z; headquarters is at the rear. */
export const CAMP_SLOTS: Readonly<Record<UnitKind, Readonly<{ x: number; z: number; scale: number }>>> = Object.freeze({
  infantry: Object.freeze({ x: -0.4, z: 0.23, scale: 0.115 }),
  tank: Object.freeze({ x: 0, z: 0.23, scale: 0.115 }),
  artillery: Object.freeze({ x: 0.4, z: 0.23, scale: 0.115 }),
  drone: Object.freeze({ x: -0.29, z: -0.16, scale: 0.115 }),
  aircraft: Object.freeze({ x: 0.29, z: -0.16, scale: 0.115 }),
});

/** Top of the raised unit pads; multiply by size when placing a unit. */
export const CAMP_SURFACE_Y = 0.04;

type Shade = 'structure' | 'grass' | 'road' | 'pad' | 'team' | 'dark' | 'white' | 'glass' | 'gold';
type Feature = { start: number; count: number; feature: string };

export function clampCampLevel(level = 1): 1 | 2 | 3 | 4 | 5 | 6 {
  if (!Number.isFinite(level)) return 1;
  return Math.max(1, Math.min(6, Math.round(level))) as 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * Miniature barracks with 6 evolutionary levels (Skin I to Skin VI).
 * All static details remain batched into <= 9 draws and within the exact camp footprint.
 */
export function createBaseCamp(team: Team, size: number, level = 1): THREE.Group {
  if (!Number.isFinite(size) || size <= 0) throw new RangeError('Base camp size must be finite and greater than zero.');
  const tierLevel = clampCampLevel(level);
  const root = new THREE.Group();
  root.name = `base-camp-${team}-lv${tierLevel}`;
  root.scale.setScalar(size);
  root.userData.team = team;
  root.userData.level = tierLevel;
  root.userData.baseCamp = true;
  root.userData.surfaceY = CAMP_SURFACE_Y * size;
  root.userData.front = '+Z';

  const structurePalette = ['#c3cbb6', '#bec8b2', '#b6c3ac', '#aebfa6', '#a7bba0', '#ded7be'][tierLevel - 1];
  const goldPalette = ['#edc475', '#f0c86e', '#f3cc65', '#f6d15b', '#f9d64f', '#ffdf40'][tierLevel - 1];
  const colors: Record<Shade, string> = {
    structure: structurePalette,
    grass: '#a2bf8f',
    road: tierLevel >= 4 ? '#72827a' : '#818f86',
    pad: tierLevel >= 5 ? '#e6ead9' : '#dee3d3',
    team: team === 'red' ? '#db5b4f' : '#4d91d9',
    dark: tierLevel >= 4 ? '#364d4f' : '#435c5c',
    white: '#fff2d1',
    glass: '#9bd3db',
    gold: goldPalette,
  };
  const parts = new Map<Shade, { geometry: THREE.BufferGeometry; feature: string }[]>();

  function add(geometry: THREE.BufferGeometry, shade: Shade, x: number, y: number, z: number, feature: string, rotation?: THREE.Euler) {
    geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(rotation ?? new THREE.Euler()), new THREE.Vector3(1, 1, 1)));
    const normalized = geometry.index ? geometry.toNonIndexed() : geometry;
    if (normalized !== geometry) geometry.dispose();
    normalized.deleteAttribute('uv');
    if (!normalized.hasAttribute('normal')) normalized.computeVertexNormals();
    const list = parts.get(shade) ?? [];
    list.push({ geometry: normalized, feature }); parts.set(shade, list);
  }
  function box(w: number, h: number, d: number, shade: Shade, x: number, y: number, z: number, feature = 'perimeter', rotation?: THREE.Euler) {
    add(new THREE.BoxGeometry(w, h, d), shade, x, y, z, feature, rotation);
  }
  function cylinder(radius: number, h: number, shade: Shade, x: number, y: number, z: number, feature: string, segments = 16) {
    add(new THREE.CylinderGeometry(radius, radius, h, segments), shade, x, y, z, feature);
  }
  function marker(name: string, position: [number, number, number], metadata: Record<string, unknown>) {
    const group = new THREE.Group(); group.name = name; group.position.set(...position);
    Object.assign(group.userData, metadata); root.add(group); return group;
  }

  // Raised perimeter with a continuous edge and lawn inside, grounded at local Y=0.
  box(1.24, 0.024, 1.14, 'structure', 0, 0.012, 0, 'platform');
  box(1.19, 0.008, 1.09, 'grass', 0, 0.028, 0, 'platform');
  for (const x of [-0.608, 0.608]) box(0.012, 0.012, 1.12, tierLevel >= 6 ? 'gold' : 'white', x, 0.03, 0, 'curb');
  for (const z of [-0.558, 0.558]) box(1.21, 0.012, 0.012, tierLevel >= 6 ? 'gold' : 'white', 0, 0.03, z, 'curb');

  // Roads wrap around the three front pads, then join the rear command building.
  box(1.09, 0.005, 0.07, 'road', 0, 0.0345, 0.435, 'road');
  box(0.13, 0.005, 0.11, 'road', 0, 0.0345, 0.52, 'road');
  for (const x of [-0.2, 0.2]) box(0.055, 0.005, 0.41, 'road', x, 0.0345, 0.23, 'road');
  box(1.05, 0.005, 0.06, 'road', 0, 0.0345, 0.025, 'road');
  box(0.085, 0.005, 0.335, 'road', 0, 0.0345, -0.1725, 'road');
  for (const x of [-0.46, -0.32, 0.32, 0.46]) box(0.045, 0.001, 0.006, tierLevel >= 5 ? 'gold' : 'white', x, 0.0375, 0.435, 'road-markings');
  for (const z of [-0.27, -0.18, -0.09]) box(0.007, 0.001, 0.035, tierLevel >= 5 ? 'gold' : 'white', 0, 0.0375, z, 'road-markings');

  // Each marker has a fixed pad footprint for layout tests and integration.
  for (const kind of Object.keys(CAMP_SLOTS) as UnitKind[]) {
    const slot = CAMP_SLOTS[kind], air = kind === 'drone' || kind === 'aircraft';
    const width = air ? 0.29 : 0.28, depth = air ? 0.29 : 0.336;
    marker(`pad-${kind}`, [slot.x, CAMP_SURFACE_Y, slot.z], {
      padKind: kind, padWidth: width, padDepth: depth, unitScale: slot.scale,
      helipad: kind === 'drone', airspace: air, normalized: true,
    });
    if (kind === 'drone') {
      cylinder(0.145, 0.008, 'pad', slot.x, 0.036, slot.z, `pad-${kind}`, 24);
      const ring = new THREE.RingGeometry(0.114, 0.121, 24);
      ring.rotateX(-Math.PI / 2);
      add(ring, tierLevel >= 5 ? 'gold' : 'white', slot.x, 0.0406, slot.z, `pad-${kind}`);
      box(0.017, 0.001, 0.105, 'white', slot.x - 0.035, 0.0408, slot.z, `pad-${kind}`);
      box(0.017, 0.001, 0.105, 'white', slot.x + 0.035, 0.0408, slot.z, `pad-${kind}`);
      box(0.065, 0.001, 0.017, 'white', slot.x, 0.0408, slot.z, `pad-${kind}`);
      for (const x of [-0.108, 0.108]) for (const z of [-0.08, 0.08]) cylinder(0.007, 0.012, 'gold', slot.x + x, 0.043, slot.z + z, `pad-${kind}`, 6);
    } else {
      box(width, 0.008, depth, 'pad', slot.x, 0.036, slot.z, `pad-${kind}`);
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        box(0.044, 0.001, 0.006, tierLevel >= 6 ? 'gold' : 'white', slot.x + x * (width / 2 - 0.028), 0.0408, slot.z + z * (depth / 2 - 0.012), `pad-${kind}`);
        box(0.006, 0.001, 0.044, tierLevel >= 6 ? 'gold' : 'white', slot.x + x * (width / 2 - 0.009), 0.0408, slot.z + z * (depth / 2 - 0.03), `pad-${kind}`);
      }
      box(width * 0.48, 0.002, 0.012, 'team', slot.x, 0.041, slot.z + depth / 2 - 0.012, `pad-${kind}`);
      if (kind === 'aircraft') for (const z of [-0.075, 0, 0.075]) box(0.009, 0.001, 0.035, 'white', slot.x, 0.0408, slot.z + z, `pad-${kind}`);
    }
  }

  // Low walls: grow slightly in fortification detail by tierLevel without concealing miniatures.
  const wallHeight = 0.063 + (tierLevel - 1) * 0.004;
  for (const x of [-0.592, 0.592]) {
    box(0.024, wallHeight, 1.08, 'structure', x, 0.032 + wallHeight / 2, 0);
    box(0.028, 0.012, 1.08, 'dark', x, 0.038 + wallHeight, 0);
    if (tierLevel >= 3) {
      for (const z of [-0.32, 0, 0.32]) box(0.034, wallHeight + 0.018, 0.042, 'team', x, 0.04 + wallHeight / 2, z, 'bastion');
    }
  }
  box(1.16, wallHeight, 0.024, 'structure', 0, 0.032 + wallHeight / 2, -0.537);
  box(1.16, 0.012, 0.028, 'dark', 0, 0.038 + wallHeight, -0.537);
  for (const x of [-0.378, 0.378]) {
    box(0.428, wallHeight, 0.024, 'structure', x, 0.032 + wallHeight / 2, 0.537);
    box(0.428, 0.012, 0.028, 'dark', x, 0.038 + wallHeight, 0.537);
    box(0.415, 0.017, 0.004, 'team', x, 0.077, 0.551);
  }

  // Corner towers grow from simple posts (Lv1) to tall watchtowers (Lv2-5) and crowned bastions (Lv6).
  const towerHeight = 0.089 + (tierLevel - 1) * 0.022;
  for (const x of [-0.592, 0.592]) for (const z of [-0.537, 0.537]) {
    box(0.038, towerHeight, 0.038, 'structure', x, 0.032 + towerHeight / 2, z, 'corner-tower');
    box(0.046, 0.014, 0.046, tierLevel >= 5 ? 'gold' : 'white', x, 0.039 + towerHeight, z, 'corner-tower');
    if (tierLevel >= 2) {
      box(0.042, 0.016, 0.042, 'team', x, 0.025 + towerHeight, z, 'corner-tower');
    }
    if (tierLevel >= 4) {
      cylinder(0.016, 0.028, 'dark', x, 0.058 + towerHeight, z, 'corner-tower', 8);
    }
    if (tierLevel >= 6) {
      cylinder(0.012, 0.032, 'gold', x, 0.082 + towerHeight, z, 'corner-tower', 8);
    }
  }

  // Front gate folds along its posts, keeping the complete opening free.
  marker('front-gate', [0, 0.032, 0.537], { gate: true, clearWidth: 0.3, normalized: true });
  for (const x of [-0.157, 0.157]) {
    const postH = 0.107 + (tierLevel >= 5 ? 0.045 : 0);
    box(0.025, postH, 0.031, 'dark', x, 0.032 + postH / 2, 0.537, 'gate');
    box(0.033, 0.012, 0.038, 'gold', x, 0.038 + postH, 0.537, 'gate');
    box(0.012, 0.058, 0.1, 'team', x, 0.074, 0.471, 'gate');
    for (const z of [0.44, 0.472, 0.504]) box(0.014, 0.026, 0.01, 'white', x, 0.08, z, 'gate');
  }
  if (tierLevel >= 5) {
    // High command arch over the gate (above vehicle clearance).
    box(0.35, 0.022, 0.036, 'dark', 0, 0.202, 0.537, 'gate-arch');
    box(0.28, 0.014, 0.04, 'team', 0, 0.218, 0.537, 'gate-arch');
    if (tierLevel >= 6) {
      box(0.11, 0.028, 0.044, 'gold', 0, 0.236, 0.537, 'gate-arch');
    }
  }
  box(0.257, 0.006, 0.026, 'white', 0, 0.035, 0.551, 'gate');
  for (const x of [-0.09, -0.045, 0, 0.045, 0.09]) box(0.014, 0.001, 0.026, 'dark', x, 0.0386, 0.551, 'gate');

  // Headquarters sits behind the air pads and grows vertically and laterally across the 6 levels.
  marker('headquarters', [0, 0.04, -0.455], { hq: true, width: 0.36, depth: 0.18, level: tierLevel, normalized: true });
  box(0.37, 0.012, 0.19, 'structure', 0, 0.038, -0.455, 'hq');
  box(0.34, 0.113, 0.166, 'white', 0, 0.1005, -0.455, 'hq');
  box(0.365, 0.019, 0.187, 'dark', 0, 0.1665, -0.455, 'hq');
  box(0.30, 0.007, 0.13, 'structure', 0, 0.1795, -0.455, 'hq');
  box(0.342, 0.021, 0.008, 'team', 0, 0.132, -0.368, 'hq');
  for (const x of [-0.174, 0.174]) box(0.008, 0.021, 0.165, 'team', x, 0.132, -0.455, 'hq');
  box(0.048, 0.077, 0.009, 'dark', 0, 0.0825, -0.367, 'hq');
  box(0.01, 0.017, 0.011, 'gold', 0.012, 0.083, -0.36, 'hq');
  for (const x of [-0.107, 0.107]) {
    box(0.067, 0.041, 0.009, 'dark', x, 0.092, -0.367, 'hq');
    box(0.055, 0.03, 0.011, 'glass', x, 0.093, -0.361, 'hq');
    box(0.004, 0.033, 0.012, 'white', x, 0.093, -0.36, 'hq');
  }
  box(0.082, 0.007, 0.026, 'structure', 0, 0.0395, -0.35, 'hq');
  box(0.059, 0.019, 0.066, 'dark', 0.095, 0.1925, -0.47, 'hq');
  for (const z of [-0.487, -0.47, -0.453]) box(0.05, 0.002, 0.004, 'structure', 0.095, 0.203, z, 'hq');
  cylinder(0.003, 0.082, 'dark', -0.12, 0.224, -0.486, 'hq', 6);
  cylinder(0.009, 0.013, 'gold', -0.12, 0.2715, -0.486, 'hq', 8);
  box(0.052, 0.026, 0.004, 'team', -0.096, 0.251, -0.486, 'hq');

  // Level 2+: Rear tactical wings & communication dish
  if (tierLevel >= 2) {
    for (const side of [-1, 1]) {
      box(0.11, 0.078, 0.13, 'structure', side * 0.235, 0.075, -0.46, 'hq-wing');
      box(0.118, 0.014, 0.138, 'dark', side * 0.235, 0.12, -0.46, 'hq-wing');
      box(0.09, 0.014, 0.006, 'team', side * 0.235, 0.098, -0.393, 'hq-wing');
    }
  }
  // Level 3+: Second command deck & radar array
  if (tierLevel >= 3) {
    box(0.24, 0.068, 0.12, 'white', 0, 0.215, -0.455, 'hq-deck2');
    box(0.256, 0.015, 0.132, 'dark', 0, 0.256, -0.455, 'hq-deck2');
    box(0.18, 0.024, 0.008, 'glass', 0, 0.218, -0.392, 'hq-deck2');
    box(0.244, 0.012, 0.008, 'team', 0, 0.24, -0.392, 'hq-deck2');
  }
  // Level 4+: Armored side bunkers on rear corners & upper command bridge
  if (tierLevel >= 4) {
    for (const side of [-1, 1]) {
      box(0.13, 0.092, 0.12, 'dark', side * 0.365, 0.082, -0.465, 'hq-bunker');
      box(0.11, 0.016, 0.10, 'gold', side * 0.365, 0.135, -0.465, 'hq-bunker');
    }
  }
  // Level 5+: Elite Citadel Spire on HQ
  if (tierLevel >= 5) {
    box(0.15, 0.058, 0.095, 'white', 0, 0.292, -0.455, 'hq-spire');
    box(0.165, 0.014, 0.105, 'gold', 0, 0.328, -0.455, 'hq-spire');
    box(0.11, 0.022, 0.008, 'glass', 0, 0.292, -0.405, 'hq-spire');
  }
  // Level 6: Supreme Imperial Dome & Golden Monoliths
  if (tierLevel >= 6) {
    cylinder(0.052, 0.042, 'gold', 0, 0.355, -0.455, 'hq-imperial-dome', 12);
    cylinder(0.005, 0.07, 'gold', 0, 0.405, -0.455, 'hq-imperial-dome', 8);
    box(0.06, 0.03, 0.005, 'team', 0.028, 0.422, -0.455, 'hq-imperial-dome');
    for (const side of [-1, 1]) {
      cylinder(0.018, 0.11, 'gold', side * 0.235, 0.18, -0.46, 'hq-imperial-dome', 8);
    }
  }

  for (const [shade, pieces] of parts) {
    let start = 0;
    const features: Feature[] = pieces.map(piece => {
      const count = piece.geometry.getAttribute('position').count;
      const result = { start, count, feature: piece.feature }; start += count; return result;
    });
    const combined = mergeGeometries(pieces.map(piece => piece.geometry), false);
    pieces.forEach(piece => piece.geometry.dispose());
    if (!combined) throw new Error(`Cannot merge base camp geometry: ${shade}`);
    combined.userData.campFeatures = features;
    const material = new THREE.MeshStandardMaterial({
      color: colors[shade],
      roughness: shade === 'gold' && tierLevel >= 5 ? 0.42 : 0.86,
      metalness: shade === 'gold' && tierLevel >= 5 ? 0.35 : shade === 'dark' ? 0.12 : 0,
      flatShading: true,
    });
    const mesh = new THREE.Mesh(combined, material); mesh.name = `camp-${shade}`;
    mesh.castShadow = shade !== 'grass' && shade !== 'road' && shade !== 'pad'; mesh.receiveShadow = true;
    root.add(mesh);
  }
  return root;
}
