# Email di certificazione del primo accesso

Il file [invite-user.html](invite-user.html) è il template YoungExchange per le email **Invite user** di Supabase Auth.

## Installazione nel progetto Production

1. Aprire Supabase Dashboard → Authentication → Email Templates → **Invite user** nel progetto `vviyfrlvikokmcwhmhys`.
2. Incollare l'intero contenuto di `invite-user.html` nel corpo HTML del template, quindi salvare.
3. Configurare Authentication → URL Configuration: aggiungere `https://youngexchange.eu/reimposta-password.html` tra gli URL di redirect autorizzati. Impostare la Site URL del sito secondo la configurazione corrente.
4. Effettuare un invito a un indirizzo di prova controllato dall'amministratore e verificare: email con il pulsante «Certifica primo accesso», apertura della pagina di attivazione, impostazione password, login e verifica telefonica.
5. Controllare che l'account di prova non visualizzi il menu «Amministrazione». Un admin reale è autorizzato esclusivamente tramite la funzione database `is_youngexchange_admin()`.

**Nota:** il deploy della Edge Function non aggiorna automaticamente i template di Supabase Auth. Il template HTML presente nel repository non risulta attivo finché non viene installato nel Dashboard.

Non modificare saldi, registrazioni contabili o operazioni finanziarie durante il collaudo.
