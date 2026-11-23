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
  .ye-nexus:has(canvas) .ye-nexus-stage{opacity:0;pointer-events:none}
  .ye-nexus:has(canvas) .ye-nexus-label{z-index:3}
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
    enhanceWebGL(host);
    const stage=host.querySelector('.ye-nexus-stage');
    host.addEventListener('pointermove',e=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const r=host.getBoundingClientRect();stage.style.setProperty('--ny',((e.clientX-r.left)/r.width-.5)*12+'deg');stage.style.setProperty('--nx',(-((e.clientY-r.top)/r.height-.5)*9)+'deg')});
    host.addEventListener('pointerleave',()=>{stage.style.setProperty('--ny','0deg');stage.style.setProperty('--nx','0deg')});
  }

  // WebGL upgrade: glass crystal and silver rings, with the CSS scene as fallback.
  function enhanceWebGL(host){
    if(!window.THREE || host.querySelector('canvas'))return;
    const T=window.THREE;
    let renderer;
    try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'})}catch(e){return}
    const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,1,.1,50);
    camera.position.z=10.5;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));
    renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.65;
    renderer.domElement.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none';
    host.append(renderer.domElement);
    const ambient=new T.AmbientLight(0x99ffdd,1.8);scene.add(ambient);
    [[0x00ff88,95,3,2,4],[0xe0fff2,75,-4,3,2],[0x00aa77,65,-3,-2,-1]].forEach(v=>{const p=new T.PointLight(v[0],v[1],30);p.position.set(v[2],v[3],v[4]);scene.add(p)});
    const group=new T.Group();scene.add(group);
    const gem=new T.OctahedronGeometry(1.6);
    const shell=new T.Mesh(gem,new T.MeshPhysicalMaterial({color:0x0cff94,metalness:.05,roughness:.06,transmission:.65,thickness:1.5,ior:1.65,clearcoat:1,flatShading:true,transparent:true,opacity:.94,side:T.DoubleSide}));
    shell.scale.set(.9,1.23,.9);group.add(shell);
    const inside=new T.Mesh(new T.OctahedronGeometry(1.2),new T.MeshPhysicalMaterial({color:0x00a65e,emissive:0x00834c,emissiveIntensity:.7,metalness:.4,roughness:.16,transparent:true,opacity:.75,flatShading:true,side:T.DoubleSide}));
    inside.scale.copy(shell.scale);group.add(inside);
    const edges=new T.LineSegments(new T.EdgesGeometry(gem),new T.LineBasicMaterial({color:0xb8ffe0,transparent:true,opacity:.7}));edges.scale.copy(shell.scale);group.add(edges);
    const core=new T.Mesh(new T.IcosahedronGeometry(.35,1),new T.MeshBasicMaterial({color:0xa3ffcb}));group.add(core);
    const rings=[];
    for(let i=0;i<3;i++){
      const pivot=new T.Group(),mat=new T.MeshStandardMaterial({color:0xc5ddd4,metalness:1,roughness:.15,emissive:0x00472a,emissiveIntensity:.45});
      const ring=new T.Mesh(new T.TorusGeometry(2.8,.052,12,180),mat);ring.scale.y=.62;pivot.add(ring);
      const glow=new T.Mesh(new T.TorusGeometry(2.8,.012,6,180),new T.MeshBasicMaterial({color:0x20ff9c,transparent:true,opacity:.7}));glow.scale.y=.62;glow.position.z=.04;pivot.add(glow);
      const bead=new T.Mesh(new T.SphereGeometry(.11,16,12),new T.MeshStandardMaterial({color:0xe6fff5,metalness:.6,roughness:.1,emissive:0x00fa8b,emissiveIntensity:.6}));bead.position.x=2.8;pivot.add(bead);
      pivot.rotation.set(.4+i*.6,.3+i*.7,i*1.1);group.add(pivot);rings.push(pivot);
    }
    const dots=new Float32Array(540);
    for(let i=0;i<dots.length;i++)dots[i]=(Math.random()-.5)*(i%3===2?5:13);
    const points=new T.BufferGeometry();points.setAttribute('position',new T.BufferAttribute(dots,3));
    scene.add(new T.Points(points,new T.PointsMaterial({color:0x4dffb5,size:.028,transparent:true,opacity:.7})));
    const resize=()=>{if(!host.isConnected)return;const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.z=w<650?14:10.5;camera.updateProjectionMatrix()};
    resize();
    const ro=new ResizeObserver(resize);ro.observe(host);
    let mx=0,my=0,frame=0;
    host.addEventListener('pointermove',e=>{const b=host.getBoundingClientRect();mx=((e.clientX-b.left)/b.width-.5)*.35;my=((e.clientY-b.top)/b.height-.5)*.2});
    host.addEventListener('pointerleave',()=>{mx=my=0});
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clock=new T.Clock();
    function draw(){
      if(!host.isConnected){cancelAnimationFrame(frame);ro.disconnect();scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});renderer.dispose();return}
      frame=requestAnimationFrame(draw);
      const t=clock.getElapsedTime();
      if(!reduced){
        group.rotation.y+=(mx-group.rotation.y)*.025;group.rotation.x+=(my-group.rotation.x)*.025;
        shell.rotation.y=t*.19;inside.rotation.y=-t*.12;edges.rotation.y=shell.rotation.y;
        shell.position.y=inside.position.y=edges.position.y=Math.sin(t*.7)*.09;
        core.scale.setScalar(1+Math.sin(t*1.8)*.15);
        rings.forEach((r,i)=>{r.rotation.z+=((i%2)?-1:1)*(.0025+i*.0007);r.rotation.y+=.0009*(i+1)});
      }
      renderer.render(scene,camera);
    }
    draw();
  }

  const observer=new MutationObserver(()=>{if(!document.getElementById('pageContent'))return;mount()});
  function init(){const root=document.getElementById('pageContent');if(!root)return;observer.observe(root,{childList:true});const app=document.getElementById('appScreen');if(app)observer.observe(app,{attributes:true,attributeFilter:['hidden']});window.addEventListener('hashchange',()=>requestAnimationFrame(mount));mount()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();