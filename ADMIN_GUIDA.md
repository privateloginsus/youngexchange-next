# YoungExchange — operazioni Admin

Questa versione aggiunge un modulo Admin per **richieste di deposito** (solo `pending`, senza accredito) e **rettifiche manuali interne** (accredito/addebito del wallet esistente, con motivazione, autore e registro). Il codice non certifica pagamenti esterni, non invia fondi, non esegue trading e non crea wallet mancanti.

## Prima di installare
1. Esegui un backup del database Supabase e del repository.
2. Verifica che `public.wallets` abbia `user_id`, `currency`, `balance`, `locked_balance` e che `public.is_youngexchange_admin()` sia una verifica server-side sicura. Se lo schema differisce, **non eseguire lo SQL**: adattalo prima.
3. Nel SQL Editor di Supabase, dopo revisione, esegui `supabase/ADMIN_OPERATIONS.sql`.
4. Pubblica i file statici sul ramo `main` e controlla il deploy.
5. Accedi con account Admin e prova un deposito *in attesa* e una rettifica con un account di prova; verifica saldo, audit e ripetizione della richiesta.

## Altre integrazioni
- Creazione utenti: deploy Edge Function `supabase/functions/admin-invite-user/index.ts`, con autorizzazioni e secrets configurati.
- Email `noreply@youngexchange.eu`: configurare e verificare il dominio in Resend, poi SMTP personalizzato e template in Supabase Auth. Le credenziali SMTP non vanno in GitHub.
- SMS: richiede provider SMS configurato su Supabase Auth, sessione valida e verifica OTP end-to-end.
- Depositi e prelievi esterni: richiedono riconciliazione bancaria/on-chain, antifrode, KYC/AML, controllo accessi e approvazioni separate. Non sono operativi con questo ZIP.
- Trading: richiede motore di esecuzione e ledger bilanciato. Non è operativo con questo ZIP.

**Non pubblicare il sito come exchange finanziario operativo senza audit di sicurezza, compliance e test reali.**
