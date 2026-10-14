import { chapters, notice, V, E, I, S, R, L, GP, AGP } from './content.js';
import { Algebra, basis, formatMV, indicesBlade, basisOrder } from './algebra.js';
import { Scene } from './scene.js';
import { FigureModel } from './figures.js';
const $=s=>document.querySelector(s),params=new URLSearchParams(location.search),slug=location.pathname.split('/').pop()?.replace(/\.html$/,'');
const chapter=chapters.find(c=>c.id===(params.get('chapter')||slug))||chapters[0],index=chapters.indexOf(chapter);
let dimension=params.get('dim')==='4'?4:3,mounts=[];
const href=(ch,anchor='')=>`./${ch.id}.html?dim=${dimension}${anchor?'#'+anchor:''}`;
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
document.title=`${chapter.title} · Geometric Algebra Visual Atlas`;
$('#intro').innerHTML=`<p class="eyebrow">${index===0?'AN INTERACTIVE COMPANION':chapter.group.toUpperCase()}　 /　 ${String(index+1).padStart(2,'0')}</p><div class="intro-grid"><div><h1>${index===0?'See the algebra.<br><em>Move the geometry.</em>':chapter.title}</h1><p class="intro-copy">${chapter.ja}<br><span class="en">${chapter.subtitle}</span></p></div>${notice}</div>`;
$('#help-button').addEventListener('click',()=>$('#controls-dialog').showModal());
$('#controls-dialog').addEventListener('click',e=>{if(e.target===$('#controls-dialog'))$('#controls-dialog').close();});
function navigation(){let group='';$('#navigation').replaceChildren();chapters.forEach((ch,i)=>{if(ch.group!==group){$('#navigation').append(el('div','nav-group',ch.group));group=ch.group;}const link=el('a',`nav-link${ch===chapter?' active':''}`);link.href=href(ch);link.innerHTML=`<span class="nav-num">${String(i+1).padStart(2,'0')}</span><span>${ch.title}</span>`;if(ch===chapter)link.setAttribute('aria-current','page');$('#navigation').append(link);});
  $('#pager').innerHTML=`${index?`<a href="${href(chapters[index-1])}"><small>← PREVIOUS STUDY</small>${chapters[index-1].title}</a>`:'<span></span>'}${index<chapters.length-1?`<a href="${href(chapters[index+1])}" style="text-align:right"><small>NEXT STUDY →</small>${chapters[index+1].title}</a>`:''}`;
}
function renderControls(mount){
  const {model,side}=mount;side.replaceChildren();
  for(const spec of model.controls){
    if(spec.key==='scalar'&&['complement','dual'].includes(model.def.type)&&![0,model.n].includes(+model.state.grade))continue;
    if(spec.type==='button'){const button=el('button','wide-button',spec.label);button.addEventListener('click',()=>{if(spec.key==='animate'){mount.playing=!mount.playing;if(mount.playing){if(model.state.time>=1)model.state.time=0;animate(mount);}button.textContent=mount.playing?'Pause':'Play';}else{model.update(spec.key);renderControls(mount);mount.scene.render();}});side.append(button);continue;}
    const row=el('div',spec.type==='check'?'toggle':'control-row'),id=`${model.def.id}-${spec.key}`;let input;
    const label=el('label','',spec.label);label.htmlFor=id;
    if(spec.type==='check'){input=el('input');input.type='checkbox';input.checked=!!model.state[spec.key];row.append(input,label);}
    else if(spec.type==='select'){input=el('select');for(const [value,text] of spec.options){const opt=el('option','',text);opt.value=value;input.append(opt);}input.value=model.state[spec.key];row.append(label,input);}
    else{input=el('input');input.type='range';input.min=spec.min;input.max=spec.max;input.step=spec.step;input.value=model.state[spec.key];const wrap=el('div','range-row'),out=el('output','',Number(input.value).toFixed(spec.key==='frame'?0:2));input.addEventListener('input',()=>out.textContent=Number(input.value).toFixed(spec.key==='frame'?0:2));wrap.append(input,out);row.append(label,wrap);}
    input.id=id;input.dataset.control=spec.key;
    input.addEventListener(spec.type==='range'?'input':'change',()=>{let value=spec.type==='check'?input.checked:spec.type==='range'?+input.value:input.value;model.update(spec.key,value);if(['grade','count'].includes(spec.key))renderControls(mount);mount.scene.render();});side.append(row);
  }
  if(model.def.type==='basis'||(['complement','dual'].includes(model.def.type)&&[0,model.n].includes(+model.state.grade))){}else model.vectors.forEach((v,i)=>{
    const block=el('div','coord-editor');block.append(el('div','coord-label',`${model.names[i]||String.fromCharCode(97+i)} · coordinates`));const grid=el('div','coord-inputs');grid.style.gridTemplateColumns=`repeat(${model.n},minmax(0,1fr))`;
    v.forEach((value,j)=>{const label=el('label','',['x','y','z','w','u'][j]),input=el('input');input.type='number';input.step='.05';input.value=Number(value.toFixed(2));input.dataset.vector=i;input.dataset.coordinate=j;input.setAttribute('aria-label',`${model.names[i]} ${['x','y','z','w','u'][j]}`);
      if(model.cga&&model.def.type!=='roundpoint'&&j>=model.n-2){input.readOnly=true;input.title='Null point · dependent coordinate';}
      input.addEventListener('change',()=>{const val=Number(input.value);if(!Number.isFinite(val)){input.value=model.vectors[i][j];return;}const next=[...model.vectors[i]];next[j]=Math.max(-6,Math.min(6,val));model.move(i,next);mount.scene.render();input.value=Number(model.vectors[i][j].toFixed(2));});label.append(input);grid.append(label);});block.append(grid);side.append(block);
  });
  mount.result=el('div','result');side.append(mount.result);
}
function sync(mount){
  const {model}=mount;mount.equation.innerHTML=model.formula;
  mount.result.replaceChildren();for(const {label,value} of model.rows){mount.result.append(el('div','value-title',label));const line=el('div','math');if(typeof value==='string'&&value.includes('<span'))line.innerHTML=value;else line.textContent=value??'—';mount.result.append(line);}
  if(model.status)mount.result.append(el('p','status',model.status));
  mount.side.querySelectorAll('[data-vector]').forEach(input=>{if(input!==document.activeElement)input.value=Number(model.vectors[+input.dataset.vector][+input.dataset.coordinate].toFixed(2));});
  const radius=mount.side.querySelector('[data-control=radius2]');if(radius&&radius!==document.activeElement)radius.value=model.state.radius2;
  const time=mount.side.querySelector('[data-control=time]');if(time&&mount.playing){time.value=model.state.time;time.nextElementSibling.textContent=model.state.time.toFixed(2);}
}
function animate(mount){if(!mount.playing)return;mount.model.state.time=Math.min(1,mount.model.state.time+.005);mount.scene.render();if(mount.model.state.time<1)mount.animation=requestAnimationFrame(()=>animate(mount));else{mount.playing=false;const b=[...mount.side.querySelectorAll('button')].find(b=>/Pause/.test(b.textContent));if(b)b.textContent='Play';}}
function render(){
  for(const mount of mounts){mount.scene.dispose();cancelAnimationFrame(mount.animation);mount.playing=false;}mounts=[];$('#figures').replaceChildren();navigation();
  const available=chapter.figures.filter(def=>!(dimension===3&&def.type==='projection'&&def.case!==1));
  const spaceName=chapter.group.includes('CGA')?(dimension===3?'2D ROUND GEOMETRY · 4D ALGEBRA':'3D ROUND GEOMETRY · 5D ALGEBRA'):chapter.group==='Exterior Algebra'?`${dimension}D EXTERIOR ALGEBRA`:chapter.group==='Euclidean Geometric Algebra'?`${dimension}D EUCLIDEAN GEOMETRIC ALGEBRA`:(dimension===3?'3D ALGEBRA · 2D FLAT GEOMETRY':'4D ALGEBRA · 3D FLAT GEOMETRY');
  $('#chapter-caption').textContent=`${spaceName}　/　${available.length} STUDIES`;
  document.querySelectorAll('[data-dim]').forEach(b=>{const d=+b.dataset.dim;b.textContent=chapter.group.includes('CGA')?(d===3?'2D Round · 4D':'3D Round · 5D'):(d===3?'3D':'4D');b.classList.toggle('active',d===dimension);b.setAttribute('aria-pressed',String(d===dimension));});
  if(available.length!==chapter.figures.length){const message=el('div','notice');message.innerHTML='2D Flat GeometryではPointとLineの組み合わせを表示します。4Dに切り替えるとPlaneを含む3種類すべてを見られます。<br>2D Flat Geometry has one nontrivial case here. Switch to 4D for all three cases involving points, lines, and planes.';$('#figures').append(message);}
  available.forEach((def)=>{
    const i=chapter.figures.indexOf(def);
    const model=new FigureModel(def,dimension),article=el('article','figure');article.id=def.id;
    const figureTitle=dimension===3&&def.id==='sphere'?'Circle / Line · 2D counterpart':dimension===3&&def.id==='plane'?'Whole Flat Space · Antiscalar':def.title;
    const head=el('div','figure-head'),title=el('div');title.append(el('div','figure-number',`FIGURE ${String(index+1).padStart(2,'0')}.${String(i+1).padStart(2,'0')}`),el('h2','',figureTitle));const eq=el('div','equation');eq.innerHTML=def.formula;title.append(eq);head.append(title,el('span','badge',model.cga?'CGA':model.alg.kind==='rigid'?'RGA':model.alg.kind==='euclidean'&&chapter.id!=='wedge'&&chapter.id!=='complements'?'g = identity':'EXTERIOR'));article.append(head);
    const body=el('div','figure-body'),wrap=el('div','canvas-wrap'),canvas=el('canvas','scene-canvas');canvas.tabIndex=0;canvas.setAttribute('aria-label',`${def.title}: drag vector tips or use the coordinate inputs. Use Home to reset the view.`);canvas.setAttribute('role','img');canvas.textContent='Interactive geometric algebra diagram. Coordinates and values are available alongside this canvas.';
    wrap.append(canvas,el('div','axes-view',model.cga?`${model.n}D → 3D VIEW`:`${model.n}D VIEW`),el('div','canvas-note','DRAG TIPS TO MOVE　·　DRAG SPACE TO ORBIT'));
    const toolbar=el('div','canvas-tools'),viewButton=el('button','','View ↺'),reset=el('button','','Reset');toolbar.append(viewButton,reset);wrap.append(toolbar);
    const side=el('div','figure-side');body.append(wrap,side);article.append(body);
    const caption=el('div','figure-caption');caption.innerHTML=`${def.ja}<br><span class="en">${def.en}</span><div class="legend"><span>CCW / inward orientation</span><span>opposite orientation</span><span>dependent factors / loci · dashed</span></div><details><summary>Reference & notation</summary><p>${def.ref} · <a href="https://projectivegeometricalgebra.org/" target="_blank" rel="noopener">Author's resources</a><br>${model.cga?`Extra axes: ${E(model.n-1)} = origin axis, ${E(model.n)} = point at infinity. Null inputs are constrained to the Horosphere. / 追加軸の番号は空間の次元に応じて変わります。`:'Bold symbols are algebraic elements; coordinate coefficients are scalars. / 太字は代数のelement、成分の係数はscalar。'}<br>Higher-dimensional surfaces are shown through a 3D projection; dashed geometry may collapse in a special view. / 高次元の面は3次元への射影で表示され、視点によって重なります。</p></details>`;article.append(caption);$('#figures').append(article);
    const mount={model,article,canvas,side,equation:eq};mounts.push(mount);renderControls(mount);
    mount.scene=new Scene(canvas,model.n,scene=>{model.paint(scene);sync(mount);},(j,next)=>model.move(j,next));mount.scene.isCGA=model.cga;
    if(model.cga){mount.scene.view.extra=model.n===5?Math.PI/2:0;mount.scene.view.conformal=.45;if(def.type==='null')mount.scene.view.yaw=.2;}
    viewButton.addEventListener('click',()=>{mount.scene.resetView();if(model.cga){mount.scene.view.extra=model.n===5?Math.PI/2:0;mount.scene.view.conformal=.45;mount.scene.render();}});
    reset.addEventListener('click',()=>{mount.playing=false;cancelAnimationFrame(mount.animation);model.reset();renderControls(mount);mount.scene.render();});
    mount.scene.render();
  });supplement();
}
document.querySelectorAll('[data-dim]').forEach(b=>b.addEventListener('click',()=>{const scroll=window.scrollY;dimension=+b.dataset.dim;const url=new URL(location.href);url.searchParams.set('dim',dimension);history.replaceState(null,'',url);render();window.scrollTo(0,scroll);}));
function supplement(){
  let html='';const n=dimension;
  if(chapter.id==='complements'){
    html=`<div class="formula-block"><h3>Grade / Antigrade</h3><div class="equation">gr(${V('u')}) + ag(${V('u')}) = ${n}</div><table><tr><th>Grade</th><th>Element</th><th>Antigrade</th></tr>${Array.from({length:n+1},(_,k)=>`<tr><td>${k}</td><td>${k===0?'Scalar':k===n?'Antiscalar':['','Vector','Bivector','Trivector'][k]}</td><td>${n-k}</td></tr>`).join('')}</table><p>𝟙 = ${Array.from({length:n},(_,i)=>E(i+1)).join(' ∧ ')}. The orientation is a choice fixed here. / Antiscalarの向きは選択で、ここではこの順序に固定します。</p><div class="equation">Anti-operation:　f̄(${V('a')}, ${V('b')}) = <span class="left-complement">f(${R('a')}, ${R('b')})</span></div></div>`;
  }
  if(chapter.id==='euclidean'){
    html=`<div class="formula-block"><h3>Euclidean metric & inverse</h3><div class="equation">${E('i')} · ${E('j')} = δ<sub>ij</sub>　　${V('a')}<sup>−1</sup> = ${V('a')} / (${V('a')} · ${V('a')})　(${V('a')} ≠ 0)</div><p>A nonzero Euclidean vector has an inverse, including when a · b = 0. / 非零vectorにはinverseがあり、a · b = 0の場合も成り立ちます。</p><h3>Reverse</h3><p>Reverse the order of basis-vector products, then extend linearly. / Basis elementを作るvectorの積の順序を逆にし、線形に拡張します。</p><div class="equation">(${E('i')} ∧ ${E('j')} ∧ ⋯ ∧ ${E('k')})<sup>~</sup> = ${E('k')} ∧ ⋯ ∧ ${E('j')} ∧ ${E('i')}</div><div class="table-controls"><label for="table-operation">Multiplication table</label><select id="table-operation"><option value="gp">Geometric product</option><option value="reverse">Reverse × geometric product</option></select></div><div class="table-scroll" id="multiplication-table"></div></div>`;
  }
  if(chapter.id==='flat'){
    html=`<div class="formula-block"><h3>Bulk / Weight</h3><p>Bulk: basis terms without ${E(n)}. Weight: basis terms containing ${E(n)}.<br>${E(n)}を含まない項がBulk、含む項がWeight。この記述は標準の退化metricでの簡略化です。</p><div class="equation">${V('u')}<sub>●</sub> = G${V('u')}　　${V('u')}<sub>○</sub> = 𝔾${V('u')}　　G + 𝔾 = identity</div><div class="equation">g = diag(1, …, 1, 0)　　g${E('i')} = ${E('i')} (i &lt; ${n}),　g${E(n)} = 0</div><div class="equation">G(${V('a')} ∧ ${V('b')}) = (G${V('a')}) ∧ (G${V('b')})</div><div class="equation">𝔾 = <span class="left-complement">G<span class="right-complement">( · )</span></span>　　G𝔾 = 𝔾G = 0</div><table><tr><th>Object</th><th>Bulk</th><th>Weight</th></tr><tr><td>Point</td><td>Position</td><td>Homogeneous weight</td></tr><tr><td>Line</td><td>Moment</td><td>Direction</td></tr><tr><td>Plane · 4D</td><td>Offset from origin</td><td>Normal / orientation</td></tr></table><p>Only nonzero homogeneous elements represent projective objects. / Zero elementはprojective objectを表しません。表示用のHorizonの円・球は、方向を置く境界です。有限のunit sliceの境界と無限遠そのものは同じ点ではありません。</p></div>`;
  }
  if(chapter.id==='measure')html=`<div class="formula-block"><h3>Metric definitions</h3><div class="equation">${V('a')} • ${V('b')} = (${V('a')}<sup>T</sup>G${V('b')})${S}　　${V('a')} ∘ ${V('b')} = (${V('a')}<sup>T</sup>𝔾${V('b')})${I}</div><p>Vectors in the Dot figure; antivectors in the Antidot figure. / Dot図はvector、Antidot図はantivectorを使います。Dot / Antidotは同gradeのelementを比べるものとして示しています。</p></div>`;
  if(chapter.id==='distance')html=`<div class="formula-block"><h3>Homogeneous distance · (2.98)</h3><div class="equation">d(${V('a')}, ${V('b')}) = ‖att(${V('a')} ∧ ${V('b')})‖<sub>●</sub>${S} + ‖${V('a')} ∧ att(${V('b')})‖<sub>○</sub>${I}</div><p>Projecting a homogeneous magnitude means taking the scalar coefficient divided by the antiscalar coefficient. / 表示されたscalar係数をantiscalar係数で割ると、投影した距離になります。</p></div>`;
  if(chapter.id==='transforms')html=`<div class="formula-block"><h3>Products with the projective metric</h3><div class="equation">${V('a')} ${GP} ${V('b')} = (${V('a')} • ${V('b')}) + ${V('a')} ∧ ${V('b')}</div><div class="equation">${V('A')} ${AGP} ${V('B')} = <span class="left-complement">${R('A')} ${GP} ${R('B')}</span></div><div class="equation">${V('g')} = ${L('a')}　　${V('v₁')} = −${V('g')} ${AGP} ${V('v₀')} ${AGP} ${V('g')} / (${V('a')} • ${V('a')})</div><p>The second formula holds for all multivectors; the first displayed decomposition is for vectors. / 一つ目の分解式はvectorの場合。Antiproductの定義は一般のmultivectorに対して使えます。<br>In 3D Euclidean space, every isometry has a motor or flector representation. Flectors live in a different connected component from the identity. / 3次元Euclidean isometryはMotorかFlectorで表せます。鏡映をidentityから連続なisometryだけで補間することはできません。</p></div>`;
  if(chapter.group.includes('CGA'))html=`<div class="formula-block"><h3>Conformal notation</h3><div class="equation">𝔾 = −G　　${V('u')}<sup>☆</sup> = −${V('u')}<sup>★</sup>　　${V('a')} ∘ ${V('b')} = −<span class="right-complement">${V('a')} • ${V('b')}</span></div><div class="equation">car(${V('u')}) = ${V('u')} ∧ ${E(n+1)}　　ccr(${V('u')}) = ${V('u')}<sup>☆</sup> ∧ ${E(n+1)}</div><div class="equation">con(${V('u')}) = ${V('u')} ∧ car(${V('u')})<sup>☆</sup></div><div class="equation">par(${V('u')}) = (−1)<sup>gr(u)+1</sup> con(${V('u')}<sup>☆</sup>) ∨ car(${V('u')})</div><div class="equation">att(${V('u')}) = ${V('u')} ∨ <span class="right-complement">${E(n)}</span>　　${V('u')}<sup>†</sup> = ${V('u')}<sub>●</sub> + ${V('u')}<sub>○</sub> − ${V('u')}<sub>■</sub> − ${V('u')}<sub>□</sub></div><p>${n===3?'2D Round Geometry: e₃ is the origin axis, e₄ is infinity.':'3D Round Geometry: e₄ is the origin axis, e₅ is infinity.'} / 追加軸はorigin axis / Point at infinityです。図の長さはそれぞれ1/√2、√2ですが、計量上の長さではありません。</p><p>Carrier is the smallest flat geometry containing the object. Cocarrier is perpendicular and passes through its center. Container is the smallest containing circle / sphere. / Carrierは最小のFlat geometry、Cocarrierはそれに直交して中心を通るもの、Containerは最小のCircle / Sphere。</p><p>Round point radius uses +r² in its infinity coefficient; sphere-vector (dual) conventions often use −r². / 本書のRound pointは無限遠成分に+r²を使います。</p><p>任意のRound objectのProjection、残りのOperation dualityとTransversionは次の拡張対象です。 / General round projections, remaining operation duality, and transversion are not yet visualized.</p></div>`;
  $('#supplement').innerHTML=html;
  if(chapter.id==='euclidean'){const draw=()=>{const alg=new Algebra(n),bs=basisOrder(n),op=$('#table-operation').value;$('#multiplication-table').innerHTML=`<table class="multiplication"><thead><tr><th>⟑</th>${bs.map(s=>`<th>${s.length===n?'𝟙':s?E(s):S}</th>`).join('')}</tr></thead><tbody>${bs.map(x=>`<tr><th>${x.length===n?'𝟙':x?E(x):S}</th>${bs.map(y=>`<td>${formatMV(alg.gp(op==='reverse'?alg.reverse(indicesBlade(alg,x)):indicesBlade(alg,x),indicesBlade(alg,y)),alg)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;};$('#table-operation').addEventListener('change',draw);draw();}
}
render();
if(location.hash)requestAnimationFrame(()=>document.getElementById(location.hash.slice(1))?.scrollIntoView());
// Read-only developer hook for the local numerical/browser verification suite.
window.atlas={get mounts(){return mounts;},get dimension(){return dimension;}};
