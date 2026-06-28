# Restyling App Schedinone

Data: 2026-06-02

## Obiettivo

Migliorare la percezione dell'app senza cambiare logiche di gioco, dati Firestore, funzioni Cloud o regole. Il tono deve essere piu' curato e da torneo ufficiale, ma restare rapido da usare su telefono.

## Perimetro

- UI condivisa: sfondo, superfici, bottoni, campi, navigazione bassa.
- Schermate giocatore: login, home, schedina, classifica, messaggi.
- Componenti ripetuti: card partita e riga classifica.

## Fuori Perimetro

- Salvataggio schedine, invio finale, bozza, accettazione/rifiuto.
- Calendario, risultati, calcolo punti, regole Firestore.
- Funzioni Cloud e dati live, salvo test visuali in lettura.

## Direzione Visuale

Restyling premium leggero: dark sportivo, piu' contrasto, superfici meno piatte, gerarchie piu' leggibili, bottoni piu' chiari. Niente redesign aggressivo e niente layout marketing.

## Criteri Di Sicurezza

- Cambi solo JSX/CSS visuale.
- I testi operativi e i controlli critici restano riconoscibili.
- Ogni modifica passa da test, lint e build.
- Verifica browser su mobile e desktop prima del deploy.
