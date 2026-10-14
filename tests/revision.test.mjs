import test from 'node:test';
import assert from 'node:assert/strict';
import { Algebra, basis, add, sub, scale, dot, length } from '../src/algebra.js';
import { defaultView,toView,orbit,screenPoint,dragDelta,intersectCoordinates,restrictLinear,ELEVATION_LIMIT } from '../src/camera.js';
import { continuousFactors } from '../src/frames.js';
import { chapters } from '../src/content.js';
import { FigureModel } from '../src/figures.js';
import { Scene } from '../src/scene.js';
import { affine,embed,cgaRound,closestPoint } from '../src/geometry.js';
import { activeInputs,dragSpace,embeddedRound,projectiveSurface } from '../src/lesson-revisions.js';
import { mathTokens } from '../src/math-label.js';
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const definition=type=>chapters.flatMap(c=>c.figures).find(d=>d.type===type);
test('grab orbit follows drag on the near side in orthographic and perspective views',()=>{
  for(const perspective of [false,true])for(const n of [3,4]){const v={...defaultView(n),yaw:0,pitch:0,perspective},point=[0,-1,0,...(n===4?[0]:[])],project=()=>screenPoint(point,v,n,false,800,500,65),p=project();orbit(v,n,false,8,0);assert.ok(project().x>p.x);v.yaw=0;v.roll=0;const q=project();orbit(v,n,false,0,8);assert.ok(project().y>q.y);}
});
test('right orbit is disabled in 3D; elevations nearly reach both poles',()=>{
  const v=defaultView(3),before={...v};orbit(v,3,false,100,-100,2);assert.deepEqual(v,before);orbit(v,3,false,0,10000);near(v.pitch,ELEVATION_LIMIT);orbit(v,3,false,0,-10000);near(v.pitch,-ELEVATION_LIMIT);assert.ok(ELEVATION_LIMIT>89*Math.PI/180);
});
test('4D folding has exact quarter-turn endpoints and e4 is independent of left orbit',()=>{
  const v=defaultView(4),collapsed=toView(basis(4,3),v,4);near(collapsed[0],0);near(collapsed[1],0);near(collapsed[2],1);orbit(v,4,false,0,-1000,2);near(v.extra,Math.PI/2);const e3=toView(basis(4,2),v,4);near(e3[0],0);near(e3[1],0);near(e3[2],-1);const e4=toView(basis(4,3),v,4);orbit(v,4,false,120,-60);assert.deepEqual(toView(basis(4,3),v,4),e4);orbit(v,4,false,0,1000,2);near(v.extra,0);
});
test('free perspective dragging keeps camera depth constant while oblique constraints remain free to change depth',()=>{
  for(const n of [3,4,5]){const view=defaultView(n,n===5),cga=n===5,project=p=>screenPoint(p,view,n,cga,800,500,65),p=Array.from({length:n},(_,i)=>.3*(i+1)),space=Array.from({length:n},(_,i)=>basis(n,i)),normal=space.map(v=>project(add(p,v)).z-project(p).z),plane=restrictLinear(space,normal),delta=dragDelta(project,p,7,-5,plane),q=project(add(p,delta));near(q.z,project(p).z);near(q.x-project(p).x,7,1e-3);near(q.y-project(p).y,-5,1e-3);}
});
test('forward e2 is away at zero yaw; CGA extra axes never turn downward',()=>{
  const v={...defaultView(3),yaw:0,pitch:0};assert.ok(toView(basis(3,1),v,3)[2]<0);assert.ok(toView(basis(3,0),v,3)[0]>0);for(const n of [4,5])for(let beta=0;beta<=Math.PI/2;beta+=.08){v.extra=Math.PI/2;v.conformal=beta;for(const i of [n-2,n-1])assert.ok(toView(basis(n,i),v,n,true)[1]>=-1e-9);}
});
test('oblique locus dragging preserves screen speed instead of projecting a free delta',()=>{
  const v={...defaultView(3),perspective:false},project=p=>screenPoint(p,v,3,false,800,500,65),p=[1,1,.4],direction=[.7,1,.3],a=project(p),b=project(add(p,direction)),dx=(b.x-a.x)*.12,dy=(b.y-a.y)*.12,delta=dragDelta(project,p,dx,dy,[direction]);const q=project(add(p,delta));near(q.x-a.x,dx,1e-4);near(q.y-a.y,dy,1e-4);
  const intersection=intersectCoordinates([[1,0,1],[0,1,1]],[0,1]);assert.equal(intersection.length,1);near(intersection[0][2],0);
});
test('continuous complementary frames cross coordinate zero without a half-turn; scale is balanced',()=>{
  for(const n of [3,4]){const A=new Algebra(n);let previous;for(let t=-.12;t<=.121;t+=.002){const v=basis(n,0,1.4);v[2]=t;const blade=A.rc(A.vector(v)),frame=continuousFactors(blade,A,previous);assert.ok(length(sub(A.blade(frame),blade))<1e-6);if(previous)for(let j=0;j<frame.length;j++)assert.ok(dot(previous[j],frame[j])>0);for(const f of frame)near(length(f),Math.pow(length(blade),1/frame.length));previous=frame;}}
});
test('attitudes and distance have the expected geometric meaning in both dimensions',()=>{
  for(const n of [3,4]){const A=new Algebra(n,'rigid'),p=[...Array(n-1).fill(0),1],q=[...p];q[0]=3;q[1]=4;near(A.attitude(A.vector(p))[0],1);const line=A.blade([p,q]),att=A.attitude(line);assert.ok(length(sub(A.coordinates(att),sub(q,p)))<1e-6);near(A.bulkNorm(A.attitude(A.wedge(A.vector(p),A.vector(q)))),5);const b=[...p];b[1]=2;const c=[...b];c[0]=3;const L=A.blade([b,c]);near(A.bulkNorm(A.attitude(A.wedge(A.vector(p),L)))/A.bulkNorm(A.wedge(A.attitude(A.vector(p)),A.attitude(L))),2);near(closestPoint(p,L,A)[1],2);}
});
test('point antidot locus and lock preserve weights; both dot loci preserve the dot',()=>{
  for(const n of [3,4])for(const type of ['dot','euclidean-dot','antidot']){const m=new FigureModel(definition(type),n);m.state.fix=true;const A=m.alg,product=()=>type==='antidot'?A.antiInner(A.vector(m.vectors[0]),A.vector(m.vectors[1])):A.inner(A.vector(m.vectors[0]),A.vector(m.vectors[1])),before=product();for(let i=0;i<2;i++)m.move(i,m.vectors[i].map((v,j)=>v+.17*(j+1)));near(product(),before);if(type==='antidot')near(m.vectors[0][n-1],1);}
});
test('active inputs exclude irrelevant distance handles and reset restores pair grades',()=>{
  for(const n of [3,4]){const m=new FigureModel(definition('distance'),n);assert.equal(activeInputs(m).length,2);m.update('case',1);assert.equal(activeInputs(m).length,3);const p=new FigureModel(definition('projection'),n),original=[...p.grades];const choices=p.controls.find(c=>c.key==='pair').options;p.update('pair',choices.at(-1)[0]);p.reset();assert.deepEqual(p.grades,original);}
});
test('CGA embedded curve vertices lie on the null horosphere and its carrier',()=>{
  for(const n of [4,5]){const A=new Algebra(n,'conformal'),points=[0,Math.PI*2/3,Math.PI*4/3].map(t=>embed([Math.cos(t)+.4,Math.sin(t),...(n===5?[.3]:[])],n)),circle=A.blade(points),scene=Object.assign(Object.create(Scene.prototype),{n,commands:[],labels:[]});embeddedRound(scene,circle,A,'c','#000000');const pointsDrawn=scene.commands.flatMap(c=>c.points);assert.ok(pointsDrawn.length>100);for(const p of pointsDrawn){near(p[n-2],1);near(A.inner(A.vector(p),A.vector(p)),0);assert.ok(length(A.wedge(circle,A.vector(p)))<1e-6);}const flat=A.blade([points[0],points[1],basis(n,n-1)]),flatScene=Object.assign(Object.create(Scene.prototype),{n,commands:[],labels:[]});embeddedRound(flatScene,flat,A,'l','#000000');assert.ok(flatScene.commands.length>30);for(const p of flatScene.commands.flatMap(c=>c.points))near(A.inner(A.vector(p),A.vector(p)),0);}
});
test('nested hats contain real scripts; bulk/weight circles have equal script sizes',()=>{
  const t=mathTokens('\\hat{l_{●}}');assert.equal(t[0].accent,'hat');assert.equal(t[0].children[1].dy,4.5);const dots=mathTokens('p_{●} p_{○}').filter(t=>['●','○'].includes(t.text));assert.equal(dots[0].size,dots[1].size);
});
test('parametric contraction stays on the line/plane; equal-grade angles retain orientation',()=>{
  for(const n of [3,4]){const m=new FigureModel(definition('parametric'),n);for(const k of n===3?[2]:[2,3]){m.update('grade',k);m.state.parameter=.7;m.state.parameter2=.3;const A=m.alg,u=A.blade(m.vectors),att=A.attitude(u),fs=A.factor(att),alpha=k===2?A.scalar(.7):A.vector(add(scale(fs[0],.7),scale(fs[1],.3))),support=closestPoint(basis(n,n-1),u,A),p=A.vector(add(support,A.coordinates(A.antiwedge(att,A.dual(alpha)))));assert.ok(length(A.wedge(u,p))<1e-6);}}
  const m=new FigureModel(definition('angle'),3);m.vectors=[[0,0,1],[1,0,1],[0,1,1],[-1,1,1]];const scene=Object.assign(Object.create(Scene.prototype),{n:3,commands:[],labels:[],handles:[]});m.paint(scene);assert.equal(m.rows.find(r=>r.label==='Angle').value,'180°');
});
test('line decomposition reconstructs bulk/weight with a unit direction and weighted support',()=>{
  for(const n of [3,4]){const A=new Algebra(n,'rigid'),p=[1,2,...(n===4?[.6]:[]),2],q=[-2,1,...(n===4?[1.1]:[]),.7],u=A.blade([p,q]),weight=A.weight(u),d=Array(n).fill(0);for(let i=0;i<n-1;i++)d[i]=-weight[(1<<i)|(1<<(n-1))];const support=closestPoint(basis(n,n-1),u,A);support[n-1]=0;assert.ok(length(sub(A.blade([scale(d,1/length(d)),scale(support,-length(d))]),A.bulk(u)))<1e-6);assert.ok(length(sub(A.blade([basis(n,n-1),d]),weight))<1e-6);}
});
test('projective quadric mesh includes both homogeneous weights and preserves the sandwich invariant',()=>{
  for(const n of [3,4]){const A=new Algebra(n,'rigid'),a=[1.3,.4,...(n===4?[.2]:[]),.5],v=[.8,-.7,...(n===4?[.1]:[]),1.2],out=A.coordinates(scale(A.reflect(A.vector(v),A.vector(a)),-1)),norm=length(a.slice(0,-1)),u=scale(a.slice(0,-1),1/norm),L=p=>p[n-1]-a[n-1]*dot(u,p.slice(0,-1))/norm,k=dot(v.slice(0,-1),v.slice(0,-1))/(L(v)**2),scene=Object.assign(Object.create(Scene.prototype),{n,commands:[],labels:[]});projectiveSurface(scene,a,v);const mesh=scene.commands.flatMap(c=>c.points);assert.ok(mesh.some(p=>Math.abs(p[n-1]-out[n-1])<1e-6));for(const p of mesh)near(dot(p.slice(0,-1),p.slice(0,-1))-k*L(p)**2,0,1e-5);near(dot(out.slice(0,-1),out.slice(0,-1))-k*L(out)**2,0);}
});
