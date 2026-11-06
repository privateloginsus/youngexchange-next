# YoungExchange PLATINUM II — pacchetto aggiornato

## Cosa è cambiato
- Corretto il collegamento dei pulsanti dei grafici (1m, 5m, 15m, 30m, 1H, 4H, 1G, MA20, mirino, zoom, LIVE, schermo intero): il pannello controlli è ora cercato nella card corretta.
- Evitata una condizione di concorrenza: una risposta OHLC di un intervallo precedente non può sovrascrivere la selezione più recente.
- Pulsante LIVE richiede un aggiornamento del feed OHLC disponibile. Non genera candele artificiali.
- Nuovo livello estetico PLATINUM II: fondo più scuro, riflessi verdi, pannelli e pulsanti più curati, migliore focus da tastiera e rispetto delle preferenze di movimento ridotto.
- Versionamento degli asset aggiornato per evitare che il browser utilizzi file JS/CSS in cache.

## Installazione
Carica **il contenuto** della cartella `youngexchange-next-main` nella root del repository GitHub Pages, sostituendo i file omonimi. Conserva la configurazione Supabase e il dominio esistenti. Esegui un refresh forzato dopo la pubblicazione.

## Limiti e prossimi collegamenti
Questa è una revisione del frontend esistente, non una verifica di funzionamento live end-to-end. I dati OHLC dipendono da Kraken e dalla disponibilità delle coppie e della rete; un intervallo può risultare non disponibile. L'indicazione LIVE non significa aggiornamento garantito ogni secondo. Non sono state modificate le funzioni SQL, i saldi o le autorizzazioni. **Approvare uno swap non ne contabilizza automaticamente la conversione**: richiede una RPC transazionale separata, auditata e testata. Le funzioni amministrative richiedono le RPC e i permessi Supabase già previsti dal progetto.
