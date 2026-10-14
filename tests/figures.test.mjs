import test from 'node:test';
import assert from 'node:assert/strict';
import { chapters } from '../src/content.js';
import { FigureModel } from '../src/figures.js';
import { Scene } from '../src/scene.js';
import { length, sub } from '../src/algebra.js';
function paint(model){const scene=Object.assign(Object.create(Scene.prototype),{n:model.n,w:700,h:410,s:65,view:{yaw:.57,pitch:.33,extra:.7,conformal:.3,zoom:1},commands:[],labels:[],handles:[],isCGA:model.cga});model.paint(scene);for(const command of scene.commands)for(const p of command.points){assert.equal(p.length,model.n,`${model.def.id}: wrong dimension ${p}`);assert.ok(p.every(Number.isFinite),`${model.def.id}: nonfinite coordinate ${p}`);const q=scene.project(p);assert.ok(Number.isFinite(q.x)&&Number.isFinite(q.y));}return scene;}
for(const dimension of [3,4])for(const chapter of chapters)for(const def of chapter.figures){
  test(`${dimension}D figure ${def.id}: controls produce finite geometry`,()=>{
    const m=new FigureModel(def,dimension);paint(m);
    for(const spec of m.controls){if(spec.type==='select'){for(const [value] of spec.options){m.update(spec.key,value);paint(m);}}if(spec.type==='check'){m.update(spec.key,!spec.value);paint(m);}if(spec.key==='infinity'){m.update(spec.key);paint(m);m.reset();}}
  });
}
test('Fix value preserves wedge under arbitrary proposed motion; trivector has no constraint UI',()=>{
  for(const n of [3,4]){const def=chapters[0].figures.find(d=>d.type==='wedge'),m=new FigureModel(def,n);m.state.fix=true;const before=m.alg.blade(m.vectors);for(let i=0;i<m.vectors.length;i++){const next=m.vectors[i].map((v,j)=>v+.2*(j+1));m.move(i,next);}assert.ok(length(sub(before,m.alg.blade(m.vectors)))<1e-7);const tri=new FigureModel(chapters[0].figures.find(d=>d.type==='trivector'),n);assert.ok(!tri.controls.some(c=>c.key==='fix'||c.key==='loci'));}
});
