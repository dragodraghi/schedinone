import { useCallback, useEffect, useState, type ReactNode } from "react";
import { NavLink, Link } from "react-router-dom";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { vibrate } from "../lib/haptic";
import Chatbot from "./Chatbot";
import { subscribeThread } from "../lib/chat";

const baseTabs = [
  { to: "/", label: "Home", icon: "⚡" },
  { to: "/schedina", label: "Schedina", icon: "📋" },
  { to: "/classifica", label: "Ranking", icon: "🏆" },
];

const playerExtraTabs = [
  { to: "/bacheca", label: "Bacheca", icon: "📢" },
  { to: "/profilo", label: "Profilo", icon: "👤" },
];

// Admin sees Admin tab in place of Griglione (which is reachable from the
// admin panel as "Riepilogo Schedine"). Keeps the tab bar at 5 items total.
const adminExtraTabs = [
  { to: "/profilo", label: "Profilo", icon: "👤" },
  { to: "/admin", label: "Admin", icon: "⚙️" },
];

export default function Layout({
  children,
  isAdmin,
  gameId,
  currentUid,
}: {
  children: ReactNode;
  isAdmin?: boolean;
  gameId?: string;
  currentUid?: string;
}) {
  const tabs = isAdmin ? [...baseTabs, ...adminExtraTabs] : [...baseTabs, ...playerExtraTabs];
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!gameId || !currentUid || isAdmin) return;
    return subscribeThread(gameId, currentUid, (t) => {
      setUnreadMessages(t?.unreadByPlayer ?? 0);
    });
  }, [gameId, currentUid, isAdmin]);

  // Firestore listeners already push realtime updates; a refresh is essentially a soft reload
  // to re-trigger hydration and show "fresh" state affirmation to the user.
  const handleRefresh = useCallback(async () => {
    vibrate("success");
    // Brief pause so the spinner is visible and the user feels a response
    await new Promise((r) => setTimeout(r, 400));
    window.location.reload();
  }, []);

  const { pull, refreshing, threshold } = usePullToRefresh({ onRefresh: handleRefresh });
  const progress = Math.min(pull / threshold, 1);
  const triggered = pull >= threshold;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-deep)' }}>
      {/* Pull-to-refresh indicator */}
      <div
        className="ptr-indicator"
        style={{
          height: pull,
          opacity: progress,
        }}
        aria-hidden="true"
      >
        {refreshing ? (
          <>
            <span className="ptr-spinner" />
            Aggiornamento...
          </>
        ) : triggered ? (
          "Rilascia per aggiornare"
        ) : (
          <span style={{ transform: `rotate(${progress * 180}deg)`, transition: "transform 0.1s" }}>
            ↓
          </span>
        )}
      </div>

      <main
        className="flex-1 pb-24 px-3 pt-3 max-w-5xl mx-auto w-full"
        style={{
          paddingTop: 'max(12px, env(safe-area-inset-top))',
          transform: pull > 0 ? `translateY(${pull * 0.3}px)` : undefined,
          transition: refreshing ? "transform 0.2s" : undefined,
        }}
      >
        {children}
      </main>
      {!isAdmin && gameId && currentUid && (
        <Link
          to="/messaggi"
          aria-label="Messaggi al Comitato"
          className="fixed z-40 glass rounded-full flex items-center justify-center shadow-lg"
          style={{
            bottom: 'calc(156px + env(safe-area-inset-bottom))',
            right: 16,
            width: 56,
            height: 56,
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border)',
            fontSize: 24,
          }}
        >
          <span>📩</span>
          {unreadMessages > 0 && (
            <span
              className="absolute text-[10px] bg-red-600 text-white rounded-full font-bold flex items-center justify-center"
              style={{ top: -4, right: -4, minWidth: 18, height: 18, padding: '0 4px' }}
            >
              {unreadMessages}
            </span>
          )}
        </Link>
      )}
      <nav className="fixed bottom-0 left-0 right-0 glass border-t" style={{ borderColor: 'var(--border)', backdropFilter: 'blur(20px)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex justify-around max-w-lg mx-auto">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center py-2.5 px-2 text-[10px] transition-all duration-200 ${
                  isActive
                    ? tab.to === "/admin" ? "nav-active nav-active-gold text-[#ffd700]" : "nav-active text-[#00d4ff]"
                    : "text-[#64748b] hover:text-[#94a3b8]"
                }`
              }
            >
              <span className="text-lg mb-0.5">{tab.icon}</span>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Floating chatbot — available from any page */}
      <Chatbot />
    </div>
  );
}
