import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { db } from "./lib/firebase";
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
      });
    }

    if (code === game.adminCode && !game.admins.includes(firebaseUser.uid)) {
      const gameRef = doc(db, "games", GAME_ID);
      await updateDoc(gameRef, { admins: arrayUnion(firebaseUser.uid) });
    }

    setLoggedIn(true);
  };

  if (authLoading || gameLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">SCHEDINONE</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-red-400">Gioco non trovato</p>
      </div>
    );
  }

  if (!loggedIn || !currentPlayer) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage game={game} player={currentPlayer} players={players} matches={matches} />} />
          <Route path="/schedina" element={<SchedinaPage game={game} player={currentPlayer} matches={matches} gameId={GAME_ID} />} />
          <Route path="/classifica" element={<ClassificaPage game={game} player={currentPlayer} players={players} />} />
          <Route path="/profilo" element={<ProfiloPage game={game} player={currentPlayer} players={players} matches={matches} isAdmin={isAdmin} />} />
          {isAdmin && (
            <>
              <Route path="/admin" element={<AdminPage game={game} players={players} matches={matches} />} />
              <Route path="/admin/risultati" element={<RisultatiPage matches={matches} gameId={GAME_ID} />} />
              <Route path="/admin/giocatori" element={<GiocatoriPage players={players} gameId={GAME_ID} />} />
            </>
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
