import { supplementalHTML } from './supplement.js';
import { chapters, notice, V, E, I, S, R, L, GP, AGP } from './content.js';
import { Algebra, basis, formatMV, indicesBlade, basisOrder } from './algebra.js';
import { Scene } from './scene.js';
import { FigureModel } from './figures.js';
import { activeInputs } from './lesson-revisions.js';
import { defaultView } from './camera.js';
import { mathTokens,drawMath,measureMath } from './math-label.js';
const $=s=>document.querySelector(s),params=new URLSearchParams(location.search),slug=location.pathname.split('/').pop()?.replace(/\.html$/,'');
const chapter=chapters.find(c=>c.id===(params.get('chapter')||slug))||chapters[0],index=chapters.indexOf(chapter);
let dimension=params.get('dim')==='4'?4:3,mounts=[];
let guideOpen=localStorage.getItem('atlas-guide-open')==='true';
const href=(ch,anchor='')=>`./${ch.id}.html?dim=${dimension}${anchor?'#'+anchor:''}`;
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
function labelHTML(text){const escape=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));const render=tokens=>tokens.map(t=>{const body=t.children?render(t.children):escape(t.text);if(t.accent)return `<span class="${t.accent==='hat'?'hat':t.accent==='bar'?'right-complement':'left-complement'}">${body}</span>`;if(t.dy)return `<${t.dy>0?'sub':'sup'} style="font-size:${t.size/18}em">${body}</${t.dy>0?'sub':'sup'}>`;return t.bold?`<b>${body}</b>`:body;}).join('');return render(mathTokens(String(text)));}
function equationText(node){if(node.nodeType===3)return node.textContent;const body=[...node.childNodes].map(equationText).join('');if(node.nodeName==='BR')return '\n';if(node.nodeName==='SUP')return `^{${body}}`;if(node.nodeName==='SUB')return `_{${body}}`;for(const [css,command] of [['right-complement','bar'],['left-complement','underbar'],['hat','hat']])if(node.classList?.contains(css))return `\\${command}{${body}}`;return body;}
document.title=`${chapter.title} · Geometric Algebra Visual Atlas`;
$('#intro').innerHTML=`<p class="eyebrow">${chapter.group}　 /　 ${String(index+1).padStart(2,'0')}</p><div class="intro-grid"><div><h1>${chapter.title}</h1></div>${notice}</div>`;
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
    input.addEventListener(spec.type==='range'?'input':'change',()=>{let value=spec.type==='check'?input.checked:spec.type==='range'?+input.value:input.value;model.update(spec.key,value);if(['grade','count','pair','case','flat','flatA','flatB','preset','fix','lockWeight'].includes(spec.key))renderControls(mount);mount.scene.render();});side.append(row);
  }
  if(model.def.type==='basis'){}else activeInputs(model).forEach(i=>{const v=model.vectors[i];
    const block=el('div','coord-editor');block.append(el('div','coord-label',`${model.names[i]||String.fromCharCode(97+i)} · coordinates`));const grid=el('div','coord-inputs');grid.style.gridTemplateColumns=`repeat(${model.n},minmax(0,1fr))`;
    v.forEach((value,j)=>{const label=el('label','',['x','y','z','w','u'][j]),input=el('input');input.type='number';input.step='.05';input.value=Number(value.toFixed(2));input.dataset.vector=i;input.dataset.coordinate=j;input.setAttribute('aria-label',`${model.names[i]} ${['x','y','z','w','u'][j]}`);
      if(model.cga&&model.def.type!=='roundpoint'&&j>=model.n-2){input.readOnly=true;input.title='Null point · dependent coordinate';}
      if(model.def.type==='null'&&j===model.n-3){input.readOnly=true;input.title='Null-cone section';}
      if(model.state.lockWeight&&!model.cga&&j===model.n-1){input.readOnly=true;input.title='Unit slice · fixed weight';}
      if(model.state.fix&&['geometric','projective-product'].includes(model.def.type))input.disabled=true;
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
  const cga=model.cga,extra=model.n>3,fold=extra&&(!cga||model.n===5);
  return '<b>Left drag / 左ドラッグ · 1 finger / 1本指</b> Rotate / 回転'+(!cga&&extra?' — free spatial rotation / 自由回転':' — upright vertical axis / 縦軸を上に保つ')+
    (fold?'<br><b>Right ↑↓ / 右ドラッグ上下 · 2 fingers / 2本指</b> Extra-axis latitude / 追加軸の緯度（0–180°）':'')+
    (cga?'<br><b>Right ←→ / 右ドラッグ左右 · 2 fingers / 2本指</b> Exchange origin / infinity axes / 追加の2軸を切替（0–90°）':'')+
    '<br><b>Tip drag / 先端を左ドラッグ</b> Move / 移動　<b>Shift + left / Shift + 左ドラッグ</b> xy plane / xy平面'+
    '<br><b>Click / tap / クリック・タップ</b> Activate wheel / pinch / ズームを有効化　<b>Esc / tap outside / 図の外をタップ</b> Release / 解除';
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
  const guide=el('details','canvas-guide'),guideTitle=el('summary','','Controls / 操作説明'),guideBody=el('div');guide.open=guideOpen;guide.append(guideTitle,guideBody);guide.addEventListener('toggle',()=>{if(guide.open===guideOpen)return;guideOpen=guide.open;localStorage.setItem('atlas-guide-open',String(guideOpen));document.querySelectorAll('.canvas-guide').forEach(g=>g.open=guideOpen);});wrap.append(canvas,guide);
  const toolbar=el('div','canvas-tools'),viewButton=el('button','','View ↺'),reset=el('button','','Reset'),projection=el('select'),exportButton=el('button','','PNG');
  projection.setAttribute('aria-label',def.title+' camera projection');projection.innerHTML='<option value="perspective">Perspective</option><option value="orthographic">Orthographic</option>';
  toolbar.append(projection,viewButton,reset,exportButton);wrap.append(toolbar);
  const side=el('div','figure-side');body.append(wrap,side);article.append(body);
  const caption=el('div','figure-caption');caption.innerHTML=`${def.ja}<br><span class="en">${def.en}</span><p class="reference">${def.ref}</p>`;
  article.append(caption);$('#figures').append(article);
  const mount={article,canvas,side,equation:eq,saved:new Map()};mounts.push(mount);
  function selectDimension(dim){
    mount.playing=false;cancelAnimationFrame(mount.animation);
    if(mount.scene){mount.saved.set(mount.dimension,{model:mount.model,view:{...mount.scene.view}});mount.scene.dispose();}
    mount.dimension=dim;const saved=mount.saved.get(dim);mount.model=saved?.model||new FigureModel(def,dim);
    const model=mount.model;renderControls(mount);
    mount.scene=new Scene(canvas,model.n,scene=>{model.paint(scene);sync(mount);},(j,next)=>model.move(j,next));
    mount.scene.isCGA=model.cga;mount.scene.section=def.type==='null';mount.scene.flatGeometry=model.alg.kind==='rigid';mount.scene.view=saved?.view||defaultView(model.n,model.cga,mount.scene.section,mount.scene.flatGeometry);
    mount.scene.activate(false);
    projection.value=mount.scene.view.perspective?'perspective':'orthographic';
    guideBody.innerHTML=interactionGuide(model);
    buttons.forEach(b=>{const active=+b.dataset.figureDim===dim;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    mount.scene.render();
  }
  mount.selectDimension=selectDimension;mount.fixedDimension=fixedDimension;
  buttons.forEach(b=>b.addEventListener('click',()=>setDimension(+b.dataset.figureDim)));
  projection.addEventListener('change',()=>{mount.scene.view.perspective=projection.value==='perspective';mount.scene.render();});
  viewButton.addEventListener('click',()=>mount.scene.resetView());
  reset.addEventListener('click',()=>{mount.playing=false;cancelAnimationFrame(mount.animation);mount.model.reset();mount.scene.factorFrames.clear();renderControls(mount);mount.scene.render();});
  exportButton.addEventListener('click',()=>{
    const lines=equationText(eq).split('\n'),copy=document.createElement('canvas');copy.width=canvas.width;const ctx=copy.getContext('2d'),titles=[''];ctx.font='24px "STIX Two Math"';for(const word of def.title.split(' ')){const i=titles.length-1,next=(titles[i]+' '+word).trim();if(titles[i]&&ctx.measureText(next).width>copy.width-36)titles.push(word);else titles[i]=next;}const equationY=titles.length*29+47,header=equationY+lines.length*28+8;copy.height=canvas.height+header;
    ctx.fillStyle='#fcfbf7';ctx.fillRect(0,0,copy.width,copy.height);ctx.fillStyle='#173e35';ctx.font='24px "STIX Two Math"';titles.forEach((title,i)=>ctx.fillText(title,18,30+i*29));ctx.font='16px "STIX Two Math"';ctx.fillText(dimensionName(def,mount.dimension),18,titles.length*29+23);lines.forEach((line,i)=>{const width=measureMath(ctx,line,20),size=Math.min(20,20*(copy.width-36)/width);drawMath(ctx,line,18,equationY+i*28,size,'#173e35');});ctx.drawImage(canvas,0,header);
    const dialog=el('dialog','diagram-export'),close=el('button','','Close'),img=el('img'),save=el('a','','Save PNG');img.src=copy.toDataURL('image/png');img.alt=def.title+' diagram';save.href=img.src;save.download=def.id+'.png';dialog.append(close,save,img);document.body.append(dialog);close.addEventListener('click',()=>{dialog.close();dialog.remove();});dialog.showModal();
  });
  selectDimension(fixedDimension?4:dimension);
}
function render(){
  for(const mount of mounts){mount.scene.dispose();cancelAnimationFrame(mount.animation);mount.playing=false;}mounts=[];$('#figures').replaceChildren();navigation();
  $('#chapter-caption').textContent='';
  document.querySelectorAll('[data-dim]').forEach(b=>{b.textContent=dimensionName(chapter.figures[0],+b.dataset.dim);b.classList.toggle('active',+b.dataset.dim===dimension);b.setAttribute('aria-pressed',String(+b.dataset.dim===dimension));});
  chapter.figures.forEach(mountFigure);supplement();
  document.fonts.ready.then(()=>mounts.forEach(m=>m.scene.render()));
}
function setDimension(dim){dimension=dim;const url=new URL(location.href);url.searchParams.set('dim',dim);history.replaceState(null,'',url);for(const m of mounts)m.selectDimension(m.fixedDimension?4:dim);document.querySelectorAll('[data-dim]').forEach(b=>{const on=+b.dataset.dim===dim;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});navigation();supplement();}
document.querySelectorAll('[data-dim]').forEach(b=>b.addEventListener('click',()=>setDimension(+b.dataset.dim)));
document.addEventListener('pointerdown',e=>{for(const m of mounts)if(e.target!==m.canvas&&!m.article.querySelector('.canvas-tools').contains(e.target))m.scene.activate(false);});
function supplement(){$('#supplement').innerHTML=supplementalHTML(chapter,dimension);}

render();
if(location.hash)requestAnimationFrame(()=>document.getElementById(location.hash.slice(1))?.scrollIntoView());
// Read-only developer hook for the local numerical/browser verification suite.
window.atlas={get mounts(){return mounts;},get dimension(){return dimension;}};
