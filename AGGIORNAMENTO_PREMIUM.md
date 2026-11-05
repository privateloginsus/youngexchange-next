# YoungExchange — Aggiornamento Premium

Contenuto: copia completa del repository fornito, con modifiche esclusivamente a interfaccia e grafici.

- Sezione Trading rimossa dalla navigazione e dal router. Il grafico di ogni asset è accessibile da Mercati.
- Grafici a candele interattivi in Panoramica e Mercati: intervalli 5m/15m/1H/4H/1G, zoom con rotellina o pulsanti, trascinamento orizzontale, tooltip OHLC/volume, MA20 attivabile, LIVE e schermo intero.
- Dati OHLC richiesti a Kraken. Se non disponibili, viene visualizzato un errore, non vengono create candele artificiali. Lo storico disponibile è limitato dalla risposta Kraken.
- Sidebar e schede in stile verde premium, logo con anello animato (animazione disattivata quando il sistema richiede movimento ridotto).
- Etichetta sidebar «Un modo sicuro di investire» (testo grafico, non garanzia di rendimento o assenza di rischi).
- Footer «Quotazioni in tempo reale» solo quando esiste un aggiornamento recente del feed, altrimenti «Quotazioni in aggiornamento».

## Pubblicazione

Scompattare lo ZIP, caricare i file nella radice del branch `main` del repository. Mantenere config.js con le proprie impostazioni già presenti; non sostituire configurazioni personalizzate senza confronto. Attendere workflow verde e fare Ctrl+Shift+R.

## Limiti

Nessuna funzionalità di scambio, deposito, prelievo o trading è stata abilitata o modificata. Le quotazioni non sono prezzi di esecuzione garantiti. Testare login, permessi admin, mobile, richieste e prezzi prima dell'uso in produzione.
