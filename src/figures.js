import { Algebra, basis, add, sub, scale, dot, length, unit, EPS, formatMV, indicesBlade } from './algebra.js';
import { colors } from './scene.js';
import { embed, affine, cgaParts, cgaProperties, spatialRound, removeInfinity, closestPoint, reflectionPath } from './geometry.js';
import { V, E, I, S, R, L, GP, AGP } from './content.js';
const Z=n=>Array(n).fill(0), val=x=>Number(x.toFixed(3)), m=v=>V(v), a=m('a'),b=m('b'),c=m('c');
const check=(key,label,value=false)=>({type:'check',key,label,value});
const select=(key,label,options,value=options[0][0])=>({type:'select',key,label,options,value});
const range=(key,label,min,max,step,value)=>({type:'range',key,label,min,max,step,value});
const action=(key,label)=>({type:'button',key,label});
const seeds=[[1.65,.2,.45,.2],[.25,1.5,.6,-.25],[.25,-.35,1.5,.4],[-.6,.4,.5,1.2],[.8,-.7,.6,.3],[.1,.9,-.5,1.1]];
const positions=[[-1.1,-.65,.25],[1.3,-.2,-.4],[.2,1.2,.65],[-.65,.5,-.7],[.5,-1.1,.7],[1,.65,-.4]];
export class FigureModel {
  constructor(def,n){
    this.def=def;this.baseN=n;this.cga=['null','roundpoint','cganorm','round','containment','cgameet','conformal-transform'].includes(def.type);
    this.n=this.cga?n+1:n;this.alg=new Algebra(this.n,this.cga?'conformal':['wedge','distribute','trivector','basis','complement','antiwedge','geometric','reflection','rotation'].includes(def.type)?'euclidean':'rigid');
    this.state={};this.vectors=[];this.controls=[];this.rows=[];this.formula=def.formula;this.names=[];this.init();
    this.initial=JSON.parse(JSON.stringify({state:this.state,vectors:this.vectors}));
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
    if(t==='complement'||t==='dual'){this.setVectors(1);control(select('grade','Element grade',Array.from({length:n+1},(_,k)=>[k,`${k} · ${k===n?'Antiscalar':['Scalar','Vector','Bivector','Trivector','Quadrivector'][k]}`]),1));control(select('side','Complement side',[['right','Right · overline'],['left','Left · underline']]));control(range('scalar','Scalar / Antiscalar coefficient',-3,3,.05,1));control(range('frame','Complement frame',0,360,1,0));if(t==='dual')control(select('dual','Dual',[['bulk','Bulk dual ★'],['weight','Weight dual ☆']]));}
    if(t==='antiwedge'){this.setVectors(2*(n-1));control(check('inputs','Input blades',true));control(check('complements','Right complements',true));control(check('intermediate','Wedge of complements',true));control(check('result','Antiwedge result',true));}
    if(t==='geometric'){this.setVectors(2);control(check('wedgeLocus','Wedge locus',true));control(check('dotLocus','Dot locus',true));}
    if(t==='reflection'||t==='rotation'){this.setVectors(t==='reflection'?2:3);this.names=t==='reflection'?['a','v₀']:['a','b','v₀'];control(check('complements','Reflecting complements',true));if(t==='rotation')control(select('grade','Object grade',[[1,'Vector'],[2,'Bivector'],[3,'Trivector']]));}
    if(['flat','attitude','norm'].includes(t)){this.setVectors(this.def.grade||2,'point');if(t!=='flat')control(select('grade','Object',[[1,'Point'],[2,'Line'],[3,n===3?'Whole slice':'Plane']],2));control(check('decompose','Bulk / Weight',t==='norm'));control(check('homogeneous','Homogeneous blade',true));control(action('infinity','Weight = 0'));}
    if(t==='join'){this.setVectors(n===4?3:2,'point');control(select('case','Join',[[0,'Point ∧ Point'],...(n===4?[[1,'Point ∧ Line']]:[])]));control(check('homogeneous','Homogeneous blades',true));}
    if(t==='meet'){this.setVectors(n===3?4:6,'point');control(select('case','Meet',n===3?[[0,'Line ∨ Line']]:[[0,'Plane ∨ Plane'],[1,'Plane ∨ Line']]));control(check('homogeneous','Homogeneous blades',false));}
    if(t==='dot'||t==='antidot'){this.setVectors(2);control(check('fix','Fix value'));control(check('loci','Constant-product locus',true));control(check('decompose','Bulk / Weight',true));}
    if(t==='distance'){this.setVectors(4,'point');control(select('case','Distance',[[0,'Point – Point'],[1,'Point – Line'],...(n===4?[[2,'Point – Plane']]:[])]));control(check('homogeneous','Homogeneous blades',false));}
    if(t==='interior'){this.setVectors(3,'point');control(select('operation','Operation',[[0,'Bulk expansion · a ∧ b★'],[1,'Weight expansion · a ∧ b☆'],[2,'Bulk contraction · a ∨ b★'],[3,'Weight contraction · a ∨ b☆']]));}
    if(t==='projection'){const j=this.def.case,anti=this.def.variant>=2;this.grades=n===3?(anti?[2,1]:[1,2]):anti?[[3,1],[2,1],[3,2]][j]:[[1,3],[1,2],[2,3]][j];this.setVectors(this.grades[0]+this.grades[1],'point');control(check('dual','Target dual',true));control(check('intermediate','First product',true));control(check('homogeneous','Homogeneous blades',false));this.names=this.vectors.map((_,i)=>i<this.grades[0]?`a${i+1}`:`b${i-this.grades[0]+1}`);}
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
    if(key==='infinity'){this.vectors=this.vectors.map(v=>{const p=[...v];p[this.n-1]=0;return p;});return;}
    if(key==='contained'){this.vectors[0]=[...this.vectors[1]];return;}
    this.state[key]=value;
    if(key==='grade'&&this.def.type!=='rotation'){const count=Math.max(1,+value);this.setVectors(count,['flat','attitude','norm'].includes(this.def.type)?'point':'vector');}
    if(key==='count'){const p=[...this.vectors[0]];this.setVectors(+value+1);this.vectors[0]=p;this.names=['v₀',...Array.from({length:+value},(_,i)=>String.fromCharCode(97+i))];}
    if(key==='radius2'){const q=this.vectors[0],w=q[this.n-2];q[this.n-1]=(dot(q.slice(0,this.n-2),q.slice(0,this.n-2)) + value*w*w)/(2*(w||1));}
  }
  move(i,next){
    const old=this.vectors[i],t=this.def.type,n=this.n;
    if(this.state.fix){
      let delta=sub(next,old);
      if(t==='wedge'){const d=this.vectors[1-i];delta=scale(d,dot(delta,d)/(dot(d,d)||1));}
      if(t==='trivector'){const ds=this.vectors.filter((_,j)=>j!==i),f=[unit(ds[0])];let q=sub(ds[1],scale(f[0],dot(f[0],ds[1])));if(length(q)>EPS)f.push(unit(q));delta=f.reduce((s,v)=>add(s,scale(v,dot(v,delta))),Z(n));}
      if(t==='dot'||t==='antidot'){const other=this.vectors[1-i],normal=t==='dot'?other.map((v,j)=>j===n-1?0:v):other.map((v,j)=>j===n-1?0:v);delta=sub(delta,scale(normal,dot(normal,delta)/(dot(normal,normal)||1)));}
      next=add(old,delta);
    }
    if(this.cga&&['null','round','cganorm','containment','cgameet','conformal-transform'].includes(t))next=embed(next.slice(0,n-2),n);
    this.vectors[i]=next;
    if(t==='roundpoint'){const a=this.alg.vector(next),w=next[n-2];if(Math.abs(w)>EPS)this.state.radius2=-this.alg.inner(a,a)/(w*w);}
  }
  reset(){this.state=JSON.parse(JSON.stringify(this.initial.state));this.vectors=JSON.parse(JSON.stringify(this.initial.vectors));}
  row(label,value){this.rows.push({label,value});}
  mv(x){return formatMV(x,this.alg);}
  inputs(scene,indices=this.vectors.map((_,i)=>i)) {indices.forEach(i=>scene.handle(this.vectors[i],this.names[i]||String.fromCharCode(97+i),i,[colors.a,colors.b,colors.c][i%3]));}
  genericSource(){const grade=+(this.state.grade??this.def.grade??2);if(['complement','dual'].includes(this.def.type)){if(grade===0)return this.alg.scalar(this.state.scalar);if(grade===this.n)return this.alg.volume(this.state.scalar);}return grade===0?this.alg.scalar(1):this.alg.blade(this.vectors.slice(0,grade));}
  paint(scene){
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
    else if(t==='complement'||t==='dual'){
      const source=this.genericSource(),grade=+s.grade;
      if(grade>0&&grade<n){this.inputs(scene);scene.blade(vs.slice(0,grade),'u');}else scene.element(source,A,'u');
      const out=t==='dual'?A.dual(source,s.dual==='weight',s.side):A.complement(source,s.side);
      const right=t==='dual'?A.dual(source,s.dual==='weight'):A.rc(source);
      let fs=A.factor(right);if(s.side==='left'&&(grade*(n-grade))%2)fs=fs.map(v=>scale(v,-1));
      if(fs.length>1){const theta=s.frame*Math.PI/180,l0=length(fs[0]),l1=length(fs[1]),f0=unit(fs[0]),f1=unit(fs[1]);fs[0]=scale(add(scale(f0,Math.cos(theta)),scale(f1,Math.sin(theta))),l0);fs[1]=scale(add(scale(f0,-Math.sin(theta)),scale(f1,Math.cos(theta))),l1);
        scene.circle(Z(n),f0,f1,1,colors.mesh,true,.35);
        for(let j=0;j<Math.min(2,fs.length);j++)scene.handle(fs[j],'',`frame-${j}`,colors.result,next=>{const angle=j===0?Math.atan2(dot(next,f1),dot(next,f0)):Math.atan2(-dot(next,f0),dot(next,f1));s.frame=(angle*180/Math.PI+360)%360;},true);
      }
      const label=t==='dual'?(s.dual==='weight'?'u☆':'u★'):(s.side==='right'?'ū':'u̲');
      if(fs.length)scene.blade(fs,label,{dashed:true,color:colors.result,connect:true});else scene.element(out,A,label,{color:colors.result,dashed:true});
      const sourceFactors=grade===n?A.factor(source):vs.slice(0,grade),ordered=s.side==='right'?[...sourceFactors,...fs]:[...fs,...sourceFactors];ordered.forEach((v,i)=>{if(i)scene.line(ordered[i-1],v,colors.mesh,1,true);scene.label(v,String.fromCharCode(97+i),colors.mesh,{dy:15,size:10});});
      this.row('u',this.mv(source));this.row(label,this.mv(out));if(t==='complement'){this.row('u ∧ right complement(u)',this.mv(A.wedge(source,A.rc(source))));this.row('Scale','General u: ||u||² 𝟙, not always 𝟙');}
    }
    else if(t==='antiwedge'){
      this.inputs(scene);const k=n-1,x=blade(Array.from({length:k},(_,i)=>i)),y=blade(Array.from({length:k},(_,i)=>i+k)),rx=A.rc(x),ry=A.rc(y),w=A.wedge(rx,ry),out=A.lc(w);
      if(s.inputs){scene.element(x,A,'a',{alpha:.1});scene.element(y,A,'b',{alpha:.1});}if(s.complements){scene.element(rx,A,'ā',{dashed:true,color:colors.a});scene.element(ry,A,'b̄',{dashed:true,color:colors.b});}if(s.intermediate)scene.element(w,A,'ā ∧ b̄',{dashed:true,color:colors.purple});if(s.result)scene.element(out,A,'a ∨ b',{color:colors.result});
      this.row('Right complement a',this.mv(rx));this.row('Right complement b',this.mv(ry));this.row('Wedge',this.mv(w));this.row('Left complement · result',this.mv(out));
    }
    else if(t==='geometric'){
      this.inputs(scene);scene.blade(vs,'a ∧ b');scene.angle(vs[0],vs[1]);if(s.wedgeLocus)scene.locusLine(vs[1],vs[0]);if(s.dotLocus)scene.locusPlane(vs[1],vs[0],colors.purple);
      this.row('Scalar part · a · b',val(dot(vs[0],vs[1])));this.row('Geometric product',this.mv(A.gp(vec(0),vec(1))));const q=dot(vs[0],vs[0]);this.row('a⁻¹',q>EPS?this.mv(scale(vec(0),1/q)):'Undefined · a = 0');
    }
    else if(t==='reflection'||t==='rotation'){
      this.inputs(scene);const vi=t==='reflection'?1:2,v0=vec(vi),v1=A.reflect(v0,vec(0));if(!v1){this.status='Null reflecting vector · inverse undefined';return;}
      const p=A.coordinates(v1);scene.arrow(p,'v₁',colors.result);scene.line(vs[vi],p,colors.mesh,1,true);
      if(t==='reflection'){scene.arrow(scale(p,-1),'−v₁',colors.purple);scene.line(vs[vi],scale(p,-1),colors.mesh,1,true);scene.blade([vs[0],vs[vi]],'a ⟑ v₀',{alpha:.12});scene.blade([scale(p,-1),vs[0]],'(−v₁) ⟑ a = a ⟑ v₀',{alpha:.12});scene.angle(vs[0],vs[vi]);}
      else{const v2=A.reflect(v1,vec(1));if(!v2){this.status='Null reflecting vector · inverse undefined';return;}scene.arrow(A.coordinates(v2),'v₂',colors.purple);scene.line(p,A.coordinates(v2),colors.mesh,1,true);if(+s.grade>1){const k=+s.grade,fs=[vs[vi],basis(n,1,.8),basis(n,2,.7)].slice(0,k);scene.blade(fs,'u₀',{alpha:.08});const fs2=fs.map(f=>A.coordinates(A.reflect(A.reflect(A.vector(f),vec(0)),vec(1))));scene.blade(fs2,'u₂',{alpha:.18});this.row('u₂',this.mv(A.blade(fs2)));}this.row('v₂',this.mv(v2));}
      if(s.complements){scene.element(A.rc(vec(0)),A,'ā',{dashed:true,color:colors.mesh,alpha:.035});if(t==='rotation')scene.element(A.rc(vec(1)),A,'b̄',{dashed:true,color:colors.b,alpha:.035});}
      this.row('v₁',this.mv(v1));
    }
    else if(['flat','attitude','norm'].includes(t)){
      const x=this.genericSource(),k=A.gradeOf(x),bulk=A.bulk(x),weight=A.weight(x);this.inputs(scene);if(s.homogeneous)scene.blade(vs.slice(0,+s.grade||this.def.grade||2),'u',{alpha:.08});
      vs.forEach(v=>{scene.locusLine(Z(n),v);const p=affine(v);if(p)scene.point(p,'',colors.a,3);});scene.flat(x,A,k===1?'p':k===2?'l':'g',colors.result);
      const finite=vs.map(affine).filter(Boolean);if(k===2&&finite.length>=2)scene.line(finite[0],finite[1],colors.result,3.5);if(k===3&&finite.length>=3)scene.poly(finite.slice(0,3),colors.result,.12);
      if(s.decompose){scene.element(bulk,A,'u●',{color:colors.a,dashed:true,alpha:.06});scene.element(weight,A,'u○',{color:colors.purple,dashed:true,alpha:.06});scene.flat(bulk,A,'bulk · Horizon',colors.a);scene.flat(weight,A,'weight',colors.purple);}
      if(t==='attitude'){const inf=A.blade(Array.from({length:n-1},(_,i)=>basis(n,i))),h=A.antiwedge(x,inf);scene.flat(h,A,'Horizon intersection',colors.warm);this.row('att(u)',this.mv(A.attitude(x)));}
      if(t==='norm'){const bn=A.bulkNorm(x),wn=A.weightNorm(x);this.row('Bulk norm',`${val(bn)} · 1`);this.row('Weight norm',`${val(wn)} · 𝟙`);this.row('Homogeneous magnitude',`${val(bn)} · 1 + ${val(wn)} · 𝟙`);this.row('Projected magnitude',wn>EPS?val(bn/wn):'Undefined · zero weight');const support=A.project(A.vector(basis(n,n-1)),x).result,q=affine(A.coordinates(support));if(q){scene.line(basis(n,n-1),q,colors.warm,2,true);scene.point(q,'support',colors.warm,4);}}
      this.row('u',this.mv(x));this.row(k===1?'Bulk · position':'Bulk · moment',this.mv(bulk));this.row(k===1?'Weight · homogeneous weight':'Weight · direction / normal',this.mv(weight));
    }
    else if(t==='join'||t==='meet'){
      this.inputs(scene);let x,y,out;
      if(t==='join'){x=vec(0);y=+s.case&&n===4?blade([1,2]):vec(1);out=A.wedge(x,y);this.formula=+s.case&&n===4?`${m('p')} ∧ ${m('l')}`:`${m('p')} ∧ ${m('q')}`;}
      else{x=blade(Array.from({length:n-1},(_,i)=>i));const k=n===4&&+s.case===1?2:n-1;y=blade(Array.from({length:k},(_,i)=>i+n-1));out=A.antiwedge(x,y);this.formula=n===3?`${m('l')} ∨ ${m('k')}`:+s.case?`${m('g')} ∨ ${m('l')}`:`${m('g')} ∨ ${m('h')}`;}
      scene.flat(x,A,'a',colors.a);scene.flat(y,A,'b',colors.b);scene.flat(out,A,'result',colors.result);if(s.homogeneous){scene.element(x,A,'a',{alpha:.06});scene.element(y,A,'b',{alpha:.06});scene.element(out,A,'result',{color:colors.result,alpha:.09});}
      this.row('a',this.mv(x));this.row('b',this.mv(y));this.row('Result',this.mv(out));
    }
    else if(t==='dot'||t==='antidot'){
      this.inputs(scene);let x=vec(0),y=vec(1);if(t==='antidot'){x=A.lc(x);y=A.lc(y);scene.element(x,A,'a',{alpha:.05,color:colors.a});scene.element(y,A,'b',{alpha:.05,color:colors.b});}
      if(s.loci)scene.locusPlane(vs[1],vs[0].map((v,i)=>i===n-1?0:v),colors.purple);
      if(s.decompose){const xb=A.bulk(x),xw=A.weight(x),yb=A.bulk(y),yw=A.weight(y);scene.element(t==='dot'?xb:xw,A,t==='dot'?'a●':'a○',{dashed:true,color:colors.a});scene.element(t==='dot'?yb:yw,A,t==='dot'?'b●':'b○',{dashed:true,color:colors.b});}
      this.row(t==='dot'?'Dot · scalar':'Antidot · antiscalar',`${val(t==='dot'?A.inner(x,y):A.antiInner(x,y))} · ${t==='dot'?'1':'𝟙'}`);this.row('a',this.mv(x));this.row('b',this.mv(y));
    }
    else if(t==='distance'){
      this.inputs(scene);const k=+s.case===0?1:+s.case===1?2:3,x=vec(0),y=blade(Array.from({length:k},(_,i)=>i+1));scene.flat(x,A,'a',colors.a);scene.flat(y,A,'b',colors.b);
      const numerator=A.bulkNorm(A.attitude(A.wedge(x,y))),denominator=A.bulkNorm(A.wedge(A.attitude(x),A.attitude(y))),weight=A.weightNorm(A.wedge(x,A.attitude(y)));
      const p=affine(vs[0]),q=k===1?affine(vs[1]):closestPoint(vs[0],y,A);if(p&&q){scene.line(p,q,colors.warm,2,true);scene.point(q,'closest',colors.warm);scene.label(scale(add(p,q),.5),'d',colors.warm,{dy:-8});}
      if(s.homogeneous){scene.element(x,A,'a');scene.element(y,A,'b',{alpha:.08});}
      this.row('Homogeneous distance',`${val(numerator)} · 1 + ${val(weight)} · 𝟙`);this.row('Projected distance',denominator>EPS?val(numerator/denominator):'Undefined · denominator = 0');
    }
    else if(t==='interior'){
      this.inputs(scene);const op=+s.operation,weight=op%2===1,anti=op>=2,x=anti?blade([0,1]):vec(0),y=anti?vec(2):blade([1,2]),d=A.dual(y,weight),out=anti?A.antiwedge(x,d):A.wedge(x,d);
      scene.flat(x,A,'a',colors.a);scene.flat(y,A,'b',colors.b);scene.flat(out,A,'result',colors.result);scene.element(d,A,weight?'b☆':'b★',{color:colors.purple,dashed:true});this.row('Dual',this.mv(d));this.row('Result',this.mv(out));this.row('Result grade',A.gradeOf(out)===-1?'Zero':A.gradeOf(out));
    }
    else if(t==='projection'){
      this.inputs(scene);const [ka,kb]=this.grades,x=blade(Array.from({length:ka},(_,i)=>i)),y=blade(Array.from({length:kb},(_,i)=>i+ka));const central=this.def.variant%2===1,anti=this.def.variant>=2,{dual,intermediate,result}=A.project(x,y,{central,anti});
      scene.flat(x,A,'a',colors.a);scene.flat(y,A,'b',colors.b);scene.flat(result,A,'result',colors.result);if(s.dual){scene.element(dual,A,central?'b★':'b☆',{dashed:true,color:colors.purple,alpha:.055});scene.flat(dual,A,'dual',colors.purple);}if(s.intermediate)scene.flat(intermediate,A,'first product',colors.mesh);
      if(s.homogeneous){scene.element(x,A,'a',{alpha:.06});scene.element(y,A,'b',{alpha:.06});scene.element(intermediate,A,'first product',{alpha:.04,dashed:true,color:colors.mesh});scene.element(result,A,'result',{alpha:.08,color:colors.result});}
      if(!anti&&ka===1){const p=affine(vs[0]),q=affine(A.coordinates(result));if(p&&q)scene.line(p,q,colors.result,1,true);}
      this.row('Case',`${ka===1?'Point':ka===2?'Line':'Plane'} → ${kb===1?'Point':kb===2?'Line':'Plane'}`);this.row('Target dual',this.mv(dual));this.row('First product',this.mv(intermediate));this.row('Result',this.mv(result));if(A.gradeOf(result)===-1)this.status='Result = 0 · degenerate / undefined';
    }
    else if(t==='projective'||t==='isometry'){
      this.inputs(scene);const av=vec(0),p=vec(1),out=t==='projective'?A.reflect(p,av):A.antiReflect(p,av);if(!out){this.status='Null a · inverse undefined';return;}
      scene.arrow(A.coordinates(out),'v₁',colors.result);scene.flat(p,A,'p₀',colors.a);scene.flat(out,A,'p₁',colors.result);const p0=affine(vs[1]),p1=affine(A.coordinates(out));if(p0&&p1)scene.line(p0,p1,colors.mesh,1,true);
      const g=A.lc(av);if(t==='isometry'){scene.flat(g,A,'g · reflecting hyperplane',colors.purple);if(s.complements){scene.element(A.rc(p),A,'v̄₀',{dashed:true,color:colors.a,alpha:.04});scene.element(A.rc(out),A,'v̄₁',{dashed:true,color:colors.result,alpha:.04});scene.element(g,A,'g',{dashed:true,color:colors.purple,alpha:.04});}const q=A.inner(av,av),alt=scale(A.agp(A.agp(g,p),g),-1/q);this.row('−g ⟇ v₀ ⟇ g / (a • a)',this.mv(alt));this.row('Equality residual',val(length(sub(out,alt))));}
      if(s.loci){const eu=new Algebra(n),q=A.inner(av,av);let normal=t==='isometry'?vs[0]:vs[0].map((x,i)=>i===n-1?0:x);const fixed=eu.lc(eu.vector(normal));scene.flat(fixed,A,'fixed locus',colors.green);
        if(t==='projective'){const infinity=basis(n,n-1).map((x,i)=>x-2*vs[0][n-1]*(i===n-1?0:vs[0][i])/q);scene.flat(eu.lc(eu.vector(infinity)),A,'sent to infinity',colors.purple);}}
      if(s.orbit){for(let x=-2;x<=2;x+=.5)for(let y=-2;y<=2;y+=.5){const f=basis(n,n-1);f[0]=x;f[1]=y;const o=t==='projective'?A.reflect(A.vector(f),av):A.antiReflect(A.vector(f),av);const q=o&&affine(A.coordinates(o));if(q&&length(q)<5){scene.point(q,'',colors.result,1.5);scene.line(f,q,colors.mesh,.5,true,.12);}}}
      this.row('Projective geometric product',this.mv(A.gp(av,p)));this.row('v₁',this.mv(out));this.row('Metric',`diag(${Array(n-1).fill(1).join(', ')}, 0)`);
    }
    else if(t==='motor'){
      this.inputs(scene);const count=+s.count,planes=vs.slice(1,count+1),dim=n-1,t=s.time;
      const result=reflectionPath(planes,vs[0],dim,t);scene.point(vs[0],'v₀',colors.a);scene.point(result,'v(t)',colors.result);let prev=null;for(let time=0;time<=1.001;time+=.025){const q=reflectionPath(planes,vs[0],dim,time);if(prev)scene.line(prev,q,colors.result,1,true,.7);prev=q;}
      let Q=A.volume();for(const plane of planes){const norm=length(plane.slice(0,dim));if(norm<EPS){this.status='A reflecting normal is zero';return;}const g=A.lc(A.vector(scale(plane,1/norm)));Q=A.agp(g,Q);if(s.planes)scene.flat(g,A,'',colors.mesh);}
      this.row(count%2?'Flector':'Motor',this.mv(Q));this.row('Interpolation',count%2?'Fixed reflection × screw path':'Screw motion · SE(n−1)');this.row('v(t)',this.mv(A.vector(result)));if(count%2)this.status='Flector path starts at a reflection · det = −1';
      this.formula=`${m(count%2?'F':'Q')} = ${m('gₘ')} ${AGP} ⋯ ${AGP} ${m('g₁')}`;
    }
    else if(t==='null'){
      if(s.point)this.inputs(scene);const q=vec(0);this.row('q',this.mv(q));this.row('q • q',val(A.inner(q,q)));this.row('Metric',`${E(n-1)} • ${E(n)} = −1`);this.row('CGA dimensions',`${n}D algebra · ${n-2}D round geometry`);
    }
    else if(t==='roundpoint'||t==='round'||t==='cganorm'){
      this.inputs(scene);let x=t==='roundpoint'?vec(0):A.blade(vs);
      if(t==='round'&&s.flat)x=A.blade([...vs.slice(0,-1),basis(n,n-1)]);
      if(t==='round'&&this.def.grade===4&&n===4)this.formula=`${m('c')} = ${m('p')} ∧ ${m('q')} ∧ ${m('r')}　(2D counterpart)`;
      const info=spatialRound(scene,x,A,t==='roundpoint'?'a':t==='cganorm'?'c':'u',colors.result,{radius:s.radius});const prop=cgaProperties(x,A);
      if(s.homogeneous)scene.element(x,A,'u',{alpha:.05});
      if(t==='cganorm'){const parts=cgaParts(x,A);parts.forEach((part,i)=>{if(+s.part===0||+s.part===i+1)scene.element(part,A,['u●','u○','u■','u□'][i],{color:[colors.a,colors.b,colors.purple,colors.c][i],dashed:true,alpha:.055});const sym=['●','○','■','□'][i];this.row(['Round bulk ●','Round weight ○','Flat bulk ■','Flat weight □'][i],`‖u‖${sym} = ${val(length(part))}; u${sym} = ${this.mv(part)}`);});if(info?.center){const w=basis(n,n-2),p=[...info.center];const f=removeInfinity(prop.carrier,A),q=f.alg.coordinates(f.alg.project(f.alg.vector(basis(n-1,n-2)),f.blade).result),support=affine(q);if(support){const point=[...support,0];scene.line(w,point,colors.warm,2,true);scene.line(point,p,colors.purple,2,true);scene.point(point,'support',colors.warm);scene.label(scale(add(w,point),.5),'‖u‖● / ‖u‖○',colors.warm,{dy:-9,size:11});scene.label(scale(add(point,p),.5),'‖u‖□ / ‖u‖○',colors.purple,{dy:15,size:11});}scene.line(w,p,colors.ink,1,true);scene.label(scale(add(w,p),.5),'center norm',colors.ink,{dy:-9});}}
      else{
        for(const [key,label,color] of [['carrier','car(u)',colors.a],['cocarrier','ccr(u)',colors.b],['container','con(u)',colors.purple],['partner','par(u)',colors.warm],['conjugate','u†',colors.c]])if(s[key]){
          if(key==='carrier'||key==='cocarrier'){const r=removeInfinity(prop[key],A);scene.flat(r.blade,r.alg,label,color);}
          else spatialRound(scene,prop[key],A,label,color,{radius:s.radius});this.row(label,this.mv(prop[key]));
        }
        if(s.dual){scene.element(prop.dual,A,'u★',{color:colors.purple,dashed:true,alpha:.04});scene.element(prop.antidual,A,'u☆',{color:colors.b,dashed:true,alpha:.04});this.row('u★',this.mv(prop.dual));this.row('u☆',this.mv(prop.antidual));}
        if(s.attitude){scene.element(prop.attitude,A,'att(u)',{color:colors.warm,dashed:true,alpha:.06});this.row('att(u)',this.mv(prop.attitude));}
      }
      this.row('u',this.mv(x));this.row('u • u',val(A.inner(x,x)));if(info&&!info.flat)this.row('Radius squared',val(info.radius2));if(t==='roundpoint'){const projected=[...vs[0]];projected[n-1]=0;scene.arrow(projected,'u = 0 projection',colors.result,Z(n),true);this.row('Squared radius · /w²',val(s.radius2));}
    }
    else if(t==='containment'){
      this.inputs(scene);const p=vec(0),q=vec(1),C=A.blade(vs.slice(1)),out=A.wedge(p,C);spatialRound(scene,C,A,n===5?'sphere':'circle',colors.b);spatialRound(scene,p,A,'p',colors.a);scene.line([...vs[0].slice(0,n-1),0],[...vs[1].slice(0,n-1),0],colors.mesh,1,true);
      const distance=length(sub(vs[0].slice(0,n-2),vs[1].slice(0,n-2)));this.row('p • q',`${val(A.inner(p,q))} · 1`);this.row('−½ distance²',val(-distance*distance/2));this.row('p ∧ C',this.mv(out));this.row('Contained?',length(out)<1e-7?'Yes · p ∧ C = 0':'No');if(s.dual)scene.element(A.dual(C,true),A,'C☆',{dashed:true,color:colors.purple,alpha:.06});
    }
    else if(t==='cgameet'){
      this.inputs(scene);const k=n-1,x=blade(Array.from({length:k},(_,i)=>i)),y=blade(Array.from({length:k},(_,i)=>i+k)),out=A.antiwedge(x,y);spatialRound(scene,x,A,'a',colors.a);spatialRound(scene,y,A,'b',colors.b);const info=spatialRound(scene,out,A,'a ∨ b',colors.result,{radius:true});if(s.expansion){const ex=A.wedge(x,A.dual(y,true));scene.element(ex,A,'a ∧ b☆',{dashed:true,color:colors.purple,alpha:.04});this.row('Expansion',this.mv(ex));}if(s.homogeneous){scene.element(x,A,'a',{alpha:.04});scene.element(y,A,'b',{alpha:.04});scene.element(out,A,'a ∨ b',{color:colors.result,alpha:.06});}
      this.row('Join',this.mv(A.wedge(x,y)));this.row('Meet',this.mv(out));if(info&&!info.flat)this.row('Intersection radius²',val(info.radius2));
    }
    else if(t==='conformal-transform'){
      this.inputs(scene);const time=s.time,inf=A.vector(basis(n,n-1)),origin=A.vector(basis(n,n-2));let T,Ti,negate=false;
      if(s.transform==='translation'){const shift=basis(n,0,1.4*time);shift[1]=.3*time;const term=scale(A.gp(A.vector(shift),inf),.5);T=sub(A.scalar(),term);Ti=add(A.scalar(),term);}
      else if(s.transform==='rotation'){const angle=time*Math.PI*.8;const B=indicesBlade(A,'12');T=sub(A.scalar(Math.cos(angle/2)),scale(B,Math.sin(angle/2)));Ti=A.reverse(T);}
      else if(s.transform==='dilation'){const sigma=time*Math.log(2),B=A.wedge(origin,inf);T=add(A.scalar(Math.cosh(sigma/2)),scale(B,Math.sinh(sigma/2)));Ti=sub(A.scalar(Math.cosh(sigma/2)),scale(B,Math.sinh(sigma/2)));}
      else {const radius=.5+time;T=sub(origin,scale(inf,radius*radius/2));Ti=scale(T,1/(radius*radius));negate=true;}
      const output=vs.map(v=>scale(A.gp(A.gp(T,A.vector(v)),Ti),negate?-1:1));const input=A.blade(vs),out=output.reduce((r,v)=>A.wedge(r,v),A.scalar());spatialRound(scene,input,A,'u₀',colors.a);spatialRound(scene,out,A,'u₁',colors.result);
      output.forEach((v,i)=>{const q=A.coordinates(v);scene.arrow(q,`p′${i+1}`,colors.result,Z(n),true);const w=q[n-2];if(Math.abs(w)>EPS){const norm=scale(q,1/w);norm[n-1]=0;scene.point(norm,'',colors.result,3);}else scene.label(basis(n,n-1),'Point at infinity',colors.result,{dy:16});});
      this.row('T',this.mv(T));this.row('u₁',this.mv(out));this.row('Null residual max',val(Math.max(...output.map(v=>Math.abs(A.inner(v,v))))));
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
