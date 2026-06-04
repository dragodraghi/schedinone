# Modalita Admin Giocatore - Design

Data: 2026-06-04

## Obiettivo

Permettere agli account Comitato che partecipano anche allo Schedinone di usare un solo login email/password e avere dentro l'app sia l'area admin sia la propria esperienza giocatore.

Gli admin interessati sono:

- `alberto@schedinone.local` per la squadra `Italia`;
- `luca@schedinone.local` per la squadra `THE FLOWERS`;
- `aldo@schedinone.local` per la squadra `7 e Muzzo`.

## Stato Attuale

Il login giocatore usa Firebase Auth anonimo e crea/legge la schedina su `games/{gameId}/players/{anonymousUid}`.

Il login Comitato usa email/password. Quando l'utente e' un admin, l'app entra in sessione admin, nasconde la tab `Schedina` e reindirizza `/schedina` verso `/admin`.

La Cloud Function `saveSchedule` oggi permette il salvataggio solo a utenti anonimi e rifiuta esplicitamente gli UID admin. Quindi una modifica solo UI non basta.

Le tre squadre esistono gia' come giocatori:

- `Italia`: player UID `laeuwmjVvHQXj9t46sgu6cHSOMi1`;
- `THE FLOWERS`: player UID `jRBFUJgd3nS1VjwN5EvorHHZuLl1`;
- `7 e Muzzo`: player UID `6p8fgzLdcwZpqHcssknyMnKj8xC3`.

Gli admin UID confermati sono:

- `alberto@schedinone.local`: `ApreKms36HXTq5Yo1QC3fOv9sgx1`;
- `luca@schedinone.local`: `rAeZJ20eGDXEGkF1u0bQfPXC8mE3`;
- `aldo@schedinone.local`: `TWantH4JYGenc8qDT6TnV4FaynZ2`.

## Modello Dati

Aggiungere al documento `games/schedinone-2026` una mappa:

```ts
adminPlayerUids: {
  ApreKms36HXTq5Yo1QC3fOv9sgx1: "laeuwmjVvHQXj9t46sgu6cHSOMi1",
  rAeZJ20eGDXEGkF1u0bQfPXC8mE3: "jRBFUJgd3nS1VjwN5EvorHHZuLl1",
  TWantH4JYGenc8qDT6TnV4FaynZ2: "6p8fgzLdcwZpqHcssknyMnKj8xC3",
}
```

La mappa collega l'identita admin all'identita giocatore esistente. Non vengono migrati o cancellati i documenti player anonimi gia' presenti.

## Frontend

`Game` include un nuovo campo opzionale `adminPlayerUids`.

`App` calcola:

- `isGameAdmin`: l'UID autenticato e' in `game.admins`;
- `adminPlayerUid`: valore di `game.adminPlayerUids[user.uid]`, se presente;
- `effectivePlayerUid`: `adminPlayerUid` per admin mappati, altrimenti `user.uid`.

`useCurrentPlayer` legge `effectivePlayerUid`, cosi' un admin mappato vede la propria squadra come player corrente senza secondo login.

La navigazione in modalita admin mostra anche la sezione `Schedina`, oltre alle sezioni admin. La rotta `/schedina` non reindirizza piu' gli admin mappati verso `/admin`; mostra `SchedinaPage` con il player collegato.

Gli admin non mappati continuano a non avere una schedina personale e restano nel solo flusso admin.

## Backend

`saveSchedule` continua a essere restrittiva:

- gli utenti anonimi possono salvare solo `players/{uid}`, come oggi;
- gli admin email/password possono salvare solo se `game.adminPlayerUids[adminUid]` esiste;
- in quel caso la function salva su `players/{mappedPlayerUid}`;
- un admin non mappato riceve `permission-denied`;
- un admin mappato non puo' scegliere o modificare l'UID target dal client.

La validazione su fase, blocco partite, schedina incompleta e stato `bozza/rifiutata` resta invariata.

## Esclusioni

La chat `Messaggi al Comitato` non viene trasformata in una chat giocatore per gli admin. Gli admin continueranno a usare la messaggistica Comitato esistente.

Non viene modificato il sistema di login giocatore anonimo per gli altri partecipanti.

Non vengono migrate le schedine esistenti.

## Test

Test frontend:

- `Layout` mostra la tab `Schedina` quando l'utente e' admin e ha una squadra collegata;
- `Layout` continua a nascondere `Schedina` per admin senza squadra collegata;
- `App` o helper dedicato risolve `effectivePlayerUid` verso il player mappato per admin;
- `/schedina` resta accessibile agli admin mappati.

Test backend:

- `saveSchedule` accetta un utente anonimo come oggi;
- `saveSchedule` rifiuta un admin non mappato;
- `saveSchedule` accetta un admin mappato e aggiorna solo il player UID collegato;
- `saveSchedule` rifiuta comunque schedine non modificabili o incomplete come oggi.

Verifiche finali:

- `npm test`;
- `npm run build`;
- `npm run test:rules`, se disponibile nell'ambiente;
- build TypeScript delle functions.
