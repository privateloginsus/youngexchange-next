# YoungExchange Premium Pro Live — Assistenza e Mercati

- Assistenza ridisegnata in stile smeraldo, con FAQ espandibili e pulsanti che aprono la chat Crisp già configurata. Nessuna conversazione simulata e nessun iframe bianco.
- La finestra reale di Crisp è gestita dal servizio esterno; la sua interfaccia interna non può essere completamente personalizzata via CSS del sito.
- Mercati: eliminati i riferimenti al fornitore dalla descrizione visibile. Il feed Kraken WebSocket esistente invia prezzi quando ci sono scambi/aggiornamenti; l'interfaccia controlla gli aggiornamenti ogni 1 secondo. Non è garantito un nuovo prezzo ogni secondo. CoinGecko resta il fallback tecnico per informazioni di mercato.
- NON sono state modificate le operazioni finanziarie, il backend, lo swap o il database.
- Caricare i contenuti della cartella youngexchange-next-main nella radice del ramo main, senza annidare la cartella.
- Verificare in browser login, Mercati e Assistenza; la chat richiede accesso ai domini di Crisp.
