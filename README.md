# YoungExchange — versione unificata di recupero

Base: ZIP admin-completo ricevuto dall’utente. `app.js` sostituito con la versione amministrativa estesa di `main`, con correzioni del flusso di recupero password e controllo sessione prima dell’SMS. Nessun dato o configurazione Supabase è stato cancellato.

## Cosa contiene
- Supabase Auth: registrazione, login, invio link recupero, schermata nuova password. Da verificare con email reale.
- Verifica telefono: richiesta e conferma OTP con Supabase Auth; necessita provider SMS attivo e sessione valida.
- Pannello Admin: otto viste, alcune in lettura e alcune con operazioni condizionate a RPC Supabase. Se una RPC manca viene mostrato un errore reale, non una finta operazione.
- Portafogli, attività e prezzi: collegamenti presenti; dipendono dalle tabelle/RLS e dall’API CoinGecko.
- Crisp: iframe di assistenza.

## Non incluso / non verificato
Non sono disponibili in questo ZIP schema SQL, migrazioni, Edge Functions, configurazioni private Supabase, credenziali Resend o Twilio, né test con account reali. NON si può dichiarare tutto operativo end-to-end. Depositi/prelievi esterni, ordini e swap reali non sono implementati né attestati. Non approvare movimenti come eseguiti senza conferma esterna e riconciliazione.

## Pubblicazione sicura
1. Fare backup del repository e dell'attuale configurazione Pages.
2. Usare un solo ramo di pubblicazione (consigliato `main`), senza cancellare l'altro finché non è verificato.
3. Caricare i file nella root del ramo scelto; configurare Pages per quel ramo e `/(root)`.
4. Controllare Actions (deploy verde), aprire /app.js, testare login, recovery, OTP e ogni sezione Admin.
5. In Supabase Authentication > URL Configuration impostare Site URL `https://youngexchange.eu/` e Redirect URLs `https://youngexchange.eu/**` (includere altri domini solo se utilizzati).
6. Non caricare chiavi segrete o SMTP password in `config.js` o GitHub Pages.

## Resend e mittente noreply
Il sito pubblico NON invia direttamente via Resend: è Supabase Auth che invia tramite SMTP Resend. In Supabase Authentication > SMTP configurare host/porta/utente/password SMTP ottenuti da Resend, sender `YoungExchange <noreply@youngexchange.eu>` SOLO se il dominio è verificato e l'indirizzo è autorizzato dal provider. Il mittente e la password SMTP non sono verificabili da questi file. Configurare i template Auth nel pannello Supabase usando `{{ .ConfirmationURL }}` e il file `EMAIL_TEMPLATE_RECOVERY.html` come base. Testare con un account dedicato.
