/* YoungExchange PLATINUM ULTRA: accessible sidebar controls, no financial mutations. */
(()=>{'use strict';
const labels=[['users','Utenti e conti','♙'],['informative-records','Registrazioni informative','▤'],['deposits','Depositi','↓'],['withdrawals','Prelievi','↑'],['transactions','Transazioni','↔'],['balances','Saldi','◈'],['crypto','Crypto e cambi','⇄'],['history','Storico e controlli','◷'],['settings','Impostazioni sito','⚙']];
function init(){
// Logo Y: la navigazione resta quella del link #dashboard; su mobile chiude anche il menu laterale.
document.querySelector('.side-brand')?.addEventListener('click',()=>document.querySelector('.sidebar')?.classList.remove('open'));
const nav=document.querySelector('#nav'),link=document.querySelector('#adminNavLink');if(!nav)return;if(!link){window.addEventListener('ye:admin-authorized',init,{once:true});return}if(document.getElementById('yeUltraAdminSubnav'))return;
const sub=document.createElement('div');sub.className='ye-ultra-subnav';sub.id='yeUltraAdminSubnav';sub.setAttribute('aria-label','Sottosezioni amministrazione');sub.innerHTML=labels.map(([id,title,icon])=>`<button type="button" data-ultra-admin="${id}"><span class="ye-subicon">${icon}</span>${title}</button>`).join('');link.insertAdjacentElement('afterend',sub);
const arrow=document.createElement('span');arrow.className='ye-ultra-arrow';arrow.textContent='⌄';link.append(arrow);link.setAttribute('aria-expanded','false');link.setAttribute('aria-controls',sub.id);
const open=(value)=>{sub.classList.toggle('open',value);arrow.classList.toggle('open',value);link.setAttribute('aria-expanded',String(value))};
const syncSelection=()=>{const [,query='']=location.hash.slice(1).split('?');const section=new URLSearchParams(query).get('section');sub.querySelectorAll('button[data-ultra-admin]').forEach(x=>x.classList.toggle('active',x.dataset.ultraAdmin===section));if(location.hash.startsWith('#admin'))open(true)};
link.addEventListener('click',()=>open(!sub.classList.contains('open')));
sub.addEventListener('click',event=>{const target=event.target;const btn=target instanceof Element?target.closest('button[data-ultra-admin]'):null;if(!btn||!sub.contains(btn))return;globalThis.YEXAdminNavigationDiagnostic?.('click-received',btn.dataset.ultraAdmin);const select=window.YEAdminNavigation?.select;if(typeof select!=='function'){console.error('Navigazione amministrativa non disponibile.');return}if(!select(btn.dataset.ultraAdmin))return;syncSelection()});
window.addEventListener('hashchange',syncSelection);syncSelection();
const content=document.querySelector('#pageContent');if(content){const obs=new MutationObserver(()=>{if(location.hash!=='#admin'&&document.querySelector('.pl-dashboard')){const dashboard=document.querySelector('.pl-dashboard');if(!dashboard.querySelector('.ye-ultra-admin-banner')&&link.style.display!=='none'&&!link.hidden){const banner=document.createElement('div');banner.className='ye-ultra-admin-banner';banner.innerHTML='<span class="ye-ultra-admin-icon">♙</span><div><strong>Workspace YoungExchange</strong><small>Panoramica dei mercati e del tuo conto · accesso amministrativo disponibile nel menu laterale</small></div><span class="ye-ultra-admin-badge">◆ YoungExchange</span>';dashboard.prepend(banner)}}});obs.observe(content,{childList:true})}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
