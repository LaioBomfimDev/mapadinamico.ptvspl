import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Team } from './unit-models';

function addDigitOne(
  pushBox: (w: number, h: number, d: number, x: number, y: number, z: number, color: string) => void,
  cx: number,
  depth: number,
  z: number,
  color: string,
  pad = 0,
) {
  pushBox(0.082 + pad, 0.37 + pad, depth, cx + 0.02, 0, z, color);
  pushBox(0.13 + pad, 0.074 + pad, depth, cx - 0.012, 0.148, z, color);
  pushBox(0.168 + pad, 0.07 + pad, depth, cx + 0.01, -0.15, z, color);
}

function addDigitThree(
  pushBox: (w: number, h: number, d: number, x: number, y: number, z: number, color: string) => void,
  cx: number,
  depth: number,
  z: number,
  color: string,
  pad = 0,
) {
  pushBox(0.21 + pad, 0.074 + pad, depth, cx, 0.148, z, color);
  pushBox(0.175 + pad, 0.068 + pad, depth, cx + 0.015, 0, z, color);
  pushBox(0.21 + pad, 0.074 + pad, depth, cx, -0.148, z, color);
  pushBox(0.078 + pad, 0.37 + pad, depth, cx + 0.066, 0, z, color);
  pushBox(0.068 + pad, 0.095 + pad, depth, cx - 0.071, 0.138, z, color);
  pushBox(0.068 + pad, 0.095 + pad, depth, cx - 0.071, -0.138, z, color);
}

function addDigitTwo(
  pushBox: (w: number, h: number, d: number, x: number, y: number, z: number, color: string) => void,
  cx: number,
  depth: number,
  z: number,
  color: string,
  pad = 0,
) {
  pushBox(0.196 + pad, 0.074 + pad, depth, cx, 0.148, z, color);
  pushBox(0.074 + pad, 0.188 + pad, depth, cx + 0.061, 0.091, z, color);
  pushBox(0.196 + pad, 0.068 + pad, depth, cx, 0, z, color);
  pushBox(0.074 + pad, 0.188 + pad, depth, cx - 0.061, -0.091, z, color);
  pushBox(0.196 + pad, 0.074 + pad, depth, cx, -0.148, z, color);
  pushBox(0.066 + pad, 0.092 + pad, depth, cx - 0.065, 0.139, z, color);
}

/** Lightweight 3D emblem showing '13' (red) or '22' (blue) above the unit's head. */
export function createTeamBadge(team: Team): THREE.Group {
  const badge = new THREE.Group();
  badge.name = 'team-badge';
  badge.userData.teamBadge = true;
  badge.userData.team = team;
  badge.userData.symbol = team === 'red' ? '13' : '22';
  const geometries = new Map<string, THREE.BufferGeometry[]>();
  const colors: Record<string, string> = {
    outline: '#1e3139',
    plate: team === 'red' ? '#dc3e35' : '#266ec4',
    ring: team === 'red' ? '#ff8b80' : '#7ab8ff',
    digit: '#fffdf4',
  };
  function add(geometry: THREE.BufferGeometry, color: string, z: number, x = 0, y = 0) {
    geometry.translate(x, y, z);
    const normalized = geometry.index ? geometry.toNonIndexed() : geometry;
    if (geometry !== normalized) geometry.dispose();
    normalized.deleteAttribute('uv');
    if (!normalized.hasAttribute('normal')) normalized.computeVertexNormals();
    const list = geometries.get(color) ?? [];
    list.push(normalized);
    geometries.set(color, list);
  }
  function pushBox(w: number, h: number, d: number, x: number, y: number, z: number, color: string) {
    add(new THREE.BoxGeometry(w, h, d), color, z, x, y);
  }

  // Larger disc (+18% radius) so the 13 / 22 numbers are several pixels larger and easy to read.
  const rim = new THREE.CylinderGeometry(0.425, 0.425, 0.048, 24);
  rim.rotateX(Math.PI / 2);
  add(rim, 'outline', 0);

  const ring = new THREE.CylinderGeometry(0.392, 0.392, 0.034, 24);
  ring.rotateX(Math.PI / 2);
  add(ring, 'ring', 0.018);

  const plate = new THREE.CylinderGeometry(0.368, 0.368, 0.032, 24);
  plate.rotateX(Math.PI / 2);
  add(plate, 'plate', 0.028);

  if (team === 'red') {
    addDigitOne(pushBox, -0.135, 0.026, 0.048, 'outline', 0.024);
    addDigitThree(pushBox, 0.115, 0.026, 0.048, 'outline', 0.024);
    addDigitOne(pushBox, -0.135, 0.038, 0.076, 'digit', 0);
    addDigitThree(pushBox, 0.115, 0.038, 0.076, 'digit', 0);
  } else {
    addDigitTwo(pushBox, -0.122, 0.026, 0.048, 'outline', 0.024);
    addDigitTwo(pushBox, 0.122, 0.026, 0.048, 'outline', 0.024);
    addDigitTwo(pushBox, -0.122, 0.038, 0.076, 'digit', 0);
    addDigitTwo(pushBox, 0.122, 0.038, 0.076, 'digit', 0);
  }

  for (const [color, pieces] of geometries) {
    const combined = mergeGeometries(pieces, false);
    pieces.forEach(piece => piece.dispose());
    if (!combined) throw new Error('Cannot merge team badge geometry');
    combined.userData.teamBadge = true;
    const material = new THREE.MeshStandardMaterial({ color: colors[color], roughness: 0.52, metalness: 0.06, flatShading: true });
    const mesh = new THREE.Mesh(combined, material);
    mesh.name = `team-badge-${color}`;
    mesh.userData.teamBadge = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    badge.add(mesh);
  }
  return badge;
}

const cameraOrientation = new THREE.Quaternion();
const parentOrientation = new THREE.Quaternion();

/** Face the badge to the camera while compensating unit/ancestor rotation. */
export function faceTeamBadge(unit: THREE.Group, camera: THREE.Camera): void {
  const badge = unit.getObjectByName('team-badge');
  if (!badge?.parent || badge.userData.teamBadge !== true) return;
  camera.getWorldQuaternion(cameraOrientation);
  badge.parent.getWorldQuaternion(parentOrientation);
  badge.quaternion.copy(parentOrientation.invert().multiply(cameraOrientation));
}
