# Messaggistica giocatori — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere a Schedinone bacheca annunci, chat 1-a-1 Comitato↔giocatore e notifiche push FCM.

**Architecture:** Tutto scoped per `games/{gameId}`. Firestore per dati, Cloud Functions per fan-out push e contatori, FCM Web per delivery. Spec di riferimento: `docs/superpowers/specs/2026-04-23-messaggistica-giocatori-design.md`.

**Tech Stack:** React 19 + TS + Vite, Firebase (Firestore, Auth, Functions v2, Messaging), `firebase-admin`, Vitest + Testing Library.

---

## File structure

**Nuovi file frontend:**
- `src/lib/messaging.ts` — init FCM, permesso, token.
- `src/lib/announcements.ts` — CRUD annunci + query.
- `src/lib/chat.ts` — query/invia messaggi, callable wrapper.
- `src/lib/types.ts` — (modifica) aggiungere tipi `Announcement`, `Thread`, `ChatMessage`.
- `src/pages/BachecaPage.tsx` — lista annunci giocatore.
- `src/pages/MessaggiPage.tsx` — chat giocatore.
- `src/pages/admin/AdminAnnunciPage.tsx` — gestione annunci.
- `src/pages/admin/AdminMessaggiPage.tsx` — gestione chat.
- `src/components/AnnouncementCard.tsx`, `src/components/ChatMessageBubble.tsx`, `src/components/TargetPicker.tsx` — componenti UI dedicati.
- `public/firebase-messaging-sw.js` — service worker FCM.
- Test coppia in `src/lib/__tests__/` e `src/pages/__tests__/`.

**Nuovi file functions:**
- `functions/src/messaging.ts` — helper `sendPushToUids`.
- `functions/src/onMessageCreated.ts` — trigger chat.
- `functions/src/onAnnouncementPublished.ts` — trigger annunci.
- `functions/src/markThreadRead.ts` — callable.

**Modifiche:**
- `firestore.rules` — nuove regole.
- `functions/src/index.ts` — export delle nuove funzioni.
- `src/App.tsx` — nuove routes.
- `src/components/Layout.tsx` — voci menu + badge.
- `GUIDA_GIOCATORE.md`, `GUIDA_COMITATO.md` — sezioni informative.

---

## Task 1: Tipi condivisi

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Aggiungere i tipi**

Aggiungi in fondo a `src/lib/types.ts`:

```ts
import type { Timestamp } from 'firebase/firestore';

export type AnnouncementStatus = 'draft' | 'published';

export type Announcement = {
  id: string;
  title: string;
  body: string;
  status: AnnouncementStatus;
  authorUid: string;
  targetUids: string[] | null;
  createdAt: Timestamp;
  publishedAt: Timestamp | null;
  editedAt: Timestamp | null;
  deletedAt: Timestamp | null;
};

export type ChatFrom = 'player' | 'committee';

export type Thread = {
  playerUid: string;
  playerName: string;
  lastMessageAt: Timestamp;
  lastMessagePreview: string;
  lastMessageFrom: ChatFrom;
  unreadByPlayer: number;
  unreadByCommittee: number;
};

export type ChatMessage = {
  id: string;
  text: string;
  from: ChatFrom;
  senderUid: string;
  createdAt: Timestamp;
};

export const ANNOUNCEMENT_TITLE_MAX = 120;
export const ANNOUNCEMENT_BODY_MAX = 2000;
export const CHAT_MESSAGE_MAX = 1000;
export const CHAT_PREVIEW_MAX = 80;
export const PUSH_BODY_MAX = 140;
```

- [ ] **Step 2: Verificare build TS**

Run: `cd c:/Users/Utente/schedinone && npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add messaging types (Announcement, Thread, ChatMessage)"
```

---

## Task 2: Firestore rules — annunci

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Aggiungere helper e blocco announcements**

In `firestore.rules`, dentro `match /databases/{database}/documents`, aggiungi (in cima ai helper) una funzione:

```
function isAdminOf(gameId) {
  return isSignedIn()
    && request.auth.uid in gameDoc(gameId).data.admins;
}
```

Nota: duplica la logica dell'`isAdmin` esistente ma evita conflitti con il nome già in uso nello scope annidato. Se l'esistente funziona nello scope esterno, riusa quello e salta questa aggiunta.

Dentro `match /games/{gameId}`, dopo `match /players/{playerId} { ... }`, aggiungi:

```
match /announcements/{announcementId} {
  allow read: if isSignedIn() && (
    isAdmin(gameId)
    || (
      resource.data.status == 'published'
      && resource.data.deletedAt == null
      && (resource.data.targetUids == null || request.auth.uid in resource.data.targetUids)
    )
  );
  allow create: if isAdmin(gameId)
    && request.resource.data.authorUid == request.auth.uid
    && request.resource.data.title is string
    && request.resource.data.title.size() <= 120
    && request.resource.data.body is string
    && request.resource.data.body.size() <= 2000
    && request.resource.data.status in ['draft', 'published']
    && (request.resource.data.targetUids == null || request.resource.data.targetUids is list);
  allow update: if isAdmin(gameId)
    && request.resource.data.title.size() <= 120
    && request.resource.data.body.size() <= 2000
    && (
      // publish transition
      (resource.data.status == 'draft' && request.resource.data.status == 'published'
        && request.resource.data.publishedAt == request.time)
      // edit of already published → must set editedAt
      || (resource.data.status == 'published' && request.resource.data.status == 'published'
        && request.resource.data.editedAt == request.time)
      // draft edits
      || (resource.data.status == 'draft' && request.resource.data.status == 'draft')
      // soft-delete
      || (request.resource.data.deletedAt == request.time)
    );
  allow delete: if isAdmin(gameId);
}
```

- [ ] **Step 2: Deploy delle rules in test (opzionale locale)**

