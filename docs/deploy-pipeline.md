# Pipeline di deploy

Questa configurazione alza il controllo sul progetto senza cambiare il codice applicativo e senza attivare deploy automatici di produzione.

## Stato attuale

- L'app e' una React/Vite app.
- Firebase e' configurato tramite `firebase.json`.
- Netlify ora ha una configurazione versionata in `netlify.toml`.
- GitHub Actions esegue lint, test, test delle regole Firestore, build app e build Functions.

## Flusso consigliato

1. Crea un branch per ogni modifica.
2. Apri una pull request su GitHub.
3. Lascia passare la workflow `CI`.
4. Usa il Deploy Preview di Netlify per provare la modifica.
5. Fai merge su `master` solo dopo controlli verdi.
6. Lascia che Netlify pubblichi la produzione solo dal branch protetto.

## Cosa non e' stato attivato

- Nessun deploy automatico Firebase.
- Nessun deploy automatico Netlify da GitHub Actions.
- Nessun collegamento a un progetto Firebase specifico tramite `.firebaserc`.
- Nessun secret aggiunto al repository.

Queste parti vanno abilitate solo dopo aver confermato i nomi dei progetti Firebase e aver creato i secret necessari in GitHub o Netlify.

## Prossimo livello

Per una pipeline completa servono:

- un progetto Firebase di sviluppo, per esempio `schedinone-dev`;
- un progetto Firebase di produzione, per esempio `schedinone-prod`;
- budget alert su Google Cloud/Firebase Blaze;
- branch protection su `master`;
- secret separati per preview/staging e produzione;
- deploy Firebase automatico solo da branch protetto.
