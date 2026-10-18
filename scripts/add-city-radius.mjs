// Grava em bahia-municipality-index.json o "raio" de cada cidade: a distância (em graus) do ponto interno
// do nome até a divisa municipal mais próxima. Um círculo com esse raio fica todo dentro da cidade, então o
// mapa distribui as bases ali sem precisar baixar nem desenhar os contornos (788 KB).
//   node scripts/add-city-radius.mjs
import { readFile, writeFile } from 'node:fs/promises';

const folder = new URL('../public/war-assets/', import.meta.url);
const geometry = JSON.parse(await readFile(new URL('bahia-municipalities.json', folder), 'utf8'));
const index = JSON.parse(await readFile(new URL('bahia-municipality-index.json', folder), 'utf8'));

/** Distância do ponto ao segmento mais próximo de qualquer anel (mesma conta de scripts/sync-ibge.mjs). */
export function pointClearance(point, polygons) {
  let nearest = Infinity;
  for (const polygon of polygons) for (const ring of polygon) for (let i = 1; i < ring.length; i++) {
    const [ax, ay] = ring[i - 1], [bx, by] = ring[i], dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((point[0] - ax) * dx + (point[1] - ay) * dy) / (dx * dx + dy * dy || 1)));
    nearest = Math.min(nearest, Math.hypot(point[0] - ax - t * dx, point[1] - ay - t * dy));
  }
  return nearest;
}

const byId = new Map(geometry.map(city => [city.id, city]));
if (index.length !== 417 || byId.size !== 417) throw Error('Esperados 417 municípios da Bahia no índice e nos contornos.');
const updated = index.map(city => {
  const shape = byId.get(city.id);
  if (!shape) throw Error(`Contorno ausente para ${city.name}.`);
  const radius = pointClearance(city.label, shape.polygons);
  if (!(radius > 0)) throw Error(`Ponto do nome fora de ${city.name}.`);
  return { ...city, radius: Number(radius.toFixed(5)) };
});
await writeFile(new URL('bahia-municipality-index.json', folder), JSON.stringify(updated));
const radii = updated.map(city => city.radius).sort((a, b) => a - b);
console.log(`Raio gravado para ${updated.length} cidades (mínimo ${radii[0]}°, mediana ${radii[208]}°, máximo ${radii.at(-1)}°).`);
