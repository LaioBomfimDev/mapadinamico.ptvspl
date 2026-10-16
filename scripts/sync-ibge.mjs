import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const localityUrl = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome';
const geometryUrl = 'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=UF&formato=application/vnd.geo%2Bjson&qualidade=minima';
async function get(url) { const response = await fetch(url, { signal: AbortSignal.timeout(45000) }); if (!response.ok) throw Error(`${response.status}: ${url}`); return response.json(); }
const [localities, geo] = await Promise.all([get(localityUrl), get(geometryUrl)]);
if (localities.length !== 27 || geo.type !== 'FeatureCollection' || geo.features.length !== 27) throw Error('IBGE must return exactly 27 UFs.');
const records = geo.features.map(feature => {
  const id = String(feature.properties.codarea), state = localities.find(state => String(state.id) === id);
  if (!state || !['MultiPolygon', 'Polygon'].includes(feature.geometry.type)) throw Error(`Unexpected geometry: ${id}`);
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  for (const polygon of polygons) for (const ring of polygon) if (ring.length < 4 || !ring.every(point => point.length >= 2 && point.every(Number.isFinite))) throw Error(`Invalid ring: ${id}`);
  return { id, uf: state.sigla, name: state.nome, polygons };
}).sort((a,b) => a.id.localeCompare(b.id));
if (new Set(records.map(state => state.id)).size !== 27) throw Error('Repeated UF.');
const bytes = JSON.stringify(records);
const out = new URL('../public/war-assets/', import.meta.url); await fs.mkdir(out, { recursive: true });
await fs.writeFile(new URL('brazil-states.json', out), bytes);
await fs.writeFile(new URL('geography-source.json', out), JSON.stringify({ provider: 'IBGE', fetchedAt: new Date().toISOString(), localityUrl, geometryUrl, period: 'API default; no fixed period requested', simplification: 'minima', units: 27, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: Buffer.byteLength(bytes), documentation: 'https://servicodados.ibge.gov.br/api/docs/malhas?versao=3' }, null, 2));
console.log(`IBGE: ${records.length} UFs, ${Buffer.byteLength(bytes)} bytes, geometry saved.`);
