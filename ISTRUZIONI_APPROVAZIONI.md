# YoungExchange — approvazioni amministrative

La sezione Admin > Prelievi consente all’amministratore di creare richieste e approvarle/rifiutarle tramite la RPC Supabase `review_youngexchange_withdrawal` gia richiamata dal frontend. Sono stati aggiunti contatori e un testo di stato esplicito.

**Importante**: l’approvazione non prova un bonifico o un trasferimento blockchain. Il cliente deve vedere `Approvato` e non `Completato` finche non esiste prova di esecuzione. Non trasformare l’approvazione in accredito o pagamento simulato.

**Prima di pubblicare**: verificare schema SQL e RPC nel proprio Supabase, fare backup, testare con account di prova, controllare RLS e stati lato cliente. Il frontend da solo non installa le RPC.

**Email**: Resend e mittente noreply vanno verificati nella configurazione SMTP Supabase; questo ZIP non certifica la consegna email.

**Caricamento**: estrarre lo ZIP e caricare i file del sito nel ramo pubblicato solo dopo test su ambiente di prova. Non caricare il file ZIP direttamente su GitHub Pages.
