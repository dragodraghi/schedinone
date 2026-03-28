import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { db } from "./lib/firebase";
import { auth } from "./lib/firebase";
import { signOut } from "firebase/auth";
import { loginAnonymously } from "./lib/auth";
import { useAuth } from "./hooks/useAuth";
import { useGame } from "./hooks/useGame";
import { useMatches } from "./hooks/useMatches";
import { usePlayers } from "./hooks/usePlayers";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SchedinaPage from "./pages/SchedinaPage";
import ClassificaPage from "./pages/ClassificaPage";
import ProfiloPage from "./pages/ProfiloPage";
import AdminPage from "./pages/admin/AdminPage";
import RisultatiPage from "./pages/admin/RisultatiPage";
import GiocatoriPage from "./pages/admin/GiocatoriPage";
import RiepilogoPage from "./pages/admin/RiepilogoPage";
import SchedineRicevutePage from "./pages/admin/SchedineRicevutePage";

const GAME_ID = import.meta.env.VITE_GAME_ID || "schedinone-2026";

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { game, loading: gameLoading } = useGame(GAME_ID);
  const { matches } = useMatches(GAME_ID);
  const { players } = usePlayers(GAME_ID);
  const [loggedIn, setLoggedIn] = useState(false);

  const currentPlayer = players.find((p) => p.id === user?.uid) ?? null;
  const isAdmin = game?.admins.includes(user?.uid ?? "") ?? false;

  useEffect(() => {
    if (currentPlayer) setLoggedIn(true);
  }, [currentPlayer]);

  const handleLogin = async (name: string, code: string) => {
    if (!game) return;
    if (code !== game.accessCode && code !== game.adminCode) {
      alert("Codice non valido");
      return;
    }

    const firebaseUser = user ?? (await loginAnonymously());
    const playerRef = doc(db, "games", GAME_ID, "players", firebaseUser.uid);
    const existing = await getDoc(playerRef);

    if (!existing.exists()) {
      await setDoc(playerRef, {
        name,
        joinedAt: serverTimestamp(),
        predictions: {},
        topScorerPick: "",
        winnerPick: "",
        points: 0,
        paid: false,
        scheduleStatus: "bozza",
      });
    }

    if (code === game.adminCode && !game.admins.includes(firebaseUser.uid)) {
      const gameRef = doc(db, "games", GAME_ID);
      await updateDoc(gameRef, { admins: arrayUnion(firebaseUser.uid) });
    }

    setLoggedIn(true);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setLoggedIn(false);
  };

  if (authLoading || gameLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-deep)' }}>
        <div className="text-center animate-in">
          <div className="text-4xl mb-4 shimmer">⚽</div>
          <h1 className="text-3xl font-black" style={{ fontFamily: 'Outfit, sans-serif', background: 'linear-gradient(135deg, #00d4ff, #ffd700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            SCHEDINONE
          </h1>
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

  if (!loggedIn || !currentPlayer) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <Layout isAdmin={isAdmin}>
        <Routes>
          <Route path="/" element={<DashboardPage game={game} player={currentPlayer} players={players} matches={matches} />} />
          <Route path="/schedina" element={<SchedinaPage game={game} player={currentPlayer} matches={matches} gameId={GAME_ID} />} />
          <Route path="/classifica" element={<ClassificaPage game={game} player={currentPlayer} players={players} />} />
          <Route path="/profilo" element={<ProfiloPage game={game} player={currentPlayer} players={players} matches={matches} isAdmin={isAdmin} onLogout={handleLogout} />} />
          <Route path="/griglione" element={<RiepilogoPage game={game} players={players} matches={matches} currentPlayer={currentPlayer} />} />
          {isAdmin && (
            <>
              <Route path="/admin" element={<AdminPage game={game} players={players} matches={matches} onLogout={handleLogout} />} />
              <Route path="/admin/risultati" element={<RisultatiPage matches={matches} gameId={GAME_ID} />} />
              <Route path="/admin/giocatori" element={<GiocatoriPage players={players} gameId={GAME_ID} />} />
              <Route path="/admin/riepilogo" element={<RiepilogoPage game={game} players={players} matches={matches} />} />
              <Route path="/admin/schedine" element={<SchedineRicevutePage players={players} matches={matches} gameId={GAME_ID} game={game} />} />
            </>
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
