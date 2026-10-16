import {EPS,basis,add,scale,dot} from './algebra.js';
import {embed,spatialRound} from './geometry.js';
import {colors} from './scene.js';
export function roundPointConstruction(m,scene,embeddedRound){
  const n=m.n,A=m.alg,s=m.state,raw=m.vectors[0],w=raw[n-2];if(Math.abs(w)<EPS)return;
  const a=scale(raw,1/w),x=a.slice(0,n-2),p=embed(x,n),center=[...x,1,0],r2=-A.inner(A.vector(a),A.vector(a)),radius=Math.sqrt(Math.abs(r2)),label=n===4?'c':'s',frame=Array.from({length:n-2},(_,i)=>add(basis(n,i),basis(n,n-1,x[i])));
  scene.point(a,Math.abs(w-1)<EPS?'':'\\hat{a}',colors.a,5);
  if(s.carrierLine)scene.locusLine(p,basis(n,n-1),colors.mesh);
  if(s.tangent){scene.locusSpan(p,scene.orthonormal(frame),colors.c);scene.point(p,'p',colors.c);scene.label(add(p,basis(n,0,-.7)),'Tangent plane',colors.c,{dy:-20});}
  if(s.parallelPlane){scene.locusSpan(a,scene.orthonormal(frame),colors.b);scene.label(add(a,basis(n,0,.65)),'Parallel plane',colors.b,{dy:22});}
  if(r2>EPS){const round=A.blade(m.roundSeeds(x,radius));if(s.section)embeddedRound(scene,round,A,label,colors.result);if(s.spatial)spatialRound(scene,round,A,`\\hat{${label}}`,colors.result);m.row(label,m.mv(round));}
  else if(r2< -EPS){const color=colors.purple;if(s.section){const fs=Array.from({length:n-2},(_,i)=>basis(n-2,i));for(let axis=0;axis<(n===4?1:3);axis++){let prev;for(let i=0;i<=64;i++){const t=i*Math.PI/32,y=x.map((v,j)=>v+radius*(fs[axis][j]*Math.cos(t)+fs[(axis+1)%fs.length][j]*Math.sin(t))),q=[...y,1,dot(x,y)+(r2-dot(x,x))/2];if(prev)scene.line(prev,q,color,1,true);prev=q;}}}if(s.spatial){const spatial=Array.from({length:n-2},(_,i)=>basis(n,i));if(n===4)scene.circle(center,spatial[0],spatial[1],radius,color,true);else scene.sphere(center,radius,color,true,.7,spatial);}}
  else if(Math.abs(r2)<=EPS&&s.section)scene.point(p,label,colors.result,5);
  if(s.radius){scene.point(center,'',colors.result,3);scene.line(center,add(center,basis(n,0,radius)),colors.result,2);scene.label(add(center,basis(n,0,radius/2)),r2<0?'|r|':'r',colors.result,{dy:18,scalar:true});}
  m.row('a • a',Number((-r2).toFixed(3)));m.row('r²',Number(r2.toFixed(3)));
}
