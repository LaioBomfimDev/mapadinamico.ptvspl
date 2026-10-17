import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MapModelCache, isMapSharedResource } from '../lib/war/map-model-cache.ts';
import { animateUnit } from '../lib/war/unit-models.ts';
import { ToyDebris } from '../lib/war/destruction.ts';

test('cached clones share GPU resources while animation, casualties and team colours remain independent', () => {
  const cache=new MapModelCache(), first=cache.unit('infantry','red'), second=cache.unit('infantry','red'), blue=cache.unit('infantry','blue');
  const meshes=root=>{const list=[];root.traverse(o=>{if(o instanceof THREE.Mesh)list.push(o);});return list;};
  const a=meshes(first), b=meshes(second), c=meshes(blue);
  assert.equal(a[0].geometry,b[0].geometry);assert.equal(a[0].material,b[0].material);assert.notEqual(a[0].material,c[0].material);
  animateUnit(first,1,true);assert.notEqual(first.getObjectByName('body').position.y,second.getObjectByName('body').position.y);
  const scene=new THREE.Scene();scene.add(first,second);const debris=new ToyDebris(scene);
  assert.ok(debris.shatter(first,42));assert.equal(first.visible,false);assert.equal(second.visible,true);
  assert.ok(meshes(second).every(mesh=>isMapSharedResource(mesh.geometry)&&isMapSharedResource(mesh.material)));
  debris.dispose();cache.dispose();
});

test('camps reuse a normalized template and the cache disposes each shared resource only once', () => {
  const cache=new MapModelCache(), small=cache.camp('blue',.1), large=cache.camp('blue',2), geometries=new Set(),materials=new Set();
  assert.equal(large.scale.x/small.scale.x,20);assert.equal(large.userData.surfaceY,.08);
  small.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);materials.add(o.material);}});
  let disposals=0;for(const resource of [...geometries,...materials])resource.addEventListener('dispose',()=>disposals++);
  cache.dispose();cache.dispose();assert.equal(disposals,geometries.size+materials.size);
  assert.ok([...geometries,...materials].every(resource=>!isMapSharedResource(resource)));
  assert.throws(()=>cache.unit('tank','red'),/disposed/);assert.throws(()=>new MapModelCache().camp('red',NaN),/Invalid/);
});
