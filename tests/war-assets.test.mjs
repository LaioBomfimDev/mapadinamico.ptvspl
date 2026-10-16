import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { createUnit, animateUnit, disposeUnit, UNIT_MODELS } from '../lib/war/unit-models.ts';
import { WarEffects } from '../lib/war/vfx.ts';
import { faceTeamBadge } from '../lib/war/team-badges.ts';

const asset = name => new URL(`../public/war-assets/${name}`, import.meta.url);

test('ten team/model combinations have finite geometry, outward dimensions and correct ground', () => {
  for (const { kind } of UNIT_MODELS) for (const team of ['red', 'blue']) {
    const model = createUnit(kind, team);
    const bounds = new THREE.Box3().setFromObject(model);
    const dimensions = bounds.getSize(new THREE.Vector3());
    assert(dimensions.toArray().every(n => Number.isFinite(n) && n > 0 && n < 3), `${kind}/${team}: plausible dimensions`);
    if (!['drone', 'aircraft'].includes(kind)) assert(Math.abs(bounds.min.y) < 1e-5, `${kind}/${team}: floor`);
    let triangles = 0;
    model.traverse(mesh => {
      if (!mesh.isMesh) return;
      const positions = mesh.geometry.getAttribute('position');
      assert([...positions.array].every(Number.isFinite), `${kind}: no invalid vertex`);
      triangles += (mesh.geometry.index?.count ?? positions.count) / 3;
    });
    assert(triangles > 100 && triangles < 5000, `${kind}: geometry budget`);
    for (const time of [0, 1, 2500, Number.NaN]) {
      animateUnit(model, time, true);
      model.updateMatrixWorld(true);
      model.traverse(object => assert(object.matrixWorld.elements.every(Number.isFinite), `${kind}: animation remains finite`));
    }
    disposeUnit(model);
  }
});

test('red and blue variants share no disposable materials with one another', () => {
  const red = createUnit('tank', 'red'), blue = createUnit('tank', 'blue');
  const redMaterials = new Set(), blueMaterials = new Set();
  red.traverse(mesh => { if (mesh.isMesh) redMaterials.add(mesh.material); });
  blue.traverse(mesh => { if (mesh.isMesh) blueMaterials.add(mesh.material); });
  for (const material of redMaterials) assert(!blueMaterials.has(material));
  const events = new Map();
  for (const material of redMaterials) material.addEventListener('dispose', () => events.set(material, (events.get(material) ?? 0)+1));
  disposeUnit(red);
  assert.equal(events.size, redMaterials.size);
  assert([...events.values()].every(n => n === 1), 'shared materials disposed once');
  disposeUnit(blue);
});

test('original-piece ranges partition all non-badge vertices without holes or overlap', () => {
  for (const { kind } of UNIT_MODELS) {
    const unit = createUnit(kind, 'red');
    let pieces = 0;
    unit.traverse(mesh => {
      if (!mesh.isMesh) return;
      if (mesh.userData.teamBadge) {
        assert.equal(mesh.geometry.userData.teamBadge,true);
        assert.equal(mesh.geometry.userData.pieceRanges,undefined, 'badge excluded from original unit pieces');
        return;
      }
      assert.equal(mesh.geometry.index,null, 'range indices refer to non-indexed vertices');
      const ranges = mesh.geometry.userData.pieceRanges;
      assert(Array.isArray(ranges) && ranges.length > 0, `${kind}: preserved primitive ranges`);
      let start = 0;
      for (const [index, range] of ranges.entries()) {
        assert.equal(range.start,start, `${kind}: no overlap/hole`);
        assert.equal(range.piece,index);
        assert(Number.isInteger(range.count) && range.count > 0 && range.count % 3 === 0);
        assert.equal(range.assembly,mesh.parent.name);
        start += range.count;
        pieces++;
      }
      assert.equal(start,mesh.geometry.getAttribute('position').count, `${kind}: covers every vertex`);
    });
    assert(pieces > 10, `${kind}: several original pieces available`);
    disposeUnit(unit);
  }
});

test('team badges are above the unit, use distinct symbols and can be omitted for debris', () => {
  for (const team of ['red','blue']) {
    const unit = createUnit('infantry',team), bare = createUnit('infantry',team,{badge:false});
    const badge = unit.getObjectByName('team-badge');
    assert(badge?.isGroup && badge.userData.teamBadge === true);
    assert.equal(badge.userData.team,team);
    assert.equal(badge.userData.symbol,team === 'red' ? 'gold-star' : 'toy-blaster');
    const badgeBounds = new THREE.Box3().setFromObject(badge), bareBounds = new THREE.Box3().setFromObject(bare);
    assert(badgeBounds.min.y > bareBounds.max.y+0.1, 'icon floats clear of head');
    assert.equal(bare.getObjectByName('team-badge'),undefined);
    disposeUnit(unit); disposeUnit(bare);
  }
});

