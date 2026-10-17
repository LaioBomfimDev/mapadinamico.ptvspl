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
  assert.deepEqual([...fitMapLabels(labels,500,400,2).keys()],['high','far']);
  assert.deepEqual([...fitMapLabels([...labels,{id:'searched',x:100,y:100,w:90,h:25,priority:0,selected:true}],500,400,2).keys()],['searched','far']);
  assert.deepEqual([...fitMapLabels([{...labels[0],selected:true}],500,400,0).keys()],['low']);
  assert.equal(fitMapLabels([{...labels[0],x:NaN}],500,400,2).size,0);
});
const boxOf = (label, place) => { const size = place.compact ? label.compact : label; return { x:label.x+place.dx, y:label.y+place.dy, w:size.w, h:size.h }; };
const overlap = (a, b) => Math.abs(a.x-b.x) < (a.w+b.w)/2 && Math.abs(a.y-b.y) < (a.h+b.h)/2;
test('an isolated city keeps its name centred; neighbouring cities with armies move their names aside instead of hiding them', () => {
  const alone = fitMapLabels([{id:'alone',x:250,y:200,w:120,h:60,priority:5}],500,400,10).get('alone');
  assert.deepEqual(alone,{dx:0,dy:0,compact:false});
  const cluster=[{id:'catu',x:250,y:214,w:120,h:60,priority:80},{id:'alagoinhas',x:247,y:200,w:120,h:60,priority:0},{id:'salvador',x:242,y:254,w:120,h:60,priority:0}];
  const placed = fitMapLabels(cluster,500,400,10);
  assert.deepEqual([...placed.keys()].sort(),['alagoinhas','catu','salvador']);
  const boxes = [...placed].map(([id,place]) => boxOf(cluster.find(label => label.id === id),place));
  for (let i=0;i<boxes.length;i++) for (let j=i+1;j<boxes.length;j++) assert.ok(!overlap(boxes[i],boxes[j]));
  assert.ok([...placed.values()].some(place => place.dx || place.dy));
});
test('when the full name and leader do not fit, the city falls back to its name only', () => {
  const labels=[{id:'big',x:100,y:100,w:180,h:60,priority:9},{id:'below',x:100,y:230,w:180,h:60,priority:8},{id:'near',x:100,y:160,w:180,h:60,priority:1,compact:{w:110,h:30}}];
  const placed = fitMapLabels(labels,280,300,10);
  assert.equal(placed.size,3); assert.equal(placed.get('near')?.compact,true); assert.equal(placed.get('big')?.compact,false);
  const boxes=[...placed].map(([id,place])=>boxOf(labels.find(label=>label.id===id),place));
  for (let i=0;i<boxes.length;i++) for (let j=i+1;j<boxes.length;j++) assert.ok(!overlap(boxes[i],boxes[j]));
  assert.equal(fitMapLabels([labels[0],labels[1],{...labels[2],compact:undefined}],280,300,10).has('near'),false);
});
test('random crowds never produce overlapping names and respect the cap', () => {
  let seed=11; const random=()=>(seed=(seed*16807)%2147483647)/2147483647;
  for (let round=0;round<60;round++) {
    const labels=Array.from({length:24},(_,i)=>({id:`c${i}`,x:random()*600,y:random()*400,w:60+random()*90,h:44+random()*20,priority:Math.floor(random()*50),compact:{w:50+random()*40,h:28}}));
    const placed=fitMapLabels(labels,600,400,14); assert.ok(placed.size<=14);
    const boxes=[...placed].map(([id,place])=>boxOf(labels.find(label=>label.id===id),place));
    for (let i=0;i<boxes.length;i++) for (let j=i+1;j<boxes.length;j++) assert.ok(!overlap(boxes[i],boxes[j]));
  }
});
