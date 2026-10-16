import {radiusFor} from './advanced-revisions.js';
import { displacementShading,displacementSurface } from './projective-field.js';
import { roundPointConstruction } from './round-point.js';
import { Algebra, EPS, basis, add, sub, scale, dot, length, unit } from './algebra.js';
import { colors } from './scene.js';
import { embed, affine, perpendicularFrame, cgaProperties, cgaRound, removeInfinity, spatialRound, closestPoint } from './geometry.js';
import { continuousFactors } from './frames.js';
import { V,E,I,S,R,L,GP,AGP } from './content.js';
const zero=n=>Array(n).fill(0),hat=x=>`\\hat{${x}}`,rc=x=>`\\bar{${x}}`,lc=x=>`\\underbar{${x}}`,name=k=>['1','p','l','g','s'][k]||'𝟙';
const check=(key,label,value=false)=>({type:'check',key,label,value});
const select=(key,label,options,value=options[0][0])=>({type:'select',key,label,options,value});
const range=(key,label,min,max,step,value)=>({type:'range',key,label,min,max,step,value});
const fill=(m,spec)=>m.addControl(spec),number=x=>Number(x.toFixed(3));
export const cgaTypes=['cga-dot','cga-join','cga-meet','cga-expansion','cga-property'];
export function configure(m){
  const t=m.def.type,n=m.n;m.frames=new Map();
  if(t==='null'){m.names=['q'];const x=m.vectors[0].slice(0,n-2);x[n-3]=0;m.vectors[0]=embed(x,n);}
  if(t==='trivector'){m.controls=m.controls.filter(x=>!['fix','loci'].includes(x.key));delete m.state.fix;delete m.state.loci;}
  if(t==='antiwedge'||t==='geometric-antiproduct'){m.setVectors(2);m.names=t==='antiwedge'?['ā','b̄']:['ḡ','h̄'];if(t==='geometric-antiproduct'){m.controls=[];m.vectors=[[1.5,.3,...(n===4?[.4]:[]),1],[-.4,1.4,...(n===4?[.7]:[]),1]];fill(m,check('wedgeLocus','Wedge loci'));fill(m,check('dotLocus','Dot loci'));fill(m,check('antidotLoci','Antidot loci'));fill(m,check('complements','Complements',true));}}
  if(t==='complement')m.controls=m.controls.filter(x=>x.key!=='frame');
  if(t==='dual'){m.controls=m.controls.filter(x=>!['frame','dual','scalar'].includes(x.key));const control=m.controls.find(x=>x.key==='grade');control.options=Array.from({length:n-1},(_,i)=>[i+1,name(i+1)]);m.setVectors(1,'point');fill(m,check('homogeneous','Homogeneous blade'));fill(m,check('bulk','Bulk'));fill(m,check('weight','Weight'));}
  if(t==='euclidean-dot'){m.alg=new Algebra(n);m.setVectors(2);fill(m,check('fix','Fix value'));fill(m,check('loci','Dot loci',true));}
  if(t==='projective-product'){m.setVectors(2,'point');m.names=['a','b'];fill(m,check('fix','Fix value'));fill(m,check('wedgeLocus','Wedge loci',true));fill(m,check('dotLocus','Dot loci',true));}
  if(t==='geometric')fill(m,check('fix','Fix value'));
  if(t==='dot'||t==='antidot'){m.controls.find(x=>x.key==='loci').label=t==='dot'?'Dot loci':'Weight loci';m.controls.find(x=>x.key==='decompose').label=t==='dot'?'Bulk':'Weight';m.setVectors(2,'point');m.names=t==='dot'?['a','b']:['p','q'];}
  if(t==='distance'){m.names=['p','q','r','s'];if(n===4)m.controls.find(x=>x.key==='case').options.push([3,'Line – Line']);}
  if(t==='meet')fill(m,{type:'button',key:'parallel',label:'Make parallel'});
  if(t==='flat'&&m.def.grade===2)fill(m,{type:'button',key:'unitLineWeight',label:'Weight norm = 1'});
  if(t==='reflection'||t==='rotation'){fill(m,check('products','Product blades',t==='reflection'));if(t==='rotation')m.state.complements=false;if(t==='reflection')fill(m,select('grade','Object grade',Array.from({length:n},(_,i)=>[i+1,['Vector','Bivector','Trivector','Antiscalar'][i]])));}
  if(t==='attitude'){m.controls.find(x=>x.key==='grade').options=[[1,'Point'],[2,'Line'],...(n===4?[[3,'Plane']]:[])];}
  if(t==='projection'){m.controls=[];fill(m,select('pair','Objects',projectionPairs(n,m.def.variant)));fill(m,check('dual','Dual',true));fill(m,check('intermediate','First product',true));fill(m,check('attached','Attach intermediate blade',true));fill(m,check('homogeneous','Homogeneous blades'));setPair(m);}
  if(t==='interior')fill(m,check('homogeneous','Homogeneous blades'));
  if(t==='angle'){m.setVectors(4,'point');fill(m,select('pair','Objects',n===3?[['2:2','Line / Line']]:[['2:2','Line / Line'],['3:3','Plane / Plane'],['3:2','Plane / Line']]));fill(m,check('bulkDual','Bulk dual'));fill(m,check('weightDual','Weight dual'));fill(m,check('angleProducts','Antiwedge products'));setPair(m);}
  if(t==='parametric'){m.setVectors(2,'point');m.names=['q','r'];fill(m,select('grade','Object',[[2,'Line'],...(n===4?[[3,'Plane']]:[])]));fill(m,range('parameter','λ',-2,2,.025,0));if(n===4)fill(m,range('parameter2','μ',-2,2,.025,0));}
  if(t==='projective'||t==='isometry'){m.controls=m.controls.filter(x=>!['loci','complements'].includes(x.key));m.vectors[0]=[1.1,-.2,...(n===4?[.4]:[]),1];fill(m,select('grade','Object grade',Array.from({length:n-1},(_,i)=>[i+1,['Point','Line','Plane'][i]])));m.controls.find(x=>x.key==='orbit').label=t==='projective'?'Equal-displacement surface':'Equal-distance surfaces';if(t==='projective')fill(m,check('shading','Invariant shading',true));}
  if(t==='motor'){m.controls.find(c=>c.key==='count').options.unshift([1,'1 · Flector']);fill(m,select('preset','Preset',[['custom','Custom reflections'],['translation','Translation'],['rotation','Rotation'],['inversion','Point inversion'],['reflection','Reflection']]));}
  if(m.cga){if(m.state.mesh!==undefined)m.state.mesh=true;if(m.state.radius!==undefined)m.state.radius=false;}
  if(t==='roundpoint'){m.names=['a'];for(const spec of [check('carrierLine','Line through a and infinity',true),check('tangent','Tangent plane'),check('parallelPlane','Parallel plane through a',true),check('section','Horosphere section',true),check('spatial','u = 0 projection',true)])fill(m,spec);m.state.radius=true;}
  if(t==='round'||t==='roundpoint'){m.controls=m.controls.filter(c=>!['carrier','cocarrier','container','dual','partner','attitude','conjugate',...(t==='roundpoint'?['homogeneous']:[])].includes(c.key));for(const key of ['carrier','cocarrier','container','dual','partner','attitude','conjugate'])m.state[key]=false;}
  if(t==='cga-property'){m.controls=[];m.setVectors(2,'null');if(['carrier','cocarrier'].includes(m.def.property)){fill(m,check('embeddedProperty','Horosphere representation',true));fill(m,check('propertyBlade','Homogeneous property blade'));}fill(m,select('grade','Object',Array.from({length:n-1},(_,i)=>[i+1,roundName(i+1,n)]),2));fill(m,check('mesh','Null cone / Horosphere',true));fill(m,check('homogeneous','Homogeneous blade'));m.state[m.def.property]=true;}
  if(t==='containment'){m.controls=[];m.names[0]='p₀';fill(m,select('grade','Object',Array.from({length:n-2},(_,i)=>[i+2,roundName(i+2,n)]),n-1));fill(m,check('flat','Make object flat'));fill(m,{type:'button',key:'contained',label:'Put p₀ on the object'});fill(m,check('dual','Antidual'));}
  if(t==='round'&&m.def.grade===4)m.names=['p','q','r','t'];
  if(cgaTypes.includes(t)&&t!=='cga-property'){m.controls=[];fill(m,check('mesh','Null cone / Horosphere',true));if(t==='cga-dot'){m.setVectors(2,'null');m.names=['a','b'];fill(m,range('radiusA','Radius² · a',-2,2,.025,0));fill(m,range('radiusB','Radius² · b',-2,2,.025,0));}
    else{fill(m,select('pair','Objects',cgaPairs(n,t)));fill(m,check('flatA','Make first object flat'));fill(m,check('flatB','Make second object flat'));fill(m,check('spatial','u = 0 geometry',true));if(t==='cga-expansion')fill(m,check('dual','Antidual',true));fill(m,check('homogeneous','Homogeneous blades'));setPair(m);}}
  if(m.alg.kind==='rigid'){fill(m,check('lockWeight',`Keep on unit slice (${n===3?'z':'w'} = 1)`,true));for(let i=0;i<m.vectors.length;i++)if(Math.abs(m.vectors[i][n-1])>EPS)m.vectors[i]=scale(m.vectors[i],1/m.vectors[i][n-1]);}
}
function projectionPairs(n,variant){const anti=variant>=2;return (n===3?(anti?[[2,1]]:[[1,2]]):anti?[[3,1],[2,1],[3,2]]:[[1,3],[1,2],[2,3]]).map(([a,b])=>[`${a}:${b}`,`${name(a)} → ${name(b)}`]);}
function cgaPairs(n,t){let pairs=t==='cga-join'?[[1,1],[1,2],...(n===5?[[1,3],[2,2]]:[])]:t==='cga-meet'?(n===4?[[3,3],[3,2]]:[[4,4],[4,3],[3,3],[4,2]]):(n===4?[[1,2],[1,3],[2,3]]:[[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]);return pairs.map(([a,b])=>[`${a}:${b}`,`${roundName(a,n)} / ${roundName(b,n)}`]);}
const roundName=(k,n)=>k===1?'Round point':k===2?'Dipole':k===3?'Circle':'Sphere';
function roundSeed(m,k,side){if(side&&m.def.type==='cga-meet'&&k===2){const center=[-.25,.4,...Array(m.n-4).fill(0)];return [-1,1].map(a=>embed(add(center,basis(m.n-2,1,a*.8)),m.n));}const x=Array(m.n-2).fill(0);x[0]=side? .7:-.7;if(side)x[1]=.35;if(k===1)x[1]=.45;if(side&&m.n===5)x[2]=.35;const r=side?1.1:1;if(k===1)return [embed(x,m.n)];if(k===2)return [-1,1].map(s=>embed(add(x,basis(m.n-2,side?1:0,s*r)),m.n));if(k===3)return [0,2*Math.PI/3,4*Math.PI/3].map(t=>{const p=[...x];p[0]+=r*Math.cos(t);p[side&&m.n===5?2:1]+=r*Math.sin(t);return embed(p,m.n);});return m.roundSeeds(x,r);}
function setPair(m){m.grades=String(m.state.pair).split(':').map(Number);const [a,b]=m.grades;if(m.cga){m.vectors=[...roundSeed(m,a,0),...roundSeed(m,b,1)];const labels=['p','q','r','t'];m.names=[...labels.slice(0,a).map(x=>x+'₁'),...labels.slice(0,b).map(x=>x+'₂')];}else{m.setVectors(a+b,'point');m.names=m.vectors.map((_,i)=>['p','q','r','s','t','v','w','k'][i]);if(m.def.type==='projection'){let next=0;const letters=a===1||b===1?['q','r','s','t','v']:['p','q','r','s','t'];m.names=m.grades.flatMap(k=>k===1?['p']:Array.from({length:k},()=>letters[next++]));}}m.frames?.clear();}
export function update(m,key,value){
  const t=m.def.type,n=m.n,h=n-1;
  if(key==='infinity')m.state.lockWeight=false;
  if(key==='flat'&&t==='round'&&m.def.grade===2)m.names[0]=value?'p₀':'p';
  if(key==='operation'&&t==='interior'){m.state.operation=value;m.names=+value>=2?['q','r','s']:['p','q','r'];return true;}
  if(key==='grade'&&['cga-property','containment'].includes(t)){m.state.grade=+value;m.vectors=[...(t==='containment'?[embed([-.4,.6,...(n===5?[.3]:[])],n)]:[]),...roundSeed(m,+value,0)];m.names=m.vectors.map((_,i)=>['p','q','r','t','v'][i]);if(t==='containment')m.names[0]='p₀';return true;}
  if(key==='unitLineWeight'){const p=affine(m.vectors[0]),q=affine(m.vectors[1]);if(p&&q&&length(sub(q,p))>EPS){const c=scale(add(p,q),.5),d=scale(unit(sub(q,p)),.5);m.vectors=[sub(c,d),add(c,d)];}return true;}
  if(key==='parallel'){const first=m.vectors.slice(0,n-1).map(affine);if(first.every(Boolean)){const directions=[];for(const p of first.slice(1)){let d=sub(p,first[0]);for(const f of directions)d=sub(d,scale(f,dot(d,f)));if(length(d)>EPS)directions.push(unit(d));}let shift;for(let j=0;j<h;j++){let d=basis(n,j);for(const f of directions)d=sub(d,scale(f,dot(d,f)));if(length(d)>EPS){shift=scale(unit(d),.8);break;}}if(shift)for(let i=0;i<(n===4&&+m.state.case===1?2:n-1);i++)m.vectors[n-1+i]=add(first[i],shift);}return true;}
  if(key==='grade'&&['reflection','rotation','projective','isometry'].includes(t)){const offset=t==='rotation'?2:1,old=m.vectors.slice(0,offset);m.state.grade=+value;m.setVectors(offset+(+value),m.alg.kind==='rigid'?'point':'vector');old.forEach((v,i)=>m.vectors[i]=v);m.names=[...(t==='rotation'?['a','b']:['a']),...['v₀','w₀','u₀','t₀'].slice(0,+value)];m.frames.clear();return true;}
  if(key==='grade'&&t==='parametric'){m.state.grade=+value;m.setVectors(+value,'point');m.names=['q','r','s'].slice(0,+value);m.frames.clear();return true;}
  if(key==='preset'){m.state.preset=value;const p=m.vectors[0],count=value==='reflection'?1:value==='inversion'?h:2;m.state.count=count;m.setVectors(count+1);m.vectors[0]=p;m.names=['v₀',...Array.from({length:count},(_,i)=>String.fromCharCode(97+i))];for(let i=1;i<=count;i++){m.vectors[i]=basis(n,value==='inversion'?i-1:0);m.vectors[i][h]=value==='translation'?(i===1?.2:-.5):value==='rotation'?0:value==='reflection'?.4:0;}if(value==='rotation')m.vectors[2]=add(basis(n,0,Math.cos(.6)),basis(n,1,Math.sin(.6)));return true;}
  if(key==='pair'){m.state[key]=value;setPair(m);return true;}
  if(key==='grade'&&m.def.type==='dual'){m.state.grade=value;m.setVectors(+value,'point');m.frames.clear();return true;}
  if(key==='unitWeight'||key==='lockWeight'){m.state[key]=value;if(value)for(let i=0;i<m.vectors.length;i++){const v=m.vectors[i],h=v[m.n-1];if(Math.abs(h)>EPS)m.vectors[i]=scale(v,1/h);}return true;}
  if(key==='radiusA'||key==='radiusB'){m.state[key]=value;const i=key==='radiusA'?0:1;m.vectors[i]=embed(m.vectors[i].slice(0,m.n-2),m.n,value);return true;}
  if(key==='grade')m.frames.clear();return false;
}
export function activeInputs(m){const t=m.def.type;if(t==='distance')return Array.from({length:+m.state.case===3?4:+m.state.case+2},(_,i)=>i);if(t==='join')return Array.from({length:+m.state.case===1?3:2},(_,i)=>i);if(t==='meet'&&m.n===4&&+m.state.case===1)return [0,1,2,3,4];if(['complement','dual'].includes(t)&&[0,m.n].includes(+m.state.grade))return [];const indices=m.vectors.map((_,i)=>i);if(['round','containment'].includes(t)&&m.state.flat)return indices.slice(0,-1);if(m.cga&&m.grades&&!m.state.pointOnly)return indices.filter(i=>!(m.state.flatA&&m.grades[0]>1&&i===m.grades[0]-1)&&!(m.state.flatB&&m.grades[1]>1&&i===m.vectors.length-1));return indices;}
export function dragSpace(m,i){
  const n=m.n,t=m.def.type,h=n-1;
  if(m.state.fix&&['geometric','projective-product'].includes(t))return [];
  if(m.cga&&t==='conformal-transform'&&i>=+m.state.objectGrade)return Array.from({length:n},(_,j)=>basis(n,j));
  if(m.cga&&t!=='roundpoint')return Array.from({length:n},(_,j)=>j).filter(j=>t!=='null'||j!==n-3).map(j=>basis(n,j));
  let frame=Array.from({length:n},(_,j)=>basis(n,j));
  if(m.state.fix){if(t==='wedge')frame=[unit(m.vectors[1-i])];
    if(['dot','euclidean-dot','projective-product'].includes(t)){const normal=[...m.vectors[1-i]];if(t!=='euclidean-dot')normal[h]=0;frame=perpendicularFrame(normal);}
    if(t==='antidot')frame=frame.filter(v=>!v[h]);}
  if(m.state.lockWeight)frame=restrict(frame,h);return frame;
}
function restrict(frame,index){const row=frame.map(v=>v[index]);if(length(row)<EPS)return frame;const coefficientSpace=perpendicularFrame(row);return coefficientSpace.map(coefs=>frame.reduce((s,v,i)=>add(s,scale(v,coefs[i])),zero(frame[0].length)));}
export function move(m,i,next){
  const t=m.def.type,n=m.n,old=m.vectors[i];if(!old)return true;
  if(m.state.fix||m.state.lockWeight){const space=dragSpace(m,i),delta=sub(next,old);next=add(old,space.reduce((s,v)=>add(s,scale(v,dot(v,delta)/(dot(v,v)||1))),zero(n)));}
  if(m.cga&&t!=='roundpoint'&&!(t==='conformal-transform'&&i>=+m.state.objectGrade)){const x=next.slice(0,n-2);if(t==='null')x[n-3]=0;next=embed(x,n,t==='cga-dot'?m.state[i===0?'radiusA':'radiusB']:radiusFor(m,i));}
  if(m.state.unitWeight&&Math.abs(next[n-1])>EPS)next=scale(next,1/next[n-1]);m.vectors[i]=next;
  if(t==='roundpoint'){const w=next[n-2];if(Math.abs(w)>EPS)m.state.radius2=-m.alg.inner(m.alg.vector(next),m.alg.vector(next))/(w*w);}
  return true;
}
function inputs(m,scene,indices=activeInputs(m),labels=null){for(const i of indices){scene.handle(m.vectors[i],labels?.[i]??m.names[i],i,m.grades?(i<m.grades[0]?colors.a:colors.b):[colors.a,colors.b,colors.c][i%3],null,false,dragSpace(m,i));if(m.cga&&m.def.type!=='roundpoint')scene.handles.at(-1).retract=surfaceRetraction(m,i);}}
export function surfaceRetraction(m,i){return v=>{const n=m.n,w=v[n-2],old=m.vectors[i],radius=m.def.type==='cga-dot'?m.state[i===0?'radiusA':'radiusB']:radiusFor(m,i);if(Math.abs(w)<1e-5)return old;const x=v.slice(0,n-2).map(x=>x/w);if(m.def.type==='null')x[n-3]=0;return embed(x,n,radius);};}
function flat(scene,m,a,label,color,homogeneous=false){const unit=Math.abs(m.alg.weightNorm(a)-1)<1e-7,k=m.alg.gradeOf(a),coords=k===1?m.alg.coordinates(a):null,duplicate=unit&&coords&&scene.labels.some(x=>x.text===label&&length(sub(x.p,coords))<1e-7);scene.flat(a,m.alg,duplicate?'':unit?label:hat(label),color);if(homogeneous&&k>1){const fs=sourceFactors(m,a);if(fs)scene.blade(fs,label,{color,alpha:.1});else scene.element(a,m.alg,label,{color,alpha:.1});}}
function sourceFactors(m,a){const k=m.alg.gradeOf(a);if(k<2)return null;for(let i=0;i<=m.vectors.length-k;i++){const fs=m.vectors.slice(i,i+k),b=m.alg.blade(fs);if(length(sub(a,b))<1e-7)return fs;}return null;}
function pair(m){const [a,b]=m.grades;return {a:m.alg.blade(m.vectors.slice(0,a)),b:m.alg.blade(m.vectors.slice(a,a+b)),aName:name(a),bName:a===b?({1:'q',2:'k',3:'h',4:'t'}[b]):name(b)};}
function balanced(m,a,key){const f=continuousFactors(a,m.alg,m.frames.get(key));m.frames.set(key,f);return f;}
export function paint(m,scene){
  const t=m.def.type,A=m.alg,n=m.n,s=m.state,vs=m.vectors,vec=i=>A.vector(vs[i]);
  const handled=['complement','antiwedge','geometric-antiproduct','euclidean-dot','dot','antidot','geometric','projective-product','reflection','rotation','flat','attitude','join','meet','distance','dual','interior','projection','angle','parametric','projective','isometry','roundpoint','round','cga-property','containment','cga-dot','cga-join','cga-meet','cga-expansion'].includes(t);
  if(!handled)return false;m.rows=[];m.formula=m.def.formula;m.status='';scene.isCGA=m.cga;scene.sliceLabels=t==='flat';if(A.kind==='rigid')scene.sliceMesh();if(m.cga&&(s.mesh||['containment'].includes(t)))scene.cgaMesh();
  if(t==='complement'){
    const grade=+s.grade,u=m.genericSource(),right=A.rc(u),names=Array.from({length:n},(_,i)=>String.fromCharCode(97+i)),sourceNames=names.slice(0,grade),complementNames=names.slice(grade);let fs=balanced(m,right,'complement');const sign=s.side==='left'&&grade*(n-grade)%2?-1:1;fs=fs.map(v=>scale(v,sign));
    const scalar=number(+s.scalar),sourceLabel=`u = ${grade===0?`${scalar} · 1`:grade===n?`${scalar} · 𝟙`:sourceNames.join(' ∧ ')}`,outLabel=`${s.side==='left'?lc('u'):rc('u')} = ${complementNames.length?complementNames.join(' ∧ '):`${scalar} · 1`}`;
    if(grade>0&&grade<n){inputs(m,scene,activeInputs(m),grade===1?[sourceLabel]:sourceNames);if(grade>1)scene.blade(vs.slice(0,grade),sourceLabel,{color:colors.a});}else scene.element(u,A,sourceLabel);
    if(fs.length){scene.blade(fs,outLabel,{dashed:true,color:colors.b,alpha:.11});for(let j=0;j<fs.length;j++){if(fs.length>1)scene.handle(fs[j],complementNames[j],`complement-${j}`,colors.b,next=>m.frames.set('complement',rotateFrame(m.frames.get('complement'),j,scale(next,sign))),true);}}
    else scene.element(A.complement(u,s.side),A,outLabel,{color:colors.b});
    const source=grade===n?balanced(m,u,'source-top'):vs.slice(0,grade),ordered=s.side==='right'?[...source,...fs]:[...fs,...source];for(let i=1;i<ordered.length;i++)scene.line(ordered[i-1],ordered[i],colors.mesh,1,true);
    m.row(sourceLabel,m.mv(u));m.row(outLabel,m.mv(A.complement(u,s.side)));return true;
  }
  if(t==='antiwedge'||t==='geometric-antiproduct'){
    const x=A.lc(vec(0)),y=A.lc(vec(1)),wx=A.rc(x),wy=A.rc(y),out=t==='antiwedge'?A.antiwedge(x,y):A.agp(x,y),xn=t==='antiwedge'?'a':'g',yn=t==='antiwedge'?'b':'h';if(s.complements!==false)inputs(m,scene,[0,1],[rc(xn),rc(yn)]);
    if(s.inputs!==false){scene.element(x,A,xn,{color:colors.a,alpha:.13});scene.element(y,A,yn,{color:colors.b,alpha:.13});scene.locusPlane(zero(n),vs[0],colors.a);scene.locusPlane(zero(n),vs[1],colors.b);}
    const w=A.wedge(wx,wy);if(s.intermediate!==false)scene.blade(vs.slice(0,2),`${rc(xn)} ∧ ${rc(yn)}`,{dashed:true,color:colors.purple,alpha:.09});if(s.result!==false)scene.element(t==='antiwedge'?out:A.grade(out,n-2),A,`${xn} ${t==='antiwedge'?'∨':'⟇'} ${yn}`,{color:colors.result});
    if(t==='geometric-antiproduct'){
      const xf=balanced(m,x,'anti-g'),yf=balanced(m,y,'anti-h');
      // The angle between complementary hyperplanes equals the angle of their normals, rotated into the hyperplanes.
      const normals=vs.map(v=>v.map((x,i)=>i===n-1?0:x)),u=unit(normals[0]),v=unit(sub(normals[1],scale(u,dot(normals[1],u))));if(length(v)>EPS){const rotate=q=>add(scale(v,dot(q,u)),scale(u,-dot(q,v)));scene.angle(rotate(normals[0]),rotate(normals[1]));}
      if(s.wedgeLocus)scene.locusLine(vs[1],vs[0],colors.a);
      if(s.dotLocus){const normal=A.coordinates(A.metricMap(vec(0)));scene.locusPlane(scale(normal,dot(vs[1],normal)/(dot(normal,normal)||1)),normal,colors.purple);}
      if(s.antidotLoci)for(const f of yf)scene.locusPlane(basis(n,n-1,f[n-1]),basis(n,n-1),colors.b);
    }
    if(A.kind==='rigid'){flat(scene,m,x,xn,colors.a);flat(scene,m,y,yn,colors.b);flat(scene,m,A.grade(out,n-2),`${xn} ∨ ${yn}`,colors.result);}
    m.row(`${xn} ${t==='antiwedge'?'∨':'⟇'} ${yn}`,m.mv(out));return true;
  }
  if(['euclidean-dot','dot','antidot','geometric','projective-product'].includes(t)){
    inputs(m,scene);const isDot=t==='dot'||t==='euclidean-dot',anti=t==='antidot',gp=t==='geometric'||t==='projective-product',normals=vs.map(v=>t==='geometric'||t==='euclidean-dot'?v:v.map((x,i)=>i===n-1?0:x));
    if(s.loci||s.dotLocus)for(let i=0;i<2;i++){const normal=anti?basis(n,n-1):normals[1-i],center=scale(normal,dot(vs[i],normal)/(dot(normal,normal)||1));scene.locusPlane(center,normal,[colors.a,colors.b][i]);}
    if(gp){if(s.wedgeLocus)for(let i=0;i<2;i++)scene.locusLine(vs[i],vs[1-i],[colors.a,colors.b][i]);scene.blade(vs,'a ⟑ b',{color:colors.result});scene.angle(normals[0],normals[1]);m.row('a ⟑ b',m.mv(A.gp(vec(0),vec(1))));}
    else m.row(anti?'p ∘ q':t==='euclidean-dot'?'a · b':'a • b',`${number(anti?A.antiInner(vec(0),vec(1)):A.inner(vec(0),vec(1)))} ${anti?'𝟙':'1'}`);
    if(anti)m.formula=`${V('p')} ∘ ${V('q')} = (${V('p')}<sup>T</sup>𝔾${V('q')})${I}`;
    if(t==='dot')m.formula=`${V('a')} • ${V('b')} = (${V('a')}<sup>T</sup>G${V('b')})${S}`;
    if(A.kind==='rigid'){for(let i=0;i<2;i++)flat(scene,m,vec(i),m.names[i],[colors.a,colors.b][i]);if(s.decompose)for(let i=0;i<2;i++)scene.element(anti?A.weight(vec(i)):A.bulk(vec(i)),A,`${m.names[i]}_${anti?'{○}':'{●}'}`,{color:[colors.a,colors.b][i],dashed:true});}
    if(gp&&t==='geometric')m.row('a⁻¹',length(vs[0])>EPS?m.mv(scale(vec(0),1/dot(vs[0],vs[0]))):'Undefined');return true;
  }
  if(t==='reflection'||t==='rotation'){
    inputs(m,scene);const i=t==='reflection'?1:2,v0=vec(i),neg=A.reflect(v0,vec(0));if(!neg){m.status='a⁻¹ undefined';return true;}const v1=scale(neg,-1),p1=A.coordinates(v1);scene.arrow(p1,'v₁',colors.result);scene.line(vs[i],p1,colors.mesh,1,true);
    if(s.products){scene.blade([vs[0],vs[i]],'a ⟑ v₀',{color:colors.a,alpha:.1});scene.blade([p1,vs[0]],'v₁ ⟑ a = a ⟑ v₀',{color:colors.result,alpha:.1});scene.angle(vs[0],vs[i]);}
    if(t==='reflection'){scene.arrow(scale(p1,-1),'−v₁',colors.purple);scene.line(vs[i],scale(p1,-1),colors.mesh,1,true);}
    else{scene.arrow(scale(p1,-1),'−v₁',colors.mesh);scene.line(vs[i],scale(p1,-1),colors.mesh,1,true);const q=A.reflect(v1,vec(1));if(!q){m.status='b⁻¹ undefined';return true;}const v2=scale(q,-1);scene.arrow(A.coordinates(v2),'v₂',colors.purple);scene.line(p1,A.coordinates(v2),colors.mesh,1,true);if(s.products){scene.blade([vs[1],p1],'b ⟑ v₁',{color:colors.b,alpha:.08});scene.blade([A.coordinates(v2),vs[1]],'v₂ ⟑ b = b ⟑ v₁',{color:colors.purple,alpha:.08});scene.angle(vs[1],p1);}scene.element(A.rc(A.blade(vs.slice(0,2))),A,'',{color:colors.purple,dashed:true,alpha:.04});rotationArc(scene,vs[0],vs[1],vs[i]);m.row('v₂',m.mv(v2));}
    if(+s.grade>1){const source=vs.slice(i),first=source.map(v=>A.coordinates(scale(A.reflect(A.vector(v),vec(0)),-1))),last=t==='rotation'?first.map(v=>A.coordinates(scale(A.reflect(A.vector(v),vec(1)),-1))):first;scene.blade(source,source.map((_,j)=>['v₀','w₀','u₀','t₀'][j]).join(' ∧ '),{alpha:.1,color:colors.a});scene.blade(last,source.map((_,j)=>['v','w','u','t'][j]+(t==='rotation'?'₂':'₁')).join(' ∧ '),{alpha:.14,color:colors.result});m.formula=t==='reflection'?`${V('B₁')} = ${V('a')} ${GP} ${V('B₀')} ${GP} ${V('a')}<sup>−1</sup>`:`${V('B₂')} = ${V('b')} ${GP} ${V('a')} ${GP} ${V('B₀')} ${GP} ${V('a')}<sup>−1</sup> ${GP} ${V('b')}<sup>−1</sup>`;m.row('B₀',m.mv(A.blade(source)));m.row(t==='rotation'?'B₂':'B₁',m.mv(A.blade(last)));}
    if(s.complements){scene.element(A.rc(vec(0)),A,rc('a'),{color:colors.a,dashed:true,alpha:.05});if(t==='rotation')scene.element(A.rc(vec(1)),A,rc('b'),{color:colors.b,dashed:true,alpha:.05});}m.row('v₁',m.mv(v1));return true;
  }
  return paintFlat(m,scene)||paintConformal(m,scene);
}
function rotationArc(scene,a,b,v){const x=unit(a),y=unit(sub(b,scale(x,dot(b,x))));if(length(y)<EPS)return;const theta=2*Math.atan2(dot(b,y),dot(b,x)),vx=dot(v,x),vy=dot(v,y),center=sub(v,add(scale(x,vx),scale(y,vy)));let previous=v;for(let j=1;j<=48;j++){const t=theta*j/48,p=add(center,add(scale(x,vx*Math.cos(t)-vy*Math.sin(t)),scale(y,vx*Math.sin(t)+vy*Math.cos(t))));scene.line(previous,p,colors.purple,1,true);previous=p;}scene.commands.at(-1).kind='arrow';}
function rotateFrame(frame,index,next){if(!frame?.length)return frame;const u=unit(frame[index]),projected=frame.reduce((s,f)=>add(s,scale(unit(f),dot(unit(f),next))),zero(next.length)),target=unit(projected);if(length(projected)<EPS)return frame;const cosine=Math.max(-1,Math.min(1,dot(u,target)));let v=sub(target,scale(u,cosine));if(length(v)<EPS){if(cosine>0)return frame;v=unit(frame[(index+1)%frame.length]);}else v=unit(v);const sine=Math.sqrt(Math.max(0,1-cosine*cosine));return frame.map(f=>{const x=dot(f,u),y=dot(f,v);return add(f,add(scale(u,(cosine-1)*x-sine*y),scale(v,sine*x+(cosine-1)*y)));});}
function paintFlat(m,scene){
  const t=m.def.type,A=m.alg,n=m.n,h=n-1,s=m.state,vs=m.vectors,vec=i=>A.vector(vs[i]);
  if(t==='flat'||t==='attitude'){
    const k=+(s.grade??m.def.grade),u=A.blade(vs.slice(0,k)),label=name(k);inputs(m,scene);flat(scene,m,u,label,colors.result,s.homogeneous);
    for(const v of vs){scene.locusLine(zero(n),v,colors.mesh);const q=affine(v);if(q)scene.point(q,'',colors.a,4);}
    const finite=vs.slice(0,k).map(affine).filter(Boolean);if(k===2&&finite.length===2)scene.line(finite[0],finite[1],colors.result,3.3);if(k===3&&finite.length===3)scene.poly(finite,colors.result,.12);
    const bulk=A.bulk(u),weight=A.weight(u);
    if(s.decompose){
      if(k===2&&length(weight)>EPS){const d=zero(n);for(let i=0;i<h;i++)d[i]=-weight[(1<<i)|(1<<h)];const wn=length(d),support=closestPoint(basis(n,h),u,A);if(support){support[h]=0;scene.blade([scale(unit(d),-1),scale(support,wn)],`${label}_{●}: moment`,{dashed:true,color:colors.a,alpha:.12});}scene.blade([basis(n,h),d],`${label}_{○}: direction`,{dashed:true,color:colors.purple,alpha:.12});}
      else{scene.element(bulk,A,`${label}_{●}: ${k===1?'position':'position'}`,{dashed:true,color:colors.a});scene.element(weight,A,`${label}_{○}: ${k===1?'weight':'normal'}`,{dashed:true,color:colors.purple});if(k===1){const arrow=scene.commands.findLast(x=>x.kind==='arrow'&&x.color===colors.purple);if(arrow)arrow.width=3.6;}}
      scene.flat(bulk,A,hat(`${label}_{●}`),colors.a);
    }
    if(t==='attitude'){const att=A.attitude(u);scene.element(att,A,`att(${label})`,{color:colors.warm,dashed:true});if(k>1)scene.flat(att,A,hat(`att(${label})`),colors.warm);m.formula=`att(${V(label)}) = ${V(label)} ∨ <span class="right-complement">${E(n)}</span>`;m.row(`att(${label})`,m.mv(att));}
    m.row(label,m.mv(u));m.row(`${label}● · bulk: ${k===1?'position':'moment'}`,m.mv(bulk));m.row(`${label}○ · weight: ${k===1?'homogeneous weight':'direction'}`,m.mv(weight));return true;
  }
  if(t==='join'||t==='meet'){
    inputs(m,scene);let x,y,xn,yn,op;
    if(t==='join'){x=vec(0);xn='p';y=+s.case===1&&n===4?A.blade(vs.slice(1,3)):vec(1);yn=+s.case===1&&n===4?'l':'q';op='∧';}
    else{x=A.blade(vs.slice(0,n-1));xn=n===3?'l':'g';const k=n===4&&+s.case===1?2:n-1;y=A.blade(vs.slice(n-1,n-1+k));yn=k===2?(n===3?'k':'l'):'h';op='∨';}
    const out=op==='∧'?A.wedge(x,y):A.antiwedge(x,y),expr=`${xn} ${op} ${yn}`;flat(scene,m,x,xn,colors.a,s.homogeneous);flat(scene,m,y,yn,colors.b,s.homogeneous);flat(scene,m,out,expr,colors.result,s.homogeneous);m.formula=`${V(xn)} ${op} ${V(yn)}`;m.row(expr,m.mv(out));return true;
  }
  if(t==='distance'){
    inputs(m,scene);const lines=+s.case===3,k=lines?2:+s.case+1,x=lines?A.blade(vs.slice(0,2)):vec(0),y=A.blade(vs.slice(lines?2:1,lines?4:k+1)),xn=lines?'l':'p',yn=lines?'k':k===1?'q':name(k),attx=A.attitude(x),atty=A.attitude(y),attjoin=A.attitude(A.wedge(x,y));flat(scene,m,x,xn,colors.a,s.homogeneous);flat(scene,m,y,yn,colors.b,s.homogeneous);
    let p=affine(vs[0]),q=k===1?affine(vs[1]):lines?null:closestPoint(vs[0],y,A);
    if(lines&&vs.every(v=>affine(v))){const a=affine(vs[0]),b=affine(vs[2]),d=sub(affine(vs[1]),a),e=sub(affine(vs[3]),b),r=sub(a,b),aa=dot(d,d),bb=dot(d,e),cc=dot(e,e),dd=dot(d,r),ee=dot(e,r),den=aa*cc-bb*bb;if(den>EPS){const t=(bb*ee-cc*dd)/den,u=(aa*ee-bb*dd)/den;p=add(a,scale(d,t));q=add(b,scale(e,u));}else{p=a;q=closestPoint(a,y,A);}}
    if(p&&q){scene.line(p,q,colors.warm,2,true);if(k>1){scene.point(p,'',colors.a);scene.point(q,'',colors.b);}scene.label(scale(add(p,q),.5),'d',colors.warm,{dy:-10,scalar:true});}
    const xFactors=balanced(m,attx,'distance-x'),yFactors=balanced(m,atty,'distance-y');if(xFactors.length)scene.blade(xFactors,`att(${xn})`,{color:colors.a,dashed:true});else scene.element(attx,A,`att(${xn})`,{color:colors.a,dashed:true});if(yFactors.length)scene.blade(yFactors,`att(${yn})`,{color:colors.b,dashed:true});else scene.element(atty,A,`att(${yn})`,{color:colors.b,dashed:true});
    const factors=[...(lines?xFactors:[]),...yFactors,...(p&&q?[sub(q,p)]:[])],candidate=factors.length?A.blade(factors):A.scalar(0),denCandidate=dot(candidate,candidate);
    if(factors.length===A.gradeOf(attjoin)&&denCandidate>EPS){factors[factors.length-1]=scale(factors.at(-1),dot(candidate,attjoin)/denCandidate);scene.blade(factors,`att(${xn} ∧ ${yn})`,{color:colors.warm,dashed:true});}else scene.element(attjoin,A,`att(${xn} ∧ ${yn})`,{color:colors.warm,dashed:true});
    const numerator=A.bulkNorm(attjoin),denominator=A.bulkNorm(A.wedge(attx,atty)),w=A.weightNorm(A.wedge(x,atty));m.formula=`d(${V(xn)}, ${V(yn)}) = ‖att(${V(xn)} ∧ ${V(yn)})‖<sub>●</sub> / ‖att(${V(xn)}) ∧ att(${V(yn)})‖<sub>●</sub>`;m.row('Homogeneous distance',`${number(numerator)} 1 + ${number(w)} 𝟙`);m.row('Distance',denominator>EPS?number(numerator/denominator):p&&q?`${number(length(sub(p,q)))} · degenerate ratio`:'Undefined');return true;
  }
  if(t==='dual'){
    const k=+s.grade,label=name(k),u=A.blade(vs.slice(0,k));inputs(m,scene);flat(scene,m,u,label,colors.a,s.homogeneous);
    for(const [key,symbol,color] of [['bulk','●',colors.a],['weight','○',colors.b]])if(s[key]){const part=key==='bulk'?A.bulk(u):A.weight(u);scene.element(part,A,`${label}_{${symbol}}`,{color,dashed:true});scene.flat(part,A,hat(`${label}_{${symbol}}`),color);}
    for(const [weight,symbol,color] of [[false,'★',colors.purple],[true,'☆',colors.result]]){const dual=A.dual(u,weight,s.side),expr=`${label}${s.side==='right'?'^':'_'}{${symbol}}`;scene.element(dual,A,expr,{color,dashed:true,alpha:.12});scene.flat(dual,A,hat(expr),color);m.row(expr,m.mv(dual));}
    m.formula=`${V(label)}${s.side==='right'?'<sup>★</sup>':'<sub>★</sub>'} = ${s.side==='right'?R(`${label}●`):L(`${label}●`)}　　${V(label)}${s.side==='right'?'<sup>☆</sup>':'<sub>☆</sub>'} = ${s.side==='right'?R(`${label}○`):L(`${label}○`)}`;return true;
  }
  if(t==='interior'){
    const op=+s.operation,anti=op>=2;inputs(m,scene,activeInputs(m),anti?['q','r','s']:['p','q','r']);const weight=op%2===1,x=anti?A.blade(vs.slice(0,2)):vec(0),y=anti?vec(2):A.blade(vs.slice(1,3)),xn=anti?'l':'p',yn=anti?'s':'l',d=A.dual(y,weight),symbol=weight?'☆':'★',expr=`${xn} ${anti?'∨':'∧'} ${yn}^{${symbol}}`,out=anti?A.antiwedge(x,d):A.wedge(x,d);
    flat(scene,m,x,xn,colors.a,s.homogeneous);flat(scene,m,y,yn,colors.b,s.homogeneous);scene.element(d,A,`${yn}^{${symbol}}`,{color:colors.purple,dashed:true});scene.flat(d,A,hat(`${yn}^{${symbol}}`),colors.purple);flat(scene,m,out,expr,colors.result,true);m.formula=`${V(name(A.gradeOf(out)))} = ${V(xn)} ${anti?'∨':'∧'} ${V(yn)}<sup>${symbol}</sup>`;m.row(expr,m.mv(out));return true;
  }
  if(t==='projection'){
    inputs(m,scene);const {a:x,b:y,aName:xn,bName:yn}=pair(m),central=m.def.variant%2===1,anti=m.def.variant>=2,{dual,intermediate,result}=A.project(x,y,{central,anti}),symbol=central?'★':'☆',du=`${yn}^{${symbol}}`,first=`${xn} ${anti?'∨':'∧'} ${du}`,expr=`${yn} ${anti?'∧':'∨'} (${first})`;
    flat(scene,m,x,xn,colors.a,s.homogeneous);flat(scene,m,y,yn,colors.b,s.homogeneous);if(s.dual){scene.element(dual,A,du,{dashed:true,color:colors.purple,alpha:.12});scene.flat(dual,A,hat(du),colors.purple);}if(s.intermediate)flat(scene,m,intermediate,first,colors.purple,s.homogeneous);flat(scene,m,result,expr,colors.result,s.homogeneous);
    if(s.attached&&!anti){const xf=balanced(m,x,'attached-source'),df=balanced(m,dual,'attached-dual');if(xf.length&&df.length&&xf.length+df.length<=n)scene.blade([...xf,...df],'',{color:colors.purple,alpha:.08});}
    if(!anti&&A.gradeOf(x)===1){const p=affine(A.coordinates(x)),q=affine(A.coordinates(result));if(p&&q)scene.line(p,q,colors.result,1.3,true);}
    m.formula=`${V(yn)} ${anti?'∧':'∨'} (${V(xn)} ${anti?'∨':'∧'} ${V(yn)}<sup>${symbol}</sup>)`;m.row(du,m.mv(dual));m.row(first,m.mv(intermediate));m.row(expr,m.mv(result));if(A.gradeOf(result)===-1)m.status='0 · degenerate configuration';return true;
  }
  if(t==='angle'){
    inputs(m,scene);const {a:x,b:y,aName:xn,bName:yn}=pair(m),ax=A.attitude(x),ay=A.attitude(y),num=A.antiwedge(ax,A.dual(ay)),den=A.bulkNorm(ax)*A.bulkNorm(ay),same=m.grades[0]===m.grades[1],cosine=den>EPS?Math.max(-1,Math.min(1,(same?num[0]:A.bulkNorm(num))/den)):null;flat(scene,m,x,xn,colors.a);flat(scene,m,y,yn,colors.b);scene.element(ax,A,`att(${xn})`,{color:colors.a,dashed:true});scene.element(ay,A,`att(${yn})`,{color:colors.b,dashed:true});
    const eu=new Algebra(h),normal=att=>{const spatial=att.slice(0,1<<h);return [...eu.coordinates(eu.complement(spatial)),0];},first=A.gradeOf(ax)===1?A.coordinates(ax):normal(ax),second=A.gradeOf(ay)===1?A.coordinates(ay):normal(ay);
    if(same)scene.angle(first,second);else{const plane=m.grades[0]===3?unit(first):unit(second),line=m.grades[0]===2?first:second,projected=sub(line,scale(plane,dot(plane,line)));if(length(projected)>EPS)scene.angle(line,projected);}
    const bulkDual=A.dual(ay),weightDual=A.dual(y,true),weighted=A.antiwedge(x,weightDual);for(const [enabled,value,label,color] of [[s.bulkDual,bulkDual,`att(${yn})^{★}`,colors.purple],[s.weightDual,weightDual,`${yn}^{☆}`,colors.c]])if(enabled){scene.element(value,A,label,{color,dashed:true});scene.flat(value,A,hat(label),color);}
    if(s.angleProducts){scene.element(num,A,`att(${xn}) ∨ att(${yn})^{★}`,{color:colors.purple,dashed:true});scene.element(weighted,A,`${xn} ∨ ${yn}^{☆}`,{color:colors.c,dashed:true});m.row(`att(${xn}) ∨ att(${yn})^{★}`,m.mv(num));m.row(`${xn} ∨ ${yn}^{☆}`,m.mv(weighted));}
    const expr=`att(${V(xn)}) ∨ att(${V(yn)})<sup>★</sup>`,weightedExpr=`${V(xn)} ∨ ${V(yn)}<sup>☆</sup>`;m.formula=`cos φ(${V(xn)}, ${V(yn)}) = ${same?`(${expr})`:`‖${expr}‖<sub>●</sub>`} / (‖att(${V(xn)})‖<sub>●</sub>‖att(${V(yn)})‖<sub>●</sub>) = <span class="hat">${same?`(${weightedExpr})`:`‖${weightedExpr}‖<sub>●</sub>`} + ‖${V(xn)}‖<sub>○</sub> ‖${V(yn)}‖<sub>○</sub></span>`;m.row('Angle',cosine===null?'Undefined':`${number(Math.acos(cosine)*180/Math.PI)}°`);return true;
  }
  if(t==='parametric'){
    inputs(m,scene);const k=+s.grade,u=A.blade(vs.slice(0,k)),xn=name(k),att=A.attitude(u),support=closestPoint(basis(n,h),u,A);flat(scene,m,u,xn,colors.a,true);scene.element(att,A,`att(${xn})`,{color:colors.b,dashed:true});if(support){const fs=A.factor(att).map(unit),alpha=k===2?A.scalar(s.parameter):A.vector(add(scale(fs[0]||zero(n),s.parameter),scale(fs[1]||zero(n),s.parameter2||0))),delta=A.antiwedge(att,A.dual(alpha)),p=add(support,A.coordinates(delta));scene.point(support,hat(`sup(${xn})`),colors.mesh);scene.point(p,hat('p(α)'),colors.result,6);scene.line(support,p,colors.result,1.7,true);m.row('α',m.mv(alpha));m.row('p(α)',m.mv(A.vector(p)));}m.formula=`${V('p')}(α) = <span class="hat">sup(${V(xn)})</span> + att(${V(xn)}) ∨ ${k===2?'α':V('α')}<sup>★</sup>　(gr α = ${k-2})`;return true;
  }
  if(t==='projective'||t==='isometry')return paintSandwich(m,scene);
  return false;
}
function paintSandwich(m,scene){
  const A=m.alg,n=m.n,h=n-1,s=m.state,vs=m.vectors,av=A.vector(vs[0]),source=vs.slice(1),k=source.length,label=k===1?'v':name(k),v0=A.blade(source),anti=m.def.type==='isometry',transform=v=>{const q=anti?A.antiReflect(v,av):A.reflect(v,av);return q?scale(q,-1):null;},out=transform(v0);inputs(m,scene);
  if(!out){m.status='a⁻¹ undefined';return true;}
  const outputs=source.map(v=>A.coordinates(transform(A.vector(v)))),candidate=A.blade(outputs);if(dot(candidate,out)<0)outputs[outputs.length-1]=scale(outputs.at(-1),-1);
  const g=A.lc(av),p0=affine(vs[1]),p1=affine(outputs[0]),inLabel=label+'₀',outLabel=label+'₁';
  if(k>1){scene.blade(source,inLabel,{color:colors.a,alpha:.1});scene.blade(outputs,outLabel,{color:colors.result,alpha:.1});}else scene.arrow(outputs[0],outLabel,colors.result);
  source.forEach((v,i)=>scene.line(v,outputs[i],colors.mesh,1.4,true));flat(scene,m,v0,inLabel,colors.a);flat(scene,m,out,outLabel,colors.result);if(p0&&p1)scene.line(p0,p1,colors.result,1.5,true);
  const q=A.inner(av,av);
  if(!anti){
    if(s.shading)displacementShading(scene,vs[0],vs[1]);
    if(k===1){scene.blade([vs[0],vs[1]],'a ⟑ v₀',{color:colors.a,alpha:.1});scene.blade([outputs[0],vs[0]],'v₁ ⟑ a = a ⟑ v₀',{color:colors.result,alpha:.1});}
    const normal=A.coordinates(A.metricMap(av)),eu=new Algebra(n),fixed=eu.lc(eu.vector(normal));scene.flat(fixed,A,'fixed hyperplane',colors.green);const fixedPoint=affine(vs[0]);if(fixedPoint)scene.point(fixedPoint,hat('a'),colors.green);
    if(q>EPS){const infNormal=basis(n,h);for(let i=0;i<h;i++)infNormal[i]=-2*vs[0][h]*vs[0][i]/q;scene.flat(eu.lc(eu.vector(infNormal)),A,'sent to infinity',colors.purple);}
    if(s.orbit)projectiveSurface(scene,vs[0],vs[1]);
    m.formula=V(outLabel)+' = '+V('a')+' '+GP+' '+V(inLabel)+' '+GP+' '+V('a')+'<sup>−1</sup>';
  }else{
    scene.flat(g,A,hat('g'),colors.purple);scene.element(g,A,'g',{color:colors.purple,dashed:true,alpha:.05});
    const complemented=A.rc(v0),complementOut=A.rc(out),fs=balanced(m,complemented,'sandwich-input'),gs=fs.map(v=>A.coordinates(scale(A.reflect(A.vector(v),av),-1))),check=A.blade(gs);if(dot(check,complementOut)<0)gs[gs.length-1]=scale(gs.at(-1),-1);
    scene.blade(fs,rc(inLabel),{color:colors.a,dashed:true,alpha:.08});scene.blade(gs,rc(outLabel),{color:colors.result,dashed:true,alpha:.08});
    fs.forEach((v,i)=>scene.line(v,gs[i],colors.mesh,1,true));
    if(s.orbit&&p0){const spatial=vs[0].slice(0,h),norm=length(spatial);if(norm>EPS){const normal=unit(spatial),offset=vs[0][h]/norm,distance=dot(normal,p0.slice(0,h))+offset,frame=perpendicularFrame(normal).map(v=>[...v,0]);for(const d of [distance,-distance])scene.locusSpan([...scale(normal,d-offset),1],frame,colors.green);}}
    const other=scale(A.agp(A.agp(g,v0),g),1/q);m.row('g ⟇ '+inLabel+' ⟇ g / (a • a)',m.mv(other));m.row('Equality residual',number(length(sub(out,other))));
    m.formula=V(outLabel)+' = <span class="left-complement">'+V('a')+' '+GP+' '+R(inLabel)+' '+GP+' '+V('a')+'<sup>−1</sup></span> = '+V('g')+' '+AGP+' '+V(inLabel)+' '+AGP+' '+V('g')+' / ('+V('a')+' • '+V('a')+')';
  }
  m.row(outLabel,m.mv(out));return true;
}
export const projectiveSurface=displacementSurface;

function paintConformal(m,scene){
  const t=m.def.type,A=m.alg,n=m.n,s=m.state,vs=m.vectors;if(!m.cga)return false;
  if(t==='roundpoint'||t==='round'||t==='cga-property'){
    inputs(m,scene);let u=t==='roundpoint'?A.vector(vs[0]):A.blade(s.flat?[...vs.slice(0,-1),basis(n,n-1)]:vs),label=t==='roundpoint'?'a':objectSymbol(A.gradeOf(u),s.flat),info=cgaRound(u,A),prop=cgaProperties(u,A);
    if(t==='roundpoint'){m.formula=`${V('a')} / a<sub>${n===4?'z':'w'}</sub> = ${V('x')} + ${E(n-1)} + ½(|${V('x')}|² + r²)${E(n)}`;if(Math.abs(vs[0][n-2])<EPS)m.status=length(vs[0].slice(0,n-2))<EPS&&Math.abs(vs[0][n-1])>EPS?'Point at infinity':'Zero round weight · no finite centre';}
    if(t==='round'&&s.flat)scene.arrow(basis(n,n-1),m.names.at(-1)+' = e_{'+n+'}',colors.infinity);
    if(t==='round')m.formula=`${V(label)} = ${m.names.map(V).join(' ∧ ')}${s.flat?`,　${V(m.names.at(-1))} = ${E(n)}`:''}`;
    if(t==='cga-property'){m.formula=m.def.formula.replaceAll(V('u'),V(label)).replace(/(<span class="mv">)u/g,`$1${label}`).replaceAll(E('n'),E(n));if(m.def.property==='attitude')m.formula=`att(${V(label)}) = ${V(label)} ∨ <span class="right-complement">${E(n-1)}</span>`;}
    if(t==='roundpoint'){roundPointConstruction(m,scene,embeddedRound);m.row('a',m.mv(u));return true;}
    else{spatialRound(scene,u,A,hat(label),colors.result,{radius:s.radius});embeddedRound(scene,u,A,label,colors.result);}
    if(s.homogeneous)scene.element(u,A,label,{color:colors.result,alpha:.08});
    for(const [key,expr,color] of [['carrier',`car(${label})`,colors.a],['cocarrier',`ccr(${label})`,colors.b],['container',`con(${label})`,colors.purple],['partner',`par(${label})`,colors.warm],['conjugate',`${label}^{†}`,colors.c]])if(s[key]){
      if(key==='carrier'||key==='cocarrier'){const f=removeInfinity(prop[key],A);scene.flat(f.blade,f.alg,hat(expr),color);if(s.embeddedProperty!==false)embeddedRound(scene,prop[key],A,expr,color);if(s.propertyBlade)scene.element(prop[key],A,expr,{color,dashed:true,alpha:.07});}else{if(key!=='partner')spatialRound(scene,prop[key],A,hat(expr),color,{radius:false});embeddedRound(scene,prop[key],A,expr,color);}m.row(expr,m.mv(prop[key]));}
    if(s.dual){const expr=label+'^{★}';scene.element(prop.dual,A,expr,{color:colors.purple,dashed:true,alpha:.05});scene.element(prop.antidual,A,label+'^{☆}',{color:colors.b,dashed:true,alpha:.05});spatialRound(scene,prop.dual,A,'','#85808f',{preserveColor:true});embeddedRound(scene,prop.dual,A,'','#85808f',{preserveColor:true});m.formula=V(label)+'<sup>★</sup> = −'+V(label)+'<sup>☆</sup>';m.row(expr,m.mv(prop.dual));m.row(label+'^{☆}',m.mv(prop.antidual));}
    if(s.showDual){scene.element(prop.antidual,A,label+'^{☆}',{color:colors.purple,dashed:true,alpha:.06});embeddedRound(scene,prop.antidual,A,'',colors.purple);spatialRound(scene,prop.antidual,A,'',colors.purple);}
    if(s.showCarrier||s.showCarrierDual){const d=A.dual(prop.carrier,true);if(s.showCarrier){embeddedRound(scene,prop.carrier,A,'car('+label+')',colors.a);scene.element(prop.carrier,A,'car('+label+')',{color:colors.a,alpha:.04});}if(s.showCarrierDual){scene.element(d,A,'car('+label+')^{☆}',{color:colors.purple,dashed:true,alpha:.05});embeddedRound(scene,d,A,'',colors.purple);spatialRound(scene,d,A,'',colors.purple);}}
    if(s.attitude)scene.element(prop.attitude,A,`att(${label})`,{color:colors.warm,dashed:true});m.row(label,m.mv(u));if(t==='roundpoint')m.row('a • a',number(A.inner(u,u)));if(info&&!info.flat)m.row('r²',number(info.radius2));return true;
  }
  if(t==='containment'){
    inputs(m,scene);const p=A.vector(vs[0]),q=A.vector(vs[1]),object=A.blade(s.flat?[...vs.slice(1,-1),basis(n,n-1)]:vs.slice(1)),label=objectSymbol(vs.length-1,s.flat);spatialRound(scene,object,A,hat(label),colors.b);embeddedRound(scene,object,A,label,colors.b);scene.point([...vs[0].slice(0,n-1),0],hat('p₀'),colors.a);m.formula=`${V('p₀')} ∧ ${V(label)} = 0`;m.row(`p₀ ∧ ${label}`,m.mv(A.wedge(p,object)));m.row('p₀ • q',number(A.inner(p,q)));if(s.dual)scene.element(A.dual(object,true),A,`${label}^{☆}`,{color:colors.purple,dashed:true});return true;
  }
  if(t==='cga-dot'){
    inputs(m,scene);for(let i=0;i<2;i++){const u=A.vector(vs[i]),color=[colors.a,colors.b][i],info=cgaRound(u,A),label=m.names[i];if(info){scene.point(info.center,hat(label),color);if(Math.abs(info.radius2)>EPS)scene.sphere(info.center,Math.sqrt(Math.abs(info.radius2)),color,true,.65,Array.from({length:n-2},(_,j)=>basis(n,j)));}}
    m.row('a • b',`${number(A.inner(A.vector(vs[0]),A.vector(vs[1])))} 1`);return true;
  }
  if(['cga-join','cga-meet','cga-expansion'].includes(t)){
    inputs(m,scene);const [ka,kb]=m.grades,first=vs.slice(0,ka),second=vs.slice(ka,ka+kb),x=A.blade(s.flatA&&ka>1?[...first.slice(0,-1),basis(n,n-1)]:first),y=A.blade(s.flatB&&kb>1?[...second.slice(0,-1),basis(n,n-1)]:second),baseA=objectSymbol(ka,s.flatA),base=objectSymbol(kb,s.flatB),xn=baseA+(ka===1||baseA===base?'₁':''),yn=base+(kb===1||baseA===base?'₂':''),op=t==='cga-join'?'∧':t==='cga-meet'?'∨':'∧',d=t==='cga-expansion'?A.dual(y,true):y,expr=`${xn} ${op} ${yn}${t==='cga-expansion'?'^{☆}':''}`,out=op==='∨'?A.antiwedge(x,y):A.wedge(x,d);
    for(const [u,label,color] of [[x,xn,colors.a],[y,yn,colors.b],[out,expr,colors.result]]){if(s.spatial)spatialRound(scene,u,A,hat(label),color,{endpoints:u===out&&t==='cga-join'&&(ka===1||kb===1)});embeddedRound(scene,u,A,label,color,{endpoints:u===out&&t==='cga-join'&&(ka===1||kb===1)});if(s.homogeneous)scene.element(u,A,label,{color,alpha:.06});m.row(label,m.mv(u));}
    if(t==='cga-expansion'&&s.dual){scene.element(d,A,`${yn}^{☆}`,{color:colors.purple,dashed:true,alpha:.08});if(s.spatial)spatialRound(scene,d,A,hat(`${yn}^{☆}`),colors.purple);embeddedRound(scene,d,A,`${yn}^{☆}`,colors.purple);}
    m.formula=`${V(xn)} ${op} ${V(yn)}${t==='cga-expansion'?'<sup>☆</sup>':''}`;return true;
  }
  return false;
}
const roundSymbol=k=>['1','p','d','c','s'][k]||'𝟙';
const objectSymbol=(k,flat=false)=>flat&&k>1?['','','p','l','g'][k]||'𝟙':roundSymbol(k);
export function embeddedRound(scene,u,A,label,color,options={}){
  const info=cgaRound(u,A);if(!info)return info;const imaginary=info.radius2< -EPS;if(imaginary&&!options.preserveColor)color=colors.purple;
  if(info.flat){const B=info.alg,fs=B.factor(info.blade),h=B.n-1,pivot=fs.find(v=>Math.abs(v[h])>EPS);if(!pivot)return info;const center=scale(pivot,1/pivot[h]).slice(0,h),dirs=[];for(const f of fs){let d=sub(f,scale(pivot,f[h]/pivot[h])).slice(0,h);for(const v of dirs)d=sub(d,scale(v,dot(v,d)));if(length(d)>EPS)dirs.push(unit(d));}
    const mapped=x=>embed(x,A.n);if(!dirs.length)scene.point(mapped(center),label,color);
    for(let axis=0;axis<dirs.length;axis++)for(let offset=dirs.length===1?0:-2;offset<= (dirs.length===1?0:2);offset+=.8){let prev=null;for(let t=-3;t<=3;t+=.08){const p=add(center,add(scale(dirs[axis],t),scale(dirs[(axis+1)%dirs.length],offset)));if(length(p)>4){prev=null;continue;}const q=mapped(p);if(prev)scene.line(prev,q,color,offset===0?2:1,offset!==0,.75);prev=q;}}scene.label(mapped(center),label,color,{dy:-15});return info;
  }
  const radius=Math.sqrt(Math.abs(info.radius2)),dirs=info.dirs,center=info.center.slice(0,A.n-2),q=x=>imaginary?[...x,1,dot(center,x)+(info.radius2-dot(center,center))/2]:embed(x,A.n);
  if(A.gradeOf(u)===1){const raw=A.coordinates(u);if(!scene.handles.some(h=>length(sub(h.v,raw))<1e-7))scene.point(raw,label,color,4);if(radius>EPS){const fs=Array.from({length:A.n-2},(_,i)=>basis(A.n-2,i));for(let axis=0;axis<(A.n===4?1:3);axis++){let prev;for(let i=0;i<=64;i++){const t=i*Math.PI/32,p=q(add(center,add(scale(fs[axis],radius*Math.cos(t)),scale(fs[(axis+1)%fs.length],radius*Math.sin(t)))));if(prev)scene.line(prev,p,color,1,imaginary,.8);prev=p;}}}return info;}
  const point=d=>q(add(center,scale(d.slice(0,A.n-2),radius)));
  if(dirs.length===1){scene.line(point(dirs[0]),point(scale(dirs[0],-1)),color,2);scene.label(scale(add(point(dirs[0]),point(scale(dirs[0],-1))),.5),label,color,{dy:-12});if(options.endpoints){scene.point(point(dirs[0]),'',color,4);scene.point(point(scale(dirs[0],-1)),'',color,4);}}
  else if(dirs.length===2){let previous=null;for(let i=0;i<=72;i++){const t=i*Math.PI/36,p=point(add(scale(dirs[0],Math.cos(t)),scale(dirs[1],Math.sin(t))));if(previous)scene.line(previous,p,color,2);previous=p;}scene.label(point(dirs[0]),label,color,{dy:-13});}
  else if(dirs.length>=3){const cloud=[];for(let axis=0;axis<3;axis++){let previous=null;for(let i=0;i<=64;i++){const t=i*Math.PI/32,p=point(add(scale(dirs[axis],Math.cos(t)),scale(dirs[(axis+1)%3],Math.sin(t))));if(previous)scene.line(previous,p,color,.8);previous=p;cloud.push(p);}}for(let lat=1;lat<6;lat++){let previous=null;for(let i=0;i<=48;i++){const a=lat*Math.PI/6,t=i*Math.PI/24,p=point(add(scale(dirs[2],Math.cos(a)),add(scale(dirs[0],Math.sin(a)*Math.cos(t)),scale(dirs[1],Math.sin(a)*Math.sin(t)))));cloud.push(p);if(previous)scene.line(previous,p,color,.8,true,.5);previous=p;}}scene.commands.push({kind:'hull',points:cloud,color,alpha:.035});scene.label(q(center),label,color,{dy:-15});}
  return info;
}