Se hai gli emulatori: `firebase emulators:start --only firestore`. Altrimenti pass — si testerà in Task 12.

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat(rules): announcements collection with publish/edit/delete invariants"
```

---

## Task 3: Firestore rules — threads e messaggi + fcmTokens

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Aggiungere regole threads dentro `games/{gameId}`**

Dopo il blocco `announcements`, aggiungi:

```
match /threads/{playerUid} {
  allow read: if isSignedIn() && (request.auth.uid == playerUid || isAdmin(gameId));
  // Mantenuto solo da Cloud Functions / callable → write client negati.
  allow write: if false;

  match /messages/{messageId} {
    allow read: if isSignedIn() && (request.auth.uid == playerUid || isAdmin(gameId));
    allow create: if isSignedIn()
      && request.resource.data.text is string
      && request.resource.data.text.size() > 0
      && request.resource.data.text.size() <= 1000
      && request.resource.data.senderUid == request.auth.uid
      && request.resource.data.createdAt == request.time
      && (
        // player in own thread with 2s rate limit
        (request.auth.uid == playerUid
          && request.resource.data.from == 'player'
          && (!exists(/databases/$(database)/documents/games/$(gameId)/threads/$(playerUid))
              || request.time > get(/databases/$(database)/documents/games/$(gameId)/threads/$(playerUid)).data.lastMessageAt + duration.value(2, 's')))
        // admin to any thread
        || (isAdmin(gameId) && request.resource.data.from == 'committee')
      );
    allow update, delete: if false;
  }
}
```

- [ ] **Step 2: Aggiungere regole `users/{uid}/fcmTokens`**

A livello top (sibling di `match /games/{gameId}`), aggiungi:

```
match /users/{uid} {
  allow read, write: if isSignedIn() && request.auth.uid == uid;
  match /fcmTokens/{token} {
    allow read, write: if isSignedIn() && request.auth.uid == uid;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat(rules): threads, chat messages rate-limit, fcm tokens"
```

---

## Task 4: Helper functions — `sendPushToUids`

**Files:**
- Create: `functions/src/messaging.ts`

- [ ] **Step 1: Scrivere l'helper**

```ts
import * as admin from "firebase-admin";

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

export async function sendPushToUids(uids: string[], payload: PushPayload): Promise<void> {
  if (uids.length === 0) return;
  const db = admin.firestore();
  const tokens: { token: string; uid: string; ref: FirebaseFirestore.DocumentReference }[] = [];

  for (const uid of uids) {
    const snap = await db.collection("users").doc(uid).collection("fcmTokens").get();
    snap.forEach((d) => tokens.push({ token: d.id, uid, ref: d.ref }));
  }
  if (tokens.length === 0) return;

  const res = await admin.messaging().sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification: { title: payload.title, body: payload.body },
    data: payload.data ?? {},
  });

  const deletions: Promise<unknown>[] = [];
  res.responses.forEach((r, i) => {
    if (r.success) return;
    const code = r.error?.code ?? "";
    if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-argument") {
      deletions.push(tokens[i].ref.delete());
    }
  });
  await Promise.all(deletions);
}
```

- [ ] **Step 2: Build functions**

Run: `cd c:/Users/Utente/schedinone/functions && npm run build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add functions/src/messaging.ts
git commit -m "feat(functions): sendPushToUids helper with stale token cleanup"
```

---

## Task 5: Function `onMessageCreated`

**Files:**
- Create: `functions/src/onMessageCreated.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Scrivere il trigger**

`functions/src/onMessageCreated.ts`:

```ts
import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { sendPushToUids } from "./messaging";

export const onMessageCreated = onDocumentCreated(
  { document: "games/{gameId}/threads/{playerUid}/messages/{messageId}", region: "europe-west1" },
  async (event) => {
    const msg = event.data?.data();
    if (!msg) return;
    const { gameId, playerUid } = event.params;
    const db = admin.firestore();
    const threadRef = db.doc(`games/${gameId}/threads/${playerUid}`);
    const threadSnap = await threadRef.get();

    const text: string = msg.text;
    const from: "player" | "committee" = msg.from;
    const preview = text.slice(0, 80);

    const playerSnap = await db.doc(`games/${gameId}/players/${playerUid}`).get();
    const playerName: string = (playerSnap.data()?.name as string | undefined) ?? "Giocatore";

    if (!threadSnap.exists) {
      await threadRef.set({
        playerUid,
        playerName,
        lastMessageAt: msg.createdAt ?? admin.firestore.FieldValue.serverTimestamp(),
        lastMessagePreview: preview,
        lastMessageFrom: from,
        unreadByPlayer: from === "committee" ? 1 : 0,
        unreadByCommittee: from === "player" ? 1 : 0,
      });
    } else {
      const update: Record<string, unknown> = {
        lastMessageAt: msg.createdAt ?? admin.firestore.FieldValue.serverTimestamp(),
        lastMessagePreview: preview,
        lastMessageFrom: from,
      };
      if (from === "player") update.playerName = playerName;
      if (from === "committee") update.unreadByPlayer = admin.firestore.FieldValue.increment(1);
      else update.unreadByCommittee = admin.firestore.FieldValue.increment(1);
      await threadRef.update(update);
    }

    if (from === "committee") {
      await sendPushToUids([playerUid], {
        title: "Nuovo messaggio dal Comitato",
        body: preview,
        data: { gameId, kind: "chat", threadUid: playerUid },
      });
    } else {
      const gameSnap = await db.doc(`games/${gameId}`).get();
      const admins: string[] = (gameSnap.data()?.admins as string[] | undefined) ?? [];
      await sendPushToUids(admins, {
        title: `Messaggio da ${playerName}`,
        body: preview,
        data: { gameId, kind: "chat", threadUid: playerUid },
      });
    }
  }
);
```

- [ ] **Step 2: Esportare in `functions/src/index.ts`**

Aggiungi in fondo:

```ts
export { onMessageCreated } from "./onMessageCreated";
```

- [ ] **Step 3: Build functions**

Run: `cd c:/Users/Utente/schedinone/functions && npm run build`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add functions/src/onMessageCreated.ts functions/src/index.ts
git commit -m "feat(functions): onMessageCreated trigger updates thread + sends push"
```

---

## Task 6: Function `onAnnouncementPublished`

**Files:**
- Create: `functions/src/onAnnouncementPublished.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Scrivere il trigger**

