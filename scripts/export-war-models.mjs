import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { strict as assert } from 'node:assert';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createUnit, disposeUnit, UNIT_MODELS } from '../lib/war/unit-models.ts';

globalThis.FileReader ??= class {
  result = null; onloadend = null; onerror = null;
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }).catch(error => this.onerror?.(error)); }
  readAsDataURL(blob) { blob.arrayBuffer().then(result => { this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`; this.onloadend?.(); }).catch(error => this.onerror?.(error)); }
};

const output = fileURLToPath(new URL('../public/war-assets/models/', import.meta.url));
const previews = fileURLToPath(new URL('../public/war-assets/previews/', import.meta.url));
await fs.mkdir(output, { recursive: true });
await fs.mkdir(previews, { recursive: true });
const exporter = new GLTFExporter();
const files = [];
const manifest = {
  name: 'Projeto 2 — miniaturas originais', format: 'glTF 2.0 binary',
  origin: 'Procedural geometry created for this project; no external model, downloaded texture or paid generation.',
  source: 'lib/war/unit-models.ts', generator: 'scripts/export-war-models.mjs',
  unit: 'toy-scale', up: 'Y', front: '+Z', team: 'red', runtimeTeams: ['red', 'blue'],
  notes: 'GLBs contain the red palette. Runtime createUnit(kind, team) creates either team. Animation transforms are provided by animateUnit; no baked GLB animation clips.',
  models: [],
};

for (const info of UNIT_MODELS) {
  const root = createUnit(info.kind, 'red');
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const dimensions = bounds.getSize(new THREE.Vector3());
  if (!['drone', 'aircraft'].includes(info.kind)) assert(Math.abs(bounds.min.y) < 1e-5, `${info.kind}: floor alignment`);
  let triangles = 0, vertices = 0, drawCalls = 0;
  root.traverse(object => {
    if (!object.isMesh) return;
    const positions = object.geometry.getAttribute('position');
    assert(positions.count > 0 && [...positions.array].every(Number.isFinite), `${info.kind}: finite geometry`);
    triangles += (object.geometry.index?.count ?? positions.count) / 3;
    vertices += positions.count;
    drawCalls++;
  });
  const result = await exporter.parseAsync(root, { binary: true, onlyVisible: true });
  assert(result instanceof ArrayBuffer);
  const binary = Buffer.from(result);
  validateGlb(binary, info.kind);
  const filename = `${info.kind}.glb`;
  await fs.writeFile(path.join(output, filename), binary);
  const svg = renderSvg(root, info.name);
  await fs.writeFile(path.join(previews, `${info.kind}.svg`), svg);
  files.push({ name: filename, buffer: binary });
  manifest.models.push({ ...info, file: filename, bytes: binary.length, sha256: createHash('sha256').update(binary).digest('hex'),
    dimensions: dimensions.toArray().map(n => +n.toFixed(4)), bounds: { min: bounds.min.toArray().map(n => +n.toFixed(5)), max: bounds.max.toArray().map(n => +n.toFixed(5)) },
    triangles, vertices, drawCalls, preview: `../previews/${info.kind}.svg`,
  });
  console.log(`${filename}: ${triangles} triangles, ${drawCalls} draws, ${binary.length} bytes, ${dimensions.toArray().map(n => n.toFixed(2)).join(' × ')}`);
  disposeUnit(root);
}

const license = Buffer.from('Projeto 2 — miniaturas 3D originais\n\nAs cinco miniaturas e efeitos foram criados por código para este projeto, sem assets externos ou créditos pagos.\nOs direitos dos assets acompanham o projeto do usuário. Não foram extraídos ou copiados dos sites de referência.\nModelos GLB: eixo Y para cima, frente +Z, paleta vermelha. A fábrica no código suporta vermelho/azul.\nMovimentos articulados são animados no código; os GLBs contêm a pose estática, sem clipes de animação.\n');
const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
await fs.writeFile(path.join(output, 'manifest.json'), manifestBuffer);
await fs.writeFile(path.join(output, 'LICENSE.txt'), license);
files.push({ name: 'manifest.json', buffer: manifestBuffer }, { name: 'LICENSE.txt', buffer: license });
const zip = createZip(files);
await fs.writeFile(path.join(output, 'miniaturas-3d.zip'), zip);
console.log(`Validated ${manifest.models.length} GLBs; miniaturas-3d.zip: ${zip.length} bytes.`);

function validateGlb(binary, label) {
  assert(binary.length >= 28 && binary.readUInt32LE(0) === 0x46546c67, `${label}: GLB header`);
  assert.equal(binary.readUInt32LE(4), 2); assert.equal(binary.readUInt32LE(8), binary.length);
  let offset = 12, json, bin;
  while (offset < binary.length) {
    const length = binary.readUInt32LE(offset), type = binary.readUInt32LE(offset+4);
    assert(length % 4 === 0 && offset+8+length <= binary.length, `${label}: chunk bounds`);
    if (type === 0x4e4f534a) json = JSON.parse(binary.subarray(offset+8, offset+8+length).toString('utf8').trim());
    if (type === 0x004e4942) bin = binary.subarray(offset+8, offset+8+length);
    offset += 8+length;
  }
  assert.equal(offset, binary.length);
  assert(json?.asset?.version === '2.0' && json.meshes?.length && bin?.length, `${label}: contents`);
  for (const view of json.bufferViews) assert((view.byteOffset ?? 0) + view.byteLength <= bin.length, `${label}: buffer range`);
  for (const mesh of json.meshes) for (const primitive of mesh.primitives) {
    const position = json.accessors[primitive.attributes.POSITION];
    assert(position?.type === 'VEC3' && position.count > 0, `${label}: positions`);
    assert(position.min.every(Number.isFinite) && position.max.every(Number.isFinite), `${label}: bounds`);
    assert(primitive.material < json.materials.length, `${label}: material`);
  }
}

/** Orthographic vector preview of the actual meshes; sorted triangles, no browser dependency. */
function renderSvg(root, name) {
  const camera = new THREE.OrthographicCamera(-1.6, 1.6, 1.5, -1.5, 0.1, 20);
  camera.position.set(3.8, 3.0, 4.8); camera.lookAt(0, 0.75, 0); camera.updateMatrixWorld(true);
  const light = new THREE.Vector3(-0.5, 1, 0.7).normalize();
  const normal = new THREE.Vector3(), edge = new THREE.Vector3(), polygons = [];
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const positions = mesh.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i += 3) {
      const points = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(positions, i+j).applyMatrix4(mesh.matrixWorld));
      normal.subVectors(points[1], points[0]).cross(edge.subVectors(points[2], points[0])).normalize();
      const center = points[0].clone().add(points[1]).add(points[2]).multiplyScalar(1/3);
      if (normal.dot(camera.position.clone().sub(center)) <= 0) continue;
      const color = mesh.material.color.clone().multiplyScalar(0.66 + Math.max(0, normal.dot(light))*0.42).convertLinearToSRGB().getHexString(THREE.LinearSRGBColorSpace);
      const depth = center.applyMatrix4(camera.matrixWorldInverse).z;
      const projected = points.map(p => p.project(camera)).map(p => `${((p.x+1)*160).toFixed(2)},${((1-p.y)*150).toFixed(2)}`).join(' ');
      polygons.push({ depth, text: `<polygon points="${projected}" fill="#${color}"/>` });
    }
  });
  polygons.sort((a,b) => a.depth-b.depth);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="338" viewBox="0 0 320 338"><rect width="320" height="338" rx="24" fill="#e4eee0"/><ellipse cx="160" cy="234" rx="100" ry="26" fill="#b9d1b1"/><ellipse cx="160" cy="237" rx="68" ry="15" fill="#94b28e" opacity=".45"/>${polygons.map(p=>p.text).join('')}<text x="160" y="310" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="700" fill="#233c43">${name}</text><text x="160" y="329" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#5b7476">MINIATURA 3D ORIGINAL · PROJETO 2</text></svg>\n`;
}

function createZip(files) {
  const records = [], directory = []; let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8'), compressed = deflateRawSync(file.buffer, { level: 9 }), checksum = crc32(file.buffer);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6); local.writeUInt16LE(8, 8); local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(checksum, 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(file.buffer.length, 22); local.writeUInt16LE(name.length, 26);
    records.push(local, name, compressed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x800, 8); central.writeUInt16LE(8, 10); central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(checksum, 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(file.buffer.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42);
    directory.push(central, name); offset += local.length+name.length+compressed.length;
  }
  const centralBuffer = Buffer.concat(directory), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(centralBuffer.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...records, centralBuffer, end]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) { crc ^= byte; for (let bit=0; bit<8; bit++) crc = (crc>>>1)^((crc&1)?0xedb88320:0); }
  return (crc^0xffffffff)>>>0;
}
