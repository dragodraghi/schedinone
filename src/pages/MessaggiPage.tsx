import { useEffect, useRef, useState } from 'react';
import { subscribeMessages, subscribeThread, sendMessage, markThreadRead } from '../lib/chat';
import { ChatMessageBubble } from '../components/ChatMessageBubble';
import type { ChatMessage, Thread } from '../lib/types';
import { CHAT_MESSAGE_MAX } from '../lib/types';

type Props = { gameId: string; playerUid: string; currentAuthUid?: string };

export default function MessaggiPage({ gameId, playerUid, currentAuthUid }: Props) {
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [thread, setThread] = useState<Thread | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!gameId || !playerUid) return;
    return subscribeMessages(gameId, playerUid, setMsgs);
  }, [gameId, playerUid]);

  useEffect(() => {
    if (!gameId || !playerUid) return;
    return subscribeThread(gameId, playerUid, setThread);
  }, [gameId, playerUid]);

  useEffect(() => {
    if (!gameId || !playerUid || (thread?.unreadByPlayer ?? 0) <= 0) return;
    markThreadRead(gameId, playerUid).catch(() => {});
  }, [gameId, playerUid, thread?.unreadByPlayer]);

  useEffect(() => {
    if (typeof endRef.current?.scrollIntoView === 'function') {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [msgs.length]);

  async function onSend() {
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      await sendMessage(gameId, playerUid, currentAuthUid || playerUid, 'player', t);
      setText('');
    } finally {
      setSending(false);
    }
  }

  return (
    <section aria-label="Messaggi privati" className="mx-auto flex min-h-[calc(100dvh-150px)] max-w-2xl flex-col space-y-3 animate-in">
      <header className="page-head shrink-0">
        <div>
          <p className="page-kicker">Linea diretta</p>
          <h1 className="text-2xl sm:text-3xl font-black mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Messaggi al Comitato
          </h1>
        </div>
      </header>

      <div className="surface-panel flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-auto space-y-2 p-3 sm:p-4">
          {msgs.length === 0 && (
            <div className="h-full min-h-[220px] flex items-center justify-center text-center px-6">
              <div>
                <p className="text-lg font-black" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
                  Nessun messaggio
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  Scrivi qui al Comitato per dubbi, correzioni o comunicazioni.
                </p>
              </div>
            </div>
          )}
          {msgs.map((m) => (
            <ChatMessageBubble
              key={m.id}
              m={m}
              currentUid={currentAuthUid || playerUid}
              viewerRole="player"
            />
          ))}
          <div ref={endRef} />
        </div>

        <div className="border-t p-3" style={{ borderColor: 'var(--border)' }}>
          <div data-testid="player-message-composer" className="flex flex-col gap-2 sm:flex-row">
            <textarea
              aria-label="Testo del messaggio"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, CHAT_MESSAGE_MAX))}
              className="app-field min-h-[76px] flex-1 resize-none px-3 py-2 text-base leading-relaxed sm:min-h-[52px] sm:text-sm"
              rows={3}
              placeholder="Scrivi un messaggio..."
            />
            <button
              type="button"
              onClick={onSend}
              disabled={sending || !text.trim()}
              className="primary-action w-full px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-40 sm:w-24"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              {sending ? 'Invio' : 'Invia'}
            </button>
          </div>
          <p className="text-[10px] mt-2 text-right" style={{ color: 'var(--text-muted)' }}>
            {text.length}/{CHAT_MESSAGE_MAX}
          </p>
        </div>
      </div>
    </section>
  );
}
