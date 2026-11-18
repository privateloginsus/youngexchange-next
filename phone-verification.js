(function(){
  'use strict';
  var $=function(id){return document.getElementById(id);};
  var cfg=window.YEX_CONFIG, busy=false, phone='', verified=false;
  var start=$('phoneStartForm'), otp=$('phoneOtpForm'), message=$('phoneMessage'), help=$('phoneHelp');
  var client=null;
  function say(value){message.textContent=value||'';message.className='recovery-message'+(value?' error':'');}
  function mask(n){return n.replace(/\d(?=\d{3})/g,'•');}
  function setStage(stage){
    $('stepPhone').className='phone-progress-step'+(stage===0?' is-current':' is-complete');
    $('stepOtp').className='phone-progress-step'+(stage===1?' is-current':stage>1?' is-complete':'');
    $('stepDone').className='phone-progress-step'+(stage===2?' is-current':'');
  }
  function setBusy(value,label){
    busy=value;
    $('phoneBusy').hidden=!value;
    $('phoneBusyLabel').textContent=label||'Verifica in corso…';
    start.hidden=value||!!phone||verified;
    otp.hidden=value||!phone||verified;
    ['phoneResend','phoneRestart'].forEach(function(id){$(id).disabled=value;});
    start.querySelector('button[type=submit]').disabled=value;
    otp.querySelector('button[type=submit]').disabled=value;
  }
  function readable(err){
    var code=String(err&&err.code||'').toLowerCase();
    var txt=String(err&&err.message||'');
    if(/primary compliance profile is not approved|twilio.com\/docs\/errors\/20003/i.test(txt))return 'Invio SMS temporaneamente non disponibile: Twilio richiede ancora l’approvazione del profilo di conformità del servizio. Riprova dopo l’attivazione o contatta l’assistenza YoungExchange.';
    if(/phone.*disabled|sms.*disabled|sms.*not configured|phone.*not configured|provider.*disabled/i.test(txt)||/phone_provider_disabled|sms_provider_disabled/.test(code))return 'Il servizio SMS non è ancora attivo sul progetto YoungExchange. Contatta l’assistenza.';
    if(/token.*expired|otp.*expired/i.test(txt))return 'Codice scaduto. Richiedi un nuovo SMS.';
    if(/invalid.*otp|invalid.*token|token.*invalid/i.test(txt))return 'Il codice non è corretto. Controlla le 6 cifre e riprova.';
    if(/rate.limit|too many requests|429/i.test(txt))return 'Troppi tentativi. Attendi prima di richiedere un nuovo codice.';
    return txt||'Operazione non riuscita. Riprova.';
  }
  async function signedIn(){
    var result=await client.auth.getUser();
    if(result.error||!result.data||!result.data.user)throw new Error('Sessione scaduta. Torna al sito ed effettua nuovamente l’accesso.');
    return result.data.user;
  }
  if(!cfg||cfg.enabled!==true||!window.supabase||!cfg.supabasePublishableKey){
    say('Servizio temporaneamente non disponibile. Torna al conto e riprova.');start.hidden=true;return;
  }
  client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{detectSessionInUrl:true,autoRefreshToken:true,persistSession:true}});
  signedIn().then(function(user){
    if(user.user_metadata?.phone_pending_verification)$('phoneNumber').value=user.user_metadata.phone_pending_verification;else if(user.phone)$('phoneNumber').value=user.phone;
    if(user.phone_confirmed_at){help.textContent='Il tuo account ha già un numero verificato. Puoi continuare per confermare un nuovo numero.';}
  }).catch(function(err){say(readable(err));start.hidden=true;});
  async function requestSms(number){
    await signedIn();
    var result=await client.auth.updateUser({phone:number});
    if(result.error)throw result.error;
    phone=number;
    $('phoneMasked').textContent='Codice richiesto per '+mask(phone)+'. Controlla i tuoi SMS.';
    help.textContent='Inserisci il codice di 6 cifre ricevuto sul cellulare.';
    setStage(1);
  }
  start.addEventListener('submit',async function(event){
    event.preventDefault();if(busy)return;
    say('');
    var number=$('phoneNumber').value.replace(/[\s()-]/g,'');
    if(!/^\+[1-9]\d{7,14}$/.test(number)){say('Inserisci il numero in formato internazionale, ad esempio +393331234567.');return;}
    setBusy(true,'Invio SMS in corso…');
    try{await requestSms(number);setBusy(false);$('phoneOtp').focus();}
    catch(err){setBusy(false);say(readable(err));}
  });
  otp.addEventListener('submit',async function(event){
    event.preventDefault();if(busy||!phone)return;
    say('');
    var token=$('phoneOtp').value.trim();
    if(!/^\d{6}$/.test(token)){say('Inserisci tutte e 6 le cifre ricevute via SMS.');return;}
    setBusy(true,'Verifica protetta del codice…');
    try{
      await signedIn();
      var result=await client.auth.verifyOtp({phone:phone,token:token,type:'phone_change'});
      if(result.error)throw result.error;
      var user=await signedIn();
      if(!user.phone_confirmed_at||user.phone!==phone)throw new Error('Il servizio non ha ancora confermato il numero. Riprova.');
      verified=true;
      await new Promise(function(resolve){setTimeout(resolve,750);});
      setBusy(false);
      start.hidden=true;otp.hidden=true;$('phoneBusy').hidden=true;
      $('phoneSuccess').hidden=false;$('phoneBack').hidden=true;
      help.hidden=true;
      say('');setStage(2);
    }catch(err){setBusy(false);say(readable(err));}
  });
  $('phoneRestart').addEventListener('click',function(){if(busy)return;phone='';$('phoneOtp').value='';help.textContent='Inserisci il numero in formato internazionale, ad esempio +39 seguito dal tuo numero.';setStage(0);setBusy(false);say('');$('phoneNumber').focus();});
  $('phoneResend').addEventListener('click',async function(){
    if(busy||!phone)return;say('');setBusy(true,'Invio nuovo SMS…');
    try{await signedIn();var response=await client.auth.resend({type:'phone_change',phone:phone});if(response.error)throw response.error;setBusy(false);$('phoneOtp').value='';$('phoneOtp').focus();}
    catch(err){setBusy(false);say(readable(err));}
  });
})();
