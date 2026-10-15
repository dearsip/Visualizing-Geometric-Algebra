import { add, sub, scale, dot, unit, length, basis, EPS, Algebra } from './algebra.js';
export function embed(x, n, radius2 = 0) {return [...x.slice(0,n-2),1,(dot(x.slice(0,n-2),x.slice(0,n-2))+radius2)/2];}
export function affine(v) {const h=v.length-1;return Math.abs(v[h])>EPS?scale(v,1/v[h]):null;}
export function cgaParts(a,alg) {
  const w=1<<(alg.n-2),u=1<<(alg.n-1);
  return [0,w,u,w|u].map(group=>a.map((v,i)=>(i&(w|u))===group?v:0));
}
export function cgaProperties(a,alg) {
  const inf=alg.vector(basis(alg.n,alg.n-1));
  const carrier=alg.wedge(a,inf),dual=alg.dual(a),antidual=alg.dual(a,true),cocarrier=alg.wedge(antidual,inf);
  const container=alg.wedge(a,alg.dual(carrier,true));
  const partner=scale(alg.antiwedge(alg.wedge(antidual,alg.dual(cocarrier,true)),carrier),(-1)**((alg.gradeOf(a)??0)+1));
  const attitude=alg.antiwedge(a,alg.rc(alg.vector(basis(alg.n,alg.n-2))));
  const conjugate=a.map((v,i)=>(i&(1<<(alg.n-1)))?-v:v);
  return {carrier,dual,antidual,cocarrier,container,partner,attitude,conjugate};
}
export function removeInfinity(a,alg) {
  const r=new Algebra(alg.n-1,'rigid'),out=r.zero(),bit=1<<(alg.n-1);
  for(let i=0;i<r.size;i++)out[i]=a[i|bit];
  return {alg:r,blade:out};
}
export function cgaRound(a,alg) {
  const k=alg.gradeOf(a);if(k===-1||k===null||k===0)return null;
  const prop=cgaProperties(a,alg),parts=cgaParts(a,alg),roundWeight=length(parts[1]);
  if(length(prop.carrier)<EPS)return {flat:true,...removeInfinity(a,alg),...prop};
  if(roundWeight<EPS)return null;
  let center;
  if(k===1){const q=alg.coordinates(a);if(Math.abs(q[alg.n-2])<EPS)return null;center=scale(q,1/q[alg.n-2]);center[alg.n-1]=0;}
  else{
    const sv=alg.coordinates(alg.dual(prop.container));
    if(Math.abs(sv[alg.n-2])<EPS)return null;
    center=scale(sv,1/sv[alg.n-2]);center[alg.n-1]=0;
  }
  const radius2=-alg.inner(a,a)/(roundWeight*roundWeight);
  const f=removeInfinity(prop.carrier,alg),frame=f.alg.factor(f.blade),h=f.alg.n-1;
  const pivot=frame.findIndex(v=>Math.abs(v[h])>EPS);const dirs=[];
  if(pivot>=0)for(let j=0;j<frame.length;j++)if(j!==pivot){let v=sub(frame[j],scale(frame[pivot],frame[j][h]/frame[pivot][h]));for(const t of dirs)v=sub(v,scale(t,dot(t,v)));if(length(v)>EPS)dirs.push(unit(v));}
  return {center,radius2,dirs:dirs.map(v=>[...v,0]),...prop};
}
export function spatialRound(scene,a,alg,label,color,options={}) {
  const info=cgaRound(a,alg);if(!info)return;
  if(info.flat){scene.flat(info.blade,info.alg,label,color);return info;}
  const {center,radius2,dirs}=info,r=Math.sqrt(Math.abs(radius2)),imaginary=radius2< -EPS;
  if(alg.gradeOf(a)===1){scene.point(center,label,color,5);if(options.radius&&r>EPS)scene.sphere(center,r,color,true,.4,Array.from({length:alg.n-2},(_,i)=>basis(alg.n,i)));}
  else if(dirs.length===1){scene.point(add(center,scale(dirs[0],r)),label,color,5);scene.point(add(center,scale(dirs[0],-r)),'',color,5);scene.line(add(center,scale(dirs[0],-r)),add(center,scale(dirs[0],r)),color,1,true,.5);}
  else if(dirs.length===2){scene.circle(center,dirs[0],dirs[1],r,color,imaginary,.95);scene.label(add(center,scale(dirs[0],r)),label,color,{dy:-10});}
  else if(dirs.length>=3){scene.sphere(center,r,color,true,.8,dirs);scene.label(center,label,color,{dy:-15});}
  if(options.radius){const direction=dirs[0]||basis(alg.n,0);scene.line(center,add(center,scale(direction,r)),color,2);scene.label(add(center,scale(direction,r*.5)),imaginary?'|r|':'r',color,{dy:15,size:16,scalar:true});}
  return info;
}
export function perpendicularFrame(a) {
  const n=a.length,u=unit(a),fs=[];
  for(let i=0;i<n;i++){let v=sub(basis(n,i),scale(u,u[i]));for(const f of fs)v=sub(v,scale(f,dot(f,v)));if(length(v)>EPS)fs.push(unit(v));}
  return fs;
}
export function closestPoint(p,blade,alg){
  const q=alg.project(alg.vector(p),blade).result;
  return affine(alg.coordinates(q));
}
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const matvec=(m,x)=>m.map(row=>dot(row,x));
const matmul=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((s,v,k)=>s+v*b[k][j],0)));
const identity=()=>[basis(3,0),basis(3,1),basis(3,2)];
export function screwParameters(transform){
  const R=transform.rotation,T=transform.translation,angle=Math.acos(Math.max(-1,Math.min(1,(R[0][0]+R[1][1]+R[2][2]-1)/2)));
  if(angle<EPS)return {angle,axis:unit(T),center:[0,0,0]};
  let axis=unit([R[2][1]-R[1][2],R[0][2]-R[2][0],R[1][0]-R[0][1]]);
  if(length(axis)<EPS){axis=[Math.sqrt(Math.max(0,(R[0][0]+1)/2)),Math.sqrt(Math.max(0,(R[1][1]+1)/2)),Math.sqrt(Math.max(0,(R[2][2]+1)/2))];if(R[0][1]<0)axis[1]*=-1;if(R[0][2]<0)axis[2]*=-1;axis=unit(axis);}
  const perp=sub(T,scale(axis,dot(axis,T))),center=scale(add(perp,scale(cross(axis,perp),1/Math.tan(angle/2))),.5);
  return {angle,axis,center};
}
export function composeReflections(planes,dim) {
  let rotation=identity(),translation=[0,0,0];
  for(const p of planes){const n=unit([...p.slice(0,dim),...Array(3-dim).fill(0)]),d=p[dim]/(length(p.slice(0,dim))||1);const r=identity().map((row,i)=>row.map((v,j)=>v-2*n[i]*n[j]));rotation=matmul(r,rotation);translation=add(matvec(r,translation),scale(n,-2*d));}
  return {rotation,translation};
}
export function screwInterpolate(transform,t) {
  const R=transform.rotation,T=transform.translation;const angle=Math.acos(Math.max(-1,Math.min(1,(R[0][0]+R[1][1]+R[2][2]-1)/2)));
  if(angle<1e-7)return {rotation:identity(),translation:scale(T,t)};
  let axis;
  if(Math.PI-angle<1e-5){axis=[Math.sqrt(Math.max(0,(R[0][0]+1)/2)),Math.sqrt(Math.max(0,(R[1][1]+1)/2)),Math.sqrt(Math.max(0,(R[2][2]+1)/2))];if(R[0][1]<0)axis[1]*=-1;if(R[0][2]<0)axis[2]*=-1;if(length(axis)<EPS)axis=[0,0,1];axis=unit(axis);}
  else axis=unit([R[2][1]-R[1][2],R[0][2]-R[2][0],R[1][0]-R[0][1]]);
  const skew=[[0,-axis[2],axis[1]],[axis[2],0,-axis[0]],[-axis[1],axis[0],0]],cos=Math.cos(angle*t),sin=Math.sin(angle*t);
  const Rt=identity().map((row,i)=>row.map((v,j)=>cos*v+(1-cos)*axis[i]*axis[j]+sin*skew[i][j]));
  const para=scale(axis,dot(axis,T)),perp=sub(T,para),center=scale(add(perp,scale(cross(axis,perp),1/Math.tan(angle/2))),.5);
  return {rotation:Rt,translation:add(sub(center,matvec(Rt,center)),scale(para,t))};
}
export function transformPoint(p,transform,dim) {const x=[...p.slice(0,dim),...Array(3-dim).fill(0)];return [...add(matvec(transform.rotation,x),transform.translation).slice(0,dim),1];}
export function reflectionPath(planes,p,dim,t){
  if(planes.length%2===0)return transformPoint(p,screwInterpolate(composeReflections(planes,dim),t),dim);
  const first=composeReflections(planes.slice(0,1),dim),pre=transformPoint(p,first,dim);
  // Factor out a fixed reflection. The remaining proper isometry has a screw path.
  return transformPoint(pre,screwInterpolate(composeReflections(planes.slice(1),dim),t),dim);
}
