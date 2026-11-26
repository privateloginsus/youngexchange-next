-- Esegui questo SQL in Supabase SQL Editor
-- Disabilita RLS temporaneamente su operation_requests per permettere il salvataggio IBAN

ALTER TABLE public.operation_requests DISABLE ROW LEVEL SECURITY;

-- Dopo aver salvato gli IBAN, puoi riattivarla con:
-- ALTER TABLE public.operation_requests ENABLE ROW LEVEL SECURITY;
