# YoungExchange Premium Pro Live

Aggiornamento di interfaccia basato sul pacchetto Immersive V3 presente nella conversazione.

- Sfondo unico animato su tutta la app, sidebar e contenuto; onde vettoriali SVG locali.
- Tipografia Manrope + DM Sans, senza emoji mano vicino a Bentornato.
- Canvas grafico: dimensioni aggiornate solo quando cambiano e redraw pointer limitato con requestAnimationFrame.
- Non cambiano configurazioni Supabase, logica di wallet, autenticazione o approvazioni.
- Il grafico usa i dati disponibili dai servizi configurati; non garantisce aggiornamento di ogni candela al secondo.
- La contabilizzazione atomica dello swap resta da implementare e verificare. Non testare con fondi reali.

Pubblicazione: estrarre la cartella youngexchange-next-main e caricarne i contenuti nella root del repository, preservando CNAME e config.js.
Test: verificare GitHub Actions, ricaricare con Ctrl+Shift+R, controllare grafico, navigazione, accesso e console browser.
