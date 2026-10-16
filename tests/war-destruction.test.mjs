import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createUnit, disposeUnit, UNIT_MODELS } from '../lib/war/unit-models.ts';
import { ToyDebris } from '../lib/war/destruction.ts';

function bodyMeshes(root) {
  const result = []; root.traverse(object => { if (!object.isMesh) return; let parent = object; while (parent && parent !== root) { if (parent.userData.teamBadge) return; parent = parent.parent; } result.push(object); }); return result;
}
const vertexCount = root => bodyMeshes(root).reduce((sum, mesh) => sum + mesh.geometry.getAttribute('position').count, 0);
test('all ten wrecks contain the original primitive pieces and colours, with no floating emblem', () => {
  for (const {kind} of UNIT_MODELS) for (const team of ['red', 'blue']) {
    const scene = new THREE.Scene(), source = createUnit(kind, team); scene.add(source);
    const original = bodyMeshes(source), expected = original.reduce((sum, mesh) => sum + mesh.geometry.userData.pieceRanges.length, 0), vertices = vertexCount(source);
    const colours = new Set(original.map(mesh => mesh.material.color.getHexString()));
    const debris = new ToyDebris(scene, {groundY:0}), wreck = debris.shatter(source, 42);
    assert(wreck); assert.equal(debris.pieceCount, expected); assert.equal(wreck.children[0].children.length, expected); assert.equal(source.visible, false);
    assert.equal(wreck.getObjectByName('team-badge'), undefined); assert.equal(vertexCount(wreck.children[0]), vertices);
    for (const piece of wreck.children[0].children) { assert(colours.has(piece.material.color.getHexString())); assert(piece.userData.originalPiece.count > 0); }
    debris.dispose(); disposeUnit(source);
  }
});
test('initial fragments reproduce original geometry in world space under translation, yaw and scale', () => {
  const scene = new THREE.Scene(), parent = new THREE.Group(); parent.position.set(12,.68,-4); scene.add(parent);
  const unit = createUnit('tank','blue'); unit.position.set(.2,.055,-.1); unit.rotation.y = .4; unit.scale.setScalar(.3); parent.add(unit); unit.updateWorldMatrix(true,true);
  const expected=[]; for (const mesh of bodyMeshes(unit)) { const positions = mesh.geometry.getAttribute('position'); for(let i=0;i<positions.count;i++) expected.push(new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld)); }
  const debris = new ToyDebris(scene), wreck = debris.shatter(unit,5); wreck.updateWorldMatrix(true,true);
  const actual=[]; for (const mesh of wreck.children[0].children) { const positions=mesh.geometry.getAttribute('position'); for(let i=0;i<positions.count;i++) actual.push(new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld)); }
  assert.equal(actual.length,expected.length); actual.forEach((point,i)=>assert(point.distanceTo(expected[i])<1e-5)); debris.dispose(); disposeUnit(unit);
});
test('pieces land above the floor, batch by material and remain after all motion ends', () => {
  for (const {kind} of UNIT_MODELS) {
    const scene = new THREE.Scene(), unit = createUnit(kind,'red'); scene.add(unit); const debris = new ToyDebris(scene,{groundY:0}), wreck = debris.shatter(unit,17), count = wreck.children[0].children.length, vertices=vertexCount(wreck.children[0]);
    for(let i=0;i<20;i++) { debris.update(.1); const box = new THREE.Box3().setFromObject(wreck.children[0]); assert(box.min.y>=-1e-5,`${kind}: no underground fragments`); }
    assert.equal(debris.activeCount,0); assert.equal(debris.count,1); assert.equal(wreck.userData.settled,true); assert.equal(unit.visible,false); assert(wreck.children[0].children.length<count); assert.equal(vertexCount(wreck.children[0]),vertices);
    assert(wreck.getObjectByName('impact-mark')); const final = wreck.children[0].children.map(mesh=>Array.from(mesh.geometry.getAttribute('position').array)); debris.update(900); assert.deepEqual(wreck.children[0].children.map(mesh=>Array.from(mesh.geometry.getAttribute('position').array)),final);
    if(kind==='infantry') assert(new THREE.Box3().setFromObject(wreck.children[0]).getSize(new THREE.Vector3()).y<.7,'fallen infantry lies low');
    debris.dispose(); disposeUnit(unit);
  }
});
test('same seed settles identically despite different update step sizes', () => {
  const outputs=[];
  for (const steps of [[5], Array(80).fill(.025)]) { const scene=new THREE.Scene(), unit=createUnit('aircraft','blue'); scene.add(unit); const debris=new ToyDebris(scene,{groundY:0}); const wreck=debris.shatter(unit,999); for(const delta of steps)debris.update(delta); outputs.push(wreck.children[0].children.map(mesh=>Array.from(mesh.geometry.getAttribute('position').array))); debris.dispose(); disposeUnit(unit); }
  assert.deepEqual(outputs[0],outputs[1]);
});
test('repeat impacts, invalid deltas and caps cannot duplicate wrecks or silently hide another model', () => {
  const scene=new THREE.Scene(), first=createUnit('infantry'), second=createUnit('tank'); scene.add(first,second); const debris=new ToyDebris(scene,{groundY:0,maxWrecks:1});
  assert(debris.shatter(first,1)); assert.equal(debris.shatter(first,2),null); assert.equal(debris.shatter(second,3),null); assert.equal(second.visible,true); assert.equal(debris.count,1);
  const firstPiece=scene.children.find(o=>o.userData.wreckage).children[0].children[0], previous=firstPiece.position.clone(); debris.update(Number.NaN); debris.update(-1); assert(firstPiece.position.equals(previous));
  debris.clear(); assert.equal(debris.count,0); assert.equal(debris.pieceCount,0); assert.equal(first.visible,true); assert(debris.shatter(first,1)); debris.dispose(); assert.equal(debris.shatter(second,1),null); disposeUnit(first);disposeUnit(second);
});
test('reconstruction restores the same original without disposing its geometry or touching user data', () => {
  const scene=new THREE.Scene(), source=createUnit('drone','blue'); source.userData.inventory={drone:8}; source.userData.points=123; scene.add(source); const snapshot=JSON.stringify({inventory:source.userData.inventory,points:source.userData.points}); let originalDisposals=0;
  bodyMeshes(source).forEach(mesh=>{mesh.geometry.addEventListener('dispose',()=>originalDisposals++);mesh.material.addEventListener('dispose',()=>originalDisposals++);});
  const debris=new ToyDebris(scene,{groundY:0}), wreck=debris.shatter(source,7); debris.update(4); let wreckDisposals=0; wreck.traverse(o=>{if(o.isMesh)o.geometry.addEventListener('dispose',()=>wreckDisposals++);});
  debris.clear(); assert.equal(source.visible,true);assert.equal(source.userData.casualty,false);assert.equal(originalDisposals,0);assert(wreckDisposals>0);assert.equal(JSON.stringify({inventory:source.userData.inventory,points:source.userData.points}),snapshot);debris.dispose();disposeUnit(source);
});
