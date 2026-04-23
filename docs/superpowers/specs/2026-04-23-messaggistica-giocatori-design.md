# Messaggistica giocatori — Design

**Data:** 2026-04-23
**Progetto:** Schedinone
**Autore:** brainstorming con Alberto Pileri

## Obiettivo

Consentire al Comitato di comunicare con i giocatori iscritti tramite:

1. **Bacheca annunci** in-app (broadcast o mirati) con draft, pubblicazione, modifica ed eliminazione.
2. **Chat 1-a-1** Comitato ↔ singolo giocatore: il giocatore ha un unico thread col Comitato; il Comitato vede tutti i thread e può iniziarne di nuovi.
3. **Notifiche push** FCM Web su: nuovi annunci pubblicati e nuovi messaggi chat.

Niente chat di gruppo. Solo testo (no allegati, no immagini, no link cliccabili dedicati).

## Requisiti concordati

- Il Comitato può iniziare una chat con qualsiasi giocatore; il giocatore può scrivere solo al Comitato.
- Annunci: workflow draft → pubblica, modificabili/eliminabili dopo la pubblicazione.
- Annunci mirati: di default broadcast, con opzione di selezione sottoinsieme giocatori.
- Push su annunci pubblicati e su nuovi messaggi chat (entrambi i versi).
- iOS: push solo con PWA installata; documentato in `GUIDA_GIOCATORE.md`.

## Architettura

Stack esistente: React + TypeScript + Vite, Firebase (Firestore, Auth, Cloud Functions). Si estende lo stack attuale senza nuove dipendenze infrastrutturali: Firestore per dati, Cloud Functions per fan-out push e coerenza contatori, FCM Web per delivery.

**Multi-gioco:** il progetto è scoped per `games/{gameId}` (vedi `firestore.rules` e `functions/src/index.ts`). Il "Comitato" è `gameDoc.admins: string[]`, verificato via `isAdmin(gameId)` nelle Rules. Annunci e thread vivono sotto `games/{gameId}/…`. I token FCM stanno sull'utente perché un utente può partecipare a più giochi con lo stesso device.

## Modello dati Firestore

### `games/{gameId}/announcements/{announcementId}`

```
{
  title: string,                   // ≤ 120 char
  body: string,                    // ≤ 2000 char
  status: 'draft' | 'published',
  authorUid: string,
  targetUids: string[] | null,     // null = broadcast; array = subset
  createdAt: Timestamp,
  publishedAt: Timestamp | null,
  editedAt: Timestamp | null,
  deletedAt: Timestamp | null
}
```

### `games/{gameId}/threads/{uid}`

Id documento = uid del giocatore. Un solo thread per giocatore per gioco.

```
{
  playerUid: string,
  playerName: string,              // denormalizzato, aggiornato alla prossima attività
  lastMessageAt: Timestamp,
  lastMessagePreview: string,      // primi 80 char
  lastMessageFrom: 'player' | 'committee',
  unreadByPlayer: number,
  unreadByCommittee: number
}
```

### `games/{gameId}/threads/{uid}/messages/{messageId}`

```
{
  text: string,                    // ≤ 1000 char
  from: 'player' | 'committee',
  senderUid: string,
  createdAt: Timestamp
}
```

Messaggi immutabili: niente edit, niente delete.

### `users/{uid}/fcmTokens/{token}`

Nuovo doc root per i token push. Vive fuori da `games/{gameId}` perché un utente può usare lo stesso device in più giochi.

```
{ token: string, platform: 'web', createdAt: Timestamp, lastSeenAt: Timestamp }
```

### `games/{gameId}/players/{uid}.lastAnnouncementReadAt: Timestamp`

Nuovo campo sul doc `players` esistente. Badge annunci non-letti = count degli annunci `published` del gioco con `publishedAt > lastAnnouncementReadAt` e `deletedAt == null`, filtrati per `targetUids`.

## Security Rules

Il check "è Comitato" riusa `isAdmin(gameId)` già presente in `firestore.rules`.

- **`games/{gameId}/announcements/{id}`**
  - read: autenticato se `status == 'published' && deletedAt == null && (targetUids == null || request.auth.uid in targetUids)`. Admin del gioco legge tutto.
  - create/update/delete: solo `isAdmin(gameId)`. Publish richiede set di `publishedAt`. Modifica su annuncio già `published` richiede set di `editedAt`.