```ts
import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { sendPushToUids } from "./messaging";

export const onAnnouncementPublished = onDocumentWritten(
  { document: "games/{gameId}/announcements/{announcementId}", region: "europe-west1" },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after) return;
    const beforeStatus = before?.status;
    const afterStatus = after.status;
    if (beforeStatus === "published" || afterStatus !== "published") return;
    if (after.deletedAt) return;

    const { gameId } = event.params;
    const db = admin.firestore();

    let uids: string[];
    if (Array.isArray(after.targetUids) && after.targetUids.length > 0) {
      uids = after.targetUids as string[];
    } else {
      const players = await db.collection(`games/${gameId}/players`).get();
      uids = players.docs.map((d) => d.id);
    }

    const title: string = after.title ?? "Annuncio";
    const body: string = ((after.body as string) ?? "").slice(0, 140);

    await sendPushToUids(uids, {
      title,
      body,
      data: { gameId, kind: "announcement", announcementId: event.params.announcementId },
    });
  }
);
```

- [ ] **Step 2: Esportare**

In `functions/src/index.ts`:

```ts
export { onAnnouncementPublished } from "./onAnnouncementPublished";
```

- [ ] **Step 3: Build**

Run: `cd c:/Users/Utente/schedinone/functions && npm run build`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add functions/src/onAnnouncementPublished.ts functions/src/index.ts
git commit -m "feat(functions): onAnnouncementPublished sends push on draft→published"
```

---

## Task 7: Callable `markThreadRead`

**Files:**
- Create: `functions/src/markThreadRead.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Scrivere la callable**

```ts
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

export const markThreadRead = onCall(
  { region: "europe-west1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Devi essere autenticato.");
    const gameId = typeof request.data?.gameId === "string" ? request.data.gameId : "";
    const threadUid = typeof request.data?.threadUid === "string" ? request.data.threadUid : "";
    if (!gameId || !threadUid) throw new HttpsError("invalid-argument", "gameId/threadUid mancanti.");

    const db = admin.firestore();
    const gameSnap = await db.doc(`games/${gameId}`).get();
    if (!gameSnap.exists) throw new HttpsError("not-found", "Gioco non trovato.");
    const admins: string[] = (gameSnap.data()?.admins as string[] | undefined) ?? [];

    const threadRef = db.doc(`games/${gameId}/threads/${threadUid}`);
    const threadSnap = await threadRef.get();
    if (!threadSnap.exists) return { ok: true };

    if (uid === threadUid) {
      await threadRef.update({ unreadByPlayer: 0 });
    } else if (admins.includes(uid)) {
      await threadRef.update({ unreadByCommittee: 0 });
    } else {
      throw new HttpsError("permission-denied", "Non autorizzato.");
    }
    return { ok: true };
  }
);
```

- [ ] **Step 2: Esportare**

```ts
export { markThreadRead } from "./markThreadRead";
```

- [ ] **Step 3: Build + Commit**

```
cd c:/Users/Utente/schedinone/functions && npm run build
```

```bash
git add functions/src/markThreadRead.ts functions/src/index.ts
git commit -m "feat(functions): markThreadRead callable resets unread counters"
```

---

## Task 8: Service worker FCM + init messaging client

**Files:**
- Create: `public/firebase-messaging-sw.js`
- Create: `src/lib/messaging.ts`

Firebase config è duplicato nel service worker perché i SW non ereditano da `firebase.ts`. Leggi i valori da `src/lib/firebase.ts` e replica le chiavi non-segrete.

- [ ] **Step 1: Service worker**

`public/firebase-messaging-sw.js`:

```js
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// Replica i valori da src/lib/firebase.ts — sono già nel bundle pubblico.
firebase.initializeApp({
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "__FIREBASE_AUTH_DOMAIN__",
  projectId: "__FIREBASE_PROJECT_ID__",
  messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__FIREBASE_APP_ID__",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'Schedinone';
  const body = payload.notification?.body ?? '';
  self.registration.showNotification(title, { body, icon: '/icon-192.png' });
});
```

NB: l'engineer deve sostituire i placeholder `__FIREBASE_*__` con i valori reali letti da `src/lib/firebase.ts`. Non sono segreti (sono già nel bundle client).

- [ ] **Step 2: Aggiungere VAPID key in env**

Aggiungi a `.env.local` (non committare) e `.env.example` (committare):

```
VITE_FCM_VAPID_KEY=yourVapidKeyHere
```

- [ ] **Step 3: `src/lib/messaging.ts`**

```ts
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app, db } from './firebase';

export async function initPushForUser(uid: string): Promise<string | null> {
  try {
    if (!(await isSupported())) return null;
    if (typeof Notification === 'undefined') return null;

    let permission = Notification.permission;
    if (permission === 'default') permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(app);
    const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY as string;
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    if (!token) return null;

    await setDoc(
      doc(db, `users/${uid}/fcmTokens/${token}`),
      { token, platform: 'web', createdAt: serverTimestamp(), lastSeenAt: serverTimestamp() },
      { merge: true }
    );

    onMessage(messaging, (payload) => {
      const title = payload.notification?.title ?? 'Schedinone';
      const body = payload.notification?.body ?? '';
      if (Notification.permission === 'granted') new Notification(title, { body });
    });

    return token;
  } catch (e) {
    console.warn('[messaging] init failed', e);
    return null;
  }
}
```

- [ ] **Step 4: Build**

Run: `cd c:/Users/Utente/schedinone && npm run build`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add public/firebase-messaging-sw.js src/lib/messaging.ts .env.example
git commit -m "feat(messaging): FCM web push init + service worker"
```

---

## Task 9: `src/lib/announcements.ts` — query + CRUD

**Files:**
- Create: `src/lib/announcements.ts`
- Create: `src/lib/__tests__/announcements.test.ts`

- [ ] **Step 1: Test che fallisce**

```ts
// src/lib/__tests__/announcements.test.ts
import { describe, it, expect } from 'vitest';
import { isAnnouncementVisibleTo } from '../announcements';
import type { Announcement } from '../types';
import { Timestamp } from 'firebase/firestore';

const base: Announcement = {
  id: 'a1', title: 't', body: 'b', status: 'published',
  authorUid: 'admin', targetUids: null,
  createdAt: Timestamp.now(), publishedAt: Timestamp.now(),
  editedAt: null, deletedAt: null,
};

