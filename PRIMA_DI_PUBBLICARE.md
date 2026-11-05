# YoungExchange — pacchetto integrato (5 novembre 2026)

## Cosa include davvero
- Sito pubblico con pagine Panoramica, Mercati, Trading, Portafoglio, Attività, Sicurezza, Assistenza e Admin.
- Supabase Auth: accesso, registrazione, richiesta recupero password e interfaccia per nuova password sul link di recupero.
- Verifica telefono tramite `updateUser({phone})` e `verifyOtp(..., type:'phone_change')` di Supabase Auth, da usare con provider SMS configurato.
- Admin: otto sezioni, invito nuovo cliente (Edge Function `admin-invite-user`), lettura utenti, wallet, richieste, ricerca ed esportazione CSV per depositi e storico, creazione richiesta di prelievo tramite RPC già prevista.
- Template email di recupero da incollare in Supabase Auth; mittente noreply configurato nel servizio SMTP Resend, NON nel JavaScript.
- Chat Crisp tramite ID in config.js.

## Limiti importanti: non confondere codice e servizio attivo
- Le sezioni Trading, Acquisto, Vendita, Swap, Depositi esterni e Trasferimenti non hanno un backend di esecuzione reale in questo archivio. Le relative azioni NON eseguono denaro o crypto.
- Le RPC amministrative usate dal frontend (`admin_list_users`, `admin_list_wallets`, `admin_list_all_operations`, `admin_create_withdrawal`, `review_youngexchange_withdrawal`) devono esistere nel progetto Supabase, con privilegi/RLS corretti; non sono contenute nello ZIP originale e non sono state verificate.
- La creazione account richiede deploy dell'Edge Function, segreto `ADMIN_USER_IDS`, autorizzazione JWT e configurazione SMTP. Non è testata end-to-end.
- La configurazione SMTP Resend, la verifica del dominio `youngexchange.eu` e il mittente `noreply@youngexchange.eu` non sono modificabili dal frontend. Verificare in Supabase Authentication > SMTP.
- SMS: provider SMS attivo in Supabase, template e test con numero reale.
- Non esporre SERVICE_ROLE_KEY o password SMTP su GitHub Pages.
- Non contrassegnare depositi/prelievi esterni come completati senza verifica di pagamento e riconciliazione.

## Ordine di installazione
1. Backup repository e database, non cancellare i branch.
2. Pubblicare i file web su `main` solo dopo aver esaminato il diff.
3. Deploy `supabase/functions/admin-invite-user/index.ts` su Supabase Edge Functions; configurare `ADMIN_USER_IDS` lato server.
4. Configurare in Supabase Authentication: Site URL e redirect a `https://youngexchange.eu/`, SMTP Resend e template `EMAIL_TEMPLATE_RECOVERY.html`.
5. Verificare RPC amministrative e permessi; testare account di prova, recupero password, invito, SMS e le otto sezioni.
6. Le operazioni finanziarie esterne richiedono un progetto backend separato con integrazioni autorizzate, controlli e test.

## Verifiche automatiche effettuate
- `node --check app.js`: sintassi JavaScript valida.
- Integrità ZIP: testata dopo la creazione.
- Nessun test di invio email/SMS o scrittura su Supabase è stato effettuato.
