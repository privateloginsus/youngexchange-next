/* Visual ambient only. No authentication, market-price or wallet mutations. */
(()=>{'use strict';
 const app=document.getElementById('appScreen');if(!app)return;
 const canvas=document.createElement('canvas');canvas.id='yeProLiveCanvas';canvas.setAttribute('aria-hidden','true');app.prepend(canvas);
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let w=0,h=0,dpr=1,frame=0,raf=0,active=true;
 let tx=.5,ty=.5,px=.5,py=.5,last=0;
 function resize(){w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,1.6);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
 function pointer(e){tx=Math.min(1,Math.max(0,e.clientX/Math.max(1,w)));ty=Math.min(1,Math.max(0,e.clientY/Math.max(1,h)))}
 window.addEventListener('pointermove',pointer,{passive:true});window.addEventListener('pointerdown',pointer,{passive:true});window.addEventListener('resize',resize,{passive:true});resize();
 function wave(t,base,amp,phase,color,glow,rows,span){
  const step=Math.max(10,Math.floor(w/130));
  for(let j=0;j<rows;j++){
   const depth=j/(rows-1),yBase=base+depth*span;
   ctx.beginPath();
   for(let x=-20;x<=w+step;x+=step){
    const nx=x/w;const envelope=Math.sin(Math.PI*Math.max(0,Math.min(1,nx)));
    const sway=Math.sin(nx*7.2+phase+t*.23+depth*1.8)*amp*(.65+.35*depth);
    const fine=Math.sin(nx*18.5+phase*.7-t*.14+depth*3)*amp*.12;
    const interactive=(px-.5)*26*envelope+(py-.5)*19;
    const y=yBase+sway+fine+interactive;
    if(x===-20)ctx.moveTo(x,y);else ctx.lineTo(x,y);
   }
   ctx.lineWidth=j===0?1.6:.45+depth*.28;
   ctx.strokeStyle=color.replace('ALPHA',String((j===0?.7:.17)*(1-depth*.58)));
   ctx.shadowColor=glow;ctx.shadowBlur=j===0?16:0;ctx.stroke();ctx.shadowBlur=0;
  }
 }
 function draw(ms){raf=0;if(!active||app.hidden||document.hidden)return;
  const minGap=reduced.matches?1000:33;if(ms-last<minGap){raf=requestAnimationFrame(draw);return}last=ms;
  px+=(tx-px)*.045;py+=(ty-py)*.045;const t=reduced.matches?0:ms*.001;
  ctx.fillStyle='#02140e';ctx.fillRect(0,0,w,h);
  const radial=(x,y,r,c)=>{const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,c);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)};
  radial(w*.74,h*.1,w*.6,'rgba(0,100,62,.22)');radial(w*.1,h*.78,w*.56,'rgba(0,138,85,.20)');
  radial(px*w,py*h,Math.min(w,h)*.46,'rgba(0,220,136,.095)');
  wave(t,h*.04,h*.11,.4,'rgba(13,246,163,ALPHA)','#05ffad',22,h*.13);
  wave(t,h*.64,h*.12,2.6,'rgba(10,246,161,ALPHA)','#00ffad',37,h*.36);
  // Dotted light mesh, sparse and GPU-independent.
  const spacing=w<700?24:20;ctx.fillStyle='rgba(34,241,162,.22)';
  for(let x=0;x<w;x+=spacing){for(let y=Math.round(h*.66);y<h;y+=spacing){
   const xx=x+(Math.sin(y*.016+t*.22)*6),yy=y+Math.sin(x*.012+t*.2)*8;
   const fade=Math.max(0,Math.min(1,(y-h*.64)/(h*.36)));
   ctx.globalAlpha=fade*.32;ctx.fillRect(xx,yy,1.1,1.1);
  }}ctx.globalAlpha=1;
  raf=requestAnimationFrame(draw);
 }
 const io=new MutationObserver(()=>{if(!app.hidden&&!raf)raf=requestAnimationFrame(draw)});io.observe(app,{attributes:true,attributeFilter:['hidden']});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!raf)raf=requestAnimationFrame(draw)});
 raf=requestAnimationFrame(draw);
})();
