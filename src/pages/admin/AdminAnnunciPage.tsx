import { useEffect, useState } from 'react';
import {
  subscribeAllAnnouncements, createAnnouncement, publishAnnouncement,
  editPublishedAnnouncement, updateDraftAnnouncement, softDeleteAnnouncement,
} from '../../lib/announcements';
import { TargetPicker } from '../../components/TargetPicker';
import type { Announcement } from '../../lib/types';
import { ANNOUNCEMENT_TITLE_MAX, ANNOUNCEMENT_BODY_MAX } from '../../lib/types';
import type { Player as GamePlayer } from '../../lib/types';

type Props = { gameId: string; currentUid: string; players: GamePlayer[] };

type Draft = {
  id?: string;
  title: string;
  body: string;
  targetUids: string[] | null;
  status: 'draft' | 'published';
};

export default function AdminAnnunciPage({ gameId, currentUid, players }: Props) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [tab, setTab] = useState<'draft' | 'published'>('published');
  const [editing, setEditing] = useState<Draft | null>(null);

  useEffect(() => {
    if (gameId) return subscribeAllAnnouncements(gameId, setItems);
  }, [gameId]);

  const visible = items.filter((a) => !a.deletedAt && a.status === tab);
  const pickerPlayers = players.map((p) => ({ uid: p.id, name: p.name }));

  async function save(publish: boolean) {
    if (!editing) return;
    const payload = {
      title: editing.title.slice(0, ANNOUNCEMENT_TITLE_MAX),
      body: editing.body.slice(0, ANNOUNCEMENT_BODY_MAX),
      targetUids: editing.targetUids,
    };
    if (!editing.id) {
      await createAnnouncement(gameId, currentUid, { ...payload, status: publish ? 'published' : 'draft' });
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
        <button
          onClick={() => setEditing({ title: '', body: '', targetUids: null, status: 'draft' })}
          className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
        >
          Nuovo
        </button>
      </header>
      <nav className="flex gap-2 border-b">
        {(['published', 'draft'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 text-sm ${tab === t ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-500'}`}
          >
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
                <button
                  onClick={() => setEditing({ id: a.id, title: a.title, body: a.body, targetUids: a.targetUids, status: a.status })}
                  className="underline"
                >
                  Modifica
                </button>
                <button
                  onClick={() => softDeleteAnnouncement(gameId, a.id)}
                  className="text-red-600 underline"
                >
                  Elimina
                </button>
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
            <TargetPicker
              players={pickerPlayers}
              value={editing.targetUids}
              onChange={(v) => setEditing({ ...editing, targetUids: v })}
            />
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
