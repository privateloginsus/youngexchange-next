-- YoungExchange Production: read-only preflight for PR #7.
-- Project: vviyfrlvikokmcwhmhys. Run each SELECT in SQL Editor.
-- No DDL, no writes, no secrets, no customer records.

-- 1. Required admin RPC and wallet bootstrap RPC signatures.
SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       pg_get_function_result(p.oid) AS returns,
       p.prosecdef AS security_definer,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('is_youngexchange_admin', 'ye_ensure_my_wallets', 'ye_admin_customer_accounts')
ORDER BY p.proname;

-- 2. Wallet currency type and allowed values.
SELECT column_name, data_type, udt_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='wallets'
ORDER BY ordinal_position;

-- 3. Auth triggers which may already provision profiles or wallets.
SELECT t.tgname AS trigger_name,
       pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE NOT t.tgisinternal
  AND ((n.nspname='auth' AND c.relname='users')
       OR (n.nspname='public' AND c.relname IN ('profiles','wallets')))
ORDER BY n.nspname,c.relname,t.tgname;

-- 4. Required table access and RLS flags.
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       has_table_privilege('authenticated',c.oid,'SELECT') AS authenticated_select
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('profiles','wallets','admin_users')
  AND c.relkind IN ('r','p')
ORDER BY c.relname;
