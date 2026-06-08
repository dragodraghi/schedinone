import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import type { Game, Player, Thread } from "./lib/types";

const signOutMock = vi.fn();
const signInWithEmailAndPasswordMock = vi.fn();
const chatMocks = vi.hoisted(() => ({
  subscribeThread: vi.fn(),
}));
const functionsMocks = vi.hoisted(() => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  signOut: (...args: unknown[]) => signOutMock(...args),
  signInWithEmailAndPassword: (...args: unknown[]) => signInWithEmailAndPasswordMock(...args),
}));

vi.mock("firebase/functions", () => ({
  getFunctions: (...args: unknown[]) => functionsMocks.getFunctions(...args),
  httpsCallable: (...args: unknown[]) => functionsMocks.httpsCallable(...args),
}));

vi.mock("./lib/firebase", () => ({
  auth: {},
}));

vi.mock("./lib/auth", () => ({
  loginAnonymously: vi.fn(),
}));

vi.mock("./lib/messaging", () => ({
  initPushForUser: vi.fn(() => Promise.resolve()),
}));

vi.mock("./lib/announcements", () => ({
  countUnreadAnnouncements: vi.fn(() => 0),
  subscribeAnnouncementsForPlayer: vi.fn(() => vi.fn()),
}));

vi.mock("./lib/chat", () => chatMocks);

const player: Player = {
  id: "player-1",
  name: "Italia",
  joinedAt: new Date("2026-01-01T00:00:00Z"),
  predictions: {},
  topScorerPick: "",
  winnerPick: "",
  points: 0,
  paid: false,
  scheduleStatus: "bozza",
};

const game: Game = {
  id: "schedinone-2026",
  name: "Schedinone",
  entryFee: 50,
  admins: ["admin-1"],
  accessCode: "test",
  phases: ["gironi"],
  currentPhase: "gironi",
  topScorer: null,
  winner: null,
};

let authUser: { uid: string; isAnonymous: boolean } | null = { uid: "player-1", isAnonymous: true };
const useCurrentPlayerMock = vi.fn((_gameId: string, uid: string | undefined, _enabled: boolean) => ({
  player: uid === player.id ? player : null,
  loading: false,
}));

vi.mock("./hooks/useAuth", () => ({
  useAuth: () => ({
    user: authUser,
    loading: false,
  }),
}));

vi.mock("./hooks/useGame", () => ({
  useGame: () => ({ game, loading: false }),
}));

vi.mock("./hooks/useMatches", () => ({
  useMatches: () => ({ matches: [] }),
}));

vi.mock("./hooks/usePlayers", () => ({
  useCurrentPlayer: (...args: [string, string | undefined, boolean]) => useCurrentPlayerMock(...args),
  usePlayers: () => ({ players: [player], loading: false }),
  usePublicPlayers: () => ({ players: [player], loading: false }),
}));

vi.mock("./components/Layout", () => ({
  default: ({ children, hasPlayerProfile }: { children: React.ReactNode; hasPlayerProfile?: boolean }) => (
    <div>
      <div>has-player-profile:{String(hasPlayerProfile)}</div>
      {children}
    </div>
  ),
}));

vi.mock("./components/SplashScreen", () => ({
  default: ({ onComplete }: { onComplete: () => void }) => (
    <button type="button" onClick={onComplete}>
      Complete splash
    </button>
  ),
}));

vi.mock("./components/PageSkeleton", () => ({
  default: () => <div>Loading</div>,
}));

vi.mock("./components/Chatbot", () => ({
  default: () => null,
}));

vi.mock("./pages/LoginPage", () => ({
  default: ({
    onLogin,
    onAdminLogin,
    error,
  }: {
    onLogin: (name: string, code: string) => void;
    onAdminLogin: (email: string, password: string) => void;
    error?: string;
  }) => (
    <div>
      <div>Login page</div>
      {error && <div role="alert">{error}</div>}
      <button type="button" onClick={() => onLogin("THE FLOWERS", "GIOCA2026")}>
        Player login
      </button>
      <button type="button" onClick={() => onLogin("Comitato", "GIOCA2026")}>
        Committee name player login
      </button>
      <button type="button" onClick={() => onAdminLogin("admin@example.test", "password")}>
        Admin login
      </button>
    </div>
  ),
}));

vi.mock("./pages/DashboardPage", () => ({
  default: ({ unreadPrivateMessageCount }: { unreadPrivateMessageCount?: number }) => (
    <div>Dashboard unread-private:{unreadPrivateMessageCount ?? "missing"}</div>
  ),
}));

vi.mock("./pages/SchedinaPage", () => ({
  default: () => <div>Schedina</div>,
}));

