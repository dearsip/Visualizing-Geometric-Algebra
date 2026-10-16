import test from 'node:test';
import assert from 'node:assert/strict';
import {basis,dot,length} from '../src/algebra.js';
import {defaultView,toView,orbit,screenPoint,ELEVATION_LIMIT} from '../src/camera.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
for(const [n,cga] of [[4,false],[5,true]]){
  const initial=()=>defaultView(n,cga,false,!cga);
  test(`${n}D: left upright and middle free rotation coexist without resetting`,()=>{
    const view=initial();orbit(view,n,cga,30,20);assert.equal(view.frame,undefined);near(view.yaw,.42-.24);
    const alpha=view.extra,beta=view.conformal;orbit(view,n,cga,180,600,1);assert.ok(view.frame);near(view.extra,alpha);near(view.conformal,beta);
    const frame=view.frame.map(r=>[...r]);orbit(view,n,cga,0,10000);near(view.pitch,ELEVATION_LIMIT);for(const row of view.frame)near(length(row),1);near(dot(view.frame[0],view.frame[1]),0);assert.notDeepEqual(frame,view.frame);
    orbit(view,n,cga,0,500,1);assert.notDeepEqual(frame,view.frame);
  });
  test(`${n}D: right fold uses the up direction selected by middle drag`,()=>{
    const view=initial();orbit(view,n,cga,67,-210,1);const up=[...view.frame[1],...Array(n-3).fill(0)];near(toView(up,view,n,cga)[1],1);orbit(view,n,cga,0,-Math.PI/2/.009,2);near(toView(up,view,n,cga)[0],0);near(toView(up,view,n,cga)[1],0);near(toView(up,view,n,cga)[2],-1);
  });
  test(`${n}D: near-side positions follow both left and middle drags`,()=>{
    for(const button of [0,1])for(const perspective of [false,true]){const view={...initial(),yaw:0,pitch:0,perspective},p=[0,-1,0,...Array(n-3).fill(0)],start=screenPoint(p,view,n,cga,800,500,65);orbit(view,n,cga,8,0,button);assert.ok(screenPoint(p,view,n,cga,800,500,65).x>start.x);const fresh={...initial(),yaw:0,pitch:0,perspective},before=screenPoint(p,fresh,n,cga,800,500,65);orbit(fresh,n,cga,0,8,button);assert.ok(screenPoint(p,fresh,n,cga,800,500,65).y>before.y);}
  });
}
test('middle rotation is disabled outside 3D Flat / 3D Round',()=>{
  for(const [n,cga] of [[3,false],[4,false],[4,true]]){const v=defaultView(n,cga),before=JSON.stringify(v);orbit(v,n,cga,200,300,1);assert.equal(JSON.stringify(v),before);}
});
