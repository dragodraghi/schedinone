import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { auth } from "./lib/firebase";
import { signOut, signInWithEmailAndPassword } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { loginAnonymously } from "./lib/auth";
import { useAuth } from "./hooks/useAuth";
import { useGame } from "./hooks/useGame";
import { useMatches } from "./hooks/useMatches";
import { useCurrentPlayer, usePlayers, usePublicPlayers } from "./hooks/usePlayers";
import Layout from "./components/Layout";
import SplashScreen from "./components/SplashScreen";
import PageSkeleton from "./components/PageSkeleton";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SchedinaPage from "./pages/SchedinaPage";
import ClassificaPage from "./pages/ClassificaPage";
import ProfiloPage from "./pages/ProfiloPage";
import BachecaPage from "./pages/BachecaPage";
import MessaggiPage from "./pages/MessaggiPage";
import { initPushForUser } from "./lib/messaging";

// Admin + Griglione routes are lazy-loaded to keep initial bundle small
const AdminPage = lazy(() => import("./pages/admin/AdminPage"));
const AdminAnnunciPage = lazy(() => import("./pages/admin/AdminAnnunciPage"));
const AdminMessaggiPage = lazy(() => import("./pages/admin/AdminMessaggiPage"));
const RisultatiPage = lazy(() => import("./pages/admin/RisultatiPage"));
const GiocatoriPage = lazy(() => import("./pages/admin/GiocatoriPage"));
const RiepilogoPage = lazy(() => import("./pages/admin/RiepilogoPage"));
const SchedineRicevutePage = lazy(() => import("./pages/admin/SchedineRicevutePage"));
const ConfrontoPage = lazy(() => import("./pages/admin/ConfrontoPage"));

