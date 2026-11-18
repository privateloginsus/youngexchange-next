// YoungExchange admin-only account provisioning.
// This function intentionally creates an unverified Auth identity only.
// Wallet creation, OTP enrollment and ledger changes are separate operations.
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
  // No email/phone confirmation is forged; no initial password is assigned.
  const admin = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { first_name: firstName, last_name: lastName, phone_pending_verification: phone || null },
  });
  if (error) {
    // Avoid exposing Auth internals or account existence to the caller.
    console.error("admin account creation failed", error.code || error.status || "unknown");
    return respond(409, { ok: false, error: "Account could not be created; check for duplicates and server configuration" });
  }
  // The Production profiles table only has id, display_name, phone_verified, created_at.\n  // No schema or constraint assumptions are made about wallet provisioning here.\n  // Auth identity creation is successful even if the separate profile step fails.\n  const { error: profileError } = await admin.from('profiles').upsert({\n    id: data.user.id, display_name: [firstName, lastName].join(' '), phone_verified: false,\n  }, { onConflict: 'id' });\n  if (profileError) {\n    console.error('admin profile provisioning failed', profileError.code || 'unknown');\n    return respond(207, { ok: false, partial: true, user_id: data.user.id,\n      identity_created: true, profile_created: false, wallets_created: false,\n      error: 'Identity created but profile provisioning failed. Do not retry account creation; reconcile the profile first.' });\n  }\n  return respond(201, {\n    ok: true, user_id: data.user.id, identity_created: true, profile_created: true,
    email_verified: false, phone_verified: false,
    wallets_created: false, otp_sent: false,
    next_step: "Provision wallets using a verified server-side workflow; enroll email and phone OTP at first login",
  });
});
