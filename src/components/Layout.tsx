import { type ReactNode } from "react";
import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/", label: "Dashboard", icon: "🏠" },
  { to: "/schedina", label: "Schedina", icon: "📝" },
  { to: "/classifica", label: "Classifica", icon: "🏆" },
  { to: "/profilo", label: "Profilo", icon: "👤" },
];

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <main className="flex-1 pb-20 px-4 pt-4">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800">
        <div className="flex justify-around max-w-lg mx-auto">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center py-3 px-2 text-xs transition-colors ${
                  isActive ? "text-blue-500" : "text-slate-400"
                }`
              }
            >
              <span className="text-xl mb-1">{tab.icon}</span>
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
