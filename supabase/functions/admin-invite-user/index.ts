// YoungExchange admin-only account provisioning.
// Creates an unverified Auth identity, profile, and zero-balance wallets.
// OTP enrollment and ledger changes remain separate operations.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "https://youngexchange.eu",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const respond = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), { status, headers });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return respond(405, { ok: false, error: "Method not allowed" });

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !serviceRole) return respond(503, { ok: false, error: "Server configuration unavailable" });
  const bearer = request.headers.get("Authorization") || "";
  if (!/^Bearer\s+\S+$/i.test(bearer)) return respond(401, { ok: false, error: "Authentication required" });
  const token = bearer.replace(/^Bearer\s+/i, "").trim();

  // The caller's JWT, not a client-supplied role, determines admin access.
  const caller = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: identity, error: authError } = await caller.auth.getUser(token);
  if (authError || !identity.user) return respond(401, { ok: false, error: "Invalid session" });
  const { data: allowed, error: permissionError } = await caller.rpc("is_youngexchange_admin");
  if (permissionError || allowed !== true) return respond(403, { ok: false, error: "Admin permission required" });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return respond(400, { ok: false, error: "Invalid JSON" }); }
  // Save an administrator-proposed contact without confirming possession of that number.
  if (body.action === 'set_pending_phone') {
    const userId = String(body.user_id || '').trim();
    const phone = String(body.phone || '').replace(/[\s()-]/g, '');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId) ||
        !/^\+[1-9]\d{7,14}$/.test(phone))
      return respond(400, { ok: false, error: 'Identificativo o numero non valido' });
    const admin = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: target, error: lookupError } = await admin.auth.admin.getUserById(userId);
    if (lookupError || !target?.user) return respond(404, { ok: false, error: 'Cliente non trovato' });
    if (target.user.id === identity.user.id) return respond(400, { ok: false, error: 'Usa la verifica personale per il tuo numero' });
    const { error: saveError } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: { ...target.user.user_metadata, phone_pending_verification: phone },
      app_metadata: { ...target.user.app_metadata, ye_phone_manual_review: null }
    });
    if (saveError) {
      console.error('admin pending phone update failed', saveError.code || 'unknown');
      return respond(503, { ok: false, error: 'Numero non salvato' });
    }
    return respond(200, { ok: true, user_id: userId, phone_pending_verification: phone,
      phone_verified: false, message: 'Numero salvato. Il cliente deve confermarlo tramite OTP.' });
  }
  if (body.action === 'manual_phone_review') {
    const userId=String(body.user_id||'').trim();
    const method=String(body.method||'').trim();
    const reason=String(body.reason||'').trim();
    if (!/^[0-9a-f-]{36}$/i.test(userId) || !['callback','in_person'].includes(method) || reason.length<12 || reason.length>500)
      return respond(400,{ok:false,error:'Seleziona cliente, metodo di conferma e motivazione di almeno 12 caratteri'});
    const admin=createClient(url,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:target,error:lookupError}=await admin.auth.admin.getUserById(userId);
    if(lookupError||!target?.user||userId===identity.user.id)return respond(404,{ok:false,error:'Cliente non disponibile'});
    const candidate=String(target.user.user_metadata?.phone_pending_verification||'').trim();
    if(!/^\+[1-9]\d{7,14}$/.test(candidate))return respond(409,{ok:false,error:'Prima salva un numero valido da verificare'});
    const review={phone:candidate,method,reason,reviewed_by:identity.user.id,reviewed_at:new Date().toISOString()};
    const {error:saveError}=await admin.auth.admin.updateUserById(userId,{
      app_metadata:{...target.user.app_metadata,ye_phone_manual_review:review}
    });
    if(saveError)return respond(503,{ok:false,error:'Conferma amministrativa non registrata'});
    console.info('Manual phone review registered',userId,identity.user.id,method);
    return respond(200,{ok:true,phone:candidate,reviewed_at:review.reviewed_at,phone_sms_verified:false});
  }
  if (body.action === 'set_account_access') {
    const userId = String(body.user_id || '').trim();
    const disabled = body.disabled === true;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId) || typeof body.disabled !== 'boolean')
      return respond(400, { ok: false, error: 'Cliente o scelta non valida' });
    if (identity.user.id === userId) return respond(403, { ok: false, error: 'Non puoi disabilitare il tuo account amministratore' });
    const admin = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: target, error: lookupError } = await admin.auth.admin.getUserById(userId);
    if (lookupError || !target?.user) return respond(404, { ok: false, error: 'Cliente non trovato' });
    if (target.user.app_metadata?.ye_admin_provisioned === true)
      return respond(403, { ok: false, error: 'Non è consentito disabilitare account amministrativi' });
    const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: disabled ? '876000h' : 'none',
      app_metadata: { ...target.user.app_metadata, ye_account_disabled: disabled,
        ye_access_changed_at: new Date().toISOString(), ye_access_changed_by: identity.user.id }
    });
    if (updateError || !updated?.user) {
      console.error('admin access change failed', updateError?.code || 'unknown');
      return respond(503, { ok: false, error: 'Impossibile aggiornare l’accesso del conto' });
    }
    console.info('Account access changed by admin', { userId, disabled, actor: identity.user.id });
    return respond(200, { ok: true, user_id: userId, disabled,
      message: disabled ? 'Conto disabilitato' : 'Conto riattivato' });
  }
  if (body.action === 'list') {
    const { data: rows, error: listError } = await caller.rpc('admin_list_users');
    if (listError || !Array.isArray(rows)) {
      console.error('admin_list_users failed', listError?.code || 'unknown');
      return respond(503, { ok: false, error: 'Elenco clienti non disponibile: controllare admin_list_users' });
    }
    // Auth Admin API is separately protected by server credentials and only used
    // after checking the caller's real database admin role.
    const admin = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authPage, error: authListError } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (authListError) console.error('auth user verification states unavailable', authListError.code || 'unknown');
    const authUsers = new Map((authPage?.users || []).map(user => [user.id, user]));
    const confirmations = new Map((authPage?.users || []).map(user => [user.id, user.email_confirmed_at || null]));
    const users = await Promise.all(rows.map(async (row) => {
      const { data: wallets, error: walletError } = await caller.rpc('admin_list_wallets', { p_user_id: row.user_id });
      if (walletError) console.error('admin wallet count unavailable', walletError.code || 'unknown');
      return {
        user_id: row.user_id,
        email: row.email,
        display_name: row.display_name || [authUsers.get(row.user_id)?.user_metadata?.first_name,authUsers.get(row.user_id)?.user_metadata?.last_name].filter(Boolean).join(' ') || null,
        created_at: row.registered_at,
        email_confirmed_at: confirmations.get(row.user_id) || null,
        email_status_known: confirmations.has(row.user_id),
        wallet_count: walletError ? null : (wallets || []).length,
        phone_pending_verification: authUsers.get(row.user_id)?.user_metadata?.phone_pending_verification || null,
        phone: authUsers.get(row.user_id)?.phone || null,
        phone_confirmed_at: authUsers.get(row.user_id)?.phone_confirmed_at || null,
        phone_manual_review: authUsers.get(row.user_id)?.app_metadata?.ye_phone_manual_review || null,
        account_disabled: authUsers.get(row.user_id)?.app_metadata?.ye_account_disabled === true || (authUsers.get(row.user_id)?.banned_until && new Date(authUsers.get(row.user_id).banned_until).getTime()>Date.now()) || false,
      };
    }));
    return respond(200, { ok: true, page: 1, has_more: false, users });
  }
  // Only verify incomplete accounts here. The database trigger creates wallets
  // at Auth registration and this endpoint must never reset existing balances.
  if (body.action === 'repair') {
    const userId = String(body.user_id || '').trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId))
      return respond(400, { ok: false, error: 'Valid user_id required' });
    const admin = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: account, error: lookupError } = await admin.auth.admin.getUserById(userId);
    if (lookupError || !account?.user || account.user.app_metadata?.ye_admin_provisioned !== true)
      return respond(404, { ok: false, error: 'Admin-provisioned account not found' });
    const [profiles, walletResponse] = await Promise.all([
      caller.rpc('admin_list_users'),
      caller.rpc('admin_list_wallets', { p_user_id: userId }),
    ]);
    if (profiles.error || walletResponse.error) return respond(503, { ok: false, error: 'Verification unavailable; no changes made' });
    const hasProfile = (profiles.data || []).some(p => p.user_id === userId);
    const required = ['EUR','USDT','BTC','ETH'];
    const hasWallets = required.every(currency => (walletResponse.data || []).some(w => w.currency === currency));
    if (!hasProfile || !hasWallets) return respond(409, {
      ok: false, error: 'Account incomplete. Manual reconciliation required; no balances changed.',
      profile_present: hasProfile, wallets_present: (walletResponse.data || []).map(w => w.currency),
    });
    return respond(200, { ok: true, verified: true, user_id: userId, wallets_present: required,
      balances_unchanged: true, invitation_resent: false });
  }
  if (body.action != null && body.action !== 'create')
    return respond(400, { ok: false, error: 'Unsupported action' });
  const email = String(body.email || "").trim().toLowerCase();
  const firstName = String(body.first_name || "").trim();
  const lastName = String(body.last_name || "").trim();
  const phone = body.phone == null ? "" : String(body.phone).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      !firstName || firstName.length > 80 || !lastName || lastName.length > 80 ||
      (phone && !/^\+[1-9]\d{7,14}$/.test(phone))) {
    return respond(400, { ok: false, error: "Invalid customer details" });
  }

  // Only server-side code receives the service-role credential.
  // Invitation is emailed by Supabase Auth; no initial password or fake verification is assigned.
  const admin = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: 'https://youngexchange.eu/reimposta-password.html',
    data: { first_name: firstName, last_name: lastName, phone_pending_verification: phone || null },
  });
  if (error) {
    // Avoid exposing Auth internals or account existence to the caller.
    console.error("admin account creation failed", error.code || error.status || "unknown");
    return respond(409, { ok: false, error: "Account could not be created; check for duplicates and server configuration" });
  }
  // Security-critical provisioning flag belongs in server-controlled app_metadata.
  // user_metadata is editable by the customer and must never authorize repair.
  const { error: markError } = await admin.auth.admin.updateUserById(data.user.id, {
    app_metadata: { ...(data.user.app_metadata || {}), ye_admin_provisioned: true },
  });
  if (markError) {
    console.error('admin provisioning marker failed', markError.code || 'unknown');
    return respond(207, { ok: false, partial: true, identity_created: true, user_id: data.user.id,
      invitation_requested: true, error: 'Account invited but secure provisioning marker failed; manual review required' });
  }
  // The auth.users INSERT trigger already creates a profile and four zero-balance
  // wallets. Verify using authorized admin RPCs; no REST writes or balance reset.
  const { data: accounts, error: profileError } = await caller.rpc('admin_list_users');
  const found = Array.isArray(accounts) && accounts.some((account) => account.user_id === data.user.id);
  if (profileError || !found) {
    console.error('admin profile verification failed', profileError?.code || 'not_found');
    return respond(207, { ok: false, partial: true, identity_created: true, user_id: data.user.id,
      invitation_requested: true, error: 'Identità creata, profilo non verificabile. Non ripetere la creazione.' });
  }
  const currencies = ['EUR', 'USDT', 'BTC', 'ETH'];
  const { data: wallets, error: walletError } = await caller.rpc('admin_list_wallets', { p_user_id: data.user.id });
  const verified = !walletError && currencies.every(currency => (wallets || []).some(wallet => wallet.currency === currency));
  if (!verified) {
    console.error('admin wallet verification failed', walletError?.code || 'wallets_missing');
    return respond(207, { ok: false, partial: true, identity_created: true, user_id: data.user.id,
      invitation_requested: true, error: 'Identità creata, wallet non verificabili. Non ripetere la creazione.' });
  }
  return respond(201, {
    ok: true, user_id: data.user.id, identity_created: true, profile_created: true,
    email_verified: false, phone_verified: false,
    wallets_created: true, wallet_currencies: currencies, invitation_requested: true, otp_sent: false,
    next_step: 'Customer opens the invitation link, sets a password, then verifies phone by SMS',
  });
});
