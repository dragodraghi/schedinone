# Messaggistica giocatori — Stato di avanzamento

**Ultimo aggiornamento:** 2026-04-23
**Branch:** `master` (lavoro diretto, autorizzato dall'utente)
**Piano:** [2026-04-23-messaggistica-giocatori.md](./2026-04-23-messaggistica-giocatori.md)
**Spec:** [../specs/2026-04-23-messaggistica-giocatori-design.md](../specs/2026-04-23-messaggistica-giocatori-design.md)

## Task completati

- [x] **Task 1** — Tipi condivisi in `src/lib/types.ts`. Commit `d7ba698`.
- [x] **Task 2** — Rules annunci (`games/{gameId}/announcements`). Commit `3bfc22f`.
- [x] **Task 3** — Rules threads/messages + `users/{uid}/fcmTokens`. Commit `1761942`.

## Task rimanenti

- [ ] Task 4 — Helper `functions/src/messaging.ts` (`sendPushToUids`).
- [ ] Task 5 — `functions/src/onMessageCreated.ts` + export.
- [ ] Task 6 — `functions/src/onAnnouncementPublished.ts` + export.
- [ ] Task 7 — `functions/src/markThreadRead.ts` + export.
- [ ] Task 8 — `public/firebase-messaging-sw.js` + `src/lib/messaging.ts` + VAPID env.
- [ ] Task 9 — `src/lib/announcements.ts` + test.
- [ ] Task 10 — `src/lib/chat.ts` + test.
- [ ] Task 11 — Componenti `AnnouncementCard`, `ChatMessageBubble`, `TargetPicker`.
- [ ] Task 12 — `src/pages/BachecaPage.tsx`.
- [ ] Task 13 — `src/pages/MessaggiPage.tsx`.
- [ ] Task 14 — `src/pages/admin/AdminAnnunciPage.tsx`.
- [ ] Task 15 — `src/pages/admin/AdminMessaggiPage.tsx`.
- [ ] Task 16 — Routing, Layout, badge non-letti, init push.
- [ ] Task 17 — Smoke test `BachecaPage`.
- [ ] Task 18 — Aggiornamenti `GUIDA_GIOCATORE.md` e `GUIDA_COMITATO.md`.
- [ ] Task 19 — Deploy + verifica manuale.

## Note importanti per chi riprende

### 1. Stash in sospeso

All'inizio dei lavori ho fatto:

```
git stash push -u -m "pre-messaging working tree"
```

Lo stash contiene 21+ file modificati che erano nel working tree prima di iniziare (modifiche pre-esistenti dell'utente, non legate a questa feature). **A fine piano (dopo Task 19)**, ripristinarli con:

```
git stash list     # trova l'entry "pre-messaging working tree"
git stash pop      # o git stash apply <ref>
```

**Attenzione a possibili conflitti:** lo stash modifica `firestore.rules` e `functions/src/index.ts`, che nel frattempo saranno cambiati da questa feature. Risolvere a mano unendo le due serie di modifiche.

### 2. `firestore.rules` nel repo è semplificato

Quando ho scritto il piano iniziale avevo letto una versione del file con helper (`isSignedIn`, `isAdmin`, `isLegacyClientMode`). La versione ora presente sul branch `master` è più semplice e **non ha helper** — tutto inline con `request.auth != null` e `request.auth.uid in get(...).data.admins`. Le Task 2 e 3 già committate seguono questo pattern inline. Proseguire mantenendolo.

### 3. Adattamenti al codice esistente (Task 12/13/14/15/16)

Il piano referenzia un `useAuthUser` placeholder. Il progetto ha già un proprio hook di auth in `src/lib/auth.ts` / `src/hooks/`. L'implementatore deve:
- Leggere `src/lib/auth.ts` e scegliere l'API corretta (probabilmente un observer su `onAuthStateChanged` già esposto).
- Leggere come `DashboardPage.tsx` / `ClassificaPage.tsx` ricavano `gameId` (probabilmente `useParams` dentro una route `games/:gameId/...`) e replicare lo stesso pattern.
- Seguire l'organizzazione di `src/components/Layout.tsx` per le voci di menu.

### 4. Design scoping: tutto per-gioco

Annunci, thread, messaggi e `lastAnnouncementReadAt` sono scoped per `games/{gameId}`. I token FCM (`users/{uid}/fcmTokens`) sono scoped per utente (perché un device serve più giochi). Questo è già rispettato dai commit fatti.

### 5. Review subagent-driven

Per i task rimanenti, il pattern raccomandato è:

1. Dispatch implementer subagent col testo del task dal piano + contesto specifico.
2. Verificare i commit (solo file previsti, build passa, test passa).
3. Skip code quality review per task mccanici 1-2 file; farlo su Task 14/15/16 (integrazione).
4. Alla fine di tutti i task, dispatch un final reviewer.

### 6. Dopo Task 19

- `git stash pop` per ripristinare le modifiche pre-esistenti dell'utente.
- Risolvere conflitti su `firestore.rules` e `functions/src/index.ts` integrando le due serie.
- Eventualmente commit di pulizia `chore: restore pre-messaging WIP changes`.

## Prossimo comando per ripartire

In una nuova sessione, aprire:

1. [questo file](./2026-04-23-messaggistica-giocatori-STATUS.md)
2. [piano](./2026-04-23-messaggistica-giocatori.md) — leggere da Task 4 in avanti.
3. `firestore.rules` + `src/lib/types.ts` (già modificati) per contesto.
4. Partire con: "Riprendo l'esecuzione del piano messaggistica dal Task 4 in modalità subagent-driven."
