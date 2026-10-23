# Sicurezza di UML4ALL

## Perimetro

UML4ALL è un sito statico. Il testo dei diagrammi viene elaborato nel browser del visitatore: non viene pubblicato nel repository e non esistono un archivio condiviso, un endpoint di caricamento o un interprete JavaScript per il testo inserito. Il caricamento di file è disabilitato; si può solo scrivere o incollare il linguaggio dei diagrammi. I download `.ret` e SVG restano disponibili.

## Protezioni implementate

- Parser con tipi, proprietà e identificatori consentiti; nessun `eval`, template HTML o codice eseguibile derivato dal testo.
- Escape dei caratteri XML in titoli, etichette, proprietà e descrizioni dei collegamenti; colori limitati a `#rrggbb`.
- Validazione separata dell’SVG prima della visualizzazione e dell’esportazione: solo forme e attributi previsti, nessun evento, script, HTML, collegamento o risorsa esterna, DTD o istruzione XML. Limite di 2 MB e 20.000 elementi SVG.
- Anteprima come immagine SVG tramite Blob, senza inserimento del disegno come HTML attivo nella pagina.
- Content Security Policy in testa all’HTML: script e stili della stessa origine, immagini locali/Blob, worker della stessa origine, richieste di connessione bloccate, oggetti incorporati, form e base URL disabilitati. Nessun permesso `unsafe-inline` o `unsafe-eval`. Referrer disabilitato.
- Limiti applicati durante il parsing: 100.000 caratteri, 5.000 righe, 4.096 caratteri per riga, 250 elementi, 500 collegamenti, 100 gruppi, 12 livelli di gruppi, 64 caratteri per identificatore, 300 per etichetta/titolo e 500 per proprietà. Caratteri di controllo incompatibili con XML rifiutati.
- Sul sito HTTP/HTTPS, rendering in un Web Worker dedicato, interrotto dopo 3 secondi; una nuova modifica annulla il calcolo precedente. I risultati obsoleti non possono sostituire un diagramma più recente.
- Sorgenti troppo grandi rifiutati prima della generazione e del salvataggio automatico. Le impostazioni interne delle proprietà usano oggetti senza prototipo.

## Limiti della protezione

GitHub Pages non permette di impostare tutti gli header HTTP personalizzati. La CSP è una direttiva `meta`: non può imporre `frame-ancestors`, HSTS o `X-Content-Type-Options`, né governa altre pagine della stessa origine. Una CSP non sostituisce i controlli sul renderer. I worker serviti come file hanno il proprio contesto di sicurezza: il loro codice carica soltanto il motore statico locale e non interpreta script utente.

Aprendo direttamente `index.html` come file locale, i browser possono limitare worker e CSP; viene utilizzato il renderer sincrono con gli stessi limiti di input e di SVG, senza timeout del worker. Per avere l’interruzione temporizzata usare il sito GitHub Pages o il server locale.

Queste difese riguardano gli input dei visitatori, non la compromissione dell’account GitHub o modifiche autorizzate al repository. La gestione degli accessi, l’autenticazione a più fattori e le regole dei branch rimangono responsabilità del proprietario. I test non costituiscono una garanzia di assenza di vulnerabilità.

## Segnalazioni

Per un difetto riproducibile, contatta privatamente il proprietario del repository. Includi browser/versione, passaggi e un esempio minimo privo di dati riservati. Evita di pubblicare dettagli di vulnerabilità attive o credenziali nelle issue pubbliche.
