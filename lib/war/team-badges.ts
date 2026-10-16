import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Team } from './unit-models';

function starShape(radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + i * Math.PI / 5;
    const r = i % 2 === 0 ? radius : radius * 0.46;
    const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function toyBlasterShape(): THREE.Shape {
  // A deliberately toy-like, compact silhouette, with no commercial insignia.
  const points = [
    [-0.285, 0.115], [-0.215, 0.12], [-0.18, 0.075], [-0.14, 0.1],
    [-0.14, 0.145], [0.09, 0.145], [0.09, 0.1], [0.265, 0.1],
    [0.285, 0.065], [0.265, 0.03], [0.08, 0.03], [0.08, -0.02],
    [0.015, -0.02], [0.045, -0.13], [-0.025, -0.155], [-0.07, -0.025],
    [-0.14, -0.025], [-0.185, 0.015], [-0.265, -0.025], [-0.285, -0.025],
  ];
  const shape = new THREE.Shape(points.map(([x,y]) => new THREE.Vector2(x,y)));
  shape.closePath();
  return shape;
}

function extrude(shape: THREE.Shape, depth: number, bevel = 0): THREE.BufferGeometry {
  return new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 1, curveSegments: 1, steps: 1,
  });
}

/** Lightweight 3D emblem. The caller positions it above the unit's original bounds. */
export function createTeamBadge(team: Team): THREE.Group {
  const badge = new THREE.Group();
  badge.name = 'team-badge';
  badge.userData.teamBadge = true;
  badge.userData.team = team;
  badge.userData.symbol = team === 'red' ? 'gold-star' : 'toy-blaster';
  const geometries = new Map<string, THREE.BufferGeometry[]>();
  const colors: Record<string, string> = {
    outline: '#344551', plate: '#fff6dd', gold: '#f8c949', shine: '#fff0a4', blue: '#3f8de2',
  };
  function add(geometry: THREE.BufferGeometry, color: string, z: number, x = 0, y = 0) {
    geometry.translate(x,y,z);
    const normalized = geometry.index ? geometry.toNonIndexed() : geometry;
    if (geometry !== normalized) geometry.dispose();
    normalized.deleteAttribute('uv');
    if (!normalized.hasAttribute('normal')) normalized.computeVertexNormals();
    const list = geometries.get(color) ?? [];
    list.push(normalized); geometries.set(color,list);
  }

  // Almost-flat discs retain a visible edge when exported or viewed without billboarding.
  const rim = new THREE.CylinderGeometry(0.36, 0.36, 0.045, 24);
  rim.rotateX(Math.PI / 2);
  add(rim, 'outline', 0);
  const plate = new THREE.CylinderGeometry(0.323, 0.323, 0.03, 24);
  plate.rotateX(Math.PI / 2);
  add(plate, 'plate', 0.026);

  if (team === 'red') {
    add(extrude(starShape(0.267), 0.026, 0.004), 'outline', 0.042);
    add(extrude(starShape(0.241), 0.035, 0.004), 'gold', 0.073);
    const shine = new THREE.Shape();
    shine.moveTo(0,0.227); shine.lineTo(-0.037,0.052); shine.lineTo(0.005,0.015); shine.closePath();
    add(extrude(shine, 0.003), 'shine', 0.113);
  } else {
    const outline = extrude(toyBlasterShape(), 0.026);
    outline.scale(1.08,1.12,1);
    add(outline, 'outline', 0.043, 0, -0.008);
    add(extrude(toyBlasterShape(), 0.034), 'blue', 0.073, 0, -0.008);
    add(new THREE.BoxGeometry(0.2,0.035,0.012), 'shine', 0.117, -0.03,0.092);
    add(new THREE.BoxGeometry(0.035,0.1,0.016), 'outline', 0.117, -0.106,-0.064);
    add(new THREE.BoxGeometry(0.033,0.075,0.018), 'gold', 0.119, 0.235,0.057);
  }

  for (const [color, pieces] of geometries) {
    const combined = mergeGeometries(pieces,false);
    pieces.forEach(piece => piece.dispose());
    if (!combined) throw new Error('Cannot merge team badge geometry');
    combined.userData.teamBadge = true;
    const material = new THREE.MeshStandardMaterial({ color: colors[color], roughness: 0.62, metalness: color === 'gold' ? 0.12 : 0, flatShading: true });
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
