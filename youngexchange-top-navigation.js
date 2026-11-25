/* Move the existing logout control to the horizontal header. No event handlers are replaced. */
(()=>{'use strict';function init(){const app=document.getElementById('appScreen'),actions=app?.querySelector('.top-actions'),button=app?.querySelector('#signout');if(!actions||!button||button.parentElement===actions)return;actions.appendChild(button)}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init()})();

// Force Admin button in top bar
(function forceAdmin(){
  function inject(){
    if(document.getElementById('forcedAdminBtn')) return;
    const adminLink = document.getElementById('adminNavLink');
    const isAdmin = adminLink && !adminLink.hidden && adminLink.style.display !== 'none';
    if(!isAdmin) return;
    const target = document.querySelector('.top-actions') || document.querySelector('header.topbar') || document.querySelector('.topbar');
    if(!target) return;
    const btn = document.createElement('a');
    btn.id = 'forcedAdminBtn';
    btn.href = '#admin';
    btn.innerHTML = '⚙ Amministrazione';
    btn.style.cssText = 'display:inline-flex;align-items:center;margin-left:14px;padding:7px 14px;background:rgba(25,230,140,.12);border:1px solid #19e68c;border-radius:10px;color:#19e68c;font-weight:600;font-size:13.5px;text-decoration:none;z-index:100';
    btn.onclick = function(e){ e.preventDefault(); location.hash='#admin'; };
    target.appendChild(btn);
  }
  setTimeout(inject, 400);
  setInterval(inject, 1000);
})();