- **`games/{gameId}/threads/{uid}`**
  - read: `uid == request.auth.uid` oppure `isAdmin(gameId)`.
  - write client: negato. Mantenuto solo da `onMessageCreated` e `markThreadRead`.

- **`games/{gameId}/threads/{uid}/messages/{msgId}`**
  - read: `uid == request.auth.uid` oppure `isAdmin(gameId)`.
  - create:
    - giocatore: solo nel proprio thread (`uid == request.auth.uid`), `from == 'player'`, `senderUid == request.auth.uid`. Rate limit: `request.time > resource(thread).lastMessageAt + 2s` se il thread esiste; se non esiste, consentito.
    - admin: qualunque thread, `from == 'committee'`, `senderUid == request.auth.uid`, con `isAdmin(gameId)`.
  - update/delete: negati.

- **`users/{uid}/fcmTokens/{token}`**: read/write solo se `uid == request.auth.uid`.

- **`games/{gameId}/players/{uid}.lastAnnouncementReadAt`**: rientra nella regola di update esistente del doc `players` (il player può aggiornarsi finché non tocca `points`/`paid`).

## Cloud Functions

Region `europe-west1`, runtime Node v2, coerente con `firebase.json` e `functions/src/index.ts` esistenti.

### `onMessageCreated`

Trigger: `onDocumentCreated('games/{gameId}/threads/{uid}/messages/{messageId}')`.

- Aggiorna `games/{gameId}/threads/{uid}`: `lastMessageAt`, `lastMessagePreview`, `lastMessageFrom`.
- Incrementa `unreadByPlayer` se `from == 'committee'`, altrimenti `unreadByCommittee`. Usa `FieldValue.increment`.
- Se `threads/{uid}` non esiste: lo crea leggendo `playerName` da `games/{gameId}/players/{uid}.name`.
- Se `from == 'player'`: aggiorna `playerName` dal profilo corrente.
- Invia push via helper `sendPushToUids`:
  - `from == 'committee'` → destinatario `uid`.
  - `from == 'player'` → destinatari `games/{gameId}.admins`.

### `onAnnouncementPublished`

Trigger: `onDocumentWritten('games/{gameId}/announcements/{id}')`.

- Scatta solo sulla transizione `status: draft → published` (`before.status != 'published' && after.status == 'published'`). Edit successivi non rinotificano.
- Destinatari: `targetUids` se presente e non vuoto, altrimenti tutti gli uid dei doc `games/{gameId}/players`. Uid non più esistenti ignorati.
- Payload push: `title` = titolo annuncio, `body` = preview (primi ~140 char).

### `markThreadRead` (callable HTTPS)

- Input: `{ gameId: string, threadUid: string }`.
- Se chiamante è il giocatore del thread (`threadUid == request.auth.uid`): `unreadByPlayer = 0`.
- Se chiamante è `isAdmin(gameId)`: `unreadByCommittee = 0`.
- Altri: errore `permission-denied`.

### Helper `sendPushToUids(uids, payload)`

- Legge `users/{uid}/fcmTokens/*` per ogni uid.
- Invia batch via `admin.messaging().sendEachForMulticast`.
- Rimuove token con errore `messaging/registration-token-not-registered` o `invalid-argument`.

## Frontend

### Nuovi moduli `src/lib/`

- `messaging.ts` — init FCM (permesso, `getToken` con VAPID key da env, persistenza in `users/{uid}/fcmTokens/{token}`, `onMessage` foreground).
- `announcements.ts` — CRUD annunci, query "visibili all'utente corrente nel gioco corrente", calcolo badge non-letti.
- `chat.ts` — query messaggi, invio, wrapper callable `markThreadRead`.

### Service worker

`public/firebase-messaging-sw.js` — richiesto per push in background.

### Pagine giocatore `src/pages/`

- `BachecaPage.tsx` — annunci `published` del gioco corrente ordinati per `publishedAt` desc, filtrati per `targetUids`. Mostra `(modificato)` se `editedAt != null`. All'apertura: set `games/{gameId}/players/{uid}.lastAnnouncementReadAt = serverTimestamp()`.
- `MessaggiPage.tsx` — thread unico del giocatore nel gioco corrente. Lista cronologica + input in cima. All'apertura: `markThreadRead({ gameId, threadUid: uid })`. Stato vuoto se thread inesistente.

