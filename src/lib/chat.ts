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
