# YoungExchange Next — prima versione

Sito statico per GitHub Pages con Supabase Auth, lettura wallet da Supabase, prezzi CoinGecko, grafici, interfaccia responsive e Crisp integrato.

## Pubblicazione
1. Apri `config.js` e sostituisci `PASTE_YOUR_SB_PUBLISHABLE_KEY_HERE` con la **Publishable Key** (`sb_publishable_...`) del progetto Supabase `youngexchange-next`.
2. Non inserire mai nel sito o nel repository chiavi Supabase `secret` / `service_role`, password del database, Twilio Auth Token o altri segreti.
3. Carica **i file contenuti in questa cartella** nella radice del repository `privateloginsus/youngexchange-next` (non la cartella contenitore).
4. GitHub → repository → Settings → Pages → Deploy from a branch → `main` → `/(root)` → Save.
5. Apri `https://privateloginsus.github.io/youngexchange-next/` dopo la pubblicazione.
6. In Supabase Authentication → URL Configuration: Site URL `https://privateloginsus.github.io/youngexchange-next/`, Redirect URLs `https://privateloginsus.github.io/youngexchange-next/**`.

## Cosa funziona
- Registrazione, conferma email e login email/password via Supabase Auth (se email e SMTP sono configurati e i limiti del provider consentono la consegna).
- Recupero password via email e aggiornamento della password tramite il link Supabase; da verificare con un test end-to-end prima del lancio.
- Profili e wallet creati dal trigger Supabase già installato, visualizzazione dei saldi in sola lettura.
- Prezzi reali da CoinGecko API, aggiornamento periodico; possono verificarsi rate limit, indisponibilità e ritardi.
- Grafici basati sulla sparkline CoinGecko quando disponibile.
- Lettura richieste e registro movimenti già presenti in Supabase.
- Chat Crisp integrata nella pagina Assistenza tramite iframe.

## Cosa NON è ancora operativo
- Registrazione/associazione/verifica del numero via Twilio nell'interfaccia (il provider è configurato, ma il flusso UI e la verifica effettiva restano da realizzare).
- Depositi, prelievi, trasferimenti, acquisti, vendite e swap: pulsanti interattivi informativi, **non** modificano saldi né inviano denaro.
- Order book e trading reale: non vengono simulati con dati inventati.
- Verifica end-to-end della password recovery, KYC/AML, autorizzazioni regolamentari, infrastruttura di custodia e pagamenti.

## Sicurezza e note tecniche
- Le tabelle Supabase hanno RLS di sola lettura per i proprietari, come impostato nei passaggi precedenti. Verifica sempre le policy prima del rilascio.
- Il trigger di creazione wallet agisce sui **nuovi** utenti; gli utenti creati prima del trigger non vengono retroattivamente popolati.
- La tabella `profiles` non ha ancora una policy di update: il nome visualizzato passato alla registrazione in `user_metadata` non viene sincronizzato automaticamente al profilo.
- Per un prodotto finanziario reale sono necessari un ledger a partita doppia, operazioni atomiche, idempotenza, audit, verifiche di identità, controllo antifrode e revisione legale.
- Il sito usa libreria Supabase UMD e font esterni via CDN: è necessaria connessione Internet.
