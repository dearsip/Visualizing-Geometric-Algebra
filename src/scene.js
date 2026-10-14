import { add, sub, scale, dot, unit, length, basis, EPS } from './algebra.js';
export const colors = { ink:'#284d3f', warm:'#e28a42', cool:'#67b4ca', a:'#315e4a', b:'#83994d', c:'#a37563', result:'#278e87', purple:'#a08ab7', mesh:'#aab69c', green:'#7cac8d' };
const Z = n => Array(n).fill(0);
const sum = (vs, n) => vs.reduce(add, Z(n));
const rgba = (hex, alpha) => { const v = parseInt(hex.replace('#',''),16); return `rgba(${v>>16},${(v>>8)&255},${v&255},${alpha})`; };
export class Scene {
  constructor(canvas, n, build, change) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.n = n; this.build = build; this.change = change;
    this.view = { yaw:.57, pitch:.8, extra:0, conformal:0, zoom:1.15 }; this.handles=[]; this.commands=[]; this.labels=[]; this.drag=null;
    this.resize = new ResizeObserver(() => this.render()); this.resize.observe(canvas);
    this.listeners = []; this.pointers = new Map();
    const on = (event, f, opts) => { canvas.addEventListener(event,f,opts); this.listeners.push([event,f,opts]); };
    on('contextmenu',e=>e.preventDefault());
    on('wheel',e=>{e.preventDefault();this.view.zoom=Math.max(.45,Math.min(2.5,this.view.zoom*Math.exp(-e.deltaY*.001)));this.render();},{passive:false});
    on('pointerdown',e=>this.down(e)); on('pointermove',e=>this.move(e));
    on('pointerup',e=>this.up(e)); on('pointercancel',e=>this.up(e)); on('lostpointercapture',e=>this.up(e));
    on('keydown',e=>{if(e.key==='Home'){this.resetView();e.preventDefault();}if(e.key==='+'||e.key==='-'){this.view.zoom*=e.key==='+'?1.1:1/1.1;this.render();e.preventDefault();}});
  }
  dispose(){this.resize.disconnect();for(const [e,f,o] of this.listeners)this.canvas.removeEventListener(e,f,o);}
  resetView(){this.view={yaw:.57,pitch:.8,extra:0,conformal:0,zoom:1.15};this.render();}
  ambient(p) {
    let v=[...p];
    if(this.n>=4){const i=2,j=3,c=Math.cos(this.view.extra),s=Math.sin(this.view.extra);[v[i],v[j]]=[c*v[i]+s*v[j],-s*v[i]+c*v[j]];}
    if(this.isCGA){
      // The two null axes have display lengths 1/sqrt(2), sqrt(2).
      v=[...p];const w=this.n-2,u=this.n-1;
      const angle=this.view.conformal+(this.n===4?this.view.extra:0),c=Math.cos(angle),s=Math.sin(angle);
      const h=p[w]/Math.sqrt(2),j=p[u]*Math.sqrt(2);
      const high=c*h+s*j,near=-s*h+c*j;
      if(this.n===4) v=[p[0],p[1],high,near];
      else { const c2=Math.cos(this.view.extra),s2=Math.sin(this.view.extra);v=[p[0],p[1],c2*p[2]+s2*high,-s2*p[2]+c2*high,near]; }
    }
    return v;
  }
  project(p) {
    const v=this.ambient(p);const cy=Math.cos(this.view.yaw),sy=Math.sin(this.view.yaw),cp=Math.cos(this.view.pitch),sp=Math.sin(this.view.pitch);
    const x=v[0]*cy-v[1]*sy, y=v[0]*sy+v[1]*cy+(v[3]||0)+(v[4]||0), z=v[2]||0;
    // Extra hidden components enter depth; rotating the extra plane reveals them.
    const depth=y*cp+z*sp;
    return {x:this.w*.49+x*this.s,y:this.h*.55-(z*cp-y*sp)*this.s,z:depth};
  }
  line(a,b,color=colors.ink,width=1,dash=false,alpha=1){this.commands.push({kind:'line',points:[a,b],color,width,dash,alpha});}
  poly(points,color=null,alpha=.16,dash=false){this.commands.push({kind:'poly',points,color,alpha,dash});}
  label(p,text,color=colors.ink,options={}){if(text)this.labels.push({p,text,color,...options});}
  point(p,text,color=colors.ink,size=4){this.commands.push({kind:'point',points:[p],color,size});this.label(p,text,color,{dx:10,dy:-10});}
  arrow(v,text,color=colors.ink,origin=Z(this.n),dash=false){this.commands.push({kind:'arrow',points:[origin,add(origin,v)],color,width:1.7,dash});this.label(add(origin,v),text,color,{dx:9,dy:-9});}
  handle(v,text,index,color=colors.ink,onMove=null,dashed=false){this.arrow(v,text,color,Z(this.n),dashed);this.handles.push({v,text,index,color,onMove});this.commands.push({kind:'handle',points:[v],color,size:5});}
  circle(center,u,v,r=1,color=colors.mesh,dash=true,alpha=.8){const ps=Array.from({length:65},(_,i)=>add(center,add(scale(u,r*Math.cos(i*Math.PI/32)),scale(v,r*Math.sin(i*Math.PI/32)))));for(let i=1;i<ps.length;i++)this.line(ps[i-1],ps[i],color,1,dash,alpha);}
  sphere(center,r,color=colors.mesh,dash=true,alpha=.5,frame=null){
    const fs=frame||[basis(this.n,0),basis(this.n,1),basis(this.n,2)];
    if(fs.length<3){this.circle(center,fs[0],fs[1],r,color,dash,alpha);return;}
    for(let j=0;j<3;j++)this.circle(center,fs[j],fs[(j+1)%3],r,color,dash,alpha);
    for(let t of [-.6,.6])this.circle(add(center,scale(fs[2],r*t)),fs[0],fs[1],r*Math.sqrt(1-t*t),color,dash,alpha*.5);
  }
  blade(vectors,text,{origin=Z(this.n),dashed=false,color=null,alpha=.16,connect=false}={}){
    const k=vectors.length;if(!k)return;
    if(k===1){this.arrow(vectors[0],text,color||colors.ink,origin,dashed);return;}
    // Every 2-face of the ordered parallelotope. Boundary winding points inward.
    for(let i=0;i<k;i++)for(let j=i+1;j<k;j++){
      const rest=Array.from({length:k},(_,t)=>t).filter(t=>t!==i&&t!==j);
      for(let mask=0;mask<(1<<rest.length);mask++){
        const offset=sum(rest.filter((_,q)=>mask&(1<<q)).map(t=>vectors[t]),this.n);
        const o=add(origin,offset);let ps=[o,add(o,vectors[i]),add(o,add(vectors[i],vectors[j])),add(o,vectors[j])];
        const orientation=(i+j-1+mask.toString(2).replace(/0/g,'').length)%2;
        if(orientation)ps=ps.reverse();
        this.poly(ps,null,alpha/Math.max(1,k-1),dashed);
      }
    }
    const center=add(origin,scale(sum(vectors,this.n),.5));this.label(center,text,color||colors.ink,{dx:5,dy:-4,box:true});
    if(connect) {let prev=null;vectors.forEach((v,i)=>{this.arrow(v,String.fromCharCode(97+i),color||colors.mesh,origin,true);const p=add(origin,v);if(prev)this.line(prev,p,colors.mesh,1,true);prev=p;});}
  }
  element(a,alg,text,options={}){
    const k=alg.gradeOf(a);if(k===-1){this.label(options.origin||Z(this.n),`${text} = 0`,colors.mesh,{dy:17});return;}
    if(k===0){this.sphere(options.origin||Z(this.n),Math.cbrt(Math.abs(a[0]))*.42,options.color||colors.mesh,true,.5);this.label(options.origin||Z(this.n),text,options.color||colors.ink,{dy:-32,box:true});return;}
    if(k===null){this.label(options.origin||Z(this.n),text,options.color||colors.ink,{box:true});return;}
    const vs=alg.factor(a);if(vs.length)this.blade(vs,text,options);
  }
  axes(){
    const names=['x · e₁','y · e₂','z · e₃','w · e₄','u · e₅'];
    for(let i=0;i<this.n;i++){
      const b=basis(this.n,i,2.6),p=this.project(b),o=this.project(Z(this.n));
      const visible=Math.hypot(p.x-o.x,p.y-o.y)>14;
      this.line(basis(this.n,i,-3.1),basis(this.n,i,3.1),colors.mesh,.7,true,.55);
      if(visible){this.arrow(b,names[i],colors.mesh);}
    }
    this.label(Z(this.n),'O',colors.mesh,{dx:-13,dy:14,size:11});
  }
  locusLine(p,d,color=colors.mesh){const u=unit(d);this.line(add(p,scale(u,-3.2)),add(p,scale(u,3.2)),color,1,true,.8);}
  locusPlane(p,normal,color=colors.mesh){
    const u=unit(normal),fs=[];
    for(let i=0;i<this.n&&fs.length<Math.min(2,this.n-1);i++){
      let v=sub(basis(this.n,i),scale(u,u[i]));for(const f of fs)v=sub(v,scale(f,dot(f,v)));if(length(v)>EPS)fs.push(unit(v));
    }
    if(fs.length===2){this.disk(p,fs,2.4,color,.035,true);}
    // Add all remaining null directions so the locus isn't mistaken for a finite 2D patch in 4D.
    if(this.n>3)for(let i=0;i<this.n;i++){let v=sub(basis(this.n,i),scale(u,u[i]));if(length(v)>EPS)this.locusLine(p,v,color);}
  }
  locusSpan(p,fs,color=colors.mesh){if(fs.length===1)this.locusLine(p,fs[0],color);else if(fs.length>=2)this.disk(p,fs,2.4,color,.025,true);}
  disk(p,fs,r,color=colors.mesh,alpha=.04,dash=true){
    this.poly(Array.from({length:49},(_,i)=>add(p,add(scale(fs[0],r*Math.cos(i*Math.PI/24)),scale(fs[1],r*Math.sin(i*Math.PI/24))))),color,alpha,dash);
    for(let t=-r;t<=r;t+=.45){const s=Math.sqrt(Math.max(0,r*r-t*t));this.line(add(p,add(scale(fs[0],t),scale(fs[1],-s))),add(p,add(scale(fs[0],t),scale(fs[1],s))),color,.65,true,.45);this.line(add(p,add(scale(fs[1],t),scale(fs[0],-s))),add(p,add(scale(fs[1],t),scale(fs[0],s))),color,.65,true,.45);}
  }
  sliceMesh(){
    const n=this.n,h=n-1,r=3.3,center=basis(n,h);
    if(n===3){this.disk(center,[basis(n,0),basis(n,1)],r,colors.mesh,.018,true);this.circle(Z(n),basis(n,0),basis(n,1),r,colors.mesh,true,.7);}
    else{
      for(let z of [-1.8,0,1.8])this.disk(add(center,basis(n,2,z)),[basis(n,0),basis(n,1)],Math.sqrt(r*r-z*z),colors.mesh,.006,true);
      this.sphere(Z(n),r,colors.mesh,true,.35);this.sphere(center,r,colors.mesh,true,.16);
    }
    this.label(add(center,basis(n,0,-2.8)),n===3?'z = 1':'w = 1',colors.mesh,{size:12});this.label(basis(n,0,-3.2),'Horizon',colors.mesh,{dy:18,size:10});
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
    const w=this.n-2,u=this.n-1,m=this.n-2;
    const point=(x,weight=1)=>{const p=Z(this.n);x.forEach((v,i)=>p[i]=v);p[w]=weight;p[u]=dot(x,x)/(2*weight);return p;};
    // e₁/e_w/e_u section of the null cone, plus a paraboloid section of the horosphere.
    for(let weight of [.35,.7,1,1.5,2]){
      const ps=Array.from({length:45},(_,i)=>point([(-2.2+i*.1)],weight));for(let i=1;i<ps.length;i++)this.line(ps[i-1],ps[i],colors.green,.75,true,.65);
    }
    for(let x of [-1.5,-.8,0,.8,1.5]){const p=point([x]);this.line(scale(p,-.8),scale(p,2),colors.green,.6,true,.35);}
    if(!section)for(let k=-2;k<=2;k+=.5){const ps=[];for(let j=-2;j<=2;j+=.12){const x=Array(m).fill(0);x[0]=j;x[1]=k;ps.push(point(x));}for(let i=1;i<ps.length;i++)this.line(ps[i-1],ps[i],colors.purple,.7,true,.32);}
    const ps=Array.from({length:49},(_,i)=>point([-2.4+i*.1]));for(let i=1;i<ps.length;i++)this.line(ps[i-1],ps[i],colors.purple,1.4,true,.9);
    const center=basis(this.n,w);this.disk(center,[basis(this.n,0),basis(this.n,u)],2.5,colors.mesh,.013,true);
    if(section){this.label(point([1.8],1.5),'Null Cone',colors.green,{dx:7,dy:-13});this.label(point([-1.5]),'Horosphere',colors.purple,{dx:-12,dy:-13});}
  }
  angle(a,b){const u=unit(a);let v=sub(unit(b),scale(u,dot(u,unit(b))));if(length(v)<EPS)return;v=unit(v);const theta=Math.acos(Math.max(-1,Math.min(1,dot(unit(a),unit(b)))));let prev=scale(u,.42);for(let i=1;i<=24;i++){const t=theta*i/24,p=add(scale(u,.42*Math.cos(t)),scale(v,.42*Math.sin(t)));this.line(prev,p,colors.ink,1);prev=p;}this.label(add(scale(u,.6*Math.cos(theta/2)),scale(v,.6*Math.sin(theta/2))),'θ',colors.ink,{size:13});}
  render(){
    const rect=this.canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const ratio=Math.min(window.devicePixelRatio||1,2);this.w=rect.width;this.h=rect.height;this.s=Math.min(this.w/7.8,this.h/6.6)*this.view.zoom;
    if(this.canvas.width!==Math.round(this.w*ratio)||this.canvas.height!==Math.round(this.h*ratio)){this.canvas.width=Math.round(this.w*ratio);this.canvas.height=Math.round(this.h*ratio);}
    const ctx=this.ctx;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,this.w,this.h);
    this.commands=[];this.labels=[];this.handles=[];this.axes();this.build(this);
    const commands=this.commands.map(cmd=>({...cmd,p:cmd.points.map(v=>this.project(v))}));commands.sort((a,b)=>a.p.reduce((s,p)=>s+p.z,0)/a.p.length-b.p.reduce((s,p)=>s+p.z,0)/b.p.length);
    for(const cmd of commands){
      const ps=cmd.p;if(ps.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))continue;
      ctx.save();ctx.globalAlpha=cmd.alpha??1;ctx.setLineDash(cmd.dash?[4,5]:[]);ctx.lineWidth=cmd.width||1;
      ctx.beginPath();ctx.moveTo(ps[0].x,ps[0].y);for(const p of ps.slice(1))ctx.lineTo(p.x,p.y);
      if(cmd.kind==='poly'){
        ctx.closePath();let area=0;for(let i=0;i<ps.length;i++)area+=ps[i].x*ps[(i+1)%ps.length].y-ps[(i+1)%ps.length].x*ps[i].y;
        const color=cmd.color||(area<0?colors.warm:colors.cool);ctx.fillStyle=color;ctx.fill();ctx.globalAlpha=Math.min(1,(cmd.alpha??.16)*3.5+.25);ctx.strokeStyle=color;ctx.stroke();
        if(!cmd.color&&ps.length===4){ // An explicit orientation arrow, independent of component signs.
          const start={x:(ps[0].x+ps[3].x)/2,y:(ps[0].y+ps[3].y)/2},end={x:(ps[1].x+ps[2].x)/2,y:(ps[1].y+ps[2].y)/2};
          const p={x:start.x*.65+end.x*.35,y:start.y*.65+end.y*.35},q={x:start.x*.35+end.x*.65,y:start.y*.35+end.y*.65};
          ctx.globalAlpha=.65;ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();this.arrowhead(ctx,p,q,color,4);
        }
      }else if(cmd.kind==='point'||cmd.kind==='handle'){
        ctx.setLineDash([]);ctx.beginPath();ctx.arc(ps[0].x,ps[0].y,cmd.size||4,0,Math.PI*2);ctx.fillStyle=cmd.color;ctx.fill();
        if(cmd.kind==='handle'){ctx.strokeStyle='#fcfbf7';ctx.lineWidth=1.4;ctx.stroke();ctx.beginPath();ctx.arc(ps[0].x,ps[0].y,9,0,Math.PI*2);ctx.strokeStyle=rgba(cmd.color,.25);ctx.lineWidth=1;ctx.stroke();}
      }else{ctx.strokeStyle=cmd.color;ctx.stroke();if(cmd.kind==='arrow')this.arrowhead(ctx,ps[0],ps[1],cmd.color,5);}
      ctx.restore();
    }
    // Place labels with small collision avoidance; never let labels run out of the frame.
    const occupied=[];
    for(const item of this.labels){const p=this.project(item.p);if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;ctx.font=`${item.bold===false?'400':'600'} ${item.size||14}px "Cambria Math", "Segoe UI Symbol", serif`;
      const width=ctx.measureText(item.text).width;let x=Math.min(this.w-width-12,Math.max(8,p.x+(item.dx||0))),y=Math.min(this.h-25,Math.max(18,p.y+(item.dy||0)));
      for(let t=0;t<5&&occupied.some(b=>x<b.x+b.w&&x+width>b.x&&Math.abs(y-b.y)<15);t++)y=Math.max(18,y-16);
      occupied.push({x,y,w:width});ctx.lineWidth=4;ctx.strokeStyle='#fcfbf7df';ctx.strokeText(item.text,x,y);ctx.fillStyle=item.color;ctx.fillText(item.text,x,y);
    }
  }
  arrowhead(ctx,a,b,color,size){const t=Math.atan2(b.y-a.y,b.x-a.x);ctx.setLineDash([]);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-size*Math.cos(t-.42),b.y-size*Math.sin(t-.42));ctx.lineTo(b.x-size*Math.cos(t+.42),b.y-size*Math.sin(t+.42));ctx.closePath();ctx.fill();}
  pos(e){const r=this.canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
  down(e){
    e.preventDefault();this.canvas.focus({preventScroll:true});this.canvas.setPointerCapture(e.pointerId);const p=this.pos(e);this.pointers.set(e.pointerId,p);
    if(this.pointers.size===2){const [a,b]=[...this.pointers.values()];this.pinch=Math.hypot(a.x-b.x,a.y-b.y);this.drag=null;return;}
    const near=this.handles.map(h=>({...h,p:this.project(h.v)})).sort((a,b)=>Math.hypot(a.p.x-p.x,a.p.y-p.y)-Math.hypot(b.p.x-p.x,b.p.y-p.y))[0];
    const handle=near&&Math.hypot(near.p.x-p.x,near.p.y-p.y)<18?near:null;
    this.drag={p,handle,button:e.button,shift:e.shiftKey};this.canvas.classList.add('dragging');
  }
  up(e){this.pointers.delete(e.pointerId);this.drag=null;this.pinch=null;this.canvas.classList.remove('dragging');}
  move(e){
    if(!this.pointers.has(e.pointerId))return;const p=this.pos(e);this.pointers.set(e.pointerId,p);
    if(this.pointers.size===2){const [a,b]=[...this.pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(this.pinch)this.view.zoom=Math.max(.45,Math.min(2.5,this.view.zoom*d/this.pinch));this.pinch=d;this.render();return;}
    if(!this.drag)return;const {handle,button}=this.drag,dx=p.x-this.drag.p.x,dy=p.y-this.drag.p.y;this.drag.p=p;
    if(handle){
      let indices=Array.from({length:this.n},(_,i)=>i);
      if(e.shiftKey)indices=button===2?Array.from({length:this.n-2},(_,i)=>i+2):[0,1];
      const o=this.project(Z(this.n)),columns=indices.map(i=>{const q=this.project(basis(this.n,i));return [q.x-o.x,q.y-o.y];});
      // Minimum-norm motion with fixed screen depth; orthographic view plane.
      const xx=columns.reduce((s,c)=>s+c[0]*c[0],0),xy=columns.reduce((s,c)=>s+c[0]*c[1],0),yy=columns.reduce((s,c)=>s+c[1]*c[1],0);
      const det=xx*yy-xy*xy;let delta=Z(this.n);
      if(Math.abs(det)>EPS){const a=(yy*dx-xy*dy)/det,b=(xx*dy-xy*dx)/det;columns.forEach((c,j)=>delta[indices[j]]=c[0]*a+c[1]*b);}
      else {const den=xx+yy;if(den>EPS)columns.forEach((c,j)=>delta[indices[j]]=(c[0]*dx+c[1]*dy)/den);}
      const next=add(handle.v,delta).map(v=>Math.max(-6,Math.min(6,v)));
      if(handle.onMove)handle.onMove(next);else this.change(handle.index,next);
      // Follow the newly rendered handle instead of using a stale vector snapshot.
      this.render();const live=this.handles.find(h=>h.index===handle.index);if(live)this.drag.handle={...live,p:this.project(live.v)};
    }else{
      if(button===2){if(this.isCGA)this.view.conformal+=dx*.012;if(this.n>=4)this.view.extra-=dy*.012;else this.view.pitch=Math.max(-1.1,Math.min(1.1,this.view.pitch-dy*.006));}
      else {this.view.yaw+=dx*.009;this.view.pitch=Math.max(-1.1,Math.min(1.1,this.view.pitch-dy*.006));}
      this.render();
    }
  }
}
