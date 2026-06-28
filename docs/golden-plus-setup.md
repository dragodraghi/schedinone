# Golden Plus Setup

Procedura manuale per creare il gioco `schedinone-golden-plus-2026`.

## Seed

Dry-run, senza scritture:

```bash
node scripts/seed-golden-plus-2026.mjs
```

Scrittura Firestore:

```bash
node scripts/seed-golden-plus-2026.mjs --apply
```

Lo script copia gli admin dal gioco classico, crea il game Golden Plus e crea 31 match con metadata da tabellone. Se il gioco Golden esiste gia', lo script si ferma senza sovrascrivere.

La finestra inviti si chiude con `accessClosesAt`, impostato dal seed a un'ora prima della prima partita dei sedicesimi.

## Campi gioco

I campi `mode`, `predictionMode`, `specialPicksEnabled` e `sourceGameId` sono impostati dal seed e non sono modificabili dal client tramite rules.

## Apertura operativa

Prima dell'apertura, aggiornare i 16 sedicesimi con le squadre reali. I match futuri possono restare con `Vincente ...`: l'app li popola automaticamente quando il giocatore sceglie le qualificate.
