import { halfDisplacement,reflectedPosition } from '../src/projective-field.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Algebra, basis, add, sub, scale, dot, length } from '../src/algebra.js';
import { defaultView,toView,orbit,screenPoint,dragDelta,dragOnSurface,intersectCoordinates,restrictLinear,ELEVATION_LIMIT } from '../src/camera.js';
import { continuousFactors } from '../src/frames.js';
import { chapters } from '../src/content.js';
import { FigureModel } from '../src/figures.js';
import { Scene } from '../src/scene.js';
import { affine,embed,cgaRound,closestPoint } from '../src/geometry.js';
import { activeInputs,dragSpace,embeddedRound,projectiveSurface,surfaceRetraction } from '../src/lesson-revisions.js';
import { mathTokens } from '../src/math-label.js';
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const definition=type=>chapters.flatMap(c=>c.figures).find(d=>d.type===type);

test('reflection product parallelograms show matching source and image angle arcs',()=>{
  for(const dimension of [3,4]){
    const model=new FigureModel(definition('reflection'),dimension);
    const scene=Object.assign(Object.create(Scene.prototype),{n:dimension,commands:[],labels:[],handles:[],factorFrames:new Map(),view:defaultView(dimension)});
    const arcs=[];scene.angle=(first,second)=>arcs.push([first,second]);
    model.update('products',true);
    for(const moved of [false,true]){
      if(moved)model.move(1,model.vectors[1].map((value,axis)=>value+.17*(axis+1)));
      arcs.length=0;model.paint(scene);assert.equal(arcs.length,2);
      assert.deepEqual(arcs[0],[model.vectors[0],model.vectors[1]]);
      const image=scale(model.alg.coordinates(model.alg.reflect(model.alg.vector(model.vectors[1]),model.alg.vector(model.vectors[0]))),-1);
      assert.deepEqual(arcs[1],[image,model.vectors[0]]);
      const angle=([first,second])=>Math.acos(Math.max(-1,Math.min(1,dot(first,second)/(length(first)*length(second)))));
      near(angle(arcs[0]),angle(arcs[1]));
    }
    model.update('products',false);arcs.length=0;model.paint(scene);assert.equal(arcs.length,0);
  }
});
test('grab orbit follows drag on the near side in orthographic and perspective views',()=>{
  for(const perspective of [false,true])for(const n of [3,4]){const v={...defaultView(n),yaw:0,pitch:0,perspective},point=[0,-1,0,...(n===4?[0]:[])],project=()=>screenPoint(point,v,n,false,800,500,65),p=project();orbit(v,n,false,8,0);assert.ok(project().x>p.x);v.yaw=0;v.roll=0;const q=project();orbit(v,n,false,0,8);assert.ok(project().y>q.y);}
});
test('right orbit is disabled in 3D; elevations nearly reach both poles',()=>{
  const v=defaultView(3),before={...v};orbit(v,3,false,100,-100,2);assert.deepEqual(v,before);orbit(v,3,false,0,10000);near(v.pitch,ELEVATION_LIMIT);orbit(v,3,false,0,-10000);near(v.pitch,-ELEVATION_LIMIT);assert.ok(ELEVATION_LIMIT>89*Math.PI/180);
});
test('4D extra axis starts collapsed and reaches the opposite collapse',()=>{const v=defaultView(4);near(toView(basis(4,3),v,4)[2],1);orbit(v,4,false,0,-Math.PI/.009,2);near(v.extra,Math.PI);near(toView(basis(4,3),v,4)[1],0);near(toView(basis(4,3),v,4)[2],-1);});

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
  for(const n of [3,4])for(const type of ['dot','euclidean-dot','antidot']){const m=new FigureModel(definition(type),n);m.state.fix=true;const A=m.alg,product=()=>type==='antidot'?A.antiInner(A.vector(m.vectors[0]),A.vector(m.vectors[1])):A.inner(A.vector(m.vectors[0]),A.vector(m.vectors[1])),before=product();for(let i=0;i<2;i++)m.move(i,m.vectors[i].map((v,j)=>v+.17*(j+1)));near(product(),before);if(type==='antidot')near(m.vectors[0][n-1],1.35);}
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
test('projective shading and surfaces use the displacement invariant on the unit slice',()=>{
  for(const n of [3,4]){const a=[1.3,.4,...(n===4?[.2]:[]),.5],v=[.8,-.7,...(n===4?[.1]:[]),1.2],p=scale(v.slice(0,-1),1/v.at(-1)),k=halfDisplacement(a,p),out=reflectedPosition(a,p),scene=Object.assign(Object.create(Scene.prototype),{n,commands:[],labels:[]});near(halfDisplacement(a,out),k);projectiveSurface(scene,a,v);const mesh=scene.commands.flatMap(c=>c.points);assert.ok(mesh.length>20);for(const p of mesh){near(p[n-1],1);near(halfDisplacement(a,p.slice(0,-1)),k,1e-5);}}
});

