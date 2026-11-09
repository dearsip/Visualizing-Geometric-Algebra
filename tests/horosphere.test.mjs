import test from 'node:test';
import assert from 'node:assert/strict';
import {Algebra,basis,add,sub,scale,dot,length} from '../src/algebra.js';
import {defaultView,projectedSpace} from '../src/camera.js';
import {FigureModel} from '../src/figures.js';
import {Scene,colors} from '../src/scene.js';
import {chapters} from '../src/content.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7, `${a} != ${b}`);
const definition=id=>chapters.flatMap(c=>c.figures).find(d=>d.id===id);
const scene=n=>Object.assign(Object.create(Scene.prototype),{n,commands:[],labels:[],handles:[],view:defaultView(n,true),factorFrames:new Map()});
const paint=m=>{const s=scene(m.n);m.paint(s);return s;};
const grid=s=>s.commands.filter(c=>c.kind==='line'&&c.color===colors.purple&&c.width===.65&&c.dash);
const guide=(s,p)=>s.commands.filter(c=>c.kind==='line'&&c.color===colors.result&&c.width===1&&c.dash&&c.alpha===.8&&length(sub(c.points[0],add(p,basis(s.n,s.n-1,-3.2))))<1e-7&&length(sub(c.points[1],add(p,basis(s.n,s.n-1,3.2))))<1e-7);

test('3D horosphere lifts a full spatial lattice onto the unit-origin null surface',()=>{
  const s=scene(5),A=new Algebra(5,'conformal');s.cgaMesh();const lines=grid(s);assert.equal(lines.length,75*33);
  const offsets=Array.from({length:3},()=>new Set());
  for(const c of lines){
    const [a,b]=c.points,changed=[0,1,2].filter(i=>Math.abs(a[i]-b[i])>1e-9);assert.equal(changed.length,1);
    const axis=changed[0];offsets[axis].add([0,1,2].filter(i=>i!==axis).map(i=>a[i].toFixed(1)).join(','));
    for(const p of c.points){near(p[3],1);near(p[4],dot(p.slice(0,3),p.slice(0,3))/2);near(A.inner(A.vector(p),A.vector(p)),0);}
  }
  offsets.forEach(set=>assert.equal(set.size,25));
  assert.ok(lines.some(c=>c.points.every(p=>p.slice(0,3).every(x=>Math.abs(x)>.1))));
});

test('2D horosphere and null-cone construction keep their dimension and omission rules',()=>{
  for(const [n,section,curves] of [[4,false,10],[4,true,0],[5,true,10]]){
    const s=scene(n);s.cgaMesh(section);assert.equal(grid(s).length,curves*33);
    const A=new Algebra(n,'conformal');for(const p of s.commands.filter(c=>c.color===colors.purple).flatMap(c=>c.points)){near(p[n-2],1);near(A.inner(A.vector(p),A.vector(p)),0);if(section)near(p[1],0);}
  }
});

test('only a flat Dipole gets the infinity-direction line, following the movable finite point',()=>{
  for(const dimension of [3,4]){
    const m=new FigureModel(definition('dipole'),dimension);assert.equal(guide(paint(m),m.vectors[0]).length,0);
    for(let repeat=0;repeat<2;repeat++){
      m.update('flat',true);assert.equal(guide(paint(m),m.vectors[0]).length,1);
      const next=add(m.vectors[0],basis(m.n,0,.37));m.move(0,next);const s=paint(m),[line]=guide(s,m.vectors[0]);assert.ok(line);
      const u=m.alg.blade([m.vectors[0],basis(m.n,m.n-1)]);for(const p of line.points)near(length(m.alg.wedge(u,m.alg.vector(p))),0);
      for(const extra of [0,.7,Math.PI/2,Math.PI])for(const conformal of [0,.4,Math.PI/2]){
        const view={...defaultView(m.n,true),extra,conformal},a=projectedSpace(line.points[0],view,m.n,true),b=projectedSpace(line.points[1],view,m.n,true),en=projectedSpace(basis(m.n,m.n-1,6.4),view,m.n,true);
        for(let i=0;i<3;i++)near(b.point[i]-a.point[i],en.point[i]);near(b.depth-a.depth,en.depth);
      }
      m.update('flat',false);assert.equal(guide(paint(m),m.vectors[0]).length,0);
    }
    m.reset();assert.equal(guide(paint(m),m.vectors[0]).length,0);
  }
  for(const id of ['circle','sphere']){const m=new FigureModel(definition(id),4);m.update('flat',true);assert.equal(guide(paint(m),m.vectors[0]).length,0);}
});
