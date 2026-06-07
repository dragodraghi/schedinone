import type { Announcement } from '../lib/types';

export function AnnouncementCard({ a }: { a: Announcement }) {
  const when = a.publishedAt?.toDate().toLocaleString('it-IT') ?? '';
  return (
    <article className="rounded-lg border border-slate-300 bg-white p-4 text-slate-950 shadow-sm">
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="font-black tracking-tight">{a.title}</h3>
        <time className="shrink-0 text-xs font-semibold text-slate-600">{when}</time>
      </header>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed text-slate-900">{a.body}</p>
      {a.editedAt && <p className="mt-1 text-xs italic text-slate-500">(modificato)</p>}
    </article>
  );
}