test('geometric product Fix value couples both points in the original wedge plane',()=>{
  for(const dimension of [3,4])for(const type of ['geometric','projective-product'])for(const moving of [0,1]){
    const model=new FigureModel(definition(type),dimension),algebra=model.alg,original=structuredClone(model.vectors),product=algebra.gp(...original.map(vector=>algebra.vector(vector))),blade=algebra.blade(original);
    const normProduct=original.reduce((value,vector)=>value*algebra.inner(algebra.vector(vector),algebra.vector(vector)),1);
    model.update('fix',true);const frame=dragSpace(model,moving);assert.equal(frame.length,2);
    for(let step=0;step<120;step++){
      const angle=step*.025,size=1+.35*Math.sin(step*.11),request=scale(add(scale(frame[0],Math.cos(angle)),scale(frame[1],Math.sin(angle))),size);
      model.move(moving,request);
      assert.ok(length(sub(algebra.gp(...model.vectors.map(vector=>algebra.vector(vector))),product))<1e-8);
      for(const vector of model.vectors)assert.ok(length(algebra.wedge(algebra.vector(vector),blade))<1e-8);
      near(model.vectors.reduce((value,vector)=>value*algebra.inner(algebra.vector(vector),algebra.vector(vector)),1),normProduct);
    }
    assert.ok(length(sub(model.vectors[1-moving],original[1-moving]))>.05);
    const before=structuredClone(model.vectors);model.move(moving,Array(dimension).fill(0));assert.deepEqual(model.vectors,before);
    if(type==='projective-product'){assert.equal(model.state.lockWeight,true);assert.ok(Math.abs(model.vectors[moving][dimension-1]-1)>.01);model.update('fix',false);for(const vector of model.vectors)near(vector[dimension-1],1);assert.ok(dragSpace(model,moving).every(axis=>Math.abs(axis[dimension-1])<1e-8));}
  }
});
test('fixed-product projected dragging follows an oblique plane in both camera modes',()=>{
  for(const dimension of [3,4])for(const type of ['geometric','projective-product'])for(const perspective of [false,true]){
    const model=new FigureModel(definition(type),dimension),view={...defaultView(dimension),perspective,extra:.9},project=point=>screenPoint(point,view,dimension,false,800,500,65);
    model.update('fix',true);const before=project(model.vectors[0]),next=dragOnSurface(project,model.vectors[0],4,-3,dragSpace(model,0),point=>point);model.move(0,next);const after=project(model.vectors[0]);near(after.x-before.x,4,.03);near(after.y-before.y,-3,.03);
  }
});
test('fixed-product collinear and null inputs stay finite and preserve the product',()=>{
  for(const type of ['geometric','projective-product'])for(const vectors of [[[1,0,0],[2,0,0]],[[0,0,0],[1,1,1]],[[0,0,1],[1,0,1]]]){
    const model=new FigureModel(definition(type),3);model.vectors=structuredClone(vectors);model.update('fix',true);const product=model.alg.gp(...model.vectors.map(vector=>model.alg.vector(vector)));
    model.move(0,[.4,.2,.7]);assert.ok(model.vectors.flat().every(Number.isFinite));assert.ok(length(sub(model.alg.gp(...model.vectors.map(vector=>model.alg.vector(vector))),product))<1e-8);
  }
});
test('releasing fixed products preserves an opted-out unit-slice preference',()=>{
  for(const dimension of [3,4]){
    const model=new FigureModel(definition('projective-product'),dimension);model.update('lockWeight',false);model.update('fix',true);model.move(0,scale(model.vectors[0],1.4));
    const before=structuredClone(model.vectors);model.update('fix',false);assert.equal(model.state.lockWeight,false);assert.deepEqual(model.vectors,before);
  }
});
test('input wedges retain actual edges, and trivector color is independent of left orbit',()=>{for(const n of [3,4]){const m=new FigureModel(definition('trivector'),n),scene=Object.assign(Object.create(Scene.prototype),{n,commands:[],labels:[],handles:[],view:defaultView(n)});m.paint(scene);const before=scene.commands.filter(c=>c.kind==='poly').map(c=>c.color);orbit(scene.view,n,false,130,280);scene.commands=[];scene.labels=[];scene.handles=[];m.paint(scene);assert.deepEqual(scene.commands.filter(c=>c.kind==='poly').map(c=>c.color),before);m.update('order',1);scene.commands=[];m.paint(scene);assert.notEqual(scene.commands.find(c=>c.kind==='poly').color,before[0]);}});
test('line weight normalization and parallel meet preserve the geometric objects',()=>{for(const n of [3,4]){const line=chapters.flatMap(c=>c.figures).find(f=>f.id==='line'),m=new FigureModel(line,n),A=m.alg,original=A.blade(m.vectors);m.update('unitLineWeight');near(A.weightNorm(A.blade(m.vectors)),1);for(const v of m.vectors)assert.ok(length(A.wedge(A.vector(v),original))<1e-6);const meet=new FigureModel(definition('meet'),n);meet.update('parallel');const x=meet.alg.blade(meet.vectors.slice(0,n-1)),y=meet.alg.blade(meet.vectors.slice(n-1)),out=meet.alg.antiwedge(x,y);assert.ok(length(out)>1e-5);near(length(meet.alg.weight(out)),0);}});
test('skew-line distance agrees with the closest segment',()=>{const m=new FigureModel(definition('distance'),4);m.update('case',3);m.vectors=[[0,0,0,1],[1,0,0,1],[0,0,2,1],[0,1,2,1]];const scene=Object.assign(Object.create(Scene.prototype),{n:4,commands:[],labels:[],handles:[],view:defaultView(4)});m.paint(scene);near(m.rows.find(x=>x.label==='Distance').value,2);const d=scene.commands.find(c=>c.color==='#e28a42'&&c.kind==='line'&&c.width===2);near(length(sub(d.points[0],d.points[1])),2);});
test('CGA null dragging follows the requested screen displacement after unitization',()=>{for(const n of [4,5])for(const perspective of [false,true]){const m=new FigureModel(definition('cga-property'),n-1),view=defaultView(n,true);view.perspective=perspective;orbit(view,n,true,80,130);const p=m.vectors[0],project=v=>screenPoint(v,view,n,true,800,500,65),space=dragSpace(m,0),retract=surfaceRetraction(m,0),q=dragOnSurface(project,p,7,-4,space,retract),a=project(p),b=project(q);near(q[n-2],1);near(m.alg.inner(m.alg.vector(q),m.alg.vector(q)),0);near(b.x-a.x,7,.1);near(b.y-a.y,-4,.1);}});

