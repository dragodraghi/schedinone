import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { auth } from "./lib/firebase";
import { signOut, signInWithEmailAndPassword } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { loginAnonymously } from "./lib/auth";
import { useAuth } from "./hooks/useAuth";
import { useGame } from "./hooks/useGame";
import { useMatches } from "./hooks/useMatches";
import { useCurrentPlayer, usePlayers, usePublicPlayers } from "./hooks/usePlayers";
import { useLoadingTimeout } from "./hooks/useLoadingTimeout";
import { useGoldenAccess, useGoldenAccessList } from "./hooks/useGoldenAccess";
import { hardRefreshApp } from "./lib/appRefresh";
import { CLASSIC_GAME_ID, GOLDEN_GAME_ID } from "./lib/games";
import Layout from "./components/Layout";
import SplashScreen from "./components/SplashScreen";
import PageSkeleton from "./components/PageSkeleton";
import { AnnouncementLoginModal } from "./components/AnnouncementLoginModal";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SchedinaPage from "./pages/SchedinaPage";
import ClassificaPage from "./pages/ClassificaPage";
import { getAdminPlayerUid, getEffectivePlayerUid } from "./lib/adminPlayer";
import { countUnreadAnnouncements, markAnnouncementsRead, subscribeAnnouncementsForPlayer } from "./lib/announcements";
import { subscribeThread } from "./lib/chat";
import { getGoldenAccessClosesAt } from "./lib/goldenAccessWindow";
import { mergeGoldenPlayersWithAccessPayments } from "./lib/goldenPayments";
import type { Announcement, Thread } from "./lib/types";

// Admin + Griglione routes are lazy-loaded to keep initial bundle small
const ProfiloPage = lazy(() => import("./pages/ProfiloPage"));
const BachecaPage = lazy(() => import("./pages/BachecaPage"));
const MessaggiPage = lazy(() => import("./pages/MessaggiPage"));
const Chatbot = lazy(() => import("./components/Chatbot"));
const AdminPage = lazy(() => import("./pages/admin/AdminPage"));
const AdminAnnunciPage = lazy(() => import("./pages/admin/AdminAnnunciPage"));
const AdminMessaggiPage = lazy(() => import("./pages/admin/AdminMessaggiPage"));
const RisultatiPage = lazy(() => import("./pages/admin/RisultatiPage"));
const GiocatoriPage = lazy(() => import("./pages/admin/GiocatoriPage"));
const RiepilogoPage = lazy(() => import("./pages/admin/RiepilogoPage"));
const SchedineRicevutePage = lazy(() => import("./pages/admin/SchedineRicevutePage"));
const ConfrontoPage = lazy(() => import("./pages/admin/ConfrontoPage"));
const GoldenPlusAdminPanel = lazy(() => import("./pages/admin/GoldenPlusAdminPanel"));
const ConfrontoGiocatorePage = lazy(() => import("./pages/ConfrontoPage"));
const GoldenPlusAccessGate = lazy(() => import("./pages/golden/GoldenPlusAccessGate"));
const GoldenBracketPage = lazy(() => import("./pages/golden/GoldenBracketPage"));

type SessionMode = "player" | "admin" | null;
type JoinGameResponse = {
  ok: boolean;
  createdPlayer: boolean;
  playerUid?: string;
};
type SessionPlayerLink = {
  authUid: string;
  playerUid: string;
};

