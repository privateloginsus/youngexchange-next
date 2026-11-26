-- Aggiunge le colonne IBAN alla tabella profiles (già esistente e in cache)
-- Esegui questo SQL nel Supabase SQL Editor

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS iban text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS account_holder text,
  ADD COLUMN IF NOT EXISTS iban_notes text;

-- Policy per permettere agli admin di aggiornare questi campi
-- (assicurati che is_youngexchange_admin() funzioni)
