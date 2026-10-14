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
export const cgaTypes=['cga-dot','cga-join','cga-meet','cga-expansion'];
export function configure(m){
  const t=m.def.type,n=m.n;m.frames=new Map();
  if(t==='trivector'){m.controls=m.controls.filter(x=>!['fix','loci'].includes(x.key));delete m.state.fix;delete m.state.loci;}
  if(t==='antiwedge'||t==='geometric-antiproduct'){m.setVectors(2);m.names=t==='antiwedge'?['ā','b̄']:['ḡ','h̄'];if(t==='geometric-antiproduct'){m.controls=[];fill(m,check('loci','Product loci',true));fill(m,check('complements','Complements',true));}}
  if(t==='complement')m.controls=m.controls.filter(x=>x.key!=='frame');
  if(t==='dual'){m.controls=m.controls.filter(x=>!['frame','dual','scalar'].includes(x.key));const control=m.controls.find(x=>x.key==='grade');control.options=Array.from({length:n-1},(_,i)=>[i+1,name(i+1)]);m.setVectors(1,'point');fill(m,check('homogeneous','Homogeneous blade'));}
  if(t==='euclidean-dot'){m.alg=new Algebra(n);m.setVectors(2);fill(m,check('fix','Fix value'));fill(m,check('loci','Dot loci',true));}
  if(t==='projective-product'){m.setVectors(2);fill(m,check('fix','Fix dot value'));fill(m,check('wedgeLocus','Wedge loci',true));fill(m,check('dotLocus','Dot loci',true));}
  if(t==='dot'||t==='antidot'){m.controls.find(x=>x.key==='loci').label=t==='dot'?'Dot loci':'Weight loci';if(t==='antidot'){m.setVectors(2,'point');m.names=['p','q'];}}
  if(t==='distance')m.names=['p','q','r','s'];
  if(t==='reflection'||t==='rotation')fill(m,check('products','Product blades',true));
  if(t==='attitude'){m.controls.find(x=>x.key==='grade').options=[[1,'Point'],[2,'Line'],...(n===4?[[3,'Plane']]:[])];}
  if(t==='projection'){m.controls=[];fill(m,select('pair','Objects',projectionPairs(n,m.def.variant)));fill(m,check('dual','Dual',true));fill(m,check('intermediate','First product',true));fill(m,check('attached','Attach intermediate blade',true));fill(m,check('homogeneous','Homogeneous blades'));setPair(m);}
  if(t==='interior')fill(m,check('homogeneous','Homogeneous blades'));
  if(t==='angle'){m.setVectors(4,'point');fill(m,select('pair','Objects',n===3?[['2:2','Line / Line']]:[['2:2','Line / Line'],['3:3','Plane / Plane'],['3:2','Plane / Line']]));setPair(m);}
  if(t==='parametric'){m.setVectors(2,'point');fill(m,select('grade','Object',[[2,'Line'],...(n===4?[[3,'Plane']]:[])]));fill(m,range('parameter','λ',-2,2,.025,0));if(n===4)fill(m,range('parameter2','μ',-2,2,.025,0));}
  if(t==='projective'){m.controls=m.controls.filter(x=>x.key!=='loci');fill(m,check('wedgeLocus','Wedge loci',true));fill(m,check('dotLocus','Dot locus',true));m.controls.find(x=>x.key==='orbit').label='Invariant surface';}
  if(t==='isometry'){m.controls=m.controls.filter(x=>x.key!=='loci');m.controls.find(x=>x.key==='orbit').label='Equal-distance surfaces';}
  if(m.cga){if(m.state.mesh!==undefined)m.state.mesh=true;if(m.state.radius!==undefined)m.state.radius=false;}
  if(t==='roundpoint')m.names=['a'];
  if(t==='round'&&m.def.grade===4)m.names=['p','q','r','t'];
  if(cgaTypes.includes(t)){m.controls=[];fill(m,check('mesh','Null cone / Horosphere',true));if(t==='cga-dot'){m.setVectors(2,'null');m.names=['a','b'];fill(m,range('radiusA','r_a²',-2,2,.025,0));fill(m,range('radiusB','r_b²',-2,2,.025,0));}
    else{fill(m,select('pair','Objects',cgaPairs(n,t)));fill(m,check('flatA','Make first object flat'));fill(m,check('flatB','Make second object flat'));fill(m,check('spatial','u = 0 geometry',true));fill(m,check('dual','Antidual',t==='cga-expansion'));fill(m,check('homogeneous','Homogeneous blades'));setPair(m);}}
  if(m.alg.kind==='rigid'){fill(m,check('unitWeight',`Unitize (${n===3?'z':'w'} = 1)`));fill(m,check('lockWeight','Keep on unit slice'));}
}
function projectionPairs(n,variant){const anti=variant>=2;return (n===3?(anti?[[2,1]]:[[1,2]]):anti?[[3,1],[2,1],[3,2]]:[[1,3],[1,2],[2,3]]).map(([a,b])=>[`${a}:${b}`,`${name(a)} → ${name(b)}`]);}
function cgaPairs(n,t){let pairs=t==='cga-join'?[[1,1],[1,2],...(n===5?[[1,3],[2,2]]:[])]:t==='cga-meet'?(n===4?[[3,3],[3,2]]:[[4,4],[4,3],[3,3],[4,2]]):(n===4?[[1,2],[1,3],[2,3]]:[[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]);return pairs.map(([a,b])=>[`${a}:${b}`,`${roundName(a,n)} / ${roundName(b,n)}`]);}
const roundName=(k,n)=>k===1?'Round point':k===2?'Dipole':k===3?'Circle':'Sphere';
function roundSeed(m,k,side){const x=Array(m.n-2).fill(0);x[0]=side? .7:-.7;if(k===1)x[1]=.45;if(side&&m.n===5)x[2]=.35;const r=side?1.1:1;if(k===1)return [embed(x,m.n)];if(k===2)return [-1,1].map(s=>embed(add(x,basis(m.n-2,side?1:0,s*r)),m.n));if(k===3)return [0,2*Math.PI/3,4*Math.PI/3].map(t=>{const p=[...x];p[0]+=r*Math.cos(t);p[side&&m.n===5?2:1]+=r*Math.sin(t);return embed(p,m.n);});return m.roundSeeds(x,r);}
function setPair(m){m.grades=String(m.state.pair).split(':').map(Number);const [a,b]=m.grades;if(m.cga){m.vectors=[...roundSeed(m,a,0),...roundSeed(m,b,1)];const labels=['p','q','r','t'];m.names=[...labels.slice(0,a),...labels.slice(0,b).map(x=>x+'₂')];}else{m.setVectors(a+b,'point');m.names=m.vectors.map((_,i)=>['p','q','r','s','t','v','k','j'][i]||`p${i+1}`);}m.frames?.clear();}
export function update(m,key,value){
  if(key==='pair'){m.state[key]=value;setPair(m);return true;}
  if(key==='grade'&&m.def.type==='dual'){m.state.grade=value;m.setVectors(+value,'point');m.frames.clear();return true;}
  if(key==='unitWeight'||key==='lockWeight'){m.state[key]=value;if(value)for(let i=0;i<m.vectors.length;i++){const v=m.vectors[i],h=v[m.n-1];if(Math.abs(h)>EPS)m.vectors[i]=scale(v,1/h);}return true;}
  if(key==='radiusA'||key==='radiusB'){m.state[key]=value;const i=key==='radiusA'?0:1;m.vectors[i]=embed(m.vectors[i].slice(0,m.n-2),m.n,value);return true;}
  if(key==='grade')m.frames.clear();return false;
}
export function activeInputs(m){const t=m.def.type;if(t==='distance')return Array.from({length:+m.state.case+2},(_,i)=>i);if(t==='join')return Array.from({length:+m.state.case===1?3:2},(_,i)=>i);if(t==='meet'&&m.n===4&&+m.state.case===1)return [0,1,2,3,4];if(['complement','dual'].includes(t)&&[0,m.n].includes(+m.state.grade))return [];const indices=m.vectors.map((_,i)=>i);if(t==='round'&&m.state.flat)return indices.slice(0,-1);if(m.cga&&m.grades)return indices.filter(i=>!(m.state.flatA&&m.grades[0]>1&&i===m.grades[0]-1)&&!(m.state.flatB&&m.grades[1]>1&&i===m.vectors.length-1));return indices;}
export function dragSpace(m,i){
  const n=m.n,t=m.def.type,h=n-1;
  if(m.cga&&t!=='roundpoint')return Array.from({length:n-2},(_,j)=>add(basis(n,j),basis(n,h,m.vectors[i][j])));
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
  if(m.cga&&t!=='roundpoint')next=embed(next.slice(0,n-2),n,t==='cga-dot'?m.state[i===0?'radiusA':'radiusB']:0);
  if(m.state.unitWeight&&Math.abs(next[n-1])>EPS)next=scale(next,1/next[n-1]);m.vectors[i]=next;
  if(t==='roundpoint'){const w=next[n-2];if(Math.abs(w)>EPS)m.state.radius2=-m.alg.inner(m.alg.vector(next),m.alg.vector(next))/(w*w);}
  return true;
}
function inputs(m,scene,indices=activeInputs(m),labels=null){for(const i of indices)scene.handle(m.vectors[i],labels?.[i]??m.names[i],i,m.grades?(i<m.grades[0]?colors.a:colors.b):[colors.a,colors.b,colors.c][i%3],null,false,dragSpace(m,i));}
function flat(scene,m,a,label,color,homogeneous=false){scene.flat(a,m.alg,hat(label),color);if(homogeneous&&m.alg.gradeOf(a)>1)scene.element(a,m.alg,label,{color,alpha:.1});}
function pair(m){const [a,b]=m.grades;return {a:m.alg.blade(m.vectors.slice(0,a)),b:m.alg.blade(m.vectors.slice(a,a+b)),aName:name(a),bName:a===b?({1:'q',2:'k',3:'h',4:'t'}[b]):name(b)};}
function balanced(m,a,key){const f=continuousFactors(a,m.alg,m.frames.get(key));m.frames.set(key,f);return f;}
export function paint(m,scene){
  const t=m.def.type,A=m.alg,n=m.n,s=m.state,vs=m.vectors,vec=i=>A.vector(vs[i]);
  const handled=['complement','antiwedge','geometric-antiproduct','euclidean-dot','dot','antidot','geometric','projective-product','reflection','rotation','flat','attitude','join','meet','distance','dual','interior','projection','angle','parametric','projective','isometry','roundpoint','round','containment','cga-dot','cga-join','cga-meet','cga-expansion'].includes(t);
  if(!handled)return false;m.rows=[];m.formula=m.def.formula;m.status='';scene.isCGA=m.cga;if(A.kind==='rigid')scene.sliceMesh();if(m.cga&&(s.mesh||['containment'].includes(t)))scene.cgaMesh();
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
    if(s.inputs!==false){scene.element(x,A,xn,{color:colors.a,alpha:.13});scene.element(y,A,yn,{color:colors.b,alpha:.13});if(n===3){scene.locusPlane(zero(n),vs[0],colors.a);scene.locusPlane(zero(n),vs[1],colors.b);}}
    const w=A.wedge(wx,wy);if(s.intermediate!==false)scene.element(w,A,`${rc(xn)} ∧ ${rc(yn)}`,{dashed:true,color:colors.purple,alpha:.09});if(s.result!==false)scene.element(t==='antiwedge'?out:A.grade(out,n-2),A,`${xn} ${t==='antiwedge'?'∨':'⟇'} ${yn}`,{color:colors.result});
    if(t==='geometric-antiproduct'&&s.loci){scene.locusLine(vs[1],vs[0],colors.a);scene.locusPlane(vs[1],A.coordinates(A.metricMap(vec(0))),colors.purple);scene.angle(vs[0],vs[1]);}
    if(A.kind==='rigid'){flat(scene,m,x,xn,colors.a);flat(scene,m,y,yn,colors.b);flat(scene,m,A.grade(out,n-2),`${xn} ∨ ${yn}`,colors.result);}
    m.row(`${xn} ${t==='antiwedge'?'∨':'⟇'} ${yn}`,m.mv(out));return true;
  }
  if(['euclidean-dot','dot','antidot','geometric','projective-product'].includes(t)){
    inputs(m,scene);const isDot=t==='dot'||t==='euclidean-dot',anti=t==='antidot',gp=t==='geometric'||t==='projective-product',normals=vs.map(v=>t==='geometric'||t==='euclidean-dot'?v:v.map((x,i)=>i===n-1?0:x));
    if(s.loci||s.dotLocus)for(let i=0;i<2;i++)scene.locusPlane(vs[i],anti?basis(n,n-1):normals[1-i],[colors.a,colors.b][i]);
    if(gp){if(s.wedgeLocus)for(let i=0;i<2;i++)scene.locusLine(vs[i],vs[1-i],[colors.a,colors.b][i]);scene.blade(vs,'a ⟑ b',{color:colors.result});scene.angle(normals[0],normals[1]);m.row('a ⟑ b',m.mv(A.gp(vec(0),vec(1))));}
    else m.row(anti?'p ∘ q':t==='euclidean-dot'?'a · b':'a • b',`${number(anti?A.antiInner(vec(0),vec(1)):A.inner(vec(0),vec(1)))} ${anti?'𝟙':'1'}`);
    if(anti)m.formula=`${V('p')} ∘ ${V('q')} = p<sub>${n===3?'z':'w'}</sub>q<sub>${n===3?'z':'w'}</sub>${I}`;
    if(A.kind==='rigid'){for(let i=0;i<2;i++)flat(scene,m,vec(i),m.names[i],[colors.a,colors.b][i]);if(s.decompose)for(let i=0;i<2;i++)scene.element(anti?A.weight(vec(i)):A.bulk(vec(i)),A,`${m.names[i]}_${anti?'{○}':'{●}'}`,{color:[colors.a,colors.b][i],dashed:true});}
    if(gp&&t==='geometric')m.row('a⁻¹',length(vs[0])>EPS?m.mv(scale(vec(0),1/dot(vs[0],vs[0]))):'Undefined');return true;
  }
  if(t==='reflection'||t==='rotation'){
    inputs(m,scene);const i=t==='reflection'?1:2,v0=vec(i),neg=A.reflect(v0,vec(0));if(!neg){m.status='a⁻¹ undefined';return true;}const v1=scale(neg,-1),p1=A.coordinates(v1);scene.arrow(p1,'v₁',colors.result);scene.line(vs[i],p1,colors.mesh,1,true);
    if(s.products){scene.blade([vs[0],vs[i]],'a ⟑ v₀',{color:colors.a,alpha:.1});scene.blade([p1,vs[0]],'v₁ ⟑ a = a ⟑ v₀',{color:colors.result,alpha:.1});scene.angle(vs[0],vs[i]);}
    if(t==='reflection'){scene.arrow(scale(p1,-1),'−v₁',colors.purple);scene.line(vs[i],scale(p1,-1),colors.mesh,1,true);}
    else{const q=A.reflect(v1,vec(1));if(!q){m.status='b⁻¹ undefined';return true;}const v2=scale(q,-1);scene.arrow(A.coordinates(v2),'v₂',colors.purple);scene.line(p1,A.coordinates(v2),colors.mesh,1,true);if(s.products){scene.blade([vs[1],p1],'b ⟑ v₁',{color:colors.b,alpha:.08});scene.blade([A.coordinates(v2),vs[1]],'v₂ ⟑ b = b ⟑ v₁',{color:colors.purple,alpha:.08});scene.angle(vs[1],p1);}if(+s.grade>1){const source=[vs[i],basis(n,1,.8),basis(n,2,.7)].slice(0,+s.grade),output=source.map(v=>A.coordinates(scale(A.reflect(scale(A.reflect(A.vector(v),vec(0)),-1),vec(1)),-1)));scene.blade(source,'B₀',{alpha:.1,color:colors.a});scene.blade(output,'B₂',{alpha:.14,color:colors.result});}m.row('v₂',m.mv(v2));}
    if(s.complements){scene.element(A.rc(vec(0)),A,rc('a'),{color:colors.a,dashed:true,alpha:.05});if(t==='rotation')scene.element(A.rc(vec(1)),A,rc('b'),{color:colors.b,dashed:true,alpha:.05});}m.row('v₁',m.mv(v1));return true;
  }
  return paintFlat(m,scene)||paintConformal(m,scene);
}
function rotateFrame(frame,index,next){if(!frame?.length)return frame;const u=unit(frame[index]),projected=frame.reduce((s,f)=>add(s,scale(unit(f),dot(unit(f),next))),zero(next.length)),target=unit(projected);if(length(projected)<EPS)return frame;const cosine=Math.max(-1,Math.min(1,dot(u,target)));let v=sub(target,scale(u,cosine));if(length(v)<EPS){if(cosine>0)return frame;v=unit(frame[(index+1)%frame.length]);}else v=unit(v);const sine=Math.sqrt(Math.max(0,1-cosine*cosine));return frame.map(f=>{const x=dot(f,u),y=dot(f,v);return add(f,add(scale(u,(cosine-1)*x-sine*y),scale(v,sine*x+(cosine-1)*y)));});}
function paintFlat(m,scene){
  const t=m.def.type,A=m.alg,n=m.n,h=n-1,s=m.state,vs=m.vectors,vec=i=>A.vector(vs[i]);
  if(t==='flat'||t==='attitude'){
    const k=+(s.grade??m.def.grade),u=A.blade(vs.slice(0,k)),label=name(k);inputs(m,scene);flat(scene,m,u,label,colors.result,s.homogeneous);
    for(const v of vs){scene.locusLine(zero(n),v,colors.mesh);const q=affine(v);if(q)scene.point(q,'',colors.a,4);}
    const finite=vs.slice(0,k).map(affine).filter(Boolean);if(k===2&&finite.length===2)scene.line(finite[0],finite[1],colors.result,3.3);if(k===3&&finite.length===3)scene.poly(finite,colors.result,.12);
    const bulk=A.bulk(u),weight=A.weight(u);
    if(s.decompose){
      if(k===2&&length(weight)>EPS){const d=zero(n);for(let i=0;i<h;i++)d[i]=-weight[(1<<i)|(1<<h)];const wn=length(d),support=closestPoint(basis(n,h),u,A);if(support){support[h]=0;scene.blade([unit(d),scale(support,-wn)],`${label}_{●}`,{dashed:true,color:colors.a,alpha:.12});scene.label(scale(add(unit(d),scale(support,-wn)),.5),'bulk: moment',colors.a,{dy:25,size:16});}scene.blade([basis(n,h),d],`${label}_{○}`,{dashed:true,color:colors.purple,alpha:.12});}
      else{scene.element(bulk,A,`${label}_{●}`,{dashed:true,color:colors.a});scene.element(weight,A,`${label}_{○}`,{dashed:true,color:colors.purple});if(k===1){const arrow=scene.commands.findLast(x=>x.kind==='arrow'&&x.color===colors.purple);if(arrow)arrow.width=3.6;}}
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
    inputs(m,scene);const k=+s.case+1,x=vec(0),y=A.blade(vs.slice(1,k+1)),yn=k===1?'q':name(k),attx=A.attitude(x),atty=A.attitude(y),attjoin=A.attitude(A.wedge(x,y));flat(scene,m,x,'p',colors.a,s.homogeneous);flat(scene,m,y,yn,colors.b,s.homogeneous);
    const p=affine(vs[0]),q=k===1?affine(vs[1]):closestPoint(vs[0],y,A);if(p&&q){scene.line(p,q,colors.warm,2,true);if(k>1)scene.point(q,hat(`proj(p, ${yn})`),colors.warm);scene.label(scale(add(p,q),.5),'d',colors.warm,{dy:-10});}
    scene.element(attx,A,'att(p)',{color:colors.a,dashed:true});scene.element(atty,A,`att(${yn})`,{color:colors.b,dashed:true});scene.element(attjoin,A,`att(p ∧ ${yn})`,{color:colors.warm,dashed:true});
    const numerator=A.bulkNorm(attjoin),denominator=A.bulkNorm(A.wedge(attx,atty)),w=A.weightNorm(A.wedge(x,atty));m.formula=`d(${V('p')}, ${V(yn)}) = ‖att(${V('p')} ∧ ${V(yn)})‖<sub>●</sub> / ‖att(${V('p')}) ∧ att(${V(yn)})‖<sub>●</sub>`;m.row('Homogeneous distance',`${number(numerator)} 1 + ${number(w)} 𝟙`);m.row('Distance',denominator>EPS?number(numerator/denominator):'Undefined');return true;
  }
  if(t==='dual'){
    const k=+s.grade,label=name(k),u=A.blade(vs.slice(0,k));inputs(m,scene);flat(scene,m,u,label,colors.a,s.homogeneous);
    for(const [weight,symbol,color] of [[false,'★',colors.purple],[true,'☆',colors.result]]){const dual=A.dual(u,weight,s.side),expr=`${label}${s.side==='right'?'^':'_'}{${symbol}}`;scene.element(dual,A,expr,{color,dashed:true,alpha:.12});scene.flat(dual,A,hat(expr),color);m.row(expr,m.mv(dual));}
    m.formula=`${V(label)}${s.side==='right'?'<sup>★</sup>':'<sub>★</sub>'} = ${s.side==='right'?R(`${label}●`):L(`${label}●`)}　　${V(label)}${s.side==='right'?'<sup>☆</sup>':'<sub>☆</sub>'} = ${s.side==='right'?R(`${label}○`):L(`${label}○`)}`;return true;
  }
  if(t==='interior'){
    inputs(m,scene);const op=+s.operation,anti=op>=2,weight=op%2===1,x=anti?A.blade(vs.slice(0,2)):vec(0),y=anti?vec(2):A.blade(vs.slice(1,3)),xn=anti?'l':'p',yn=anti?'r':'l',d=A.dual(y,weight),symbol=weight?'☆':'★',expr=`${xn} ${anti?'∨':'∧'} ${yn}^{${symbol}}`,out=anti?A.antiwedge(x,d):A.wedge(x,d);
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
    const expr=`att(${V(xn)}) ∨ att(${V(yn)})<sup>★</sup>`;m.formula=`cos φ = ${same?`(${expr})`:`‖${expr}‖<sub>●</sub>`} / (‖att(${V(xn)})‖<sub>●</sub>‖att(${V(yn)})‖<sub>●</sub>)`;m.row('Angle',cosine===null?'Undefined':`${number(Math.acos(cosine)*180/Math.PI)}°`);return true;
  }
  if(t==='parametric'){
    inputs(m,scene);const k=+s.grade,u=A.blade(vs.slice(0,k)),xn=name(k),att=A.attitude(u),support=closestPoint(basis(n,h),u,A);flat(scene,m,u,xn,colors.a);scene.element(att,A,`att(${xn})`,{color:colors.b,dashed:true});if(support){const fs=A.factor(att).map(unit),alpha=k===2?A.scalar(s.parameter):A.vector(add(scale(fs[0]||zero(n),s.parameter),scale(fs[1]||zero(n),s.parameter2||0))),delta=A.antiwedge(att,A.dual(alpha)),p=add(support,A.coordinates(delta));scene.point(support,hat(`sup(${xn})`),colors.mesh);scene.point(p,hat('p(α)'),colors.result,6);scene.line(support,p,colors.result,1.7,true);m.row('α',m.mv(alpha));m.row('p(α)',m.mv(A.vector(p)));}m.formula=`${V('p')}(α) = <span class="hat">sup(${V(xn)})</span> + att(${V(xn)}) ∨ ${k===2?'α':V('α')}<sup>★</sup>　(gr α = ${k-2})`;return true;
  }
  if(t==='projective'||t==='isometry')return paintSandwich(m,scene);
  return false;
}
function paintSandwich(m,scene){
  const A=m.alg,n=m.n,h=n-1,s=m.state,vs=m.vectors,av=A.vector(vs[0]),v0=A.vector(vs[1]),anti=m.def.type==='isometry',minus=anti?A.antiReflect(v0,av):A.reflect(v0,av);inputs(m,scene);
  if(!minus){m.status='a⁻¹ undefined';return true;}const out=scale(minus,-1),v1=A.coordinates(out),g=A.lc(av),p0=affine(vs[1]),p1=affine(v1);scene.arrow(v1,'v₁',colors.result);scene.line(vs[1],v1,colors.mesh,1.4,true);flat(scene,m,v0,'v₀',colors.a);flat(scene,m,out,'v₁',colors.result);if(p0&&p1)scene.line(p0,p1,colors.result,1.5,true);
  if(!anti){
    scene.blade([vs[0],vs[1]],'a ⟑ v₀',{color:colors.a,alpha:.13});scene.blade([v1,vs[0]],'v₁ ⟑ a = a ⟑ v₀',{color:colors.result,alpha:.13});const normal=A.coordinates(A.metricMap(av));if(s.dotLocus)scene.locusPlane(vs[1],normal,colors.purple);if(s.wedgeLocus){scene.locusLine(vs[1],vs[0],colors.a);scene.locusLine(v1,vs[0],colors.result);}scene.angle(vs[0],vs[1]);
    const eu=new Algebra(n),fixed=eu.lc(eu.vector(normal));scene.flat(fixed,A,'fixed points',colors.green);const fixedPoint=affine(vs[0]);if(fixedPoint)scene.point(fixedPoint,hat('a'),colors.green);
    const q=A.inner(av,av);if(q>EPS){const infNormal=basis(n,h);for(let i=0;i<h;i++)infNormal[i]=-2*vs[0][h]*vs[0][i]/q;scene.flat(eu.lc(eu.vector(infNormal)),A,'sent to infinity',colors.purple);}
    if(s.orbit)projectiveSurface(scene,vs[0],vs[1]);
  }else{
    scene.flat(g,A,hat('g'),colors.purple);if(s.complements){scene.element(A.rc(v0),A,rc('v₀'),{color:colors.a,dashed:true,alpha:.12});scene.element(A.rc(out),A,rc('v₁'),{color:colors.result,dashed:true,alpha:.12});scene.element(g,A,'g',{color:colors.purple,dashed:true,alpha:.1});}
    if(s.orbit&&p0){const spatial=vs[0].slice(0,h),norm=length(spatial),normal=unit(spatial),offset=vs[0][h]/norm,distance=dot(normal,p0.slice(0,h))+offset,frame=perpendicularFrame(normal).map(v=>[...v,0]);for(const weight of new Set([vs[1][h],v1[h],1]))for(const d of [distance,-distance]){const center=[...scale(normal,weight*(d-offset)),weight];scene.locusSpan(center,frame,colors.green);}}
    const q=A.inner(av,av),other=scale(A.agp(A.agp(g,v0),g),1/q);m.row('g ⟇ v₀ ⟇ g / (a • a)',m.mv(other));m.row('Equality residual',number(length(sub(out,other))));
  }
  m.row('v₁',m.mv(out));return true;
}
export function projectiveSurface(scene,a,v){
  const n=a.length,h=n-1,spatial=a.slice(0,h),norm=length(spatial);if(norm<EPS)return;const u=unit(spatial),frame=perpendicularFrame(u),s=dot(u,v.slice(0,h)),l=v[h]-a[h]*s/norm;
  if(Math.abs(l)<1e-6){scene.locusPlane(v,[...scale(u,-a[h]/norm),1],colors.green);return;}
  const k=dot(v.slice(0,h),v.slice(0,h))/(l*l),outputWeight=2*a[h]*dot(spatial,v.slice(0,h))/(norm*norm)-v[h],weights=[...new Set([v[h],outputWeight,1])];
  for(const w of weights){const angles=h===2?[0,Math.PI]:[0,Math.PI/2,Math.PI,3*Math.PI/2];for(const theta of angles){let previous=null;for(let t=-3.5;t<=3.501;t+=.06){const r2=k*(w-a[h]*t/norm)**2-t*t;if(r2<0||r2>20){previous=null;continue;}const r=Math.sqrt(r2),d=h===2?scale(frame[0],Math.cos(theta)):add(scale(frame[0],Math.cos(theta)),scale(frame[1],Math.sin(theta))),p=[...add(scale(u,t),scale(d,r)),w];if(previous)scene.line(previous,p,colors.green,1.1,true,.65);previous=p;}}
    if(h===3)for(let t=-3;t<=3;t+=.6){const r2=k*(w-a[h]*t/norm)**2-t*t;if(r2>0&&r2<16)scene.circle([...scale(u,t),w],[...frame[0],0],[...frame[1],0],Math.sqrt(r2),colors.green,true,.5);}}
}
function paintConformal(m,scene){
  const t=m.def.type,A=m.alg,n=m.n,s=m.state,vs=m.vectors;if(!m.cga)return false;
  if(t==='roundpoint'||t==='round'){
    inputs(m,scene);let u=t==='roundpoint'?A.vector(vs[0]):A.blade(s.flat?[...vs.slice(0,-1),basis(n,n-1)]:vs),label=t==='roundpoint'?'a':objectSymbol(A.gradeOf(u),s.flat),info=cgaRound(u,A),prop=cgaProperties(u,A);
    if(t==='round')m.formula=`${V(label)} = ${m.names.slice(0,s.flat?-1:undefined).map(V).join(' ∧ ')}${s.flat?` ∧ ${E(n)}`:''}`;
    if(t==='roundpoint'){if(s.radius&&info&&!info.flat){const r=Math.sqrt(Math.abs(info.radius2));scene.line(info.center,add(info.center,basis(n,0,r)),colors.result,2.3);}}
    else{spatialRound(scene,u,A,hat(label),colors.result,{radius:s.radius});embeddedRound(scene,u,A,label,colors.result);}
    if(s.homogeneous)scene.element(u,A,label,{color:colors.result,alpha:.08});
    for(const [key,expr,color] of [['carrier',`car(${label})`,colors.a],['cocarrier',`ccr(${label})`,colors.b],['container',`con(${label})`,colors.purple],['partner',`par(${label})`,colors.warm],['conjugate',`${label}^{†}`,colors.c]])if(s[key]){
      if(key==='carrier'||key==='cocarrier'){const f=removeInfinity(prop[key],A);scene.flat(f.blade,f.alg,hat(expr),color);}else{spatialRound(scene,prop[key],A,hat(expr),color,{radius:false});embeddedRound(scene,prop[key],A,expr,color);}m.row(expr,m.mv(prop[key]));}
    if(s.dual)for(const [kind,expr,color] of [['dual',`${label}^{★}`,colors.purple],['antidual',`${label}^{☆}`,colors.b]]){scene.element(prop[kind],A,expr,{color,dashed:true,alpha:.07});spatialRound(scene,prop[kind],A,hat(expr),color);m.row(expr,m.mv(prop[kind]));}
    if(s.attitude)scene.element(prop.attitude,A,`att(${label})`,{color:colors.warm,dashed:true});m.row(label,m.mv(u));if(t==='roundpoint')m.row('a • a',number(A.inner(u,u)));if(info&&!info.flat)m.row('r²',number(info.radius2));return true;
  }
  if(t==='containment'){
    inputs(m,scene);const p=A.vector(vs[0]),q=A.vector(vs[1]),object=A.blade(vs.slice(1)),label=n===5?'s':'c';spatialRound(scene,object,A,hat(label),colors.b);embeddedRound(scene,object,A,label,colors.b);scene.point([...vs[0].slice(0,n-1),0],hat('p'),colors.a);m.formula=`${V('p')} ∧ ${V(label)} = 0`;m.row(`p ∧ ${label}`,m.mv(A.wedge(p,object)));m.row('p • q',number(A.inner(p,q)));if(s.dual)scene.element(A.dual(object,true),A,`${label}^{☆}`,{color:colors.purple,dashed:true});return true;
  }
  if(t==='cga-dot'){
    inputs(m,scene);for(let i=0;i<2;i++){const u=A.vector(vs[i]),color=[colors.a,colors.b][i],info=cgaRound(u,A),label=m.names[i];if(info){scene.point(info.center,hat(label),color);if(Math.abs(info.radius2)>EPS)scene.sphere(info.center,Math.sqrt(Math.abs(info.radius2)),color,true,.65,Array.from({length:n-2},(_,j)=>basis(n,j)));}}
    m.row('a • b',`${number(A.inner(A.vector(vs[0]),A.vector(vs[1])))} 1`);return true;
  }
  if(['cga-join','cga-meet','cga-expansion'].includes(t)){
    inputs(m,scene);const [ka,kb]=m.grades,first=vs.slice(0,ka),second=vs.slice(ka,ka+kb),x=A.blade(s.flatA&&ka>1?[...first.slice(0,-1),basis(n,n-1)]:first),y=A.blade(s.flatB&&kb>1?[...second.slice(0,-1),basis(n,n-1)]:second),xn=objectSymbol(ka,s.flatA),base=objectSymbol(kb,s.flatB),yn=xn===base?`${base}₂`:base,op=t==='cga-join'?'∧':t==='cga-meet'?'∨':'∧',d=t==='cga-expansion'?A.dual(y,true):y,expr=`${xn} ${op} ${yn}${t==='cga-expansion'?'^{☆}':''}`,out=op==='∨'?A.antiwedge(x,y):A.wedge(x,d);
    for(const [u,label,color] of [[x,xn,colors.a],[y,yn,colors.b],[out,expr,colors.result]]){if(s.spatial)spatialRound(scene,u,A,hat(label),color);embeddedRound(scene,u,A,label,color);if(s.homogeneous)scene.element(u,A,label,{color,alpha:.06});m.row(label,m.mv(u));}
    if(t==='cga-expansion'&&s.dual){scene.element(d,A,`${yn}^{☆}`,{color:colors.purple,dashed:true,alpha:.08});if(s.spatial)spatialRound(scene,d,A,hat(`${yn}^{☆}`),colors.purple);embeddedRound(scene,d,A,`${yn}^{☆}`,colors.purple);}
    m.formula=`${V(xn)} ${op} ${V(yn)}${t==='cga-expansion'?'<sup>☆</sup>':''}`;return true;
  }
  return false;
}
const roundSymbol=k=>['1','p','d','c','s'][k]||'𝟙';
const objectSymbol=(k,flat=false)=>flat&&k>1?['','','p','l','g'][k]||'𝟙':roundSymbol(k);
export function embeddedRound(scene,u,A,label,color){
  const info=cgaRound(u,A);if(!info||info.radius2< -EPS)return info;
  if(info.flat){const B=info.alg,fs=B.factor(info.blade),h=B.n-1,pivot=fs.find(v=>Math.abs(v[h])>EPS);if(!pivot)return info;const center=scale(pivot,1/pivot[h]).slice(0,h),dirs=[];for(const f of fs){let d=sub(f,scale(pivot,f[h]/pivot[h])).slice(0,h);for(const v of dirs)d=sub(d,scale(v,dot(v,d)));if(length(d)>EPS)dirs.push(unit(d));}
    const mapped=x=>embed(x,A.n);if(!dirs.length)scene.point(mapped(center),label,color);
    for(let axis=0;axis<dirs.length;axis++)for(let offset=dirs.length===1?0:-2;offset<= (dirs.length===1?0:2);offset+=.8){let prev=null;for(let t=-3;t<=3;t+=.08){const p=add(center,add(scale(dirs[axis],t),scale(dirs[(axis+1)%dirs.length],offset)));if(length(p)>4){prev=null;continue;}const q=mapped(p);if(prev)scene.line(prev,q,color,offset===0?2:1,offset!==0,.75);prev=q;}}scene.label(mapped(center),label,color,{dy:-15});return info;
  }
  const radius=Math.sqrt(Math.max(0,info.radius2)),dirs=info.dirs,center=info.center.slice(0,A.n-2),q=x=>embed(x,A.n);
  if(A.gradeOf(u)===1){scene.point(A.coordinates(u),label,color,5);return info;}
  const point=d=>q(add(center,scale(d.slice(0,A.n-2),radius)));
  if(dirs.length===1){scene.line(point(dirs[0]),point(scale(dirs[0],-1)),color,2);scene.point(point(dirs[0]),label,color,5);}
  else if(dirs.length===2){let previous=null;for(let i=0;i<=72;i++){const t=i*Math.PI/36,p=point(add(scale(dirs[0],Math.cos(t)),scale(dirs[1],Math.sin(t))));if(previous)scene.line(previous,p,color,2);previous=p;}scene.label(point(dirs[0]),label,color,{dy:-13});}
  else if(dirs.length>=3){const cloud=[];for(let axis=0;axis<3;axis++){let previous=null;for(let i=0;i<=64;i++){const t=i*Math.PI/32,p=point(add(scale(dirs[axis],Math.cos(t)),scale(dirs[(axis+1)%3],Math.sin(t))));if(previous)scene.line(previous,p,color,1.8);previous=p;cloud.push(p);}}for(let lat=1;lat<6;lat++){let previous=null;for(let i=0;i<=48;i++){const a=lat*Math.PI/6,t=i*Math.PI/24,p=point(add(scale(dirs[2],Math.cos(a)),add(scale(dirs[0],Math.sin(a)*Math.cos(t)),scale(dirs[1],Math.sin(a)*Math.sin(t)))));cloud.push(p);if(previous)scene.line(previous,p,color,.8,true,.5);previous=p;}}scene.commands.push({kind:'hull',points:cloud,color,alpha:.035});scene.label(q(center),label,color,{dy:-15});}
  return info;
}
