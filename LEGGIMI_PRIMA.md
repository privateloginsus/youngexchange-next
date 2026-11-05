# YoungExchange — Pacchetto per test, NON exchange pronto alla produzione

## Funzioni implementate nel codice
- Provisioning account cliente via Edge Function `admin-invite-user` (nome storico), senza invito, email NON confermata. Admin autorizzato da token e `ADMIN_USER_IDS` lato server. L'utente deve richiedere il proprio OTP su `accesso-otp.html`.
- Supabase Auth OTP: `signInWithOtp({shouldCreateUser:false})`, `verifyOtp({type:'email'})`. Configurare il template **Magic Link** Supabase con `{{ .Token }}` e SMTP Resend verificato; altrimenti l'OTP potrebbe arrivare come link o non essere consegnato.
- Depositi: inserimento **richieste interne**, valuta, importo, riferimento, provenienza **dichiarata e non verificata**, data dichiarata. Non accredita automaticamente fondi esterni.
- Rettifiche saldo **interno** con motivo e audit, per email già confermate. Nessuna certificazione di provenienza esterna.
- Trasferimenti interni atomici tra wallet già esistenti, con idempotenza e storico non modificabile. Entrambi i conti richiedono email verificata.
- Prelievi: creazione e revisione di **richieste**, non invio di bonifici o crypto.
- Prezzi mercati CoinGecko aggiornati a intervalli (soggetti a rate limit), non tick-by-tick.

## Dipendenze che non possono essere collegate automaticamente
1. Fare backup del database; verificare `public.wallets(user_id,currency,balance,locked_balance)`, vincolo univoco su `(user_id,currency)`, `public.is_youngexchange_admin()`, `admin_list_users`, `admin_create_withdrawal` e altre RPC preesistenti. Il file SQL presuppone queste strutture; **NON eseguirlo alla cieca**.
2. Revisionare `supabase/ADMIN_OPERATIONS.sql` in staging; eseguire migrazione solo dopo revisione schema e permessi. Il SQL non è stato eseguito sul database reale.
3. Pubblicare Edge Function `supabase/functions/admin-invite-user/index.ts` con service role SOLO nei secret server; configurare `ADMIN_USER_IDS` lato server. Non inserire service role in GitHub Pages.
4. Supabase Auth: abilitare OTP email, template con `{{ .Token }}`, redirect URL del dominio, rate limit e protezioni abuso. SMTP Supabase via Resend, mittente `noreply@youngexchange.eu` SOLO dopo verifica dominio. Template forniti come esempi, non attivi automaticamente.
5. SMS: richiede provider abilitato e test reale. Non è certificato da questo pacchetto.
6. Fare test end-to-end con account di prova: provisioning, OTP, permessi, saldi, trasferimenti, errori, tentativi duplicati, RLS e audit.

## Limiti di sicurezza
- La data dichiarata non sostituisce il timestamp contabile `created_at`, generato dal server.
- Non alterare o cancellare transazioni contabilizzate; usare movimenti di rettifica con motivazione e audit.
- Non chiamare un conto 'certificato' solo perché è stato creato o perché l'email è confermata: email OTP non equivale a verifica identità/KYC.
- Non dichiarare depositi, prelievi o transazioni bancarie/blockchain eseguiti senza riscontri esterni verificabili.
- Prima dell'uso finanziario reale servono doppia approvazione, ledger a partita doppia, riconciliazione, sicurezza e conformità normativa.
