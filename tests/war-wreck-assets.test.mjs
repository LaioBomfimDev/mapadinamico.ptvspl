import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { createUnit, disposeUnit, UNIT_MODELS } from '../lib/war/unit-models.ts';

const asset = name => new URL(`../public/war-assets/wrecks/${name}`, import.meta.url);

test('ten broken GLBs have valid chunks/materials/hashes and preserve the original unit triangle counts', async () => {
  const manifest = JSON.parse(await fs.readFile(asset('manifest.json'),'utf8'));
  assert.equal(manifest.models.length,10);
  assert.equal(manifest.teamBadges,false);
  const variants = new Set();
  for (const model of manifest.models) {
    variants.add(`${model.kind}/${model.team}`);
    const binary = await fs.readFile(asset(model.file));
    assert.equal(binary.readUInt32LE(0),0x46546c67);
    assert.equal(binary.readUInt32LE(4),2);
    assert.equal(binary.readUInt32LE(8),binary.length);
    assert.equal(binary.length,model.bytes);
    assert.equal(createHash('sha256').update(binary).digest('hex'),model.sha256);
    let offset=12,json,bin;
    while (offset<binary.length) {
      const size=binary.readUInt32LE(offset),type=binary.readUInt32LE(offset+4);
      assert.equal(size%4,0);
      assert(offset+size+8<=binary.length);
      if (type===0x4e4f534a) json=JSON.parse(binary.subarray(offset+8,offset+8+size).toString('utf8').trim());
      if (type===0x004e4942) bin=binary.subarray(offset+8,offset+8+size);
      offset+=size+8;
    }
    assert.equal(offset,binary.length);
    assert.equal(json.asset.version,'2.0');
    assert(json.meshes.length>0 && bin.length>0);
    assert(!json.nodes.some(n=>n.name?.includes('team-badge') || n.extras?.teamBadge));
    const root=json.nodes.find(n=>n.extras?.wreckage);
    assert(root?.extras.settled);
    assert.equal(root.extras.pieceCount,model.pieces);
    for (const view of json.bufferViews) assert((view.byteOffset??0)+view.byteLength<=bin.length);
    for (const mesh of json.meshes) for (const primitive of mesh.primitives) {
      const positions=json.accessors[primitive.attributes.POSITION];
      assert.equal(positions.type,'VEC3');
      assert(positions.min.every(Number.isFinite) && positions.max.every(Number.isFinite));
      assert(json.materials[primitive.material]);
    }
    const source=createUnit(model.kind,model.team,{badge:false});
    let triangles=0,pieces=0;
    source.traverse(mesh=>{
      if (!mesh.isMesh) return;
      triangles+=(mesh.geometry.index?.count??mesh.geometry.getAttribute('position').count)/3;
      pieces+=mesh.geometry.userData.pieceRanges.length;
    });
    // The only added mesh is the 20-triangle circular impact mark.
    assert.equal(model.triangles,triangles+20,`${model.kind}: original triangles retained`);
    assert.equal(model.pieces,pieces,`${model.kind}: original parts retained`);
    assert(model.bounds.min[1]>=0, 'nothing below ground');
    disposeUnit(source);
  }
  for (const {kind} of UNIT_MODELS) for (const team of ['red','blue']) assert(variants.has(`${kind}/${team}`));
  for (const {kind} of UNIT_MODELS) {
    const pair=manifest.models.filter(m=>m.kind===kind);
    assert.equal(pair[0].seed,pair[1].seed);
    assert.deepEqual(pair[0].bounds,pair[1].bounds,'same seed and original geometry, different team palette');
  }
});

test('broken-miniature ZIP has twelve valid CRC-checked entries and the manifest matches the standalone files', async () => {
  const zip=await fs.readFile(asset('miniaturas-destrocos.zip'));
  let offset=0; const files=new Map();
  while (zip.readUInt32LE(offset)===0x04034b50) {
    const compression=zip.readUInt16LE(offset+8),checksum=zip.readUInt32LE(offset+14);
    const packed=zip.readUInt32LE(offset+18),original=zip.readUInt32LE(offset+22),nameLength=zip.readUInt16LE(offset+26),extraLength=zip.readUInt16LE(offset+28);
    assert.equal(compression,8);
    const name=zip.subarray(offset+30,offset+30+nameLength).toString('utf8');
    const start=offset+30+nameLength+extraLength,content=inflateRawSync(zip.subarray(start,start+packed));
    assert.equal(content.length,original);
    assert.equal(crc32(content),checksum);
    assert(!files.has(name)); files.set(name,content);
    assert.deepEqual(content,await fs.readFile(asset(name)));
    offset=start+packed;
  }
  assert.equal(zip.readUInt32LE(offset),0x02014b50);
  assert.equal(files.size,12);
  assert(files.has('manifest.json') && files.has('LICENSE.txt'));
  assert.equal([...files.keys()].filter(name=>name.endsWith('.glb')).length,10);
});

function crc32(buffer) { let crc=0xffffffff; for (const byte of buffer) { crc^=byte; for(let bit=0;bit<8;bit++) crc=(crc>>>1)^((crc&1)?0xedb88320:0); } return(crc^0xffffffff)>>>0; }
