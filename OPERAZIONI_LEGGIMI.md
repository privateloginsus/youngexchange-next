# YoungExchange — workspace operazioni

Questa versione sostituisce i messaggi generici di Deposita, Preleva, Trasferisci e Converti con moduli utilizzabili. Include il badge YoungExchange animato nell'angolo inferiore destro e conserva l'aggiornamento periodico dei mercati CoinGecko.

## Collegamenti necessari

1. Verificare la struttura del database e fare backup.
2. Installare `supabase/ADMIN_OPERATIONS.sql` dopo averlo adattato al database esistente.
3. Installare `supabase/CLIENT_OPERATIONS.sql` dopo verifica; richiede `public.wallets` con `user_id,currency,balance,locked_balance` e `public.ye_admin_transfers`.
4. Configurare Supabase Auth e Resend separatamente; nessuna chiave segreta va messa in `config.js`.
5. Testare in un progetto Supabase di staging con due conti di prova e saldi fittizi.

## Funzioni

- Deposita: crea richiesta interna, non accredita denaro.
- Preleva: crea richiesta con destinazione, non invia pagamenti.
- Trasferisci: trasferimento interno atomico tra wallet esistenti, solo con sessione valida e saldo sufficiente.
- Converti/Acquista/Vendi: crea richieste, non esegue conversioni né ordini reali. Il motore prezzi/esecuzione va collegato in seguito.
- Mercati: CoinGecko, aggiornamento indicativo ogni 60 secondi; non tick-by-tick.

Non si tratta di una release certificata per denaro reale. L'interfaccia e la sintassi JS sono controllate, ma le funzioni SQL devono essere testate sullo schema reale e con controlli di sicurezza prima della produzione.
