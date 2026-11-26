-- Esegui questo SQL in Supabase SQL Editor
-- Crea una tabella completamente aperta (senza RLS) per gli IBAN

DROP TABLE IF EXISTS public.client_iban_data;

CREATE TABLE public.client_iban_data (
  user_id uuid PRIMARY KEY,
  iban text,
  bank_name text,
  account_holder text,
  notes text,
  updated_at timestamptz DEFAULT now()
);

-- Nessuna RLS: accesso completo
ALTER TABLE public.client_iban_data DISABLE ROW LEVEL SECURITY;

-- Grant espliciti
GRANT ALL ON public.client_iban_data TO anon, authenticated, service_role;
