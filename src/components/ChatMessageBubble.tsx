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
