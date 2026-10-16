import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

type PieceRange = { start: number; count: number; piece?: number; assembly?: string; shade?: string };
type Piece = { mesh: THREE.Mesh; start: THREE.Vector3; end: THREE.Vector3; rotation: THREE.Quaternion; arc: number; delay: number };
type Wreck = { root: THREE.Group; chunks: THREE.Group; pieces: Piece[]; age: number; duration: number; settled: boolean; source: THREE.Group; bounds: THREE.Sphere };
export type DestructionOptions = { maxWrecks?: number; maxPieces?: number; groundY?: number };

function seeded(seed: number) { let value = seed >>> 0; return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; }; }
function isBadge(object: THREE.Object3D, source: THREE.Object3D) { let current: THREE.Object3D | null = object; while (current && current !== source) { if (current.userData.teamBadge) return true; current = current.parent; } return false; }
function disposeObject(root: THREE.Object3D) {
  const geometry = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  root.traverse(object => { const mesh = object as THREE.Mesh; if (mesh.geometry) geometry.add(mesh.geometry); if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material); });
  geometry.forEach(item => item.dispose()); materials.forEach(item => item.dispose());
}
function lowestPoint(box: THREE.Box3, rotation: THREE.Quaternion) {
  let lowest = Infinity; const point = new THREE.Vector3();
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) lowest = Math.min(lowest, point.set(x, y, z).applyQuaternion(rotation).y);
  return lowest;
}

