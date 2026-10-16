import {add,sub,scale,length,EPS} from './algebra.js';

// A pair of reflections gives R = b a / sqrt(a² b²). Its bivector is simple,
// so the exponential uses circular, hyperbolic, or linear functions exactly.
function reflectionPair(A,first,second){
  const a=A.vector(first),b=A.vector(second),qa=A.inner(a,a),qb=A.inner(b,b);
  if(Math.abs(qa)<EPS||Math.abs(qb)<EPS||qa*qb<0)return null;
  let R=scale(A.gp(b,a),1/Math.sqrt(qa*qb));
  if(R[0]<0)R=scale(R,-1); // R and -R induce the same transformation.
  const c=R[0],B=A.grade(R,2),square=c*c-1;
  if(length(B)<EPS)return null;
  const kind=square>1e-8?'hyperbolic':square< -1e-8?'elliptic':'parabolic';
  const rate=kind==='hyperbolic'?Math.acosh(Math.max(1,c)):kind==='elliptic'?Math.acos(Math.min(1,c)):1;
  const divisor=kind==='hyperbolic'?Math.sinh(rate):kind==='elliptic'?Math.sin(rate):1;
  const generator=scale(B,rate/divisor);
  const rotor=t=>kind==='hyperbolic'?add(A.scalar(Math.cosh(rate*t)),scale(B,Math.sinh(rate*t)/divisor)):
    kind==='elliptic'?add(A.scalar(Math.cos(rate*t)),scale(B,Math.sin(rate*t)/divisor)):add(A.scalar(),scale(B,t));
  const normalizedA=scale(first,1/Math.sqrt(Math.abs(qa))),normalizedB=scale(second,1/Math.sqrt(Math.abs(qb))),ab=A.inner(A.vector(normalizedA),A.vector(normalizedB)),sign=Math.sign(qa);
  let fixedPoints=[],fixedBlade=null;
  if(kind==='hyperbolic'){
    const other=scale(sub(normalizedB,scale(normalizedA,sign*ab)),1/Math.sqrt(ab*ab-1));
    fixedPoints=[add(normalizedA,other),sub(normalizedA,other)];
  }else if(kind==='parabolic')fixedPoints=[sub(normalizedB,scale(normalizedA,sign*ab))].filter(v=>length(v)>EPS);
  else fixedBlade=A.antiwedge(A.dual(a),A.dual(b));
  return {kind,rate,generator,rotor,fixedPoints,fixedBlade};
}

export function conformalFlow(A,mirrors){
  if(mirrors.length!==2&&mirrors.length!==4)return null;
  const pairs=[];
  for(let i=0;i<mirrors.length;i+=2){const pair=reflectionPair(A,mirrors[i],mirrors[i+1]);if(!pair)return null;pairs.push(pair);}
  if(pairs.length===2){
    const [a,b]=pairs.map(p=>p.generator),commutator=sub(A.gp(a,b),A.gp(b,a));
    if(length(commutator)>1e-7*(1+length(a)*length(b)))return null;
  }
  const kind=pairs.length===1?pairs[0].kind:'loxodromic';
  const rotor=t=>pairs.reduce((r,p)=>A.gp(p.rotor(t),r),A.scalar());
  const at=(point,t)=>{const r=rotor(t);return A.coordinates(A.gp(A.gp(r,A.vector(point)),A.reverse(r)));};
  const pair=pairs.find(p=>p.kind==='hyperbolic')||pairs.find(p=>p.kind==='parabolic')||pairs[0];
  return {kind,at,rotor,rate:pair.rate,period:kind==='elliptic'?Math.PI/pair.rate:null,
    fixedPoints:pair.fixedPoints.filter(v=>pairs.every(p=>{const r=p.rotor(.37),w=A.coordinates(A.gp(A.gp(r,A.vector(v)),A.reverse(r)));return length(A.blade([v,w]))<1e-7*length(v)*length(w);})),
    fixedBlade:pairs.length===1?pair.fixedBlade:null};
}

export function conformalOrbit(flow,point,steps=240){
  const times=[];
  for(let i=0;i<=steps;i++){
    const x=i/steps;
    times.push(flow.kind==='elliptic'?x*flow.period:flow.kind==='hyperbolic'?(x*12-6)/flow.rate:
      flow.kind==='parabolic'?Math.tan((x-.5)*Math.PI*.997):x*12-6);
  }
  times.push(0,1);times.sort((a,b)=>a-b);
  return times.filter((t,i)=>i===0||Math.abs(t-times[i-1])>1e-10).map(t=>({t,point:flow.at(point,t)}));
}

export function drawConformalOrbit(scene,samples,color){
  const n=scene.n,hat=p=>[...p.slice(0,n-1),0];
  let previous=null,arrows=0;
  for(const {point} of samples){
    const w=point[n-2],p=Math.abs(w)>1e-8?scale(point,1/w):null;
    if(!p||!p.every(Number.isFinite)||length(p.slice(0,n-2))>4.2||Math.abs(p[n-1])>9){previous=null;continue;}
    if(previous&&previous.w*w>0&&length(sub(previous.p,p))>1e-7){
      scene.line(hat(previous.p),hat(p),color,1.7,false,.9);
      Object.assign(scene.commands.at(-1),{trajectory:'spatial'});
      scene.line(previous.p,p,color,1.1,true,.65);
      Object.assign(scene.commands.at(-1),{trajectory:'embedded'});
      if(++arrows%65===0){scene.commands.at(-2).kind='arrow';}
    }
    previous={p,w};
  }
}