test('2D round camera preserves a vertical extra-axis pair and exchanges only that pair',()=>{const v=defaultView(4,true);for(let i=0;i<12;i++){const hidden=toView(basis(4,2),v,4,true),up=toView(basis(4,3),v,4,true);near(hidden[0],0);near(hidden[1],0);near(up[0],0);assert.ok(up[1]>0);orbit(v,4,true,23,-9);}const before={...v};orbit(v,4,true,0,-200,2);assert.deepEqual(v,before);orbit(v,4,true,1000,0,2);near(v.conformal,Math.PI/2);const a=toView(basis(4,2),v,4,true),b=toView(basis(4,3),v,4,true);near(a[0],0);assert.ok(a[1]>0);near(b[0],0);near(b[1],0);});
test('null-cone camera removes e2 and exchanges the forward/up extra axes',()=>{const v=defaultView(4,true,true),forward=toView(basis(4,2),v,4,true),up=toView(basis(4,3),v,4,true);near(length(toView(basis(4,1),v,4,true)),0);orbit(v,4,true,1000,0,2);const origin=toView(basis(4,2),v,4,true),infinity=toView(basis(4,3),v,4,true);for(let i=0;i<3;i++){near(origin[i],up[i]);near(infinity[i],-forward[i]);}});
test('bilinearity offers both distributive identities and defaults to both sides',()=>{for(const n of [3,4]){const m=new FigureModel(definition('distribute'),n),A=m.alg;assert.ok(m.state.lhs&&m.state.rhs);m.update('linearity','right');const [a,b,c]=m.vectors.map(v=>A.vector(v));assert.ok(length(sub(A.wedge(a,add(b,c)),add(A.wedge(a,b),A.wedge(a,c))))<1e-8);const scene=Object.assign(Object.create(Scene.prototype),{n,commands:[],labels:[],handles:[],view:defaultView(n)});m.paint(scene);assert.ok(m.formula.includes(' + '));assert.ok(scene.labels.some(x=>x.text==='a ∧ (b + c)'));}});
test('flat unit-slice constraints and initial dot weights are enabled by default',()=>{for(const n of [3,4]){for(const type of ['dot','flat','parametric']){const m=new FigureModel(definition(type),n);assert.equal(m.state.lockWeight,true);for(const v of m.vectors)near(v[n-1],1);}assert.equal(new FigureModel(definition('distance'),n).controls.find(c=>c.key==='case').options.some(x=>x[0]===3),n===4);const view=defaultView(n,false,false,true);near(view.center[n-1],.5);}});
test('round-point parallel plane intersects the horosphere at the indicated radius',()=>{for(const n of [4,5]){const m=new FigureModel(definition('roundpoint'),n-1);m.vectors[0]=embed([.6,-.3,...(n===5?[.25]:[])],n,1.2);m.state.tangent=true;const scene=Object.assign(Object.create(Scene.prototype),{n,commands:[],labels:[],handles:[],view:defaultView(n,true)});m.paint(scene);const A=m.alg,p=A.vector(embed(m.vectors[0].slice(0,n-2),n)),points=scene.commands.filter(c=>c.color==='#278e87').flatMap(c=>c.points).filter(x=>Math.abs(x[n-1])>1e-6);assert.ok(points.length>60);for(const x of points){near(x[n-2],1);near(A.inner(A.vector(x),A.vector(x)),0);near(A.inner(p,A.vector(x)),-.6);}for(const x of scene.commands.filter(c=>c.color==='#8d5c79').flatMap(c=>c.points))near(A.inner(p,A.vector(x)),0);assert.ok(!scene.labels.some(x=>x.text==='Imaginary'));}});
test('null-point drag can leave a rank-deficient projected tangent without sticking',()=>{const n=4,m=new FigureModel(definition('cga-property'),3),view={...defaultView(4,true),yaw:0,pitch:0},p=embed([1,0],4),project=p=>screenPoint(p,view,4,true,800,500,65);m.vectors[0]=p;const q=dragOnSurface(project,p,0,-6,dragSpace(m,0),surfaceRetraction(m,0)),a=project(p),b=project(q);near(b.x,a.x,.1);near(b.y-a.y,-6,.1);near(m.alg.inner(m.alg.vector(q),m.alg.vector(q)),0);assert.ok(Math.abs(q[1])>.1);});
