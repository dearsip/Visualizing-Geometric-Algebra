import {EPS,basis,add,sub,scale,dot,length,unit} from './algebra.js';
import {perpendicularFrame} from './geometry.js';
const green='#549a6b';
export function reflectedPosition(a,x){
  const h=a.length-1,normal=a.slice(0,h),q=dot(normal,normal);if(q<EPS)return null;
  const t=dot(normal,x),weight=2*a[h]*t/q-1;if(Math.abs(weight)<1e-7)return null;
  return scale(sub(scale(normal,2*t/q),x),1/weight);
}
export function halfDisplacement(a,x){const y=reflectedPosition(a,x);return y?length(sub(x,y))/2:Infinity;}
function sectionFrame(a,v){const h=a.length-1,axis=unit(a.slice(0,h)),perp=perpendicularFrame(axis),p=Math.abs(v[h])>EPS?scale(v.slice(0,h),1/v[h]):v.slice(0,h),r=sub(p,scale(axis,dot(p,axis)));if(length(r)>EPS){perp[0]=unit(r);if(h===3)perp[1]=unit([axis[1]*perp[0][2]-axis[2]*perp[0][1],axis[2]*perp[0][0]-axis[0]*perp[0][2],axis[0]*perp[0][1]-axis[1]*perp[0][0]]);}return {h,axis,perp,p};}
const textureCache=new WeakMap();
export function displacementShading(scene,a,v){
  const norm=length(a.slice(0,-1));if(norm<EPS)return;const {h,axis,perp}=sectionFrame(a,v),d=Math.abs(a.at(-1))>EPS?norm/a.at(-1):Infinity,r=3.3,size=320;
  let cached=textureCache.get(scene);if(!cached||cached.d!==d){
    const data=new Uint8ClampedArray(size*size*4),step=2*r/size,omega=Number.isFinite(d)?16/Math.max(.4,Math.abs(d)):8;
    const distance=(t,s)=>Number.isFinite(d)?Math.abs(t)*Math.hypot(t-d,s)/Math.abs(2*t-d):Math.abs(t);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){const t=-r+(x+.5)*step,s=-r+(y+.5)*step,index=(y*size+x)*4;if(t*t+s*s>r*r)continue;const k=distance(t,s),footprint=omega*Math.max(Math.abs(distance(t+step,s)-k),Math.abs(distance(t,s+step)-k)),amplitude=Number.isFinite(footprint)?1/(1+footprint*footprint):0,f=.5+.5*amplitude*Math.cos(Number.isFinite(k)?k*omega:0);for(let i=0;i<3;i++)data[index+i]=Math.round([35,98,62][i]+f*([183,213,159][i]-[35,98,62][i]));data[index+3]=220;}
    cached={d,texture:{width:size,height:size,data}};textureCache.set(scene,cached);
  }
  for(const transverse of perp.slice(0,1)){const center=basis(a.length,a.length-1),points=[[-r,-r],[r,-r],[r,r],[-r,r]].map(([t,s])=>add(center,[...add(scale(axis,t),scale(transverse,s)),0]));scene.commands.push({kind:'texture',points,texture:cached.texture,background:true,alpha:.2});}
}
// Level sets of half the displacement, rather than an arbitrary invariant conic.
export function displacementSurface(scene,a,v){
  const {h,axis,perp,p}=sectionFrame(a,v),norm=length(a.slice(0,h));if(norm<EPS)return;const k=halfDisplacement(a,p);if(!Number.isFinite(k))return;
  if(Math.abs(a[h])<EPS){for(const sign of [-1,1])scene.locusSpan([...scale(axis,k*sign),1],perp.map(f=>[...f,0]),green);return;}
  const d=norm/a[h],out=reflectedPosition(a,p),levels=[dot(axis,p),...(out?[dot(axis,out)]:[])],ts=[...Array.from({length:151},(_,i)=>-3.3+i*.044),...levels].sort((a,b)=>a-b),radius=t=>Math.abs(t)<1e-7?null:k*k*(2*t-d)**2/(t*t)-(t-d)**2;
  const angles=h===2?[0,Math.PI]:Array.from({length:8},(_,i)=>i*Math.PI/4);
  for(const theta of angles){let previous=null,lastT;for(const t of ts){const r2=radius(t);if(r2===null||r2< -1e-7||r2+t*t>3.3**2){previous=null;continue;}const r=Math.sqrt(Math.max(0,r2)),u=h===2?scale(perp[0],Math.cos(theta)):add(scale(perp[0],Math.cos(theta)),scale(perp[1],Math.sin(theta))),q=[...add(scale(axis,t),scale(u,r)),1];if(previous&&t*lastT>0)scene.line(previous,q,green,1.2,true,.85);previous=q;lastT=t;}}
  if(h===3)for(const t of [...Array.from({length:17},(_,i)=>-3.2+i*.4),...levels]){const r2=radius(t);if(r2>0&&r2+t*t<3.3**2)scene.circle([...scale(axis,t),1],[...perp[0],0],[...perp[1],0],Math.sqrt(r2),green,true,.65);}
}
