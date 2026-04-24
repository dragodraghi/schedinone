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
