import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const localityUrl = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome';
const geometryUrl = 'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=UF&formato=application/vnd.geo%2Bjson&qualidade=minima';
const baLocalityUrl = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados/29/municipios?orderBy=nome';
const baGeometryUrl = 'https://servicodados.ibge.gov.br/api/v3/malhas/estados/29?intrarregiao=municipio&formato=application/vnd.geo%2Bjson&qualidade=intermediaria';
async function get(url) { const response = await fetch(url, { signal: AbortSignal.timeout(45000) }); if (!response.ok) throw Error(`${response.status}: ${url}`); return response.json(); }
const [localities, geo, baLocalities, baGeo] = await Promise.all([get(localityUrl), get(geometryUrl), get(baLocalityUrl), get(baGeometryUrl)]);
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

function ringArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) area += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return area / 2;
}
function ringCentroid(ring) {
  let x = 0, y = 0, area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const cross = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    x += (ring[j][0] + ring[i][0]) * cross; y += (ring[j][1] + ring[i][1]) * cross; area += cross;
  }
  return Math.abs(area) < 1e-12 ? ring[0] : [x / (3 * area), y / (3 * area)];
}
function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
function pointInPolygons(point, polygons) {
  return polygons.some(polygon => pointInRing(point, polygon[0]) && !polygon.slice(1).some(hole => pointInRing(point, hole)));
}
function pointClearance(point, polygons) {
  let nearest = Infinity;
  for (const polygon of polygons) for (const ring of polygon) for (let i = 1; i < ring.length; i++) {
    const [ax, ay] = ring[i - 1], [bx, by] = ring[i], dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((point[0] - ax) * dx + (point[1] - ay) * dy) / (dx * dx + dy * dy || 1)));
    nearest = Math.min(nearest, Math.hypot(point[0] - ax - t * dx, point[1] - ay - t * dy));
  }
  return nearest;
}
function representativePoint(polygons) {
  const largest = [...polygons].sort((a, b) => Math.abs(ringArea(b[0])) - Math.abs(ringArea(a[0])))[0];
  const centroid = ringCentroid(largest[0]);
  if (pointInPolygons(centroid, polygons)) return { point: centroid, clearance: pointClearance(centroid, polygons) };
  const points = largest[0], xs = points.map(point => point[0]), ys = points.map(point => point[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  let best = points[0], bestClearance = -1;
  for (let row = 0; row < 32; row++) for (let col = 0; col < 32; col++) {
    const point = [minX + (col + .5) * (maxX - minX) / 32, minY + (row + .5) * (maxY - minY) / 32];
    if (!pointInPolygons(point, polygons)) continue;
    const nearest = pointClearance(point, polygons);
    if (nearest > bestClearance) { best = point; bestClearance = nearest; }
  }
  if (bestClearance < 0) throw Error('Could not find an interior label position for a Bahia municipality.');
  return { point: best, clearance: bestClearance };
}
if (!Array.isArray(baLocalities) || baLocalities.length !== 417 || baGeo.type !== 'FeatureCollection' || baGeo.features.length !== 417) throw Error('IBGE must return exactly 417 Bahia municipalities and geometries.');
const municipalityById = new Map(baLocalities.map(city => [String(city.id), city]));
const municipalities = baGeo.features.map(feature => {
  const id = String(feature.properties.codarea), city = municipalityById.get(id);
  if (!city || !['MultiPolygon', 'Polygon'].includes(feature.geometry.type)) throw Error(`Unexpected Bahia municipality: ${id}`);
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  for (const polygon of polygons) for (const ring of polygon) if (ring.length < 4 || !ring.every(point => point.length >= 2 && point.every(Number.isFinite))) throw Error(`Invalid municipality ring: ${id}`);
  const { point, clearance } = representativePoint(polygons);
  return { id, name: city.nome, polygons, label: point, labelSize: Math.max(.14, Math.min(2.4, clearance * 3)) };
}).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
if (new Set(municipalities.map(city => city.id)).size !== 417 || municipalities.some(city => !city.name || !pointInPolygons(city.label, city.polygons))) throw Error('Bahia municipality names, IDs, or label positions are incomplete.');
const municipalitiesBytes = JSON.stringify(municipalities);
const out = new URL('../public/war-assets/', import.meta.url); await fs.mkdir(out, { recursive: true });
await fs.writeFile(new URL('brazil-states.json', out), bytes);
await fs.writeFile(new URL('bahia-municipalities.json', out), municipalitiesBytes);
await fs.writeFile(new URL('geography-source.json', out), JSON.stringify({ provider: 'IBGE', fetchedAt: new Date().toISOString(), localityUrl, geometryUrl, baLocalityUrl, baGeometryUrl, period: 'API default; no fixed period requested', stateSimplification: 'minima', baMunicipalitySimplification: 'intermediaria', units: 27, bahiaMunicipalities: municipalities.length, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: Buffer.byteLength(bytes), bahiaSha256: createHash('sha256').update(municipalitiesBytes).digest('hex'), bahiaBytes: Buffer.byteLength(municipalitiesBytes), documentation: ['https://servicodados.ibge.gov.br/api/docs/malhas?versao=3', 'https://servicodados.ibge.gov.br/api/docs/localidades'] }, null, 2));
console.log(`IBGE: ${records.length} UFs and ${municipalities.length} Bahia municipalities; ${Buffer.byteLength(bytes) + Buffer.byteLength(municipalitiesBytes)} bytes saved.`);
