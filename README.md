# UML4ALL

Un editor web per trasformare testo in diagrammi di rete, architetture logiche e flussi di lavoro. Anteprima automatica, gruppi annidati, errori con numero di riga, importazione e salvataggio `.ret`, esportazione SVG, zoom e guida integrata.

**Prototipo 0.1.** Sintassi propria ispirata all’esperienza di PlantUML; non compatibile con il linguaggio PlantUML e non implementa lo standard UML completo.

## Aprire l’editor

Apri `index.html` nel browser. Non occorrono installazioni o build. In alternativa, con Node.js: `npm start`, poi apri http://127.0.0.1:4173.

L’elaborazione avviene nel browser, senza richieste di rete, font esterni o dipendenze. Il sorgente viene salvato automaticamente nel localStorage del browser, quando consentito. Il salvataggio automatico conserva solo l’ultimo testo su quel browser e su quell’origine: scarica il file `.ret` per un archivio duraturo. Scegliere un esempio o aprire un file sostituisce il testo corrente.

## GitHub Pages

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
