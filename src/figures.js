import { Algebra, basis, add, sub, scale, dot, length, unit, EPS, formatMV, indicesBlade } from './algebra.js';
import { colors } from './scene.js';
import { embed, affine, cgaParts, cgaProperties, spatialRound, removeInfinity, closestPoint, reflectionPath, composeReflections, screwParameters } from './geometry.js';
import { V, E, I, S, R, L, GP, AGP } from './content.js';
import * as revised from './lesson-revisions.js';
const Z=n=>Array(n).fill(0), val=x=>Number(x.toFixed(3)), m=v=>V(v), a=m('a'),b=m('b'),c=m('c');
const check=(key,label,value=false)=>({type:'check',key,label,value});
const select=(key,label,options,value=options[0][0])=>({type:'select',key,label,options,value});
const range=(key,label,min,max,step,value)=>({type:'range',key,label,min,max,step,value});
const action=(key,label)=>({type:'button',key,label});
const seeds=[[1.65,.2,.45,.2],[.25,1.5,.6,-.25],[.25,-.35,1.5,.4],[-.6,.4,.5,1.2],[.8,-.7,.6,.3],[.1,.9,-.5,1.1]];
const positions=[[-1.1,-.65,.25],[1.3,-.2,-.4],[.2,1.2,.65],[-.65,.5,-.7],[.5,-1.1,.7],[1,.65,-.4]];
export class FigureModel {
  constructor(def,n){
    this.def=def;this.baseN=n;this.cga=['null','roundpoint','cganorm','round','containment','cgameet','conformal-transform',...revised.cgaTypes].includes(def.type);
    this.n=this.cga?n+1:n;this.alg=new Algebra(this.n,this.cga?'conformal':['wedge','distribute','trivector','basis','complement','antiwedge','geometric','reflection','rotation'].includes(def.type)?'euclidean':'rigid');
    this.state={};this.vectors=[];this.controls=[];this.rows=[];this.formula=def.formula;this.names=[];this.init();revised.configure(this);
    this.initial=JSON.parse(JSON.stringify({state:this.state,vectors:this.vectors,names:this.names,grades:this.grades}));
  }
  addControl(spec){this.controls.push(spec);if(spec.type!=='button')this.state[spec.key]=spec.value;}
  setVectors(count,kind='vector'){
    this.vectors=Array.from({length:count},(_,i)=>kind==='point'?[...positions[i%positions.length].slice(0,this.n-1),1]:kind==='null'?embed(positions[i%positions.length].slice(0,this.n-2),this.n):Array.from({length:this.n},(_,j)=>seeds[i%seeds.length][j]||0));
    this.names=this.vectors.map((_,i)=>kind==='point'||kind==='null'?['p','q','r','s','t','u'][i]||`p${i+1}`:String.fromCharCode(97+i));
  }
  init(){
    const t=this.def.type,n=this.n;const control=s=>this.addControl(s);
    if(t==='wedge'){this.setVectors(2);control(check('fix','Fix value'));control(select('order','Display',[[0,'a ∧ b'],[1,'b ∧ a']]));control(check('loci','Constant-product loci',true));}
    if(t==='distribute'){this.setVectors(3);control(select('side','Display',[[0,'LHS · (a + b) ∧ c'],[1,'RHS · a ∧ c + b ∧ c']]));}
    if(t==='trivector'){this.setVectors(3);control(check('fix','Fix value'));control(select('order','Display',[[0,'a ∧ b ∧ c'],[1,'b ∧ a ∧ c']]));control(check('loci','Constant-product loci',true));}
    if(t==='basis'){control(select('basis','Basis element',this.basisChoices()));control(range('scalar','Scalar scale',-2,2,.05,1));}
    if(t==='complement'||t==='dual'){this.setVectors(1);control(select('grade','Element grade',Array.from({length:n+1},(_,k)=>[k,`${k} · ${k===n?'Antiscalar':['Scalar','Vector','Bivector','Trivector','Quadrivector'][k]}`]),1));control(select('side','Complement side',[['right','Right · overline'],['left','Left · underline']]));control(range('scalar','Scalar / Antiscalar coefficient',-3,3,.05,1));if(t==='dual')control(select('dual','Dual',[['bulk','Bulk dual ★'],['weight','Weight dual ☆']]));}
    if(t==='antiwedge'){this.setVectors(2*(n-1));control(check('inputs','Input blades',true));control(check('complements','Right complements',true));control(check('intermediate','Wedge of complements',true));control(check('result','Antiwedge result',true));}
    if(t==='geometric'){this.setVectors(2);control(check('wedgeLocus','Wedge locus',true));control(check('dotLocus','Dot locus',true));}
    if(t==='reflection'||t==='rotation'){this.setVectors(t==='reflection'?2:3);this.names=t==='reflection'?['a','v₀']:['a','b','v₀'];control(check('complements','Reflecting complements',true));if(t==='rotation')control(select('grade','Object grade',[[1,'Vector'],[2,'Bivector'],[3,'Trivector']]));}
    if(['flat','attitude','norm'].includes(t)){this.setVectors(this.def.grade||2,'point');if(t!=='flat')control(select('grade','Object',[[1,'Point'],[2,'Line'],[3,n===3?'Whole slice':'Plane']],2));control(check('decompose','Bulk / Weight',t==='norm'));control(check('homogeneous','Homogeneous blade',true));control(action('infinity','Weight = 0'));}
    if(t==='join'){this.setVectors(n===4?3:2,'point');control(select('case','Join',[[0,'Point ∧ Point'],...(n===4?[[1,'Point ∧ Line']]:[])]));control(check('homogeneous','Homogeneous blades',true));}
    if(t==='meet'){this.setVectors(n===3?4:6,'point');control(select('case','Meet',n===3?[[0,'Line ∨ Line']]:[[0,'Plane ∨ Plane'],[1,'Plane ∨ Line']]));control(check('homogeneous','Homogeneous blades',false));}
    if(t==='dot'||t==='antidot'){this.setVectors(2);control(check('fix','Fix value'));control(check('loci','Constant-product locus',true));control(check('decompose','Bulk / Weight',true));}
    if(t==='distance'){this.setVectors(4,'point');control(select('case','Distance',[[0,'Point – Point'],[1,'Point – Line'],...(n===4?[[2,'Point – Plane']]:[])]));control(check('homogeneous','Homogeneous blades',false));}
    if(t==='interior'){this.setVectors(3,'point');control(select('operation','Operation',[[0,'Bulk expansion · a ∧ b★'],[1,'Weight expansion · a ∧ b☆'],[2,'Bulk contraction · a ∨ b★'],[3,'Weight contraction · a ∨ b☆']]));}
    if(t==='projection'){const j=this.def.case??1,anti=this.def.variant>=2;this.grades=n===3?(anti?[2,1]:[1,2]):anti?[[3,1],[2,1],[3,2]][j]:[[1,3],[1,2],[2,3]][j];this.setVectors(this.grades[0]+this.grades[1],'point');control(check('dual','Target dual',true));control(check('intermediate','First product',true));control(check('homogeneous','Homogeneous blades',false));this.names=this.vectors.map((_,i)=>i<this.grades[0]?`a${i+1}`:`b${i-this.grades[0]+1}`);}
    if(t==='projective'||t==='isometry'){this.setVectors(2);this.vectors[1]=[...positions[1].slice(0,n-1),1];this.names=['a','v₀'];control(check('complements','Complement blades',t==='isometry'));control(check('loci','Fixed / infinity loci',true));control(check('orbit','Transformation mesh'));}
    if(t==='motor'){this.setVectors(5);this.vectors[0]=[...positions[0].slice(0,n-1),1];this.names=['v₀','a','b','c','d'];control(select('count','Reflection count',[[2,'2 · Motor'],[3,'3 · Flector'],[4,'4 · Motor'],[5,'5 · Flector'],[6,'6 · Motor']],4));control(range('time','Interpolation',0,1,.005,1));control(action('animate','Play / Pause'));control(check('planes','Reflection planes',true));}
    if(t==='null'){this.setVectors(1,'null');control(check('point','Null point',true));}
    if(t==='roundpoint'){this.setVectors(1,'null');this.vectors[0]=embed(positions[0].slice(0,n-2),n,.7);control(range('radius2','Squared radius r²',-2,2,.05,.7));this.cgaControls();}
    if(t==='cganorm'){this.setVectors(n===4?2:3,'null');control(select('part','Decomposition',[[0,'All four groups'],[1,'Round bulk ●'],[2,'Round weight ○'],[3,'Flat bulk ■'],[4,'Flat weight □']]));control(check('mesh','Null cone / Horosphere',false));}
    if(t==='round'){this.setVectors(Math.min(this.def.grade,n-1),'null');control(check('flat','Make flat'));this.cgaControls();}
    if(t==='containment'){this.setVectors(n,'null');control(action('contained','Put p on the object'));control(check('dual','(Anti)dual',false));}
    if(t==='cgameet'){this.setVectors(2*(n-1),'null');const m=n-2;const x=Array(m).fill(0),y=Array(m).fill(0);x[0]=-.7;y[0]=.8;this.vectors=this.roundSeeds(x,1).concat(this.roundSeeds(y,1.1));control(check('expansion','Expansion',false));control(check('homogeneous','Homogeneous blades',false));}
    if(t==='conformal-transform'){this.setVectors(3,'null');control(select('transform','Transformation',[['translation','Translation'],['rotation','Rotation'],['dilation','Dilation'],['inversion','Sphere inversion']]));control(range('time','Parameter',0,1,.005,1));control(action('animate','Play / Pause'));control(check('mesh','Null cone / Horosphere',true));}
  }
  cgaControls(){for(const spec of [check('mesh','Null cone / Horosphere',true),check('carrier','Carrier',true),check('cocarrier','Cocarrier'),check('container','Container'),check('dual','(Anti)dual'),check('partner','Partner'),check('attitude','Attitude'),check('conjugate','Conjugate'),check('homogeneous','Homogeneous blade',false),check('radius','Radius',true)])this.addControl(spec);}
  basisChoices(){
    const seq=this.n===3?['','1','2','3','12','21','23','32','31','13','123','132']:['','1','2','3','4','12','21','23','32','31','13','41','14','42','24','43','34','123','132','423','432','431','413','412','421','1234','1243'];
    return seq.map(s=>[s,s===''?'1 · Scalar':s.length===this.n?(s===[...s].sort().join('')?'𝟙 · Antiscalar':`−𝟙 · ${s}`):`e${s}`]);
  }
  roundSeeds(center,r){const m=this.n-2,n=this.n;if(m===2)return [0,2*Math.PI/3,4*Math.PI/3].map(t=>embed(add(center,[r*Math.cos(t),r*Math.sin(t)]),n));return [[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]].map(u=>embed(add(center,scale(unit(u),r)),n));}
  update(key,value){
    if(revised.update(this,key,value))return;
    if(key==='infinity'){this.vectors=this.vectors.map(v=>{const p=[...v];p[this.n-1]=0;return p;});return;}
    if(key==='contained'){this.vectors[0]=[...this.vectors[1]];return;}
    this.state[key]=value;
    if(key==='grade'&&this.def.type!=='rotation'){const count=Math.max(1,+value);this.setVectors(count,['flat','attitude','norm'].includes(this.def.type)?'point':'vector');}
    if(key==='count'){const p=[...this.vectors[0]];this.setVectors(+value+1);this.vectors[0]=p;this.names=['v₀',...Array.from({length:+value},(_,i)=>String.fromCharCode(97+i))];}
    if(key==='radius2'){const q=this.vectors[0],w=q[this.n-2];q[this.n-1]=(dot(q.slice(0,this.n-2),q.slice(0,this.n-2)) + value*w*w)/(2*(w||1));}
  }
  move(i,next){revised.move(this,i,next);}
  reset(){const saved=JSON.parse(JSON.stringify(this.initial));this.state=saved.state;this.vectors=saved.vectors;this.names=saved.names;this.grades=saved.grades;this.frames.clear();}
  row(label,value){this.rows.push({label,value});}
  mv(x){return formatMV(x,this.alg);}
  inputs(scene,indices=revised.activeInputs(this)) {indices.forEach(i=>scene.handle(this.vectors[i],this.names[i]||String.fromCharCode(97+i),i,[colors.a,colors.b,colors.c][i%3],null,false,revised.dragSpace(this,i)));}
  genericSource(){const grade=+(this.state.grade??this.def.grade??2);if(['complement','dual'].includes(this.def.type)){if(grade===0)return this.alg.scalar(this.state.scalar);if(grade===this.n)return this.alg.volume(this.state.scalar);}return grade===0?this.alg.scalar(1):this.alg.blade(this.vectors.slice(0,grade));}
  paint(scene){
    if(revised.paint(this,scene))return;
    this.rows=[];this.formula=this.def.formula;this.status='';scene.isCGA=this.cga;
    const t=this.def.type,A=this.alg,n=this.n,s=this.state,vs=this.vectors,vec=i=>A.vector(vs[i]),blade=ids=>A.blade(ids.map(i=>vs[i]));
    if(this.cga){if(s.mesh||t==='null')scene.cgaMesh(t==='null');}
    else if(A.kind==='rigid')scene.sliceMesh();
    if(t==='wedge'||t==='trivector'||t==='distribute'){
      this.inputs(scene);let out;
      if(t==='wedge'){const order=+s.order?[vs[1],vs[0]]:vs;scene.blade(order,+s.order?'b ∧ a':'a ∧ b');out=A.blade(order);if(s.loci){vs.forEach((v,i)=>scene.locusLine(v,vs[1-i]));}}
      if(t==='trivector'){const order=+s.order?[vs[1],vs[0],vs[2]]:vs;scene.blade(order,+s.order?'b ∧ a ∧ c':'a ∧ b ∧ c');out=A.blade(order);if(s.loci)vs.forEach((v,i)=>scene.locusSpan(v,scene.orthonormal(vs.filter((_,j)=>j!==i))));}
      if(t==='distribute'){const p=add(vs[0],vs[1]);scene.arrow(p,'a + b',colors.mesh);scene.line(vs[0],p,colors.mesh,1,true);scene.line(vs[1],p,colors.mesh,1,true);if(+s.side===0)scene.blade([p,vs[2]],'(a + b) ∧ c');else{scene.blade([vs[0],vs[2]],'a ∧ c');scene.blade([vs[1],vs[2]],'b ∧ c',{origin:vs[0]});}out=A.blade([p,vs[2]]);}
      this.row('Result',this.mv(out));this.row(t==='trivector'?'Volume':'Area',val(length(out)));if(s.fix)this.row('Constraint','Constant-product locus');
    }
    else if(t==='basis'){
      const indices=s.basis,out=scale(indicesBlade(A,indices),indices===''?s.scalar:1),label=indices.length===n?'𝟙':indices===''?'1':`e${indices.replace(/\d/g,d=>'₀₁₂₃₄₅'[+d])}`;
      if(indices==='')scene.element(out,A,label);else scene.blade([...indices].map(i=>basis(n,+i-1)),label,{alpha:.17});
      this.formula=this.basisFormula(indices);this.row('Grade / Antigrade',`${indices.length} / ${n-indices.length}`);this.row('Element',this.mv(out));
    }
    else if(t==='motor'){
      this.inputs(scene);const count=+s.count,planes=vs.slice(1,count+1),dim=n-1,t=s.time;
      const result=reflectionPath(planes,vs[0],dim,t);scene.point(vs[0],'',colors.a);scene.point(result,'v(t)',colors.result);let prev=null;for(let time=0;time<=1.001;time+=.025){const q=reflectionPath(planes,vs[0],dim,time);if(prev)scene.line(prev,q,colors.result,1,true,.7);prev=q;}
      if(n===4){const proper=composeReflections(count%2?planes.slice(1):planes,dim),{axis,center,angle}=screwParameters(proper);if(length(axis)>EPS){const c=[...center,1],d=[...axis,0];scene.line(add(c,scale(d,-2.5)),add(c,scale(d,2.5)),colors.purple,1.8,true);const radial=sub(vs[0],c),orth=sub(radial,scale(d,dot(radial,d))),r=Math.min(1.2,length(orth)),u=unit(orth),v=[axis[1]*u[2]-axis[2]*u[1],axis[2]*u[0]-axis[0]*u[2],axis[0]*u[1]-axis[1]*u[0],0];if(r>EPS){scene.line(c,add(c,scale(u,r)),colors.purple,1.3,true);let prev=null;for(let i=0;i<=32;i++){const theta=angle*t*i/32,p=add(c,add(scale(u,r*Math.cos(theta)),scale(v,r*Math.sin(theta))));if(prev)scene.line(prev,p,colors.purple,2);prev=p;}}}}
      let Q=A.volume();for(const plane of planes){const norm=length(plane.slice(0,dim));if(norm<EPS){this.status='A reflecting normal is zero';return;}const g=A.lc(A.vector(scale(plane,1/norm)));Q=A.agp(g,Q);if(s.planes)scene.flat(g,A,'',colors.mesh);}
      this.row(count%2?'Flector':'Motor',this.mv(Q));this.row('Interpolation',count%2?'Fixed reflection × screw path':'Screw motion · SE(n−1)');this.row('v(t)',this.mv(A.vector(result)));if(count%2)this.status='Flector path starts at a reflection · det = −1';
      this.formula=`${m(count%2?'F':'Q')} = ${m('gₘ')} ${AGP} ⋯ ${AGP} ${m('g₁')}`;
    }
    else if(t==='null'){
      if(s.point)this.inputs(scene);const q=vec(0);this.row('q',this.mv(q));this.row('q • q',val(A.inner(q,q)));this.row('Metric',`${E(n-1)} • ${E(n)} = −1`);this.row('CGA dimensions',`${n}D algebra · ${n-2}D round geometry`);
    }
    else if(t==='cganorm'){
      this.inputs(scene);const x=A.blade(vs),label=vs.length===2?'d':'c',info=spatialRound(scene,x,A,'\\hat{'+label+'}',colors.result),prop=cgaProperties(x,A),parts=cgaParts(x,A);revised.embeddedRound(scene,x,A,label,colors.result);
      this.formula=`${V(label)} = ${['●','○','■','□'].map(s=>V(label+s)).join(' + ')}`;
      parts.forEach((part,i)=>{const symbol=['●','○','■','□'][i];if(+s.part===0||+s.part===i+1)scene.element(part,A,label+'_{'+symbol+'}',{color:[colors.a,colors.b,colors.purple,colors.c][i],dashed:true,alpha:.055});this.row(['Round bulk','Round weight','Flat bulk','Flat weight'][i], '‖'+label+'‖'+symbol+' = '+val(length(part))+'; '+this.mv(part));});
      if(info?.center){const origin=basis(n,n-2),f=removeInfinity(prop.carrier,A),q=f.alg.coordinates(f.alg.project(f.alg.vector(basis(n-1,n-2)),f.blade).result),support=affine(q);if(support){const point=[...support,0];scene.line(origin,point,colors.warm,2,true);scene.line(point,info.center,colors.purple,2,true);scene.point(point,'\\hat{sup('+label+')}',colors.warm);scene.label(scale(add(origin,point),.5),'‖'+label+'‖● / ‖'+label+'‖○',colors.warm,{dy:-9});scene.label(scale(add(point,info.center),.5),'‖'+label+'‖□ / ‖'+label+'‖○',colors.purple,{dy:15});}scene.line(origin,info.center,colors.ink,1,true);}
      this.row(label,this.mv(x));
    }
    else if(t==='conformal-transform'){
      this.inputs(scene);const time=s.time,inf=A.vector(basis(n,n-1)),origin=A.vector(basis(n,n-2));let T,Ti,negate=false;
      if(s.transform==='translation'){const shift=basis(n,0,1.4*time);shift[1]=.3*time;const term=scale(A.gp(A.vector(shift),inf),.5);T=sub(A.scalar(),term);Ti=add(A.scalar(),term);}
      else if(s.transform==='rotation'){const angle=time*Math.PI*.8;const B=indicesBlade(A,'12');T=sub(A.scalar(Math.cos(angle/2)),scale(B,Math.sin(angle/2)));Ti=A.reverse(T);}
      else if(s.transform==='dilation'){const sigma=time*Math.log(2),B=A.wedge(origin,inf);T=add(A.scalar(Math.cosh(sigma/2)),scale(B,Math.sinh(sigma/2)));Ti=sub(A.scalar(Math.cosh(sigma/2)),scale(B,Math.sinh(sigma/2)));}
      else {const radius=.5+time;T=sub(origin,scale(inf,radius*radius/2));Ti=scale(T,1/(radius*radius));negate=true;}
      const output=vs.map(v=>scale(A.gp(A.gp(T,A.vector(v)),Ti),negate?-1:1));const input=A.blade(vs),out=output.reduce((r,v)=>A.wedge(r,v),A.scalar());spatialRound(scene,input,A,'\\hat{c₀}',colors.a);spatialRound(scene,out,A,'\\hat{c₁}',colors.result);revised.embeddedRound(scene,input,A,'c₀',colors.a);revised.embeddedRound(scene,out,A,'c₁',colors.result);
      output.forEach((v,i)=>{const q=A.coordinates(v);scene.arrow(q,this.names[i]+'′',colors.result,Z(n),true);const w=q[n-2];if(Math.abs(w)>EPS){const norm=scale(q,1/w);norm[n-1]=0;scene.point(norm,'',colors.result,3);}else scene.label(basis(n,n-1),'Point at infinity',colors.result,{dy:16});});
      this.row('T',this.mv(T));this.row('c₁',this.mv(out));this.row('Null residual max',val(Math.max(...output.map(v=>Math.abs(A.inner(v,v))))));
      this.formula=`${m('p′')} = ${negate?'−':''}${m('T')} ${GP} ${m('p')} ${GP} ${m('T')}<sup>−1</sup>`;
    }
  }
  basisFormula(indices){
    if(indices==='')return `${S}　(Scalar)`;
    if(indices.length===1)return E(indices);
    const sign=indicesBlade(this.alg,indices).find(x=>x!==0),canonical=[...indices].sort().join('');
    if(indices.length===this.n)return `${indices.length===3?(sign>0?'e₁₂₃ = e₂₃₁ = e₃₁₂':'e₁₃₂ = e₂₁₃ = e₃₂₁'):E(indices)} = ${sign<0?'−':''}${I}　(Antiscalar)`;
    if(indices.length===3){const cyclic=[indices,indices.slice(1)+indices[0],indices[2]+indices.slice(0,2)];return `${cyclic.map(E).join(' = ')} = ${[...indices].map(E).join(' ∧ ')}`;}
    return `${E(indices)} = ${[...indices].map(E).join(' ∧ ')}`;
  }
}
