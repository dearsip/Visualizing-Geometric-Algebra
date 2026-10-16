import test from 'node:test';
import assert from 'node:assert/strict';
import {basis,add,sub,scale,length,dot} from '../src/algebra.js';
import {FigureModel} from '../src/figures.js';
import {chapters} from '../src/content.js';
import {conformalFlow,conformalOrbit} from '../src/conformal-flow.js';
import {composeReflections,screwGuide,transformPoint,screwInterpolate} from '../src/geometry.js';
import {defaultView,toView,orbit} from '../src/camera.js';
import {Scene} from '../src/scene.js';
const definition=id=>chapters.flatMap(c=>c.figures).find(f=>f.id===id);
const model=n=>new FigureModel(definition('conformal-transform'),n);
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const unitPoint=p=>scale(p,1/p[p.length-2]);
const nearPoint=(a,b,tol=1e-7)=>near(length(sub(unitPoint(a),unitPoint(b))),0,tol);

test('continuous trajectories reproduce the actual reflections and preserve the null cone',()=>{
  for(const n of [3,4])for(const preset of ['translation','rotation','dilation','elliptic','hyperbolic','parabolic','loxodromic']){
    const m=model(n);m.update('preset',preset);const A=m.alg,p=m.vectors[0],mirrors=m.vectors.slice(1),flow=conformalFlow(A,mirrors);assert.ok(flow,preset);
    let expected=A.vector(p);for(const normal of mirrors){const a=A.vector(normal);expected=scale(A.gp(A.gp(a,expected),a),-1/A.inner(a,a));}
    nearPoint(flow.at(p,0),p);nearPoint(flow.at(p,1),A.coordinates(expected));
    nearPoint(flow.at(flow.at(p,.3),.4),flow.at(p,.7));const rescaled=conformalFlow(A,mirrors.map((p,i)=>scale(p,i%2?200:.001)));nearPoint(rescaled.at(p,.7),flow.at(p,.7));
    for(const t of [-1,-.3,.2,.7,1.2]){const q=A.vector(unitPoint(flow.at(p,t)));near(A.inner(q,q),0,1e-6);}
  }
});

test('two-reflection trajectories stay on their invariant circle',()=>{
  for(const n of [3,4])for(const preset of ['elliptic','hyperbolic','parabolic']){
    const m=model(n);m.update('preset',preset);const A=m.alg,flow=conformalFlow(A,m.vectors.slice(1)),circle=A.blade(m.vectors);
    assert.equal(flow.kind,preset);for(const t of [-.8,-.2,0,.3,1,1.8])near(length(A.wedge(circle,A.vector(unitPoint(flow.at(m.vectors[0],t))))),0,1e-6);
    const samples=conformalOrbit(flow,m.vectors[0]);assert.ok(samples.some(p=>p.t===0)&&samples.some(p=>p.t===1));
  }
});

test('elliptic orbit closes and its fixed circle / dipole stays pointwise fixed',()=>{
  for(const n of [3,4]){
    const m=model(n);m.update('preset','elliptic');const A=m.alg,f=conformalFlow(A,m.vectors.slice(1));
    nearPoint(f.at(m.vectors[0],f.period),m.vectors[0]);assert.equal(A.gradeOf(f.fixedBlade),m.n-2);
    
    const radius=Math.sqrt(1.2**2-.55**2),p=[0,radius,...(n===4?[0]:[]),1,radius*radius/2];nearPoint(f.at(p,.4),p);
  }
});

test('hyperbolic arcs approach two exact null fixed points; parabolic arcs approach one',()=>{
  for(const n of [3,4])for(const preset of ['hyperbolic','parabolic']){
    const m=model(n);m.update('preset',preset);const A=m.alg,f=conformalFlow(A,m.vectors.slice(1));assert.equal(f.fixedPoints.length,preset==='hyperbolic'?2:1);
    for(const p of f.fixedPoints){near(A.inner(A.vector(p),A.vector(p)),0);nearPoint(f.at(p,1),p);}
    for(const sign of [-1,1]){const p=unitPoint(f.at(m.vectors[0],sign*(preset==='hyperbolic'?6/f.rate:10000))),distance=Math.min(...f.fixedPoints.map(q=>length(sub(p,unitPoint(q)))));assert.ok(distance<(preset==='hyperbolic'?1e-4:5e-4),`${preset}: ${distance}`);}
  }
});

test('loxodromic preset gives the dilation / rotation spiral and retains zero and infinity',()=>{
  for(const n of [3,4]){
    const m=model(n);m.update('preset','loxodromic');const f=conformalFlow(m.alg,m.vectors.slice(1)),p=m.vectors[0],d=m.n-2;assert.equal(f.kind,'loxodromic');assert.equal(f.fixedPoints.length,2);
    for(const t of [-1.2,-.4,.5,1.3]){const q=unitPoint(f.at(p,t));near(length(q.slice(0,d))/length(p.slice(0,d)),(1.12**2)**t);const expected=Math.atan2(p[1],p[0])+1.3*t;near(Math.cos(Math.atan2(q[1],q[0])),Math.cos(expected));near(Math.sin(Math.atan2(q[1],q[0])),Math.sin(expected));}
    const altered=m.vectors.slice(1).map(p=>[...p]);altered[3][m.n-1]+=.2;assert.equal(conformalFlow(m.alg,altered),null);
  }
});

test('screw angle guide starts at v0 and its remaining segment is precisely axial translation',()=>{
  const m=new FigureModel(definition('motor'),4),transform=composeReflections(m.vectors.slice(1),3),p=m.vectors[0];
  for(const t of [0,.4,1]){const guide=screwGuide(transform,p,t);near(length(sub(guide.arc[0],p)),0);near(length(sub(guide.endpoint,transformPoint(p,screwInterpolate(transform,t),3))),0);const delta=sub(guide.endpoint,guide.arc.at(-1));near(length(sub(delta,scale(guide.axis,dot(delta,guide.axis)))),0);}
  m.update('preset','translation');const g=screwGuide(composeReflections(m.vectors.slice(1),3),p,1);near(length(sub(g.arc.at(-1),p)),0);assert.ok(length(sub(g.endpoint,p))>.1);
});

test('Null Cone section hides physical e2 instead of adding it to the origin display direction',()=>{
  for(const n of [4,5]){const view=defaultView(n,true,true);for(const angle of [0,.4,Math.PI/2]){view.conformal=angle;const p=toView(basis(n,1),view,n,true);near(p[0],0);near(p[1],0);}
    orbit(view,n,true,33,-55,1);const scene=Object.assign(Object.create(Scene.prototype),{n,isCGA:true,view,commands:[],labels:[],project:p=>({x:p[0]*100,y:p[1]*100})});scene.axes();assert.ok(!scene.labels.some(l=>l.text.includes('e₂')));scene.commands=[];scene.cgaMesh(true);for(const p of scene.commands.flatMap(c=>c.points))near(p[1],0);}
});
