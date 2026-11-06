# YoungExchange PLATINUM — aggiornamento 1

Questa versione parte dal pacchetto Grafico Pro V3 e mantiene i file originali.

## Correzioni
- Risolte le funzioni JavaScript mancanti `adminErr`, `adminDate`, `adminRpc`, `adminOperationLabels`, `adminStatusLabels` che causavano `ReferenceError` e caricamenti infiniti.
- Nuovo design PLATINUM per navigazione e contenuto amministrativo, con ricerca ed esportazione utenti.
- Tentativo di caricamento OHLC BNB/EUR su Kraken, con errore esplicito se la coppia non è supportata.
- Migliore messaggio di errore e pulsante Riprova per le sezioni amministrative.
- Cache-busting del codice JS e foglio di stile Platinum dedicato.

## Importante: limiti verificati
- Non sono stati modificati schema SQL, permessi, saldi, RPC finanziarie o funzioni di pagamento.
- Le operazioni contabili esistenti rimangono subordinate ai controlli di Supabase e richiedono verifica in ambiente di prova.
- L'approvazione di swap NON esegue automaticamente il cambio. Non presentare l'approvazione come conversione contabilizzata.
- Non si garantisce un aggiornamento al secondo: dipende dalla disponibilità del feed e dai suoi limiti.
- Per testare: aprire Amministrazione > Utenti e conti; se la RPC non è disponibile verrà mostrato un errore anziché il caricamento infinito.
- Eseguire backup e test prima di pubblicare in produzione.
