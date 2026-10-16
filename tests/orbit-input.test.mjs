import test from 'node:test';
import assert from 'node:assert/strict';
import {basis,dot,length,sub} from '../src/algebra.js';
import {defaultView,toView,projectedSpace,uprightFrame,orbit,screenPoint,ELEVATION_LIMIT} from '../src/camera.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const vec=(a,b)=>a.forEach((x,i)=>near(x,b[i]));
for(const [n,cga,flat] of [[4,false,false],[4,false,true],[5,true,false]]){
  const initial=()=>({...defaultView(n,cga,false,flat),extra:.35});
  test(n+'D '+flat+': independent upright, spatial, and extra-axis state',()=>{
    const view=initial();orbit(view,n,cga,30,20);assert.equal(view.frame,undefined);near(view.yaw,.42-.24);
    const alpha=view.extra,beta=view.conformal;orbit(view,n,cga,180,600,1);assert.ok(view.frame);near(view.extra,alpha);near(view.conformal,beta);
    const frame=structuredClone(view.frame);orbit(view,n,cga,0,10000);near(view.pitch,ELEVATION_LIMIT);assert.deepEqual(view.frame,frame);for(const row of view.frame)near(length(row),1);near(dot(view.frame[0],view.frame[1]),0);
  });
  test(n+'D '+flat+': fold precedes upright and follows spatial / extra rotations',()=>{
    const view=initial();view.extra=.8;view.conformal=.4;orbit(view,n,cga,67,-210,1);
    const p=Array.from({length:n},(_,i)=>.3*(i+1)),r=view.frame.map(row=>dot(row,p.slice(0,3))),t=cga?p[4]*Math.cos(.4)+p[3]*Math.sin(.4):p[3],hidden=cga?p[3]*Math.cos(.4)-p[4]*Math.sin(.4):0;
    const q=[r[0],r[1],r[2]*Math.cos(.8)+t*Math.sin(.8)],expected=uprightFrame(view).map(row=>dot(row,q));expected[2]+=t*Math.cos(.8)-r[2]*Math.sin(.8)+hidden;vec(toView(p,view,n,cga),expected);
    const up=[...view.frame[2],...Array(n-3).fill(0)];view.extra=Math.PI/2;vec(projectedSpace(up,view,n,cga).point,[0,0,0]);
  });
  test(n+'D '+flat+': screen grab directions for left and middle orbit',()=>{
    for(const button of [0,1])for(const perspective of [false,true]){const view={...initial(),yaw:0,pitch:0,perspective},p=[0,-1,0,...Array(n-3).fill(0)],start=screenPoint(p,view,n,cga,800,500,65);orbit(view,n,cga,8,0,button);assert.ok(screenPoint(p,view,n,cga,800,500,65).x>start.x);const fresh={...initial(),yaw:0,pitch:0,perspective},before=screenPoint(p,fresh,n,cga,800,500,65);orbit(fresh,n,cga,0,8,button);assert.ok(screenPoint(p,fresh,n,cga,800,500,65).y>before.y);}
  });
}
test('middle orbit is disabled only for 3D algebra and 2D Round',()=>{for(const [n,cga] of [[3,false],[4,true]]){const v=defaultView(n,cga),before=JSON.stringify(v);orbit(v,n,cga,200,300,1);assert.equal(JSON.stringify(v),before);}});
test('cone view is a display-only unfolding of the hidden extra direction',()=>{
  for(const beta of [0,.4,Math.PI/2]){const normal={...defaultView(5,true),extra:.8,conformal:beta};orbit(normal,5,true,37,52,1);const section={...normal,section:true};for(const p of [basis(5,3),basis(5,4)]){const a=projectedSpace(p,normal,5,true),b=projectedSpace(p,section,5,true),h=p[3]*Math.cos(beta)-p[4]*Math.sin(beta);vec(sub(b.point,a.point),[0,h,0]);near(a.depth-b.depth,h);}assert.deepEqual(section.frame,normal.frame);}
});
