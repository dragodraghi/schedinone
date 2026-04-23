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

## Modello dati Firestore

### `announcements/{announcementId}`

```
{
  title: string,                   // ≤ 120 char
  body: string,                    // ≤ 2000 char
  status: 'draft' | 'published',
  authorUid: string,
  targetUids: string[] | null,     // null = broadcast; array = subset
  createdAt: Timestamp,
  publishedAt: Timestamp | null,
  editedAt: Timestamp | null,      // popolato se modificato dopo publish
  deletedAt: Timestamp | null      // soft-delete
}
```

### `threads/{uid}`

Id del documento = uid del giocatore. Un solo thread per giocatore.

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

### `threads/{uid}/messages/{messageId}`

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

```
{ token: string, platform: 'web', createdAt: Timestamp, lastSeenAt: Timestamp }
```

### `users/{uid}.lastAnnouncementReadAt: Timestamp`

Nuovo campo sul doc utente. Badge annunci non-letti = count degli annunci `published` con `publishedAt > lastAnnouncementReadAt` e `deletedAt == null`, filtrando per `targetUids`.

## Security Rules

- **`announcements`**
  - read: utente autenticato se `status == 'published' && deletedAt == null && (targetUids == null || request.auth.uid in targetUids)`. Comitato legge tutto.
  - create/update/delete: solo Comitato. Publish richiede set di `publishedAt`. Modifica su annuncio già pubblicato richiede set di `editedAt`.

- **`threads/{uid}`**
  - read: il giocatore `uid` o il Comitato.
  - write diretto client: negato. Il doc è mantenuto solo dalla Cloud Function `onMessageCreated` e dalla callable `markThreadRead`.

- **`threads/{uid}/messages`**
  - read: il giocatore `uid` o il Comitato.
  - create:
    - giocatore: solo nel proprio thread (`uid == request.auth.uid`), con `from == 'player'` e `senderUid == request.auth.uid`. Rate limit: `request.time > lastMessageAt + 2s` del thread, se esistente.
    - Comitato: in qualunque thread, con `from == 'committee'` e `senderUid == request.auth.uid`.
  - update/delete: negati.

- **`users/{uid}/fcmTokens/{token}`**: read/write solo se `uid == request.auth.uid`.

- **`users/{uid}.lastAnnouncementReadAt`**: update solo da parte dello stesso `uid`.

Il check "è Comitato" riusa il meccanismo esistente nelle Rules del progetto (il recente commit ha reso `isAdmin` autoritativo per le invite button).

## Cloud Functions

Region `europe-west1`, runtime Node v2, coerente con `firebase.json` esistente.

### `onMessageCreated`

Trigger: `onDocumentCreated('threads/{uid}/messages/{messageId}')`.

- Aggiorna `threads/{uid}` con `lastMessageAt`, `lastMessagePreview` (primi 80 char), `lastMessageFrom`.
- Incrementa `unreadByPlayer` se `from == 'committee'`, altrimenti `unreadByCommittee`. Usa `FieldValue.increment`.
- Se `threads/{uid}` non esiste: lo crea leggendo `playerName` da `users/{uid}`.
- Se `from == 'player'`: aggiorna `playerName` dal profilo corrente.
- Invia push tramite helper `sendPushToUids`:
  - `from == 'committee'` → destinatario: `{uid}`.
  - `from == 'player'` → destinatari: tutti i membri del Comitato.

### `onAnnouncementPublished`

Trigger: `onDocumentWritten('announcements/{id}')`.

- Scatta solo sulla transizione `status: draft → published` (before.status != 'published' && after.status == 'published'). Edit successivi non rinotificano.
- Destinatari: `targetUids` se presente e non vuoto, altrimenti tutti gli uid dei giocatori iscritti. Uid non più esistenti ignorati.
- Payload push: `title` = titolo annuncio, `body` = preview (primi ~140 char).

### `markThreadRead` (callable HTTPS)

- Input: `{ threadUid: string }`.
- Se chiamante è il giocatore del thread: `unreadByPlayer = 0`.
- Se chiamante è Comitato: `unreadByCommittee = 0`.
- Altri chiamanti: errore `permission-denied`.

### Helper `sendPushToUids(uids, payload)`

- Legge `users/{uid}/fcmTokens/*` per ogni uid.
- Invia batch via `admin.messaging().sendEachForMulticast`.
- Rimuove token con errore `messaging/registration-token-not-registered` o `invalid-argument`.

## Frontend

### Nuovi moduli `src/lib/`

- `messaging.ts` — inizializzazione FCM (richiesta permesso, `getToken` con VAPID, persistenza token in `users/{uid}/fcmTokens/{token}`, listener `onMessage` per notifiche foreground).
- `announcements.ts` — CRUD annunci, query "visibili all'utente corrente", calcolo badge non-letti.
- `chat.ts` — query messaggi, invio messaggio, wrapper callable `markThreadRead`.

### Service worker

- `public/firebase-messaging-sw.js` — richiesto da FCM per push in background.

### Pagine giocatore `src/pages/`

