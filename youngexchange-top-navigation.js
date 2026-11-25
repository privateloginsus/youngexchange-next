/* Move the existing logout control to the horizontal header. No event handlers are replaced. */
(()=>{'use strict';function init(){const app=document.getElementById('appScreen'),actions=app?.querySelector('.top-actions'),button=app?.querySelector('#signout');if(!actions||!button||button.parentElement===actions)return;actions.appendChild(button)}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init()})();

// Force Admin link in top bar for admins
function forceAdminLink(){
  const adminLink = document.getElementById('adminNavLink');
  if(!adminLink || adminLink.hidden) return;
  if(document.getElementById('forcedAdminTop')) return;
  const topbar = document.querySelector('header.topbar') || document.querySelector('.topbar') || document.querySelector('.top-actions');
  if(!topbar) return;
  const a = document.createElement('a');
  a.id = 'forcedAdminTop';
  a.href = '#admin';
  a.textContent = '⚙ Amministrazione';
  a.style.cssText = 'margin-left:16px;color:#19e68c;font-weight:600;text-decoration:none;padding:6px 12px;border:1px solid rgba(25,230,140,.4);border-radius:8px;background:rgba(25,230,140,.08)';
  a.onclick = function(){ location.hash = '#admin'; return false; };
  topbar.appendChild(a);
}
setTimeout(forceAdminLink, 600);
setInterval(forceAdminLink, 1500);
