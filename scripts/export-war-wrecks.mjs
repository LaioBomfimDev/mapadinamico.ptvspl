import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { strict as assert } from 'node:assert';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createUnit, disposeUnit, UNIT_MODELS } from '../lib/war/unit-models.ts';
import { ToyDebris } from '../lib/war/destruction.ts';

globalThis.FileReader ??= class {
  result = null; onloadend = null; onerror = null;
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }).catch(error => this.onerror?.(error)); }
  readAsDataURL(blob) { blob.arrayBuffer().then(result => { this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`; this.onloadend?.(); }).catch(error => this.onerror?.(error)); }
};

const output = fileURLToPath(new URL('../public/war-assets/wrecks/', import.meta.url));
const previews = fileURLToPath(new URL('../public/war-assets/previews/', import.meta.url));
await fs.mkdir(output,{recursive:true}); await fs.mkdir(previews,{recursive:true});
const exporter = new GLTFExporter(), files = [];
const manifest = {
  name: 'Projeto 2 — miniaturas desmontadas', format: 'glTF 2.0 binary',
  origin: 'Original unit primitive geometry, disassembled by the runtime ToyDebris implementation; no replacement cubes or external model.',
  source: ['lib/war/unit-models.ts','lib/war/destruction.ts'], generator: 'scripts/export-war-wrecks.mjs',
  unit: 'toy-scale', up: 'Y', groundY: 0, teamBadges: false, teams: ['red','blue'],
  notes: 'Static settled visual wreckage, preserving original unit vertices/materials. Infantry is fallen; vehicles are separated into their original toy parts. Inventory is not affected.',
  models: [],
};

for (const [index, info] of UNIT_MODELS.entries()) for (const team of ['red','blue']) {
  const scene = new THREE.Scene(), source = createUnit(info.kind,team,{badge:false});
  scene.add(source);
  const manager = new ToyDebris(scene,{groundY:0,maxWrecks:1,maxPieces:1000});
  const seed = 1337 + index*997;
  const wreck = manager.shatter(source,seed,true);
  assert(wreck && wreck.userData.settled === true, `${info.kind}/${team}: settled wreck required`);
  assert.equal(wreck.getObjectByName('team-badge'),undefined, 'badge must not appear among debris');
  wreck.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(wreck), dimensions = bounds.getSize(new THREE.Vector3());
  assert(bounds.min.y >= -1e-5, `${info.kind}: no piece below ground`);
  let vertices = 0, triangles = 0;
  wreck.traverse(mesh => {
    if (!mesh.isMesh) return;
    assert(!mesh.userData.teamBadge && !mesh.geometry.userData.teamBadge, `${info.kind}: badge excluded`);
    const positions = mesh.geometry.getAttribute('position');
    assert([...positions.array].every(Number.isFinite), `${info.kind}: finite wreck geometry`);
    vertices += positions.count;
    triangles += (mesh.geometry.index?.count ?? positions.count)/3;
  });
  const name = `${info.kind}-${team}-broken`, filename = `${name}.glb`;
  const binary = Buffer.from(await exporter.parseAsync(wreck,{binary:true,onlyVisible:true}));
  validateGlb(binary,name);
  await fs.writeFile(path.join(output,filename),binary);
  await fs.writeFile(path.join(previews,`${name}.svg`),renderSvg(wreck,info.name,team));
  files.push({name:filename,buffer:binary});
  manifest.models.push({kind:info.kind,name:info.name,team,file:filename,seed,pieces:wreck.userData.pieceCount,
    bytes:binary.length,sha256:createHash('sha256').update(binary).digest('hex'),vertices,triangles,
    bounds:{min:bounds.min.toArray().map(n=>+n.toFixed(5)),max:bounds.max.toArray().map(n=>+n.toFixed(5))},
    dimensions:dimensions.toArray().map(n=>+n.toFixed(4)),preview:`../previews/${name}.png`,
  });
  console.log(`${filename}: ${wreck.userData.pieceCount} original pieces, ${triangles} triangles, ${binary.length} bytes.`);
  manager.dispose(); disposeUnit(source);
}

const license = Buffer.from('Projeto 2 — destroços das miniaturas originais\n\nDez modelos glTF 2.0 binários: cinco tipos, duas equipes.\nDerivados das mesmas primitivas dos modelos originais, pela implementação ToyDebris do projeto.\nNenhum distintivo de equipe compõe os destroços. Inventário e pontuação não são alterados.\nArte por código, sem modelos/texturas de terceiros ou créditos pagos. Direitos acompanham o projeto do usuário.\n');
const manifestBuffer = Buffer.from(JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile(path.join(output,'manifest.json'),manifestBuffer);
await fs.writeFile(path.join(output,'LICENSE.txt'),license);
files.push({name:'manifest.json',buffer:manifestBuffer},{name:'LICENSE.txt',buffer:license});
const zip = createZip(files);
await fs.writeFile(path.join(output,'miniaturas-destrocos.zip'),zip);
console.log(`Validated ${manifest.models.length} wreck GLBs; ZIP ${zip.length} bytes.`);

function validateGlb(binary,label) {
  assert(binary.length>=28 && binary.readUInt32LE(0)===0x46546c67,`${label}: GLB header`);
  assert.equal(binary.readUInt32LE(4),2); assert.equal(binary.readUInt32LE(8),binary.length);
  let offset=12,json,bin;
  while (offset<binary.length) {
    const length=binary.readUInt32LE(offset),type=binary.readUInt32LE(offset+4);
    assert(length%4===0 && offset+8+length<=binary.length,`${label}: chunk bounds`);
    if(type===0x4e4f534a) json=JSON.parse(binary.subarray(offset+8,offset+8+length).toString('utf8').trim());
    if(type===0x004e4942) bin=binary.subarray(offset+8,offset+8+length);
    offset+=8+length;
  }
  assert.equal(offset,binary.length);
  assert(json?.asset?.version==='2.0' && json.meshes?.length && bin?.length,`${label}: contents`);
  assert(!json.nodes.some(node=>node.name?.includes('team-badge')),`${label}: badge omitted`);
  for(const view of json.bufferViews) assert((view.byteOffset??0)+view.byteLength<=bin.length,`${label}: buffer range`);
  for(const mesh of json.meshes) for(const primitive of mesh.primitives) {
    const position=json.accessors[primitive.attributes.POSITION];
    assert(position?.type==='VEC3' && position.count>0,`${label}: positions`);
    assert(position.min.every(Number.isFinite) && position.max.every(Number.isFinite),`${label}: bounds`);
    assert(primitive.material<json.materials.length,`${label}: material`);
  }
}

function renderSvg(root,name,team) {
  const camera=new THREE.OrthographicCamera(-2.1,2.1,1.97,-1.97,0.1,20);
  camera.position.set(3.8,4.8,4.8); camera.lookAt(0,0.2,0); camera.updateMatrixWorld(true); root.updateMatrixWorld(true);
  const light=new THREE.Vector3(-0.5,1,0.7).normalize(), normal=new THREE.Vector3(), edge=new THREE.Vector3(), polygons=[];
  root.traverse(mesh=>{
    if(!mesh.isMesh) return;
    const positions=mesh.geometry.getAttribute('position'), indices=mesh.geometry.index;
    const count=indices?.count??positions.count;
    for(let i=0;i<count;i+=3) {
      const points=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(positions,indices?indices.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));
      normal.subVectors(points[1],points[0]).cross(edge.subVectors(points[2],points[0])).normalize();
      const center=points[0].clone().add(points[1]).add(points[2]).multiplyScalar(1/3);
      if(normal.dot(camera.position.clone().sub(center))<=0) continue;
      const color=mesh.material.color.clone().multiplyScalar(0.66+Math.max(0,normal.dot(light))*0.42).convertLinearToSRGB().getHexString(THREE.LinearSRGBColorSpace);
      const depth=center.applyMatrix4(camera.matrixWorldInverse).z;
      const projected=points.map(p=>p.project(camera)).map(p=>`${((p.x+1)*160).toFixed(2)},${((1-p.y)*150).toFixed(2)}`).join(' ');
      polygons.push({depth,text:`<polygon points="${projected}" fill="#${color}"/>`});
    }
  });
  polygons.sort((a,b)=>a.depth-b.depth);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="338" viewBox="0 0 320 338"><rect width="320" height="338" rx="24" fill="#e4eee0"/><ellipse cx="160" cy="194" rx="122" ry="62" fill="#b9d1b1"/>${polygons.map(p=>p.text).join('')}<text x="160" y="310" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="700" fill="#233c43">${name} · ${team==='red'?'13':'22'}</text><text x="160" y="329" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#5b7476">MESMAS PEÇAS · MINIATURA DESMONTADA</text></svg>\n`;
}

function createZip(files) {
  const records=[],directory=[]; let offset=0;
  for(const file of files) {
    const name=Buffer.from(file.name,'utf8'),compressed=deflateRawSync(file.buffer,{level:9}),checksum=crc32(file.buffer);
    const local=Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50,0); local.writeUInt16LE(20,4); local.writeUInt16LE(0x800,6); local.writeUInt16LE(8,8); local.writeUInt16LE(0x21,12);
    local.writeUInt32LE(checksum,14); local.writeUInt32LE(compressed.length,18); local.writeUInt32LE(file.buffer.length,22); local.writeUInt16LE(name.length,26);
    records.push(local,name,compressed);
    const central=Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50,0); central.writeUInt16LE(20,4); central.writeUInt16LE(20,6); central.writeUInt16LE(0x800,8); central.writeUInt16LE(8,10); central.writeUInt16LE(0x21,14);
    central.writeUInt32LE(checksum,16); central.writeUInt32LE(compressed.length,20); central.writeUInt32LE(file.buffer.length,24); central.writeUInt16LE(name.length,28); central.writeUInt32LE(offset,42);
    directory.push(central,name); offset+=local.length+name.length+compressed.length;
  }
  const centralBuffer=Buffer.concat(directory),end=Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50,0); end.writeUInt16LE(files.length,8); end.writeUInt16LE(files.length,10); end.writeUInt32LE(centralBuffer.length,12); end.writeUInt32LE(offset,16);
  return Buffer.concat([...records,centralBuffer,end]);
}
function crc32(buffer) { let crc=0xffffffff; for(const byte of buffer) { crc^=byte; for(let bit=0;bit<8;bit++) crc=(crc>>>1)^((crc&1)?0xedb88320:0); } return(crc^0xffffffff)>>>0; }