const GAME_ID = import.meta.env.VITE_GAME_ID || "schedinone-2026";
type SessionMode = "player" | "admin" | null;

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const authReady = !authLoading && !!user;
  const { game, loading: gameLoading } = useGame(GAME_ID, authReady);
  const { matches } = useMatches(GAME_ID, authReady);
  const [loggedIn, setLoggedIn] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [adminLoginInProgress, setAdminLoginInProgress] = useState(false);
  const [sessionMode, setSessionMode] = useState<SessionMode>(null);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  const isGameAdmin = game?.admins.includes(user?.uid ?? "") ?? false;
  const isAdminSession = sessionMode === "admin" && isGameAdmin;
  const { players: publicPlayers } = usePublicPlayers(GAME_ID, authReady);
  const { players: adminPlayers } = usePlayers(GAME_ID, authReady && isAdminSession);
  const { player: currentPlayer } = useCurrentPlayer(GAME_ID, user?.uid, authReady && !!user);
  const players = isAdminSession ? adminPlayers : publicPlayers;

  // Firestore rules require auth to read anything. Trigger an anonymous
  // sign-in as soon as the app mounts (for first-time visitors who haven't
  // cached an anonymous UID yet) so the game doc can be fetched before
  // the user presses any button.
  useEffect(() => {
    if (!authLoading && !user && !adminLoginInProgress) {
      loginAnonymously().catch((err) => {
        console.error("Auto anonymous login failed:", err);
      });
    }
  }, [authLoading, user, adminLoginInProgress]);

  useEffect(() => {
    if (currentPlayer && user?.isAnonymous && !isGameAdmin) {
      setSessionMode((mode) => mode ?? "player");
      setLoggedIn(true);
    }
  }, [currentPlayer, isGameAdmin, user?.isAnonymous]);

  useEffect(() => {
    if (loggedIn && user) {
      initPushForUser(user.uid).catch(() => {});
    }
  }, [loggedIn, user]);

  // Player login via access code. Admin access is separate (email+password).
  const handleLogin = async (name: string, code: string) => {
    if (!game) return;
    setLoginError("");

    try {
      let firebaseUser = user;
      if (!firebaseUser || !firebaseUser.isAnonymous || game.admins.includes(firebaseUser.uid)) {
        try {
          await signOut(auth);
        } catch {
          /* already signed out */
        }
        firebaseUser = await loginAnonymously();
      }

      const functions = getFunctions(undefined, "europe-west1");
      const callJoin = httpsCallable<
        { gameId: string; name: string; code: string },
        { ok: boolean; createdPlayer: boolean }
      >(functions, "joinGame");
      await callJoin({ gameId: GAME_ID, name: name.trim(), code });

      setSessionMode("player");
      setLoggedIn(true);
      setShowSplash(true);
    } catch (err) {
      const e = err as { code?: string; message?: string };
      const code = e.code ?? "";
      if (code === "functions/permission-denied") {
        setLoginError(e.message || "Codice non valido. Controlla e riprova.");
      } else if (code === "functions/already-exists") {
        setLoginError(e.message || `Il nome "${name}" è già usato. Scegli un nome diverso.`);
      } else if (code === "functions/invalid-argument") {
        setLoginError("Dati non validi. Controlla nome e codice.");
      } else if (code === "functions/not-found") {
        setLoginError("Gioco non trovato.");
      } else {
        console.error("Login error:", err);
        setLoginError("Errore durante l'accesso. Riprova.");
      }
    }
  };

  const handleAdminLogin = async (email: string, password: string) => {
    setLoginError("");
    setAdminLoginInProgress(true);
    try {
      try {
        await signOut(auth);
      } catch {
        /* already signed out */
      }
      const cred = await signInWithEmailAndPassword(auth, email, password);
      console.log("[admin-login] signed in as", cred.user.uid, cred.user.email);
      setSessionMode("admin");
      setLoggedIn(true);
      setShowSplash(true);
    } catch (err) {
      console.error("Admin login error:", err);
      setLoginError("Email o password non valide.");
    } finally {
      setAdminLoginInProgress(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout error:", err);
    }
    setSessionMode(null);
    setLoggedIn(false);
    setLoginError("");
  };

  // Show the loading screen while:
  //  - Firebase Auth is initializing
  //  - Or we're about to auto-sign-in anonymously (auth done but no user yet)
  //  - Or the game doc is still being fetched
  const initializing = authLoading || !user;
  if (initializing || gameLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--bg-deep)' }}>
        <div className="text-center mb-6 animate-in">
          <div className="text-4xl mb-3 shimmer">⚽</div>
          <h1 className="text-2xl font-black" style={{ fontFamily: 'Outfit, sans-serif', background: 'linear-gradient(135deg, #00d4ff, #ffd700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-deep)' }}>
        <div className="glass rounded-2xl p-8 text-center animate-in mx-4">
          <div className="text-3xl mb-3">⚠️</div>
          <p className="font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--wrong)' }}>Gioco non trovato</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Controlla la configurazione</p>
        </div>
      </div>
    );
  }

  if (!loggedIn) {
    return <LoginPage onLogin={handleLogin} onAdminLogin={handleAdminLogin} error={loginError} />;
  }

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  const safePlayer = currentPlayer ?? {
    id: user?.uid ?? "",
    name: isAdminSession ? "Admin" : "Giocatore",
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
      <Layout isAdmin={isAdminSession} gameId={GAME_ID} currentUid={user?.uid}>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/" element={<DashboardPage game={game} player={safePlayer} players={players} matches={matches} />} />
            <Route path="/schedina" element={<SchedinaPage game={game} player={safePlayer} matches={matches} gameId={GAME_ID} />} />
            <Route path="/classifica" element={<ClassificaPage game={game} player={safePlayer} players={players} />} />
            <Route path="/profilo" element={<ProfiloPage game={game} player={safePlayer} players={players} matches={matches} isAdmin={isAdminSession} onLogout={handleLogout} />} />
            <Route path="/bacheca" element={<BachecaPage gameId={GAME_ID} playerUid={user?.uid ?? ""} />} />
            <Route path="/messaggi" element={<MessaggiPage gameId={GAME_ID} playerUid={user?.uid ?? ""} />} />
            <Route path="/griglione" element={<RiepilogoPage game={game} players={players} matches={matches} currentPlayer={currentPlayer ?? undefined} />} />
            {isAdminSession && (
              <>
                <Route path="/admin" element={<AdminPage game={game} players={players} matches={matches} onLogout={handleLogout} />} />
                <Route path="/admin/risultati" element={<RisultatiPage matches={matches} gameId={GAME_ID} />} />
                <Route path="/admin/giocatori" element={<GiocatoriPage players={players} gameId={GAME_ID} />} />
                <Route path="/admin/riepilogo" element={<RiepilogoPage game={game} players={players} matches={matches} />} />
                <Route path="/admin/schedine" element={<SchedineRicevutePage players={players} matches={matches} gameId={GAME_ID} game={game} />} />
                <Route path="/admin/confronto" element={<ConfrontoPage game={game} players={players} matches={matches} />} />
                <Route path="/admin/annunci" element={<AdminAnnunciPage gameId={GAME_ID} currentUid={user?.uid ?? ""} players={players} />} />
                <Route path="/admin/messaggi" element={<AdminMessaggiPage gameId={GAME_ID} currentUid={user?.uid ?? ""} players={players} />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}
