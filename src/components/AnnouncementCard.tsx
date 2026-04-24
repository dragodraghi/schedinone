import type { Announcement } from '../lib/types';

export function AnnouncementCard({ a }: { a: Announcement }) {
  const when = a.publishedAt?.toDate().toLocaleString('it-IT') ?? '';
  return (
    <article className="rounded-lg border border-gray-200 p-4 bg-white shadow-sm">
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold">{a.title}</h3>
        <time className="text-xs text-gray-500">{when}</time>
      </header>
      <p className="mt-2 whitespace-pre-wrap text-sm">{a.body}</p>
      {a.editedAt && <p className="mt-1 text-xs italic text-gray-400">(modificato)</p>}
    </article>
  );
}
