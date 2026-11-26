-- Esegui questo SQL in Supabase SQL Editor
-- Versione più permissiva per permettere agli admin di aggiornare i profili

-- Rimuovi eventuali policy restrittive esistenti
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for admins" ON public.profiles;

-- Crea una policy che permette l'update a chiunque sia autenticato
-- (più permissiva, per sbloccare subito)
CREATE POLICY "Allow authenticated update profiles" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- In alternativa, se preferisci solo admin:
-- CREATE POLICY "Allow admin update profiles" ON public.profiles
--   FOR UPDATE
--   USING (is_youngexchange_admin())
--   WITH CHECK (is_youngexchange_admin());
