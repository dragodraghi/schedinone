import type { ReactNode } from 'react';
import type { Announcement } from '../lib/types';

const linkPattern = /(https?:\/\/[^\s]+|\/[a-z0-9][^\s]*)/gi;
const goldenPlusPattern = /(^|\s)(\/golden-plus|https?:\/\/[^\s]+\/golden-plus)(?=\s|$|[.,;:!?])/i;

function trimTrailingPunctuation(value: string): { href: string; trailing: string } {
  const match = value.match(/[.,;:!?)]*$/);
  const trailing = match?.[0] ?? "";
  return {
    href: trailing ? value.slice(0, -trailing.length) : value,
    trailing,
  };
}

function renderLinkedText(text: string) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(linkPattern)) {
    const raw = match[0];
    const index = match.index ?? 0;
    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }

    const { href, trailing } = trimTrailingPunctuation(raw);
    const isExternal = href.startsWith("http");
    nodes.push(
      <a
        key={`${href}-${index}`}
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noreferrer" : undefined}
        className="font-black text-blue-700 underline decoration-2 underline-offset-2"
      >
        {href}
      </a>
    );
    if (trailing) nodes.push(trailing);
    lastIndex = index + raw.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function AnnouncementBodyText({ body }: { body: string }) {
  return <>{renderLinkedText(body)}</>;
}

export function AnnouncementCard({ a }: { a: Announcement }) {
  const when = a.publishedAt?.toDate().toLocaleString('it-IT') ?? '';
  const hasGoldenPlusLink = goldenPlusPattern.test(a.body);
  return (
    <article className="rounded-lg border border-slate-300 bg-white p-4 text-slate-950 shadow-sm">
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="font-black tracking-tight">{a.title}</h3>
        <time className="shrink-0 text-xs font-semibold text-slate-600">{when}</time>
      </header>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed text-slate-900"><AnnouncementBodyText body={a.body} /></p>
      {hasGoldenPlusLink && (
        <a
          href="/golden-plus"
          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-black uppercase tracking-wide text-white shadow-sm transition hover:bg-blue-800"
        >
          Partecipa al Golden Plus
        </a>
      )}
      {a.editedAt && <p className="mt-1 text-xs italic text-slate-500">(modificato)</p>}
    </article>
  );
}
