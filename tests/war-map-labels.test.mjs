import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDemo } from '../lib/war/game.ts';
import { mapRankingLeaders, fitMapLabels } from '../lib/war/map-labels.ts';
const base = (id, city, points, tanks = 0) => ({ ...createDemo().bases.at(-1), id, username:id, municipalityId:city, credits:points, inventory:{ infantry:3,tank:tanks,artillery:0,drone:0,aircraft:0 }, progress:{entries:points ? [{key:id,kind:'comment',points,at:'2026-10-17T00:00:00Z'}] : []} });
test('map city labels follow the first row by accumulated points; state labels follow military force', () => {
  const bases = [base('first','2907509',80),base('army','2907509',20,4),base('other','2927408',30)];
  const copy = structuredClone(bases), result = mapRankingLeaders(bases);
  assert.equal(result.cities.size,2); assert.equal(result.cities.get('2907509').id,'first'); assert.equal(result.states.get('BA').id,'army'); assert.deepEqual(bases,copy);
});
test('ties use a stable first row without inventing municipalities for unassigned bases', () => {
  const bases=[base('z','2907509',20),base('a','2907509',20),base('unassigned',undefined,90)];
  assert.equal(mapRankingLeaders(bases).cities.get('2907509').id,'a'); assert.equal(mapRankingLeaders(bases.reverse()).cities.get('2907509').id,'a'); assert.equal(mapRankingLeaders(bases).cities.size,1);
});
test('label placement prioritizes rank, avoids collisions, respects the screen cap and keeps the searched city', () => {
  const labels=[{id:'low',x:100,y:100,w:90,h:25,priority:5},{id:'high',x:110,y:100,w:90,h:25,priority:50},{id:'far',x:350,y:200,w:80,h:25,priority:20},{id:'outside',x:-500,y:80,w:80,h:25,priority:900}];
  assert.deepEqual([...fitMapLabels(labels,500,400,2)],['high','far']);
  assert.deepEqual([...fitMapLabels([...labels,{id:'searched',x:100,y:100,w:90,h:25,priority:0,selected:true}],500,400,2)],['searched','far']);
  assert.deepEqual([...fitMapLabels([{...labels[0],selected:true}],500,400,0)],['low']);
  assert.equal(fitMapLabels([{...labels[0],x:NaN}],500,400,2).size,0);
});
