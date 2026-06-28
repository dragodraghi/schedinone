import { useEffect, useState } from 'react';
import {
  subscribeAllThreads,
  subscribeMessages,
  sendMessage,
  sendBulkCommitteeMessage,
  markThreadRead,
  deleteChatMessage,
} from '../../lib/chat';
import { ChatMessageBubble } from '../../components/ChatMessageBubble';
import type { ChatMessage, Thread, Player as GamePlayer } from '../../lib/types';
import { CHAT_MESSAGE_MAX } from '../../lib/types';

type Props = { gameId: string; currentUid: string; players: GamePlayer[] };
type ThreadWithId = Thread & { id: string };
type ThreadFilter = 'all' | 'unread';

const quickReplies = [
  'Pagamento ricevuto, grazie.',
  'La schedina risulta ancora incompleta: controlla tutti i pronostici e le scelte speciali.',
  'Abbiamo ricevuto il messaggio, ti rispondiamo appena possibile.',
  'Per recupero accesso o cambio dispositivo scrivici qui il nome squadra.',
];

function threadTime(thread: Thread): number {
  return thread.lastMessageAt.toDate().getTime();
}

function matchesSearch(name: string, search: string): boolean {
  return name.toLocaleLowerCase('it-IT').includes(search.toLocaleLowerCase('it-IT').trim());
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function AdminMessaggiPage({ gameId, currentUid, players }: Props) {
  const [threads, setThreads] = useState<ThreadWithId[]>([]);
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState<ThreadFilter>('all');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkNotice, setBulkNotice] = useState('');
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string>('');
  const activeThread = threads.find((t) => t.id === activeUid);

  useEffect(() => {
    if (gameId) return subscribeAllThreads(gameId, setThreads);
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !activeUid) {
      return;
    }
    const unsub = subscribeMessages(gameId, activeUid, setMsgs);
    return unsub;
  }, [gameId, activeUid]);

  useEffect(() => {
    if (!gameId || !activeUid || (activeThread?.unreadByCommittee ?? 0) <= 0) return;
    const threadUid = activeUid;
    setThreads((items) => items.map((thread) => (
      thread.id === threadUid ? { ...thread, unreadByCommittee: 0 } : thread
    )));
    markThreadRead(gameId, threadUid).catch((error: unknown) => {
      const msg = getErrorMessage(error);
      setLastError(`Non riesco a segnare come letto: ${msg}`);
      setTimeout(() => setLastError(''), 7000);
    });
  }, [gameId, activeUid, activeThread?.unreadByCommittee]);

  async function onSend() {
    if (!gameId || !activeUid || sending) return;
    const t = text.trim();
    if (!t) return;
    setLastError('');
    setSending(true);
    try {
      await sendMessage(gameId, activeUid, currentUid, 'committee', t);
      setText('');
    } catch (e: unknown) {
      const msg = getErrorMessage(e);
      setLastError(msg);
      setTimeout(() => setLastError(''), 5000);
    } finally {
      setSending(false);
    }
  }

  async function onBulkSend() {
    if (!gameId || bulkSending) return;
    const t = bulkText.trim();
    if (!t) return;
    setLastError('');
    setBulkNotice('');
    setBulkSending(true);
    try {
      const result = await sendBulkCommitteeMessage(gameId, t);
      setBulkText('');
      setBulkNotice(`Messaggio inviato a ${result.sent} giocatori.`);
    } catch (e: unknown) {
      const msg = getErrorMessage(e);
      setLastError(msg);
      setTimeout(() => setLastError(''), 5000);
    } finally {
      setBulkSending(false);
    }
  }

  async function onDeleteMessage(messageId: string) {
    if (!gameId || !activeUid || deletingMessageId) return;
    if (!window.confirm('Eliminare questo messaggio?')) return;
    setLastError('');
    setDeletingMessageId(messageId);
    try {
      await deleteChatMessage(gameId, activeUid, messageId);
    } catch (e: unknown) {
      const msg = getErrorMessage(e);
      setLastError(msg);
      setTimeout(() => setLastError(''), 5000);
    } finally {
      setDeletingMessageId(null);
    }
  }

  const activePlayer = players.find((p) => p.id === activeUid);
  const activeName = activeThread?.playerName ?? activePlayer?.name ?? 'Giocatore';
  const searchText = search.trim();
  const unreadTotal = threads.reduce((total, thread) => total + thread.unreadByCommittee, 0);
  const sortedThreads = [...threads].sort((a, b) => {
    const unreadDiff = Number(b.unreadByCommittee > 0) - Number(a.unreadByCommittee > 0);
    if (unreadDiff !== 0) return unreadDiff;
    return threadTime(b) - threadTime(a);
  });
  const visibleThreads = sortedThreads.filter((thread) => (
    (filter === 'all' || thread.unreadByCommittee > 0) && matchesSearch(thread.playerName, searchText)
  ));
  const playersWithoutThread = players.filter((p) => (
    !threads.some((t) => t.id === p.id)
    && filter === 'all'
    && matchesSearch(p.name, searchText)
  ));

  return (
    <section aria-label="Gestione messaggi privati" className="mx-auto flex min-h-[70vh] max-w-6xl flex-col overflow-hidden rounded-xl bg-white text-slate-900 lg:flex-row">
      {lastError && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            bottom: 90,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#fee2e2',
            color: '#991b1b',
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: 12,
            zIndex: 50,
          }}
        >
          Errore: {lastError}
        </div>
      )}
      <div className="border-b border-amber-200 bg-amber-50 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="block flex-1">
            <span className="block text-xs font-bold text-amber-900">Messaggio privato a tutti</span>
            <textarea
              aria-label="Testo massivo per tutti"
              value={bulkText}
              onChange={(e) => {
                setBulkNotice('');
                setBulkText(e.target.value.slice(0, CHAT_MESSAGE_MAX));
              }}
              className="mt-2 min-h-[76px] w-full resize-none rounded border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-600"
              rows={3}
              placeholder="Scrivi un messaggio per tutti"
            />
          </label>
          <div className="flex shrink-0 items-center justify-between gap-3 lg:w-48 lg:flex-col lg:items-stretch">
            <span className="text-[10px] text-amber-900">{bulkText.length}/{CHAT_MESSAGE_MAX}</span>
            <button
              type="button"
              onClick={onBulkSend}
              disabled={bulkSending || !bulkText.trim() || players.length === 0}
              className="rounded bg-amber-600 px-3 py-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkSending ? 'Invio...' : `Invia a tutti${players.length > 0 ? ` (${players.length})` : ''}`}
            </button>
          </div>
        </div>
        {bulkNotice && <p className="mt-2 text-xs font-semibold text-emerald-700">{bulkNotice}</p>}
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="max-h-[36vh] w-full shrink-0 overflow-auto border-b border-slate-200 bg-slate-50 lg:max-h-none lg:w-80 lg:border-b-0 lg:border-r">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold">Messaggi Comitato</h2>
                <p className="text-xs text-slate-500">{threads.length} conversazioni</p>
              </div>
              {unreadTotal > 0 && (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {unreadTotal}
                </span>
              )}
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-3 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600"
              placeholder="Cerca squadra"
              type="search"
            />
            <div className="mt-3 grid grid-cols-2 rounded border border-slate-300 bg-white p-1">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`rounded px-2 py-1.5 text-sm font-medium ${filter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Tutte
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`rounded px-2 py-1.5 text-sm font-medium ${filter === 'unread' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Non lette
              </button>
            </div>
          </div>
          <ul>
            {visibleThreads.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setActiveUid(t.id)}
                  className={`w-full border-b border-slate-200 p-3 text-left hover:bg-white ${activeUid === t.id ? 'bg-white' : ''}`}
                >
                  <div className="flex justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold">{t.playerName}</span>
                    {t.unreadByCommittee > 0 && (
                      <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                        {t.unreadByCommittee}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">{t.lastMessagePreview}</p>
                </button>
              </li>
            ))}
          </ul>
          {playersWithoutThread.length > 0 && (
            <>
              <h3 className="px-3 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nuova conversazione
              </h3>
              <ul>
                {playersWithoutThread.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setActiveUid(p.id)}
                      className={`w-full border-b border-slate-200 p-3 text-left text-sm hover:bg-white ${activeUid === p.id ? 'bg-white font-semibold' : ''}`}
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {visibleThreads.length === 0 && playersWithoutThread.length === 0 && (
            <p className="p-4 text-sm text-slate-500">Nessun risultato.</p>
          )}
        </aside>
        <div className="flex min-h-[58vh] min-w-0 flex-1 flex-col">
          {!activeUid && (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-slate-500">
              Seleziona una conversazione.
            </div>
          )}
          {activeUid && (
            <>
              <header className="border-b border-slate-200 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold">{activeName}</h3>
                    <p className="text-xs text-slate-500">Chat privata con il Comitato</p>
                  </div>
                  {(activeThread?.unreadByCommittee ?? 0) > 0 && (
                    <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                      Da leggere
                    </span>
                  )}
                </div>
              </header>
              <div className="flex-1 overflow-auto space-y-2 bg-slate-100 p-3 sm:p-4">
                {msgs.map((m) => {
                  const mine = m.senderUid === currentUid;
                  return (
                    <div key={m.id} className="space-y-1">
                      <ChatMessageBubble m={m} currentUid={currentUid} />
                      <div className={mine ? 'text-right' : 'text-left'}>
                        <button
                          type="button"
                          aria-label={`Elimina messaggio: ${m.text.slice(0, 40)}`}
                          onClick={() => void onDeleteMessage(m.id)}
                          disabled={deletingMessageId !== null}
                          className="rounded px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingMessageId === m.id ? 'Elimino...' : 'Elimina'}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {msgs.length === 0 && <p className="text-sm text-slate-500">Nessun messaggio.</p>}
              </div>
              <div className="border-t border-slate-200 bg-white p-3">
                <div className="mb-2 flex flex-wrap gap-2">
                  {quickReplies.map((reply) => (
                    <button
                      key={reply}
                      type="button"
                      onClick={() => setText(reply)}
                      className="rounded border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-blue-600 hover:text-blue-700"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
                <div data-testid="committee-message-composer" className="flex flex-col gap-2 sm:flex-row">
                  <textarea
                    aria-label="Testo del messaggio"
                    value={text}
                    onChange={(e) => setText(e.target.value.slice(0, CHAT_MESSAGE_MAX))}
                    className="min-h-[76px] flex-1 resize-none rounded border border-slate-300 bg-white px-3 py-2 text-base leading-relaxed text-slate-900 outline-none focus:border-blue-600 sm:min-h-[52px] sm:text-sm"
                    rows={3}
                    placeholder="Scrivi al giocatore"
                  />
                  <button
                    type="button"
                    onClick={onSend}
                    disabled={sending || !text.trim()}
                    className="w-full rounded bg-blue-600 px-3 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-24"
                  >
                    {sending ? 'Invio...' : 'Invia'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
