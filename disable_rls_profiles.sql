-- Esegui questo SQL in Supabase SQL Editor
-- Disabilita RLS sulla tabella profiles per permettere l'update (soluzione temporanea)

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Dopo aver salvato gli IBAN, puoi riattivarla con:
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
