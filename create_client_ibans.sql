-- Esegui questo SQL nel Supabase SQL Editor
-- Versione corretta senza dipendenza da profiles.role

CREATE TABLE IF NOT EXISTS public.client_ibans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  iban text NOT NULL,
  bank_name text,
  account_holder text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.client_ibans ENABLE ROW LEVEL SECURITY;

-- Policy: admin (tramite funzione esistente) o il proprietario
DROP POLICY IF EXISTS "Admins can manage IBANs" ON public.client_ibans;
CREATE POLICY "Admins can manage IBANs" ON public.client_ibans
  FOR ALL
  USING (
    auth.uid() = user_id
    OR (SELECT is_youngexchange_admin() FROM (SELECT 1) s)
  )
  WITH CHECK (
    (SELECT is_youngexchange_admin() FROM (SELECT 1) s)
  );

-- Policy lettura per il cliente
DROP POLICY IF EXISTS "Users can view own IBAN" ON public.client_ibans;
CREATE POLICY "Users can view own IBAN" ON public.client_ibans
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_client_ibans_user_id ON public.client_ibans(user_id);

-- Trigger updated_at (se non esiste già)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_client_ibans_updated_at ON public.client_ibans;
CREATE TRIGGER update_client_ibans_updated_at
  BEFORE UPDATE ON public.client_ibans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
