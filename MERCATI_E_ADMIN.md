# YoungExchange — Mercati e amministrazione

## Mercati
Le quotazioni vengono richieste a CoinGecko circa ogni 60 secondi (non streaming tick-by-tick). La variazione 24h e il colore verde/rosso cambiano **solo quando il dato esterno cambia**. Non vengono generate variazioni artificiali. CoinGecko può applicare limiti di frequenza e restituire dati ritardati. In caso di errore, viene mostrata la mancata disponibilità di aggiornamenti.

## Admin
Il progetto include: invito clienti, richieste di deposito, rettifiche contabili interne, richieste di prelievo, consultazione di transazioni e storico. Sono necessarie la Edge Function `supabase/functions/admin-invite-user/index.ts` e le RPC SQL presenti in `supabase/ADMIN_OPERATIONS.sql` e quelle preesistenti del progetto.

Non sono operazioni finanziarie esterne: bonifici, movimenti blockchain e compravendita effettiva richiedono provider, ledger bilanciato, verifiche e riconciliazione. Non attribuire a un conto stato certificato senza una procedura di verifica documentale reale.

## Pubblicazione
1. Backup GitHub e database. 2. Confronta SQL con schema Supabase prima di eseguirlo. 3. Configura Edge Function e autorizzazioni. 4. Carica i file web sul ramo di Pages. 5. Verifica ogni funzione con un account di prova.

Resend SMTP e provider SMS vanno configurati nelle dashboard Supabase/fornitore. Non mettere segreti in `config.js`.
