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
  // Recovery never creates another Auth identity and never resets existing balances.
  if (body.action === 'repair') {
    const userId = String(body.user_id || '').trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId))
      return respond(400, { ok: false, error: 'Valid user_id required' });
    const admin = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: account, error: lookupError } = await admin.auth.admin.getUserById(userId);
    if (lookupError || !account?.user || account.user.user_metadata?.ye_admin_provisioned !== true)
      return respond(404, { ok: false, error: 'Admin-provisioned account not found' });
    const { data: existingProfile, error: profileLookupError } = await admin.from('profiles').select('id').eq('id',userId).maybeSingle();
    if (profileLookupError) return respond(500, { ok: false, error: 'Profile lookup failed; no changes made' });
    if (!existingProfile) {
      const meta = account.user.user_metadata || {};
      const displayName = [meta.first_name, meta.last_name].filter(Boolean).join(' ').trim() || account.user.email || 'Cliente';
      const { error: insertProfileError } = await admin.from('profiles').insert({ id: userId, display_name: displayName, phone_verified: false });
      if (insertProfileError && insertProfileError.code !== '23505')
        return respond(500, { ok: false, partial: true, error: 'Profile repair failed; no wallets changed' });
    }
    const currencies = ['EUR','USDT','BTC','ETH'];
    const { error: repairError } = await admin.from('wallets').upsert(
      currencies.map(currency => ({ user_id: userId, currency, balance: 0, locked_balance: 0 })),
      { onConflict: 'user_id,currency', ignoreDuplicates: true },
    );
    if (repairError) return respond(500, { ok: false, partial: true, error: 'Wallet repair failed; inspect account before retry' });
    const { data: verifiedWallets, error: verifyError } = await admin.from('wallets').select('currency').eq('user_id',userId).in('currency',currencies);
    if (verifyError || !currencies.every(currency => verifiedWallets?.some(wallet => wallet.currency === currency)))
      return respond(500, { ok: false, partial: true, error: 'Wallet verification failed; inspect account' });
    return respond(200, { ok: true, repaired: true, user_id: userId, wallets_present: currencies, balances_unchanged: true, invitation_resent: false });
  }
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
    data: { first_name: firstName, last_name: lastName, phone_pending_verification: phone || null, ye_admin_provisioned: true },
  });
  if (error) {
    // Avoid exposing Auth internals or account existence to the caller.
    console.error("admin account creation failed", error.code || error.status || "unknown");
    return respond(409, { ok: false, error: "Account could not be created; check for duplicates and server configuration" });
  }
  // The Production profiles table has id, display_name, phone_verified, created_at.
  // Wallets have UNIQUE(user_id,currency) and nonnegative balance constraints.
  // Auth identity creation is successful even if the separate profile step fails.
  const { error: profileError } = await admin.from('profiles').upsert({
    id: data.user.id, display_name: [firstName, lastName].join(' '), phone_verified: false,
  }, { onConflict: 'id' });
  if (profileError) {
    console.error('admin profile provisioning failed', profileError.code || 'unknown');
    return respond(207, { ok: false, partial: true, user_id: data.user.id,
      identity_created: true, invitation_requested: true, profile_created: false, wallets_created: false,
      error: 'Invitation requested, but profile provisioning failed. Do not retry account creation; reconcile the profile first.' });
  }
  // Insert only missing wallets. Never overwrite any existing wallet or balance.
  // Supported currencies match the account dashboard; new wallets start at zero.
  const currencies = ['EUR', 'USDT', 'BTC', 'ETH'];
  const { error: walletError } = await admin.from('wallets').upsert(
    currencies.map((currency) => ({ user_id: data.user.id, currency, balance: 0, locked_balance: 0 })),
    { onConflict: 'user_id,currency', ignoreDuplicates: true },
  );
  if (walletError) {
    console.error('admin wallet provisioning failed', walletError.code || 'unknown');
    return respond(207, { ok: false, partial: true, user_id: data.user.id,
      identity_created: true, invitation_requested: true, profile_created: true, wallets_created: false,
      email_verified: false, phone_verified: false,
      error: 'Invitation requested and profile created; wallet provisioning failed. Do not recreate account; reconcile wallets first.' });
  }
  return respond(201, {
    ok: true, user_id: data.user.id, identity_created: true, profile_created: true,
    email_verified: false, phone_verified: false,
    wallets_created: true, wallet_currencies: currencies, invitation_requested: true, otp_sent: false,
    next_step: 'Customer opens the invitation link, sets a password, then verifies phone by SMS',
  });
});
