import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "./App";
import type { Announcement, Game, GoldenAccess, Player, Thread } from "./lib/types";

const signOutMock = vi.fn();
const signInWithEmailAndPasswordMock = vi.fn();
const chatMocks = vi.hoisted(() => ({
  subscribeThread: vi.fn(),
}));
const announcementMocks = vi.hoisted(() => ({
  countUnreadAnnouncements: vi.fn<(...args: unknown[]) => number>(() => 0),
  markAnnouncementsRead: vi.fn<(gameId: string, playerUid: string) => Promise<void>>(() => Promise.resolve()),
  subscribeAnnouncementsForPlayer: vi.fn<
    (gameId: string, uid: string, cb: (items: Announcement[]) => void) => () => void
  >(() => vi.fn()),
}));
const functionsMocks = vi.hoisted(() => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(),
}));
const goldenAccessMocks = vi.hoisted(() => ({
  useGoldenAccess: vi.fn<
    (gameId: string, uid: string | null, enabled?: boolean) => { access: GoldenAccess | null; loading: boolean }
  >(() => ({ access: null, loading: false })),
  useGoldenAccessList: vi.fn<
    (gameId: string, enabled?: boolean) => { accessItems: GoldenAccess[]; loading: boolean }
  >(() => ({ accessItems: [], loading: false })),
}));

