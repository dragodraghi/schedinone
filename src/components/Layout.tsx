import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import OfflineBanner from "./OfflineBanner";

const baseTabs = [
  { to: "/", label: "Home", icon: "26" },
  { to: "/schedina", label: "Schedina", icon: "1X2" },
  { to: "/classifica", label: "Classifica", icon: "Pts" },
];

const playerExtraTabs = [
  { to: "/griglione", label: "Griglione", icon: "Grid" },
  { to: "/profilo", label: "Profilo", icon: "User" },
];

const adminTabs = [
  { to: "/", label: "Home", icon: "26" },
  { to: "/classifica", label: "Classifica", icon: "Pts" },
  { to: "/profilo", label: "Profilo", icon: "User" },
  { to: "/admin", label: "Admin", icon: "Ops" },
];

const adminPlayerTabs = [
  { to: "/", label: "Home", icon: "26" },
  { to: "/schedina", label: "Schedina", icon: "1X2" },
  { to: "/classifica", label: "Classifica", icon: "Pts" },
  { to: "/profilo", label: "Profilo", icon: "User" },
  { to: "/admin", label: "Admin", icon: "Ops" },
];

export default function Layout({
  children,
  isAdmin,
  hasPlayerProfile,
}: {
  children: ReactNode;
  isAdmin?: boolean;
  hasPlayerProfile?: boolean;
}) {
  const tabs = isAdmin ? (hasPlayerProfile ? adminPlayerTabs : adminTabs) : [...baseTabs, ...playerExtraTabs];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-deep)" }}>
      <OfflineBanner />
      <main
        className="flex-1 pb-28 px-3 sm:px-5 pt-3 app-shell"
        style={{
          paddingTop: "max(12px, env(safe-area-inset-top))",
        }}
      >
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bottom-nav" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex justify-around gap-1 max-w-lg mx-auto px-2 py-2">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === "/"}
              className={({ isActive }) =>
                `nav-item flex flex-col items-center justify-center py-2 px-1 text-[10px] transition-all duration-200 ${
                  isActive
                    ? tab.to === "/admin"
                      ? "nav-active nav-active-gold nav-item-active-admin text-[#ffd700]"
                      : "nav-active nav-item-active text-[#00d4ff]"
                    : "text-[#64748b] hover:text-[#94a3b8]"
                }`
              }
            >
              <span className="text-[10px] leading-none mb-1 font-black tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
                {tab.icon}
              </span>
              <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700 }}>{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