/** Toy pieces are copied from the original primitive vertex ranges, never substituted with random cubes. */
export class ToyDebris {
  private parent: THREE.Object3D;
  private wrecks: Wreck[] = [];
  private destroyed = new Set<string>();
  private piecesOwned = 0;
  private maxWrecks: number;
  private maxPieces: number;
  private groundY: number;
  private detail = true;
  private disposed = false;
  private frustum: THREE.Frustum | null = null;
  constructor(parent: THREE.Object3D, options: DestructionOptions = {}) {
    this.parent = parent; this.maxWrecks = options.maxWrecks ?? 128; this.maxPieces = options.maxPieces ?? 12000; this.groundY = options.groundY ?? .73;
  }
  get count() { return this.wrecks.length; }
  get activeCount() { return this.wrecks.filter(wreck => !wreck.settled).length; }
  get pieceCount() { return this.piecesOwned; }
  has(source: THREE.Object3D) { return this.destroyed.has(source.uuid); }
  setDetail(visible: boolean, frustum?: THREE.Frustum) {
    this.detail = visible; this.frustum = frustum ?? null;
    for (const wreck of this.wrecks) { wreck.chunks.visible = visible; wreck.root.visible = !frustum || frustum.intersectsSphere(wreck.bounds); }
  }
  shatter(source: THREE.Group, seed: number, settled = false): THREE.Group | null {
    if (this.disposed || this.destroyed.has(source.uuid) || this.wrecks.length >= this.maxWrecks || !Number.isFinite(seed)) return null;
    source.updateWorldMatrix(true, true); this.parent.updateWorldMatrix(true, false);
    if (!source.matrixWorld.elements.every(Number.isFinite)) return null;
    const inverse = source.matrixWorld.clone().invert(), transform = this.parent.matrixWorld.clone().invert().multiply(source.matrixWorld);
    const root = new THREE.Group(); root.name = `wreck-${source.userData.kind || 'unit'}`; root.userData.wreckage = true; root.userData.sourceKind = source.userData.kind; root.userData.team = source.userData.team;
    transform.decompose(root.position, root.quaternion, root.scale);
    const worldOrigin = source.getWorldPosition(new THREE.Vector3()), worldScale = source.getWorldScale(new THREE.Vector3()).y;
    if (!Number.isFinite(worldScale) || worldScale <= 0) return null;
    const groundY = Number.isFinite(source.userData.groundY) ? source.userData.groundY as number : this.groundY;
    const floor = (groundY - worldOrigin.y) / worldScale;
    const pieces: Piece[] = [], chunks = new THREE.Group(), materials = new Map<THREE.Material, THREE.Material>(), rng = seeded(seed), infantry = source.userData.kind === 'infantry';
    root.add(chunks); const fallen = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    source.traverse(object => {
      if (!(object instanceof THREE.Mesh) || isBadge(object, source)) return;
      const original = object.geometry, positions = original.getAttribute('position'); if (!positions || original.index) return;
      const ranges: PieceRange[] = (original.userData.pieceRanges as PieceRange[] | undefined) ?? [{ start: 0, count: positions.count }];
      const local = inverse.clone().multiply(object.matrixWorld), originalMaterial = (Array.isArray(object.material) ? object.material[0] : object.material) as THREE.Material;
      let material = materials.get(originalMaterial); if (!material) { material = originalMaterial.clone(); materials.set(originalMaterial, material); }
      for (const range of ranges) {
        if (!Number.isInteger(range.start) || !Number.isInteger(range.count) || range.start < 0 || range.count < 3 || range.start + range.count > positions.count) continue;
        const geometry = new THREE.BufferGeometry();
        for (const name of Object.keys(original.attributes)) { const attribute = original.getAttribute(name); if (attribute instanceof THREE.BufferAttribute) geometry.setAttribute(name, new THREE.BufferAttribute(attribute.array.slice(range.start * attribute.itemSize, (range.start + range.count) * attribute.itemSize), attribute.itemSize, attribute.normalized)); }
        geometry.applyMatrix4(local); geometry.computeBoundingBox(); const center = geometry.boundingBox!.getCenter(new THREE.Vector3()); geometry.translate(-center.x, -center.y, -center.z); geometry.computeBoundingBox();
        const mesh = new THREE.Mesh(geometry, material); mesh.name = `broken-${range.assembly || object.name}-${range.piece ?? pieces.length}`; mesh.castShadow = true; mesh.receiveShadow = true; mesh.position.copy(center); mesh.userData.originalPiece = { start: range.start, count: range.count, assembly: range.assembly, shade: range.shade };
        const isLimb = /arm|leg/.test(range.assembly || object.parent?.name || ''), end = center.clone(), rotation = new THREE.Quaternion();
        if (infantry) {
          end.sub(new THREE.Vector3(0, .93, 0)).applyQuaternion(fallen);
          const spread = isLimb ? .18 : .055; end.x += (rng() - .5) * spread; end.z += (rng() - .5) * spread;
          rotation.copy(fallen).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler((rng() - .5) * .16, (rng() - .5) * .25, (rng() - .5) * .2)));
          // Helmet/head pop loose, while torso and limbs retain a readable fallen silhouette.
          if (center.y > 1.65) { end.x += .25; end.z += .2; rotation.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(.6, .4, -.3))); }
        } else {
          const distance = .2 + rng() * .45, angle = rng() * Math.PI * 2;
          end.x += Math.cos(angle) * distance; end.z += Math.sin(angle) * distance;
          rotation.setFromEuler(new THREE.Euler((rng() - .5) * Math.PI, rng() * Math.PI * 2, (rng() - .5) * Math.PI));
        }
        end.y = floor - lowestPoint(geometry.boundingBox!, rotation) + .006;
        chunks.add(mesh); pieces.push({ mesh, start: center.clone(), end, rotation, arc: (infantry ? .3 : .5) + rng() * .9, delay: rng() * .12 });
      }
    });
    if (!pieces.length || this.piecesOwned + pieces.length > this.maxPieces) { disposeObject(root); return null; }
    const scorch = new THREE.Mesh(new THREE.CircleGeometry(infantry ? .6 : 1.1, 20), new THREE.MeshBasicMaterial({ color: '#524c39', transparent: true, opacity: .23, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    scorch.name = 'impact-mark'; scorch.rotation.x = -Math.PI / 2; scorch.position.y = floor + .002; scorch.scale.y = .7; root.add(scorch);
    const bounds = new THREE.Sphere(worldOrigin.clone(), worldScale * 4.5);
    const wreck: Wreck = { root, chunks, pieces, age: 0, duration: 1.7, settled: false, source, bounds };
    root.userData.pieceCount = pieces.length; chunks.visible = this.detail; root.visible = !this.frustum || this.frustum.intersectsSphere(bounds);
    this.parent.add(root); this.wrecks.push(wreck); this.destroyed.add(source.uuid); this.piecesOwned += pieces.length;
    source.userData.casualty = true; source.visible = false;
    if (settled) this.settle(wreck);
    return root;
  }
  update(delta: number): boolean {
    if (this.disposed || !Number.isFinite(delta) || delta < 0) return false;
    let changed = false;
    for (const wreck of this.wrecks) {
      if (wreck.settled) continue; changed = true; wreck.age += delta;
      if (wreck.age >= wreck.duration) { this.settle(wreck); continue; }
      for (const piece of wreck.pieces) {
        const t = THREE.MathUtils.clamp((wreck.age - piece.delay) / (wreck.duration - piece.delay), 0, 1), ease = 1 - (1 - t) ** 3;
        const hop = t < .72 ? Math.sin(Math.PI * t / .72) : Math.abs(Math.sin((t - .72) / .28 * Math.PI * 2)) * .16 * (1 - t) / .28;
        piece.mesh.position.lerpVectors(piece.start, piece.end, ease); piece.mesh.position.y += hop * piece.arc;
        piece.mesh.quaternion.identity().slerp(piece.rotation, ease);
        const floor = piece.end.y + lowestPoint(piece.mesh.geometry.boundingBox!, piece.rotation) - .006;
        const support = floor - lowestPoint(piece.mesh.geometry.boundingBox!, piece.mesh.quaternion);
        piece.mesh.position.y = Math.max(piece.mesh.position.y, support);
      }
    }
    return changed;
  }
  private settle(wreck: Wreck) {
    const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
    for (const piece of wreck.pieces) {
      piece.mesh.position.copy(piece.end); piece.mesh.quaternion.copy(piece.rotation); piece.mesh.updateMatrix();
      const baked = piece.mesh.geometry.clone().applyMatrix4(piece.mesh.matrix), material = piece.mesh.material as THREE.Material;
      const geometries = batches.get(material) ?? []; geometries.push(baked); batches.set(material, geometries); piece.mesh.geometry.dispose(); wreck.chunks.remove(piece.mesh);
    }
    for (const [material, geometries] of batches) { const geometry = mergeGeometries(geometries, false); geometries.forEach(item => item.dispose()); if (geometry) { const mesh = new THREE.Mesh(geometry, material); mesh.name = 'settled-toy-pieces'; mesh.castShadow = true; mesh.receiveShadow = true; wreck.chunks.add(mesh); } }
    wreck.pieces = []; wreck.settled = true; wreck.root.userData.settled = true;
  }
  clear(restore = true) {
    for (const wreck of this.wrecks) { this.parent.remove(wreck.root); disposeObject(wreck.root); if (restore) { wreck.source.userData.casualty = false; wreck.source.visible = true; } }
    this.wrecks = []; this.destroyed.clear(); this.piecesOwned = 0;
  }
  dispose() { if (this.disposed) return; this.clear(false); this.disposed = true; }
}
