import test from 'node:test';
import assert from 'node:assert/strict';
import { Algebra, basis, add, sub, scale, dot, length, close, indicesBlade } from '../src/algebra.js';
import { embed, cgaRound, cgaProperties, reflectionPath, composeReflections, screwInterpolate, transformPoint } from '../src/geometry.js';
const equal=(a,b)=>assert.ok(close(a,b),`residual ${length(sub(a,b))}`);
for(const n of [3,4,5]) {
  test(`${n}D exterior: complement inverse, defining basis identities, graded antisymmetry`,()=>{
    const A=new Algebra(n);for(let i=0;i<A.size;i++){const a=A.zero();a[i]=1;equal(A.lc(A.rc(a)),a);equal(A.rc(A.lc(a)),a);equal(A.wedge(a,A.rc(a)),A.volume());equal(A.wedge(A.lc(a),a),A.volume());}
    const a=A.vector(Array.from({length:n},(_,i)=>i+.3)),b=A.vector(Array.from({length:n},(_,i)=>i%2?-.8:1.2));equal(A.wedge(a,b),scale(A.wedge(b,a),-1));
  });
  for(const kind of ['euclidean','rigid','conformal']){
    test(`${n}D ${kind}: Clifford relation and associativity on all basis triples`,()=>{
      const A=new Algebra(n,kind);for(let i=0;i<n;i++)for(let j=0;j<n;j++){const a=A.vector(basis(n,i)),b=A.vector(basis(n,j));equal(add(A.gp(a,b),A.gp(b,a)),A.scalar(2*A.g[i][j]));}
      for(let i=0;i<A.size;i++)for(let j=0;j<A.size;j++)for(let k=0;k<A.size;k++){const a=A.zero(),b=A.zero(),c=A.zero();a[i]=b[j]=c[k]=1;equal(A.gp(A.gp(a,b),c),A.gp(a,A.gp(b,c)));}
    });
  }
}
for(const n of [3,4]){
  test(`${n}D rigid: projection, homogeneous scaling, and reflection`,()=>{
    const A=new Algebra(n,'rigid'),p=basis(n,n-1);p[0]=2;p[1]=.5;
    const line=A.blade([basis(n,n-1),add(basis(n,n-1),basis(n,0))]);
    const projected=A.project(A.vector(p),line).result;const q=A.coordinates(projected);assert.ok(Math.abs(q[1])<1e-7);assert.ok(Math.abs(q[0]/q[n-1]-2)<1e-7);
    const normal=add(basis(n,0),basis(n,n-1,-.7)),g=A.lc(A.vector(normal));
    const r=A.antiReflect(A.vector(p),A.vector(normal)),x=A.coordinates(r);assert.ok(Math.abs(x[0]/x[n-1]+.6)<1e-7);assert.ok(Math.abs(x[1]/x[n-1]-.5)<1e-7);
    const alt=scale(A.agp(A.agp(g,A.vector(p)),g),-1);equal(r,alt);
    equal(A.project(scale(A.vector(p),3),scale(line,2)).result,scale(projected,12));
  });
  test(`${n}D factorization reconstructs simple blades`,()=>{
    const A=new Algebra(n);for(let k=1;k<=n;k++){const vs=Array.from({length:k},(_,i)=>basis(n,i).map((v,j)=>v+.15*(i+j+1)));const B=A.blade(vs);equal(A.blade(A.factor(B)),B);}
  });
}
for(const n of [4,5]){
  test(`${n}D conformal: null embedding, metric antidual, round point radius and circle`,()=>{
    const A=new Algebra(n,'conformal'),x=Array(n-2).fill(.4),p=A.vector(embed(x,n));assert.ok(Math.abs(A.inner(p,p))<1e-8);
    for(let i=0;i<A.size;i++){const u=A.zero();u[i]=1;equal(A.antiMetricMap(u),scale(A.metricMap(u),-1));equal(A.dual(u,true),scale(A.dual(u),-1));}
    const a=A.vector(embed(x,n,.7)),info=cgaRound(a,A);assert.ok(Math.abs(info.radius2-.7)<1e-7);equal(info.center.slice(0,n-2),x);
    const center=Array(n-2).fill(0);center[0]=.3;const vs=[0,2*Math.PI/3,4*Math.PI/3].map(t=>{const v=[...center];v[0]+=Math.cos(t);v[1]+=Math.sin(t);return embed(v,n);});
    const C=A.blade(vs),circle=cgaRound(C,A);assert.ok(Math.abs(circle.radius2-1)<1e-7);equal(circle.center.slice(0,n-2),center);assert.ok(circle.dirs.length===2);
    const par=cgaProperties(C,A).partner;assert.ok(Math.abs(A.inner(C,par))<1e-7);assert.ok(Math.abs(cgaRound(par,A).radius2+1)<1e-7);
  });
}
for(const dim of [2,3]){
  test(`${dim}D motor/flector screw interpolation preserves metric and endpoints`,()=>{
    const planes=dim===2?[[1,.3,-.4],[.2,1,.2],[-.4,.7,.6],[.8,-.6,-.3]]:[[1,.3,.1,-.4],[.2,1,.4,.2],[-.4,.7,.6,.6],[.8,-.6,.3,-.3]];
    const p=[...Array(dim).fill(.5),1],q=[...Array(dim).fill(-.7),1];
    for(const count of [2,3,4]){const ps=planes.slice(0,count),f=composeReflections(ps,dim);equal(reflectionPath(ps,p,dim,1),transformPoint(p,f,dim));const a=reflectionPath(ps,p,dim,.4),b=reflectionPath(ps,q,dim,.4);assert.ok(Math.abs(length(sub(a,b))-length(sub(p,q)))<1e-7);}
  });
}
