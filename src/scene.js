import { Algebra, add, sub, scale, dot, unit, length, basis, EPS } from './algebra.js';
import { defaultView, projectedSpace, screenPoint, orbit, dragDelta, dragOnSurface, coordinateSpace, intersectCoordinates, restrictLinear } from './camera.js';
import { measureMath, drawMath } from './math-label.js';
import { continuousFactors } from './frames.js';
export const colors = { ink:'#284d3f', warm:'#e28a42', cool:'#67b4ca', a:'#315e4a', b:'#927044', c:'#8d5c79', result:'#278e87', purple:'#9b70af', mesh:'#84937d', green:'#549a6b', projective:'#ba8042', infinity:'#9265b4' };
const Z = n => Array(n).fill(0);
const sum = (vs, n) => vs.reduce(add, Z(n));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const rgba = (hex, alpha) => { const v = parseInt(hex.replace('#',''),16); return `rgba(${v>>16},${(v>>8)&255},${v&255},${alpha})`; };
export class Scene {
  constructor(canvas, n, build, change) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.n = n; this.build = build; this.change = change;
    this.view = defaultView(n); this.handles=[]; this.commands=[]; this.labels=[]; this.drag=null;this.engaged=false;this.factorFrames=new Map();
    this.resize = new ResizeObserver(() => this.render()); this.resize.observe(canvas);
    this.listeners = []; this.pointers = new Map();
    const on = (event, f, opts) => { canvas.addEventListener(event,f,opts); this.listeners.push([event,f,opts]); };
    on('contextmenu',e=>e.preventDefault());on('auxclick',e=>{if(e.button===1)e.preventDefault();});
    on('wheel',e=>{if(!this.engaged)return;e.preventDefault();this.view.zoom=Math.max(.35,Math.min(3.5,this.view.zoom*Math.exp(-e.deltaY*.001)));this.render();},{passive:false});
    on('click',()=>this.activate());on('blur',()=>this.activate(false));
    on('pointerdown',e=>this.down(e)); on('pointermove',e=>this.move(e));
    on('pointerup',e=>this.up(e)); on('pointercancel',e=>this.up(e)); on('lostpointercapture',e=>this.up(e));
    on('keydown',e=>{if(e.key==='Escape'){this.activate(false);this.up(e);return;}if(e.key==='Home'){this.resetView();e.preventDefault();}if(e.key==='+'||e.key==='-'){this.view.zoom*=e.key==='+'?1.1:1/1.1;this.render();e.preventDefault();}});
  }
  dispose(){this.resize.disconnect();for(const [e,f,o] of this.listeners)this.canvas.removeEventListener(e,f,o);}
  activate(value=true){this.engaged=value;if(!value)this.up({});this.canvas.classList.toggle('interactive',value);this.onActivation?.(value);}
  resetView(){const perspective=this.view.perspective;this.view=defaultView(this.n,this.isCGA,this.section,this.flatGeometry);this.view.perspective=perspective;this.render();}
  project(p){return screenPoint(p,this.view,this.n,this.isCGA,this.w,this.h,this.s);}
  toDisplay(p){return projectedSpace(p,this.view,this.n,this.isCGA).point;}
  line(a,b,color=colors.ink,width=1,dash=false,alpha=1){this.commands.push({kind:'line',points:[a,b],color,width,dash,alpha});}
  poly(points,color=null,alpha=.16,dash=false){this.commands.push({kind:'poly',points,color,alpha,dash});}
  label(p,text,color=colors.ink,options={}){if(text)this.labels.push({p,text,color,...options});}
  point(p,text,color=colors.ink,size=4){this.commands.push({kind:'point',points:[p],color,size});this.label(p,text,color,{dx:10,dy:-10});}
  arrow(v,text,color=colors.ink,origin=Z(this.n),dash=false){this.commands.push({kind:'arrow',points:[origin,add(origin,v)],color,width:1.7,dash});this.label(add(origin,v),text,color,{dx:9,dy:-9});}
  handle(v,text,index,color=colors.ink,onMove=null,dashed=false,space=null){this.arrow(v,text,color,Z(this.n),dashed);this.handles.push({v,text,index,color,onMove,space});this.commands.push({kind:'handle',points:[v],color,size:6});}
  circle(center,u,v,r=1,color=colors.mesh,dash=true,alpha=.8){const ps=Array.from({length:65},(_,i)=>add(center,add(scale(u,r*Math.cos(i*Math.PI/32)),scale(v,r*Math.sin(i*Math.PI/32)))));for(let i=1;i<ps.length;i++)this.line(ps[i-1],ps[i],color,1,dash,alpha);}
  sphere(center,r,color=colors.mesh,dash=true,alpha=.5,frame=null,{mesh=false,fill=false}={}){
    const fs=frame||[basis(this.n,0),basis(this.n,1),basis(this.n,2)];
    if(fs.length<3){this.circle(center,fs[0],fs[1],r,color,dash,alpha);return;}
    for(let j=0;j<3;j++)this.circle(center,fs[j],fs[(j+1)%3],r,color,dash,alpha);
    if(mesh)for(let axis=0;axis<3;axis++){const other=[0,1,2].filter(i=>i!==axis);for(let a=-r;a<=r;a+=1.2)for(let b=-r;b<=r;b+=1.2){const q=r*r-a*a-b*b;if(q<0)continue;const p=add(center,add(scale(fs[other[0]],a),scale(fs[other[1]],b))),d=scale(fs[axis],Math.sqrt(q));this.line(sub(p,d),add(p,d),color,.7,true,alpha*.4);}}
    if(fill){const points=[];for(let lat=0;lat<=12;lat++)for(let lon=0;lon<24;lon++){const t=lat*Math.PI/12,p=lon*Math.PI/12;points.push(add(center,add(scale(fs[0],r*Math.sin(t)*Math.cos(p)),add(scale(fs[1],r*Math.sin(t)*Math.sin(p)),scale(fs[2],r*Math.cos(t))))));}this.commands.push({kind:'hull',points,color,alpha:.04});}
  }
  blade(vectors,text,{origin=Z(this.n),dashed=false,color=null,alpha=.16,connect=false}={}){
    const k=vectors.length;if(!k)return;
    if(k===1){this.arrow(vectors[0],text,color||colors.ink,origin,dashed);return;}
    const solid=k>=3?`solid-${this.commands.length}`:null;
    const projected=vectors.map(v=>this.toDisplay(v)),det3=projected.length>=3?dot(projected[0],cross(projected[1],projected[2])):0;
    const ambientColor=k===3?(det3< -1e-10?colors.cool:colors.warm):k===this.n&&k>=4?(new Algebra(this.n).blade(vectors).at(-1)<0?colors.cool:colors.warm):null;
    for(let i=0;i<k;i++)for(let j=i+1;j<k;j++){
      const rest=Array.from({length:k},(_,t)=>t).filter(t=>t!==i&&t!==j);
      for(let mask=0;mask<(1<<rest.length);mask++){
        const offset=sum(rest.filter((_,q)=>mask&(1<<q)).map(t=>vectors[t]),this.n);
        const o=add(origin,offset);let ps=[o,add(o,vectors[i]),add(o,add(vectors[i],vectors[j])),add(o,vectors[j])];
        const orientation=(i+j-1+mask.toString(2).replace(/0/g,'').length)%2;
        if(orientation)ps=ps.reverse();
        this.poly(ps,ambientColor,alpha/Math.max(1,k-1),dashed);Object.assign(this.commands.at(-1),{solid,edgeColor:color});
        if(!mask)this.orientationArc(o,vectors[i],vectors[j],color||colors.ink,orientation!==0);
      }
    }
    const center=add(origin,scale(sum(vectors,this.n),.5));this.label(center,text,color||colors.ink,{dx:5,dy:-4,box:true});
    if(connect) {let prev=null;vectors.forEach((v,i)=>{this.arrow(v,String.fromCharCode(97+i),color||colors.mesh,origin,true);const p=add(origin,v);if(prev)this.line(prev,p,colors.mesh,1,true);prev=p;});}
  }
  orientationArc(o,a,b,color,reverse=false){const start=add(o,add(scale(a,.7),scale(b,.18))),end=add(o,add(scale(a,.18),scale(b,.7))),control=add(o,scale(add(a,b),.82));const points=[];for(let i=0;i<=18;i++){const t=i/18;points.push(add(add(scale(start,(1-t)**2),scale(control,2*t*(1-t))),scale(end,t*t)));}if(reverse)points.reverse();for(let i=1;i<points.length;i++)this.line(points[i-1],points[i],color,1.3,false,.65);this.commands.at(-1).kind='arrow';}
  element(a,alg,text,options={}){
    const k=alg.gradeOf(a);if(k===-1){this.label(options.origin||Z(this.n),`${text} = 0`,colors.mesh,{dy:17});return;}
    if(k===0){this.sphere(options.origin||Z(this.n),Math.cbrt(Math.abs(a[0]))*.42,options.color||colors.mesh,true,.5);this.label(options.origin||Z(this.n),text,options.color||colors.ink,{dy:-32,box:true});return;}
    if(k===null){this.label(options.origin||Z(this.n),text,options.color||colors.ink,{box:true});return;}
    const vs=continuousFactors(a,alg,this.factorFrames?.get(text));this.factorFrames?.set(text,vs);if(vs.length)this.blade(vs,text,options);
  }
  axes(){
    const names=['x · e₁','y · e₂','z · e₃','w · e₄','u · e₅'];
    for(let i=0;i<this.n;i++){
      const b=basis(this.n,i,2.6),p=this.project(b),o=this.project(Z(this.n));
      const visible=Math.hypot(p.x-o.x,p.y-o.y)>14;
      const color=i===(this.isCGA?this.n-2:3)?colors.projective:this.isCGA&&i===this.n-1?colors.infinity:colors.mesh;
      this.line(basis(this.n,i,-3.1),basis(this.n,i,3.1),color,.8,true,.45);
      if(visible){this.arrow(b,names[i],color);}
    }
    this.label(Z(this.n),'O',colors.mesh,{dx:-15,dy:19,size:16});
  }
  locusLine(p,d,color=colors.mesh){const u=unit(d);this.line(add(p,scale(u,-3.2)),add(p,scale(u,3.2)),color,1,true,.8);}
  locusPlane(p,normal,color=colors.mesh){
    const u=unit(normal),fs=[];
    for(let i=0;i<this.n;i++){
      let v=sub(basis(this.n,i),scale(u,u[i]));for(const f of fs)v=sub(v,scale(f,dot(f,v)));if(length(v)>EPS)fs.push(unit(v));
    }
    this.locusSpan(p,fs,color);
  }
  locusSpan(p,fs,color=colors.mesh){if(fs.length===1)this.locusLine(p,fs[0],color);else if(fs.length===2)this.disk(p,fs,2.4,color,.025,true);else if(fs.length>=3)this.sphere(p,2.4,color,true,.6,fs.slice(0,3),{mesh:true,fill:true});}
  disk(p,fs,r,color=colors.mesh,alpha=.04,dash=true){
    this.poly(Array.from({length:49},(_,i)=>add(p,add(scale(fs[0],r*Math.cos(i*Math.PI/24)),scale(fs[1],r*Math.sin(i*Math.PI/24))))),color,alpha,dash);
    for(let t=-r;t<=r;t+=1.1){const s=Math.sqrt(Math.max(0,r*r-t*t));this.line(add(p,add(scale(fs[0],t),scale(fs[1],-s))),add(p,add(scale(fs[0],t),scale(fs[1],s))),color,.8,true,.45);this.line(add(p,add(scale(fs[1],t),scale(fs[0],-s))),add(p,add(scale(fs[1],t),scale(fs[0],s))),color,.8,true,.45);}
  }
  sliceMesh(){
    const n=this.n,h=n-1,r=3.3,center=basis(n,h);
    if(n===3){this.disk(center,[basis(n,0),basis(n,1)],r,colors.mesh,.018,true);this.circle(Z(n),basis(n,0),basis(n,1),r,colors.mesh,true,.7);}
    else{
      this.sphere(Z(n),r,colors.mesh,true,.4);this.sphere(center,r,colors.mesh,true,.4,null,{mesh:true,fill:true});
    }
    for(let j=0;j<h;j++)this.line(add(center,basis(n,j,-r)),add(center,basis(n,j,r)),colors.mesh,1,true,.7);
    if(this.sliceLabels){this.label(add(center,basis(n,0,-2.8)),n===3?'z = 1':'w = 1',colors.mesh,{size:16});this.label(basis(n,0,-3.2),'Horizon',colors.mesh,{dy:20,size:16});}
  }
  // Intersect a linear homogeneous subspace with h = 1, then clip to the display ball.
  flat(a,alg,text,color=colors.result,{r=3.3,showRays=false}={}){
    const fs=alg.factor(a).map(v=>[...v,...Array(Math.max(0,this.n-alg.n)).fill(0)]),h=alg.n-1;if(!fs.length){if(alg.gradeOf(a)===-1)this.label(Z(this.n),`${text} = 0`,colors.mesh,{dy:22});return;}
    const pivot=fs.findIndex(f=>Math.abs(f[h])>EPS);
    if(showRays)fs.forEach(f=>this.locusLine(Z(this.n),f,colors.mesh));
    if(pivot<0){
      const us=this.orthonormal(fs);
      if(us.length===1){this.point(scale(us[0],r),text,color,5);this.point(scale(us[0],-r),'',color,5);}
      else if(us.length===2){this.circle(Z(this.n),us[0],us[1],r,color,true,.9);this.label(scale(us[0],r),text,color,{dy:-10});}
      else{this.sphere(Z(this.n),r,color,true,.75,us);this.label(scale(us[0],r),text,color,{dy:-10});}
      return;
    }
    let p=scale(fs[pivot],1/fs[pivot][h]);const dirs=this.orthonormal(fs.filter((_,i)=>i!==pivot).map(f=>sub(f,scale(fs[pivot],f[h]/fs[pivot][h]))));
    for(const d of dirs)p=sub(p,scale(d,dot(p,d)));
    const spatial=p.slice(0,h);const radius2=r*r-dot(spatial,spatial);
    if(radius2<0){this.label(Z(this.n),`${text}: outside view`,color,{dy:24,size:10});return;}
    const radius=Math.sqrt(radius2);
    if(dirs.length===0)this.point(p,text,color,5);
    else if(dirs.length===1){this.line(add(p,scale(dirs[0],-radius)),add(p,scale(dirs[0],radius)),color,2);this.label(add(p,scale(dirs[0],radius*.65)),text,color,{dy:-10,box:true});}
    else if(dirs.length===2){this.disk(p,dirs,radius,color,.06,true);this.label(p,text,color,{box:true});}
    else {this.sphere(p,radius,color,true,.4,dirs);this.label(p,text,color,{box:true});}
  }
  orthonormal(vs){const r=[];for(let v of vs){v=[...v];for(const u of r)v=sub(v,scale(u,dot(u,v)));if(length(v)>EPS)r.push(unit(v));}return r;}
  cgaMesh(section=false){
    const w=this.n-2,u=this.n-1,m=this.n-2,point=x=>[...x,1,dot(x,x)/2],axes=Array.from({length:m},(_,i)=>i).filter(i=>!(section&&this.n===4&&i===1));
    // Only the construction diagram shows the cone; every later diagram uses its unit-origin section.
    if(section){
      const axis=add(basis(this.n,w,1/Math.sqrt(2)),basis(this.n,u,1/Math.sqrt(2))),q=sub(basis(this.n,w,1/Math.sqrt(2)),basis(this.n,u,1/Math.sqrt(2))),frame=[basis(this.n,0),...(this.n===5?[basis(this.n,1)]:[]),q];
      const pairs=this.n===4?[[0,1]]:[[0,1],[1,2],[2,0]];
      for(const t of [.45,.9,1.35,1.8])for(const [i,j] of pairs){let prev;for(let k=0;k<=64;k++){const phi=k*Math.PI/32,p=add(scale(axis,t),add(scale(frame[i],t*Math.cos(phi)),scale(frame[j],t*Math.sin(phi))));if(prev)this.line(prev,p,colors.green,1.1,true,.55);if(k%8===0)this.line(Z(this.n),scale(p,1.35),colors.green,.7,true,.4);prev=p;}}
      this.label(add(scale(axis,1.8),scale(frame[0],1.8)),'Null Cone',colors.green,{dy:-18});
    }
    for(const axis of axes){let previous;for(let x=-2.3;x<=2.301;x+=.07){const v=Array(m).fill(0);v[axis]=x;const p=point(v);if(previous)this.line(previous,p,colors.purple,section?1.8:.95,false,.65);previous=p;}}
    if(!(section&&this.n===4))for(let fixed=-1.6;fixed<=1.6;fixed+=.8)for(let swap=0;swap<2;swap++){let prev;for(let x=-2;x<=2.001;x+=.12){const v=Array(m).fill(0);v[swap]=x;v[1-swap]=fixed;const p=point(v);if(prev)this.line(prev,p,colors.purple,.65,true,.3);prev=p;}}
    const center=basis(this.n,w);if(section)this.disk(center,[basis(this.n,0),basis(this.n,u)],2.7,'#c3af52',.025,true);else if(this.n===4)this.disk(center,[basis(this.n,0),basis(this.n,1)],2.7,'#c3af52',.025,true);else this.sphere(center,2.7,'#c3af52',true,.3,null,{mesh:true});
    if(section)this.label(point([-1.5,...Array(m-1).fill(0)]),'Horosphere',colors.purple,{dy:-18});
  }
  angle(a,b){if(length(a)<EPS||length(b)<EPS)return;const u=unit(a);let v=sub(unit(b),scale(u,dot(u,unit(b))));if(length(v)<EPS){if(dot(unit(a),unit(b))>=0)return;const candidates=this.orthonormal(Array.from({length:this.n},(_,i)=>sub(basis(this.n,i),scale(u,u[i]))));v=candidates[0];if(this.view){const o=this.project(Z(this.n)),q=this.project(u),area=d=>{const p=this.project(d);return Math.abs((q.x-o.x)*(p.y-o.y)-(q.y-o.y)*(p.x-o.x));};v=candidates.reduce((best,d)=>area(d)>area(best)?d:best,v);}}v=unit(v);const theta=Math.acos(Math.max(-1,Math.min(1,dot(unit(a),unit(b)))));let prev=scale(u,.45);for(let i=1;i<=24;i++){const t=theta*i/24,p=add(scale(u,.45*Math.cos(t)),scale(v,.45*Math.sin(t)));this.line(prev,p,colors.ink,1.5);prev=p;}}
  render(){
    const rect=this.canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const ratio=Math.min(window.devicePixelRatio||1,2);this.w=rect.width;this.h=rect.height;this.s=Math.min(this.w/7.8,this.h/6.6)*this.view.zoom;
    if(this.canvas.width!==Math.round(this.w*ratio)||this.canvas.height!==Math.round(this.h*ratio)){this.canvas.width=Math.round(this.w*ratio);this.canvas.height=Math.round(this.h*ratio);}
    const ctx=this.ctx;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,this.w,this.h);
    this.commands=[];this.labels=[];this.handles=[];this.axes();this.build(this);
    const commands=this.commands.map(cmd=>({...cmd,p:cmd.points.map(v=>this.project(v))}));
    const solids=new Map();for(const cmd of commands)if(cmd.solid){const depth=cmd.p.reduce((s,p)=>s+p.z,0)/cmd.p.length;if(!solids.has(cmd.solid)||solids.get(cmd.solid).depth>depth)solids.set(cmd.solid,{depth,color:this.orientationColor(cmd.p)});}
    commands.sort((a,b)=>!!a.background!==!!b.background?(a.background?-1:1):a.p.reduce((s,p)=>s+p.z,0)/a.p.length-b.p.reduce((s,p)=>s+p.z,0)/b.p.length);
    for(const cmd of commands){
      const ps=cmd.kind==='hull'?convexHull(cmd.p):cmd.p;if(!ps.length||ps.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))continue;
      ctx.save();ctx.globalAlpha=cmd.alpha??1;ctx.setLineDash(cmd.dash?[4,5]:[]);ctx.lineWidth=cmd.width||1;
      if(cmd.kind==='texture'){this.drawTexture(ctx,cmd);ctx.restore();continue;}
      ctx.beginPath();ctx.moveTo(ps[0].x,ps[0].y);for(const p of ps.slice(1))ctx.lineTo(p.x,p.y);
      if(cmd.kind==='poly'||cmd.kind==='hull'){
        ctx.closePath();let area=0;for(let i=0;i<ps.length;i++)area+=ps[i].x*ps[(i+1)%ps.length].y-ps[(i+1)%ps.length].x*ps[i].y;
        const color=cmd.color||(cmd.solid?solids.get(cmd.solid).color:area<0?colors.warm:colors.cool);ctx.fillStyle=color;ctx.fill();ctx.globalAlpha=Math.min(1,(cmd.alpha??.16)*3.5+.4);ctx.strokeStyle=cmd.edgeColor||color;if(cmd.kind!=='hull'&&!cmd.fillOnly)ctx.stroke();
      }else if(cmd.kind==='point'||cmd.kind==='handle'){
        ctx.setLineDash([]);ctx.beginPath();ctx.arc(ps[0].x,ps[0].y,cmd.size||4,0,Math.PI*2);ctx.fillStyle=cmd.color;ctx.fill();
        if(cmd.kind==='handle'){ctx.strokeStyle='#fcfbf7';ctx.lineWidth=1.4;ctx.stroke();ctx.beginPath();ctx.arc(ps[0].x,ps[0].y,9,0,Math.PI*2);ctx.strokeStyle=rgba(cmd.color,.25);ctx.lineWidth=1;ctx.stroke();}
      }else{ctx.strokeStyle=cmd.color;ctx.stroke();if(cmd.kind==='arrow')this.arrowhead(ctx,ps[0],ps[1],cmd.color,5);}
      ctx.restore();
    }
    // Place labels with small collision avoidance; never let labels run out of the frame.
    const occupied=[];
    for(const item of this.labels){const p=this.project(item.p);if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x< -80||p.x>this.w+80||p.y< -80||p.y>this.h+80)continue;const size=Math.max(16,item.size||18);
      const width=measureMath(ctx,item.text,size,!item.scalar);let x=Math.min(this.w-width-12,Math.max(8,p.x+(item.dx||0))),y=Math.min(this.h-25,Math.max(28,p.y+(item.dy||0)));
      const anchor={x,y};let best={x,y,penalty:Infinity};for(const [dx,dy] of [[0,0],[0,-25],[0,25],[24,-50],[-24,50],[40,-75],[-40,75],[60,-100],[-60,100]]){const cx=Math.min(this.w-width-12,Math.max(8,anchor.x+dx)),cy=Math.min(this.h-25,Math.max(28,anchor.y+dy)),penalty=occupied.reduce((sum,b)=>sum+(cx<b.x+b.w&&cx+width>b.x&&Math.abs(cy-b.y)<22?1:0),0);if(penalty<best.penalty)best={x:cx,y:cy,penalty};if(!penalty)break;}x=best.x;y=best.y;if(Math.hypot(x-anchor.x,y-anchor.y)>30)this.lineLabelLeader(ctx,p,x,y,item.color);
      occupied.push({x,y,w:width});drawMath(ctx,item.text,x,y,size,item.color,!item.scalar);
    }
  }
  drawTexture(ctx,cmd){
    const texture=cmd.texture;if(!texture.canvas){const canvas=document.createElement('canvas');canvas.width=texture.width;canvas.height=texture.height;canvas.getContext('2d').putImageData(new ImageData(texture.data,texture.width,texture.height),0,0);texture.canvas=canvas;}
    const [a,b,,d]=cmd.points,at=(u,v)=>this.project(add(a,add(scale(sub(b,a),u),scale(sub(d,a),v)))),size=texture.width;
    if(this.view.perspective===false){const p=at(0,0),q=at(1,0),r=at(0,1);ctx.transform((q.x-p.x)/size,(q.y-p.y)/size,(r.x-p.x)/size,(r.y-p.y)/size,p.x,p.y);ctx.drawImage(texture.canvas,0,0);return;}
    const triangle=(uv)=>{const ps=uv.map(([u,v])=>at(u,v)),ts=uv.map(([u,v])=>[u*size,v*size]),[p,q,r]=ps,[[u,v],[u1,v1],[u2,v2]]=ts,det=(u1-u)*(v2-v)-(u2-u)*(v1-v);if(Math.abs(det)<EPS)return;const a=((q.x-p.x)*(v2-v)-(r.x-p.x)*(v1-v))/det,c=((r.x-p.x)*(u1-u)-(q.x-p.x)*(u2-u))/det,b=((q.y-p.y)*(v2-v)-(r.y-p.y)*(v1-v))/det,d=((r.y-p.y)*(u1-u)-(q.y-p.y)*(u2-u))/det;ctx.save();ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.lineTo(r.x,r.y);ctx.closePath();ctx.clip();ctx.transform(a,b,c,d,p.x-a*u-c*v,p.y-b*u-d*v);ctx.drawImage(texture.canvas,0,0);ctx.restore();};
    const count=10;for(let i=0;i<count;i++)for(let j=0;j<count;j++){const u=i/count,v=j/count,s=1/count;triangle([[u,v],[u+s,v],[u+s,v+s]]);triangle([[u,v],[u+s,v+s],[u,v+s]]);}
  }
  lineLabelLeader(ctx,p,x,y,color){ctx.save();ctx.strokeStyle=color;ctx.globalAlpha=.35;ctx.lineWidth=.7;ctx.setLineDash([2,3]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(x,y-5);ctx.stroke();ctx.restore();}
  orientationColor(ps){let area=0;for(let i=0;i<ps.length;i++)area+=ps[i].x*ps[(i+1)%ps.length].y-ps[(i+1)%ps.length].x*ps[i].y;return area<0?colors.warm:colors.cool;}
  arrowhead(ctx,a,b,color,size){const t=Math.atan2(b.y-a.y,b.x-a.x);ctx.setLineDash([]);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-size*Math.cos(t-.42),b.y-size*Math.sin(t-.42));ctx.lineTo(b.x-size*Math.cos(t+.42),b.y-size*Math.sin(t+.42));ctx.closePath();ctx.fill();}
  pos(e){const r=this.canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
  down(e){
    if(e.pointerType==='touch'&&!this.engaged)return;
    e.preventDefault();this.canvas.focus({preventScroll:true});this.activate();try{this.canvas.setPointerCapture(e.pointerId);}catch{}const p=this.pos(e),suspended=this.gesture==='suspended';this.pointers.set(e.pointerId,p);if(suspended)return;
    if(this.pointers.size>=2){this.gesture=this.pointers.size>=3?'three':'two';this.pair=this.pairState();this.gestureLock=null;this.gestureMoved=new Set();this.gestureStarted=performance.now();this.gestureView={...this.view};this.drag=null;return;}
    const near=this.handles.map(h=>({...h,p:this.project(h.v)})).sort((a,b)=>Math.hypot(a.p.x-p.x,a.p.y-p.y)-Math.hypot(b.p.x-p.x,b.p.y-p.y))[0];
    const handle=e.button===0&&near&&Math.hypot(near.p.x-p.x,near.p.y-p.y)<(e.pointerType==='touch'?28:18)?near:null;
    this.gesture='one';this.drag={p,handle,button:e.button,shift:e.shiftKey};this.canvas.classList.add('dragging');
  }
  pairState(){const points=[...this.pointers.values()],[a,b]=points;return {x:points.reduce((s,p)=>s+p.x,0)/points.length,y:points.reduce((s,p)=>s+p.y,0)/points.length,d:points.length===2?Math.hypot(a.x-b.x,a.y-b.y):0};}
  up(e){if(e.pointerId!==undefined)this.pointers.delete(e.pointerId);else this.pointers.clear();this.drag=null;this.pair=null;this.gesture=this.pointers.size?'suspended':null;this.canvas.classList.remove('dragging');}
  move(e){
    if(!this.pointers.has(e.pointerId))return;const p=this.pos(e);this.pointers.set(e.pointerId,p);
    if(this.gesture==='suspended')return;
    if(this.pointers.size>=2){this.gestureMoved.add(e.pointerId);const next=this.pairState();if(this.pair){const dx=next.x-this.pair.x,dy=next.y-this.pair.y,pinch=Math.abs(next.d-this.pair.d),motion=Math.hypot(dx,dy);if(this.gesture==='three')this.gestureLock='orbit';else if(!this.gestureLock&&(this.gestureMoved.size>=2||performance.now()-this.gestureStarted>80)&&Math.max(motion,pinch)>10)this.gestureLock=pinch>motion*1.35?'zoom':'orbit';if(this.gestureLock==='orbit'){const v={...this.gestureView};orbit(v,this.n,this.isCGA,dx,dy,this.gesture==='three'?1:2);this.view=v;}else if(this.gestureLock==='zoom'&&this.pair.d>8)this.view.zoom=Math.max(.35,Math.min(3.5,this.gestureView.zoom*next.d/this.pair.d));}this.render();return;}
    if(!this.drag)return;const {handle,button}=this.drag,dx=p.x-this.drag.p.x,dy=p.y-this.drag.p.y;this.drag.p=p;
    if(handle){
      let space=handle.space||coordinateSpace(this.n);
      if(e.shiftKey){const o=this.project(Z(this.n)),indices=(button===2?Array.from({length:this.n-2},(_,i)=>i+2):[0,1]).filter(i=>{const p=this.project(basis(this.n,i));return button!==2||Math.hypot(p.x-o.x,p.y-o.y)>1;});space=this.orthonormal(intersectCoordinates(space,indices));}
      else if(space.length===this.n){const near=this.project(handle.v).z,normal=space.map(v=>(this.project(add(handle.v,scale(v,1e-4))).z-near)/1e-4);space=restrictLinear(space,normal);}
      const delta=handle.retract?null:dragDelta(v=>this.project(v),handle.v,dx,dy,space),next=handle.retract?dragOnSurface(v=>this.project(v),handle.v,dx,dy,space,handle.retract):add(handle.v,delta);
      if(handle.onMove)handle.onMove(next);else this.change(handle.index,next);
      // Follow the newly rendered handle instead of using a stale vector snapshot.
      this.render();const live=this.handles.find(h=>h.index===handle.index);if(live)this.drag.handle={...live,p:this.project(live.v)};
    }else{
      orbit(this.view,this.n,this.isCGA,dx,dy,button);
      this.render();
    }
  }
}
function convexHull(points){const ps=[...points].sort((a,b)=>a.x-b.x||a.y-b.y),cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),lower=[],upper=[];for(const p of ps){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}for(const p of ps.reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}return [...lower.slice(0,-1),...upper.slice(0,-1)];}
