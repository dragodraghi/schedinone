import { type ReactNode } from "react";
import { NavLink } from "react-router-dom";

const playerTabs = [
  { to: "/", label: "Home", icon: "⚡" },
  { to: "/schedina", label: "Schedina", icon: "📋" },
  { to: "/classifica", label: "Ranking", icon: "🏆" },
  { to: "/griglione", label: "Griglione", icon: "📊" },
  { to: "/profilo", label: "Profilo", icon: "👤" },
];

const adminTab = { to: "/admin", label: "Comitato", icon: "⚙️" };

export default function Layout({ children, isAdmin }: { children: ReactNode; isAdmin?: boolean }) {
  const tabs = isAdmin ? [...playerTabs, adminTab] : playerTabs;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-deep)' }}>
      <main className="flex-1 pb-20 px-3 pt-3 max-w-5xl mx-auto w-full">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 glass border-t" style={{ borderColor: 'var(--border)', backdropFilter: 'blur(20px)' }}>
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
    </div>
  );
}
