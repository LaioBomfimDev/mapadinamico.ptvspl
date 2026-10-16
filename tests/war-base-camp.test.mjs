import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBaseCamp, CAMP_SLOTS, CAMP_SURFACE_Y } from '../lib/war/base-camp.ts';
import { createUnit, disposeUnit, UNIT_MODELS } from '../lib/war/unit-models.ts';

function dispose(root) {
  const geometries=new Set(),materials=new Set();
  root.traverse(mesh=>{if(mesh.isMesh){geometries.add(mesh.geometry);materials.add(mesh.material);}});
  geometries.forEach(geometry=>geometry.dispose()); materials.forEach(material=>material.dispose());
}

test('base camps are grounded, finite, within the agreed footprint and batched into fewer than twelve draws',()=>{
  for(const team of ['red','blue']) for(const size of [0.1,1,2.7]) {
    const camp=createBaseCamp(team,size),bounds=new THREE.Box3().setFromObject(camp);
    assert.equal(camp.userData.team,team);
    assert(Math.abs(bounds.min.y)<1e-7,'camp platform rests at Y=0');
    assert(bounds.min.x>=-0.64*size-1e-7 && bounds.max.x<=0.64*size+1e-7);
    assert(bounds.min.z>=-0.59*size-1e-7 && bounds.max.z<=0.59*size+1e-7);
    assert.equal(camp.userData.surfaceY,CAMP_SURFACE_Y*size);
    let meshes=0,triangles=0;const materials=new Set();
    camp.traverse(mesh=>{
      if(!mesh.isMesh)return;meshes++;materials.add(mesh.material);
      const positions=mesh.geometry.getAttribute('position');
      assert([...positions.array].every(Number.isFinite));
      assert([...mesh.geometry.getAttribute('normal').array].every(Number.isFinite));
      triangles+=positions.count/3;
      let start=0;
      for(const feature of mesh.geometry.userData.campFeatures){assert.equal(feature.start,start);start+=feature.count;}
      assert.equal(start,positions.count,'feature metadata partitions batched geometry');
    });
    assert(meshes<12 && materials.size<12,'static detail is batched');
    assert(triangles<4000,'miniature camp geometry budget');
    dispose(camp);
  }
});

test('five slots form three front and two rear pads and fit the real unit footprints without overlap',()=>{
  const camp=createBaseCamp('red',1),boxes=[];
  assert.equal(Object.keys(CAMP_SLOTS).length,5);
  assert.equal(Object.values(CAMP_SLOTS).filter(slot=>slot.z>0).length,3);
  assert.equal(Object.values(CAMP_SLOTS).filter(slot=>slot.z<0).length,2);
  const headquarters=camp.getObjectByName('headquarters');
  assert.equal(headquarters.userData.hq,true);
  const hqBox={minX:headquarters.position.x-headquarters.userData.width/2,maxX:headquarters.position.x+headquarters.userData.width/2,
    minZ:headquarters.position.z-headquarters.userData.depth/2,maxZ:headquarters.position.z+headquarters.userData.depth/2};
  for(const {kind} of UNIT_MODELS){
    const slot=CAMP_SLOTS[kind],pad=camp.getObjectByName(`pad-${kind}`),unit=createUnit(kind,'red');
    assert.equal(pad.userData.padKind,kind);
    assert.equal(pad.position.y,CAMP_SURFACE_Y);
    assert([slot.x,slot.z,slot.scale].every(Number.isFinite));
    assert.equal(slot.scale,0.115);
    unit.scale.setScalar(slot.scale);unit.position.set(slot.x,CAMP_SURFACE_Y,slot.z);
    const bounds=new THREE.Box3().setFromObject(unit);
    const padBox={minX:slot.x-pad.userData.padWidth/2,maxX:slot.x+pad.userData.padWidth/2,minZ:slot.z-pad.userData.padDepth/2,maxZ:slot.z+pad.userData.padDepth/2};
    assert(bounds.min.x>=padBox.minX && bounds.max.x<=padBox.maxX,`${kind}: horizontal footprint fits pad`);
    assert(bounds.min.z>=padBox.minZ && bounds.max.z<=padBox.maxZ,`${kind}: longitudinal footprint fits pad`);
    assert(!overlaps(padBox,hqBox),`${kind}: pad clear of HQ`);
    for(const previous of boxes)assert(!overlaps(padBox,previous),`${kind}: no pad overlap`);
    boxes.push(padBox);
    if(kind==='drone'||kind==='aircraft')assert(bounds.min.y>CAMP_SURFACE_Y,'air units have flight clearance');
    disposeUnit(unit);
  }
  assert.equal(camp.getObjectByName('pad-drone').userData.helipad,true);
  const gate=camp.getObjectByName('front-gate');assert.equal(gate.userData.gate,true);
  assert(gate.position.z>0 && gate.userData.clearWidth>0.28,'front gate wider than largest vehicle');
  dispose(camp);
});

test('camp resources are isolated between instances and invalid sizes cannot create corrupt geometry',()=>{
  const first=createBaseCamp('red',1),second=createBaseCamp('blue',1),geometries=new Set(),materials=new Set();
  first.traverse(mesh=>{if(mesh.isMesh){geometries.add(mesh.geometry);materials.add(mesh.material);}});
  second.traverse(mesh=>{if(mesh.isMesh){assert(!geometries.has(mesh.geometry));assert(!materials.has(mesh.material));}});
  dispose(first);dispose(second);
  for(const size of [0,-1,Number.NaN,Infinity,-Infinity])assert.throws(()=>createBaseCamp('red',size),RangeError);
  assert(Object.isFrozen(CAMP_SLOTS) && Object.values(CAMP_SLOTS).every(Object.isFrozen),'layout constants cannot be mutated by an instance');
});

function overlaps(a,b){return a.minX<b.maxX && a.maxX>b.minX && a.minZ<b.maxZ && a.maxZ>b.minZ;}
