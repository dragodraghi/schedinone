import { useEffect, useRef, useState } from "react";
import { AnnouncementCard } from "./AnnouncementCard";
import type { Announcement } from "../lib/types";

type Props = {
  announcements: Announcement[];
  onConfirm: () => Promise<void> | void;
};

export function AnnouncementLoginModal({ announcements, onConfirm }: Props) {
  const [confirming, setConfirming] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  if (announcements.length === 0) return null;

  const handleConfirm = async () => {
    if (confirming) return;
    setConfirming(true);
    await onConfirm();
    setConfirming(false);
  };

  const handleContentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target.closest("a") : null;
    if (!(target instanceof HTMLAnchorElement)) return;

    const url = new URL(target.href);
    if (url.origin !== window.location.origin) return;

    event.preventDefault();
    void handleConfirm().finally(() => {
      window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto px-3 py-4 sm:items-center sm:p-6"
      style={{ background: "rgba(4, 8, 16, 0.88)", backdropFilter: "blur(10px)" }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-announcements-title"
        className="modal-panel w-full max-w-2xl overflow-hidden"
      >
        <header className="border-b border-slate-700/70 px-4 py-4 sm:px-5">
          <p className="page-kicker">Comitato</p>
          <h2 id="login-announcements-title" className="mt-1 text-2xl font-black tracking-tight text-white">
            Annunci da leggere
          </h2>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-300">
            Prima di continuare leggi le comunicazioni del Comitato.
          </p>
        </header>

        <div className="max-h-[58vh] space-y-3 overflow-y-auto bg-slate-100 p-3 sm:p-4" onClick={handleContentClick}>
          {announcements.map((announcement) => (
            <AnnouncementCard key={announcement.id} a={announcement} />
          ))}
        </div>

        <footer className="flex justify-end border-t border-slate-700/70 px-4 py-4 sm:px-5">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={confirming}
            className="min-h-11 rounded-lg px-5 text-sm font-black uppercase tracking-wide transition active:scale-95 disabled:cursor-wait disabled:opacity-70"
            style={{ background: "linear-gradient(135deg, #00d4ff, #2dd481)", color: "#040810" }}
          >
            {confirming ? "Confermo..." : "Ho letto"}
          </button>
        </footer>
      </section>
    </div>
  );
}
