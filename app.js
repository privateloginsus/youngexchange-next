(()=>{'use strict';
const cfg=window.YEX_CONFIG||{};const financialOperationsValid=cfg.financialOperationsEnabled===false;const configured=cfg.enabled===true&&financialOperationsValid&&typeof cfg.supabaseUrl==='string'&&typeof cfg.supabasePublishableKey==='string'&&cfg.supabasePublishableKey.startsWith('sb_publishable_')&&!window.YEX_PUBLIC_STARTUP_BLOCKED;if(!configured){const note=document.getElementById('authNote');if(note)note.textContent='Avvio bloccato: il backend pubblico non è ancora attivo. Accesso e operazioni finanziarie disabilitati.';return}const sb=window.supabase&&configured?window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{detectSessionInUrl:true,autoRefreshToken:true,persistSession:true}}):null;
const $=id=>document.getElementById(id);const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const fmt=(n,d=2)=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:d,maximumFractionDigits:d});const eur=n=>'€ '+fmt(n);const assets=[{id:'bitcoin',symbol:'BTC',name:'Bitcoin',icon:'₿'},{id:'ethereum',symbol:'ETH',name:'Ethereum',icon:'Ξ'},{id:'tether',symbol:'USDT',name:'Tether',icon:'₮'},{id:'solana',symbol:'SOL',name:'Solana',icon:'◎'},{id:'ripple',symbol:'XRP',name:'XRP',icon:'✕'},{id:'binancecoin',symbol:'BNB',name:'BNB',icon:'◇'}];let isAdmin=false,adminSelectedUser=null,adminStatusFilter='',session=null,profile=null,wallets=[],quotes={},history=[],selected='bitcoin',mode='login',lastFetch=0,loading=false,routeGeneration=0;const toast=msg=>{const t=$('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),5500)};const authRedirectUrl=()=>new URL(location.pathname,location.origin).toString();const recoveryRedirectUrl=()=>'https://youngexchange.eu/reimposta-password.html';
function personalProfileValues(user=session?.user,currentProfile=profile){const metadata=user?.user_metadata||{};return{firstName:String(currentProfile?.first_name||metadata.first_name||''),lastName:String(currentProfile?.last_name||metadata.last_name||'')}}
function personalProfileDisplayName(user=session?.user,currentProfile=profile){const names=personalProfileValues(user,currentProfile),fullName=[names.firstName,names.lastName].map(name=>name.trim()).filter(Boolean).join(' '),fallback=[currentProfile?.display_name,user?.user_metadata?.display_name,user?.email].map(value=>String(value||'').trim()).find(Boolean);return fullName||fallback||'Utente'}
function personalProfilePayload(firstName,lastName){const first=String(firstName||'').trim().replace(/\s+/g,' '),last=String(lastName||'').trim().replace(/\s+/g,' ');if(!first||!last||first.length>80||last.length>80)throw new Error('Inserisci nome e cognome (massimo 80 caratteri ciascuno).');return{first_name:first,last_name:last,display_name:first+' '+last}}
function phoneVerificationUnavailable(error){const code=String(error?.code||'').toLowerCase(),message=String(error?.message||'').toLowerCase();return['phone_provider_disabled','sms_provider_disabled'].includes(code)||/phone provider.*(?:disabled|not enabled|not configured)|sms provider.*(?:disabled|not enabled|not configured)|sms.*not configured/.test(message)}
function updateHeaderIdentity(){const name=personalProfileDisplayName(),label=$('userDisplayName'),avatar=$('avatar');if(label){label.textContent=name;label.title=name}if(avatar)avatar.textContent=(name.match(/\S/)||['Y'])[0].toLocaleUpperCase()}
function ensurePersonalProfileNavigation(){const nav=$('nav');if(!nav)return;if(!$('profileSettingsNav')){const link=document.createElement('a');link.id='profileSettingsNav';link.href='#profile-settings';link.dataset.page='profile-settings';link.innerHTML='<span>♙</span> Impostazioni personali';link.addEventListener('click',()=>document.querySelector('.sidebar')?.classList.remove('open'));const before=nav.querySelector('[data-page="security"]');nav.insertBefore(link,before||null)}if(!$('userDisplayName')){const label=document.createElement('span');label.id='userDisplayName';label.className='user-display-name';label.setAttribute('aria-live','polite');$('avatar')?.before(label)}}
function authMode(m){mode=m;$('tabLogin').classList.toggle('active',m==='login');$('tabRegister').classList.toggle('active',m==='register');$('nameWrap').hidden=m!=='register';$('passwordWrap').hidden=m==='forgot';$('forgotLink').hidden=m!=='login';$('authTitle').textContent=m==='register'?'Crea il tuo conto':m==='forgot'?'Recupera la password':m==='recovery'?'Imposta una nuova password':'Accedi al tuo conto';$('authDesc').textContent=m==='register'?'Inizia il tuo percorso con YoungExchange.':m==='forgot'?'Ti invieremo un link per reimpostare la password.':m==='recovery'?'Scegli una nuova password di almeno 12 caratteri.':'Gestisci i tuoi asset con un’esperienza semplice e moderna.';$('authSubmit').innerHTML=(m==='register'?'Crea account':m==='forgot'?'Invia link di recupero':m==='recovery'?'Aggiorna password':'Accedi')+' <span>↗</span>';$('password').required=m!=='forgot';$('email').required=m!=='recovery';$('email').closest('form').querySelector('label[for=email]').hidden=m==='recovery';$('email').hidden=m==='recovery';$('password').autocomplete=m==='register'?'new-password':'current-password';$('authNote').textContent=m==='register'?'Riceverai un’email per confermare il tuo indirizzo.':m==='forgot'?'Controlla anche la cartella spam.':'';$('authNote').hidden=!(m==='register'||m==='forgot')}
function authErrorMessage(error){const code=String(error?.code||error?.error_code||'').toLowerCase();if(code==='invalid_credentials'||/invalid login credentials/i.test(String(error?.message||'')))return 'Credenziali non valide. Non riprovare con la stessa password: usa “Password dimenticata?” per il recupero ufficiale.';if(code==='email_not_confirmed')return 'Email non confermata. Apri il messaggio di conferma ricevuto, poi accedi di nuovo.';return 'Operazione non riuscita: '+String(error?.message||error)}
function adminNavigationDiagnostic(stage,detail=''){
 const labels={
  'click-received':'Clic amministrativo ricevuto',
  'authorization-check':'Autorizzazione amministratore in verifica',
  'access-denied':'Accesso amministrativo negato',
  'network-error':'Errore di rete nella verifica amministrativa',
  'panel-not-found':'Pannello amministrativo non trovato',
  'panel-displayed':'Pannello amministrativo visualizzato'
 };
 const message=labels[stage]||stage+(detail?': '+detail:'');
 console.info('[YoungExchange admin navigation]',stage,detail);
 let node=$('adminNavigationDiagnostic');
 if(!node){
  node=document.createElement('div');
  node.id='adminNavigationDiagnostic';
  node.setAttribute('role','status');
  node.setAttribute('aria-live','polite');
  node.style.cssText='position:fixed;right:16px;bottom:16px;z-index:2147483646;max-width:min(420px,calc(100vw - 32px));padding:10px 14px;border:1px solid #35e9a6;border-radius:10px;background:#061b14ee;color:#d9ffed;font:600 12px system-ui,sans-serif;box-shadow:0 8px 24px #0008';
  document.body.append(node);
 }
 node.dataset.stage=stage;
 node.textContent=message+(detail?': '+detail:'');
}
globalThis.YEXAdminNavigationDiagnostic=adminNavigationDiagnostic;
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>authMode(b.dataset.mode));$('forgotLink').addEventListener('click',()=>{location.href='password-recovery.html'});$('togglePassword').addEventListener('click',()=>{$('password').type=$('password').type==='password'?'text':'password'});
$('authForm').addEventListener('submit',async e=>{e.preventDefault();if(!sb){toast('Backend pubblico non configurato; accesso disabilitato.');return}const email=$('email').value.trim(),password=$('password').value;const b=$('authSubmit');b.disabled=true;try{let result;if(mode==='recovery'){result=await sb.auth.updateUser({password});if(!result.error){toast('Password aggiornata. Accedi con la nuova password.');await sb.auth.signOut();exit()}}else if(mode==='register'){result=await sb.auth.signUp({email,password,options:{emailRedirectTo:authRedirectUrl(),data:{display_name:$('displayName').value.trim().slice(0,80)}}});if(!result.error)toast('Registrazione inviata. Controlla la tua email e conferma l’account.')}else if(mode==='forgot'){result=await sb.auth.resetPasswordForEmail(email,{redirectTo:recoveryRedirectUrl()});if(!result.error)toast('Se l’indirizzo è registrato, riceverai un link di recupero.')}else{result=await sb.auth.signInWithPassword({email,password});if(!result.error&&result.data.session)await enter(result.data.session)}if(result?.error)throw result.error}catch(err){toast(authErrorMessage(err))}finally{b.disabled=false}});
function renderFirstLoginVerificationNotice(){
 const old=document.getElementById('yeFirstLoginVerification');old?.remove();
 if(isAdmin||!session?.user||!session.user.user_metadata?.ye_admin_provisioned)return;
 if(session.user.email_confirmed_at&&session.user.phone_confirmed_at)return;
 const notice=document.createElement('section');
 notice.id='yeFirstLoginVerification';notice.setAttribute('role','status');
 notice.style.cssText='margin:14px 20px;padding:16px;border:1px solid #35e9a6;border-radius:12px;background:#08291e;color:#e4fff0';
 const heading=document.createElement('strong');heading.textContent='Completa la verifica del tuo conto';
 const description=document.createElement('p');
 description.textContent='Email: '+(session.user.email_confirmed_at?'confermata':'da confermare')+' · Telefono: '+(session.user.phone_confirmed_at?'confermato':'da verificare')+'. La creazione amministrativa del conto non sostituisce la verifica dei recapiti.';
 notice.append(heading,description);
 if(!session.user.phone_confirmed_at){
  const button=document.createElement('button');button.type='button';button.className='secondary-btn';button.textContent='Verifica il numero con codice SMS';button.addEventListener('click',()=>phoneVerification());notice.append(button);
 }
 const host=document.getElementById('pageContent');host?.parentElement?.insertBefore(notice,host);
}
async function enter(s){session=s;$('authScreen').hidden=true;$('appScreen').hidden=false;ensurePersonalProfileNavigation();if(!document.getElementById('yeCorner')){const badge=document.createElement('div');badge.id='yeCorner';badge.className='ye-corner';badge.innerHTML='<span class="ye-orbit">Y</span><span>YoungExchange · Workspace</span>';document.body.append(badge);}await loadPrivate();updateHeaderIdentity();await checkAdmin();route();renderFirstLoginVerificationNotice();fetchQuotes();yeStartMarketStream();}function exit(){yeStopMarketStream();document.getElementById('yeCorner')?.remove();document.getElementById('yeFirstLoginVerification')?.remove();isAdmin=false;adminSelectedUser=null;const adminLink=$('adminNavLink');if(adminLink){adminLink.hidden=true;adminLink.style.display='none'};session=null;profile=null;wallets=[];$('appScreen').hidden=true;$('authScreen').hidden=false;authMode('login')}
async function loadPrivate(){if(!sb||!session)return;const id=session.user.id;const {error:provisionError}=await sb.rpc('ye_ensure_my_wallets');if(provisionError){console.error('Provisioning profilo/wallet non riuscito:',provisionError);toast('Profilo e wallet non disponibili: '+provisionError.message);profile=null;wallets=[];return}const [p,w]=await Promise.all([sb.from('profiles').select('id,display_name,first_name,last_name,phone_verified,created_at').eq('id',id).maybeSingle(),sb.from('wallets').select('id,currency,balance,locked_balance').eq('user_id',id)]);if(p.error)toast('Profilo non disponibile: '+p.error.message);if(w.error)toast('Wallet non disponibili: '+w.error.message);profile=p.data||null;wallets=w.data||[]}
async function checkAdmin(){
 isAdmin=false;
 const link=$('adminNavLink');
 if(link){link.hidden=true;link.style.display='none'}
 if(!sb||!session)return false;
 globalThis.YEXAdminNavigationDiagnostic?.('authorization-check','is_youngexchange_admin()');
 const {data,error}=await sb.rpc('is_youngexchange_admin');
 if(error){console.error('Verifica amministratore non riuscita:',error);globalThis.YEXAdminNavigationDiagnostic?.('network-error',error.message);return false}
 isAdmin=data===true;
 if(isAdmin&&link){link.hidden=false;link.style.display='';globalThis.YEXAdminNavigationDiagnostic?.('panel-displayed','Amministrazione autorizzata')}
 else globalThis.YEXAdminNavigationDiagnostic?.('access-denied','is_youngexchange_admin() ha restituito false');
 return isAdmin;
}
$('signout').addEventListener('click',async()=>{if(sb)await sb.auth.signOut();exit()});$('menuToggle').addEventListener('click',()=>document.querySelector('.sidebar').classList.toggle('open'));document.querySelectorAll('#nav a').forEach(a=>a.addEventListener('click',()=>document.querySelector('.sidebar').classList.remove('open')));
async function fetchQuotes(force=false){if(loading||(!force&&Date.now()-lastFetch<60000))return;loading=true;try{const ids=assets.map(a=>a.id).join(',');const r=await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&ids='+ids+'&price_change_percentage=24h&sparkline=true',{headers:{accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json();if(!Array.isArray(data)||!data.length)throw Error('Nessuna quotazione');const latest=Object.fromEntries(data.map(x=>[x.id,x]));for(const [id,item] of Object.entries(latest)){const live=quotes[id];const cgPrice=Number(item.current_price);item.yeBaseline24h=cgPrice/(1+Number(item.price_change_percentage_24h||0)/100);if(yeMarketConnected&&live?.yeLiveAt&&Date.now()-live.yeLiveAt<15000)item.current_price=live.current_price;if(live?.yeLiveAt){item.yeLiveAt=live.yeLiveAt;item.current_price=live.current_price}quotes[id]=item}lastFetch=Date.now();if(session){yeMarketDirty=true;yeMarketRefreshUI()}}catch(e){if(!yeMarketConnected)$('marketStatus').textContent=lastFetch?'Dati di mercato in ritardo':'Mercati non disponibili';if(!Object.keys(quotes).length)toast('Quotazioni non disponibili al momento. Riprova tra poco.')}finally{loading=false}}
// Feed pubblico Kraken WebSocket v2: i prezzi cambiano solo quando arriva una quotazione reale.
// CoinGecko resta la fonte di fallback per grafici, capitalizzazione e variazione 24h.
let yeMarketSocket=null,yeMarketDirty=false,yeMarketConnected=false,yeMarketLastTick=0;
const yeKrakenSymbols={'BTC/EUR':'bitcoin','ETH/EUR':'ethereum','USDT/EUR':'tether','SOL/EUR':'solana','XRP/EUR':'ripple','BNB/EUR':'binancecoin'};
function yeStartMarketStream(){
 if(yeMarketSocket||!session||!('WebSocket' in window))return;
 try{
  const ws=new WebSocket('wss://ws.kraken.com/v2');yeMarketSocket=ws;
  ws.onopen=()=>{yeMarketConnected=true;ws.send(JSON.stringify({method:'subscribe',params:{channel:'ticker',symbol:Object.keys(yeKrakenSymbols),snapshot:true}}))};
  ws.onmessage=event=>{try{
   const msg=JSON.parse(event.data);if(msg.channel!=='ticker'||!Array.isArray(msg.data))return;
   for(const tick of msg.data){const id=yeKrakenSymbols[tick.symbol],v=Number(tick.last);if(!id||!Number.isFinite(v)||v<=0)continue;
    quotes[id]={...(quotes[id]||{}),id,current_price:v,yeLiveAt:Date.now()};yeMarketLastTick=Date.now();yeMarketDirty=true;
   }
  }catch(e){console.warn('Ticker non valido',e)}};
  ws.onerror=()=>{yeMarketConnected=false};
  ws.onclose=()=>{yeMarketSocket=null;yeMarketConnected=false};
 }catch(e){console.warn('Feed prezzi non disponibile',e)}
}
function yeStopMarketStream(){if(yeMarketSocket){const ws=yeMarketSocket;yeMarketSocket=null;ws.onclose=null;ws.close()}yeMarketConnected=false}
function yeMarketRefreshUI(){
 if(!session)return;
 if(!yeMarketSocket)yeStartMarketStream();
 const status=$('marketStatus');
 if(status){const fresh=yeMarketConnected&&yeMarketLastTick&&Date.now()-yeMarketLastTick<15000;status.textContent=fresh?'Aggiornamento live':yeMarketConnected?'Connessione live · in attesa dati':lastFetch?'Dati di mercato in ritardo':'Connessione ai mercati…';}
 if(!yeMarketDirty)return;yeMarketDirty=false;
 const key=location.hash.slice(1).split('?')[0]||'dashboard';
 if(!['dashboard','markets','wallet'].includes(key))return;
 // Aggiorna solo i valori dei prezzi: niente ridisegno della pagina, perdita di scroll o focus.
 const root=$('pageContent');if(!root)return;
 root.querySelectorAll('[data-ye-price]').forEach(el=>{const a=assets.find(x=>x.id===el.dataset.yePrice);if(a)el.textContent=price(a)});
 root.querySelectorAll('[data-ye-change]').forEach(el=>{const a=assets.find(x=>x.id===el.dataset.yeChange);if(a)el.innerHTML=change(a)});
 root.querySelectorAll('[data-ye-total]').forEach(el=>el.textContent=eur(total()));
 root.querySelectorAll('[data-ye-wallet-value]').forEach(el=>{const a=assets.find(x=>x.symbol===el.dataset.yeWalletValue);if(a&&q(a))el.textContent=eur(balance(a.symbol)*q(a).current_price)});
 // Ridisegna gli indicatori live del grafico senza rigenerare l'intera pagina.
 if(key==='dashboard'&&$('mainChart'))$('mainChart')._yeCandle?.paint?.();
 if(key==='markets'&&$('marketChart'))$('marketChart')._yeCandle?.paint?.();
}
setInterval(yeMarketRefreshUI,1000);
const q=a=>quotes[a.id];const change=a=>{const item=q(a);const v=item?.yeBaseline24h>0?(item.current_price/item.yeBaseline24h-1)*100:item?.price_change_percentage_24h;return v==null?'—':`<span class="${v>=0?'positive':'negative'}">${v>=0?'+':''}${fmt(v)}%</span>`};const coin=a=>`<div class="coin"><div class="coin-icon">${a.icon}</div><div><div class="coin-name">${a.name}</div><div class="coin-sub">${a.symbol}</div></div></div>`;const price=a=>q(a)?.current_price!=null?eur(q(a).current_price):'—';const livePrice=a=>`<span data-ye-price="${a.id}">${price(a)}</span>`;const liveChange=a=>`<span data-ye-change="${a.id}">${change(a)}</span>`;const wallet=a=>wallets.find(w=>w.currency===a);const balance=a=>Number(wallet(a)?.balance||0);const total=()=>wallets.reduce((sum,w)=>sum+(w.currency==='EUR'?Number(w.balance):Number(w.balance)*(assets.find(a=>a.symbol===w.currency)?q(assets.find(a=>a.symbol===w.currency))?.current_price||0:0)),0);
const heading=(title,sub,right='')=>`<div class="page-heading"><div><h1>${title}</h1><p>${sub}</p></div>${right}</div>`;const card=(label,value,foot='')=>`<div class="card"><div class="card-label">${label}</div><div class="metric">${value}</div><div class="small">${foot}</div></div>`;const empty=`<div class="empty">Nessun movimento da mostrare.<br>Le attività del conto appariranno qui quando disponibili.</div>`;
function dashboard(){
 const ticker=assets.slice(0,5).map(a=>`<div class="pl-tick"><span class="pl-tick-icon">${a.icon}</span><b>${a.symbol}</b><span>${livePrice(a)}</span><span>${liveChange(a)}</span></div>`).join('');
 const kpi=[['◈','Patrimonio complessivo',eur(total()),'Valore stimato EUR'],['▣','Saldo disponibile',eur(balance('EUR')),'Conto EUR'],['◎','Portafogli attivi',wallets.length,'Asset del conto'],['▥','Mercati monitorati',Object.keys(quotes).length,'Quotazioni disponibili']];
 const cards=kpi.map(([icon,label,value,note])=>`<section class="pl-kpi"><span class="pl-kpi-icon">${icon}</span><div><div class="pl-kpi-label">${label}</div><div class="pl-kpi-value">${value}</div><small>${note}</small></div></section>`).join('');
 const market=assets.map((a,i)=>`<div class="pl-market-row"><span class="pl-rank">${i+1}</span><span class="pl-coin">${a.icon}</span><div class="pl-asset"><strong>${a.symbol}</strong><small>${a.name}</small></div><span class="pl-market-price">${livePrice(a)}</span><span class="pl-market-change">${liveChange(a)}</span><button type="button" class="pl-market-link" data-trade="${a.id}" aria-label="Apri grafico ${a.name}">↗</button></div>`).join('');
 return `<div class="pl-dashboard"><div class="pl-ticker"><span class="pl-ticker-label">YoungExchange <i>◆</i></span><div class="pl-ticker-scroll">${ticker}</div><span class="pl-live-indicator"><i></i> LIVE</span></div><div class="pl-intro"><div><span class="pl-eyebrow">YOUNGEXCHANGE / PANORAMICA</span><h1>Panoramica<span class="pl-head-spark">✦</span></h1><p>Il tuo spazio finanziario, in una nuova dimensione.</p></div><span class="pl-intro-chip">✧ WORKSPACE</span></div><div class="pl-kpi-grid">${cards}</div><section class="ye-opportunity-hub" aria-labelledby="yeOpportunityTitle"><div class="ye-opportunity-heading"><div><span class="pl-eyebrow">YOUNGEXCHANGE OPPORTUNITY HUB</span><h2 id="yeOpportunityTitle">Più possibilità, un'unica esperienza.</h2><p>Scopri gli strumenti YoungExchange per osservare i mercati, organizzare il tuo portafoglio e gestire le tue attività con maggiore chiarezza.</p></div><span class="ye-opportunity-mark" aria-hidden="true">✦</span></div><div class="ye-opportunity-grid"><a class="ye-opportunity-card" href="#activity"><span class="ye-opportunity-icon" aria-hidden="true">↗</span><strong>Operatività intuitiva</strong><span>Strumenti chiari per gestire le attività.</span></a><a class="ye-opportunity-card" href="#activity"><span class="ye-opportunity-icon" aria-hidden="true">≋</span><strong>Costi trasparenti</strong><span>Maggiore controllo sui costi delle operazioni.</span></a><a class="ye-opportunity-card" href="#markets"><span class="ye-opportunity-icon" aria-hidden="true">◌</span><strong>Analisi evoluta</strong><span>Grafici e strumenti per osservare i mercati.</span></a><a class="ye-opportunity-card" href="#security"><span class="ye-opportunity-icon" aria-hidden="true">♢</span><strong>Protezione dell'account</strong><span>Controlli di sicurezza e gestione degli accessi.</span></a><a class="ye-opportunity-card" href="#wallet"><span class="ye-opportunity-icon" aria-hidden="true">◈</span><strong>Gestione del portafoglio</strong><span>Una panoramica organizzata degli asset digitali.</span></a><a class="ye-opportunity-card" href="#markets"><span class="ye-opportunity-icon" aria-hidden="true">✧</span><strong>Opportunità da esplorare</strong><span>Informazioni e strumenti per valutare i mercati.</span></a></div></section><div class="pl-main-grid"><section class="pl-panel pl-chart-panel"><div class="pl-chart-heading"><div><span class="pl-eyebrow">ANALISI DEI MERCATI</span><h2><span class="pl-btc">₿</span> Bitcoin / EUR <small>BTC/EUR</small></h2><div class="pl-price-line"><span id="yeChartPriceMain">${livePrice(assets[0])}</span><span>${liveChange(assets[0])}</span></div></div><span class="pl-live-indicator"><i></i> MERCATO</span></div><div class="pl-chart-subhead"><span>GRAFICO A CANDELE</span><span id="yeStatsMain">Dati OHLC disponibili</span></div>${yeChartControls('mainChart')}<div class="ye-chart-workspace"><div class="ye-chart-plot"><canvas class="chart chart-tall" id="mainChart"></canvas></div><aside class="ye-chart-side"><div class="ye-side-title">Panoramica <span>● LIVE</span></div><div id="yeChartSummaryMain" class="ye-summary-rows">Caricamento dati di mercato…</div><p>Dati di mercato, non un sistema di esecuzione.</p></aside></div></section><section class="pl-panel pl-markets-panel"><div class="pl-panel-title"><div><span class="pl-eyebrow">PANORAMICA ASSET</span><h2>Mercati <span class="pl-green">↗</span></h2></div><a href="#markets">Esplora tutti ↗</a></div><div class="pl-market-tabs"><span class="selected">Tutti</span><span>Crypto</span><span>Spot · EUR</span></div><div class="pl-market-list">${market}</div><p class="pl-data-note">Prezzi mostrati quando disponibili dal feed.</p></section></div><div class="pl-bottom-grid"><section class="pl-panel pl-activity-panel"><div class="pl-panel-title"><div><span class="pl-eyebrow">WORKSPACE</span><h2>Attività recenti</h2></div><a href="#activity">Apri attività ↗</a></div><div class="pl-empty"><span>▤</span><div><strong>Le tue operazioni, in un unico posto</strong><p>Consulta lo storico delle richieste e dei movimenti nella sezione Attività.</p></div></div><a class="pl-inline-link" href="#activity">Visualizza attività →</a></section><section class="pl-panel pl-wallet-panel"><div class="pl-panel-title"><div><span class="pl-eyebrow">PORTAFOGLIO</span><h2>I tuoi saldi</h2></div><a href="#wallet">Apri wallet ↗</a></div><div class="pl-wallet-total" data-ye-total>${eur(total())}</div><div class="pl-wallet-list">${['EUR','USDT','BTC','ETH'].map(c=>`<div><span>${c==='EUR'?'€':c==='USDT'?'₮':c==='BTC'?'₿':'Ξ'} &nbsp; ${c}</span><strong>${c==='EUR'?eur(balance(c)):fmt(balance(c),c==='BTC'||c==='ETH'?6:2)+' '+c}</strong></div>`).join('')}</div></section><section class="pl-panel pl-actions-panel"><div class="pl-panel-title"><div><span class="pl-eyebrow">OPERAZIONI</span><h2>Azioni rapide</h2></div><span class="pl-green">✦</span></div><div class="actions">${actions()}</div><div class="pl-security-line">♢ &nbsp; Le operazioni richiedono autorizzazioni e verifiche.</div></section></div></div>`;
}
function actions(){return [['↓','Deposita','deposit'],['↑','Preleva','withdraw'],['↔','Trasferisci','transfer'],['⇄','Converti','swap']].map(([i,n,a])=>`<button class="action" data-action="${a}"><strong>${i}</strong><span>${n}</span></button>`).join('')}
function markets(){return heading('Mercati crypto','Quotazioni live quando disponibili. Variazioni nelle ultime 24 ore; aggiornamenti secondo la disponibilità del mercato.','<button class="secondary-btn" id="refreshMarkets">↻ Aggiorna</button>')+`<div class="grid cols-3">${assets.slice(0,3).map(a=>card(a.name,livePrice(a),liveChange(a))).join('')}</div><section class="card mt"><div class="section-head"><h3>Panoramica dei mercati</h3><span class="small">Quotazioni live · variazione 24 ore · possibili ritardi</span></div><div class="table-wrap"><table><thead><tr><th>Asset</th><th>Prezzo EUR</th><th>24 ore</th><th>Capitalizzazione</th><th></th></tr></thead><tbody>${assets.map(a=>`<tr><td>${coin(a)}</td><td>${livePrice(a)}</td><td>${liveChange(a)}</td><td>${q(a)?.market_cap!=null?eur(q(a).market_cap):'—'}</td><td><button class="table-link" data-trade="${a.id}">Grafico ↗</button></td></tr>`).join('')}</tbody></table></div></section><section class="card mt ye-market-chart"><div class="section-head"><h3 id="yeMarketChartTitle">Grafico di mercato</h3><span class="small">Dati OHLC di mercato · non è un sistema di esecuzione</span></div>${yeChartControls('marketChart')}<div class="ye-chart-workspace"><div class="ye-chart-plot"><canvas id="marketChart" class="chart chart-tall"></canvas></div><aside class="ye-chart-side"><div class="ye-side-title">Panoramica <span>● LIVE</span></div><div id="yeChartSummaryMarket" class="ye-summary-rows">Caricamento dati di mercato…</div><p>Valori OHLC reali; nessun ordine eseguito da questo grafico.</p></aside></div></section>`}
function walletPage(){return heading('Il tuo portafoglio','Gestisci e consulta i tuoi asset digitali in un ambiente dedicato.','<span class="pill">◈ Wallet interno YoungExchange</span>')+`<div class="grid cols-2"><section class="card"><div class="card-label">Patrimonio totale stimato</div><div class="metric" style="font-size:40px"><span data-ye-total>${eur(total())}</span></div><div class="small">Saldi dal database Supabase · prezzi di mercato esterni</div><div class="actions">${actions()}</div></section><section class="card"><div class="section-head"><h3>Stato del conto</h3></div><div class="asset-row"><span class="muted">Email</span><strong>${esc(session?.user.email||'—')}</strong></div><div class="asset-row"><span class="muted">Portafogli creati</span><strong>${wallets.length}</strong></div><div class="asset-row"><span class="muted">Verifica telefonica</span><strong>${session?.user.phone_confirmed_at?'Verificato':'Non verificato'}</strong></div></section></div><section class="card mt"><div class="section-head"><h3>I tuoi asset</h3><span class="small">Saldi in sola lettura</span></div>${['EUR','BTC','ETH','USDT',...wallets.map(w=>w.currency).filter(c=>!['EUR','BTC','ETH','USDT'].includes(c))].map(c=>{const a=assets.find(x=>x.symbol===c);const wallet=wallets.find(w=>w.currency===c);const reserved=Number(wallet?.locked_balance||0);const available=Math.max(0,balance(c)-reserved);return `<div class="asset-row">${a?coin(a):`<div class="coin"><div class="coin-icon">€</div><div><div class="coin-name">Euro</div><div class="coin-sub">EUR</div></div></div>`}<div class="align-right"><strong>${fmt(balance(c),c==='EUR'?2:8)} ${c}</strong><div class="small">Disponibile ${fmt(available,c==='EUR'?2:8)} · Riservato ${fmt(reserved,c==='EUR'?2:8)}</div></div></div>`}).join('')}</section>`}
async function loadAllRows(buildQuery,pageSize=500){
 const rows=[],seen=new Set();
 for(let from=0;;from+=pageSize){
  const {data,error}=await buildQuery().range(from,from+pageSize-1);
  if(error)throw error;
  if(!Array.isArray(data))throw new Error('Risposta Supabase non valida.');
  if(data.length>pageSize)throw new Error('Il server non ha rispettato la paginazione.');
  for(const row of data){
   if(!row||row.id==null)throw new Error('La risposta Supabase contiene un record non valido.');
   if(seen.has(row.id))throw new Error('La paginazione Supabase ha restituito record duplicati.');
   seen.add(row.id);
  }
  rows.push(...data);
  if(data.length<pageSize)return rows;
 }
}
async function activity(renderGeneration){
 const ownId=session.user.id;
 const load=async request=>{try{return{rows:await request()}}catch(error){return{error:error?.message||String(error)}}};
 const [legacyRequests,clientRequests,entries,internalDeposits,informativeRecords]=await Promise.all([
  load(()=>loadAllRows(()=>sb.from('operation_requests').select('id,operation_type,currency,amount,status,external_execution_status,created_at').eq('user_id',ownId).order('created_at',{ascending:false}).order('id',{ascending:false}))),
  load(()=>loadAllRows(()=>sb.rpc('ye_my_client_requests').order('created_at',{ascending:false}).order('id',{ascending:false}))),
  load(()=>loadAllRows(()=>sb.from('ledger_entries').select('id,wallet_id,operation_type,amount,created_at').eq('user_id',ownId).order('created_at',{ascending:false}).order('id',{ascending:false}))),
  load(()=>loadAllRows(()=>sb.rpc('ye_my_internal_deposits').order('created_at',{ascending:false}).order('id',{ascending:false}))),
  load(()=>loadAllRows(()=>sb.rpc('ye_informative_records_for_customer').order('reported_at',{ascending:false}).order('id',{ascending:false})))
 ]);
 if(renderGeneration!==routeGeneration||location.hash.slice(1).split('?')[0]!=='activity')return;
 const requests=(legacyRequests.rows||[]).concat((clientRequests.rows||[]).map(row=>({...row,operation_type:row.kind,source:'ye_client_requests'}))).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
 const errorBox=error=>error?`<p class="small" role="alert">Caricamento non riuscito: ${esc(error)}</p>`:'';
 const requestRows=requests.map(row=>`<tr><td>${esc(new Date(row.created_at).toLocaleString('it-IT'))}</td><td>${esc(row.operation_type)}</td><td>${fmt(row.amount,row.currency==='EUR'?2:row.currency==='USDT'?6:8)} ${esc(row.currency)}</td><td><span class="tag">${esc(requestStatusLabel(row))}</span></td><td>${row.source==='ye_client_requests'&&row.status==='pending'?`<button type="button" class="secondary-btn" data-cancel-request="${esc(row.id)}">Annulla</button>`:'—'}</td></tr>`).join('');
 const depositRows=(internalDeposits.rows||[]).map(row=>`<tr><td>${esc(new Date(row.created_at).toLocaleString('it-IT'))}</td><td>${esc(row.currency)}</td><td>${fmt(row.amount,row.currency==='EUR'?2:row.currency==='USDT'?6:8)}</td><td>${esc(row.reference||'—')}</td><td>Registrato sul conto</td></tr>`).join('');
 const entryRows=(entries.rows||[]).map(row=>{const currency=wallets.find(wallet=>wallet.id===row.wallet_id)?.currency;return `<tr><td>${esc(new Date(row.created_at).toLocaleString('it-IT'))}</td><td>${esc(row.operation_type)}</td><td>${fmt(row.amount,currency==='EUR'?2:currency==='USDT'?6:8)} ${esc(currency||'')}</td></tr>`}).join('');
 $('pageContent').innerHTML=heading('Attività','Storico delle richieste e dei movimenti registrati.')+
  `<section class="card"><div class="section-head"><h3>Richieste operative</h3><span class="small">${requests.length} risultati</span></div>${errorBox(legacyRequests.error)}${errorBox(clientRequests.error)}${requestRows?`<div class="table-wrap"><table><thead><tr><th>Data</th><th>Operazione</th><th>Importo</th><th>Stato</th><th>Azioni</th></tr></thead><tbody>${requestRows}</tbody></table></div>`:legacyRequests.error||clientRequests.error?'':empty}</section>`+
  `<section class="card mt"><div class="section-head"><h3>Depositi interni</h3></div>${errorBox(internalDeposits.error)}${depositRows?`<div class="table-wrap"><table><thead><tr><th>Data registrazione</th><th>Valuta</th><th>Importo</th><th>Riferimento</th><th>Stato</th></tr></thead><tbody>${depositRows}</tbody></table></div>`:internalDeposits.error?'':empty}</section>`+
  `<section class="card mt"><div class="section-head"><h3>Registro movimenti</h3></div>${errorBox(entries.error)}${entryRows?`<div class="table-wrap"><table><thead><tr><th>Data</th><th>Tipo</th><th>Importo</th></tr></thead><tbody>${entryRows}</tbody></table></div>`:entries.error?'':empty}</section>`;
  $('pageContent').innerHTML+=`<section class="card mt"><div class="section-head"><h3>Registrazioni informative</h3><span class="small">Informativa — non eseguita</span></div>${errorBox(informativeRecords.error)}${(informativeRecords.rows||[]).length?`<div class="table-wrap"><table><thead><tr><th>Data</th><th>Tipologia</th><th>Importo dichiarato</th><th>Descrizione</th><th>Stato</th></tr></thead><tbody>${informativeRecords.rows.map(row=>`<tr><td>${esc(new Date(row.reported_at).toLocaleString('it-IT'))}</td><td>${esc(row.record_type)}</td><td>${fmt(row.declared_amount,row.currency==='EUR'?2:8)} ${esc(row.currency)}</td><td>${esc(row.description)}</td><td>${esc(row.status==='cancelled'?'Annullata':'Informativa — non eseguita')}</td></tr>`).join('')}</tbody></table></div>`:informativeRecords.error?'':empty}</section>`;
 $('pageContent').querySelectorAll('[data-cancel-request]').forEach(button=>button.addEventListener('click',()=>cancelClientRequest(button.dataset.cancelRequest,button)));
}
async function cancelClientRequest(requestId,button){
 if(!requestId||!sb||!session)return;
 button.disabled=true;
 try{
  const {error}=await sb.rpc('ye_client_cancel_request',{p_request_id:requestId});
  if(error)throw error;
  toast('Richiesta annullata. Nessun saldo è stato modificato.');
  await activity(routeGeneration);
 }catch(error){
  toast('Annullamento non riuscito: '+(error?.message||String(error)));
  button.disabled=false;
 }
}
function security(){return heading('Sicurezza','Controlla l’accesso e le verifiche del tuo account.')+`<div class="grid cols-2"><section class="card"><div class="section-head"><h3>Profilo e verifiche</h3></div><div class="asset-row"><span class="muted">Email</span><strong>${esc(session?.user.email||'—')}</strong></div><div class="asset-row"><span class="muted">Email confermata</span><span class="tag">${session?.user.email_confirmed_at?'Sì':'Da verificare'}</span></div><div class="asset-row"><span class="muted">Numero telefonico</span><strong>${session?.user.phone?esc(session.user.phone.replace(/.(?=.{3})/g,'•')):'Non collegato'}</strong></div><div class="asset-row"><span class="muted">Telefono confermato</span><span class="tag">${session?.user.phone_confirmed_at?'Sì':'No'}</span></div></section><section class="card"><div class="section-head"><h3>Proteggi il tuo account</h3></div><p class="muted">Associa e conferma il tuo numero di telefono per proteggere il conto.</p><button class="secondary-btn" data-action="phone">Verifica telefono</button><div class="divider"></div><button class="secondary-btn" data-action="password">Reimposta password via email</button></section></div>`}
function personalSettings(){const names=personalProfileValues(),user=session?.user||{};return heading('Impostazioni personali','Aggiorna i tuoi dati e gestisci le verifiche del conto.')+`<div class="grid cols-2"><section class="card"><div class="section-head"><h3>Nome e cognome</h3></div><form id="personalProfileForm"><label for="personalFirstName">Nome</label><input id="personalFirstName" name="first_name" autocomplete="given-name" maxlength="80" required value="${esc(names.firstName)}"><label for="personalLastName">Cognome</label><input id="personalLastName" name="last_name" autocomplete="family-name" maxlength="80" required value="${esc(names.lastName)}"><p id="personalProfileStatus" role="status" class="small" aria-live="polite"></p><button class="primary" type="submit">Salva nome e cognome</button></form></section><section class="card"><div class="section-head"><h3>Indirizzo email</h3></div><p class="small">Email attuale: <strong>${esc(user.email||'—')}</strong></p><form id="personalEmailForm"><label for="personalNewEmail">Nuova email</label><input id="personalNewEmail" name="email" type="email" autocomplete="email" maxlength="254" required><p id="personalEmailStatus" role="status" class="small" aria-live="polite">La modifica diventa attiva solo dopo la conferma richiesta da Supabase Auth.</p><button class="secondary-btn" type="submit">Richiedi cambio email</button></form></section><section class="card"><div class="section-head"><h3>Numero di telefono</h3></div><div class="asset-row"><span class="muted">Numero associato</span><strong>${user.phone?esc(user.phone):'Non associato'}</strong></div><div class="asset-row"><span class="muted">Verifica</span><span class="tag">${user.phone_confirmed_at?'Verificato':'Da verificare'}</span></div><p class="small">Il numero viene aggiornato solo dopo la conferma del codice SMS Supabase Auth. La disponibilità dipende dalla configurazione del provider SMS.</p><button class="secondary-btn" type="button" data-action="phone">${user.phone?'Modifica e verifica telefono':'Aggiungi e verifica telefono'}</button></section></div>`}
function support(){return heading('Assistenza YoungExchange','Il tuo centro assistenza, integrato nella piattaforma.')+`<div class="ye-support-layout"><section class="card ye-support-chat"><div class="ye-support-head"><h3>Chat con l’assistenza</h3><span class="ye-support-badge">Servizio clienti</span></div><div class="ye-support-conversation"><span class="ye-support-day">Benvenuto</span><div class="ye-support-message"><span class="ye-support-avatar">Y</span><div class="ye-support-bubble"><strong>YoungExchange · Centro assistenza</strong><p>Come possiamo aiutarti? Seleziona un argomento oppure apri la chat con il nostro team.</p></div></div><div class="ye-support-topics"><button data-support-topic="Conto e accesso">◈ Conto e accesso</button><button data-support-topic="Depositi e prelievi">↕ Depositi e prelievi</button><button data-support-topic="Mercati e quotazioni">⌁ Mercati e quotazioni</button><button data-support-topic="Sicurezza">♢ Sicurezza</button></div><div class="ye-support-help"><span class="ye-support-help-icon">✧</span><div><strong>Parla con l'assistenza</strong><p>Apri la conversazione protetta nel servizio di chat collegato a YoungExchange. La disponibilità degli operatori dipende dal servizio.</p></div></div></div><div class="ye-support-compose"><span>La chat si apre con il pulsante qui accanto.</span><button id="yeOpenSupport" class="primary">Apri chat ↗</button></div></section><section class="card ye-support-info"><h3>Come possiamo aiutarti?</h3><p class="muted">Trova le risposte ai dubbi più frequenti oppure contatta il supporto.</p><div class="ye-support-tools"><button data-support-topic="Assistenza chat">◌<strong>Chat</strong><small>Scrivi al team</small></button><button data-support-topic="Guide e istruzioni">▤<strong>Guide</strong><small>Informazioni utili</small></button><button data-support-topic="Domande frequenti">?<strong>FAQ</strong><small>Risposte rapide</small></button></div><h3 class="ye-support-subtitle">Argomenti più richiesti</h3><div class="ye-support-faq"><details><summary>Come effettuare un deposito?</summary><p>Apri Portafoglio e seleziona Deposita. Segui le istruzioni visualizzate e verifica lo stato della richiesta nella sezione Attività.</p></details><details><summary>Come verifico una richiesta?</summary><p>Puoi consultare lo stato delle richieste nella sezione Attività. L'approvazione non equivale necessariamente all'esecuzione di un trasferimento esterno.</p></details><details><summary>Come proteggere il mio conto?</summary><p>Non condividere password, codici OTP, token o chiavi private. Verifica sempre il dominio del sito.</p></details><details><summary>Come richiedere un prelievo?</summary><p>Apri Portafoglio e seleziona Preleva. La disponibilità e l'esecuzione effettiva dipendono dai servizi abilitati.</p></details></div><div class="ye-support-contact"><strong>Serve ancora aiuto?</strong><p>Il team di assistenza può rispondere attraverso il servizio collegato.</p><button id="yeOpenSupportSecondary" class="primary">Contatta il supporto ↗</button></div></section></div>`}
function yeOpenSupport(topic=''){const id=cfg.crispWebsiteId;if(!id){toast('Chat non configurata: verifica il Website ID del servizio di assistenza.');return;}if(!window.$crisp){window.$crisp=[];window.CRISP_WEBSITE_ID=id;const script=document.createElement('script');script.src='https://client.crisp.chat/l.js';script.async=true;script.onerror=()=>toast('Servizio chat non raggiungibile. Riprova più tardi.');document.head.appendChild(script);}if(topic)window.$crisp.push(['set','session:data',[["argomento",topic]]]);window.$crisp.push(['do','chat:open']);}

function adminPage(){
 if(!isAdmin)return heading('Amministrazione','Accesso amministrativo non disponibile')+
 '<section class="card ye-plat-admin-denied" role="alert"><h3>Accesso amministrativo negato</h3><p>Il ruolo amministratore non è confermato per questa sessione.</p><p class="small">La verifica viene eseguita esclusivamente da <code>is_youngexchange_admin()</code>. Accedi con un amministratore autorizzato; nessun privilegio viene assegnato dal browser.</p></section>';
 const sections=[['users','Utenti e conti','Gestione utenti, anagrafiche e wallet','users'],['deposits','Depositi','Richieste, verifiche e accrediti interni','download'],['withdrawals','Prelievi','Richieste e autorizzazioni','upload'],['transactions','Transazioni','Movimenti e trasferimenti interni','arrow-left-right'],['balances','Saldi','Controllo dei wallet e rettifiche','wallet'],['crypto','Crypto e cambi','Quotazioni e richieste di conversione','refresh-cw'],['history','Storico e controlli','Tracciamento e verifiche','history'],['settings','Impostazioni sito','Configurazione e sicurezza','settings']];
 return heading('Amministrazione','Centro di controllo · YoungExchange')+
 '<div class="ye-plat-admin-head"><div><span class="ye-plat-kicker">YOUNGEXCHANGE / CENTRO DI CONTROLLO</span><h2>Workspace amministrativo</h2><p>Conti, richieste e controlli in un unico ambiente protetto.</p></div><span class="ye-plat-admin-chip">◆ YoungExchange</span></div>'+
 '<div class="ye-plat-admin-grid">'+sections.map(([id,label,description])=>'<button type="button" class="ye-plat-admin-tile '+(activeAdminSection===id?'active':'')+'" data-admin-section="'+id+'"><span class="ye-plat-admin-tile-icon">'+({users:'♙',deposits:'↓',withdrawals:'↑',transactions:'↔',balances:'◈',crypto:'⇄',history:'▤',settings:'⚙'}[id])+'</span><span><strong>'+esc(label)+'</strong><small>'+esc(description)+'</small></span><span class="ye-plat-admin-chevron">↗</span></button>').join('')+'</div>'+
 '<div id="adminWorkspace" class="ye-plat-workspace mt"><section class="card"><h3>Caricamento dati amministrativi…</h3></section></div>';
}
// PLATINUM: helper amministrativi centralizzati. Ogni RPC applica le autorizzazioni nel database.
const adminDate=value=>{if(!value)return '—';const date=new Date(value);return Number.isNaN(date.getTime())?'—':date.toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'})};
const adminOperationLabels={deposit:'Deposito',withdrawal:'Prelievo',transfer:'Trasferimento',swap:'Conversione',buy:'Acquisto',sell:'Vendita',internal_deposit:'Accredito interno',manual_credit:'Rettifica positiva',manual_debit:'Rettifica negativa'};
const adminStatusLabels={pending:'In attesa',approved:'Approvata',awaiting_execution:'In attesa di esecuzione · stato legacy',rejected:'Rifiutata',completed:'Completata',posted:'Contabilizzata',failed:'Non riuscita',cancelled:'Annullata'};
function requestStatusLabel(row){
 if(row.status==='approved'&&row.external_execution_status==='processing')return 'Approvata · esecuzione esterna in corso';
 if(row.status==='approved'&&row.external_execution_status==='not_started'&&['withdraw','withdrawal'].includes(row.kind||row.operation_type))return 'Approvata · in attesa di esecuzione';
 return adminStatusLabels[row.status]||String(row.status||'Stato non disponibile');
}
const adminErr=error=>{console.error('[YoungExchange Platinum] Errore amministrazione:',error);toast('Amministrazione: '+(error?.message||String(error)))};
async function adminRpc(name,args={}){
 if(!sb||!session||!isAdmin)throw Error('Sessione amministratore non autorizzata.');
 const {data,error}=await sb.rpc(name,args);
 if(error)throw Error(name+': '+error.message);
 if(data==null)return [];
 return Array.isArray(data)?data:[data];
}
const adminSections=['users','informative-records','deposits','withdrawals','transactions','balances','crypto','history','settings'];
let activeAdminSection='users';
function adminTable(rows,columns){return '<div class="table-wrap"><table><thead><tr>'+columns.map(c=>'<th>'+esc(c[0])+'</th>').join('')+'</tr></thead><tbody>'+(rows.length?rows.map(r=>'<tr>'+columns.map(c=>'<td>'+c[1](r)+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+columns.length+'">Nessun dato disponibile.</td></tr>')+'</tbody></table></div>'}
function adminTools(rows,kind){
 const id='adm-'+kind;
 return '<div class="mt"><label for="'+id+'-search">Cerca in '+esc(kind)+'</label><input id="'+id+'-search" data-admin-search="'+esc(kind)+'" placeholder="Cerca per utente, valuta, stato o identificativo" autocomplete="off"><button type="button" class="secondary-btn" data-admin-export="'+esc(kind)+'">Esporta CSV</button></div>';
}
function adminFilter(rows,query){const q=String(query||'').trim().toLocaleLowerCase();return q?rows.filter(row=>Object.values(row).some(v=>String(v??'').toLocaleLowerCase().includes(q))):rows}
function adminExport(rows,kind){
 const keys=[...new Set(rows.flatMap(row=>Object.keys(row)))];
 const cell=v=>'"'+String(v??'').replace(/"/g,'""').replace(/^[=+@-]/,'\t$&')+'"';
 const csv='\ufeff'+keys.map(cell).join(',')+'\r\n'+rows.map(row=>keys.map(k=>cell(row[k])).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='youngexchange-'+kind+'-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function adminBindTools(workspace,rows,kind,columns){
 const input=workspace.querySelector('[data-admin-search="'+kind+'"]');
 const target=workspace.querySelector('[data-admin-results="'+kind+'"]');
 const exportButton=workspace.querySelector('[data-admin-export="'+kind+'"]');
 if(input&&target)input.oninput=()=>target.innerHTML=adminTable(adminFilter(rows,input.value),columns);
 if(exportButton)exportButton.onclick=()=>adminExport(adminFilter(rows,input?.value),kind);
}
const adminCell=v=>esc(v??'—');
const adminAmount=r=>fmt(r.amount,r.currency==='EUR'?2:8)+' '+esc(r.currency||'');
const adminOperationColumns=[['Data',r=>adminCell(adminDate(r.operation_date||r.created_at))],['Cliente',r=>adminCell(r.client||r.email||r.user_id)],['Tipo',r=>adminCell(adminOperationLabels[r.operation_type]||r.operation_type)],['Importo',adminAmount],['Destinazione',r=>adminCell(r.destination||r.target||r.destination_iban||'Interno')],['Stato',r=>'<span class="tag">'+adminCell(requestStatusLabel(r))+'</span>']];
let yeQueueRefreshGeneration=0;
async function yeRefreshQueue(){
 if(!isAdmin||!session)return false;
 const host=$('yeClientQueue');if(!host||!host.isConnected)return false;
 const generation=++yeQueueRefreshGeneration;
 try{
  if(!window.YEAdminOperationRequests)throw new Error('Modulo richieste amministrative non disponibile.');
  const {rows,errors,limitWarnings}=await window.YEAdminOperationRequests.load((name,args,range)=>sb.rpc(name,args).range(range.from,range.to));
  if(!host.isConnected||$('yeClientQueue')!==host||generation!==yeQueueRefreshGeneration)return false;
  const errorNotice=errors.length?'<p class="small" role="alert">Alcune fonti non sono state caricate: '+errors.map(e=>esc(e.rpc+': '+e.message)).join(' · ')+'</p>':'';
  const limitNotice=limitWarnings.length?'<p class="small" role="status">Una o più fonti hanno raggiunto il limite restituito dalla RPC ('+limitWarnings.map(e=>esc(e.rpc+': '+e.limit)).join(', ')+'). Potrebbero esserci record meno recenti non inclusi; per recuperarli serve una RPC con paginazione.</p>':'';
  const pending=rows.filter(r=>r.status==='pending').length;
  const columns=[...adminOperationColumns,['Azione',r=>{
   if(r.source==='ye_admin_entries'&&r.kind==='deposit_request'&&r.status==='pending')return '<button type="button" class="secondary-btn" data-ye-action="approved" data-ye-id="'+esc(r.sourceId)+'">Approva</button> <button type="button" class="secondary-btn" data-ye-action="rejected" data-ye-id="'+esc(r.sourceId)+'">Rifiuta</button>';
   if(r.source!=='ye_client_requests')return '—';
   if(r.status==='pending'){
    const approve=['deposit','withdraw','transfer','swap','buy','sell'].includes(r.kind)&&
      (!['swap','buy','sell'].includes(r.kind)||r.quote_id)?'<button type="button" class="secondary-btn" data-ye-action="approved" data-ye-id="'+esc(r.sourceId)+'">Approva</button> ':'';
    const block=['swap','buy','sell'].includes(r.kind)&&!r.quote_id?'<span class="small">Quotazione non confermata</span> ':'';
    return block+approve+'<button type="button" class="secondary-btn" data-ye-action="rejected" data-ye-id="'+esc(r.sourceId)+'">Rifiuta</button>';
   }
   if(r.kind==='withdraw'&&r.status==='approved')return '<button type="button" class="secondary-btn" data-ye-action="confirmed" data-ye-id="'+esc(r.sourceId)+'">Registra pagamento esterno</button> <button type="button" class="secondary-btn" data-ye-action="failed" data-ye-id="'+esc(r.sourceId)+'">Registra esito negativo</button>';
   return '—';
  }]];
  host.innerHTML='<div class="section-head"><h3>Richieste e movimenti · '+pending+' in attesa</h3><button type="button" class="secondary-btn" id="yeQueueReload">Aggiorna</button></div><p class="small">Depositi verificati, conversioni e trasferimenti interni sono contabilizzati atomicamente all’approvazione. I prelievi approvati riservano fondi: l’addebito avviene solo dopo la registrazione manuale dell’esito esterno. Il sito non invia pagamenti. Le conversioni richiedono una quotazione accettata dal cliente. Le richieste legacy non supportate restano consultabili ma senza azioni.</p>'+errorNotice+limitNotice+adminTable(rows,columns);
  host.querySelector('#yeQueueReload').onclick=()=>yeRefreshQueue();
  const loadComplete=errors.length===0;
  host.querySelectorAll('[data-ye-action]').forEach(b=>b.onclick=async()=>{
   const action=b.dataset.yeAction,id=b.dataset.yeId;
   const r=rows.find(x=>['ye_client_requests','ye_admin_entries'].includes(x.source)&&x.sourceId===id);if(!r)return;
   const isClientDeposit=r.kind==='deposit';
   const isEntryDeposit=r.source==='ye_admin_entries'&&r.kind==='deposit_request';
   const isDeposit=isClientDeposit||isEntryDeposit;
   let externalReference='',depositVerified=false;
   if(action==='approved'&&isDeposit){
    if(!confirm('Confermi di aver verificato l’effettivo accredito esterno? Il sistema registrerà un credito interno, ma non verifica il movimento bancario.'))return;
    externalReference=prompt('Riferimento verificabile della transazione esterna (obbligatorio):')||'';
    if(!externalReference.trim())return;
    depositVerified=true;
   }else if(action==='confirmed'||action==='failed'){
    const message=action==='confirmed'
      ?'Usa questa azione solo dopo aver verificato il pagamento bancario/crypto esterno già eseguito. Il sistema registrerà l’addebito interno.'
      :'Confermi che il pagamento esterno non è stato eseguito? La riserva verrà liberata senza addebito.';
    if(!confirm(message))return;
    externalReference=prompt(action==='confirmed'?'Riferimento del pagamento esterno:':'Riferimento o motivazione dell’esito negativo (obbligatorio):')||'';
    if(!externalReference.trim())return;
   }else if(!confirm((action==='approved'?'Approvare':'Rifiutare')+' la richiesta '+r.kind+' di '+r.amount+' '+r.currency+'?'))return;
   b.disabled=true;
   try{
    let successMessage='';
    if(action==='confirmed'||action==='failed'){
     const payload=window.YEOperationRequests.createWithdrawalSettlementPayload({requestId:id,result:action,externalReference});
     const {data,error}=await sb.rpc('ye_admin_finalize_client_withdrawal',payload);if(error)throw error;
     if(String(data).toLowerCase()!==id.toLowerCase())throw new Error('Il backend non ha confermato il riferimento della richiesta.');
     successMessage=action==='confirmed'?'Pagamento esterno confermato e addebito interno registrato.':'Pagamento esterno non confermato: riserva liberata senza addebito.';
    }else{
     const payload=window.YEOperationRequests.createReviewPayload({requestId:id,decision:action,kind:isEntryDeposit?'deposit':r.kind,depositVerified,externalReference});
     const {data,error}=await sb.rpc(
      isEntryDeposit?'ye_admin_review_deposit_entry_atomic':'ye_admin_review_client_request_atomic',
      payload
     );if(error)throw error;
     if(String(data).toLowerCase()!==id.toLowerCase())throw new Error('Il backend non ha confermato il riferimento della richiesta.');
     successMessage=action==='approved'
      ?r.kind==='withdraw'?'Prelievo approvato — fondi riservati. Nessun pagamento esterno è stato eseguito.':isDeposit?'Deposito verificato e contabilizzato internamente.':['swap','buy','sell'].includes(r.kind)?'Conversione interna approvata e contabilizzata.':'Trasferimento interno approvato e contabilizzato.'
      :'Richiesta rifiutata; nessun addebito effettuato.';
    }
    const refreshed=await yeRefreshQueue();
    toast(refreshed?successMessage:'Operazione confermata dal backend. Aggiornamento della coda non riuscito: ricarica la sezione per verificare lo stato.');
   }catch(e){toast('Operazione amministrativa non riuscita: '+e.message);await yeRefreshQueue()}finally{b.disabled=false}
  });
  return loadComplete;
 }catch(e){
  if(host.isConnected&&$('yeClientQueue')===host&&generation===yeQueueRefreshGeneration)host.innerHTML='<p class="small" role="alert">Coda richieste non disponibile: '+esc(e.message)+'</p><button type="button" class="secondary-btn" id="yeQueueReload">Riprova</button>';
  host.querySelector('#yeQueueReload')?.addEventListener('click',()=>yeRefreshQueue());
  return false;
 }
}
async function yeAttachQueue(section){
 if(!['deposits','withdrawals','crypto','transactions'].includes(section))return;
 const w=$('adminWorkspace');if(!w||activeAdminSection!==section)return;
 const box=document.createElement('section');box.className='card mt';box.id='yeClientQueue';box.innerHTML='<h3>Caricamento richieste clienti…</h3>';w.append(box);
 await yeRefreshQueue();
}
setInterval(()=>{if(isAdmin&&session&&$('yeClientQueue')?.isConnected)yeRefreshQueue()},15000);
let yePrivateRefreshBusy=false,yePrivateRefreshErrorAt=0;
setInterval(async()=>{
 if(!session||isAdmin||!sb||yePrivateRefreshBusy)return;
 yePrivateRefreshBusy=true;
 try{
  const {data,error}=await sb.from('wallets').select('id,currency,balance,locked_balance').eq('user_id',session.user.id);
  if(error)throw error;
  wallets=data||[];
  const page=location.hash.slice(1).split('?')[0];
  if(page==='wallet'||page==='activity')route();
  else if(page==='dashboard'){
   document.querySelectorAll('[data-ye-total]').forEach(node=>node.textContent=eur(total()));
   const kpis=document.querySelectorAll('.pl-kpi-value');
   if(kpis[0])kpis[0].textContent=eur(total());
   if(kpis[1])kpis[1].textContent=eur(balance('EUR'));
   document.querySelectorAll('.pl-wallet-list strong').forEach((node,index)=>{
    const currency=['EUR','USDT','BTC','ETH'][index];
    if(currency)node.textContent=currency==='EUR'?eur(balance(currency)):fmt(balance(currency),currency==='BTC'||currency==='ETH'?6:2)+' '+currency;
   });
  }
 }catch(error){
  if(Date.now()-yePrivateRefreshErrorAt>60000){toast('Aggiornamento automatico di saldi e storico non riuscito: '+error.message);yePrivateRefreshErrorAt=Date.now()}
 }finally{yePrivateRefreshBusy=false}
},15000);
async function adminSelectSection(section){
 const workspace=$('adminWorkspace');if(!workspace){globalThis.YEXAdminNavigationDiagnostic?.('panel-not-found',section);return}if(!isAdmin||!adminSections.includes(section))return;
 activeAdminSection=section;document.querySelectorAll('[data-admin-section]').forEach(b=>b.classList.toggle('active',b.dataset.adminSection===section));workspace.innerHTML='<section class="card"><h3>Caricamento '+esc(section)+'…</h3></section>';
 const view=(title,body)=>{if(activeAdminSection===section&&workspace.isConnected){workspace.innerHTML='<section class="card"><h3>'+esc(title)+'</h3>'+body+'</section>';globalThis.YEXAdminNavigationDiagnostic?.('panel-displayed',title)}};
 try{
 if(section==='users'){
  const users=await adminRpc('ye_admin_customer_accounts');
  view('Utenti e conti',`<div class="mt"><h3>Crea account cliente</h3><p class="small">Predisponi il conto prima del primo accesso. La verifica email e telefono è distinta dalla creazione: nessun recapito viene considerato verificato senza conferma. La creazione del conto non invia automaticamente email né OTP. L’attivazione dell’accesso e la verifica dei recapiti saranno gestite separatamente.</p><form id="adminInviteForm"><label>Nome</label><input name="first_name" maxlength="80" required><label>Cognome</label><input name="last_name" maxlength="80" required><label>Email</label><input name="email" type="email" required><label>Telefono (facoltativo, formato +39...)</label><input name="phone" type="tel" placeholder="+393..."><button class="primary" type="submit">Crea account non verificato</button></form></div><div class="divider"></div>`+'<p class="small">Utenti registrati: '+users.length+'</p>'+adminTools(users,'utenti')+'<div data-admin-results="utenti">'+adminTable(users,[['Email',u=>adminCell(u.email)],['Nome',u=>adminCell(u.display_name)],['Stato conto',u=>adminCell(u.email_confirmed_at?'Email confermata':'In attesa di verifica')],['Stato email',u=>adminCell(u.email_confirmed_at?'Verificata':'In attesa')],['Wallet',u=>adminCell(u.wallet_count)],['Registrazione',u=>adminCell(adminDate(u.created_at))]])+'</div><label for="adminUser">Visualizza portafogli e operazioni utente</label><select id="adminUser"><option value="">— Seleziona un utente —</option>'+users.map(u=>'<option value="'+esc(u.user_id)+'" '+(u.user_id===adminSelectedUser?'selected':'')+'>'+esc(u.email||u.display_name||u.user_id)+'</option>').join('')+'</select><div id="adminUserDetail" class="mt"></div>');
  adminBindTools(workspace,users,'utenti',[['Email',u=>adminCell(u.email)],['Nome',u=>adminCell(u.display_name)],['Stato conto',u=>adminCell(u.email_confirmed_at?'Email confermata':'In attesa di verifica')],['Stato email',u=>adminCell(u.email_confirmed_at?'Verificata':'In attesa')],['Wallet',u=>adminCell(u.wallet_count)],['Registrazione',u=>adminCell(adminDate(u.created_at))]]);const inviteForm=workspace.querySelector('#adminInviteForm');if(inviteForm)inviteForm.onsubmit=adminInviteUser;
  workspace.innerHTML+='<section class="mt" id="adminVerificationPanel"><h3>Verifica amministrativa del conto</h3><p class="small">Separata dalla conferma email: non modifica Auth, MFA, wallet, saldi o ledger. Richiede una motivazione e resta soggetta alle policy amministrative.</p><label for="adminVerificationUser">Account</label><select id="adminVerificationUser"><option value="">— Seleziona un account —</option>'+users.map(u=>'<option value="'+esc(u.user_id)+'">'+esc(u.email||u.display_name||u.user_id)+'</option>').join('')+'</select><label for="adminVerificationReason">Motivazione</label><textarea id="adminVerificationReason" minlength="8" maxlength="500" required></textarea><div class="button-row"><button type="button" class="primary" data-admin-verification="verified">Verifica conto</button><button type="button" class="danger" data-admin-verification="revoked">Revoca verifica</button></div><div id="adminVerificationResult" class="small mt"></div></section>';const verificationPanel=workspace.querySelector('#adminVerificationPanel');
  if(verificationPanel?.querySelectorAll)verificationPanel.querySelectorAll('[data-admin-verification]').forEach(button=>button.onclick=async()=>{const userId=verificationPanel.querySelector('#adminVerificationUser').value;const reason=verificationPanel.querySelector('#adminVerificationReason').value.trim();const result=verificationPanel.querySelector('#adminVerificationResult');if(!userId||reason.length<8){result.textContent='Seleziona un account e inserisci una motivazione di almeno 8 caratteri.';return}result.textContent='Salvataggio in corso...';try{await adminRpc('ye_admin_set_account_verification',{p_user_id:userId,p_status:button.dataset.adminVerification,p_reason:reason});result.textContent='Decisione registrata nell’audit log.';await adminSelectSection('users')}catch(error){result.textContent='Verifica non disponibile: '+(error.message||'funzione amministrativa non installata')}});const sel=workspace.querySelector('#adminUser');if(sel){sel.onchange=e=>{adminSelectedUser=e.target.value||null;loadAdminUser()};if(adminSelectedUser)loadAdminUser()}
  return;
 }
  if(section==='informative-records'){
   const [users,records]=await Promise.all([adminRpc('ye_admin_customer_accounts'),adminRpc('ye_admin_informative_records')]);
   const userName=new Map(users.map(u=>[u.user_id,u.email||u.display_name||u.user_id]));
   const form='<form id="informativeRecordForm" class="mt"><h3>Nuova registrazione informativa</h3><p class="small"><strong>Informativa — non eseguita.</strong> Non modifica wallet, saldi, ledger o disponibilità.</p><label>Cliente<select name="customer_id" required><option value="">— Seleziona —</option>'+users.map(u=>'<option value="'+esc(u.user_id)+'">'+esc(u.email||u.display_name||u.user_id)+'</option>').join('')+'</select></label><div class="grid cols-2"><label>Tipologia<input name="record_type" maxlength="80" required></label><label>Valuta<select name="currency"><option>EUR</option><option>BTC</option><option>ETH</option><option>USDT</option></select></label><label>Importo dichiarato<input name="declared_amount" inputmode="decimal" min="0" step="any" required></label><label>Data<input name="reported_at" type="datetime-local" required></label></div><label>Descrizione<textarea name="description" maxlength="1000" required></textarea></label><label>Riferimento<input name="reference" maxlength="200"></label><label>Motivazione<input name="reason" minlength="8" maxlength="500" required></label><button class="primary" type="submit">Registra informazione</button><p id="informativeRecordStatus" class="small" role="status"></p></form>';
   const rows=records.map(r=>'<tr><td>'+adminCell(userName.get(r.customer_id)||r.customer_id)+'</td><td>'+adminCell(r.record_type)+'</td><td>'+adminCell(r.declared_amount+' '+r.currency)+'</td><td>'+adminCell(r.description)+'</td><td>'+adminCell(r.status==='cancelled'?'Annullata':'Informativa — non eseguita')+'</td><td>'+adminCell(adminDate(r.reported_at))+'</td><td>'+(r.status==='active'?'<button type="button" class="secondary-btn" data-info-edit="'+esc(r.id)+'">Modifica</button> <button type="button" class="secondary-btn" data-info-cancel="'+esc(r.id)+'">Annulla</button>':'—')+'</td></tr>').join('');
   view('Registrazioni informative','<p class="small">Accesso esclusivo agli amministratori autorizzati da Supabase Auth e dalla lista database. I clienti vedono soltanto i record associati al proprio account tramite la RPC dedicata. Ogni record è <strong>Informativa — non eseguita</strong>.</p>'+form+'<h3 class="mt">Storico completo</h3><div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Tipologia</th><th>Importo dichiarato</th><th>Descrizione</th><th>Stato</th><th>Data</th><th>Azioni</th></tr></thead><tbody>'+rows+'</tbody></table></div>');
   const recordForm=workspace.querySelector('#informativeRecordForm');if(recordForm)recordForm.onsubmit=async event=>{event.preventDefault();const f=event.currentTarget,status=f.querySelector('#informativeRecordStatus');const args={p_customer_id:f.elements.customer_id.value,p_record_type:f.elements.record_type.value.trim(),p_declared_amount:Number(f.elements.declared_amount.value),p_currency:f.elements.currency.value,p_description:f.elements.description.value.trim(),p_reference:f.elements.reference.value.trim(),p_reported_at:new Date(f.elements.reported_at.value).toISOString(),p_reason:f.elements.reason.value.trim()};if(!args.p_customer_id||!Number.isFinite(args.p_declared_amount)||args.p_declared_amount<0||args.p_reason.length<8){status.textContent='Compila i dati validi e una motivazione di almeno 8 caratteri.';return}try{await adminRpc('ye_admin_create_informative_record',args);status.textContent='Registrazione informativa salvata.';await adminSelectSection(section)}catch(error){status.textContent='Salvataggio non riuscito: '+(error.message||String(error))}};
   workspace.querySelectorAll('[data-info-cancel]').forEach(button=>button.onclick=async()=>{const reason=prompt('Motivazione obbligatoria per l’annullamento:')||'';if(reason.trim().length<8)return;try{await adminRpc('ye_admin_cancel_informative_record',{p_record_id:button.dataset.infoCancel,p_reason:reason.trim()});await adminSelectSection(section)}catch(error){toast('Annullamento non riuscito: '+(error.message||String(error)))}});
   const recordById=new Map(records.map(record=>[record.id,record]));workspace.querySelectorAll('[data-info-edit]').forEach(button=>button.onclick=async()=>{const r=recordById.get(button.dataset.infoEdit);if(!r)return;const reason=prompt('Motivazione obbligatoria per la modifica:')||'';if(reason.trim().length<8)return;const recordType=prompt('Tipologia:',r.record_type);const amount=prompt('Importo dichiarato:',r.declared_amount);const currency=prompt('Valuta (EUR, BTC, ETH o USDT):',r.currency);const description=prompt('Descrizione informativa:',r.description);const reference=prompt('Riferimento:',r.reference||'');const reportedAt=prompt('Data ISO:',r.reported_at);const declaredAmount=Number(amount);if([recordType,currency,description,reportedAt].some(value=>value===null)||!recordType.trim()||!description.trim()||!Number.isFinite(declaredAmount)||declaredAmount<0)return;try{await adminRpc('ye_admin_update_informative_record',{p_record_id:r.id,p_record_type:recordType.trim(),p_declared_amount:declaredAmount,p_currency:currency.trim().toUpperCase(),p_description:description.trim(),p_reference:(reference||'').trim(),p_reported_at:new Date(reportedAt).toISOString(),p_reason:reason.trim()});await adminSelectSection(section)}catch(error){toast('Modifica non riuscita: '+(error.message||String(error)))}});
   return;
  }
 if(section==='deposits'){
  view('Depositi','<p class="small">La coda unificata include depositi, prelievi, conversioni e trasferimenti.</p>');
  yeAttachQueue(section);return;
 }
 if(section==='balances'){
  view('Saldi','<p class="small">Vista in sola lettura. Le funzioni di accredito, addebito e rettifica diretta sono disabilitate nel pacchetto pubblico.</p>');return;
 }
 if(section==='settings'){
  view('Impostazioni sito','<p class="small">Configurazione operativa in sola lettura. Le chiavi e le credenziali non devono essere esposte nel browser.</p><p>Dominio: '+esc(location.hostname)+'</p><p>Autenticazione: Supabase Auth</p><p>Invio email: verificare Resend nelle impostazioni SMTP di Supabase.</p><p>Le modifiche sensibili devono essere eseguite dal pannello del servizio, non dal codice pubblico.</p>');return;
 }
 if(section==='crypto'){
  const rows=assets.map(a=>({name:a.name,symbol:a.symbol,price:q(a)?.current_price,change:q(a)?.price_change_percentage_24h}));
  const configs=await adminRpc('ye_admin_quote_configs');
  view('Crypto e cambi','<p class="small">Le quotazioni di mercato sono solo informative. I parametri contabili degli swap sono configurabili esclusivamente qui e non vengono derivati dal browser.</p><form id="yeQuoteConfigForm" class="mt"><h3>Configura coppia interna</h3><div class="grid cols-2"><label>Valuta origine<select name="source"><option>EUR</option><option>BTC</option><option>ETH</option><option>USDT</option></select></label><label>Valuta destinazione<select name="target"><option>EUR</option><option>BTC</option><option>ETH</option><option>USDT</option></select></label><label>Tasso interno<input name="rate" inputmode="decimal" required placeholder="es. 0.00002"></label><label>Commissione proporzionale<input name="fee_rate" inputmode="decimal" required placeholder="es. 0.001"></label></div><label><input name="active" type="checkbox" checked> Coppia attiva</label><button class="primary" type="submit">Salva configurazione</button><p id="yeQuoteConfigStatus" class="small" role="status"></p></form><h3 class="mt">Configurazioni attive</h3>'+adminTable(configs,[['Origine',c=>adminCell(c.source_currency)],['Destinazione',c=>adminCell(c.target_currency)],['Tasso',c=>adminCell(c.rate)],['Commissione',c=>adminCell(c.fee_rate)],['Stato',c=>adminCell(c.active?'Attiva':'Disattiva')]])+'<h3 class="mt">Mercati informativi</h3>'+adminTable(rows,[['Asset',a=>adminCell(a.name)+' ('+adminCell(a.symbol)+')'],['Prezzo EUR',a=>a.price==null?'—':eur(a.price)],['Variazione 24h',a=>a.change==null?'—':fmt(a.change)+'%']]));const quoteForm=workspace.querySelector('#yeQuoteConfigForm');if(quoteForm)quoteForm.onsubmit=saveQuoteConfig;yeAttachQueue(section);return;
 }
 if(section==='transactions'){
  view('Richieste e movimenti','<p class="small">La coda unificata mostra le richieste dei clienti e i trasferimenti interni registrati.</p>');
  yeAttachQueue(section);return;
 }
 const [users,operations]=await Promise.all([adminRpc('admin_list_users'),adminRpc('admin_list_all_operations',{p_status:null})]);
 const names=new Map(users.map(u=>[u.user_id,u.email||u.display_name||u.user_id]));
 const enriched=operations.map(r=>({...r,email:names.get(r.user_id)||r.user_id}));
 if(section==='deposits'){
  const rows=enriched.filter(r=>r.operation_type==='deposit');view('Depositi','<p class="small">Richieste di deposito registrate. Nessun accredito è confermato senza riconciliazione effettiva.</p>'+adminTools(rows,'depositi')+'<div data-admin-results="depositi">'+adminTable(rows,adminOperationColumns)+'</div>');adminBindTools(workspace,rows,'depositi',adminOperationColumns);return;
 }
 if(section==='withdrawals'){
  view('Prelievi','<p class="small">La coda unificata include tutti i tipi di richiesta e i relativi stati.</p>');
  yeAttachQueue(section);return;
 }
 if(section==='history'){
  view('Storico e controlli','<p class="small">Cronologia delle richieste. Non sostituisce un registro di audit immutabile o le prove di pagamento.</p>'+adminTools(enriched,'storico')+'<div data-admin-results="storico">'+adminTable(enriched,adminOperationColumns)+'</div>');adminBindTools(workspace,enriched,'storico',adminOperationColumns);return;
 }
 }catch(e){adminErr(e);view('Errore caricamento','<p class="small">'+esc(e.message||String(e))+'</p><button type="button" class="secondary-btn" data-admin-retry="'+esc(section)+'">Riprova</button>')}
}
const adminNavRoot=$('pageContent');
adminNavRoot.addEventListener('click',event=>{const target=event.target;if(!(target instanceof Element))return;const button=target.closest('button[data-admin-section]');if(button&&adminNavRoot.contains(button)){requestAdminSection(button.dataset.adminSection);return}const retry=target.closest('button[data-admin-retry]');if(retry&&adminNavRoot.contains(retry))requestAdminSection(retry.dataset.adminRetry)});
function requestAdminSection(section){
 globalThis.YEXAdminNavigationDiagnostic?.('click-received',section);
 if(!session){globalThis.YEXAdminNavigationDiagnostic?.('access-denied','sessione assente');return false}
 if(!isAdmin){globalThis.YEXAdminNavigationDiagnostic?.('access-denied','is_youngexchange_admin() non autorizzato');const deniedHash='#admin?section='+encodeURIComponent(section);if(location.hash!==deniedHash){const url=new URL(location.href);url.hash=deniedHash;history.pushState(null,'',url)}route();return true}
 if(!adminSections.includes(section)){globalThis.YEXAdminNavigationDiagnostic?.('panel-not-found',section);return false}
 const hash='#admin?section='+encodeURIComponent(section);
 if(location.hash!==hash){const url=new URL(location.href);url.hash=hash;history.pushState(null,'',url)}
 route();
 return true;
}
window.YEAdminNavigation=Object.freeze({select:requestAdminSection});
async function loadAdmin(){if(!session||!isAdmin||location.hash.slice(1).split('?')[0]!=='admin')return;const workspace=$('adminWorkspace');if(workspace)await adminSelectSection(activeAdminSection)}
async function loadAdminUser(){const target=$('adminUserDetail');if(!target)return;const id=adminSelectedUser;if(!id){target.textContent='Seleziona un utente per visualizzare i suoi wallet e le sue operazioni.';return}target.textContent='Caricamento…';try{const [walletList,ops]=await Promise.all([adminRpc('admin_list_wallets',{p_user_id:id}),adminRpc('admin_list_operations',{p_user_id:id})]);if(adminSelectedUser!==id||!target.isConnected)return;target.innerHTML=`<h3>Wallet</h3><div class="table-wrap"><table><thead><tr><th>Valuta</th><th>Saldo</th><th>Impegnato</th><th>Disponibile</th></tr></thead><tbody>${walletList.map(w=>`<tr><td>${esc(w.currency)}</td><td>${fmt(w.total_balance,w.currency==='EUR'?2:8)}</td><td>${fmt(w.reserved_balance,w.currency==='EUR'?2:8)}</td><td>${fmt(w.available_balance,w.currency==='EUR'?2:8)}</td></tr>`).join('')||'<tr><td colspan="4">Nessun wallet.</td></tr>'}</tbody></table></div><form id="adminBalanceForm" class="mt"><h3>Movimento contabile interno</h3><p class="small">Solo rettifica interna autorizzata; non rappresenta un pagamento esterno.</p><label>Valuta<select name="currency"><option>EUR</option><option>BTC</option><option>ETH</option><option>USDT</option></select></label><label>Operazione<select name="kind"><option value="credit">Accredito interno</option><option value="debit">Addebito interno</option></select></label><label>Importo<input name="amount" inputmode="decimal" required></label><label>Motivo<input name="reason" maxlength="500" required></label><button class="primary" type="submit">Registra movimento</button><p id="adminBalanceStatus" class="small" role="status"></p></form><h3 class="mt">Ultime operazioni (${ops.length})</h3><div class="table-wrap"><table><thead><tr><th>Data</th><th>Tipo</th><th>Importo</th><th>Stato</th><th>Destinazione</th></tr></thead><tbody>${ops.slice(0,30).map(r=>`<tr><td>${esc(adminDate(r.operation_date||r.created_at))}</td><td>${esc(adminOperationLabels[r.operation_type]||r.operation_type)}</td><td>${fmt(r.amount,r.currency==='EUR'?2:8)} ${esc(r.currency)}</td><td>${esc(adminStatusLabels[r.status]||r.status)}</td><td>${esc(r.destination_address||r.destination_iban||'—')}</td></tr>`).join('')||'<tr><td colspan="5">Nessuna operazione.</td></tr>'}</tbody></table></div>`;target.querySelector('#adminBalanceForm').onsubmit=event=>recordAdminBalance(event,id)}catch(e){adminErr(e);target.textContent='Errore nel caricamento dei dettagli.'}}
async function recordAdminBalance(event,userId){event.preventDefault();const form=event.currentTarget,button=form.querySelector('button[type="submit"]'),status=form.querySelector('#adminBalanceStatus');const amount=form.elements.amount.value.trim(),reason=form.elements.reason.value.trim(),currency=form.elements.currency.value,kind=form.elements.kind.value;if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(amount)||Number(amount)<=0||!reason){status.textContent='Inserisci importo e motivo validi.';return}button.disabled=true;status.textContent='Registrazione contabile atomica…';try{const idempotencyKey=crypto.randomUUID();const {data,error}=await sb.rpc('ye_admin_record_internal_entry',{p_user_id:userId,p_currency:currency,p_amount:amount,p_kind:kind,p_reason:reason,p_idempotency_key:idempotencyKey});if(error)throw error;if(!data)throw new Error('Il backend non ha confermato il movimento.');status.textContent='Movimento contabile bilanciato registrato.';await loadAdminUser();await loadPrivate()}catch(error){status.textContent='Movimento non registrato: '+error.message}finally{button.disabled=false}}
async function saveQuoteConfig(event){event.preventDefault();const form=event.currentTarget,button=form.querySelector('button[type="submit"]'),status=form.querySelector('#yeQuoteConfigStatus');const source=form.elements.source.value,target=form.elements.target.value,rate=form.elements.rate.value.trim(),feeRate=form.elements.fee_rate.value.trim();if(source===target||!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(rate)||Number(rate)<=0||!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(feeRate)||Number(feeRate)<0||Number(feeRate)>=1){status.textContent='Inserisci una coppia distinta, un tasso positivo e una commissione tra 0 e 1.';return}button.disabled=true;status.textContent='Salvataggio…';try{const {error}=await sb.rpc('ye_admin_set_quote_config',{p_source_currency:source,p_target_currency:target,p_rate:rate,p_fee_rate:feeRate,p_active:form.elements.active.checked});if(error)throw error;status.textContent='Configurazione salvata.';await adminSelectSection('crypto')}catch(error){status.textContent='Configurazione non salvata: '+error.message}finally{button.disabled=false}}
async function adminInviteUser(event){
 event.preventDefault();if(!isAdmin||!sb)return;
 const form=event.currentTarget,button=form.querySelector('button[type="submit"]');
 const email=form.elements.email.value.trim().toLowerCase(),firstName=form.elements.first_name.value.trim(),lastName=form.elements.last_name.value.trim(),phone=form.elements.phone.value.trim();
 if(!email||!firstName||!lastName||phone&&!/^\+[1-9]\d{7,14}$/.test(phone)){toast('Controlla nome, cognome, email e telefono internazionale.');return}
 button.disabled=true;
 try{
  const {data:auth,error:sessionError}=await sb.auth.getSession();if(sessionError||!auth?.session?.access_token)throw new Error('Sessione scaduta: accedi di nuovo.');
  const {data,error}=await sb.functions.invoke('admin-invite-user',{body:{email,first_name:firstName,last_name:lastName,phone:phone||null},headers:{Authorization:'Bearer '+auth.session.access_token}});
  if(data?.partial&&data?.identity_created){toast('Conto creato parzialmente: NON ripetere la creazione. Contatta il supporto tecnico per completare profilo o portafogli.');return}
  if(error)throw error;if(!data?.ok)throw new Error(data?.error||'Creazione non confermata');
  toast('Conto creato con profilo e wallet iniziali a zero. Email e telefono non verificati; OTP non ancora attivo.');await adminSelectSection('users');
 }catch(err){adminErr(err)}finally{button.disabled=false}
}
const pages={dashboard:['Panoramica',dashboard],markets:['Mercati',markets],wallet:['Portafoglio',walletPage],activity:['Attività',()=>heading('Attività','Caricamento delle operazioni…')],security:['Sicurezza',security],'profile-settings':['Impostazioni personali',personalSettings],support:['Assistenza',support],admin:['Amministrazione',adminPage]};
function route(){if(!session)return;const renderGeneration=++routeGeneration;const [page,fragmentQuery='']=location.hash.slice(1).split('?');if(page==='admin'){const section=new URLSearchParams(fragmentQuery).get('section');if(section&&adminSections.includes(section))activeAdminSection=section}const key=pages[page]?page:'dashboard';if(page==='admin'&&!isAdmin)globalThis.YEXAdminNavigationDiagnostic?.('access-denied','pannello amministrativo visualizzato in modalità bloccata');$('pageTitle').textContent=pages[key][0];$('breadcrumb').textContent=pages[key][0].toUpperCase();document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('active',a.dataset.page===key));$('pageContent').innerHTML=pages[key][1]();bindPage();if(key==='activity')activity(renderGeneration);if(key==='admin')loadAdmin();if(key==='dashboard')draw('mainChart','bitcoin');if(key==='markets'){draw('marketChart',selected);yeMarketTitle();}}window.addEventListener('hashchange',route);window.addEventListener('popstate',route);
function bindPage(){document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>action(b.dataset.action)));document.querySelectorAll('[data-trade]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.trade;if(location.hash!=='#markets')location.hash='markets';else route()}));$('personalProfileForm')?.addEventListener('submit',savePersonalProfile);$('personalEmailForm')?.addEventListener('submit',requestPersonalEmailChange);$('refreshMarkets')?.addEventListener('click',()=>fetchQuotes(true));$('yeOpenSupport')?.addEventListener('click',()=>yeOpenSupport());$('yeOpenSupportSecondary')?.addEventListener('click',()=>yeOpenSupport());document.querySelectorAll('[data-support-topic]').forEach(b=>b.addEventListener('click',()=>yeOpenSupport(b.dataset.supportTopic)));$('tradeAsset')?.addEventListener('change',e=>{selected=e.target.value;route()})}
async function savePersonalProfile(event){event.preventDefault();if(!sb||!session){toast('Accedi al conto per modificare il profilo.');return}const form=event.currentTarget,button=form.querySelector('button[type="submit"]'),status=$('personalProfileStatus');let payload;try{payload=personalProfilePayload(form.elements.first_name.value,form.elements.last_name.value)}catch(error){if(status)status.textContent=error.message;return}if(button)button.disabled=true;if(status)status.textContent='Salvataggio…';try{const {error}=await sb.from('profiles').upsert({id:session.user.id,...payload},{onConflict:'id'});if(error)throw error;profile={...(profile||{}),id:session.user.id,...payload};updateHeaderIdentity();if(status)status.textContent='Nome e cognome aggiornati.';toast('Profilo aggiornato.')}catch(error){if(status)status.textContent='Salvataggio non riuscito: '+error.message}finally{if(button)button.disabled=false}}
async function requestPersonalEmailChange(event){event.preventDefault();if(!sb||!session){toast('Accedi al conto per modificare l’email.');return}const form=event.currentTarget,button=form.querySelector('button[type="submit"]'),status=$('personalEmailStatus'),email=form.elements.email.value.trim().toLowerCase();if(!email||email===String(session.user.email||'').toLowerCase()){if(status)status.textContent='Inserisci un indirizzo email diverso da quello attuale.';return}if(button)button.disabled=true;if(status)status.textContent='Invio della richiesta di conferma…';try{const {error}=await sb.auth.updateUser({email},{emailRedirectTo:authRedirectUrl()});if(error)throw error;if(status)status.textContent='Richiesta inviata. Segui il link di conferma inviato da Supabase Auth; l’indirizzo attuale resta valido fino al completamento della verifica.';toast('Richiesta di cambio email inviata: controlla la posta.')}catch(error){if(status)status.textContent='Richiesta non riuscita: '+error.message}finally{if(button)button.disabled=false}}
function action(type){
 if(['deposit','withdraw','transfer','swap','buy','sell'].includes(type)&&cfg.financialOperationsEnabled!==true){toast('Operazioni finanziarie disabilitate finché il backend contabile non è verificato.');return}
 if(type==='password'){passwordReset();return}
 if(type==='phone'){phoneVerification();return}
 if(['deposit','withdraw','transfer','swap','buy','sell'].includes(type)){openOperation(type);return}
}
function openOperation(type){
 const title={deposit:'Deposito EUR',withdraw:'Prelievo',transfer:'Trasferimento interno',swap:'Conversione',buy:'Acquisto asset',sell:'Vendita asset'}[type];
 const overlay=document.createElement('div');overlay.className='modal-overlay';
 const currencies='<option>EUR</option><option>BTC</option><option>ETH</option><option>USDT</option>';
 const field=(label,html)=>'<label>'+label+html+'</label>';
 const currency=field('Valuta','<select name="currency">'+currencies+'</select>');
 const amount=field('Importo','<input name="amount" type="number" min="0" step="any" required placeholder="0,00">');
 const common=field('Riferimento / causale','<input name="reference" maxlength="150" placeholder="Riferimento operazione">');
 const destination=type==='transfer'?field('ID destinatario YoungExchange','<input name="recipient" required placeholder="UUID del conto destinatario">'):type==='withdraw'?field('IBAN o destinazione','<input name="destination" required maxlength="255" placeholder="IT…">'):'';
 const swap=type==='swap'||type==='buy'||type==='sell'?field('Asset desiderato','<select name="target">'+currencies+'</select>'):'';
 const isTrade=['swap','buy','sell'].includes(type);
 const disclaimer=type==='deposit'?'La richiesta resta in attesa. Un amministratore accredita il saldo solo dopo la verifica manuale del pagamento esterno e la registrazione del relativo riferimento.':type==='transfer'?'Il trasferimento interno resta in attesa di approvazione amministrativa; l’addebito e l’accredito avvengono insieme.':type==='withdraw'?'L’approvazione riserva i fondi. Il sito non esegue pagamenti esterni: dopo un pagamento reale l’amministratore registrerà separatamente la conferma.':isTrade?'La quotazione viene calcolata per il ledger interno, mostrata con commissione e richiede la tua conferma prima dell’invio.':'La richiesta resta in attesa di approvazione amministrativa.';
 const quoteFields=isTrade?'<div class="notice" id="yeQuotePreview" role="status">Inserisci importo e valuta per visualizzare la quotazione interna.</div><label><input name="acceptQuote" type="checkbox" required> Accetto tasso, commissione e importo finale</label>':'';
 overlay.innerHTML='<div class="modal ye-operation" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><button class="modal-close" aria-label="Chiudi">×</button><div class="eyebrow">YOUNGEXCHANGE / OPERAZIONI</div><h3>'+esc(title)+'</h3><p>'+esc(disclaimer)+'</p><form id="yeOperationForm">'+currency+amount+destination+swap+quoteFields+common+'<div class="notice" id="yeOperationStatus" role="status">I dati saranno verificati prima della registrazione.</div><button class="primary full mt" type="submit">'+(type==='transfer'?'Invia richiesta di trasferimento':isTrade?'Conferma quotazione e invia':'Invia richiesta')+'</button></form></div>';
 document.body.append(overlay);overlay.querySelector('.modal-close').onclick=()=>overlay.remove();overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
 const form=overlay.querySelector('form');let requestIdempotencyKey=crypto.randomUUID();
 const quotePreview=overlay.querySelector('#yeQuotePreview');
 let configuredQuote=null;
 const getQuote=()=>{
 if(!isTrade)return null;
 const source=String(form.elements.currency.value),target=String(form.elements.target.value),sourceAmount=Number(form.elements.amount.value);
 if(!Number.isFinite(sourceAmount)||sourceAmount<=0||!configuredQuote)return null;
 const rate=Number(configuredQuote.rate),fee=sourceAmount*Number(configuredQuote.fee_rate);
 const targetScale=target==='EUR'?2:target==='USDT'?6:8;
 const targetAmount=Number((sourceAmount-fee)*rate).toFixed(targetScale);
 return {source,target,sourceAmount,rate,fee,targetAmount};
 };
 const updateQuotePreview=()=>{
 if(!quotePreview)return;
 const quote=getQuote();
 quotePreview.textContent=quote
   ? 'Tasso '+fmt(quote.rate,8)+' · commissione '+fmt(quote.fee,8)+' '+quote.source+' · ricevi circa '+fmt(quote.targetAmount,quote.target==='EUR'?2:quote.target==='USDT'?6:8)+' '+quote.target
   : 'Quotazione interna non configurata o non disponibile per questa coppia.';
 };
 const loadQuoteConfig=async()=>{
  configuredQuote=null;
  if(!isTrade||!sb)return updateQuotePreview();
  const {data,error}=await sb.rpc('ye_client_quote_config',{
   p_source_currency:String(form.elements.currency.value),
   p_target_currency:String(form.elements.target.value)
  });
  if(!error)configuredQuote=Array.isArray(data)?data[0]||null:data||null;
  updateQuotePreview();
 };
 form.addEventListener('input',()=>{requestIdempotencyKey=crypto.randomUUID();updateQuotePreview()});
 form.addEventListener('change',()=>{requestIdempotencyKey=crypto.randomUUID();loadQuoteConfig()});loadQuoteConfig();
 form.onsubmit=async e=>{e.preventDefault();const submit=form.querySelector('[type=submit]');const status=overlay.querySelector('#yeOperationStatus');const data=new FormData(form);if(!sb||!session){status.textContent='Accedi al tuo conto per procedere.';return}
 submit.disabled=true;status.textContent='Invio della richiesta in corso…';try{
 if(!window.YEOperationRequests)throw new Error('Modulo richieste non disponibile. Ricarica la pagina.');
 let requestId;
 if(isTrade){
 const quote=getQuote();if(!quote)throw new Error('Quotazione interna non disponibile.');
 const quoteKey=crypto.randomUUID();
 const quotePayload=window.YEOperationRequests.createQuotePayload({sourceCurrency:quote.source,targetCurrency:quote.target,sourceAmount:data.get('amount'),idempotencyKey:quoteKey});
 const issued=await sb.rpc('ye_client_issue_quote',quotePayload);if(issued.error)throw issued.error;
 const quoteRow=Array.isArray(issued.data)?issued.data[0]:issued.data;if(!quoteRow?.id)throw new Error('Il backend non ha restituito una quotazione valida.');
 const accepted=await sb.rpc('ye_client_accept_quote',{p_quote_id:quoteRow.id});if(accepted.error)throw accepted.error;
 const requestPayload=window.YEOperationRequests.createQuotedRequestPayload({type,currency:data.get('currency'),amount:data.get('amount'),target:data.get('target'),reference:data.get('reference'),quoteId:quoteRow.id,requestId:requestIdempotencyKey,acceptQuote:data.get('acceptQuote')==='on'});
 const created=await sb.rpc('ye_client_create_quoted_request',requestPayload);if(created.error)throw created.error;requestId=created.data;
 }else{
 const payload=window.YEOperationRequests.createPayload({type,currency:data.get('currency'),amount:data.get('amount'),destination:type==='transfer'?data.get('recipient'):type==='withdraw'?data.get('destination'):'',target:data.get('target'),reference:data.get('reference'),idempotencyKey:requestIdempotencyKey});
 const created=await sb.rpc('ye_client_create_request',payload);if(created.error)throw created.error;requestId=created.data;
 }
 status.textContent='Richiesta inviata e in attesa di approvazione. Nessun saldo è stato modificato. Riferimento: '+String(requestId||'registrato');
 await loadPrivate();setTimeout(()=>{overlay.remove();route()},1800);
 }catch(err){status.textContent='Richiesta non registrata: '+(err.message||String(err));submit.disabled=false;}
 };
}
async function phoneVerification(){
  if(!sb||!session){toast('Accedi al conto per verificare il telefono.');return}
  if(typeof sb.auth.updateUser!=='function'||typeof sb.auth.verifyOtp!=='function'){toast('Verifica telefonica non disponibile: il client Auth non supporta l’invio o la verifica OTP.');return}
  const overlay=document.createElement('div');overlay.className='modal-overlay';
  overlay.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="phoneTitle"><button class="modal-close" type="button" aria-label="Chiudi">×</button><div class="eyebrow">SICUREZZA ACCOUNT</div><h3 id="phoneTitle">Verifica telefonica</h3><p id="phoneHelp">Inserisci il numero in formato internazionale, ad esempio +39 seguito dal tuo numero.</p><form id="phoneStartForm"><label for="phoneNumber">Numero di telefono</label><input id="phoneNumber" type="tel" inputmode="tel" autocomplete="tel" placeholder="+39…" required maxlength="20"><div class="mt"><button class="primary full" type="submit">Invia codice SMS</button></div></form><form id="phoneOtpForm" hidden><label for="phoneOtp">Codice ricevuto via SMS</label><input id="phoneOtp" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="6 cifre" required><div class="mt"><button class="primary full" type="submit">Conferma codice</button></div><button class="secondary-btn" id="phoneRestart" type="button">Cambia numero</button></form><p id="phoneError" role="alert" class="small" aria-live="polite"></p></div>`;
  document.body.append(overlay);
  const close=()=>overlay.remove();overlay.querySelector('.modal-close').onclick=close;overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
  const start=overlay.querySelector('#phoneStartForm'),otp=overlay.querySelector('#phoneOtpForm'),err=overlay.querySelector('#phoneError'),help=overlay.querySelector('#phoneHelp');
  const errorText=e=>{err.textContent=phoneVerificationUnavailable(e)?'Verifica telefonica non disponibile: il provider SMS Supabase non è attivo o configurato. Contatta l’assistenza.' :e?.message||'Operazione non riuscita. Riprova.'};
  overlay.querySelector('#phoneNumber').value=session.user.phone||'';
  start.addEventListener('submit',async e=>{e.preventDefault();err.textContent='';const phone=overlay.querySelector('#phoneNumber').value.replace(/[\s()-]/g,'');if(!/^\+[1-9]\d{7,14}$/.test(phone)){err.textContent='Usa il formato internazionale, ad esempio +39 seguito dal numero.';return}const btn=start.querySelector('button[type=submit]');btn.disabled=true;try{const {data:authData,error:sessionError}=await sb.auth.getSession();if(sessionError)throw sessionError;if(!authData?.session){throw new Error('Sessione Supabase scaduta o assente. Esci dal conto, accedi nuovamente e riprova.')}session=authData.session;const {error}=await sb.auth.updateUser({phone});if(error)throw error;start.hidden=true;otp.hidden=false;help.textContent='Inserisci il codice SMS ricevuto per confermare il numero '+phone.replace(/.(?=.{3})/g,'•')+'.';overlay.querySelector('#phoneOtp').focus()}catch(ex){errorText(ex)}finally{btn.disabled=false}});
  otp.addEventListener('submit',async e=>{e.preventDefault();err.textContent='';const token=overlay.querySelector('#phoneOtp').value.trim();if(!/^\d{6}$/.test(token)){err.textContent='Inserisci il codice di 6 cifre.';return}const btn=otp.querySelector('button[type=submit]');btn.disabled=true;try{const phone=overlay.querySelector('#phoneNumber').value.replace(/[\s()-]/g,'');const {data:authData,error:sessionError}=await sb.auth.getSession();if(sessionError)throw sessionError;if(!authData?.session)throw new Error('Sessione scaduta. Accedi nuovamente.');const {error}=await sb.auth.verifyOtp({phone,token,type:'phone_change'});if(error)throw error;const {data:{user},error:userError}=await sb.auth.getUser();if(userError)throw userError;if(session&&user)session={...session,user};close();toast('Numero di telefono verificato correttamente.');route();renderFirstLoginVerificationNotice()}catch(ex){errorText(ex)}finally{btn.disabled=false}});
  overlay.querySelector('#phoneRestart').onclick=()=>{err.textContent='';overlay.querySelector('#phoneOtp').value='';otp.hidden=true;start.hidden=false;help.textContent='Inserisci il numero in formato internazionale, ad esempio +39 seguito dal tuo numero.'};
}
async function passwordReset(){if(!sb||!session?.user.email)return;const {error}=await sb.auth.resetPasswordForEmail(session.user.email,{redirectTo:authRedirectUrl()});toast(error?'Errore: '+error.message:'Se consentito, riceverai un’email per reimpostare la password.')}
if(!document.getElementById('ye-chart-style')){const s=document.createElement('style');s.id='ye-chart-style';s.textContent="\n/* YoungExchange | grafici professionali */\n.ye-chart-tooltip{position:absolute;z-index:4;pointer-events:none;padding:10px 13px;border:1px solid #326d50;border-radius:11px;background:#102b20;color:#eafff2;box-shadow:0 12px 30px #0008;font:600 12px 'DM Sans',sans-serif;white-space:nowrap}\n.ye-chart-tooltip[hidden]{display:none!important}\n.ye-candle-tip{position:absolute;z-index:5;pointer-events:none;max-width:calc(100% - 12px);padding:9px 12px;border:1px solid #357456;border-radius:8px;background:#0b2019ee;color:#e6fff1;box-shadow:0 8px 28px #0008;font:600 11px system-ui,sans-serif;white-space:normal}\n.ye-candle-tip[hidden]{display:none!important}\n.chart{height:285px;cursor:crosshair;touch-action:pan-y}\n.chart-tall{height:390px}\n@media(max-width:600px){.chart{height:240px}.chart-tall{height:300px}}\n";document.head.appendChild(s)}
// Grafici YoungExchange: serie storica reale CoinGecko (7 giorni) e ultimo prezzo live separato.
// Candlestick OHLC REALI da Kraken; nessuna candela sintetica.
const yeOhlcPairs={bitcoin:'XBTEUR',ethereum:'ETHEUR',tether:'USDTEUR',solana:'SOLEUR',ripple:'XRPEUR',binancecoin:'BNBEUR'};
const yeOhlcCache=new Map();
const yeOhlcInFlight=new Map();
function yeCandlePrice(v){return Number(v).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:v<1?5:2})+' €'}
async function yeGetOhlc(assetId){
 const pair=yeOhlcPairs[assetId];if(!pair)throw Error('Mercato OHLC non disponibile per questo asset');
 const saved=yeOhlcCache.get(assetId);if(saved&&Date.now()-saved.at<60000)return saved.data;
 if(yeOhlcInFlight.has(assetId))return yeOhlcInFlight.get(assetId);
 const job=(async()=>{
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),9000);
  try{
   const r=await fetch('https://api.kraken.com/0/public/OHLC?pair='+encodeURIComponent(pair)+'&interval=60',{signal:ctrl.signal,cache:'no-store'});
   if(!r.ok)throw Error('HTTP '+r.status);
   const json=await r.json();if(json.error?.length)throw Error(json.error.join('; '));
   const key=Object.keys(json.result||{}).find(k=>k!=='last');if(!key)throw Error('Serie OHLC assente');
   const rows=json.result[key].map(x=>({t:Number(x[0])*1000,o:Number(x[1]),h:Number(x[2]),l:Number(x[3]),c:Number(x[4]),v:Number(x[6])})).filter(x=>[x.t,x.o,x.h,x.l,x.c,x.v].every(Number.isFinite)&&x.o>0&&x.h>=Math.max(x.o,x.c)&&x.l<=Math.min(x.o,x.c));
   // Ultima candela Kraken in formazione: e' valida ma non chiusa, indicata nell'interfaccia.
   if(rows.length<10)throw Error('Dati insufficienti');
   const data=rows.slice(-96);yeOhlcCache.set(assetId,{at:Date.now(),data});return data;
  }finally{clearTimeout(timer)}
 })();yeOhlcInFlight.set(assetId,job);try{return await job}finally{yeOhlcInFlight.delete(assetId)}
}
function yeUpdateFooterLive(){const el=$('yeFooterQuotes');if(!el)return;const live=Object.values(quotes).some(q=>q?.yeLiveAt&&Date.now()-q.yeLiveAt<12000);el.textContent=live?'Quotazioni in tempo reale':'Quotazioni in aggiornamento';el.classList.toggle('ye-live',live)}
setInterval(yeUpdateFooterLive,2000);
function yeChartControls(id){return `<div class="ye-chart-controls" data-chart="${id}"><div class="ye-timeframes">${[['1','1m'],['5','5m'],['15','15m'],['30','30m'],['60','1H'],['240','4H'],['1440','1G']].map(([v,l])=>`<button type="button" data-interval="${v}" class="${v==='60'?'is-on':''}">${l}</button>`).join('')}</div><div class="ye-chart-tools"><button type="button" data-ma="toggle" class="is-on" title="Mostra/nascondi media mobile">MA20</button><button type="button" data-cross="1" class="is-on" title="Mirino e valori candela">⊕</button><button type="button" data-zoom="in" title="Ingrandisci">＋</button><button type="button" data-zoom="out" title="Riduci">－</button><button type="button" data-live="1">● LIVE</button><button type="button" data-fullscreen="1" title="Schermo intero">⛶</button></div></div>`}
function yeMarketTitle(){const el=$('yeMarketChartTitle');if(el)el.textContent=(assets.find(a=>a.id===selected)?.name||'Asset')+' · grafico a candele'}
const yeChartState=new Map();
async function yeLoadChartRows(assetId,interval){
 const pair=yeOhlcPairs[assetId];if(!pair)throw Error('Candele non disponibili per questo asset');
 const key=assetId+':'+interval, saved=yeOhlcCache.get(key);
 if(saved&&Date.now()-saved.at<45000)return saved.data;
 const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),11000);
 try{
  const res=await fetch('https://api.kraken.com/0/public/OHLC?pair='+encodeURIComponent(pair)+'&interval='+interval,{signal:ctrl.signal,cache:'no-store'});
  if(!res.ok)throw Error('HTTP '+res.status);
  const json=await res.json();if(json.error?.length)throw Error(json.error.join(', '));
  const keyName=Object.keys(json.result||{}).find(k=>k!=='last');if(!keyName)throw Error('OHLC non disponibili');
  const data=json.result[keyName].map(x=>({t:Number(x[0])*1000,o:Number(x[1]),h:Number(x[2]),l:Number(x[3]),c:Number(x[4]),v:Number(x[6])})).filter(x=>[x.t,x.o,x.h,x.l,x.c,x.v].every(Number.isFinite)&&x.o>0&&x.h>=Math.max(x.o,x.c)&&x.l<=Math.min(x.o,x.c));
  if(data.length<10)throw Error('Storico insufficiente');yeOhlcCache.set(key,{at:Date.now(),data});return data;
 }finally{clearTimeout(timeout)}
}
function draw(id,assetId){
 const canvas=$(id);if(!canvas)return;
 if(canvas._yeChartCleanup)canvas._yeChartCleanup();
 const host=canvas.parentElement,bar=canvas.closest('.ye-pro-chart, .card')?.querySelector(`.ye-chart-controls[data-chart="${id}"]`);
 const old=yeChartState.get(id),state={assetId,interval:old?.interval||60,ma:old?.ma!==false,visible:old?.visible||80,end:0,hover:-1,cross:old?.cross!==false,rows:[],drag:null,serial:(old?.serial||0)+1};
 yeChartState.set(id,state);
 if(bar){bar.querySelectorAll('[data-interval]').forEach(b=>b.classList.toggle('is-on',Number(b.dataset.interval)===state.interval));bar.querySelector('[data-ma]')?.classList.toggle('is-on',state.ma)}
 host.style.position='relative';let tip=host.querySelector('.ye-candle-tip');if(!tip){tip=document.createElement('div');tip.className='ye-candle-tip';tip.hidden=true;host.appendChild(tip)}
 const L=16,R=96,T=22,B=32;
 const render=()=>{
  if(!canvas.isConnected)return;
  const W=canvas.clientWidth,H=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);if(W<150||H<120)return;
  const pixelW=Math.round(W*dpr),pixelH=Math.round(H*dpr);if(canvas.width!==pixelW)canvas.width=pixelW;if(canvas.height!==pixelH)canvas.height=pixelH;const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);
  if(!state.rows.length){c.fillStyle='#92b4a5';c.font='13px sans-serif';c.fillText('Caricamento candele reali…',18,35);return}
  const all=state.rows,amount=Math.min(state.visible,all.length),end=Math.max(amount,Math.min(all.length,state.end||all.length)),start=Math.max(0,end-amount),rows=all.slice(start,end),plotW=W-L-R,volH=Math.max(40,H*.19),priceBottom=H-B-volH-16,priceH=priceBottom-T;
  const low=Math.min(...rows.map(r=>r.l)),high=Math.max(...rows.map(r=>r.h)),pad=Math.max((high-low)*.09,high*.0005),lo=low-pad,hi=high+pad,py=v=>T+(hi-v)/(hi-lo)*priceH,cw=plotW/rows.length,bw=Math.max(1.5,Math.min(13,cw*.67));
  c.font='11px system-ui';c.textBaseline='middle';
  for(let i=0;i<5;i++){const y=T+priceH*i/4,value=hi-(hi-lo)*i/4;c.strokeStyle='#416a5748';c.setLineDash([2,5]);c.beginPath();c.moveTo(L,y);c.lineTo(W-R+6,y);c.stroke();c.setLineDash([]);c.fillStyle='#9ebbaa';c.textAlign='right';c.fillText(yeCandlePrice(value),W-4,y)}
  for(let i=0;i<=4;i++){const x=L+plotW*i/4;c.strokeStyle='#3a604a25';c.beginPath();c.moveTo(x,T);c.lineTo(x,H-B);c.stroke();const r=rows[Math.min(rows.length-1,Math.round((rows.length-1)*i/4))];c.fillStyle='#9ebbaa';c.textAlign='center';c.textBaseline='bottom';c.fillText(new Date(r.t).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}),x,H-4);c.textBaseline='middle'}
  const maxVol=Math.max(1,...rows.map(r=>r.v));rows.forEach((r,i)=>{const x=L+(i+.5)*cw,up=r.c>=r.o,color=up?'#31e5a4':'#ff7185';c.fillStyle=up?'#31e5a455':'#ff718555';const vh=r.v/maxVol*volH;c.fillRect(x-bw/2,H-B-vh,bw,Math.max(1,vh));c.strokeStyle=color;c.lineWidth=1.15;c.beginPath();c.moveTo(x,py(r.h));c.lineTo(x,py(r.l));c.stroke();c.fillStyle=color;c.fillRect(x-bw/2,py(Math.max(r.o,r.c)),bw,Math.max(1,py(Math.min(r.o,r.c))-py(Math.max(r.o,r.c))))});
  if(state.ma){c.beginPath();let first=true;for(let i=0;i<rows.length;i++){const globalIndex=start+i;if(globalIndex<19)continue;let sum=0;for(let j=globalIndex-19;j<=globalIndex;j++)sum+=all[j].c;const x=L+(i+.5)*cw,y=py(sum/20);if(first){c.moveTo(x,y);first=false}else c.lineTo(x,y)}c.strokeStyle='#f5c95f';c.lineWidth=1.8;c.stroke()}
  const current=Number(quotes[assetId]?.current_price);if(Number.isFinite(current)&&current>=lo&&current<=hi){c.strokeStyle='#33e5a57a';c.setLineDash([5,5]);c.beginPath();c.moveTo(L,py(current));c.lineTo(W-R,py(current));c.stroke();c.setLineDash([])}
  if(state.cross&&state.hover>=start&&state.hover<end){const i=state.hover-start,x=L+(i+.5)*cw,r=all[state.hover];c.strokeStyle='#d7f9e6a0';c.setLineDash([3,4]);c.beginPath();c.moveTo(x,T);c.lineTo(x,H-B);c.stroke();c.setLineDash([]);tip.hidden=false;tip.textContent=new Date(r.t).toLocaleString('it-IT')+' · O '+yeCandlePrice(r.o)+' · H '+yeCandlePrice(r.h)+' · L '+yeCandlePrice(r.l)+' · C '+yeCandlePrice(r.c)+' · Vol '+r.v.toLocaleString('it-IT',{maximumFractionDigits:3})}else tip.hidden=true;
  const summary=$(id==='mainChart'?'yeChartSummaryMain':'yeChartSummaryMarket');if(summary&&rows.length){const last=rows.at(-1),first=rows[0],delta=(last.c/first.o-1)*100;const fields=[['Apertura',yeCandlePrice(last.o)],['Massimo',yeCandlePrice(last.h)],['Minimo',yeCandlePrice(last.l)],['Chiusura',yeCandlePrice(last.c)],['Variazione intervallo',(delta>=0?'+':'')+delta.toFixed(2)+'%'],['Volume',last.v.toLocaleString('it-IT',{maximumFractionDigits:3})]];summary.innerHTML=fields.map(([k,v])=>'<div><span>'+k+'</span><strong>'+v+'</strong></div>').join('');}const mainPrice=$('yeChartPriceMain');if(mainPrice&&id==='mainChart'){const q=Number(quotes.bitcoin?.current_price);if(Number.isFinite(q)&&q>0)mainPrice.textContent=yeCandlePrice(q)}const info=host.querySelector('.ye-chart-info');if(info)info.textContent=state.end&&state.end<all.length?'Storico · trascina per navigare':'Ultime candele · trascina per esplorare';
 };
 const load=async()=>{const request=++state.serial;state.rows=[];render();try{const data=await yeLoadChartRows(assetId,state.interval);if(yeChartState.get(id)!==state||request!==state.serial)return;state.rows=data;state.end=data.length;state.visible=Math.min(state.visible,data.length);render()}catch(err){if(yeChartState.get(id)!==state||request!==state.serial)return;const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle='#f4b7a9';c.font='13px sans-serif';c.fillText(('Dati OHLC non disponibili: '+err.message).slice(0,95),15,35)}};
 const locate=e=>{const rect=canvas.getBoundingClientRect(),n=Math.min(state.visible,state.rows.length),end=Math.max(n,Math.min(state.rows.length,state.end||state.rows.length));return Math.max(end-n,Math.min(end-1,end-n+Math.floor((e.clientX-rect.left-L)/Math.max(1,rect.width-L-R)*n)))};
 const down=e=>{if(!state.rows.length)return;state.drag={x:e.clientX,end:state.end};canvas.style.cursor='grabbing';canvas.setPointerCapture?.(e.pointerId)};
 let scheduled=false;const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;render()})};
 const move=e=>{if(state.drag){const delta=Math.round((e.clientX-state.drag.x)/Math.max(1,(canvas.clientWidth-L-R)/state.visible));state.end=Math.max(Math.min(state.visible,state.rows.length),Math.min(state.rows.length,state.drag.end-delta));state.hover=-1}else state.hover=locate(e);schedule()};
 const up=()=>{state.drag=null;canvas.style.cursor='crosshair'};const leave=()=>{if(!state.drag){state.hover=-1;schedule()}};
 const wheel=e=>{if(!state.rows.length)return;e.preventDefault();state.visible=Math.max(12,Math.min(state.rows.length,state.visible+(e.deltaY>0?10:-10)));state.end=Math.max(state.visible,Math.min(state.rows.length,state.end));render()};
 const click=e=>{const b=e.target.closest('button');if(!b||!bar.contains(b))return;if(b.dataset.interval){const n=Number(b.dataset.interval);if(n!==state.interval){state.interval=n;bar.querySelectorAll('[data-interval]').forEach(x=>x.classList.toggle('is-on',x===b));load()}}else if(b.dataset.ma){state.ma=!state.ma;b.classList.toggle('is-on',state.ma);render()}else if(b.dataset.cross){state.cross=!state.cross;b.classList.toggle('is-on',state.cross);render()}else if(b.dataset.zoom){if(!state.rows.length)return;state.visible=Math.max(12,Math.min(state.rows.length,state.visible+(b.dataset.zoom==='in'?-12:12)));render()}else if(b.dataset.live){state.end=state.rows.length;load()}else if(b.dataset.fullscreen){const panel=canvas.closest('.card');if(document.fullscreenElement)document.exitFullscreen?.();else panel?.requestFullscreen?.()}};
 canvas.style.touchAction='pan-y';canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('pointerleave',leave);canvas.addEventListener('wheel',wheel,{passive:false});bar?.addEventListener('click',click);window.addEventListener('resize',render);
 canvas._yeChartCleanup=()=>{canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('pointerleave',leave);canvas.removeEventListener('wheel',wheel);bar?.removeEventListener('click',click);window.removeEventListener('resize',render)};
 const refresh=setInterval(async()=>{if(!canvas.isConnected){clearInterval(refresh);return}if(document.hidden||state.drag)return;try{const data=await yeLoadChartRows(assetId,state.interval);if(yeChartState.get(id)!==state)return;const atEnd=state.end>=state.rows.length;state.rows=data;if(atEnd)state.end=data.length;schedule()}catch(e){}},15000);const previousCleanup=canvas._yeChartCleanup;canvas._yeChartCleanup=()=>{clearInterval(refresh);previousCleanup()};canvas._yeCandle={assetId,paint:render};load();
}
function drawSparkFallback(id,assetId){
 const canvas=$(id);if(!canvas)return;
 const item=quotes[assetId],raw=item?.sparkline_in_7d?.price;
 const values=Array.isArray(raw)?raw.map(Number).filter(Number.isFinite):[];
 const old=canvas._yeChartCleanup;if(old)old();
 const host=canvas.parentElement;
 let tip=host.querySelector('.ye-chart-tooltip');
 if(!tip){host.style.position='relative';tip=document.createElement('div');tip.className='ye-chart-tooltip';tip.hidden=true;host.appendChild(tip)}
 const priceFormat=n=>'€ '+Number(n).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:n<1?5:2});
 if(values.length<2){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#9ab3a5';ctx.font='13px sans-serif';ctx.fillText('Storico non disponibile: attendi i dati di mercato.',18,40);return}
 let hover=-1;
 const render=()=>{
  if(!canvas.isConnected)return;
  const dpr=Math.min(window.devicePixelRatio||1,3),w=canvas.clientWidth,h=canvas.clientHeight;
  if(w<50||h<80)return;
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  const left=14,right=84,top=23,bottom=32,pw=Math.max(10,w-left-right),ph=h-top-bottom;
  const current=Number(quotes[assetId]?.current_price);
  // L'ultimo tick live e' distinto dai punti storici; non inventare candele o intervalli.
  const live=Number.isFinite(current)&&current>0?current:values.at(-1);
  const min=Math.min(...values,live),max=Math.max(...values,live),margin=(max-min||max*.005||1)*.14;
  const lo=min-margin,hi=max+margin,scale=hi-lo||1;
  const xy=(v,i)=>[left+(i/(values.length-1))*pw,top+(hi-v)/scale*ph];
  const points=values.map(xy);const y=v=>top+(hi-v)/scale*ph;
  ctx.font='11px DM Sans, sans-serif';ctx.textBaseline='middle';
  for(let i=0;i<5;i++){
   const value=lo+(hi-lo)*(4-i)/4,yy=y(value);
   ctx.strokeStyle='rgba(113,160,137,.16)';ctx.lineWidth=1;ctx.setLineDash([3,5]);ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(w-right+9,yy);ctx.stroke();ctx.setLineDash([]);
   ctx.fillStyle='#8eab9a';ctx.textAlign='right';ctx.fillText(priceFormat(value),w-5,yy);
  }
  const start=Date.now()-7*86400000;
  ctx.textAlign='center';ctx.fillStyle='#8eab9a';ctx.textBaseline='bottom';
  for(let i=0;i<=4;i++){const x=left+pw*i/4;const dt=new Date(start+7*86400000*i/4);ctx.fillText(dt.toLocaleDateString('it-IT',{day:'2-digit',month:'short'}),x,h-4)}
  const up=values.at(-1)>=values[0],stroke=up?'#38e5a3':'#f37d87';
  const fill=ctx.createLinearGradient(0,top,0,h-bottom);fill.addColorStop(0,up?'rgba(56,229,163,.25)':'rgba(243,125,135,.20)');fill.addColorStop(1,'rgba(56,229,163,0)');
  ctx.beginPath();points.forEach(([x,yy],i)=>i?ctx.lineTo(x,yy):ctx.moveTo(x,yy));ctx.lineTo(points.at(-1)[0],h-bottom);ctx.lineTo(left,h-bottom);ctx.closePath();ctx.fillStyle=fill;ctx.fill();
  ctx.beginPath();points.forEach(([x,yy],i)=>i?ctx.lineTo(x,yy):ctx.moveTo(x,yy));ctx.lineWidth=2.6;ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle=stroke;ctx.shadowColor=stroke;ctx.shadowBlur=9;ctx.stroke();ctx.shadowBlur=0;
  // Prezzo live corrente: indicatore tratteggiato, non parte della serie storica.
  const ly=y(live);ctx.setLineDash([5,5]);ctx.strokeStyle='rgba(56,229,163,.5)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,ly);ctx.lineTo(w-right+9,ly);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#38e5a3';ctx.beginPath();ctx.arc(w-right+9,ly,4,0,Math.PI*2);ctx.fill();
  if(hover>=0){const i=Math.min(values.length-1,hover),[x,yy]=points[i];ctx.setLineDash([4,4]);ctx.strokeStyle='rgba(232,255,242,.45)';ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,h-bottom);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=stroke;ctx.beginPath();ctx.arc(x,yy,5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#0c2118';ctx.lineWidth=2;ctx.stroke()}
 };
 const move=e=>{const r=canvas.getBoundingClientRect(),x=e.clientX-r.left;hover=Math.max(0,Math.min(values.length-1,Math.round((x-14)/Math.max(1,r.width-98)*(values.length-1))));const date=new Date(Date.now()-7*86400000+hover/(values.length-1)*7*86400000);tip.textContent=date.toLocaleString('it-IT',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})+' · '+priceFormat(values[hover]);tip.hidden=false;tip.style.left=Math.max(10,Math.min(r.width-170,x+12))+'px';tip.style.top='44px';render()};
 const leave=()=>{hover=-1;tip.hidden=true;render()};
 canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerleave',leave);
 window.addEventListener('resize',render);
 canvas._yeChartCleanup=()=>{canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerleave',leave);window.removeEventListener('resize',render)};
 requestAnimationFrame(render);
}

async function init(){if(!sb){$('authNote').textContent='Backend pubblico non configurato; accesso e operazioni finanziarie disabilitati.';return}const {data:{session:s},error}=await sb.auth.getSession();if(error)toast(error.message);const recoveryLink=location.hash.includes('type=recovery')||location.search.includes('type=recovery');if(recoveryLink){const target=new URL('reimposta-password.html',location.href);target.search=location.search;target.hash=location.hash;location.replace(target.toString());return}if(s)await enter(s);sb.auth.onAuthStateChange((event,newSession)=>{if(event==='SIGNED_OUT')exit();else if(event==='SIGNED_IN'&&newSession&&!session)setTimeout(()=>enter(newSession),0)});setInterval(()=>{if(session)fetchQuotes()},60000)}init();
})();
