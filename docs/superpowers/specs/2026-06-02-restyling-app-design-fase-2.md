# Restyling App Design Fase 2

## Obiettivo

Rendere SCHEDINONE piu' professionale e coerente dopo la prima passata grafica, mantenendo il perimetro esclusivamente visuale.

## Perimetro incluso

- Uniformare area Comitato/Admin con lo stile gia' introdotto nelle pagine giocatore.
- Raffinare componenti condivisi: pannelli, bottoni secondari, card, modali, campi input e stati disabilitati.
- Ripulire stringhe visibili corrotte da encoding nelle schermate toccate.
- Migliorare gerarchia, spaziatura, leggibilita' mobile e desktop.

## Perimetro escluso

- Nessuna modifica a Firestore, funzioni Firebase, regole, salvataggio schedina, invio schedina, calendario, risultati o calcolo punti.
- Nessuna migrazione dati.
- Nessuna modifica distruttiva a giocatori o schedine gia' compilate.

## Direzione visiva

Stile sportivo premium, scuro, operativo: superfici compatte, bordi netti, accenti ciano/verde/oro usati per stato e priorita', senza decorazioni casuali. L'Admin deve sembrare un pannello di controllo serio, non una lista di bottoni.

## Criteri di accettazione

- Build TypeScript riuscita.
- Test unitari e regole Firestore invariati.
- Login, Admin e messaggistica visivamente coerenti dopo deploy.
- Nessun flusso dati modificato.