### Pagine Comitato `src/pages/admin/`

- `AdminAnnunciPage.tsx` — tab Draft / Pubblicati. Bottone "Nuovo". Editor modale: titolo, body, radio target "Tutti" / "Seleziona giocatori" + checkbox list. Azioni: Salva bozza, Pubblica, Modifica, Elimina (soft-delete).
- `AdminMessaggiPage.tsx` — sidebar thread ordinata per `lastMessageAt` desc con badge `unreadByCommittee`. Pannello destro conversazione. Bottone "Nuova conversazione" → picker giocatore. All'apertura thread: `markThreadRead`.

### Layout `src/components/Layout.tsx`

- Giocatore: voci **Bacheca** (badge non-letti annunci) e **Messaggi** (badge `unreadByPlayer`).
- Comitato: voci **Annunci** e **Messaggi** (badge = somma `unreadByCommittee`).

### Permesso push

Banner al primo login post-deploy "Attiva le notifiche" → `Notification.requestPermission()`. Se negato: app funziona con realtime + badge; banner riattivabile da ProfiloPage.

## Flussi principali

### Pubblicazione annuncio

1. Comitato crea draft → solo tab Draft.
2. Clicca "Pubblica" → client setta `status: 'published', publishedAt: serverTimestamp()`.
3. `onAnnouncementPublished` risolve destinatari, manda push.
4. Giocatori vedono in Bacheca via `onSnapshot` + push.
5. Modifica post-publish: aggiorna campi + `editedAt`. Niente nuova push. UI mostra `(modificato)`.
6. Elimina: soft-delete, sparisce dalle query giocatore.

### Chat giocatore → Comitato

1. Giocatore apre Messaggi. Thread inesistente → stato vuoto.
2. Invia messaggio → crea `games/{gameId}/threads/{uid}/messages/{autoId}` con `from: 'player'`.
3. `onMessageCreated` crea/aggiorna il thread, incrementa `unreadByCommittee`, push a tutti gli `admins`.

### Chat Comitato → Giocatore (nuovo thread)

1. Comitato clicca "Nuova conversazione", sceglie giocatore.
2. UI apre vista thread (anche non esistente). Invia → crea sub-doc con `from: 'committee'`. Rules consentono create anche senza thread-doc.
3. `onMessageCreated` crea il doc thread e manda push al giocatore.

## Errori, edge case, vincoli

- Permesso notifiche negato o browser non supportato: no errori bloccanti, solo banner informativo.
- Token FCM stale: rimossi dalla function sui codici noti.
- Giocatore rimosso: storico preservato; accesso client revocato dalle Rules esistenti.
- iOS Safari non-PWA: push non arrivano; documentato in `GUIDA_GIOCATORE.md`.
- Limiti testo: titolo ≤ 120, body ≤ 2000, messaggio ≤ 1000. Validazione client e Rules.
- Anti-spam chat giocatore: 1 messaggio ogni 2s via `lastMessageAt`.
- Ordine messaggi: `createdAt` server timestamp, tie-breaker `__name__`.
- Race contatori: `FieldValue.increment`.
- `targetUids` con uid obsoleti: ignorati nel resolver.

## Criteri di successo

- Annuncio pubblicato → destinatari lo vedono in Bacheca entro 1s e ricevono push se permesso concesso.
- Messaggio chat → controparte lo vede entro 1s e riceve push.
- Badge non-letti azzerati all'apertura della pagina.
- Draft invisibili ai giocatori.
- Test suite verde (`npm test`).

## Test

Seguire pattern `src/lib/__tests__/`. Coperture minime:

- Rendering liste (Bacheca, Messaggi, Admin).
- Visibilità annunci: broadcast vs target; draft invisibili; soft-deleted invisibili.
- Invio messaggio: giocatore su proprio thread OK; su thread altrui NEGATO.
- Rate limit chat giocatore.
- Azzeramento contatori su `markThreadRead`.
- Transizione draft→published: push una sola volta; edit successivo non rinotifica.

## Fuori scopo (YAGNI)

- Allegati, immagini, link dedicati.
- Chat di gruppo.
- Reactions / typing indicator / thread replies.
- Search storico.
- Archive/mute thread.
- Servizi esterni (OneSignal, email, SMS).