export default function App() {
  const currentPath = typeof window === "undefined" ? "/" : window.location.pathname;
  const isGoldenRoute = currentPath === "/golden-plus" || currentPath.startsWith("/golden-plus/");
  const { user, loading: authLoading } = useAuth();
  const authReady = !authLoading && !!user;
  const { game, loading: gameLoading } = useGame(CLASSIC_GAME_ID, authReady);
  const { matches } = useMatches(CLASSIC_GAME_ID, authReady);
  const [loggedIn, setLoggedIn] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [adminLoginInProgress, setAdminLoginInProgress] = useState(false);
  const [sessionMode, setSessionMode] = useState<SessionMode>(null);
  const [sessionPlayerLink, setSessionPlayerLink] = useState<SessionPlayerLink | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loginReadAnnouncementIds, setLoginReadAnnouncementIds] = useState<string[]>([]);
  const [privateThread, setPrivateThread] = useState<Thread | null>(null);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  const isGameAdmin = game?.admins.includes(user?.uid ?? "") ?? false;
  const isAdminSession = sessionMode === "admin" && isGameAdmin;
  const adminPlayerUid = getAdminPlayerUid(game, user?.uid);
  const mappedPlayerUid = getEffectivePlayerUid(game, user?.uid);
  const sessionPlayerUid =
    sessionPlayerLink && sessionPlayerLink.authUid === user?.uid ? sessionPlayerLink.playerUid : null;
  const effectivePlayerUid = sessionMode === "player" && sessionPlayerUid ? sessionPlayerUid : mappedPlayerUid;
  const hasAdminPlayerProfile = isAdminSession && !!adminPlayerUid;
  const goldenIdentityUid =
    isAdminSession && adminPlayerUid
      ? adminPlayerUid
      : effectivePlayerUid ?? user?.uid ?? null;
  const currentAuthUid = user?.uid ?? null;
  const linkedGoldenAccessUid =
    goldenIdentityUid && goldenIdentityUid !== currentAuthUid ? goldenIdentityUid : null;
  const { players: publicPlayers, loading: publicPlayersLoading } = usePublicPlayers(CLASSIC_GAME_ID, authReady);
  const { players: adminPlayers, loading: adminPlayersLoading } = usePlayers(CLASSIC_GAME_ID, authReady && isAdminSession);
  const { player: currentPlayer } = useCurrentPlayer(CLASSIC_GAME_ID, effectivePlayerUid, authReady && !!effectivePlayerUid);
  const { access: directGoldenAccess, loading: directGoldenAccessLoading } = useGoldenAccess(
    GOLDEN_GAME_ID,
    currentAuthUid,
    authReady
  );
  const { access: linkedGoldenAccess, loading: linkedGoldenAccessLoading } = useGoldenAccess(
    GOLDEN_GAME_ID,
    linkedGoldenAccessUid,
    authReady && !!linkedGoldenAccessUid
  );
  const goldenAccess =
    directGoldenAccess?.status === "approved"
      ? directGoldenAccess
      : linkedGoldenAccess?.status === "approved"
        ? linkedGoldenAccess
        : directGoldenAccess ?? linkedGoldenAccess;
  const goldenAccessLoading = directGoldenAccessLoading || linkedGoldenAccessLoading;
  const hasGoldenAccess = goldenAccess?.status === "approved";
  const shouldLoadGolden = authReady && (hasGoldenAccess || isAdminSession || isGoldenRoute);
  const { game: goldenGame } = useGame(GOLDEN_GAME_ID, shouldLoadGolden);
  const { matches: goldenMatches } = useMatches(GOLDEN_GAME_ID, shouldLoadGolden);
  const { player: goldenPlayer } = useCurrentPlayer(
    GOLDEN_GAME_ID,
    user?.uid ?? undefined,
    authReady && hasGoldenAccess && !!user?.uid
  );
  const { players: goldenAdminPlayers, loading: goldenAdminPlayersLoading } = usePlayers(
    GOLDEN_GAME_ID,
    authReady && isAdminSession
  );
  const { players: goldenPublicPlayers, loading: goldenPublicPlayersLoading } = usePublicPlayers(
    GOLDEN_GAME_ID,
    shouldLoadGolden && !isAdminSession
  );
  const { accessItems: goldenAccessItems } = useGoldenAccessList(GOLDEN_GAME_ID, authReady && isAdminSession);
  const goldenPlayersForAdmin = useMemo(
    () => mergeGoldenPlayersWithAccessPayments(goldenAdminPlayers, goldenAccessItems),
    [goldenAdminPlayers, goldenAccessItems]
  );
  const goldenLeaderboardPlayers = isAdminSession ? goldenPlayersForAdmin : goldenPublicPlayers;
  const goldenLeaderboardLoading = isAdminSession ? goldenAdminPlayersLoading : goldenPublicPlayersLoading;
  const goldenAccessClosesAt = getGoldenAccessClosesAt(goldenGame, goldenMatches);
  const players = isAdminSession ? adminPlayers : publicPlayers;
  const playersLoading = isAdminSession ? adminPlayersLoading : publicPlayersLoading;
  const initializing = authLoading || !user;
  const loadTimedOut = useLoadingTimeout(initializing || gameLoading);

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
      let cancelled = false;
      const uid = user.uid;
      import("./lib/messaging")
        .then(({ initPushForUser }) => {
          if (!cancelled) {
            return initPushForUser(uid);
          }
          return null;
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }
  }, [loggedIn, user]);

  useEffect(() => {
    if (!loggedIn || !effectivePlayerUid) {
      setAnnouncements([]);
      return;
    }
    return subscribeAnnouncementsForPlayer(CLASSIC_GAME_ID, effectivePlayerUid, setAnnouncements);
  }, [loggedIn, effectivePlayerUid]);

  useEffect(() => {
    setLoginReadAnnouncementIds([]);
  }, [effectivePlayerUid]);

  useEffect(() => {
    if (!loggedIn || !effectivePlayerUid) {
      setPrivateThread(null);
      return;
    }
    return subscribeThread(CLASSIC_GAME_ID, effectivePlayerUid, setPrivateThread);
  }, [loggedIn, effectivePlayerUid]);

  // Player login via team name + password. Admin access is separate (email+password).
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
        JoinGameResponse
      >(functions, "joinGame");
      const joinResult = await callJoin({ gameId: CLASSIC_GAME_ID, name: name.trim(), code });
      const joinedPlayerUid = joinResult.data.playerUid?.trim() || firebaseUser.uid;

      setSessionPlayerLink({ authUid: firebaseUser.uid, playerUid: joinedPlayerUid });
      setSessionMode("player");
      setLoggedIn(true);
      setShowSplash(true);
    } catch (err) {
      const e = err as { code?: string; message?: string };
      const code = e.code ?? "";
      if (code === "functions/permission-denied") {
        setLoginError(e.message || "Password non valida. Controlla e riprova.");
      } else if (code === "functions/already-exists") {
        setLoginError(
          e.message ||
            `La squadra "${name}" e' gia' registrata. Usa il dispositivo originale o chiedi al Comitato.`
        );
      } else if (code === "functions/invalid-argument") {
        setLoginError(e.message || "Dati non validi. Controlla nome squadra e password.");
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
    setSessionPlayerLink(null);
    try {
      try {
        await signOut(auth);
      } catch {
        /* already signed out */
      }
      await signInWithEmailAndPassword(auth, email, password);
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
    setSessionPlayerLink(null);
    setLoggedIn(false);
    setLoginError("");
  };

  // Show the loading screen while:
  //  - Firebase Auth is initializing
  //  - Or we're about to auto-sign-in anonymously (auth done but no user yet)
  //  - Or the game doc is still being fetched
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
          {loadTimedOut ? (
            <div className="glass rounded-2xl p-6 text-center animate-in">
              <div className="text-3xl mb-2">📡</div>
              <p className="font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
                Connessione lenta
              </p>
              <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>
                Controlla la rete e riprova.
              </p>
              <button
                type="button"
                onClick={() => { void hardRefreshApp(); }}
                className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #00d4ff, #0099cc)', color: '#040810', fontFamily: 'Outfit, sans-serif' }}
              >
                Riprova
              </button>
            </div>
          ) : (
            <PageSkeleton />
          )}
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

  const goldenPlusRouteElement = (
    <GoldenPlusAccessGate
      gameId={GOLDEN_GAME_ID}
      access={goldenAccess}
      accessLoading={goldenAccessLoading}
      userUid={currentAuthUid ?? ""}
      player={goldenPlayer}
      accessClosesAt={goldenAccessClosesAt}
    >
      {goldenGame ? (
        <GoldenBracketPage
          game={goldenGame}
          player={
            goldenPlayer ??
            goldenLeaderboardPlayers.find((item) => item.id === goldenIdentityUid) ?? {
              id: user?.uid ?? goldenIdentityUid ?? "",
              name: goldenAccess?.displayName ?? "Giocatore",
              joinedAt: new Date(),
              predictions: {},
              topScorerPick: "",
              winnerPick: "",
              points: 0,
              paid: goldenAccess?.paid === true,
              scheduleStatus: "bozza" as const,
              lastAnnouncementReadAt: null,
            }
          }
          matches={goldenMatches}
          gameId={GOLDEN_GAME_ID}
        />
      ) : (
        <PageSkeleton />
      )}
    </GoldenPlusAccessGate>
  );

  const goldenClassificaRouteElement = (
    <GoldenPlusAccessGate
      gameId={GOLDEN_GAME_ID}
      access={goldenAccess}
      accessLoading={goldenAccessLoading}
      userUid={currentAuthUid ?? ""}
      player={goldenPlayer}
      accessClosesAt={goldenAccessClosesAt}
    >
      {goldenGame ? (
        <ClassificaPage
          game={goldenGame}
          player={
            goldenPlayer ??
            goldenLeaderboardPlayers.find((item) => item.id === goldenIdentityUid) ?? {
              id: user?.uid ?? goldenIdentityUid ?? "",
              name: goldenAccess?.displayName ?? "Giocatore",
              joinedAt: new Date(),
              predictions: {},
              topScorerPick: "",
              winnerPick: "",
              points: 0,
              paid: goldenAccess?.paid === true,
              scheduleStatus: "bozza" as const,
              lastAnnouncementReadAt: null,
            }
          }
          players={goldenLeaderboardPlayers}
          loading={goldenLeaderboardLoading}
          title="Classifica Golden"
          kicker="Golden Plus"
          emptyDescription="Appena il Comitato inserisce i risultati, ogni passaggio turno indovinato vale 1 punto."
          showCompareLink={false}
        />
      ) : (
        <PageSkeleton />
      )}
    </GoldenPlusAccessGate>
  );

  if (!loggedIn && isGoldenRoute) {
    return (
      <BrowserRouter>
        <main
          className="min-h-screen px-3 pb-8 pt-3 app-shell sm:px-5"
          style={{
            background: "var(--bg-deep)",
            paddingTop: "max(12px, env(safe-area-inset-top))",
          }}
        >
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/golden-plus" element={goldenPlusRouteElement} />
              <Route path="/golden-plus/classifica" element={goldenClassificaRouteElement} />
              <Route path="*" element={<Navigate to="/golden-plus" replace />} />
            </Routes>
          </Suspense>
        </main>
      </BrowserRouter>
    );
  }

  if (!loggedIn) {
    return <LoginPage onLogin={handleLogin} onAdminLogin={handleAdminLogin} error={loginError} />;
  }

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  const effectivePlayer = currentPlayer ?? players.find((player) => player.id === effectivePlayerUid);
  const lastAnnouncementReadAt = effectivePlayer?.lastAnnouncementReadAt ?? null;
  const unreadAnnouncements = announcements.filter((announcement) => {
    if (!announcement.publishedAt) return false;
    if (!lastAnnouncementReadAt) return true;
    return announcement.publishedAt.toMillis() > lastAnnouncementReadAt.toMillis();
  });
  const unreadAnnouncementCount = countUnreadAnnouncements(announcements, lastAnnouncementReadAt);
  const latestUnreadAnnouncementTitle = unreadAnnouncements[0]?.title?.trim();
  const loginAnnouncementItems = isAdminSession
    ? []
    : unreadAnnouncements.filter((announcement) => !loginReadAnnouncementIds.includes(announcement.id));
  const unreadPrivateMessageCount = privateThread?.unreadByPlayer ?? 0;
  const latestPrivateMessagePreview =
    unreadPrivateMessageCount > 0 && privateThread?.lastMessageFrom === "committee"
      ? privateThread.lastMessagePreview?.trim()
      : undefined;
  const safePlayer = effectivePlayer ?? {
    id: effectivePlayerUid ?? "",
    name: hasAdminPlayerProfile ? "Giocatore" : isAdminSession ? "Admin" : "Giocatore",
    joinedAt: new Date(),
    predictions: {},
    topScorerPick: "",
    winnerPick: "",
    points: 0,
    paid: false,
    scheduleStatus: "bozza" as const,
    lastAnnouncementReadAt: null,
  };
  const handleLoginAnnouncementsConfirm = async () => {
    const readIds = loginAnnouncementItems.map((announcement) => announcement.id);
    if (readIds.length === 0) return;

    setLoginReadAnnouncementIds((current) => Array.from(new Set([...current, ...readIds])));

    if (!effectivePlayerUid) return;
    try {
      await markAnnouncementsRead(CLASSIC_GAME_ID, effectivePlayerUid);
    } catch (err) {
      console.warn("[announcements] failed to mark login announcements as read", err);
    }
  };

  return (
    <BrowserRouter>
      <Layout isAdmin={isAdminSession} hasPlayerProfile={hasAdminPlayerProfile} hasGoldenAccess={hasGoldenAccess}>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/" element={<DashboardPage game={game} player={safePlayer} players={players} matches={matches} unreadAnnouncementCount={unreadAnnouncementCount} latestAnnouncementTitle={latestUnreadAnnouncementTitle} unreadPrivateMessageCount={unreadPrivateMessageCount} latestPrivateMessagePreview={latestPrivateMessagePreview} />} />
            <Route
              path="/schedina"
              element={
                isAdminSession
                  ? hasAdminPlayerProfile
                    ? <SchedinaPage game={game} player={safePlayer} matches={matches} gameId={CLASSIC_GAME_ID} />
                    : <Navigate to="/admin" replace />
                  : <SchedinaPage game={game} player={safePlayer} matches={matches} gameId={CLASSIC_GAME_ID} />
              }
            />
            <Route path="/classifica" element={<ClassificaPage game={game} player={safePlayer} players={players} loading={playersLoading} />} />
            <Route path="/confronto" element={<ConfrontoGiocatorePage game={game} player={safePlayer} players={players} matches={matches} />} />
            <Route path="/profilo" element={<ProfiloPage game={game} player={safePlayer} players={players} matches={matches} isAdmin={isAdminSession} hasPlayerProfile={hasAdminPlayerProfile} unreadAnnouncementCount={unreadAnnouncementCount} unreadPrivateMessageCount={unreadPrivateMessageCount} onLogout={handleLogout} />} />
            <Route path="/bacheca" element={<BachecaPage gameId={CLASSIC_GAME_ID} playerUid={effectivePlayerUid ?? ""} />} />
            <Route path="/messaggi" element={<MessaggiPage gameId={CLASSIC_GAME_ID} playerUid={effectivePlayerUid ?? ""} currentAuthUid={user?.uid ?? ""} />} />
            <Route path="/griglione" element={<RiepilogoPage game={game} players={players} matches={matches} currentPlayer={effectivePlayer ?? undefined} />} />
            <Route
              path="/golden-plus"
              element={goldenPlusRouteElement}
            />
            <Route path="/golden-plus/classifica" element={goldenClassificaRouteElement} />
            {isAdminSession && (
              <>
                <Route path="/admin" element={<AdminPage game={game} players={players} matches={matches} onLogout={handleLogout} />} />
                <Route path="/admin/risultati" element={<RisultatiPage matches={matches} gameId={CLASSIC_GAME_ID} />} />
                <Route path="/admin/giocatori" element={<GiocatoriPage players={players} gameId={CLASSIC_GAME_ID} />} />
                <Route path="/admin/riepilogo" element={<RiepilogoPage game={game} players={players} matches={matches} />} />
                <Route path="/admin/schedine" element={<SchedineRicevutePage players={players} matches={matches} gameId={CLASSIC_GAME_ID} game={game} />} />
                <Route path="/admin/confronto" element={<ConfrontoPage game={game} players={players} matches={matches} />} />
                <Route
                  path="/admin/golden-plus"
                  element={
                    <GoldenPlusAdminPanel
                      players={players}
                      goldenPlayers={goldenPlayersForAdmin}
                      currentUid={user?.uid ?? ""}
                      accessClosesAt={goldenAccessClosesAt}
                    />
                  }
                />
                <Route
                  path="/admin/golden-schedine"
                  element={
                    goldenGame ? (
                      <SchedineRicevutePage
                        players={goldenPlayersForAdmin}
                        matches={goldenMatches}
                        gameId={GOLDEN_GAME_ID}
                        game={goldenGame}
                        title="Schedine Golden"
                        subtitle={`${goldenPlayersForAdmin.filter((p) => p.scheduleStatus !== "bozza").length} inviate · ${goldenPlayersForAdmin.length} totali`}
                        backTo="/admin/golden-plus"
                        backLabel="Golden Plus"
                      />
                    ) : (
                      <PageSkeleton />
                    )
                  }
                />
                <Route
                  path="/admin/golden-risultati"
                  element={
                    goldenGame ? (
                      <RisultatiPage
                        matches={goldenMatches}
                        gameId={GOLDEN_GAME_ID}
                        predictionMode="qualifier"
                        title="Risultati Golden"
                        backTo="/admin/golden-plus"
                        backLabel="Golden Plus"
                        showAutomaticProposals={false}
                      />
                    ) : (
                      <PageSkeleton />
                    )
                  }
                />
                <Route path="/admin/annunci" element={<AdminAnnunciPage gameId={CLASSIC_GAME_ID} currentUid={user?.uid ?? ""} players={players} />} />
                <Route path="/admin/messaggi" element={<AdminMessaggiPage gameId={CLASSIC_GAME_ID} currentUid={user?.uid ?? ""} players={players} />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
      {loginAnnouncementItems.length > 0 && (
        <AnnouncementLoginModal announcements={loginAnnouncementItems} onConfirm={handleLoginAnnouncementsConfirm} />
      )}
      {!isAdminSession && (
        <Suspense fallback={null}>
          <Chatbot />
        </Suspense>
      )}
    </BrowserRouter>
  );
}
