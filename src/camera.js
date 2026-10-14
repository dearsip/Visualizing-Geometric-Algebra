import { basis, add, scale, dot, length, EPS } from './algebra.js';
export const HALF_PI=Math.PI/2;
export const ELEVATION_LIMIT=HALF_PI-.003;
export const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
export function defaultView(n,cga=false,section=false){return {yaw:.42,pitch:.58,roll:0,extra:cga?(section&&n===4?HALF_PI:.72):0,conformal:.12,zoom:1.15,perspective:true};}
// Camera coordinates: right, up, near. e2 is forward/away; no algebra-coordinate negation.
export function toView(p,view,n,cga=false){
  const a=view.extra||0,b=view.conformal||0,cy=Math.cos(view.yaw),sy=Math.sin(view.yaw),cp=Math.cos(view.pitch),sp=Math.sin(view.pitch),cr=Math.cos(view.roll||0),sr=Math.sin(view.roll||0);
  let x=p[0],y=p[1],z=p[2]||0;
  if(cga){if(n===4){y*=Math.cos(a);z=0;}else z*=Math.cos(a);}
  else if(n===4)z*=Math.cos(a);
  const right=x*cy+y*sy,up=-x*sy*sp+y*cy*sp+z*cp,near=x*sy*cp-y*cy*cp+z*sp;
  let v=[right*cr-up*sr,right*sr+up*cr,near];
  if(cga){const w=p[n-2]/Math.sqrt(2),u=p[n-1]*Math.sqrt(2),fold=Math.sin(a);
    // Quarter-turn exchange. Both extra axes keep nonnegative screen-up components.
    const d=(w*Math.cos(b)-u*Math.sin(b))*fold,h=(w*Math.sin(b)+u*Math.cos(b))*fold;
    v=add(v,[.6*d,h,.8*d]);
  }else if(n===4){v[1]+=p[3]*Math.sin(a);v[2]+=p[3]*Math.cos(a)-p[2]*Math.sin(a);}
  return v;
}
export function orbit(view,n,cga,dx,dy,button=0){
  if(button===2){if(n===3&&!cga)return;view.extra=clamp(view.extra-dy*.009,0,HALF_PI);if(cga)view.conformal=clamp(view.conformal+dx*.009,0,HALF_PI);return;}
  view.yaw-=dx*.008;view.pitch=clamp(view.pitch+dy*.007,-ELEVATION_LIMIT,ELEVATION_LIMIT);
  if(n>3)view.roll=clamp((view.roll||0)-dx*.002,-.65,.65);
}
export function screenPoint(p,view,n,cga,width,height,s){
  const v=toView(p,view,n,cga),focal=10,factor=view.perspective===false?1:focal/Math.max(.5,focal-v[2]);
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