- `BachecaPage.tsx` — lista annunci `published` non eliminati ordinati per `publishedAt` desc, filtrati per `targetUids`. Mostra `(modificato)` se `editedAt != null`. All'apertura: set `users/{uid}.lastAnnouncementReadAt = serverTimestamp()`.
- `MessaggiPage.tsx` — thread unico del giocatore. Lista messaggi cronologica + input in cima. All'apertura: chiama `markThreadRead({ threadUid: currentUid })`. Se il thread non esiste, stato vuoto "Scrivi al Comitato".

### Pagine Comitato `src/pages/admin/`

- `AdminAnnunciPage.tsx` — tab Draft / Pubblicati. Bottone "Nuovo". Editor modale: campi titolo, body, selettore target (radio "Tutti" / "Seleziona giocatori" con checkbox list). Azioni: Salva bozza, Pubblica, Modifica, Elimina (soft-delete).
- `AdminMessaggiPage.tsx` — sidebar lista thread (query `threads` ordinata per `lastMessageAt` desc) con badge `unreadByCommittee`, preview, nome giocatore. Pannello destro con conversazione aperta. Bottone "Nuova conversazione" → picker giocatore → apre vista thread (che potrà non esistere ancora). All'apertura di un thread: `markThreadRead`.

### Layout

- `src/components/Layout.tsx`: aggiungere voci di menu con badge:
  - Giocatore: **Bacheca** (badge annunci non-letti), **Messaggi** (badge `unreadByPlayer`).
  - Comitato: **Annunci**, **Messaggi** (badge = somma `unreadByCommittee` su tutti i thread).

### Permesso push

Banner informativo al primo login post-deploy "Attiva le notifiche per ricevere annunci e messaggi" → `Notification.requestPermission()`. Se negato: app funziona lo stesso (realtime + badge); banner riattivabile da ProfiloPage.

## Flussi principali

### Pubblicazione annuncio

1. Comitato crea draft → visibile solo in tab Draft.
2. Clicca "Pubblica" → client scrive `status: 'published', publishedAt: serverTimestamp()`.
3. `onAnnouncementPublished` rileva la transizione, risolve destinatari, invia push.
4. Giocatori vedono l'annuncio in Bacheca via `onSnapshot` + ricevono push.
5. Modifica post-publish: aggiorna campi + `editedAt`. Niente nuova push. UI mostra `(modificato)`.
6. Elimina: soft-delete (`deletedAt`), sparisce dalle query giocatore.

### Chat giocatore → Comitato

1. Giocatore apre Messaggi. Se thread inesistente: stato vuoto.
2. Invia messaggio → client crea `threads/{uid}/messages/{autoId}` con `from: 'player'`.
3. `onMessageCreated` crea/aggiorna `threads/{uid}`, incrementa `unreadByCommittee`, push a tutti i membri del Comitato.

### Chat Comitato → Giocatore (nuovo thread)

1. Comitato clicca "Nuova conversazione", sceglie giocatore.
2. UI apre vista thread (anche non esistente). Invia messaggio → client crea sub-doc messaggio con `from: 'committee'`. Le Rules consentono la create anche senza thread-doc esistente.
3. `onMessageCreated` crea `threads/{uid}` e manda push al giocatore.

## Errori, edge case, vincoli

- **Permesso notifiche negato o browser senza supporto**: no errori bloccanti; solo banner informativo.
- **Token FCM stale**: rimossi dalla function sui codici di errore noti.
- **Giocatore rimosso**: storico preservato; accesso client revocato dalle Rules esistenti del progetto.
- **iOS Safari non-PWA**: push non arrivano; documentato in `GUIDA_GIOCATORE.md`.
- **Limiti testo**: titolo annuncio ≤ 120, body ≤ 2000, messaggio chat ≤ 1000. Validazione client e Rules.
- **Anti-spam chat giocatore**: 1 messaggio ogni 2 secondi, enforce nelle Rules via `lastMessageAt` del thread.
- **Ordine messaggi**: `createdAt` server timestamp, tie-breaker `__name__`.
- **Race su contatori**: `FieldValue.increment`.
- **`targetUids` con uid obsoleti**: ignorati nel resolver.

## Criteri di successo

- Annuncio pubblicato → destinatari lo vedono in Bacheca entro 1s e ricevono push se permesso concesso.
- Messaggio chat → controparte lo vede in sidebar/thread entro 1s e riceve push.
- Badge non-letti azzerati all'apertura della pagina corrispondente.
- Draft invisibili ai giocatori (verificato via test Rules).
- Test suite passa (`npm test`).

## Test

Seguire il pattern esistente `src/lib/__tests__/`. Coperture minime:

- Rendering liste (Bacheca, Messaggi, Admin).
- Regole di visibilità annunci: broadcast vs target; draft invisibili ai giocatori; soft-deleted invisibili.
- Invio messaggio: giocatore su proprio thread OK; su thread altrui NEGATO.
- Rate limit chat giocatore.
- Azzeramento contatori su `markThreadRead`.
- Transizione draft→published: trigger push una sola volta; edit successivo non rinotifica.

## Fuori scopo (YAGNI)

- Allegati, immagini, link cliccabili dedicati.
- Chat di gruppo.
- Reactions / thread replies / typing indicator.
- Search nello storico annunci/messaggi.
- Archive/mute dei thread lato Comitato.
- Integrazione con servizi esterni (OneSignal, email, SMS).
