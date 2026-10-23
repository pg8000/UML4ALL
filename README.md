# UML4ALL

## [▶ Apri l’editor online e crea un diagramma](https://pg8000.github.io/UML4ALL/)

Funziona direttamente nel browser: non occorre installare nulla o avviare un server locale. Il repository GitHub contiene i file del progetto; l’applicazione interattiva è pubblicata su **GitHub Pages** al collegamento qui sopra.

Un editor web per trasformare testo in diagrammi di rete, architetture logiche e flussi di lavoro. Anteprima automatica, gruppi annidati, errori con numero di riga, importazione e salvataggio `.ret`, esportazione SVG, zoom e guida integrata.

**Prototipo 0.1.** Linguaggio testuale dedicato a reti, architetture e processi, con layout automatico di base.

## Guida all’uso

Apri [UML4ALL online](https://pg8000.github.io/UML4ALL/). Il pulsante **Guida all’uso**, in alto a destra, contiene istruzioni, esempi completi e suggerimenti per correggere gli errori.

1. Scegli uno schema dal menu **Parti da un esempio** oppure incolla il tuo codice nel pannello **Sorgente**.
2. Modifica il testo: con **Anteprima live** attiva il diagramma si aggiorna automaticamente. Per generarlo manualmente, disattiva l’anteprima live e premi **Genera** o **Ctrl+Invio** (**Cmd+Invio** su Mac).
3. Usa **+**, **−** e **⤢** per ingrandire, ridurre e adattare il diagramma al riquadro.
4. Premi **Salva codice** per scaricare il progetto modificabile in formato `.ret`. **Apri codice** riapre i file `.ret` o `.txt`. Con il cursore nell’editor puoi salvare anche con **Ctrl+S** o **Cmd+S**.
5. Premi **Esporta SVG** per scaricare un’immagine vettoriale del diagramma. Il codice deve essere valido e l’anteprima aggiornata.

Il salvataggio automatico conserva solo l’ultimo testo nel browser corrente. Scegliere un esempio o aprire un file sostituisce il testo: usa **Salva codice** per conservare ciascun progetto.

Se il codice contiene un errore, il messaggio sotto l’editor indica la riga interessata. Controlla gli identificatori dei collegamenti, eventuali nomi duplicati, le virgolette e le parentesi di chiusura. Durante la correzione l’anteprima mantiene l’ultima versione valida, se disponibile.

## Utilizzo online

Per creare diagrammi, apri **[UML4ALL su GitHub Pages](https://pg8000.github.io/UML4ALL/)** e scrivi o incolla il codice nel pannello Sorgente. La visualizzazione di `index.html` all’interno del repository mostra il codice della pagina; per usare l’editor, segui il collegamento al sito pubblicato.

L’elaborazione avviene nel browser, senza richieste di rete, font esterni o dipendenze. Il sorgente viene salvato automaticamente nel localStorage del browser, quando consentito. Il salvataggio automatico conserva solo l’ultimo testo su quel browser e su quell’origine: scarica il file `.ret` per un archivio duraturo. Scegliere un esempio o aprire un file sostituisce il testo corrente.

## Pubblicare una propria copia su GitHub Pages

L’editor di questo repository è già disponibile [online](https://pg8000.github.io/UML4ALL/). Le istruzioni seguenti servono solo a pubblicare una propria copia.

1. Crea un repository GitHub e carica il contenuto di questa cartella nella sua radice.
2. Nelle impostazioni del repository, apri **Pages**.
3. Seleziona la pubblicazione da un branch, poi il branch che contiene i file e la cartella **/ (root)**. Salva.
4. Attendi il completamento della pubblicazione; l’indirizzo viene mostrato da GitHub nella sezione Pages.

Il sito usa percorsi relativi e funziona anche sotto il percorso di un repository. Non richiede Actions, chiavi, server applicativi o servizi esterni. La disponibilità di Pages dipende dal piano e dalla visibilità del repository.

## Sintassi

```text
diagram "Rete ufficio" {
  direction right
  cloud internet "Internet"
  zone "Sede" {
    firewall fw "Firewall"
    server app "Applicazione" {
      ip = "10.0.0.10"
      color = "#dbeafe"
    }
    database db "Database"
  }
  internet -> fw : HTTPS
  fw -> app
  app -> db : SQL
}
```

Una istruzione per riga. `diagram "Titolo" {` apre il diagramma. Ogni blocco termina con `}` su una propria riga. I riferimenti possono precedere le dichiarazioni, ma tutti gli elementi collegati devono essere dichiarati. Gli identificatori sono unici nell’intero diagramma e rispettano `[A-Za-z_][A-Za-z0-9_-]*`. Le etichette sono facoltative per gli elementi e obbligatorie per i gruppi e per il diagramma.

Tipi: `cloud`, `router`, `firewall`, `switch`, `network`, `server`, `database`, `service`, `actor`, `task`, `decision`, `start`, `end`, `node`.

Gruppi annidabili: `zone "Titolo" {` e `group "Titolo" {`. Non sono estremi di collegamenti: collega gli elementi contenuti. Direzione globale: `direction right` o `direction down`.

Collegamenti: `a -> b`, `a <-> b`, `a -- b`, `a --> b` (tratteggiato). Sequenze: `a -> b -> c`. Testo opzionale dopo `:`; in una sequenza la stessa etichetta si applica a ciascun collegamento. Per etichette con caratteri speciali, usa le virgolette.

Proprietà dentro un elemento: `ip`, `subnet`, `vlan`, `protocol`, `owner`, `note` e `color`. Valori tra virgolette; colore nel formato `"#aabbcc"`. Le proprietà sono descrittive: non viene verificata la correttezza degli indirizzi o della configurazione di rete. I gruppi contengono elementi e altri gruppi; non hanno proprietà. Stringhe con escape JSON (`\n`, `\"`, `\\`). Commenti da `#` o `//` fuori dalle stringhe fino a fine riga.

## Limiti e sviluppo

Limite di 100.000 caratteri, 250 elementi, 500 collegamenti e 12 livelli di gruppi. Layout gerarchico deterministico con gestione dei cicli; il motore non garantisce l’assenza di incroci o sovrapposizioni di etichette nei grafi densi. Forme stilizzate per tipo, non simboli di rete certificati. Non include diagrammi di sequenza/classi, posizionamento manuale o collaborazione multiutente.

`engine.js` contiene parser, disposizione e generazione SVG; `app.js` le interazioni; `examples.js` gli esempi. Nessuna dipendenza da installare. Per verificare il motore: `npm test` oppure `node --test tests/engine.test.cjs`.


<details>
<summary>Per sviluppatori: esecuzione locale facoltativa</summary>

Scarica il progetto e apri `index.html` nel browser. Se preferisci un server di sviluppo e hai Node.js, esegui `npm start` e apri `http://127.0.0.1:4173`. Questo indirizzo funziona solo sul computer su cui avvii il server; per l’uso online utilizza il collegamento GitHub Pages in cima alla pagina.

</details>
