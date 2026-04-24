import { useEffect, useRef, useState } from 'react';
import { subscribeMessages, sendMessage, markThreadRead } from '../lib/chat';
import { ChatMessageBubble } from '../components/ChatMessageBubble';
import type { ChatMessage } from '../lib/types';
import { CHAT_MESSAGE_MAX } from '../lib/types';

type Props = { gameId: string; playerUid: string };

export default function MessaggiPage({ gameId, playerUid }: Props) {
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!gameId || !playerUid) return;
    return subscribeMessages(gameId, playerUid, setMsgs);
  }, [gameId, playerUid]);

  useEffect(() => {
    if (!gameId || !playerUid) return;
    markThreadRead(gameId, playerUid).catch(() => {});
  }, [gameId, playerUid]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  async function onSend() {
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      await sendMessage(gameId, playerUid, playerUid, 'player', t);
      setText('');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="flex flex-col h-full p-4">
      <h2 className="text-xl font-bold mb-2">Messaggi al Comitato</h2>
      <div className="flex-1 overflow-auto space-y-2 pb-2">
        {msgs.length === 0 && (
          <p className="text-gray-500">Nessun messaggio. Scrivi al Comitato!</p>
        )}
        {msgs.map((m) => <ChatMessageBubble key={m.id} m={m} currentUid={playerUid} />)}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 pt-2 border-t">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, CHAT_MESSAGE_MAX))}
          className="flex-1 border rounded px-2 py-1 text-sm"
          style={{ background: '#ffffff', color: '#0f172a' }}
          rows={2}
          placeholder="Scrivi un messaggio…"
        />
        <button
          onClick={onSend}
          disabled={sending || !text.trim()}
          className="px-3 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
        >
          Invia
        </button>
      </div>
    </section>
  );
}
