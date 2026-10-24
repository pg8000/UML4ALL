# Controllo cloud UML4ALL

Il workflow **UML4ALL cloud health** viene eseguito sui server GitHub ogni giorno alle 09:00 Europe/Rome, anche a PC spento. Può essere avviato da **Actions → UML4ALL cloud health → Run workflow**. L’orario può subire ritardi di GitHub; nei repository pubblici GitHub disattiva le pianificazioni dopo 60 giorni senza attività del repository.

Ogni esecuzione controlla il motore, la sicurezza, esempi e interazioni, guida, download, assenza caricamento file, worker e sito GitHub Pages. Chromium usa contesti di prova isolati, senza accedere ai salvataggi del computer dell’utente.

Desktop e mobile hanno screenshot completi e confronto pixel con l’ultima esecuzione riuscita. Il primo controllo crea i riferimenti iniziali; i successivi segnalano differenze oltre la tolleranza. I riferimenti sono conservati per 30 giorni e i rapporti per 14 giorni negli artifact del workflow. In caso di cambiamento grafico intenzionale, rivedi il rapporto e usa l’opzione **refresh_visual_baseline** per approvare il nuovo riferimento. Non aggiornare automaticamente i riferimenti quando un controllo fallisce.

I fallimenti sono visibili in Actions e nelle notifiche GitHub secondo le preferenze dell’account. La comparazione automatica delle immagini non equivale a una valutazione semantica AI di ogni screenshot.

## Correzioni AI

Questo workflow non chiama servizi AI a pagamento e non modifica automaticamente il codice. Per conservare anche la correzione autonoma del precedente controllo, occorre configurare separatamente un agente cloud con accesso ai rapporti, al repository e alle immagini; per l’integrazione `openai/codex-action` serve una chiave API OpenAI come secret GitHub. Non inserire chiavi nei file o nelle chat. L’abbonamento alla chat non configura automaticamente questa credenziale.
