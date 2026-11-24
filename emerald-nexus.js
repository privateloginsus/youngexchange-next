/* Emerald Nexus — dashboard-only visual. No authentication or account logic. */
(() => {
  'use strict';
  const style=document.createElement('style');
  style.textContent=`
  .ye-nexus{position:relative;isolation:isolate;overflow:hidden;min-height:410px;border:1px solid rgba(35,255,148,.22);border-radius:24px;background:radial-gradient(ellipse at 50% 60%,rgba(0,103,65,.3),transparent 56%),linear-gradient(135deg,#050d0c,#07120f 65%,#030807);display:grid;place-items:center;margin:0 0 22px;box-shadow:inset 0 0 55px #002a1b,0 12px 35px #0005}
  .ye-nexus canvas{width:100%!important;height:100%!important;display:block}
  `;
  document.head.appendChild(style);

  function mount(){
    const host=document.querySelector('.ye-nexus')||document.querySelector('[class*="nexus"]');
    if(!host||host.querySelector('canvas'))return;
    const canvas=document.createElement('canvas');
    host.innerHTML='';
    host.appendChild(canvas);
    init(canvas);
  }

  function init(canvas){
    if(!window.THREE)return;
    const R=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    R.setPixelRatio(Math.min(devicePixelRatio,2));
    const sc=new THREE.Scene();
    const cam=new THREE.PerspectiveCamera(35,1,.1,50);
    cam.position.set(0,0.2,8);
    const root=new THREE.Group();sc.add(root);

    // Ultra-realistic emerald crystal
    const geo=new THREE.OctahedronGeometry(1.4,1);
    const mat=new THREE.MeshPhysicalMaterial({
      color:0x12dc92,metalness:0.1,roughness:0.05,transmission:0.7,thickness:1.2,
      ior:1.6,clearcoat:1,transparent:true,opacity:0.95,flatShading:false
    });
    const crystal=new THREE.Mesh(geo,mat);
    crystal.scale.set(0.85,1.15,0.85);
    root.add(crystal);

    // Minimalist ETH symbol inside crystal
    const ethGeo=new THREE.PlaneGeometry(0.6,0.6);
    const ethMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.85,side:THREE.DoubleSide});
    const eth=new THREE.Mesh(ethGeo,ethMat);
    eth.position.z=0.1;
    root.add(eth);
    const c=document.createElement('canvas');c.width=128;c.height=128;
    const ctx=c.getContext('2d');
    ctx.fillStyle='#fff';
    ctx.font='bold 72px sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('◆',64,64);
    ethMat.map=new THREE.CanvasTexture(c);

    // Orbiting crypto meteorites
    const cryptos=['BTC','ETH','SOL','XRP','ADA','DOT'];
    const orbiters=[];
    cryptos.forEach((sym,i)=>{
      const g=new THREE.Group();
      const size=0.18+Math.random()*0.08;
      const m=new THREE.Mesh(new THREE.SphereGeometry(size,12,8),new THREE.MeshPhysicalMaterial({
        color:0x19e68c,metalness:0.6,roughness:0.2,emissive:0x0a5,emissiveIntensity:0.3
      }));
      g.add(m);
      const lc=document.createElement('canvas');lc.width=128;lc.height=64;
      const lctx=lc.getContext('2d');
      lctx.fillStyle='#eafff4';lctx.font='bold 28px Inter,sans-serif';
      lctx.textAlign='center';lctx.fillText(sym,64,40);
      const lm=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(lc),transparent:true}));
      lm.scale.set(0.6,0.3,1);
      lm.position.y=size+0.25;
      g.add(lm);
      root.add(g);
      orbiters.push({g, r:2.2+i*0.35, a:i*1.1, spd:0.4+i*0.05, y:(Math.random()-.5)*1.2});
    });

    function resize(){
      const w=canvas.clientWidth||600,h=canvas.clientHeight||400;
      R.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();
    }
    resize();addEventListener('resize',resize);
    let t=0;
    function loop(){
      requestAnimationFrame(loop);t+=0.01;
      crystal.rotation.y=t*0.4;
      orbiters.forEach(o=>{
        o.a+=o.spd*0.01;
        o.g.position.x=Math.cos(o.a)*o.r;
        o.g.position.z=Math.sin(o.a)*o.r;
        o.g.position.y=o.y+Math.sin(o.a*0.5)*0.3;
      });
      R.render(sc,cam);
    }
    loop();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
  else setTimeout(mount,100);
})();