let authUser: { uid: string; isAnonymous: boolean } | null = { uid: "player-1", isAnonymous: true };
let goldenPlayerLookupUid: string | null = null;
const useCurrentPlayerMock = vi.fn((_gameId: string, uid: string | undefined, _enabled: boolean) => ({
  player: uid === player.id || uid === goldenPlayerLookupUid ? player : null,
  loading: false,
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
  countUnreadAnnouncements: announcementMocks.countUnreadAnnouncements,
  markAnnouncementsRead: announcementMocks.markAnnouncementsRead,
  subscribeAnnouncementsForPlayer: announcementMocks.subscribeAnnouncementsForPlayer,
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

const goldenGame: Game = {
  ...game,
  id: "schedinone-golden-plus-2026",
  name: "Schedinone Golden Plus",
  entryFee: 20,
  phases: ["sedicesimi", "ottavi", "quarti", "semifinali", "finale"],
  currentPhase: "sedicesimi",
  mode: "golden-plus",
  predictionMode: "qualifier",
  specialPicksEnabled: false,
};

vi.mock("./hooks/useAuth", () => ({
  useAuth: () => ({
    user: authUser,
    loading: false,
  }),
}));

vi.mock("./hooks/useGame", () => ({
  useGame: (gameId: string) => ({
    game: gameId === "schedinone-golden-plus-2026" ? goldenGame : game,
    loading: false,
  }),
}));

vi.mock("./hooks/useMatches", () => ({
  useMatches: () => ({ matches: [] }),
}));

vi.mock("./hooks/usePlayers", () => ({
  useCurrentPlayer: (...args: [string, string | undefined, boolean]) => useCurrentPlayerMock(...args),
  usePlayers: () => ({ players: [player], loading: false }),
  usePublicPlayers: () => ({ players: [player], loading: false }),
}));

vi.mock("./hooks/useGoldenAccess", () => goldenAccessMocks);

vi.mock("./components/Layout", () => ({
  default: ({
    children,
    hasPlayerProfile,
    hasGoldenAccess,
  }: {
    children: React.ReactNode;
    hasPlayerProfile?: boolean;
    hasGoldenAccess?: boolean;
  }) => (
    <div>
      <div>has-player-profile:{String(hasPlayerProfile)}</div>
      <div>has-golden-access:{String(hasGoldenAccess)}</div>
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
  default: ({ game, title }: { game: Game; title?: string }) => (
    <div>Classifica:{title ?? "Classifica"}:{game.id}</div>
  ),
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

vi.mock("./pages/golden/GoldenPlusAccessGate", () => ({
  default: ({
    access,
    children,
    userUid,
  }: {
    access?: { status?: string } | null;
    children: React.ReactNode;
    userUid?: string;
  }) => (
    access?.status === "approved" ? <div>{children}</div> : <div>Golden access request form uid:{userUid}</div>
  ),
}));

vi.mock("./pages/golden/GoldenBracketPage", () => ({
  default: ({ gameId }: { gameId: string }) => <div>Golden bracket page:{gameId}</div>,
}));

describe("App player session switching", () => {
  beforeEach(() => {
    signOutMock.mockReset();
    signInWithEmailAndPasswordMock.mockReset();
    signInWithEmailAndPasswordMock.mockImplementation(async () => {
      authUser = { uid: "admin-1", isAnonymous: false };
    });
    announcementMocks.countUnreadAnnouncements.mockReset();
    announcementMocks.countUnreadAnnouncements.mockReturnValue(0);
    announcementMocks.markAnnouncementsRead.mockReset();
    announcementMocks.markAnnouncementsRead.mockResolvedValue(undefined);
    announcementMocks.subscribeAnnouncementsForPlayer.mockReset();
    announcementMocks.subscribeAnnouncementsForPlayer.mockImplementation(() => vi.fn());
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
    goldenPlayerLookupUid = null;
    goldenAccessMocks.useGoldenAccess.mockReset();
    goldenAccessMocks.useGoldenAccess.mockReturnValue({ access: null, loading: false });
    goldenAccessMocks.useGoldenAccessList.mockReset();
    goldenAccessMocks.useGoldenAccessList.mockReturnValue({ accessItems: [], loading: false });
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

  it("keeps Golden Plus hidden without an approved access grant", async () => {
    render(<App />);

    expect(await screen.findByText("has-golden-access:false")).toBeInTheDocument();
  });

  it("uses a linked classic Golden grant while loading the Golden player by current auth uid", async () => {
    authUser = { uid: "device-flowers-2", isAnonymous: true };
    game.playerDeviceAliases = { "device-flowers-2": "player-1" };
    goldenPlayerLookupUid = "device-flowers-2";
    goldenAccessMocks.useGoldenAccess.mockImplementation((_gameId, uid) => ({
      access:
        uid === "player-1"
          ? {
              id: "player-1",
              status: "approved",
              type: "classic-player",
              displayName: "Italia",
            }
          : null,
      loading: false,
    }));

    render(<App />);

    await screen.findByText("has-golden-access:true");
    expect(goldenAccessMocks.useGoldenAccess).toHaveBeenNthCalledWith(
      1,
      "schedinone-golden-plus-2026",
      "device-flowers-2",
      true
    );
    expect(goldenAccessMocks.useGoldenAccess).toHaveBeenNthCalledWith(
      2,
      "schedinone-golden-plus-2026",
      "player-1",
      true
    );
    expect(useCurrentPlayerMock).toHaveBeenCalledWith(
      "schedinone-golden-plus-2026",
      "device-flowers-2",
      true
    );
  });

  it("uses the linked classic player uid immediately on direct Golden Plus routes from extra devices", () => {
    authUser = { uid: "device-flowers-2", isAnonymous: true };
    game.playerDeviceAliases = { "device-flowers-2": "player-1" };
    goldenPlayerLookupUid = "device-flowers-2";
    goldenAccessMocks.useGoldenAccess.mockImplementation((_gameId, uid) => ({
      access:
        uid === "player-1"
          ? {
              id: "player-1",
              status: "approved",
              type: "classic-player",
              displayName: "Italia",
            }
          : null,
      loading: false,
    }));
    window.history.pushState({}, "", "/golden-plus");

    render(<App />);

    expect(goldenAccessMocks.useGoldenAccess).toHaveBeenNthCalledWith(
      1,
      "schedinone-golden-plus-2026",
      "device-flowers-2",
      true
    );
    expect(goldenAccessMocks.useGoldenAccess).toHaveBeenNthCalledWith(
      2,
      "schedinone-golden-plus-2026",
      "player-1",
      true
    );
  });

  it("submits new Golden Plus requests with the current auth uid on extra devices", async () => {
    authUser = { uid: "device-flowers-2", isAnonymous: true };
    game.playerDeviceAliases = { "device-flowers-2": "player-1" };
    goldenAccessMocks.useGoldenAccess.mockReturnValue({ access: null, loading: false });
    window.history.pushState({}, "", "/golden-plus");

    render(<App />);

    expect(await screen.findByText("Golden access request form uid:device-flowers-2")).toBeInTheDocument();
  });

  it("looks up Golden Plus access through the linked player uid for admin-player sessions", async () => {
    authUser = { uid: "admin-1", isAnonymous: false };
    game.adminPlayerUids = { "admin-1": "player-1" };
    goldenPlayerLookupUid = "player-1";
    goldenAccessMocks.useGoldenAccess.mockReturnValue({
      access: {
        id: "player-1",
        status: "approved",
        type: "classic-player",
        displayName: "Italia",
      },
      loading: false,
    });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /admin login/i }));
    fireEvent.click(await screen.findByRole("button", { name: /complete splash/i }));

    expect(await screen.findByText("has-golden-access:true")).toBeInTheDocument();
    expect(goldenAccessMocks.useGoldenAccess).toHaveBeenCalledWith(
      "schedinone-golden-plus-2026",
      "admin-1",
      true
    );
    expect(goldenAccessMocks.useGoldenAccess).toHaveBeenCalledWith(
      "schedinone-golden-plus-2026",
      "player-1",
      true
    );
    expect(useCurrentPlayerMock).toHaveBeenCalledWith(
      "schedinone-golden-plus-2026",
      "player-1",
      true
    );
  });

  it("routes approved players to the Golden Plus bracket page", async () => {
    goldenAccessMocks.useGoldenAccess.mockReturnValue({
      access: {
        id: "player-1",
        status: "approved",
        type: "classic-player",
        displayName: "Italia",
      },
      loading: false,
    });
    window.history.pushState({}, "", "/golden-plus");

    render(<App />);

    expect(
      await screen.findByText("Golden bracket page:schedinone-golden-plus-2026")
    ).toBeInTheDocument();
  });

  it("routes approved players to the Golden Plus leaderboard", async () => {
    goldenAccessMocks.useGoldenAccess.mockReturnValue({
      access: {
        id: "player-1",
        status: "approved",
        type: "classic-player",
        displayName: "Italia",
      },
      loading: false,
    });
    window.history.pushState({}, "", "/golden-plus/classifica");

    render(<App />);

    expect(
      await screen.findByText("Classifica:Classifica Golden:schedinone-golden-plus-2026")
    ).toBeInTheDocument();
  });

  it("opens the Golden Plus request page without a classic player login", async () => {
    authUser = { uid: "new-golden-user", isAnonymous: true };
    window.history.pushState({}, "", "/golden-plus");

    render(<App />);

    expect(await screen.findByText(/Golden access request form/)).toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
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

  it("requires players to acknowledge unread announcements after login", async () => {
    const announcement: Announcement = {
      id: "announcement-1",
      title: "COMUNICAZIONE DI SERVIZIO",
      body: "Leggere prima di continuare.",
      status: "published",
      authorUid: "admin-1",
      targetUids: null,
      createdAt: { toMillis: () => 1, toDate: () => new Date("2026-06-15T10:00:00Z") } as Announcement["createdAt"],
      publishedAt: {
        toMillis: () => 1,
        toDate: () => new Date("2026-06-15T10:00:00Z"),
      } as Announcement["publishedAt"],
      editedAt: null,
      deletedAt: null,
    };
    announcementMocks.countUnreadAnnouncements.mockReturnValue(1);
    announcementMocks.subscribeAnnouncementsForPlayer.mockImplementation(
      (_gameId: string, _uid: string, cb: (items: Announcement[]) => void) => {
        cb([announcement]);
        return vi.fn();
      }
    );

    render(<App />);

    const dialog = await screen.findByRole("dialog", { name: /annunci da leggere/i });

    expect(within(dialog).getByText("COMUNICAZIONE DI SERVIZIO")).toBeInTheDocument();
    expect(within(dialog).getByText("Leggere prima di continuare.")).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /chiudi/i })).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /ho letto/i }));

    await waitFor(() =>
      expect(announcementMocks.markAnnouncementsRead).toHaveBeenCalledWith("schedinone-2026", "player-1")
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
