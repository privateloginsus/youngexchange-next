/* Ambient visual only. No synthetic market values, wallet mutations, or external requests. */
(()=>{'use strict';
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
const canvas=document.createElement('canvas');canvas.id='yeVisionCanvas';canvas.setAttribute('aria-hidden','true');
let ctx,w=0,h=0,dpr=1,frame=0,raf=0,last=0;const pointer={x:.5,y:.4,tx:.5,ty:.4};
function mount(){const app=document.getElementById('appScreen');if(!app||canvas.parentNode)return;app.prepend(canvas);resize();if(!reduce.matches)start();else draw(0)}
function resize(){w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,1.7);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx=canvas.getContext('2d',{alpha:true});ctx.setTransform(dpr,0,0,dpr,0,0);draw(frame)}
function draw(t){if(!ctx||!w||!h)return;ctx.clearRect(0,0,w,h);pointer.x+=(pointer.tx-pointer.x)*.035;pointer.y+=(pointer.ty-pointer.y)*.035;
const glow=ctx.createRadialGradient(pointer.x*w,pointer.y*h,0,pointer.x*w,pointer.y*h,Math.max(w,h)*.57);glow.addColorStop(0,'rgba(0,255,150,.10)');glow.addColorStop(.45,'rgba(0,115,80,.035)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
const lines=window.innerWidth<700?24:48;const bands=[{y:.06,amp:65,dir:1},{y:.72,amp:80,dir:-1},{y:1.04,amp:50,dir:1}];
for(let b=0;b<bands.length;b++){const band=bands[b];for(let i=0;i<lines;i++){const f=i/(lines-1),base=band.y*h+(f-.5)*(b===0?145:195),phase=t*.00016*band.dir+b*1.9;ctx.beginPath();const step=10;for(let x=-15;x<=w+15;x+=step){const nx=x/Math.max(1,w),influence=Math.exp(-Math.pow((nx-pointer.x)*2.7,2));const y=base+Math.sin(nx*8.4+phase+f*1.3)*band.amp+Math.sin(nx*15.3-phase*.5+f*2)*15+influence*(pointer.y-.5)*35+(f-.5)*Math.sin(nx*5+phase)*26;if(x===-15)ctx.moveTo(x,y);else ctx.lineTo(x,y)}const bright=i===Math.floor(lines*.35)||i===Math.floor(lines*.73);ctx.strokeStyle=bright?'rgba(33,255,173,.85)':`rgba(15,234,146,${(.055+.22*(1-Math.abs(f-.5)*1.5)).toFixed(3)})`;ctx.lineWidth=bright?1.7:.65;if(bright){ctx.shadowColor='#00ffab';ctx.shadowBlur=15}else ctx.shadowBlur=0;ctx.stroke()}}
ctx.shadowBlur=0}
function tick(now){if(now-last>28){frame=now;draw(now);last=now}raf=requestAnimationFrame(tick)}function start(){if(!raf&&canvas.parentNode&&!reduce.matches)raf=requestAnimationFrame(tick)}function stop(){if(raf)cancelAnimationFrame(raf);raf=0;draw(0)}
window.addEventListener('pointermove',e=>{pointer.tx=e.clientX/Math.max(1,w);pointer.ty=e.clientY/Math.max(1,h)},{passive:true});window.addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',()=>document.hidden?stop():start());reduce.addEventListener?.('change',()=>reduce.matches?stop():start());
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