test('badge faces camera through rotated, uniformly scaled ancestors without rotating the unit', () => {
  const scene = new THREE.Scene(), parent = new THREE.Group(), unit = createUnit('tank','blue');
  parent.rotation.set(0.4,1.1,-0.1); parent.scale.setScalar(0.15);
  unit.rotation.set(0.2,-0.3,0.1); parent.add(unit); scene.add(parent);
  const camera = new THREE.PerspectiveCamera(40,1,0.1,100);
  camera.position.set(4,3,8); camera.lookAt(0,1,0); camera.updateMatrixWorld(true);
  const originalRotation = unit.quaternion.clone();
  scene.updateMatrixWorld(true);
  faceTeamBadge(unit,camera);
  scene.updateMatrixWorld(true);
  const world = unit.getObjectByName('team-badge').getWorldQuaternion(new THREE.Quaternion());
  const view = camera.getWorldQuaternion(new THREE.Quaternion());
  assert(Math.abs(world.dot(view)) > 0.99999, 'billboard orientation follows camera');
  assert(unit.quaternion.equals(originalRotation), 'only badge is rotated');
  faceTeamBadge(new THREE.Group(),camera);
  disposeUnit(unit);
});

test('exported GLBs have valid chunks, geometry, materials and matching provenance hashes', async () => {
  const manifest = JSON.parse(await fs.readFile(asset('models/manifest.json'), 'utf8'));
  assert.equal(manifest.models.length, 5);
  for (const model of manifest.models) {
    const binary = await fs.readFile(asset(`models/${model.file}`));
    assert.equal(binary.readUInt32LE(0), 0x46546c67);
    assert.equal(binary.readUInt32LE(4), 2);
    assert.equal(binary.readUInt32LE(8), binary.length);
    assert.equal(binary.length, model.bytes);
    assert.equal(createHash('sha256').update(binary).digest('hex'), model.sha256);
    const jsonLength = binary.readUInt32LE(12);
    const json = JSON.parse(binary.subarray(20, 20+jsonLength).toString('utf8').trim());
    assert.equal(json.asset.version, '2.0');
    assert(json.nodes.length > 0 && json.meshes.length > 0);
    assert(json.accessors.every(a => a.count > 0));
    for (const mesh of json.meshes) for (const primitive of mesh.primitives) {
      const position = json.accessors[primitive.attributes.POSITION];
      assert.equal(position.type, 'VEC3');
      assert(position.min.every(Number.isFinite) && position.max.every(Number.isFinite));
      assert(json.materials[primitive.material]);
    }
  }
  const zip = await fs.readFile(asset('models/miniaturas-3d.zip'));
  assert.equal(zip.readUInt32LE(0), 0x04034b50);
});

test('explosion atlas is RGBA, has 32 cells and matches its generator manifest', async () => {
  const manifest = JSON.parse(await fs.readFile(asset('sprites-manifest.json'), 'utf8'));
  const png = await fs.readFile(asset('explosions.png'));
  assert.equal(png.subarray(1,4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 2048);
  assert.equal(png.readUInt32BE(20), 1024);
  assert.equal(png[25], 6, 'RGBA PNG colour type');
  assert.equal(manifest.atlas.columns * manifest.atlas.rows, 32);
  assert.equal(manifest.atlas.frames, 32);
  for (const file of manifest.files) {
    const binary = await fs.readFile(asset(file.file));
    assert.equal(createHash('sha256').update(binary).digest('hex'), file.sha256);
  }
});

test('explosions enforce a cap, reject invalid coordinates, expire, and dispose all owned textures', () => {
  const original = THREE.TextureLoader.prototype.load;
  const atlas = new THREE.Texture();
  let atlasDisposals = 0;
  atlas.addEventListener('dispose', () => atlasDisposals++);
  THREE.TextureLoader.prototype.load = () => atlas;
  try {
    const scene = new THREE.Scene(), effects = new WarEffects(scene);
    effects.spawn(new THREE.Vector3(Number.NaN,0,0));
    effects.spawn(new THREE.Vector3(), -1);
    assert.equal(scene.children.length, 0);
    let disposedTextures = 0, spawned = 0;
    for (let i=0; i<50; i++) {
      effects.spawn(new THREE.Vector3(i,0,0));
      scene.children.at(-1).material.map.addEventListener('dispose', () => disposedTextures++);
      spawned++;
      assert(scene.children.length <= 24);
    }
    assert.equal(scene.children.length, 24);
    effects.update(0.5);
    assert(scene.children.every(s => s.material.map.offset.x >= 0 && s.material.map.offset.y >= 0));
    effects.update(10);
    assert.equal(scene.children.length, 0);
    assert.equal(disposedTextures, spawned);
    effects.spawn(new THREE.Vector3());
    effects.dispose();
    effects.dispose();
    effects.spawn(new THREE.Vector3());
    assert.equal(scene.children.length, 0);
    assert.equal(atlasDisposals, 1);
  } finally { THREE.TextureLoader.prototype.load = original; }
});
