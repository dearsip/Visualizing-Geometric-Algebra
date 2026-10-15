import { basis, add, scale, dot, length, EPS } from './algebra.js';
export const HALF_PI=Math.PI/2;
export const ELEVATION_LIMIT=HALF_PI-.003;
export const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
export function defaultView(n,cga=false,section=false,flat=false){return {yaw:.42,pitch:.58,roll:0,extra:cga&&n===5?HALF_PI:0,conformal:0,section,zoom:1.15,perspective:false,center:flat?basis(n,n-1,.5):cga&&!section?basis(n,n-1,.65):undefined};}
function spatialFrame(view){
  if(view.frame)return view.frame;
  const c=Math.cos(view.yaw),s=Math.sin(view.yaw),p=Math.cos(view.pitch),q=Math.sin(view.pitch);
  return [[c,s,0],[-s*q,c*q,p],[s*p,-c*p,q]];
}
// Camera coordinates: right, up, near. e2 is forward/away; no algebra-coordinate negation.
export function toView(p,view,n,cga=false){
  if(cga){
    const beta=view.conformal||0,alpha=view.extra??HALF_PI,origin=p[n-2]/Math.sqrt(2),infinity=p[n-1]*Math.sqrt(2),vertical=infinity*Math.cos(beta)+origin*Math.sin(beta),other=origin*Math.cos(beta)-infinity*Math.sin(beta);
    let projected,hidden;
    if(n===4){projected=view.section?[p[0],other,vertical]:[p[0],p[1],vertical];hidden=view.section?0:other;}
    else if(view.section){projected=[p[0],p[1]+p[2]*Math.cos(alpha)+other*Math.sin(alpha),vertical];hidden=other*Math.cos(alpha)-p[2]*Math.sin(alpha);}
    else{projected=[p[0],p[1],p[2]*Math.cos(alpha)+vertical*Math.sin(alpha)];hidden=vertical*Math.cos(alpha)-p[2]*Math.sin(alpha)+other;}
    const result=spatialFrame({...view,frame:null}).map(row=>dot(row,projected));result[2]+=hidden;return result;
  }
  const a=view.extra||0,spatial=[p[0],p[1],p[2]||0];
  let v=spatialFrame(view).map(row=>dot(row,spatial));
  if(n===4){const up=v[1];v[1]=up*Math.cos(a)+p[3]*Math.sin(a);v[2]+=p[3]*Math.cos(a)-up*Math.sin(a);}
  return v;
}
export function orbit(view,n,cga,dx,dy,button=0){
  if(button===2){if(n===3&&!cga)return;if(!cga||n===5)view.extra=clamp(view.extra-dy*.009,0,Math.PI);if(cga)view.conformal=clamp(view.conformal+dx*.009,0,HALF_PI);return;}
  if(n===3||cga){view.yaw-=dx*.008;view.pitch=clamp(view.pitch+dy*.007,-ELEVATION_LIMIT,ELEVATION_LIMIT);return;}
  // Rotate the spatial frame about display axes; the added-axis display directions stay fixed.
  const frame=spatialFrame(view),x=dy*.007,y=dx*.008,cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y);
  const horizontal=[frame[0].map((v,i)=>cy*v+sy*frame[2][i]),frame[1],frame[2].map((v,i)=>-sy*frame[0][i]+cy*v)];
  view.frame=[horizontal[0],horizontal[1].map((v,i)=>cx*v-sx*horizontal[2][i]),horizontal[2].map((v,i)=>sx*horizontal[1][i]+cx*v)];
}
export function screenPoint(p,view,n,cga,width,height,s){
  const centered=view.center?p.map((x,i)=>x-view.center[i]):p,v=toView(centered,view,n,cga),focal=10,factor=view.perspective===false?1:focal/Math.max(.5,focal-v[2]);
  return {x:width*.48+v[0]*s*factor,y:height*.55-v[1]*s*factor,z:v[2],factor};
}
export function dragDelta(project,p,dx,dy,space){
  const origin=project(p),step=1e-4,columns=space.map(v=>{const q=project(add(p,scale(v,step)));return [(q.x-origin.x)/step,(q.y-origin.y)/step];});
  const xx=columns.reduce((s,c)=>s+c[0]*c[0],0),xy=columns.reduce((s,c)=>s+c[0]*c[1],0),yy=columns.reduce((s,c)=>s+c[1]*c[1],0),det=xx*yy-xy*xy;
  let coefficients;
  if(det>1e-7*(xx+yy)**2){const a=(yy*dx-xy*dy)/det,b=(xx*dy-xy*dx)/det;coefficients=columns.map(c=>c[0]*a+c[1]*b);}
  else {const den=xx+yy;coefficients=columns.map(c=>den>EPS?(c[0]*dx+c[1]*dy)/den:0);}
  let delta=space.reduce((v,b,i)=>add(v,scale(b,coefficients[i])),Array(p.length).fill(0));
  if(length(delta)>12)delta=scale(delta,12/length(delta));return delta;
}
export function dragOnSurface(project,p,dx,dy,space,retract){
  const start=project(p),target={x:start.x+dx,y:start.y+dy};let q=[...p];
  for(let i=0;i<16;i++){const s=project(q),ex=target.x-s.x,ey=target.y-s.y,error=Math.hypot(ex,ey);if(error<.02)break;const delta=dragDelta(v=>project(retract(v)),q,ex,ey,space);let improved=false;for(const fraction of [1,.5,.25,.125,.0625,.03125,.015625]){const candidate=retract(add(q,scale(delta,fraction))),c=project(candidate);if(Math.hypot(target.x-c.x,target.y-c.y)<error-.00001){q=candidate;improved=true;break;}}
    if(!improved){let best=q,bestError=error;for(const step of [.08,-.08,.25,-.25,.5,-.5])for(const direction of space){const candidate=retract(add(q,scale(direction,step))),c=project(candidate),e=Math.hypot(target.x-c.x,target.y-c.y);if(e<bestError){best=candidate;bestError=e;}}if(bestError>=error-1e-5)break;q=best;}
  }
  return q;
}
export function coordinateSpace(n,indices){return (indices||Array.from({length:n},(_,i)=>i)).map(i=>basis(n,i));}
export function intersectCoordinates(space,indices){
  let frame=space;
  for(let j=0;j<(space[0]?.length||0);j++)if(!indices.includes(j)){
    const normal=frame.map(v=>v[j]),den=dot(normal,normal);if(den<EPS)continue;
    const next=[];for(let i=0;i<frame.length;i++){let c=basis(frame.length,i);c=c.map((v,k)=>v-normal[i]*normal[k]/den);for(const q of next)c=c.map((v,k)=>v-dot(c,q)*q[k]);if(length(c)>EPS)next.push(scale(c,1/length(c)));}
    frame=next.map(c=>frame.reduce((s,v,i)=>add(s,scale(v,c[i])),Array(space[0].length).fill(0)));
  }
  return frame;
}
export function restrictLinear(space,normal){
  const den=dot(normal,normal);if(den<EPS)return space;const coefficients=[];
  for(let i=0;i<space.length;i++){let v=basis(space.length,i).map((x,j)=>x-normal[i]*normal[j]/den);for(const u of coefficients)v=v.map((x,j)=>x-dot(v,u)*u[j]);if(length(v)>EPS)coefficients.push(scale(v,1/length(v)));}
  return coefficients.map(c=>space.reduce((s,v,i)=>add(s,scale(v,c[i])),Array(space[0].length).fill(0)));
}
