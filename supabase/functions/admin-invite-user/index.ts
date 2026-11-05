import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const headers = {'Access-Control-Allow-Origin':'https://youngexchange.eu','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'Method not allowed'});
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 const admins=(Deno.env.get('ADMIN_USER_IDS')||'').split(',').map(x=>x.trim()).filter(Boolean);
 if(!url||!anon||!service||!admins.length)return reply(503,{error:'Configurazione server incompleta'});
 const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return reply(401,{error:'Accesso richiesto'});
 const client=createClient(url,anon,{global:{headers:{Authorization:'Bearer '+token}}});
 const {data:{user},error:authError}=await client.auth.getUser(token);
 if(authError||!user)return reply(401,{error:'Sessione non valida'});
 if(!admins.includes(user.id))return reply(403,{error:'Operazione riservata agli amministratori'});
 let body:Record<string,unknown>;try{body=await req.json()}catch{return reply(400,{error:'JSON non valido'})}
 const email=String(body.email||'').trim().toLowerCase(),name=String(body.name||'').trim(),phone=body.phone?String(body.phone).trim():'';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||name.length<2||name.length>120||(phone&&!/^\+[1-9]\d{7,14}$/.test(phone)))return reply(400,{error:'Dati non validi'});
 const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
 // inviteUserByEmail sends an invitation through Supabase Auth's configured SMTP (Resend if configured).
 const {data,error}=await admin.auth.admin.inviteUserByEmail(email,{data:{display_name:name,...(phone?{contact_phone:phone}:{})},redirectTo:'https://youngexchange.eu/'});
 if(error)return reply(400,{error:error.message});
 return reply(200,{ok:true,user_id:data.user?.id});
});
