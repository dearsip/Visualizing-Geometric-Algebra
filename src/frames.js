import { add, sub, scale, dot, length, unit, EPS } from './algebra.js';
export function continuousFactors(a,alg,previous=null){
  const seed=alg.factor(a),k=seed.length;if(k<2)return seed;
  const span=seed.map(unit),frame=[];
  const candidates=previous?.length===k?[...previous.map(unit),...span]:span;
  for(const old of candidates){let v=span.reduce((s,b)=>add(s,scale(b,dot(old,b))),Array(alg.n).fill(0));for(const u of frame)v=sub(v,scale(u,dot(u,v)));if(length(v)>EPS)frame.push(unit(v));if(frame.length===k)break;}
  if(frame.length!==k)return seed;
  const sign=dot(alg.blade(frame),a)<0?-1:1,r=length(a)**(1/k);
  return frame.map((v,i)=>scale(v,r*(i===k-1?sign:1)));
}
