/* Emerald Nexus — dashboard-only visual. No authentication or account logic. */
(() => {
  'use strict';
  const style=document.createElement('style');
  style.textContent=`
  .ye-nexus{position:relative;isolation:isolate;overflow:hidden;min-height:290px;border:1px solid rgba(35,255,148,.22);border-radius:24px;background:radial-gradient(ellipse at 50% 60%,rgba(0,103,65,.3),transparent 56%),linear-gradient(135deg,#050d0c,#07120f 65%,#030807);display:grid;place-items:center;margin:0 0 22px;box-shadow:inset 0 0 55px #002a1b,0 12px 35px #0005}
  .ye-nexus:before{content:'';position:absolute;inset:-30%;background:repeating-radial-gradient(ellipse at center,transparent 0 34px,rgba(0,255,138,.035) 35px 36px);animation:yeNexusFog 18s linear infinite;pointer-events:none}
  .ye-nexus-stage{position:relative;width:min(100%,420px);height:270px;perspective:850px;transform-style:preserve-3d;transform:rotateX(var(--nx,0deg)) rotateY(var(--ny,0deg));transition:transform .3s ease-out}
  .ye-nexus-glow{position:absolute;left:50%;top:52%;width:210px;height:210px;transform:translate(-50%,-50%);border-radius:50%;background:#00ff8850;filter:blur(65px);animation:yeNexusPulse 4s ease-in-out infinite}
  .ye-nexus-crystal{position:absolute;left:50%;top:50%;width:125px;height:174px;transform:translate(-50%,-50%);transform-style:preserve-3d;filter:drop-shadow(0 0 16px #00ff88);animation:yeNexusFloat 6s ease-in-out infinite}
  .ye-nexus-facet{position:absolute;inset:0;clip-path:polygon(50% 0,100% 42%,50% 100%,0 42%);background:linear-gradient(130deg,#d7ffe7 0%,#13ff9b 14%,#004b36 38%,#09e887 55%,#002c23 80%,#9bffd0 100%);border:1px solid #88ffd2}
  .ye-nexus-facet:before{content:'';position:absolute;inset:0;clip-path:polygon(50% 0,50% 100%,0 42%);background:linear-gradient(135deg,#b6ffe6,#00a66c 55%,#003d31);opacity:.78}
  .ye-nexus-facet:after{content:'';position:absolute;inset:0;clip-path:polygon(50% 0,100% 42%,50% 43%);background:#baffdb88}
  .ye-nexus-ring{position:absolute;left:50%;top:50%;width:285px;height:108px;margin-left:-142.5px;margin-top:-54px;border:5px solid #b8d8cc;border-left-color:#00f58b;border-bottom-color:#066d51;border-radius:50%;box-shadow:0 0 12px #00ff8877,inset 0 0 9px #00ff8855;transform-style:preserve-3d}
  .ye-nexus-ring.a{animation:yeNexusOrbitA 9s linear infinite}
  .ye-nexus-ring.b{animation:yeNexusOrbitB 12s linear infinite}
  .ye-nexus-ring.c{animation:yeNexusOrbitC 15s linear infinite}
  .ye-nexus-label{position:absolute;bottom:15px;left:0;right:0;text-align:center;color:#a2d6c0;font-size:10px;letter-spacing:.32em;text-transform:uppercase}
  .ye-nexus-star{position:absolute;width:3px;height:3px;border-radius:50%;background:#71ffc1;box-shadow:0 0 10px #00ff88}
  @keyframes yeNexusOrbitA{from{transform:rotate(-24deg) rotateX(68deg) rotateZ(0)}to{transform:rotate(-24deg) rotateX(68deg) rotateZ(360deg)}}
  @keyframes yeNexusOrbitB{from{transform:rotate(54deg) rotateX(72deg) rotateZ(0)}to{transform:rotate(54deg) rotateX(72deg) rotateZ(-360deg)}}
  @keyframes yeNexusOrbitC{from{transform:rotate(114deg) rotateX(65deg) rotateZ(0)}to{transform:rotate(114deg) rotateX(65deg) rotateZ(360deg)}}
  @keyframes yeNexusFloat{0%,100%{transform:translate(-50%,-50%) rotateY(-12deg) translateY(0)}50%{transform:translate(-50%,-50%) rotateY(12deg) translateY(-9px)}}
  @keyframes yeNexusPulse{0%,100%{opacity:.65;scale:.95}50%{opacity:1;scale:1.12}}
  @keyframes yeNexusFog{to{transform:rotate(360deg)}}
  @media(max-width:600px){.ye-nexus{min-height:235px}.ye-nexus-stage{scale:.8}}
  @media(prefers-reduced-motion:reduce){.ye-nexus *, .ye-nexus:before{animation:none!important}.ye-nexus-stage{transition:none}}
  `;
  document.head.append(style);
  function mount(){
    const app=document.getElementById('appScreen');
    const root=document.getElementById('pageContent');
    if(!app||app.hidden||!root||location.hash.replace('#','').split('?')[0]!=='dashboard')return;
    if(root.querySelector('.ye-nexus'))return;
    const host=document.createElement('section');
    host.className='ye-nexus';
    host.setAttribute('aria-label','Emerald Nexus, cristallo luminoso con anelli orbitanti');
    host.innerHTML='<div class="ye-nexus-stage"><div class="ye-nexus-glow"></div><div class="ye-nexus-ring a"></div><div class="ye-nexus-ring b"></div><div class="ye-nexus-ring c"></div><div class="ye-nexus-crystal"><div class="ye-nexus-facet"></div></div><span class="ye-nexus-star" style="top:18%;left:16%"></span><span class="ye-nexus-star" style="top:76%;left:80%"></span><span class="ye-nexus-star" style="top:30%;left:85%"></span></div><div class="ye-nexus-label">Emerald Nexus · YoungExchange</div>';
    root.prepend(host);
    const stage=host.querySelector('.ye-nexus-stage');
    host.addEventListener('pointermove',e=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const r=host.getBoundingClientRect();stage.style.setProperty('--ny',((e.clientX-r.left)/r.width-.5)*12+'deg');stage.style.setProperty('--nx',(-((e.clientY-r.top)/r.height-.5)*9)+'deg')});
    host.addEventListener('pointerleave',()=>{stage.style.setProperty('--ny','0deg');stage.style.setProperty('--nx','0deg')});
  }
  const observer=new MutationObserver(()=>{if(!document.getElementById('pageContent'))return;mount()});
  function init(){const root=document.getElementById('pageContent');if(!root)return;observer.observe(root,{childList:true});const app=document.getElementById('appScreen');if(app)observer.observe(app,{attributes:true,attributeFilter:['hidden']});window.addEventListener('hashchange',()=>requestAnimationFrame(mount));mount()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();