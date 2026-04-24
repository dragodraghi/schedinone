import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { FirebaseError } from "firebase/app";
import { auth } from "./lib/firebase";
import { signOut } from "firebase/auth";
import { loginAnonymously } from "./lib/auth";
import { joinGameWithCode } from "./lib/gameActions";
import { useAuth } from "./hooks/useAuth";
import { useGame } from "./hooks/useGame";
import { useMatches } from "./hooks/useMatches";
import { usePlayers } from "./hooks/usePlayers";
import Layout from "./components/Layout";
import SplashScreen from "./components/SplashScreen";
import PageSkeleton from "./components/PageSkeleton";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SchedinaPage from "./pages/SchedinaPage";
import ClassificaPage from "./pages/ClassificaPage";
import ProfiloPage from "./pages/ProfiloPage";

// Admin + Griglione routes are lazy-loaded to keep initial bundle small
const AdminPage = lazy(() => import("./pages/admin/AdminPage"));
const RisultatiPage = lazy(() => import("./pages/admin/RisultatiPage"));
const GiocatoriPage = lazy(() => import("./pages/admin/GiocatoriPage"));
const RiepilogoPage = lazy(() => import("./pages/admin/RiepilogoPage"));
const SchedineRicevutePage = lazy(() => import("./pages/admin/SchedineRicevutePage"));
const ConfrontoPage = lazy(() => import("./pages/admin/ConfrontoPage"));

const GAME_ID = import.meta.env.VITE_GAME_ID || "schedinone-2026";

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const authReady = !authLoading && !!user;
  const { game, loading: gameLoading } = useGame(GAME_ID, authReady);
  const { matches } = useMatches(GAME_ID, authReady);
  const { players } = usePlayers(GAME_ID, authReady);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionIsAdmin, setSessionIsAdmin] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [loginError, setLoginError] = useState("");
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  const currentPlayer = players.find((p) => p.id === user?.uid) ?? null;
  const isAdmin = sessionIsAdmin || (game?.admins.includes(user?.uid ?? "") ?? false);
  const loggedIn = sessionReady || !!currentPlayer;

  // Firestore rules require auth to read anything. Trigger an anonymous
  // sign-in as soon as the app mounts (for first-time visitors who haven't
  // cached an anonymous UID yet) so the game doc can be fetched before
  // the user presses any button.
  useEffect(() => {
    if (!authLoading && !user) {
      loginAnonymously().catch((err) => {
        console.error("Auto anonymous login failed:", err);
      });
    }
  }, [authLoading, user]);

  const handleLogin = async (name: string, code: string) => {
    if (!game) return;
    setLoginError("");

    try {
      await (user ?? loginAnonymously());
      const result = await joinGameWithCode({ gameId: GAME_ID, name, code });
      setSessionReady(true);
      setSessionIsAdmin(result.isAdmin);
      setShowSplash(true);
    } catch (err) {
      console.error("Login error:", err);
      if (err instanceof FirebaseError) {
        if (err.code === "functions/permission-denied") {
          setLoginError("Codice non valido. Controlla e riprova.");
          return;
        }
        if (
          err.code === "functions/failed-precondition" ||
          err.code === "functions/invalid-argument"
        ) {
          setLoginError(err.message.replace(/^functions\/[a-z-]+:\s*/i, ""));
          return;
        }
        if (err.code === "functions/not-found") {
          setLoginError("Gioco non trovato.");
          return;
        }
      }
      setLoginError("Errore durante l'accesso. Riprova.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout error:", err);
    }
    setSessionReady(false);
    setSessionIsAdmin(false);
    setShowSplash(false);
    setLoginError("");
  };

  // Show the loading screen while:
  //  - Firebase Auth is initializing
  //  - Or we're about to auto-sign-in anonymously (auth done but no user yet)
  //  - Or the game doc is still being fetched
  const initializing = authLoading || !user;
  if (initializing || gameLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "var(--bg-deep)" }}>
        <div className="text-center mb-6 animate-in">
          <div className="text-4xl mb-3 shimmer">⚽</div>
          <h1 className="text-2xl font-black" style={{ fontFamily: "Outfit, sans-serif", background: "linear-gradient(135deg, #00d4ff, #ffd700)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            SCHEDINONE
          </h1>
        </div>
        <div className="w-full max-w-md">
          <PageSkeleton />
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-deep)" }}>
        <div className="glass rounded-2xl p-8 text-center animate-in mx-4">
          <div className="text-3xl mb-3">⚠️</div>
          <p className="font-bold" style={{ fontFamily: "Outfit, sans-serif", color: "var(--wrong)" }}>Gioco non trovato</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Controlla la configurazione</p>
        </div>
      </div>
    );
  }

  if (!loggedIn) {
    return <LoginPage onLogin={handleLogin} error={loginError} accessCode={game.accessCode} />;
  }

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  const safePlayer = currentPlayer ?? {
    id: user?.uid ?? "",
    name: "Admin",
    joinedAt: new Date(),
    predictions: {},
    topScorerPick: "",
    winnerPick: "",
    points: 0,
    paid: false,
    scheduleStatus: "bozza" as const,
  };

  return (
    <BrowserRouter>
      <Layout isAdmin={isAdmin}>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/" element={<DashboardPage game={game} player={safePlayer} players={players} matches={matches} />} />
            <Route path="/schedina" element={<SchedinaPage game={game} player={safePlayer} matches={matches} gameId={GAME_ID} />} />
            <Route path="/classifica" element={<ClassificaPage game={game} player={safePlayer} players={players} />} />
            <Route path="/profilo" element={<ProfiloPage game={game} player={safePlayer} players={players} matches={matches} isAdmin={isAdmin} onLogout={handleLogout} />} />
            <Route path="/griglione" element={<RiepilogoPage game={game} players={players} matches={matches} currentPlayer={currentPlayer ?? undefined} />} />
            {isAdmin && (
              <>
                <Route path="/admin" element={<AdminPage game={game} players={players} matches={matches} onLogout={handleLogout} />} />
                <Route path="/admin/risultati" element={<RisultatiPage matches={matches} gameId={GAME_ID} />} />
                <Route path="/admin/giocatori" element={<GiocatoriPage players={players} gameId={GAME_ID} />} />
                <Route path="/admin/riepilogo" element={<RiepilogoPage game={game} players={players} matches={matches} />} />
                <Route path="/admin/schedine" element={<SchedineRicevutePage players={players} matches={matches} gameId={GAME_ID} game={game} />} />
                <Route path="/admin/confronto" element={<ConfrontoPage game={game} players={players} matches={matches} />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}
