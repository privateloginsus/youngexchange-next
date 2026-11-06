/* YoungExchange PLATINUM ULTRA: accessible sidebar controls, no financial mutations. */
(()=>{'use strict';
const labels=[['users','Utenti e conti','♙'],['deposits','Depositi','↓'],['withdrawals','Prelievi','↑'],['transactions','Transazioni','↔'],['balances','Saldi','◈'],['crypto','Crypto e cambi','⇄'],['history','Storico e controlli','◷'],['settings','Impostazioni sito','⚙']];
function init(){const nav=document.querySelector('#nav'),link=document.querySelector('#adminNavLink');if(!nav||!link)return;
const sub=document.createElement('div');sub.className='ye-ultra-subnav';sub.id='yeUltraAdminSubnav';sub.setAttribute('aria-label','Sottosezioni amministrazione');sub.innerHTML=labels.map(([id,title,icon])=>`<button type="button" data-ultra-admin="${id}"><span class="ye-subicon">${icon}</span>${title}</button>`).join('');link.insertAdjacentElement('afterend',sub);
const arrow=document.createElement('span');arrow.className='ye-ultra-arrow';arrow.textContent='⌄';link.append(arrow);link.setAttribute('aria-expanded','false');link.setAttribute('aria-controls',sub.id);
const open=(value)=>{sub.classList.toggle('open',value);arrow.classList.toggle('open',value);link.setAttribute('aria-expanded',String(value))};
link.addEventListener('click',()=>open(!sub.classList.contains('open')));
sub.addEventListener('click',event=>{const btn=event.target.closest('[data-ultra-admin]');if(!btn)return;const section=btn.dataset.ultraAdmin;sub.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===btn));if(location.hash!=='#admin'){location.hash='admin';setTimeout(()=>{document.querySelector(`[data-admin-section="${section}"]`)?.click()},180)}else{document.querySelector(`[data-admin-section="${section}"]`)?.click()}open(true)});
window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#admin'))open(true)});if(location.hash.startsWith('#admin'))open(true);
const content=document.querySelector('#pageContent');if(content){const obs=new MutationObserver(()=>{if(location.hash!=='#admin'&&document.querySelector('.pl-dashboard')){const dashboard=document.querySelector('.pl-dashboard');if(!dashboard.querySelector('.ye-ultra-admin-banner')&&link.style.display!=='none'&&!link.hidden){const banner=document.createElement('div');banner.className='ye-ultra-admin-banner';banner.innerHTML='<span class="ye-ultra-admin-icon">♙</span><div><strong>Workspace YoungExchange PLATINUM</strong><small>Panoramica dei mercati e del tuo conto · accesso amministrativo disponibile nel menu laterale</small></div><span class="ye-ultra-admin-badge">◆ PLATINUM</span>';dashboard.prepend(banner)}}});obs.observe(content,{childList:true})}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
