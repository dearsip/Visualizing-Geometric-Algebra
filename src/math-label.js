// Small mathematical typesetter for canvas labels. No HTML or font-dependent Unicode scripts.
export function mathTokens(text,size=18,boldVariables=true){
  const tokens=[];let i=0;
  while(i<text.length){
    const accent=text.slice(i).match(/^\\(bar|underbar|hat)\{/);
    if(accent){let j=i+accent[0].length,depth=1,end=j;for(;end<text.length;end++){if(text[end]==='{')depth++;if(text[end]==='}'&&!--depth)break;}tokens.push({children:mathTokens(text.slice(j,end),size,boldVariables),size,dy:0,accent:accent[1]});i=end+1;continue;}
    const script=text.slice(i).match(/^([_^])\{([^{}]*)\}/);
    if(script){tokens.push({text:script[2],size:size*(/[●○]/.test(script[2])?.48:.65),dy:script[1]==='_'?size*.25:-size*.42});i+=script[0].length;continue;}
    const ch=text[i];
    if('●○■□'.includes(ch)){tokens.push({text:ch,size:size*.48,dy:size*.25});i++;continue;}
    if('★☆'.includes(ch)){tokens.push({text:ch,size:size*.65,dy:-size*.42});i++;continue;}
    const normal=text.slice(i).match(/^[^\\_^●○■□★☆]+/);
    if(normal){const run=normal[0];let at=0;for(const match of run.matchAll(/(?<![a-zA-Z])[a-zA-Z][₀-₉₋₊′]*(?![a-zA-Z])/g)){if(match.index>at)tokens.push({text:run.slice(at,match.index),size,dy:0});tokens.push({text:match[0],size,dy:0,bold:boldVariables});at=match.index+match[0].length;}if(at<run.length)tokens.push({text:run.slice(at),size,dy:0});i+=run.length;}else{tokens.push({text:ch,size,dy:0});i++;}
  }
  return tokens;
}
function tokenWidth(ctx,t){if(t.children)return t.children.reduce((w,x)=>w+tokenWidth(ctx,x),0);ctx.font=`${t.bold?'bold ':''}${t.size}px "STIX Two Math", "Cambria Math", serif`;return ctx.measureText(t.text).width;}
function tokenExtent(ctx,t,upper){
  if(t.children){const content=Math.max(0,...t.children.map(x=>tokenExtent(ctx,x,upper)));if(upper&&t.accent!=='underbar')return Math.max(t.size*.86,content+(t.accent==='hat'?6:3));if(!upper&&t.accent==='underbar')return Math.max(4,content+3);return content;}
  ctx.font=`${t.bold?'bold ':''}${t.size}px "STIX Two Math", "Cambria Math", serif`;const metric=ctx.measureText(t.text);return Math.max(0,upper?(metric.actualBoundingBoxAscent??t.size*.78)-t.dy:(metric.actualBoundingBoxDescent??t.size*.2)+t.dy);
}
export function measureMath(ctx,text,size=18,boldVariables=true){return mathTokens(text,size,boldVariables).reduce((w,t)=>w+tokenWidth(ctx,t),0);}
export function drawMath(ctx,text,x,y,size,color,boldVariables=true){
  drawTokens(ctx,mathTokens(text,size,boldVariables),x,y,size,color);
}
function drawTokens(ctx,tokens,x,y,size,color){
  for(const token of tokens){
    const width=tokenWidth(ctx,token);
    if(token.children)drawTokens(ctx,token.children,x,y,size,color);
    else{ctx.font=`${token.bold?'bold ':''}${token.size}px "STIX Two Math", "Cambria Math", serif`;ctx.lineWidth=4;ctx.strokeStyle='#fcfbf7';ctx.strokeText(token.text,x,y+token.dy);ctx.fillStyle=color;ctx.fillText(token.text,x,y+token.dy);}
    if(token.accent){ctx.strokeStyle=color;ctx.lineWidth=1.3;ctx.beginPath();const ay=token.accent==='underbar'?y+tokenExtent(ctx,token,false):y-tokenExtent(ctx,token,true);if(token.accent==='hat'){ctx.moveTo(x,ay+3);ctx.lineTo(x+width/2,ay);ctx.lineTo(x+width,ay+3);}else{ctx.moveTo(x,ay);ctx.lineTo(x+width,ay);}ctx.stroke();}
    x+=width;
  }
}
