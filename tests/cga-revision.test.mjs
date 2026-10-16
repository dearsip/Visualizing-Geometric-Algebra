import test from 'node:test';
import assert from 'node:assert/strict';
import {Algebra,basis,add,sub,scale,dot,length} from '../src/algebra.js';
import {defaultView,toView,orbit,screenPoint,ELEVATION_LIMIT} from '../src/camera.js';
import {FigureModel} from '../src/figures.js';
import {Scene,colors} from '../src/scene.js';
import {chapters} from '../src/content.js';
import {embed,cgaRound} from '../src/geometry.js';
import {displacementShading} from '../src/projective-field.js';
const definition=id=>chapters.flatMap(c=>c.figures).find(d=>d.id===id);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const paint=m=>{const s=Object.assign(Object.create(Scene.prototype),{n:m.n,commands:[],handles:[],labels:[],view:defaultView(m.n,m.cga),factorFrames:new Map()});m.paint(s);return s;};
test('5D middle orbit has no poles; added-axis projections do not follow spatial orbit',()=>{
  for(const section of [false,true])for(const beta of [0,.6,Math.PI/2]){const v=defaultView(5,true,section);v.conformal=beta;v.extra=.7;const a=toView(basis(5,3),v,5,true),b=toView(basis(5,4),v,5,true);orbit(v,5,true,190,600,1);assert.ok(v.frame);assert.deepEqual(toView(basis(5,3),v,5,true),a);assert.deepEqual(toView(basis(5,4),v,5,true),b);for(const r of v.frame)near(length(r),1);}
  const upright=defaultView(5,true);orbit(upright,5,true,0,10000);near(upright.pitch,ELEVATION_LIMIT);
  const free=defaultView(5,true);assert.ok(toView(basis(5,2),free,5,true)[1]>0);
});
test('5D cone vertical orbit exchanges spatial up and origin without moving infinity',()=>{
  for(const button of [0,1]){const v=defaultView(5,true,true),inf=toView(basis(5,4),v,5,true);assert.ok(toView(basis(5,2),v,5,true)[1]>0);orbit(v,5,true,80,-80,button);const before=toView(basis(5,4),v,5,true);orbit(v,5,true,0,-90,2);assert.deepEqual(toView(basis(5,4),v,5,true),before);}
});
test('5D middle grab orbit follows a near-side point',()=>{
  for(const section of [false,true]){const v={...defaultView(5,true,section,false,'free'),yaw:0,pitch:0},p=[0,-1,0,0,0],project=()=>screenPoint(p,v,5,true,800,500,65),start=project();orbit(v,5,true,8,0,1);assert.ok(project().x>start.x);const fresh={...defaultView(5,true,section,false,'free'),yaw:0,pitch:0};const before=screenPoint(p,fresh,5,true,800,500,65);orbit(fresh,5,true,0,8,1);assert.ok(screenPoint(p,fresh,5,true,800,500,65).y>before.y);}
});
test('cone geometry is limited to construction and its circular sections are null',()=>{
  for(const n of [4,5]){const A=new Algebra(n,'conformal'),s=Object.assign(Object.create(Scene.prototype),{n,commands:[],labels:[]});s.cgaMesh(false);assert.ok(!s.commands.some(c=>c.color===colors.green));s.commands=[];s.cgaMesh(true);const cone=s.commands.filter(c=>c.color===colors.green);assert.ok(cone.length>60);for(const p of cone.flatMap(c=>c.points))near(A.inner(A.vector(p),A.vector(p)),0);}
});
test('shading uses one transparent section containing the source',()=>{
  const scene={commands:[]},a=[1,.3,.2,1],v=[-.4,.8,.6,1];displacementShading(scene,a,v);assert.equal(scene.commands.length,1);near(scene.commands[0].alpha,.2);const ps=scene.commands[0].points,u=sub(ps[1],ps[0]),w=sub(ps[3],ps[0]),r=sub(v,ps[0]);near(length(sub(r,add(scale(u,dot(r,u)/dot(u,u)),scale(w,dot(r,w)/dot(w,w))))),0);
});
test('property grade changes preserve the previous editable configuration',()=>{
  for(const n of [3,4]){const m=new FigureModel(definition('cga-carrier'),n),before=m.vectors.map(v=>[...v]);m.update('grade',1);m.update('radius2',-.7);m.move(0,add(m.vectors[0],basis(m.n,0,.4)));m.update('grade',2);assert.deepEqual(m.vectors,before);m.update('grade',1);near(m.state.radius2,-.7);near(m.alg.inner(m.alg.vector(m.vectors[0]),m.alg.vector(m.vectors[0])),.7);}
});
test('motor mirrors start in a bounded geometric-norm range and edits leave presets',()=>{
  for(const n of [3,4]){const m=new FigureModel(definition('motor'),n);for(const v of m.vectors.slice(1)){near(v[n-1],1);const q=length(v.slice(0,-1));assert.ok(q>=1.5&&q<=3);}m.update('objectGrade',n-1);paint(m);m.update('preset','translation');m.move(0,add(m.vectors[0],basis(n,0,.1)));assert.equal(m.state.preset,'custom');m.update('preset','rotation');m.update('count',3);assert.equal(m.state.preset,'custom');assert.equal(m.vectors.length,n-1+3);paint(m);}
});
test('imaginary round-point circles lie in the parallel plane and use a distinct color',()=>{
  for(const n of [3,4]){const m=new FigureModel(definition('roundpoint'),n);m.update('radius2',-.8);m.state.radius=false;m.state.mesh=false;const s=paint(m),A=m.alg,p=embed(m.vectors[0].slice(0,m.n-2),m.n),paths=s.commands.filter(c=>c.color===colors.purple&&c.points.length===2&&c.points.every(p=>Math.abs(p[m.n-1])>1e-9));assert.ok(paths.length>40);for(const q of paths.flatMap(c=>c.points))near(A.inner(A.vector(p),A.vector(q)),.4);}
});
test('point-valued conformal meet renders the radius geometry',()=>{
  for(const n of [3,4]){const m=new FigureModel(definition('cga-meet'),n);m.update('pair',n===3?'3:2':'4:2');const s=paint(m),[a,b]=m.grades,out=m.alg.antiwedge(m.alg.blade(m.vectors.slice(0,a)),m.alg.blade(m.vectors.slice(a)));assert.equal(m.alg.gradeOf(out),1);const info=cgaRound(out,m.alg);assert.ok(info);assert.ok(info.radius2>0&&length(info.center.slice(0,-2))<2);assert.ok(s.commands.filter(c=>c.color===(info.radius2<0?colors.purple:colors.result)).length>30);}
});
test('round-point-only joins allow non-null factors and computed dipole endpoints',()=>{
  const m=new FigureModel(definition('cga-join'),4);m.update('construction','points3');m.update('pointRadius0',.5);m.move(0,add(m.vectors[0],basis(m.n,0,.1)));near(m.alg.inner(m.alg.vector(m.vectors[0]),m.alg.vector(m.vectors[0])),-.5);assert.equal(m.vectors.length,3);assert.equal(m.names[0],'p₁');paint(m);m.update('construction','objects');assert.equal(m.state.pointOnly,false);
});
test('conformal inversion presets preserve null points and concentric inversions dilate',()=>{
  for(const n of [3,4]){const m=new FigureModel(definition('conformal-transform'),n),A=m.alg;m.update('preset','dilation');let p=A.vector(m.vectors[0]);for(const v of m.vectors.slice(1)){const a=A.vector(v);p=scale(A.gp(A.gp(a,p),a),-1/A.inner(a,a));}near(A.inner(p,p),0);const q=A.coordinates(p);for(let i=0;i<n-1;i++)near(q[i]/q[m.n-2],m.vectors[0][i]*2.25);m.update('objectGrade',2);paint(m);m.update('count',3);assert.equal(m.state.preset,'custom');}
});
