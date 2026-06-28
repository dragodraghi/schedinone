# Messaggistica Comitato - Design

Data: 2026-06-02

## Obiettivo

Migliorare la chat 1:1 tra Comitato e singolo giocatore, senza introdurre broadcast e senza migrare o modificare le conversazioni esistenti.

Il focus e' operativo: il Comitato deve capire subito chi ha scritto, chi attende risposta, trovare rapidamente una squadra e rispondere senza errori o doppi invii.

## Perimetro

Incluso:
- pagina `AdminMessaggiPage`;
- lista conversazioni con ordinamento piu' utile;
- filtro `Tutte / Non lette`;
- ricerca per nome squadra;
- header della conversazione selezionata;
- risposte rapide Comitato;
- invio bloccato durante il salvataggio;
- errore leggibile quando Firestore rifiuta l'invio, incluso rate limit.

Escluso:
- broadcast a tutti i giocatori;
- modifica schema Firestore;
- migrazione messaggi/thread esistenti;
- cancellazione conversazioni;
- modifiche a TUSK.

## Comportamento Atteso

La pagina Comitato mostra in alto le conversazioni con `unreadByCommittee > 0`, poi le altre ordinate per `lastMessageAt` come oggi.

Il filtro `Non lette` mostra solo conversazioni con messaggi da leggere. Il filtro `Tutte` ripristina la lista completa.

La ricerca filtra sia conversazioni gia' aperte sia giocatori senza thread, usando `playerName` o `player.name`.

Quando il Comitato seleziona una conversazione:
- vede il nome squadra in alto;
- vede eventuale badge `Da leggere`;
- i messaggi vengono caricati come oggi;
- `markThreadRead` viene chiamata come oggi.

Le risposte rapide sono testo precompilato che riempie la textarea, non invia automaticamente. Prima serie:
- `Pagamento ricevuto, grazie.`
- `La schedina risulta ancora incompleta: controlla tutti i pronostici e le scelte speciali.`
- `Abbiamo ricevuto il messaggio, ti rispondiamo appena possibile.`
- `Per recupero accesso o cambio dispositivo scrivici qui il nome squadra.`

Durante l'invio il bottone e' disabilitato e mostra uno stato di invio. Se l'invio fallisce, il testo resta nella textarea.

## Dati e Sicurezza

Non cambia il modello dati. Si continuano a usare:
- `games/{gameId}/threads/{playerUid}`;
- `games/{gameId}/threads/{playerUid}/messages/{messageId}`;
- Cloud Function `onMessageCreated`;
- callable `markThreadRead`.

Le regole Firestore e il rate limit attuale restano invariati. Le chat gia' presenti restano compatibili.

## Test

Unit/component test su `AdminMessaggiPage`:
- mostra conversazioni non lette prima delle lette;
- filtra con `Non lette`;
- cerca una squadra;
- clic su risposta rapida popola la textarea;
- durante invio il bottone viene disabilitato;
- in caso di errore il testo non viene cancellato.

Verifiche finali:
- `npm test -- --run`;
- `npm run lint`;
- `npm run build`;
- `npm run test:rules`;
- `npm run build` in `functions`.
