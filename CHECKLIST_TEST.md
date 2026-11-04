# Checklist verifica prima di dichiarare il sito operativo

- [ ] Deploy GitHub Pages verde sul ramo selezionato
- [ ] `https://youngexchange.eu/app.js` raggiungibile (HTTP 200)
- [ ] Login/logout e registrazione Supabase testati
- [ ] Recupero password: email consegnata da Resend, link al dominio corretto, nuova password salvata, nuovo login riuscito
- [ ] SMS: sessione valida, invio OTP provider, verifica OTP e stato aggiornato
- [ ] Ogni sezione Admin testata con account autorizzato, RPC e RLS corretti
- [ ] Wallet e ledger confrontati con database; nessuna operazione esterna dichiarata completata senza riconciliazione
- [ ] Crisp caricato e messaggi ricevuti
- [ ] Controlli legali, KYC/AML, custody e infrastruttura di pagamento prima di operazioni finanziarie reali
