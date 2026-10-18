export type Point = [number, number];
export type StateGeometry = { id: string; uf: string; name: string; polygons: Point[][][] };
/** radius: graus do ponto do nome até a divisa mais próxima; o círculo inteiro fica dentro da cidade. */
export type MunicipalityIndexItem = { id: string; name: string; label: Point; labelSize: number; radius?: number };
export const project = (lng: number, lat: number): Point => [(lng + 54) * 1.5, -(lat + 14) * 1.5];
export function inRing(point: Point, ring: Point[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
export function insideState(point: Point, state: StateGeometry) { return state.polygons.some(polygon => inRing(point, polygon[0]) && !polygon.slice(1).some(hole => inRing(point, hole))); }
export function projectedState(state: StateGeometry): StateGeometry { return { ...state, polygons: state.polygons.map(polygon => polygon.map(ring => ring.map(([lng, lat]) => project(lng, lat)))) }; }
export function stateBounds(state: StateGeometry) {
  const ring = state.polygons.flatMap(polygon => polygon[0]);
  return { minX: Math.min(...ring.map(p => p[0])), maxX: Math.max(...ring.map(p => p[0])), minZ: Math.min(...ring.map(p => p[1])), maxZ: Math.max(...ring.map(p => p[1])) };
}
export const CITY_STABLE_SLOTS = 24;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)), CAMP_TO_SPACING = .85, CAMP_HALF_DIAGONAL = Math.hypot(.64, .59);
/**
 * Lotes da cidade sem desenhar a divisa: espiral de girassol a partir do ponto do nome, um lote por base na
 * ordem de chegada. O círculo de raio `radius` (mundo) cabe inteiro na cidade, então todo quartel fica dentro
 * dela. Até CITY_STABLE_SLOTS bases cada uma mantém o seu lugar; acima disso a espiral se aperta para caber.
 * A distância mínima entre vizinhos na espiral é 1,546 × espaçamento, maior que a diagonal de dois quartéis.
 */
export function cityLots(center: Point, radius: number, count: number): { x: number; z: number; size: number; spacing: number }[] {
  if (!(count > 0) || !(radius > 0) || !center.every(Number.isFinite)) return [];
  const slots = Math.max(count, CITY_STABLE_SLOTS), spacing = radius * .95 / (Math.sqrt(slots - .5) + CAMP_TO_SPACING * CAMP_HALF_DIAGONAL), size = spacing * CAMP_TO_SPACING;
  return Array.from({ length: count }, (_, i) => {
    const distance = spacing * Math.sqrt(i + .5), angle = i * GOLDEN_ANGLE;
    return { x: center[0] + distance * Math.cos(angle), z: center[1] + distance * Math.sin(angle), size, spacing };
  });
}
/** Raio da cidade em unidades do mapa (o índice guarda graus; o mapa usa 1,5 unidade por grau). */
export const cityRadius = (city: Pick<MunicipalityIndexItem, 'radius' | 'labelSize'>) => (city.radius && city.radius > 0 ? city.radius : Math.max(.01, city.labelSize / 3)) * 1.5;
// Row-major lots on a rectangular street grid. Every corner must be inside the UF.
export function baseLots(state: StateGeometry, required: number): { x: number; z: number; size: number; spacing: number }[] {
  const b = stateBounds(state), width = b.maxX - b.minX, height = b.maxZ - b.minZ;
  for (const density of [4, 8, 16, 32, 64, 128]) {
    const step = Math.min(width, height) / density, size = step * .46, lots: { x: number; z: number; size: number; spacing: number }[] = [];
    for (let z = b.minZ + step / 2; z < b.maxZ && lots.length < 15000; z += step) for (let x = b.minX + step / 2; x < b.maxX && lots.length < 15000; x += step) {
      const halfX = size * .64, halfZ = size * .59;
      if ([[-halfX, -halfZ], [halfX, -halfZ], [-halfX, halfZ], [halfX, halfZ], [0, 0]].every(([dx, dz]) => insideState([x + dx, z + dz], state))) lots.push({ x, z, size, spacing: step });
    }
    if (lots.length >= required) {
      const centerX = (b.minX + b.maxX) / 2, centerZ = (b.minZ + b.maxZ) / 2;
      return lots.sort((a, c) => (a.x - centerX) ** 2 + (a.z - centerZ) ** 2 - (c.x - centerX) ** 2 - (c.z - centerZ) ** 2).slice(0, required);
    }
  }
  throw Error(`Não foi possível distribuir as bases em ${state.uf}.`);
}
// Intersections with all rings clip horizontal/vertical straight streets to land.
export function clippedStreet(state: StateGeometry, axis: 'x' | 'z', value: number): [Point, Point][] {
  const crossings: number[] = [], vertical = axis === 'z';
  for (const polygon of state.polygons) for (const ring of polygon) for (let i = 1; i < ring.length; i++) {
    const a = ring[i - 1], b = ring[i], at = vertical ? a[0] : a[1], bt = vertical ? b[0] : b[1];
    if ((at > value) === (bt > value)) continue;
    crossings.push((vertical ? a[1] : a[0]) + (vertical ? b[1] - a[1] : b[0] - a[0]) * (value - at) / (bt - at));
  }
  crossings.sort((a, b) => a - b);
  const segments: [Point, Point][] = [];
  for (let i = 1; i < crossings.length; i++) {
    const a = crossings[i - 1], b = crossings[i], middle = (a + b) / 2;
    if (b - a < .0001 || !insideState(vertical ? [value, middle] : [middle, value], state)) continue;
    segments.push(vertical ? [[value, a], [value, b]] : [[a, value], [b, value]]);
  }
  return segments;
}
