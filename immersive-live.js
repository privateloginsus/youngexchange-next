/* YoungExchange Premium Pro Live - immersive decorative canvas, no account/market operations. */
(()=>{'use strict';
const root=document.getElementById('appScreen');if(!root)return;
const canvas=document.createElement('canvas');canvas.className='ye-immersive-canvas';canvas.setAttribute('aria-hidden','true');root.prepend(canvas);
const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
let w=0,h=0,dpr=1,raf=0,last=0,phase=0,visible=true;
const pointer={x:.5,y:.48,tx:.5,ty:.48,power:0,target:0};
const resize=()=>{w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,1.7);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0)};
function drawRibbon(base,amplitude,sign,opacity,t){
 const lines=w<650?19:36,steps=Math.max(65,Math.min(150,Math.round(w/11)));
 for(let j=0;j<lines;j++){
  const depth=j/(lines-1),alpha=opacity*(.16+.72*Math.pow(1-depth,1.5));
  ctx.beginPath();
  for(let i=0;i<=steps;i++){
   const x=i/steps*w,xx=i/steps;
   const wave=Math.sin(xx*8.2+t*.44+depth*1.9)*amplitude +Math.sin(xx*15.5-t*.29+depth*2.2)*amplitude*.22;
   const influence=Math.exp(-Math.pow((xx-pointer.x)*3.0,2))*pointer.power;
   const y=base+sign*(depth*125+wave*(.32+depth*.68)+influence*(pointer.y-.5)*65);
   if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.strokeStyle=`rgba(19,244,167,${alpha})`;ctx.lineWidth=depth<.06?1.45:.65;ctx.stroke();
 }
 for(let j=0;j<11;j++){
  const depth=(j+.35)/11;ctx.fillStyle=`rgba(46,255,184,${opacity*(.2+.4*(1-depth))})`;
  for(let i=0;i<90;i++){
   const xx=i/89,x=xx*w;
   const wave=Math.sin(xx*8.2+t*.44+depth*1.9)*amplitude+Math.sin(xx*15.5-t*.29+depth*2.2)*amplitude*.22;
   const influence=Math.exp(-Math.pow((xx-pointer.x)*3,2))*pointer.power;
   const y=base+sign*(depth*125+wave*(.32+depth*.68)+influence*(pointer.y-.5)*65);
   ctx.fillRect(x,y,1.2,1.2);
  }
 }
}
function frame(now){raf=0;if(!visible||root.hidden)return;if(now-last<30){raf=requestAnimationFrame(frame);return}const dt=Math.min((now-last||33)/1000,.06);last=now;
 pointer.x+=(pointer.tx-pointer.x)*.065;pointer.y+=(pointer.ty-pointer.y)*.065;pointer.power+=(pointer.target-pointer.power)*.05;
 if(!reduced.matches)phase+=dt;ctx.clearRect(0,0,w,h);
 const glow=ctx.createRadialGradient(pointer.x*w,pointer.y*h,10,pointer.x*w,pointer.y*h,Math.max(w,h)*.55);
 glow.addColorStop(0,`rgba(0,224,140,${.035+pointer.power*.065})`);glow.addColorStop(1,'rgba(0,224,140,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
 drawRibbon(h*.085,Math.max(32,h*.075),1,.33,phase+1.5);
 drawRibbon(h*.76,Math.max(55,h*.105),-1,.60,phase);
 if(!reduced.matches)raf=requestAnimationFrame(frame)
}
function start(){if(!raf&&w&&visible&&!root.hidden)raf=requestAnimationFrame(frame)}
const move=(x,y)=>{pointer.tx=Math.max(0,Math.min(1,x/innerWidth));pointer.ty=Math.max(0,Math.min(1,y/innerHeight));pointer.target=1;start()};
window.addEventListener('pointermove',e=>move(e.clientX,e.clientY),{passive:true});window.addEventListener('pointerdown',e=>move(e.clientX,e.clientY),{passive:true});window.addEventListener('pointerout',e=>{if(!e.relatedTarget)pointer.target=0},{passive:true});
window.addEventListener('touchmove',e=>{if(e.touches[0])move(e.touches[0].clientX,e.touches[0].clientY)},{passive:true});
window.addEventListener('resize',()=>{resize();start()},{passive:true});document.addEventListener('visibilitychange',()=>{visible=!document.hidden;if(visible){last=0;start()}else if(raf){cancelAnimationFrame(raf);raf=0}});
const observer=new MutationObserver(()=>{if(!root.hidden)start()});observer.observe(root,{attributes:true,attributeFilter:['hidden']});
if(reduced.addEventListener)reduced.addEventListener('change',()=>{last=0;start()});resize();start();
})();
