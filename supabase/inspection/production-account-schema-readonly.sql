-- YOUNGEXCHANGE / READ-ONLY PRODUCTION SCHEMA INSPECTION
-- Run manually in Supabase SQL Editor with the Production project selected.
-- This file contains SELECT only. It does not change accounts or data.
-- Share ONLY schema results; redact any sensitive values before sharing.
SELECT current_database() AS database_name, current_schema() AS schema_name;
SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('profiles','wallets','ledger_entries','admin_users','audit_log',
                     'operation_requests','ye_admin_entries','ye_admin_transfers',
                     'ye_client_requests','ye_client_request_reviews')
ORDER BY table_name, ordinal_position;

SELECT tc.table_name, tc.constraint_name, tc.constraint_type,
       kcu.column_name, ccu.table_name AS referenced_table, ccu.column_name AS referenced_column
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name=ccu.constraint_name AND tc.table_schema=ccu.table_schema
WHERE tc.table_schema='public'
  AND tc.table_name IN ('profiles','wallets','ledger_entries','admin_users')
ORDER BY tc.table_name,tc.constraint_name,kcu.ordinal_position;

SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       pg_get_function_result(p.oid) AS returns,
       p.prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('is_youngexchange_admin','ye_ensure_my_wallets',
                   'ye_admin_customer_accounts','ye_admin_record_internal_entry',
                   'ye_admin_set_account_verification')
ORDER BY p.proname;

SELECT schemaname, tablename, rowsecurity
FROM pg_tables WHERE schemaname='public'
  AND tablename IN ('profiles','wallets','ledger_entries','admin_users');

SELECT schemaname, tablename, policyname, roles, cmd, permissive
FROM pg_policies WHERE schemaname='public'
  AND tablename IN ('profiles','wallets','ledger_entries','admin_users')
ORDER BY tablename,policyname;
