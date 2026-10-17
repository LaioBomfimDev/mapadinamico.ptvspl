import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDemo } from '../lib/war/game.ts';
import { approachZoom, labelScreenSize, mapGeometryKey } from '../lib/war/map-performance.ts';

test('economy-only changes preserve miniature geometry; a new kind or moved base invalidates it', () => {
  const bases = createDemo().bases, original = mapGeometryKey(bases), copy = structuredClone(bases);
  copy[0].credits += 90; copy[0].inventory.infantry += 7;
  assert.equal(mapGeometryKey(copy), original);
  copy[0].inventory.aircraft = copy[0].inventory.aircraft ? 0 : 1;
  assert.notEqual(mapGeometryKey(copy), original);
  const moved = structuredClone(bases); moved[0].uf = 'BA'; moved[0].municipalityId = '2907509';
  assert.notEqual(mapGeometryKey(moved), original);
});

test('zoom is monotonic, bounded and converges from national view to a tiny municipal base', () => {
  for (const [from,to] of [[1,600],[600,1],[1,1800],[1,.6]]) {
    let zoom = from;
    for (let i=0;i<180;i++) { const next = approachZoom(zoom,to,1/60); assert.ok(next >= Math.min(zoom,to) && next <= Math.max(zoom,to)); zoom=next; }
    assert.equal(zoom,to);
  }
  assert.equal(approachZoom(1,600,0),1);
  assert.ok(approachZoom(1,9000,.1)<=1800);
});

test('zoom interpolation follows elapsed time instead of frame count', () => {
  let slow=1,fast=1;
  for(let i=0;i<12;i++) slow=approachZoom(slow,600,1/30);
  for(let i=0;i<48;i++) fast=approachZoom(fast,600,1/120);
  assert.ok(Math.abs(slow-fast)<1e-8);
});

test('long handles grow the label instead of shrinking its font', () => {
  const short=labelScreenSize(220,126,true,false), long=labelScreenSize(700,126,true,false);
  assert.equal(short.height,long.height); assert.ok(long.width>short.width*3);
  assert.equal(long.height*47/126,23);
  assert.equal(labelScreenSize(700,90,false,true).height*47/90,17);
});
