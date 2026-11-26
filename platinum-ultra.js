/* YoungExchange PLATINUM ULTRA: accessible sidebar controls, no financial mutations. */
(()=>{'use strict';
const labels=[['users','Utenti e conti','♙'],['informative-records','Registrazioni informative','▤'],['deposits','Depositi','↓'],['withdrawals','Prelievi','↑'],['transactions','Transazioni','↔'],['balances','Saldi','◈'],['crypto','Crypto e cambi','⇄'],['iban','IBAN Clienti','🏦'],['history','Storico e controlli','◷'],['settings','Impostazioni sito','⚙']];
function init(){
// Logo Y: la navigazione resta quella del link #dashboard; su mobile chiude anche il menu laterale.
document.querySelector('.side-brand')?.addEventListener('click',()=>document.querySelector('.sidebar')?.classList.remove('open'));
const nav=document.querySelector('#nav'),link=document.querySelector('#adminNavLink');if(!nav)return;if(!link){window.addEventListener('ye:admin-authorized',init);return}if(document.getElementById('yeUltraAdminSubnav'))return;
const sub=document.createElement('div');sub.className='ye-ultra-subnav';sub.id='yeUltraAdminSubnav';sub.style.display='none';sub.setAttribute('aria-label','Sottosezioni amministrazione');sub.innerHTML=labels.map(([id,title,icon])=>`<button type="button" data-ultra-admin="${id}"><span class="ye-subicon">${icon}</span>${title}</button>`).join('');link.insertAdjacentElement('afterend',sub);
const arrow=document.createElement('span');arrow.className='ye-ultra-arrow';arrow.textContent='⌄';link.append(arrow);link.setAttribute('aria-expanded','false');link.setAttribute('aria-controls',sub.id);
const open=(value)=>{sub.classList.toggle('open',value);arrow.classList.toggle('open',value);link.setAttribute('aria-expanded',String(value))};
const syncSelection=()=>{const [,query='']=location.hash.slice(1).split('?');const section=new URLSearchParams(query).get('section');sub.querySelectorAll('button[data-ultra-admin]').forEach(x=>x.classList.toggle('active',x.dataset.ultraAdmin===section));if(location.hash.startsWith('#admin'))open(true)};
link.addEventListener('click',()=>open(!sub.classList.contains('open')));
sub.addEventListener('click',async event=>{const target=event.target;const btn=target instanceof Element?target.closest('button[data-ultra-admin]'):null;if(!btn||!sub.contains(btn))return;const section=btn.dataset.ultraAdmin;location.hash='#admin?section='+section;if(typeof adminSelectSection==='function'){await adminSelectSection(section)}else if(section==='iban'&&typeof renderAdminIbanSection==='function'){$('pageContent').innerHTML=await renderAdminIbanSection()}else{$('pageContent').innerHTML='<section class=card><h3>'+section+'</h3><p class=small>Caricamento...</p></section>'}syncSelection();});
window.addEventListener('hashchange',syncSelection);syncSelection();
const content=document.querySelector('#pageContent');if(content){const obs=new MutationObserver(()=>{if(location.hash!=='#admin'&&document.querySelector('.pl-dashboard')){const dashboard=document.querySelector('.pl-dashboard');if(!dashboard.querySelector('.ye-ultra-admin-banner')&&link.style.display!=='none'&&!link.hidden){const banner=document.createElement('div');banner.className='ye-ultra-admin-banner';banner.innerHTML='<span class="ye-ultra-admin-icon">♙</span><div><strong>Workspace YoungExchange</strong><small>Panoramica dei mercati e del tuo conto · accesso amministrativo disponibile nel menu laterale</small></div><span class="ye-ultra-admin-badge">◆ YoungExchange</span>';dashboard.prepend(banner)}}});obs.observe(content,{childList:true})}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
// Add IBAN tile to admin page
function addIbanTile(){
  const grid=document.querySelector('.ye-plat-admin-grid');
  if(!grid||grid.querySelector('[data-admin-section="iban"]'))return;
  const tile=document.createElement('button');
  tile.type='button';
  tile.className='ye-plat-admin-tile';
  tile.dataset.adminSection='iban';
  tile.innerHTML='<span class="ye-plat-admin-tile-icon">🏦</span><span><strong>IBAN Clienti</strong><small>Gestione coordinate bancarie</small></span><span class="ye-plat-admin-chevron">↗</span>';
  tile.addEventListener('click',function(e){
    e.preventDefault();
    e.stopPropagation();
    const content=document.getElementById('pageContent');
    if(content){
      content.innerHTML=`<section class="card">
        <h3>Gestione IBAN Clienti</h3>
        <p class="small">Inserisci le coordinate bancarie per un cliente.</p>
        <div class="form-grid" style="margin-top:16px">
          <label>Cliente (ID utente)
            <input id="ibanUserId" placeholder="UUID utente" />
          </label>
          <label>IBAN
            <input id="ibanInput" placeholder="IT60X0542811101000000123456" />
          </label>
          <label>Banca
            <input id="ibanBank" placeholder="Nome banca" />
          </label>
          <label>Intestatario
            <input id="ibanHolder" placeholder="Nome intestatario" />
          </label>
        </div>
        <label style="margin-top:12px">Note
          <input id="ibanNotes" placeholder="Note facoltative" />
        </label>
        <button class="primary" style="margin-top:16px" onclick="saveIbanManual()">Salva IBAN</button>
      </section>`;
    }
  });
  grid.appendChild(tile);
}
setTimeout(addIbanTile,500);
setInterval(addIbanTile,2000);
window.saveIbanManual = async function() {
  const userId = document.getElementById("ibanUserId")?.value;
  const iban = document.getElementById("ibanInput")?.value;
  if (!userId || !iban) { alert("Inserisci ID utente e IBAN"); return; }
  const client = window.sb;
  if (!client) { alert("Errore: connessione non disponibile"); return; }
  const ibanData = {
    iban: iban.trim(),
    bank_name: document.getElementById("ibanBank")?.value?.trim() || "",
    account_holder: document.getElementById("ibanHolder")?.value?.trim() || "",
    notes: document.getElementById("ibanNotes")?.value?.trim() || ""
  };
  localStorage.setItem("iban_" + userId.trim(), JSON.stringify(ibanData));
  try {
    // Store in profiles using a special prefix in display_name
    const {error} = await client.from("profiles").update({
      display_name: "IBAN:" + JSON.stringify(ibanData)
    }).eq("id", userId.trim());
    if (error) throw error;
    alert("IBAN salvato. Il cliente lo vedrà da qualsiasi dispositivo.");
  } catch(e) { 
    alert("Salvato localmente. Per il salvataggio permanente esegui lo SQL di abilitazione."); 
  }
};
  localStorage.setItem("iban_" + userId.trim(), JSON.stringify(ibanData));
  try {
    const {error} = await client.from("client_iban_data").upsert({
      user_id: userId.trim(),
      iban: ibanData.iban,
      bank_name: ibanData.bank_name,
      account_holder: ibanData.account_holder,
      notes: ibanData.notes
    }, {onConflict: "user_id"});
    if (error) throw error;
    alert("IBAN salvato con successo");
  } catch(e) { alert("Salvato localmente. Errore DB: " + (e.message || e)); }
};
})();