vi.mock("./pages/ClassificaPage", () => ({
  default: () => <div>Classifica</div>,
}));

vi.mock("./pages/ProfiloPage", () => ({
  default: ({ player, onLogout }: { player: Player; onLogout: () => void }) => (
    <div>
      <div>Profile {player.name}</div>
      <button type="button" onClick={onLogout}>
        Mock player logout
      </button>
    </div>
  ),
}));

vi.mock("./pages/BachecaPage", () => ({
  default: () => <div>Bacheca</div>,
}));

vi.mock("./pages/MessaggiPage", () => ({
  default: () => <div>Messaggi</div>,
}));

describe("App player session switching", () => {
  beforeEach(() => {
    signOutMock.mockReset();
    signInWithEmailAndPasswordMock.mockReset();
    signInWithEmailAndPasswordMock.mockImplementation(async () => {
      authUser = { uid: "admin-1", isAnonymous: false };
    });
    useCurrentPlayerMock.mockClear();
    chatMocks.subscribeThread.mockReset();
    chatMocks.subscribeThread.mockImplementation(
      (_gameId: string, _threadUid: string, cb: (thread: Thread | null) => void) => {
        cb(null);
        return vi.fn();
      }
    );
    authUser = { uid: "player-1", isAnonymous: true };
    game.adminPlayerUids = undefined;
    game.playerDeviceAliases = undefined;
    functionsMocks.getFunctions.mockReset();
    functionsMocks.httpsCallable.mockReset();
    functionsMocks.httpsCallable.mockReturnValue(vi.fn(async () => ({ data: { ok: true, createdPlayer: false } })));
    window.history.pushState({}, "", "/");
  });

  it("signs out an anonymous player when they leave to switch login", async () => {
    signOutMock.mockResolvedValue(undefined);
    window.history.pushState({}, "", "/profilo");

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /mock player logout/i }));

    await waitFor(() => expect(signOutMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });

  it("uses the linked player profile after admin login", async () => {
    authUser = { uid: "anonymous-no-player", isAnonymous: true };
    game.adminPlayerUids = { "admin-1": "player-1" };
    window.history.pushState({}, "", "/profilo");

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /admin login/i }));
    fireEvent.click(await screen.findByRole("button", { name: /complete splash/i }));

    expect(await screen.findByText("Profile Italia")).toBeInTheDocument();
    expect(screen.getByText("has-player-profile:true")).toBeInTheDocument();
    expect(useCurrentPlayerMock).toHaveBeenCalledWith("schedinone-2026", "player-1", true);
  });

  it("uses the player uid returned by joinGame before the alias snapshot refreshes", async () => {
    authUser = { uid: "device-flowers-2", isAnonymous: true };
    const joinGameMock = vi.fn(async () => ({
      data: { ok: true, createdPlayer: false, playerUid: "player-1" },
    }));
    functionsMocks.httpsCallable.mockReturnValue(joinGameMock);
    window.history.pushState({}, "", "/profilo");

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^player login$/i }));
    fireEvent.click(await screen.findByRole("button", { name: /complete splash/i }));

    expect(await screen.findByText("Profile Italia")).toBeInTheDocument();
    expect(useCurrentPlayerMock).toHaveBeenCalledWith("schedinone-2026", "player-1", true);
  });

  it("shows the server message when a reserved player name is rejected", async () => {
    authUser = { uid: "anonymous-no-player", isAnonymous: true };
    functionsMocks.httpsCallable.mockReturnValue(
      vi.fn(async () => {
        throw {
          code: "functions/invalid-argument",
          message: "Questo nome non puo' essere usato come squadra. Usa il nome squadra corretto.",
        };
      })
    );

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /committee name player login/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Questo nome non puo' essere usato come squadra. Usa il nome squadra corretto."
    );
  });

  it("passes private committee replies to the player home", async () => {
    chatMocks.subscribeThread.mockImplementation(
      (_gameId: string, _threadUid: string, cb: (thread: Thread | null) => void) => {
        cb({
          playerUid: "player-1",
          playerName: "Italia",
          lastMessageAt: { toMillis: () => 1 } as Thread["lastMessageAt"],
          lastMessagePreview: "Pagamento ricevuto",
          lastMessageFrom: "committee",
          unreadByPlayer: 3,
          unreadByCommittee: 0,
        });
        return vi.fn();
      }
    );

    render(<App />);

    expect(await screen.findByText("Dashboard unread-private:3")).toBeInTheDocument();
    expect(chatMocks.subscribeThread).toHaveBeenCalledWith("schedinone-2026", "player-1", expect.any(Function));
  });
});
