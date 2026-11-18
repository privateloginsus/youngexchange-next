-- YoungExchange: wallet constraints / triggers, read-only Production inspection.
-- Run as a single query. No INSERT, UPDATE, DELETE or DDL.
SELECT
  c.conname AS constraint_name,
  c.contype AS constraint_type,
  pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname IN ('wallets', 'profiles', 'admin_users')
ORDER BY t.relname, c.conname;

-- Run separately if inspecting automatic wallet/profile creation:
-- SELECT event_object_table, trigger_name, action_timing, event_manipulation,
--        action_statement
-- FROM information_schema.triggers
-- WHERE event_object_schema = 'public'
--   AND event_object_table IN ('wallets','profiles');
