/* Move the existing logout control to the horizontal header. No event handlers are replaced. */
(()=>{'use strict';function init(){const app=document.getElementById('appScreen'),actions=app?.querySelector('.top-actions'),button=app?.querySelector('#signout');if(!actions||!button||button.parentElement===actions)return;actions.appendChild(button)}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init()})();

// Inject Admin link into top navigation when user is admin
function injectAdminTop(){
  const adminLink = document.getElementById('adminNavLink');
  const topNav = document.querySelector('.ye-top-nav, header.topbar, .top-nav');
  if(!adminLink || adminLink.hidden || !topNav) return;
  if(document.getElementById('adminTopLink')) return;
  const clone = adminLink.cloneNode(true);
  clone.id = 'adminTopLink';
  clone.style.display = 'inline-flex';
  clone.style.marginLeft = '12px';
  clone.style.color = '#19e68c';
  clone.style.fontWeight = '600';
  const container = document.querySelector('.ye-top-nav') || document.querySelector('header .top-left') || topNav;
  if(container) container.appendChild(clone);
}
setTimeout(injectAdminTop, 800);
setInterval(injectAdminTop, 2000);
