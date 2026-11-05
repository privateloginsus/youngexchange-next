# Deposito interno YoungExchange

Questo pacchetto aggiunge **Deposito interno sul conto** al menu Admin. L’amministratore seleziona un utente esistente, valuta, importo, provenienza dichiarata, data/ora dichiarate, riferimento e motivazione. La funzione `ye_admin_create_entry` registra un evento `internal_deposit` con stato `posted` e aumenta atomicamente il wallet interno. La pagina Attività del cliente legge i propri depositi tramite `ye_my_internal_deposits`.

## Prima di usare
1. Backup del database Supabase e verifica delle colonne di `public.wallets`, dei privilegi `is_youngexchange_admin()` e dell'unicità wallet (utente, valuta).
2. Esegui **dopo revisione** `supabase/ADMIN_OPERATIONS.sql` in SQL Editor. Le funzioni non si installano caricando file su GitHub.
3. Pubblica i file web su `main` (root), mantenendo il `config.js` valido.
4. Prova con un account di test verificato e un wallet esistente, poi controlla saldo, registro Admin e pagina Attività cliente.

**Significato del movimento:** deposito contabilizzato **internamente** su YoungExchange; non è prova di bonifico o blockchain ricevuti. Il riferimento e la provenienza sono dati dichiarati dall'amministratore. La data/ora dichiarata non sostituisce la data effettiva di registrazione. Non usare questo codice per rappresentare pagamenti esterni come avvenuti.

Non testato contro il database di produzione. Nessuna chiave segreta deve essere inserita in GitHub Pages.
