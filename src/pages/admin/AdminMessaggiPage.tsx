import { useEffect, useState } from 'react';
import { subscribeAllThreads, subscribeMessages, sendMessage, markThreadRead } from '../../lib/chat';
import { ChatMessageBubble } from '../../components/ChatMessageBubble';
import type { ChatMessage, Thread, Player as GamePlayer } from '../../lib/types';
import { CHAT_MESSAGE_MAX } from '../../lib/types';

type Props = { gameId: string; currentUid: string; players: GamePlayer[] };

export default function AdminMessaggiPage({ gameId, currentUid, players }: Props) {
  const [threads, setThreads] = useState<(Thread & { id: string })[]>([]);
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    if (gameId) return subscribeAllThreads(gameId, setThreads);
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !activeUid) {
      setMsgs([]);
      return;
    }
    const unsub = subscribeMessages(gameId, activeUid, setMsgs);
    markThreadRead(gameId, activeUid).catch(() => {});
    return unsub;
  }, [gameId, activeUid]);

  async function onSend() {
    if (!gameId || !activeUid) return;
    const t = text.trim();
    if (!t) return;
    await sendMessage(gameId, activeUid, currentUid, 'committee', t);
    setText('');
  }

  const playersWithoutThread = players.filter((p) => !threads.some((t) => t.id === p.id));

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
                  {t.unreadByCommittee > 0 && (
                    <span className="text-xs bg-red-600 text-white rounded-full px-2">{t.unreadByCommittee}</span>
                  )}
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
                <li key={p.id}>
                  <button onClick={() => setActiveUid(p.id)} className="w-full text-left p-3 text-sm hover:bg-gray-50">
                    {p.name}
                  </button>
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
              {msgs.map((m) => <ChatMessageBubble key={m.id} m={m} currentUid={currentUid} />)}
              {msgs.length === 0 && <p className="text-gray-500 text-sm">Nessun messaggio.</p>}
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, CHAT_MESSAGE_MAX))}
                className="flex-1 border rounded px-2 py-1 text-sm"
                style={{ background: '#ffffff', color: '#0f172a' }}
                rows={2}
              />
              <button
                onClick={onSend}
                disabled={!text.trim()}
                className="px-3 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
              >
                Invia
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
