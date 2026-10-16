import { basis, add, scale, dot, length, EPS } from './algebra.js';
export const HALF_PI=Math.PI/2;
export const ELEVATION_LIMIT=HALF_PI-.003;
export const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
export function defaultView(n,cga=false,section=false,flat=false){return {yaw:.42,pitch:.58,roll:0,extra:cga&&n===5?HALF_PI:0,conformal:0,section,flatGeometry:flat,zoom:1.15,perspective:false,center:flat?basis(n,n-1,.5):cga?add(basis(n,n-1,section?0:.65),basis(n,n-2,.5)):undefined};}
const identity=()=>[[1,0,0],[0,1,0],[0,0,1]];
const apply=(matrix,p)=>matrix.map(row=>dot(row,p));
const multiply=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((sum,x,k)=>sum+x*b[k][j],0)));
export function uprightFrame(view){
  const c=Math.cos(view.yaw),s=Math.sin(view.yaw),p=Math.cos(view.pitch),q=Math.sin(view.pitch);
  return [[c,s,0],[-s*q,c*q,p],[s*p,-c*p,q]];
}
// Independent spatial/extra-axis rotations precede the fold, then the upright camera.
// Screen-collapsed coordinates retain depth for perspective and depth-preserving dragging.
export function projectedSpace(p,view,n,cga=false){
  const spatial=apply(view.frame||identity(),p.slice(0,3));
  if(cga){
    const beta=view.conformal||0,origin=p[n-2],infinity=p[n-1],vertical=infinity*Math.cos(beta)+origin*Math.sin(beta),collapsed=origin*Math.cos(beta)-infinity*Math.sin(beta);
    if(n===4)return {point:view.section?[p[0],collapsed,vertical]:[p[0],p[1],vertical],depth:view.section?0:collapsed};
    const alpha=view.extra??HALF_PI,up=spatial[2],point=[spatial[0],spatial[1],up*Math.cos(alpha)+vertical*Math.sin(alpha)];
    // The construction section unfolds the otherwise hidden extra direction into
    // the initial spatial e2 direction. It never modifies the gesture state.
    if(view.section)point[1]=collapsed;
    return {point,depth:vertical*Math.cos(alpha)-up*Math.sin(alpha)+(view.section?-spatial[1]:collapsed)};
  }
  if(n===4){const alpha=view.extra||0,up=spatial[2];return {point:[spatial[0],spatial[1],up*Math.cos(alpha)+p[3]*Math.sin(alpha)],depth:p[3]*Math.cos(alpha)-up*Math.sin(alpha)};}
  return {point:spatial,depth:0};
}
export function toView(p,view,n,cga=false){const projected=projectedSpace(p,view,n,cga),v=apply(uprightFrame(view),projected.point);v[2]+=projected.depth;return v;}
export function orbit(view,n,cga,dx,dy,button=0){
  if(button===2){if(n===3&&!cga)return;if(!cga||n===5)view.extra=clamp(view.extra-dy*.009,0,Math.PI);if(cga)view.conformal=clamp(view.conformal+dx*.009,0,HALF_PI);return;}
  if(button===0){view.yaw-=dx*.008;view.pitch=clamp(view.pitch+dy*.007,-ELEVATION_LIMIT,ELEVATION_LIMIT);return;}
  if(button!==1||!(n===4&&!cga||n===5&&cga))return;
  // Express the display-axis drag in the fixed spatial coordinates. Upright
  // orbit does not get baked into this independent SO(3) state.
  const x=dy*.007,y=dx*.008,cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y),u=uprightFrame(view),ut=u[0].map((_,i)=>u.map(row=>row[i]));
  const display=[[cy,0,sy],[sx*sy,cx,-sx*cy],[-cx*sy,sx,cx*cy]];
  view.frame=multiply(multiply(multiply(ut,display),u),view.frame||identity());
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
