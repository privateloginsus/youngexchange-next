-- Esegui questo SQL nel Supabase SQL Editor (Dashboard > SQL Editor)
-- Crea la tabella per salvare gli IBAN dei clienti

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

-- Abilita RLS
ALTER TABLE public.client_ibans ENABLE ROW LEVEL SECURITY;

-- Policy: solo admin possono inserire/aggiornare
CREATE POLICY "Admins can manage IBANs" ON public.client_ibans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR auth.uid() = user_id
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: il cliente può leggere solo il proprio IBAN
CREATE POLICY "Users can view own IBAN" ON public.client_ibans
  FOR SELECT
  USING (auth.uid() = user_id);

-- Index per performance
CREATE INDEX IF NOT EXISTS idx_client_ibans_user_id ON public.client_ibans(user_id);

-- Trigger per updated_at
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