describe('isAnnouncementVisibleTo', () => {
  it('draft is not visible to players', () => {
    expect(isAnnouncementVisibleTo({ ...base, status: 'draft' }, 'u1')).toBe(false);
  });
  it('deleted is not visible', () => {
    expect(isAnnouncementVisibleTo({ ...base, deletedAt: Timestamp.now() }, 'u1')).toBe(false);
  });
  it('broadcast visible to anyone', () => {
    expect(isAnnouncementVisibleTo(base, 'u1')).toBe(true);
  });
  it('targeted visible only to listed uids', () => {
    expect(isAnnouncementVisibleTo({ ...base, targetUids: ['u2'] }, 'u1')).toBe(false);
    expect(isAnnouncementVisibleTo({ ...base, targetUids: ['u1'] }, 'u1')).toBe(true);
  });
});
```

Run: `npx vitest run src/lib/__tests__/announcements.test.ts`
Expected: FAIL (module non trovato).

- [ ] **Step 2: Implementazione minima**

`src/lib/announcements.ts`:

```ts
import {
  collection, doc, addDoc, updateDoc, query, where, orderBy, onSnapshot,
  serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Announcement, AnnouncementStatus } from './types';

export function isAnnouncementVisibleTo(a: Announcement, uid: string): boolean {
  if (a.status !== 'published') return false;
  if (a.deletedAt) return false;
  if (a.targetUids === null) return true;
  return a.targetUids.includes(uid);
}

function col(gameId: string) {
  return collection(db, `games/${gameId}/announcements`);
}

export async function createAnnouncement(
  gameId: string,
  authorUid: string,
  data: { title: string; body: string; targetUids: string[] | null; status: AnnouncementStatus }
) {
  const payload = {
    title: data.title,
    body: data.body,
    status: data.status,
    authorUid,
    targetUids: data.targetUids,
    createdAt: serverTimestamp(),
    publishedAt: data.status === 'published' ? serverTimestamp() : null,
    editedAt: null,
    deletedAt: null,
  };
  return addDoc(col(gameId), payload);
}

export async function publishAnnouncement(gameId: string, id: string) {
  await updateDoc(doc(col(gameId), id), {
    status: 'published',
    publishedAt: serverTimestamp(),
  });
}

export async function editPublishedAnnouncement(
  gameId: string, id: string, patch: { title: string; body: string; targetUids: string[] | null }
) {
  await updateDoc(doc(col(gameId), id), { ...patch, editedAt: serverTimestamp() });
}

export async function updateDraftAnnouncement(
  gameId: string, id: string, patch: { title: string; body: string; targetUids: string[] | null }
) {
  await updateDoc(doc(col(gameId), id), patch);
}

export async function softDeleteAnnouncement(gameId: string, id: string) {
  await updateDoc(doc(col(gameId), id), { deletedAt: serverTimestamp() });
}

export function subscribeAnnouncementsForPlayer(
  gameId: string, uid: string, cb: (items: Announcement[]) => void
) {
  const q = query(
    col(gameId),
    where('status', '==', 'published'),
    orderBy('publishedAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Announcement, 'id'>) }))
      .filter((a) => isAnnouncementVisibleTo(a, uid));
    cb(items);
  });
}

export function subscribeAllAnnouncements(gameId: string, cb: (items: Announcement[]) => void) {
  const q = query(col(gameId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Announcement, 'id'>) }))));
}

