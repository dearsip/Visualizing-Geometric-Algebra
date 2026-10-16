import {basis,add,sub,scale,dot,length,unit,EPS} from './algebra.js';
import {embed,affine,cgaParts,cgaProperties,cgaRound,removeInfinity,spatialRound,reflectionPath,composeReflections,screwParameters} from './geometry.js';
import {colors} from './scene.js';
import {V,E,GP,AGP} from './content.js';
const check=(key,label,value=false)=>({type:'check',key,label,value});
const select=(key,label,options,value=options[0][0])=>({type:'select',key,label,options,value});
const range=(key,label,value=0)=>({type:'range',key,label,min:-2,max:2,step:.025,value});
const sym=k=>['','p','d','c','s'][k],hat=x=>`\\hat{${x}}`;
const sourceNames=['v₀','w₀','u₀','t₀'];
function addControls(m,...controls){controls.forEach(c=>m.addControl(c));}
function motorPlanes(n,count){return Array.from({length:count},(_,i)=>{const a=.35*i,x=[Math.cos(a),Math.sin(a),...(n===4?[.15*Math.sin(a*2)]:[])];return [...scale(unit(x),1.8+.16*i),1];});}
function motorNames(m){m.names=[...sourceNames.slice(0,+m.state.objectGrade),...Array.from({length:+m.state.count},(_,i)=>String.fromCharCode(97+i))];}
function setMotorGrade(m,k){const old=+m.state.objectGrade,planes=m.vectors.slice(old),first=m.vectors[0];m.state.objectGrade=+k;m.vectors=[...Array.from({length:+k},(_,i)=>i?add(first,basis(m.n,(i-1)%(m.n-1),.8)):first),...planes];motorNames(m);}
const presetOptions=[['custom','Custom reflections'],['translation','Translation'],['rotation','Rotation'],['dilation','Dilation'],['inversion','Sphere inversion'],['circular','Circular'],['elliptic','Elliptic'],['hyperbolic','Hyperbolic'],['loxodromic','Loxodromic']];
export function configure(m){
  const t=m.def.type,n=m.n;
  if(m.cga)for(const c of m.controls)if(c.key==='mesh')c.label='Horosphere';
  if(['projective','isometry'].includes(t))m.vectors[1]=[-.9,.85,...(n===4?[-.45]:[]),1];
  if(t==='motor'){
    m.state.objectGrade=1;m.vectors=[[-.9,.45,...(n===4?[.35]:[]),1],...motorPlanes(n,+m.state.count)];motorNames(m);
    addControls(m,select('objectGrade','Object grade',Array.from({length:n-1},(_,i)=>[i+1,['Point','Line','Plane'][i]])));
  }
  if(t==='cga-property'){
    m.gradeStates=new Map();addControls(m,range('radius2','Squared radius r²',.6));
    if(m.def.property==='cocarrier')addControls(m,check('showDual','Antidual'));
    if(m.def.property==='container')addControls(m,check('showCarrier','Carrier'),check('showCarrierDual','Carrier antidual'));
  }
  if(t==='cga-join')addControls(m,select('construction','Construction',[['objects','Two objects'],['points2','2 round points'],['points3','3 round points'],...(n===5?[['points4','4 round points']]:[])]),...Array.from({length:n-1},(_,i)=>range('pointRadius'+i,'Squared radius · p'+(i+1))));
  if(t==='cga-join')addControls(m,range('radiusA','Squared radius · first'),range('radiusB','Squared radius · second'));
  if(t==='cganorm'){
    m.controls=[];m.setVectors(2,'null');m.names=['p','q'];
    addControls(m,check('mesh','Horosphere',true),check('flat','Make flat'),check('blade','Homogeneous blade',true));
    for(const [i,label] of ['Round bulk ●','Round weight ○','Flat bulk ■','Flat weight □'].entries())addControls(m,check('part'+i,label,true),check('norm'+i,label+' norm'));
    addControls(m,check('centerNorm','Center norm ⊙'),check('radiusNorm','Radius norm'));
  }
  if(t==='conformal-transform'){
    m.controls=[];m.state.objectGrade=1;m.state.count=2;m.vectors=[embed([-.7,.5,...(n===5?[.3]:[])],n)];
    addControls(m,select('objectGrade','Object grade',Array.from({length:n-1},(_,i)=>[i+1,['Round point','Dipole','Circle','Sphere'][i]])),select('count','Reflection count',Array.from({length:6},(_,i)=>[i+1,String(i+1)]),2),select('preset','Preset',presetOptions,'translation'),check('mirrors','Inversion spheres / planes',true),check('mesh','Horosphere',true),check('homogeneous','Homogeneous blades'));
    conformalPreset(m,'translation');
  }
}
export function update(m,key,value){
  const t=m.def.type,n=m.n;
  if(t==='motor'){
    if(key==='objectGrade'){setMotorGrade(m,+value);return true;}
    if(key==='count'){const k=+m.state.objectGrade,old=m.vectors.slice(k);m.state.count=+value;m.state.preset='custom';m.vectors=[...m.vectors.slice(0,k),...Array.from({length:+value},(_,i)=>old[i]||motorPlanes(n,+value)[i])];motorNames(m);return true;}
    if(key==='preset'){
      m.state.preset=value;if(value==='custom')return true;
      const k=+m.state.objectGrade,h=n-1,count=value==='reflection'?1:value==='inversion'?h:2;m.state.count=count;
      let planes=motorPlanes(n,count);
      if(value==='translation')planes=[1.8,2.7].map(x=>[x,...Array(h-1).fill(0),1]);
      if(value==='rotation')planes=[0,.5].map(a=>[Math.cos(a),Math.sin(a),...Array(h-2).fill(0),0]);
      if(value==='inversion')planes=Array.from({length:h},(_,i)=>basis(n,i));
      m.vectors=[...m.vectors.slice(0,k),...planes];motorNames(m);return true;
    }
  }
  if(t==='cga-join'&&key==='construction'){
    m.state.construction=value;if(value==='objects'){m.state.pointOnly=false;m.update('pair',m.state.pair);return true;}
    const count=+value.slice(-1);for(let i=0;i<n-1;i++)m.state['pointRadius'+i]=0;m.state.pointOnly=true;m.grades=[1,count-1];m.setVectors(count,'null');m.names=['p₁','p₂','p₃','p₄'].slice(0,count);return true;
  }
  if(t==='cga-join'&&key.startsWith('pointRadius')){const i=+key.slice(-1);m.state[key]=+value;if(m.vectors[i])m.vectors[i]=embed(m.vectors[i].slice(0,n-2),n,+value);return true;}
  if(t==='cga-join'&&key==='pair'){m.state.construction='objects';m.state.pointOnly=false;m.state.radiusA=0;m.state.radiusB=0;}
  if(t==='cga-property'&&key==='grade'){
    m.gradeStates.set(+m.state.grade,{vectors:m.vectors.map(v=>[...v]),names:[...m.names],radius2:m.state.radius2});
    const saved=m.gradeStates.get(+value);m.state.grade=+value;
    if(saved){m.vectors=saved.vectors.map(v=>[...v]);m.names=[...saved.names];m.state.radius2=saved.radius2;}
    else {m.setVectors(+value,'null');if(+value===1)m.vectors[0]=embed(m.vectors[0].slice(0,n-2),n,m.state.radius2);}
    m.frames.clear();return true;
  }
  if(t==='cga-property'&&key==='radius2'){m.state.radius2=+value;if(+m.state.grade===1)m.vectors[0]=embed(m.vectors[0].slice(0,n-2),n,+value);return true;}
  if(t==='cga-join'&&['radiusA','radiusB'].includes(key)){m.state[key]=+value;const i=key==='radiusA'?0:m.grades[0];if(m.grades[key==='radiusA'?0:1]===1)m.vectors[i]=embed(m.vectors[i].slice(0,n-2),n,+value);return true;}
  if(t==='conformal-transform'){
    if(key==='preset'){m.state.preset=value;if(value!=='custom')conformalPreset(m,value);return true;}
    if(key==='objectGrade'){const k=+m.state.objectGrade,mirrors=m.vectors.slice(k),p=m.vectors[0].slice(0,n-2);m.state.objectGrade=+value;m.vectors=[...Array.from({length:+value},(_,i)=>embed(i?add(p,basis(n-2,(i-1)%(n-2),.8)):p,n)),...mirrors];conformalNames(m);return true;}
    if(key==='count'){const k=+m.state.objectGrade,old=m.vectors.slice(k);m.state.count=+value;m.state.preset='custom';m.vectors=[...m.vectors.slice(0,k),...Array.from({length:+value},(_,i)=>old[i]||embed([i*.3,...Array(n-3).fill(0)],n,-1))];conformalNames(m);return true;}
  }
  return false;
}
export function radiusFor(m,i){if(m.def.type==='cga-join'&&m.state.pointOnly)return m.state['pointRadius'+i]||0;if(m.def.type==='cga-property'&&+m.state.grade===1)return m.state.radius2;if(m.def.type==='cga-join'&&m.grades){if(i===0&&m.grades[0]===1)return m.state.radiusA;if(i===m.grades[0]&&m.grades[1]===1)return m.state.radiusB;}return 0;}
export function moved(m,i){if(['motor','conformal-transform'].includes(m.def.type))m.state.preset='custom';}
function conformalNames(m){m.names=[...['p₀','q₀','r₀','t₀'].slice(0,+m.state.objectGrade),...Array.from({length:+m.state.count},(_,i)=>String.fromCharCode(97+i))];}
function conformalPreset(m,preset){
  const n=m.n,d=n-2,plane=(angle,offset=0)=>[Math.cos(angle),Math.sin(angle),...Array(d-2).fill(0),0,-offset],sphere=(c,r)=>embed([c,...Array(d-1).fill(0)],n,-r*r);
  const mirrors=preset==='translation'?[plane(0,-.3),plane(0,.35)]:['rotation','circular'].includes(preset)?[plane(0),plane(.55)]:preset==='inversion'?[sphere(0,1.3)]:preset==='dilation'?[sphere(0,1),sphere(0,1.5)]:preset==='elliptic'?[sphere(-.55,1.2),sphere(.55,1.2)]:preset==='hyperbolic'?[sphere(-1.1,.7),sphere(1.1,.7)]:[sphere(0,1),sphere(0,1.5),plane(0),plane(.5)];
  m.vectors=[...m.vectors.slice(0,+m.state.objectGrade),...mirrors];m.state.count=mirrors.length;conformalNames(m);
}
function handles(m,scene,retract){m.vectors.forEach((v,i)=>{scene.handle(v,m.names[i],i,i<+m.state.objectGrade?colors.a:colors.purple,null,false,m.cga?Array.from({length:m.n},(_,j)=>basis(m.n,j)):null);if(retract&&i<+m.state.objectGrade)scene.handles.at(-1).retract=x=>embed(x.slice(0,m.n-2).map(v=>v/(x[m.n-2]||1)),m.n);});}
export function paint(m,scene,embeddedRound){
  const t=m.def.type;if(!['motor','cganorm','conformal-transform'].includes(t)&&!(t==='cga-join'&&m.state.pointOnly))return false;
  const n=m.n,A=m.alg,s=m.state;m.rows=[];m.status='';scene.isCGA=m.cga;
  if(m.cga&&s.mesh)scene.cgaMesh();else if(!m.cga)scene.sliceMesh();
  if(t==='cga-join'){
    m.vectors.forEach((v,i)=>{scene.handle(v,m.names[i],i,colors.a);scene.handles.at(-1).retract=x=>embed(x.slice(0,n-2).map(v=>v/(x[n-2]||1)),n,radiusFor(m,i));const a=A.vector(v);spatialRound(scene,a,A,hat(m.names[i]),colors.a);embeddedRound(scene,a,A,m.names[i],colors.a);});
    const out=A.blade(m.vectors),expr=m.names.join(' ∧ ');embeddedRound(scene,out,A,expr,colors.result,{endpoints:true});spatialRound(scene,out,A,hat(expr),colors.result,{endpoints:true});if(s.homogeneous)scene.blade(m.vectors,expr,{color:colors.result,alpha:.07});m.formula=m.names.map(V).join(' ∧ ');m.row(expr,m.mv(out));return true;
  }
  if(t==='motor'){
    const k=+s.objectGrade,planes=m.vectors.slice(k),source=m.vectors.slice(0,k),dim=n-1,time=s.time,output=source.map(p=>reflectionPath(planes,p,dim,time));handles(m,scene);
    const label=k===1?'v':k===2?'l':'g';scene.blade(source,label+'₀',{color:colors.a,alpha:.08});scene.blade(output,label+'(t)',{color:colors.result,alpha:.08});scene.flat(A.blade(source),A,label+'₀',colors.a);scene.flat(A.blade(output),A,label+'(t)',colors.result);
    let prev;for(let t=0;t<=1.001;t+=.025){const q=reflectionPath(planes,source[0],dim,t);if(prev)scene.line(prev,q,colors.result,1,true,.7);prev=q;}
    if(n===4){const {axis,center,angle}=screwParameters(composeReflections(planes.length%2?planes.slice(1):planes,dim));if(length(axis)>EPS){const c=[...center,1],d=[...axis,0],radial=sub(source[0],c),u=unit(sub(radial,scale(d,dot(radial,d)))),v=[axis[1]*u[2]-axis[2]*u[1],axis[2]*u[0]-axis[0]*u[2],axis[0]*u[1]-axis[1]*u[0],0];scene.line(add(c,scale(d,-2)),add(c,scale(d,2)),colors.purple,1,true);scene.line(c,add(c,u),colors.purple,1,true);let p=add(c,u);for(let i=1;i<=32;i++){const a=angle*time*i/32,q=add(c,add(scale(u,Math.cos(a)),scale(v,Math.sin(a))));scene.line(p,q,colors.purple,1);p=q;}}}
    let Q=A.volume();for(const plane of planes){const norm=length(plane.slice(0,dim));if(norm<EPS){m.status='Zero reflecting normal';return true;}const g=A.lc(A.vector(scale(plane,1/norm)));Q=A.agp(g,Q);if(s.planes)scene.flat(g,A,'',colors.mesh);}
    m.formula=`${V(planes.length%2?'F':'Q')} = ${V('gₘ')} ${AGP} ⋯ ${AGP} ${V('g₁')}`;m.row('Q',m.mv(Q));m.row(label+'(t)',m.mv(A.blade(output)));return true;
  }
  if(t==='conformal-transform'){
    const k=+s.objectGrade,source=m.vectors.slice(0,k),mirrors=m.vectors.slice(k);handles(m,scene,true);let output=source.map(v=>A.vector(v));
    for(const [i,a] of mirrors.entries()){const av=A.vector(a),q=A.inner(av,av);if(Math.abs(q)<EPS){m.status='Null reflecting sphere';continue;}output=output.map(v=>scale(A.gp(A.gp(av,v),av),-1/q));if(s.mirrors){const mirror=A.dual(av);spatialRound(scene,mirror,A,m.names[k+i]+'^{★}',colors.purple);embeddedRound(scene,mirror,A,'',colors.purple);}}
    const input=A.blade(source),out=output.reduce((r,v)=>A.wedge(r,v),A.scalar()),label=sym(k);spatialRound(scene,input,A,hat(label+'₀'),colors.a);embeddedRound(scene,input,A,label+'₀',colors.a);spatialRound(scene,out,A,hat(label+'₁'),colors.result);embeddedRound(scene,out,A,label+'₁',colors.result);
    if(s.homogeneous){scene.blade(source,label+'₀',{color:colors.a,alpha:.06});scene.blade(output.map(v=>A.coordinates(v)),label+'₁',{color:colors.result,alpha:.06});}
    for(let i=0;i<k;i++){const q=A.coordinates(output[i]),w=q[n-2];scene.arrow(q,m.names[i].replace('₀','₁'),colors.result);if(Math.abs(w)>EPS)scene.line([...source[i].slice(0,n-1),0],[...scale(q,1/w).slice(0,n-1),0],colors.mesh,1,true);}
    m.formula=`${V(label+'₁')} = (−1)<sup>m·${k}</sup> ${V('aₘ')} ${GP} ⋯ ${GP} ${V('a₁')} ${GP} ${V(label+'₀')} ${GP} ${V('a₁')}<sup>−1</sup> ${GP} ⋯ ${GP} ${V('aₘ')}<sup>−1</sup>`;m.row(label+'₁',m.mv(out));return true;
  }
  // Component diagrams use coordinate projections of the original two factors.
  const vectors=s.flat?[m.vectors[0],basis(n,n-1)]:m.vectors,u=A.blade(vectors),label=s.flat?'p':'d',parts=cgaParts(u,A),symbols=['●','○','■','□'],partColors=[colors.a,colors.b,colors.purple,colors.c];
  m.vectors.forEach((v,i)=>{if(!s.flat||i===0){scene.handle(v,m.names[i],i,colors.a);scene.handles.at(-1).retract=x=>embed(x.slice(0,n-2).map(v=>v/(x[n-2]||1)),n);}});
  if(s.flat)scene.arrow(basis(n,n-1),'q = e_{'+n+'}',colors.infinity);
  if(s.blade)scene.blade(vectors,label,{color:colors.result,alpha:.06});spatialRound(scene,u,A,hat(label),colors.result);embeddedRound(scene,u,A,'',colors.result);
  const spatial=v=>v.map((x,i)=>i<n-2?x:0);
  for(let i=0;i<4;i++){
    if(s['part'+i]&&length(parts[i])>EPS){let fs;if(i===0)fs=vectors.map(spatial);else if(i===3)fs=[basis(n,n-2),basis(n,n-1,parts[i][(1<<(n-2))|(1<<(n-1))])];else{const axis=i===1?n-2:n-1,mask=1<<axis,other=Array(n).fill(0);for(let j=0;j<n-2;j++)other[j]=-parts[i][mask|(1<<j)];fs=[basis(n,axis),other];}scene.blade(fs,label+'_{'+symbols[i]+'}',{color:partColors[i],alpha:.045,dashed:true});}
    m.row('‖'+label+'‖_{'+symbols[i]+'}',Number(length(parts[i]).toFixed(3)));
  }
  const info=cgaRound(u,A),origin=basis(n,n-2),rw=length(parts[1]),normLabel=i=>'‖'+label+'‖_{'+symbols[i]+'}'+(rw>EPS?' / ‖'+label+'‖_{○}':'');
  if(info?.center&&rw>EPS){const car=removeInfinity(cgaProperties(u,A).carrier,A),support=affine(car.alg.coordinates(car.alg.project(car.alg.vector(basis(n-1,n-2)),car.blade).result));if(support){const foot=[...support,0],center=info.center;for(const [key,a,b,text,color] of [['norm0',origin,foot,normLabel(0),colors.a],['norm3',foot,center,normLabel(3),colors.c],['centerNorm',origin,center,'‖'+label+'‖_{⊙} / ‖'+label+'‖_{○}',colors.ink]])if(s[key]){scene.line(a,b,color,1.4,true);scene.label(scale(add(a,b),.5),text,color,{dy:15});}
      if(s.radiusNorm){const r=Math.sqrt(Math.abs(info.radius2)),d=info.dirs[0]||basis(n,0);scene.line(center,add(center,scale(d,r)),colors.result,1.4);scene.label(add(center,scale(d,r/2)),'‖'+label+'‖_{\uE000} / ‖'+label+'‖_{○}',colors.result,{dy:18});}}
  }
  for(const i of [1,2])if(s['norm'+i])scene.label(basis(n,i===1?n-2:n-1,.55),normLabel(i),partColors[i],{dy:i===1?-20:20});
  if(s.flat)for(const i of [2,3])if(s['norm'+i])scene.label(basis(n,i===2?0:n-2,.6),normLabel(i),partColors[i],{dy:i===2?-20:20});
  m.formula=`${V(label)} = ${symbols.map(s=>V(label+s)).join(' + ')}`;return true;
}
