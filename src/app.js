import { chapters, notice, V, E, I, S, R, L, GP, AGP } from './content.js';
import { Algebra, basis, formatMV, indicesBlade, basisOrder } from './algebra.js';
import { Scene } from './scene.js';
import { FigureModel } from './figures.js';
import { activeInputs } from './lesson-revisions.js';
import { defaultView } from './camera.js';
import { mathTokens } from './math-label.js';
const $=s=>document.querySelector(s),params=new URLSearchParams(location.search),slug=location.pathname.split('/').pop()?.replace(/\.html$/,'');
const chapter=chapters.find(c=>c.id===(params.get('chapter')||slug))||chapters[0],index=chapters.indexOf(chapter);
let dimension=params.get('dim')==='4'?4:3,mounts=[];
const href=(ch,anchor='')=>`./${ch.id}.html?dim=${dimension}${anchor?'#'+anchor:''}`;
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
function labelHTML(text){const escape=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));const render=tokens=>tokens.map(t=>{const body=t.children?render(t.children):escape(t.text);if(t.accent)return `<span class="${t.accent==='hat'?'hat':t.accent==='bar'?'right-complement':'left-complement'}">${body}</span>`;if(t.dy)return `<${t.dy>0?'sub':'sup'} style="font-size:${t.size/18}em">${body}</${t.dy>0?'sub':'sup'}>`;return t.bold?`<b>${body}</b>`:body;}).join('');return render(mathTokens(String(text)));}
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
    if(spec.key==='parameter2'&&+model.state.grade!==3)continue;
    if(spec.key==='flatA'&&model.grades?.[0]===1||spec.key==='flatB'&&model.grades?.[1]===1)continue;
    if(spec.key==='scalar'&&['complement','dual'].includes(model.def.type)&&![0,model.n].includes(+model.state.grade))continue;
    if(spec.type==='button'){const button=el('button','wide-button',spec.label);button.addEventListener('click',()=>{if(spec.key==='animate'){mount.playing=!mount.playing;if(mount.playing){if(model.state.time>=1)model.state.time=0;animate(mount);}button.textContent=mount.playing?'Pause':'Play';}else{model.update(spec.key);renderControls(mount);mount.scene.render();}});side.append(button);continue;}
    const row=el('div',spec.type==='check'?'toggle':'control-row'),id=`${model.def.id}-${spec.key}`;let input;
    const label=el('label','',spec.label);label.htmlFor=id;
    if(spec.type==='check'){input=el('input');input.type='checkbox';input.checked=!!model.state[spec.key];row.append(input,label);}
    else if(spec.type==='select'){input=el('select');for(const [value,text] of spec.options){const opt=el('option','',text);opt.value=value;input.append(opt);}input.value=model.state[spec.key];row.append(label,input);}
    else{input=el('input');input.type='range';input.min=spec.min;input.max=spec.max;input.step=spec.step;input.value=model.state[spec.key];const wrap=el('div','range-row'),out=el('output','',Number(input.value).toFixed(spec.key==='frame'?0:2));input.addEventListener('input',()=>out.textContent=Number(input.value).toFixed(spec.key==='frame'?0:2));wrap.append(input,out);row.append(label,wrap);}
    input.id=id;input.dataset.control=spec.key;
    input.addEventListener(spec.type==='range'?'input':'change',()=>{let value=spec.type==='check'?input.checked:spec.type==='range'?+input.value:input.value;model.update(spec.key,value);if(['grade','count','pair','case','flat','flatA','flatB'].includes(spec.key))renderControls(mount);mount.scene.render();});side.append(row);
  }
  if(model.def.type==='basis'){}else activeInputs(model).forEach(i=>{const v=model.vectors[i];
    const block=el('div','coord-editor');block.append(el('div','coord-label',`${model.names[i]||String.fromCharCode(97+i)} · coordinates`));const grid=el('div','coord-inputs');grid.style.gridTemplateColumns=`repeat(${model.n},minmax(0,1fr))`;
    v.forEach((value,j)=>{const label=el('label','',['x','y','z','w','u'][j]),input=el('input');input.type='number';input.step='.05';input.value=Number(value.toFixed(2));input.dataset.vector=i;input.dataset.coordinate=j;input.setAttribute('aria-label',`${model.names[i]} ${['x','y','z','w','u'][j]}`);
      if(model.cga&&model.def.type!=='roundpoint'&&j>=model.n-2){input.readOnly=true;input.title='Null point · dependent coordinate';}
      const edit=()=>{const val=input.valueAsNumber;if(!Number.isFinite(val))return;const next=[...model.vectors[i]];next[j]=Math.max(-6,Math.min(6,val));model.move(i,next);mount.scene.render();if(input!==document.activeElement)input.value=Number(model.vectors[i][j].toFixed(2));};input.addEventListener('input',edit);input.addEventListener('change',edit);label.append(input);grid.append(label);});block.append(grid);side.append(block);
  });
  mount.result=el('div','result');side.append(mount.result);
}
function sync(mount){
  const {model}=mount;mount.equation.innerHTML=model.formula;
  mount.result.replaceChildren();for(const {label,value} of model.rows){const heading=el('div','value-title');heading.innerHTML=labelHTML(label);mount.result.append(heading);const line=el('div','math');if(typeof value==='string'&&value.includes('<span'))line.innerHTML=value;else line.textContent=value??'—';mount.result.append(line);}
  if(model.status)mount.result.append(el('p','status',model.status));
  mount.side.querySelectorAll('[data-vector]').forEach(input=>{if(input!==document.activeElement)input.value=Number(model.vectors[+input.dataset.vector][+input.dataset.coordinate].toFixed(2));});
  const radius=mount.side.querySelector('[data-control=radius2]');if(radius&&radius!==document.activeElement)radius.value=model.state.radius2;
  if(radius){radius.disabled=Math.abs(model.vectors[0][model.n-2])<1e-9;radius.nextElementSibling.textContent=radius.disabled?'—':Number(model.state.radius2).toFixed(2);}
  const time=mount.side.querySelector('[data-control=time]');if(time&&mount.playing){time.value=model.state.time;time.nextElementSibling.textContent=model.state.time.toFixed(2);}
}
function animate(mount){if(!mount.playing)return;mount.model.state.time=Math.min(1,mount.model.state.time+.005);mount.scene.render();if(mount.model.state.time<1)mount.animation=requestAnimationFrame(()=>animate(mount));else{mount.playing=false;const b=[...mount.side.querySelectorAll('button')].find(b=>/Pause/.test(b.textContent));if(b)b.textContent='Play';}}

