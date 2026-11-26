-- Esegui questo SQL in Supabase SQL Editor
-- Permette l'inserimento di IBAN nella tabella operation_requests

DROP POLICY IF EXISTS "Allow IBAN insert" ON public.operation_requests;

CREATE POLICY "Allow IBAN insert" ON public.operation_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
