import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CITY_STABLE_SLOTS, cityLots, cityRadius, insideState, project, projectedState } from '../lib/war/geography.ts';

const read = async name => JSON.parse(await readFile(new URL(`../public/war-assets/${name}`, import.meta.url), 'utf8'));
const index = await read('bahia-municipality-index.json'), shapes = new Map((await read('bahia-municipalities.json')).map(city => [city.id, city]));
const corners = lot => { const hx = lot.size * .64, hz = lot.size * .59; return [[lot.x - hx, lot.z - hz], [lot.x + hx, lot.z - hz], [lot.x - hx, lot.z + hz], [lot.x + hx, lot.z + hz], [lot.x, lot.z]]; };
const overlap = (a, b) => Math.abs(a.x - b.x) < (a.size + b.size) * .64 && Math.abs(a.z - b.z) < (a.size + b.size) * .59;

test('every city in the light index carries its inner radius', () => {
  assert.equal(index.length, 417);
  for (const city of index) assert.ok(city.radius > 0 && city.radius < 1, city.name);
});

test('camps of every Bahia city stay inside its real IBGE boundary, without drawing it', () => {
  for (const city of index) {
    const shape = projectedState({ id: city.id, uf: 'BA', name: city.name, polygons: shapes.get(city.id).polygons });
    for (const count of [1, 7, CITY_STABLE_SLOTS, 80]) {
      for (const lot of cityLots(project(city.label[0], city.label[1]), cityRadius(city), count))
        for (const point of corners(lot)) assert.ok(insideState(point, shape), `${city.name} com ${count} bases`);
    }
  }
});

test('camps never overlap and each base keeps its place while the city grows', () => {
  const catu = index.find(city => city.name === 'Catu'), center = project(catu.label[0], catu.label[1]), radius = cityRadius(catu);
  for (const count of [2, 24, 150]) { const lots = cityLots(center, radius, count); for (let i = 0; i < lots.length; i++) for (let j = i + 1; j < lots.length; j++) assert.ok(!overlap(lots[i], lots[j]), `${count}: ${i} × ${j}`); }
  const few = cityLots(center, radius, 3), more = cityLots(center, radius, CITY_STABLE_SLOTS);
  assert.deepEqual(more.slice(0, 3), few, 'os três primeiros não mudam de lugar quando chegam outros');
  assert.deepEqual(cityLots(center, radius, 9), cityLots(center, radius, 9));
  assert.ok(cityLots(center, radius, 150)[0].size < few[0].size, 'cidade cheia aperta a espiral para caber');
  assert.deepEqual(cityLots(center, radius, 0), []);
  assert.deepEqual(cityLots([NaN, 0], radius, 2), []);
  assert.ok(cityRadius({ labelSize: .3 }) > 0, 'índice antigo sem raio ainda funciona');
});