function dimensionName(def,dim){
  const cga=chapter.group.includes('CGA');
  if(cga)return dim===3?'2D Round · 4D algebra':'3D Round · 5D algebra';
  return chapter.group==='Exterior Algebra'||chapter.group==='Euclidean Geometric Algebra'?
    dim+'D':dim===3?'2D Flat · 3D algebra':'3D Flat · 4D algebra';
}
function interactionGuide(model){
  const extra=model.n>3;
  return '<b>Left drag / 1 finger</b> Rotate · 回転'+(extra?' (extra axes fixed · 追加軸の表示方向は固定)':' (e₃ upright · e₃は上)')+
    (extra?'<br><b>Right ↑↓ / 2 fingers ↑↓</b> Fold extra axes upward · 追加軸を上へ（0–90°）':'<br><b>Right drag</b> No orbit · 回転なし')+
    (model.cga?'<br><b>Right ←→ / 2 fingers ←→</b> Exchange origin / infinity axes · 追加の二軸を切替':extra?'<br><b>Right ←→ / 2 fingers ←→</b> No orbit · 回転なし':'')+
    '<br><b>Tip drag</b> Move · 移動　<b>Shift + left / right</b> xy / other axes'+
    '<br><b>Click / tap</b> Activate wheel / pinch · ズーム操作を有効化　<b>Esc / tap outside</b> Release';
}
function mountFigure(def,i){
  const fixedDimension=def.id==='plane'||def.id==='sphere';
  const article=el('article','figure');article.id=def.id;
  const head=el('div','figure-head'),title=el('div');
  title.append(el('div','figure-number',`FIGURE ${String(index+1).padStart(2,'0')}.${String(i+1).padStart(2,'0')}`),el('h2','',def.title));
  const eq=el('div','equation');eq.innerHTML=def.formula;title.append(eq);
  const localSwitch=el('div','dimension-switch');localSwitch.setAttribute('role','group');localSwitch.setAttribute('aria-label',def.title+' dimension');
  const buttons=[];for(const dim of fixedDimension?[4]:[3,4]){const button=el('button','',dimensionName(def,dim));button.dataset.figureDim=dim;buttons.push(button);localSwitch.append(button);}
  head.append(title,localSwitch);article.append(head);
  const body=el('div','figure-body'),wrap=el('div','canvas-wrap'),canvas=el('canvas','scene-canvas');canvas.tabIndex=0;
  canvas.setAttribute('aria-label',def.title+': drag vector tips, use the coordinate inputs, or press Home to reset the view.');canvas.setAttribute('role','img');
  canvas.textContent='Interactive diagram. Coordinates and values are available alongside the canvas.';
  const viewLabel=el('div','axes-view'),guide=el('div','canvas-guide');wrap.append(canvas,viewLabel,guide);
  const toolbar=el('div','canvas-tools'),viewButton=el('button','','View ↺'),reset=el('button','','Reset'),activation=el('button','','Activate zoom'),projection=el('select'),exportButton=el('button','','PNG');
  projection.setAttribute('aria-label',def.title+' camera projection');projection.innerHTML='<option value="perspective">Perspective</option><option value="orthographic">Orthographic</option>';
  toolbar.append(projection,activation,viewButton,reset,exportButton);wrap.append(toolbar);
  const side=el('div','figure-side');body.append(wrap,side);article.append(body);
  const caption=el('div','figure-caption');caption.innerHTML=`${def.ja}<br><span class="en">${def.en}</span><div class="legend"><span>CCW / inward orientation</span><span>opposite orientation</span><span>dependent factors / loci · dashed</span></div><p class="reference">${def.ref}</p>`;
  article.append(caption);$('#figures').append(article);
  const mount={article,canvas,side,equation:eq,saved:new Map()};mounts.push(mount);
  function selectDimension(dim){
    mount.playing=false;cancelAnimationFrame(mount.animation);
    if(mount.scene){mount.saved.set(mount.dimension,{model:mount.model,view:{...mount.scene.view}});mount.scene.dispose();}
    mount.dimension=dim;const saved=mount.saved.get(dim);mount.model=saved?.model||new FigureModel(def,dim);
    const model=mount.model;renderControls(mount);
    mount.scene=new Scene(canvas,model.n,scene=>{model.paint(scene);sync(mount);},(j,next)=>model.move(j,next));
    mount.scene.isCGA=model.cga;mount.scene.section=def.type==='null';mount.scene.view=saved?.view||defaultView(model.n,model.cga,mount.scene.section);
    mount.scene.onActivation=value=>{activation.textContent=value?'Release zoom':'Activate zoom';activation.setAttribute('aria-pressed',String(value));};mount.scene.activate(false);
    projection.value=mount.scene.view.perspective?'perspective':'orthographic';
    viewLabel.textContent=model.n+'D → 3D';guide.innerHTML=interactionGuide(model);
    buttons.forEach(b=>{const active=+b.dataset.figureDim===dim;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    mount.scene.render();
  }
  buttons.forEach(b=>b.addEventListener('click',()=>selectDimension(+b.dataset.figureDim)));
  projection.addEventListener('change',()=>{mount.scene.view.perspective=projection.value==='perspective';mount.scene.render();});
  let requestedActivation;activation.addEventListener('pointerdown',()=>{requestedActivation=activation.getAttribute('aria-pressed')!=='true';});
  activation.addEventListener('click',()=>{const next=requestedActivation??activation.getAttribute('aria-pressed')!=='true';requestedActivation=undefined;if(next)canvas.focus({preventScroll:true});mount.scene.activate(next);});
  viewButton.addEventListener('click',()=>mount.scene.resetView());
  reset.addEventListener('click',()=>{mount.playing=false;cancelAnimationFrame(mount.animation);mount.model.reset();mount.scene.factorFrames.clear();renderControls(mount);mount.scene.render();});
  exportButton.addEventListener('click',()=>{
    const copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height+110;
    const ctx=copy.getContext('2d');ctx.fillStyle='#fcfbf7';ctx.fillRect(0,0,copy.width,copy.height);ctx.fillStyle='#173e35';ctx.font='24px "STIX Two Math"';ctx.fillText(def.title+' · '+dimensionName(def,mount.dimension),18,32);ctx.font='20px "STIX Two Math"';ctx.fillText(eq.textContent,18,65);ctx.drawImage(canvas,0,95);
    const dialog=el('dialog','diagram-export'),close=el('button','','Close'),img=el('img'),save=el('a','','Save PNG');img.src=copy.toDataURL('image/png');img.alt=def.title+' diagram';save.href=img.src;save.download=def.id+'.png';dialog.append(close,save,img);document.body.append(dialog);close.addEventListener('click',()=>{dialog.close();dialog.remove();});dialog.showModal();
  });
  selectDimension(fixedDimension?4:dimension);
}
function render(){
  for(const mount of mounts){mount.scene.dispose();cancelAnimationFrame(mount.animation);mount.playing=false;}mounts=[];$('#figures').replaceChildren();navigation();
  $('#chapter-caption').textContent=chapter.group+' / '+chapter.figures.length+' studies';
  document.querySelectorAll('[data-dim]').forEach(b=>{b.textContent=dimensionName(chapter.figures[0],+b.dataset.dim);b.classList.toggle('active',+b.dataset.dim===dimension);b.setAttribute('aria-pressed',String(+b.dataset.dim===dimension));});
  chapter.figures.forEach(mountFigure);supplement();
  document.fonts.ready.then(()=>mounts.forEach(m=>m.scene.render()));
}
document.querySelectorAll('[data-dim]').forEach(b=>b.addEventListener('click',()=>{const scroll=window.scrollY;dimension=+b.dataset.dim;const url=new URL(location.href);url.searchParams.set('dim',dimension);history.replaceState(null,'',url);render();window.scrollTo(0,scroll);}));
document.addEventListener('pointerdown',e=>{for(const m of mounts)if(e.target!==m.canvas&&!m.article.querySelector('.canvas-tools').contains(e.target))m.scene.activate(false);});
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
  if(chapter.id==='measure')html=`<div class="formula-block"><h3>Metric definitions</h3><div class="equation">${V('a')} • ${V('b')} = (${V('a')}<sup>T</sup>G${V('b')})${S}　　${V('a')} ∘ ${V('b')} = (${V('a')}<sup>T</sup>𝔾${V('b')})${I}</div><p>Dot compares bulk; Antidot compares weight. / Dotはbulk、Antidotはweightを比べます。</p><h3>Geometric Norm / Homogeneous magnitude</h3><div class="equation">‖${V('u')}‖<sub>●</sub> = √(${V('u')}<sup>T</sup>G${V('u')})${S}　　‖${V('u')}‖<sub>○</sub> = √(${V('u')}<sup>T</sup>𝔾${V('u')})${I}　　‖${V('u')}‖ = ‖${V('u')}‖<sub>●</sub> + ‖${V('u')}‖<sub>○</sub></div></div>`;
  if(chapter.id==='distance')html=`<div class="formula-block"><h3>Homogeneous distance · (2.98)</h3><div class="equation">d(${V('a')}, ${V('b')}) = ‖att(${V('a')} ∧ ${V('b')})‖<sub>●</sub>${S} + ‖${V('a')} ∧ att(${V('b')})‖<sub>○</sub>${I}</div><p>Projecting a homogeneous magnitude means taking the scalar coefficient divided by the antiscalar coefficient. / 表示されたscalar係数をantiscalar係数で割ると、投影した距離になります。</p></div>`;
  if(chapter.id==='projective-products'||chapter.id==='transforms')html=`<div class="formula-block"><h3>Products with the projective metric</h3><div class="equation">${V('a')} ${GP} ${V('b')} = (${V('a')} • ${V('b')}) + ${V('a')} ∧ ${V('b')}</div><div class="equation">${V('A')} ${AGP} ${V('B')} = <span class="left-complement">${R('A')} ${GP} ${R('B')}</span></div><div class="equation">${V('g')} = ${L('a')}　　${V('v₁')} = ${V('g')} ${AGP} ${V('v₀')} ${AGP} ${V('g')} / (${V('a')} • ${V('a')})</div><p>The second formula holds for all multivectors; the first displayed decomposition is for vectors. / 一つ目の分解式はvectorの場合。Antiproductの定義は一般のmultivectorに対して使えます。<br>In 2D and 3D Euclidean space, proper isometries have motor representations; orientation-reversing isometries have flector representations. Flectors live in a different connected component from the identity. / 2Dでも3Dでも、向きを保つEuclidean isometryはMotor、反転させるものはFlectorで表せます。2DのMotorには回転と平行移動、Flectorには鏡映と映進が含まれます。鏡映をidentityから連続なisometryだけで補間することはできません。</p></div>`;
  if(chapter.group.includes('CGA'))html=`<div class="formula-block"><h3>Conformal notation</h3><div class="equation">𝔾 = −G　　${V('u')}<sup>☆</sup> = −${V('u')}<sup>★</sup>　　${V('a')} ∘ ${V('b')} = −<span class="right-complement">${V('a')} • ${V('b')}</span></div><div class="equation">car(${V('u')}) = ${V('u')} ∧ ${E(n+1)}　　ccr(${V('u')}) = ${V('u')}<sup>☆</sup> ∧ ${E(n+1)}</div><div class="equation">con(${V('u')}) = ${V('u')} ∧ car(${V('u')})<sup>☆</sup></div><div class="equation">par(${V('u')}) = (−1)<sup>gr(u)+1</sup> con(${V('u')}<sup>☆</sup>) ∨ car(${V('u')})</div><div class="equation">att(${V('u')}) = ${V('u')} ∨ <span class="right-complement">${E(n)}</span>　　${V('u')}<sup>†</sup> = ${V('u')}<sub>●</sub> + ${V('u')}<sub>○</sub> − ${V('u')}<sub>■</sub> − ${V('u')}<sub>□</sub></div><p>${n===3?'2D Round Geometry: e₃ is the origin axis, e₄ is infinity.':'3D Round Geometry: e₄ is the origin axis, e₅ is infinity.'} / 追加軸はorigin axis / Point at infinityです。図の長さはそれぞれ1/√2、√2ですが、計量上の長さではありません。</p><p>${E(n+1)} is the direction-independent point at infinity. An element with it as a wedge factor represents Flat Geometry. / ${E(n+1)}は向きに依存しない特殊な無限遠点。Wedgeのfactorとして含むelementはFlat Geometryです。</p><p>Carrier is the smallest flat geometry containing the object. Cocarrier is perpendicular and passes through its center. Container is the smallest containing circle / sphere. / Carrierは最小のFlat geometry、Cocarrierはそれに直交して中心を通るもの、Containerは最小のCircle / Sphere。</p><p>Round point radius uses +r² in its infinity coefficient; sphere-vector (dual) conventions often use −r². / 本書のRound pointは無限遠成分に+r²を使います。</p></div>`;
  $('#supplement').innerHTML=html;if(chapter.id==='transforms')$('#figures').before($('#supplement'));
  if(chapter.id==='euclidean'){const draw=()=>{const alg=new Algebra(n),bs=basisOrder(n),op=$('#table-operation').value;$('#multiplication-table').innerHTML=`<table class="multiplication"><thead><tr><th>⟑</th>${bs.map(s=>`<th>${s.length===n?'𝟙':s?E(s):S}</th>`).join('')}</tr></thead><tbody>${bs.map(x=>`<tr><th>${x.length===n?'𝟙':x?E(x):S}</th>${bs.map(y=>`<td>${formatMV(alg.gp(op==='reverse'?alg.reverse(indicesBlade(alg,x)):indicesBlade(alg,x),indicesBlade(alg,y)),alg)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;};$('#table-operation').addEventListener('change',draw);draw();}
}
render();
if(location.hash)requestAnimationFrame(()=>document.getElementById(location.hash.slice(1))?.scrollIntoView());
// Read-only developer hook for the local numerical/browser verification suite.
window.atlas={get mounts(){return mounts;},get dimension(){return dimension;}};
