-- Esegui questo SQL in Supabase SQL Editor
-- Crea una tabella completamente aperta per gli IBAN

DROP TABLE IF EXISTS public.client_iban_open;

CREATE TABLE public.client_iban_open (
  user_id uuid PRIMARY KEY,
  iban text,
  bank_name text,
  account_holder text,
  notes text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.client_iban_open DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.client_iban_open TO anon, authenticated, service_role;