export function countUnreadAnnouncements(items: Announcement[], lastReadAt: Timestamp | null): number {
  return items.filter((a) => {
    if (a.status !== 'published' || a.deletedAt) return false;
    if (!a.publishedAt) return false;
    if (!lastReadAt) return true;
    return a.publishedAt.toMillis() > lastReadAt.toMillis();
  }).length;
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/lib/__tests__/announcements.test.ts`
Expected: PASS (4 test).

- [ ] **Step 4: Commit**

```bash
git add src/lib/announcements.ts src/lib/__tests__/announcements.test.ts
git commit -m "feat(announcements): visibility helper, CRUD, subscriptions"
```

---

## Task 10: `src/lib/chat.ts` — query + invio + callable

**Files:**
- Create: `src/lib/chat.ts`
- Create: `src/lib/__tests__/chat.test.ts`

- [ ] **Step 1: Test che fallisce**

```ts
// src/lib/__tests__/chat.test.ts
import { describe, it, expect } from 'vitest';
import { makePreview } from '../chat';

describe('makePreview', () => {
  it('truncates to 80 chars', () => {
    const long = 'a'.repeat(200);
    expect(makePreview(long)).toHaveLength(80);
  });
  it('leaves short text unchanged', () => {
    expect(makePreview('ciao')).toBe('ciao');
  });
});
```

Run: `npx vitest run src/lib/__tests__/chat.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implementazione**

`src/lib/chat.ts`:

```ts
import {
  addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from './firebase';
import type { ChatFrom, ChatMessage, Thread } from './types';
import { CHAT_PREVIEW_MAX } from './types';

export function makePreview(text: string): string {
  return text.slice(0, CHAT_PREVIEW_MAX);
}

export async function sendMessage(
  gameId: string, threadUid: string, senderUid: string, from: ChatFrom, text: string
) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Messaggio vuoto');
  return addDoc(collection(db, `games/${gameId}/threads/${threadUid}/messages`), {
    text: trimmed,
    from,
    senderUid,
    createdAt: serverTimestamp(),
  });
}

export function subscribeMessages(
  gameId: string, threadUid: string, cb: (msgs: ChatMessage[]) => void
) {
  const q = query(
    collection(db, `games/${gameId}/threads/${threadUid}/messages`),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, 'id'>) })));
  });
}

export function subscribeThread(
  gameId: string, threadUid: string, cb: (t: Thread | null) => void
) {
  return onSnapshot(doc(db, `games/${gameId}/threads/${threadUid}`), (snap) => {
    cb(snap.exists() ? (snap.data() as Thread) : null);
  });
}

export function subscribeAllThreads(gameId: string, cb: (threads: (Thread & { id: string })[]) => void) {
  const q = query(collection(db, `games/${gameId}/threads`), orderBy('lastMessageAt', 'desc'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Thread) })));
  });
}

export async function markThreadRead(gameId: string, threadUid: string): Promise<void> {
  const fn = httpsCallable(getFunctions(app, 'europe-west1'), 'markThreadRead');
  await fn({ gameId, threadUid });
}
```

- [ ] **Step 3: Tests pass**

Run: `npx vitest run src/lib/__tests__/chat.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/chat.ts src/lib/__tests__/chat.test.ts
git commit -m "feat(chat): send/subscribe messages + markThreadRead wrapper"
```

---

## Task 11: Componenti UI condivisi

**Files:**
- Create: `src/components/AnnouncementCard.tsx`
- Create: `src/components/ChatMessageBubble.tsx`
- Create: `src/components/TargetPicker.tsx`

- [ ] **Step 1: `AnnouncementCard.tsx`**

```tsx
import type { Announcement } from '../lib/types';

export function AnnouncementCard({ a }: { a: Announcement }) {
  const when = a.publishedAt?.toDate().toLocaleString('it-IT') ?? '';
  return (
    <article className="rounded-lg border border-gray-200 p-4 bg-white shadow-sm">
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold">{a.title}</h3>
        <time className="text-xs text-gray-500">{when}</time>
      </header>
      <p className="mt-2 whitespace-pre-wrap text-sm">{a.body}</p>
      {a.editedAt && <p className="mt-1 text-xs italic text-gray-400">(modificato)</p>}
    </article>
  );
}
```

- [ ] **Step 2: `ChatMessageBubble.tsx`**

```tsx
import type { ChatMessage } from '../lib/types';

export function ChatMessageBubble({ m, currentUid }: { m: ChatMessage; currentUid: string }) {
  const mine = m.senderUid === currentUid;
  const when = m.createdAt?.toDate?.().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) ?? '';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
        <p className="whitespace-pre-wrap">{m.text}</p>
        <p className={`mt-1 text-[10px] ${mine ? 'text-blue-100' : 'text-gray-500'}`}>{when}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `TargetPicker.tsx`**

```tsx
import { useState } from 'react';

export type Player = { uid: string; name: string };

export function TargetPicker({
  players, value, onChange,
}: {
  players: Player[];
  value: string[] | null;              // null = broadcast
  onChange: (v: string[] | null) => void;
}) {
  const [mode, setMode] = useState<'all' | 'some'>(value === null ? 'all' : 'some');
  const set = new Set(value ?? []);
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2">
        <input type="radio" checked={mode === 'all'} onChange={() => { setMode('all'); onChange(null); }} />
        Tutti i giocatori
      </label>
      <label className="flex items-center gap-2">
        <input type="radio" checked={mode === 'some'} onChange={() => { setMode('some'); onChange([]); }} />
        Seleziona giocatori
      </label>
      {mode === 'some' && (
        <ul className="ml-6 max-h-48 overflow-auto border rounded p-2">
          {players.map((p) => (
            <li key={p.uid}>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={set.has(p.uid)}
                  onChange={(e) => {
                    const next = new Set(set);
                    if (e.target.checked) next.add(p.uid); else next.delete(p.uid);
                    onChange(Array.from(next));
                  }}
                />
                {p.name}
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Build**

Run: `cd c:/Users/Utente/schedinone && npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/AnnouncementCard.tsx src/components/ChatMessageBubble.tsx src/components/TargetPicker.tsx
git commit -m "feat(ui): AnnouncementCard, ChatMessageBubble, TargetPicker"
```

---

## Task 12: `BachecaPage`

**Files:**
- Create: `src/pages/BachecaPage.tsx`

- [ ] **Step 1: Implementazione**

```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscribeAnnouncementsForPlayer } from '../lib/announcements';
import { AnnouncementCard } from '../components/AnnouncementCard';
import { useAuthUser } from '../hooks/useAuthUser'; // adapter: usa l'hook auth esistente del progetto
import type { Announcement } from '../lib/types';

export function BachecaPage() {
  const { gameId = '' } = useParams();
  const user = useAuthUser();
  const [items, setItems] = useState<Announcement[]>([]);

  useEffect(() => {
    if (!user || !gameId) return;
    return subscribeAnnouncementsForPlayer(gameId, user.uid, setItems);
  }, [gameId, user?.uid]);

  useEffect(() => {
    if (!user || !gameId) return;
    updateDoc(doc(db, `games/${gameId}/players/${user.uid}`), { lastAnnouncementReadAt: serverTimestamp() }).catch(() => {});
  }, [gameId, user?.uid]);

  return (
    <section className="p-4 space-y-3">
      <h2 className="text-xl font-bold">Bacheca</h2>
      {items.length === 0 && <p className="text-gray-500">Nessun annuncio.</p>}
      {items.map((a) => <AnnouncementCard key={a.id} a={a} />)}
    </section>
  );
}
```

**Nota per l'engineer:** se `useAuthUser` non esiste con questo nome, sostituiscilo con l'hook di auth già presente nel progetto (cerca in `src/lib/auth.ts` e `src/hooks/`). Stesso principio per `useParams(gameId)`: usa la stessa fonte di verità usata da `ClassificaPage.tsx` / `DashboardPage.tsx`.

- [ ] **Step 2: Build**

Run: `cd c:/Users/Utente/schedinone && npx tsc -b --noEmit`
Expected: exit 0 (risolvi eventuali nomi auth/route prima di procedere).

- [ ] **Step 3: Commit**

```bash
git add src/pages/BachecaPage.tsx
git commit -m "feat(pages): BachecaPage shows published announcements + marks read"
```

---

## Task 13: `MessaggiPage` (giocatore)

**Files:**
- Create: `src/pages/MessaggiPage.tsx`

- [ ] **Step 1: Implementazione**

```tsx
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { subscribeMessages, sendMessage, markThreadRead } from '../lib/chat';
import { ChatMessageBubble } from '../components/ChatMessageBubble';
import { useAuthUser } from '../hooks/useAuthUser';
import type { ChatMessage } from '../lib/types';
import { CHAT_MESSAGE_MAX } from '../lib/types';

export function MessaggiPage() {
  const { gameId = '' } = useParams();
  const user = useAuthUser();
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user || !gameId) return;
    return subscribeMessages(gameId, user.uid, setMsgs);
  }, [gameId, user?.uid]);

  useEffect(() => {
    if (!user || !gameId) return;
    markThreadRead(gameId, user.uid).catch(() => {});
  }, [gameId, user?.uid]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length]);

  async function onSend() {
    if (!user || !gameId) return;
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      await sendMessage(gameId, user.uid, user.uid, 'player', t);
      setText('');
    } finally { setSending(false); }
  }

  return (
    <section className="flex flex-col h-full p-4">
      <h2 className="text-xl font-bold mb-2">Messaggi al Comitato</h2>
      <div className="flex-1 overflow-auto space-y-2 pb-2">
        {msgs.length === 0 && <p className="text-gray-500">Nessun messaggio. Scrivi al Comitato!</p>}
        {msgs.map((m) => <ChatMessageBubble key={m.id} m={m} currentUid={user?.uid ?? ''} />)}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 pt-2 border-t">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, CHAT_MESSAGE_MAX))}
          className="flex-1 border rounded px-2 py-1 text-sm"
          rows={2}
          placeholder="Scrivi un messaggio…"
        />
        <button onClick={onSend} disabled={sending || !text.trim()} className="px-3 rounded bg-blue-600 text-white text-sm disabled:opacity-50">
          Invia
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Build + Commit**

```
npx tsc -b --noEmit
```

```bash
git add src/pages/MessaggiPage.tsx
git commit -m "feat(pages): MessaggiPage for player↔Comitato chat"
```

---

## Task 14: `AdminAnnunciPage`

**Files:**
- Create: `src/pages/admin/AdminAnnunciPage.tsx`

- [ ] **Step 1: Implementazione**

```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  subscribeAllAnnouncements, createAnnouncement, publishAnnouncement,
  editPublishedAnnouncement, updateDraftAnnouncement, softDeleteAnnouncement,
} from '../../lib/announcements';
import { TargetPicker, type Player } from '../../components/TargetPicker';
import { useAuthUser } from '../../hooks/useAuthUser';
import type { Announcement } from '../../lib/types';
import { ANNOUNCEMENT_TITLE_MAX, ANNOUNCEMENT_BODY_MAX } from '../../lib/types';

type Draft = { id?: string; title: string; body: string; targetUids: string[] | null; status: 'draft' | 'published' };

export function AdminAnnunciPage() {
  const { gameId = '' } = useParams();
  const user = useAuthUser();
  const [items, setItems] = useState<Announcement[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tab, setTab] = useState<'draft' | 'published'>('published');
  const [editing, setEditing] = useState<Draft | null>(null);

  useEffect(() => { if (gameId) return subscribeAllAnnouncements(gameId, setItems); }, [gameId]);
  useEffect(() => {
    if (!gameId) return;
    return onSnapshot(collection(db, `games/${gameId}/players`), (snap) => {
      setPlayers(snap.docs.map((d) => ({ uid: d.id, name: (d.data().name as string) ?? d.id })));
    });
  }, [gameId]);

  const visible = items.filter((a) => !a.deletedAt && a.status === tab);

  async function save(publish: boolean) {
    if (!editing || !user) return;
    const payload = { title: editing.title.slice(0, ANNOUNCEMENT_TITLE_MAX), body: editing.body.slice(0, ANNOUNCEMENT_BODY_MAX), targetUids: editing.targetUids };
    if (!editing.id) {
      await createAnnouncement(gameId, user.uid, { ...payload, status: publish ? 'published' : 'draft' });
    } else if (editing.status === 'draft' && publish) {
      await updateDraftAnnouncement(gameId, editing.id, payload);
      await publishAnnouncement(gameId, editing.id);
    } else if (editing.status === 'draft') {
      await updateDraftAnnouncement(gameId, editing.id, payload);
    } else {
      await editPublishedAnnouncement(gameId, editing.id, payload);
    }
    setEditing(null);
  }

  return (
    <section className="p-4 space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Annunci</h2>
        <button onClick={() => setEditing({ title: '', body: '', targetUids: null, status: 'draft' })} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">Nuovo</button>
      </header>
      <nav className="flex gap-2 border-b">
        {(['published', 'draft'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 text-sm ${tab === t ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-500'}`}>
            {t === 'draft' ? 'Bozze' : 'Pubblicati'}
          </button>
        ))}
      </nav>
      <ul className="space-y-2">
        {visible.map((a) => (
          <li key={a.id} className="rounded border p-3">
            <div className="flex items-baseline justify-between">
              <strong>{a.title}</strong>
              <div className="flex gap-2 text-xs">
                <button onClick={() => setEditing({ id: a.id, title: a.title, body: a.body, targetUids: a.targetUids, status: a.status })} className="underline">Modifica</button>
                <button onClick={() => softDeleteAnnouncement(gameId, a.id)} className="text-red-600 underline">Elimina</button>
              </div>
            </div>
            <p className="text-sm mt-1 whitespace-pre-wrap">{a.body}</p>
            <p className="text-xs text-gray-500 mt-1">
              {a.targetUids === null ? 'Tutti' : `${a.targetUids.length} destinatari`}
              {a.editedAt && ' · (modificato)'}
            </p>
          </li>
        ))}
      </ul>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-lg p-4 w-full max-w-lg space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold">{editing.id ? 'Modifica annuncio' : 'Nuovo annuncio'}</h3>
            <input
              className="w-full border rounded px-2 py-1"
              placeholder="Titolo"
              value={editing.title}
              maxLength={ANNOUNCEMENT_TITLE_MAX}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
            <textarea
              className="w-full border rounded px-2 py-1"
              rows={6}
              placeholder="Testo"
              value={editing.body}
              maxLength={ANNOUNCEMENT_BODY_MAX}
              onChange={(e) => setEditing({ ...editing, body: e.target.value })}
            />
            <TargetPicker players={players} value={editing.targetUids} onChange={(v) => setEditing({ ...editing, targetUids: v })} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(null)} className="px-3 py-1 text-sm">Annulla</button>
              {editing.status !== 'published' && (
                <button onClick={() => save(false)} className="px-3 py-1 text-sm rounded bg-gray-200">Salva bozza</button>
              )}
              <button onClick={() => save(true)} className="px-3 py-1 text-sm rounded bg-blue-600 text-white">
                {editing.status === 'published' ? 'Salva modifiche' : 'Pubblica'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Build + Commit**

```
npx tsc -b --noEmit
```

```bash
git add src/pages/admin/AdminAnnunciPage.tsx
git commit -m "feat(admin): AdminAnnunciPage with draft/publish/edit/delete"
```

---

## Task 15: `AdminMessaggiPage`

**Files:**
- Create: `src/pages/admin/AdminMessaggiPage.tsx`

- [ ] **Step 1: Implementazione**

```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { subscribeAllThreads, subscribeMessages, sendMessage, markThreadRead } from '../../lib/chat';
import { ChatMessageBubble } from '../../components/ChatMessageBubble';
import { useAuthUser } from '../../hooks/useAuthUser';
import type { ChatMessage, Thread } from '../../lib/types';
import { CHAT_MESSAGE_MAX } from '../../lib/types';

export function AdminMessaggiPage() {
  const { gameId = '' } = useParams();
  const user = useAuthUser();
  const [threads, setThreads] = useState<(Thread & { id: string })[]>([]);
  const [players, setPlayers] = useState<{ uid: string; name: string }[]>([]);
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');

  useEffect(() => { if (gameId) return subscribeAllThreads(gameId, setThreads); }, [gameId]);
  useEffect(() => {
    if (!gameId) return;
    return onSnapshot(collection(db, `games/${gameId}/players`), (snap) => {
      setPlayers(snap.docs.map((d) => ({ uid: d.id, name: (d.data().name as string) ?? d.id })));
    });
  }, [gameId]);
  useEffect(() => {
    if (!gameId || !activeUid) { setMsgs([]); return; }
    const unsub = subscribeMessages(gameId, activeUid, setMsgs);
    markThreadRead(gameId, activeUid).catch(() => {});
    return unsub;
  }, [gameId, activeUid]);

  async function onSend() {
    if (!user || !gameId || !activeUid) return;
    const t = text.trim();
    if (!t) return;
    await sendMessage(gameId, activeUid, user.uid, 'committee', t);
    setText('');
  }

  const playersWithoutThread = players.filter((p) => !threads.some((t) => t.id === p.uid));

  return (
    <section className="flex h-full">
      <aside className="w-64 border-r overflow-auto">
        <h3 className="p-3 font-bold">Conversazioni</h3>
        <ul>
          {threads.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => setActiveUid(t.id)}
                className={`w-full text-left p-3 hover:bg-gray-50 ${activeUid === t.id ? 'bg-gray-100' : ''}`}
              >
                <div className="flex justify-between">
                  <span className="font-medium text-sm">{t.playerName}</span>
                  {t.unreadByCommittee > 0 && <span className="text-xs bg-red-600 text-white rounded-full px-2">{t.unreadByCommittee}</span>}
                </div>
                <p className="text-xs text-gray-500 truncate">{t.lastMessagePreview}</p>
              </button>
            </li>
          ))}
        </ul>
        {playersWithoutThread.length > 0 && (
          <>
            <h4 className="p-3 pt-4 text-xs uppercase text-gray-500">Nuova conversazione</h4>
            <ul>
              {playersWithoutThread.map((p) => (
                <li key={p.uid}>
                  <button onClick={() => setActiveUid(p.uid)} className="w-full text-left p-3 text-sm hover:bg-gray-50">{p.name}</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
      <div className="flex-1 flex flex-col p-4">
        {!activeUid && <p className="text-gray-500">Seleziona una conversazione.</p>}
        {activeUid && (
          <>
            <div className="flex-1 overflow-auto space-y-2">
              {msgs.map((m) => <ChatMessageBubble key={m.id} m={m} currentUid={user?.uid ?? ''} />)}
              {msgs.length === 0 && <p className="text-gray-500 text-sm">Nessun messaggio.</p>}
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, CHAT_MESSAGE_MAX))}
                className="flex-1 border rounded px-2 py-1 text-sm"
                rows={2}
              />
              <button onClick={onSend} disabled={!text.trim()} className="px-3 rounded bg-blue-600 text-white text-sm disabled:opacity-50">Invia</button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Build + Commit**

```
npx tsc -b --noEmit
```

```bash
git add src/pages/admin/AdminMessaggiPage.tsx
git commit -m "feat(admin): AdminMessaggiPage with thread list + conversation pane"
```

---

## Task 16: Routing + Layout + badge

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Aggiungere routes**

In `src/App.tsx`, dentro il `<Routes>`, aggiungi (mantenendo la struttura esistente `games/:gameId/...`):

```tsx
import { BachecaPage } from './pages/BachecaPage';
import { MessaggiPage } from './pages/MessaggiPage';
import { AdminAnnunciPage } from './pages/admin/AdminAnnunciPage';
import { AdminMessaggiPage } from './pages/admin/AdminMessaggiPage';

// ...
<Route path="games/:gameId/bacheca" element={<BachecaPage />} />
<Route path="games/:gameId/messaggi" element={<MessaggiPage />} />
<Route path="games/:gameId/admin/annunci" element={<AdminAnnunciPage />} />
<Route path="games/:gameId/admin/messaggi" element={<AdminMessaggiPage />} />
```

**Nota per l'engineer:** adatta alla struttura routing esatta del progetto (controlla `App.tsx` attuale per capire se sono route relative/assolute).

- [ ] **Step 2: Layout — voci menu + badge**

In `src/components/Layout.tsx`, aggiungi due NavLink per il giocatore (`Bacheca`, `Messaggi`) e due per l'admin (`Annunci`, `Messaggi`). Per i badge sottoscrivi:

- Badge Bacheca: `subscribeAnnouncementsForPlayer(gameId, uid, items)` + lettura `lastAnnouncementReadAt` dal player doc, poi `countUnreadAnnouncements(items, lastReadAt)`.
- Badge Messaggi player: `subscribeThread(gameId, uid, t)` → `t?.unreadByPlayer ?? 0`.
- Badge Messaggi admin: `subscribeAllThreads(gameId, ts)` → `ts.reduce((s, t) => s + t.unreadByCommittee, 0)`.

Render badge: `<span className="ml-2 text-xs bg-red-600 text-white rounded-full px-2">{n}</span>` solo se `n > 0`.

- [ ] **Step 3: Init push al login**

Sempre in `Layout.tsx` o nell'equivalente entry autenticato del progetto, chiama `initPushForUser(user.uid)` una volta al login. Mostra un banner dismissibile se la chiamata ritorna `null` e `Notification.permission === 'default'`.

```tsx
import { initPushForUser } from '../lib/messaging';
// useEffect: if (user) initPushForUser(user.uid);
```

- [ ] **Step 4: Build**

Run: `cd c:/Users/Utente/schedinone && npm run build`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/Layout.tsx
git commit -m "feat(nav): add messaging routes, sidebar entries, unread badges, push init"
```

---

## Task 17: Test pagina Bacheca (smoke)

**Files:**
- Create: `src/pages/__tests__/BachecaPage.test.tsx`

- [ ] **Step 1: Scrivere test render**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../lib/announcements', () => ({
  subscribeAnnouncementsForPlayer: (_g: string, _u: string, cb: (items: unknown[]) => void) => { cb([]); return () => {}; },
}));
vi.mock('../../hooks/useAuthUser', () => ({ useAuthUser: () => ({ uid: 'u1' }) }));
vi.mock('../../lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', async () => ({ doc: () => ({}), updateDoc: async () => {}, serverTimestamp: () => null }));

import { BachecaPage } from '../BachecaPage';

describe('BachecaPage', () => {
  it('renders empty state', () => {
    render(
      <MemoryRouter initialEntries={['/games/g1/bacheca']}>
        <Routes><Route path="/games/:gameId/bacheca" element={<BachecaPage />} /></Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/Nessun annuncio/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run**

Run: `npx vitest run src/pages/__tests__/BachecaPage.test.tsx`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/__tests__/BachecaPage.test.tsx
git commit -m "test(pages): BachecaPage empty state smoke test"
```

---

## Task 18: Guide utente

**Files:**
- Modify: `GUIDA_GIOCATORE.md`
- Modify: `GUIDA_COMITATO.md`

- [ ] **Step 1: Giocatore**

Aggiungi in fondo a `GUIDA_GIOCATORE.md`:

```markdown
## Bacheca e messaggi

Nella Bacheca trovi tutti gli annunci del Comitato. Da "Messaggi" puoi scrivere direttamente al Comitato per chiarimenti o domande.

### Notifiche push

Al primo accesso ti chiederemo il permesso per le notifiche. Se lo concedi, riceverai un avviso sul telefono quando arriva un nuovo annuncio o un nuovo messaggio.

**Su iPhone/iPad:** le notifiche funzionano solo se installi Schedinone come app. Apri il sito in Safari → tocca il pulsante Condividi → "Aggiungi a Home". Apri l'app da lì e accetta le notifiche.
```

- [ ] **Step 2: Comitato**

Aggiungi in fondo a `GUIDA_COMITATO.md`:

```markdown
## Annunci e messaggi

- **Annunci**: dalla sezione Annunci puoi scrivere bozze, pubblicarle a tutti o a un sottoinsieme di giocatori, modificarle o eliminarle in qualsiasi momento. Alla pubblicazione parte una notifica push ai destinatari.
- **Messaggi**: vedi la lista di tutte le conversazioni con i singoli giocatori. Puoi rispondere o aprire una conversazione nuova con "Nuova conversazione". Ogni nuovo messaggio notifica la controparte.
```

- [ ] **Step 3: Commit**

```bash
git add GUIDA_GIOCATORE.md GUIDA_COMITATO.md
git commit -m "docs: document announcements, chat and push notifications"
```

---

## Task 19: Deploy e verifica manuale

**Files:**
- None (deploy)

- [ ] **Step 1: Deploy rules + functions + hosting**

Run:
```
npm run build
firebase deploy --only firestore:rules
firebase deploy --only functions
firebase deploy --only hosting
```
Expected: deploy verdi. Se `firebase deploy --only functions` segnala Node 20 non attivo nel progetto, configurare da console.

- [ ] **Step 2: Generare VAPID key (una tantum)**

In Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → Generate key pair. Copia il valore, mettilo in `.env.local` come `VITE_FCM_VAPID_KEY=...`, ri-build, ri-deploy hosting.

- [ ] **Step 3: Checklist manuale**

Apri l'app con due browser (uno admin, uno player):

- [ ] Admin crea bozza → non visibile al player. PASS se non appare in Bacheca.
- [ ] Admin pubblica → appare al player entro 1s, arriva push.
- [ ] Admin modifica l'annuncio → appare `(modificato)`, nessuna nuova push.
- [ ] Admin soft-delete → annuncio sparisce dalla Bacheca del player.
- [ ] Player scrive al Comitato → thread nuovo compare in AdminMessaggi, push all'admin.
- [ ] Admin risponde → push al player, `unreadByPlayer` si azzera quando il player apre la pagina.
- [ ] Admin crea conversazione nuova con player che non ha mai scritto → thread creato, push arriva.
- [ ] Annuncio mirato a un sottoinsieme → arriva solo ai destinatari.

- [ ] **Step 4: Commit (se servono fix)**

Per ogni correzione: commit con messaggio dedicato `fix(...): ...`.

---

## Self-review (fatta in fase di plan writing)

- **Spec coverage**: ogni sezione dello spec è coperta: modello dati (Task 1), Rules (2-3), Functions (4-7), Frontend (8-15), routing/layout (16), test (9, 10, 17), docs (18), deploy (19). ✔
- **Placeholder scan**: nessun "TBD"/"TODO implementare". Le note "usa l'hook esistente" indicano un adapter che l'engineer deve raccordare al codice reale (Task 12/13 notano esplicitamente di controllare `src/lib/auth.ts` e le route esistenti) — è integrazione, non placeholder. ✔
- **Type consistency**: `Announcement`, `Thread`, `ChatMessage` definiti in Task 1 e usati coerentemente in Task 9/10/11/12/13/14/15. `markThreadRead` firma `{ gameId, threadUid }` coerente tra callable (Task 7) e wrapper client (Task 10). `sendPushToUids` firma coerente tra helper (Task 4) e call sites (Task 5-6). ✔
- **Scope**: tutto in un singolo spec/plan; non è decomponibile in sub-progetti indipendenti (annunci e chat condividono rules/functions/push setup). ✔

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-23-messaggistica-giocatori.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — un subagent fresco per task + review a checkpoint.
2. **Inline Execution** — esecuzione in questa sessione con batching e checkpoint.

**Quale preferisci?**
