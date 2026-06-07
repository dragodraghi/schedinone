import type { ChatFrom, ChatMessage } from '../lib/types';

export function ChatMessageBubble({
  m,
  currentUid,
  viewerRole,
}: {
  m: ChatMessage;
  currentUid: string;
  viewerRole?: ChatFrom;
}) {
  const mine = viewerRole ? m.from === viewerRole : m.senderUid === currentUid;
  const when = m.createdAt?.toDate?.().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) ?? '';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[min(86vw,34rem)] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm"
        style={{
          background: mine ? '#2563eb' : '#ffffff',
          color: mine ? '#ffffff' : '#0f172a',
          border: mine ? 'none' : '1px solid #e2e8f0',
        }}
      >
        <p className="whitespace-pre-wrap break-words" style={{ color: 'inherit' }}>{m.text}</p>
        <p className="mt-1 text-[10px]" style={{ color: mine ? '#bfdbfe' : '#64748b' }}>{when}</p>
      </div>
    </div>
  );
}
