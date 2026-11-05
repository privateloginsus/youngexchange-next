# Prima funzionalità gestionale: creazione account cliente

Il pulsante **Crea account e invia invito** è collegato alla Edge Function `admin-invite-user`. Non funziona finché la funzione non è distribuita in Supabase.

1. In Supabase Edge Functions distribuire `supabase/functions/admin-invite-user/index.ts` (CLI: `supabase functions deploy admin-invite-user`).
2. Impostare il secret `ADMIN_USER_IDS` con l’UUID Supabase Auth del proprio amministratore, o una lista di UUID separati da virgola. **Non usare email come autorizzazione.** La funzione verifica il token e rifiuta gli altri utenti.
3. Verificare che i secret server `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` siano disponibili nel runtime Edge Functions. Non inserirli nel sito o su GitHub.
4. Configurare in Supabase Auth il server SMTP Resend con mittente `YoungExchange <noreply@youngexchange.eu>` solo se il dominio è verificato. Personalizzare il template **Invite user** (non solo Recovery).
5. Configurare `https://youngexchange.eu/` tra i Redirect URLs di Supabase Auth.
6. Testare con un indirizzo email dedicato e controllare Auth Users, recapito email e impostazione password.

Il telefono viene salvato come `contact_phone` nei metadati dell'utente invitato, **non** come numero verificato. La verifica SMS è un flusso separato e richiede provider SMS configurato.

Questa versione non aggiunge modifiche finanziarie: non crea accrediti o esecuzioni esterne e non garantisce operatività delle altre sette sezioni. Per renderle scrivibili occorre verificare schema/RPC/RLS Supabase e progettare le transazioni lato server.
