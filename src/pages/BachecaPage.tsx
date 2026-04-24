import { useEffect, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscribeAnnouncementsForPlayer } from '../lib/announcements';
import { AnnouncementCard } from '../components/AnnouncementCard';
import type { Announcement } from '../lib/types';

type Props = { gameId: string; playerUid: string };

export default function BachecaPage({ gameId, playerUid }: Props) {
  const [items, setItems] = useState<Announcement[]>([]);

  useEffect(() => {
    if (!playerUid || !gameId) return;
    return subscribeAnnouncementsForPlayer(gameId, playerUid, setItems);
  }, [gameId, playerUid]);

  useEffect(() => {
    if (!playerUid || !gameId) return;
    updateDoc(doc(db, `games/${gameId}/players/${playerUid}`), {
      lastAnnouncementReadAt: serverTimestamp(),
    }).catch(() => {});
  }, [gameId, playerUid]);

  return (
    <section className="p-4 space-y-3">
      <h2 className="text-xl font-bold">Bacheca</h2>
      {items.length === 0 && <p className="text-gray-500">Nessun annuncio.</p>}
      {items.map((a) => <AnnouncementCard key={a.id} a={a} />)}
    </section>
  );
}
