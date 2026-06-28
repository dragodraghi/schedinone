import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GoldenPlusAdminPanel from "../GoldenPlusAdminPanel";
import type { Player } from "../../../lib/types";

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn((...parts: string[]) => ({ path: parts.join("/") })),
  doc: vi.fn((...parts: string[]) => ({ path: parts.join("/") })),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(() => "server-time"),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
}));

vi.mock("firebase/firestore", () => firestoreMocks);

vi.mock("../../../lib/firebase", () => ({
  db: {},
}));

const classicPlayers: Player[] = [
  {
    id: "player-1",
    name: "Italia",
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    predictions: {},
    topScorerPick: "",
    winnerPick: "",
    points: 0,
    paid: true,
    scheduleStatus: "accettata",
  },
];

function accessDoc(id: string, data: Record<string, unknown>) {
  return { id, data: () => data };
}

function renderPanel(props?: Partial<ComponentProps<typeof GoldenPlusAdminPanel>>) {
  return render(
    <MemoryRouter>
      <GoldenPlusAdminPanel players={classicPlayers} currentUid="admin-1" {...props} />
    </MemoryRouter>
  );
}

describe("GoldenPlusAdminPanel", () => {
  beforeEach(() => {
    firestoreMocks.collection.mockClear();
    firestoreMocks.doc.mockClear();
    firestoreMocks.serverTimestamp.mockClear();
    firestoreMocks.setDoc.mockClear();
    firestoreMocks.updateDoc.mockClear();
    firestoreMocks.onSnapshot.mockReset();
    firestoreMocks.onSnapshot.mockImplementation((_ref, cb: (snap: { docs: unknown[] }) => void) => {
      cb({
        docs: [
          accessDoc("new-player", {
            status: "pending",
            type: "new-request",
            displayName: "Team Golden",
            contact: "team@example.test",
          }),
          accessDoc("player-2", {
            status: "approved",
            type: "classic-player",
            displayName: "Brasile",
            classicPlayerUid: "player-2",
            paid: false,
          }),
          accessDoc("giallorossa", {
            status: "approved",
            type: "classic-player",
            displayName: "Giallorossa",
            classicPlayerUid: "giallorossa",
            paid: true,
          }),
        ],
      });
      return vi.fn();
    });
  });

  it("approves pending Golden Plus requests", async () => {
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: /approva team golden/i }));

    await waitFor(() => expect(firestoreMocks.updateDoc).toHaveBeenCalledTimes(1));
    expect(firestoreMocks.doc).toHaveBeenCalledWith(
      {},
      "games",
      "schedinone-golden-plus-2026",
      "access",
      "new-player"
    );
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(expect.anything(), {
      status: "approved",
      reviewedAt: "server-time",
      reviewedBy: "admin-1",
    });
  });

  it("authorizes a classic player without creating a Golden player", async () => {
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: /autorizza italia/i }));

    await waitFor(() => expect(firestoreMocks.setDoc).toHaveBeenCalledTimes(1));
    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      expect.anything(),
      {
        status: "approved",
        type: "classic-player",
        displayName: "Italia",
        classicPlayerUid: "player-1",
        paid: false,
        createdAt: "server-time",
        reviewedAt: "server-time",
        reviewedBy: "admin-1",
      },
      { merge: true }
    );
  });

  it("revokes approved access", async () => {
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: /revoca brasile/i }));

    await waitFor(() => expect(firestoreMocks.updateDoc).toHaveBeenCalledTimes(1));
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(expect.anything(), {
      status: "revoked",
      reviewedAt: "server-time",
      reviewedBy: "admin-1",
    });
  });

  it("marks an approved Golden Plus access as paid", async () => {
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: /segna pagato brasile/i }));

    await waitFor(() => expect(firestoreMocks.updateDoc).toHaveBeenCalledTimes(1));
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(expect.anything(), {
      paid: true,
      reviewedAt: "server-time",
      reviewedBy: "admin-1",
    });
  });

  it("shows paid approved access as a green status instead of a long primary action", async () => {
    renderPanel();

    expect(screen.getByRole("link", { name: /schedine golden/i })).toHaveAttribute("href", "/admin/golden-schedine");
    expect(screen.getByRole("link", { name: /risultati golden/i })).toHaveAttribute("href", "/admin/golden-risultati");

    const row = await screen.findByTestId("approved-access-giallorossa");
    const paidBadge = within(row).getByText("Pagato");

    expect(paidBadge).toHaveClass("text-[var(--correct)]");
    expect(within(row).queryByRole("button", { name: /segna non pagato giallorossa/i })).not.toBeInTheDocument();
    expect(within(row).getByRole("button", { name: /annulla pagamento giallorossa/i })).toBeInTheDocument();
  });

  it("shows a Golden submitted schedules section with accepted players", async () => {
    renderPanel({
      goldenPlayers: [
        {
          ...classicPlayers[0],
          id: "golden-1",
          name: "Giallorossa",
          scheduleStatus: "accettata",
          predictions: { "r32-01": "1" },
        },
        {
          ...classicPlayers[0],
          id: "golden-2",
          name: "Muzzo",
          scheduleStatus: "bozza",
          predictions: {},
        },
      ],
    });

    const section = await screen.findByTestId("golden-compiled-section");

    expect(within(section).getByRole("heading", { name: /schedine compilate/i })).toBeInTheDocument();
    expect(section).toHaveTextContent("1 compilata");
    expect(within(section).getByText("Giallorossa")).toBeInTheDocument();
    expect(within(section).getByText("Accettata")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /apri schedine compilate/i })).toHaveAttribute(
      "href",
      "/admin/golden-schedine"
    );
  });

  it("blocks new approvals after the Golden Plus deadline but still allows revokes", async () => {
    renderPanel({
      accessClosesAt: new Date("2026-06-28T18:00:00Z"),
      now: new Date("2026-06-28T18:00:00Z"),
    });

    expect(await screen.findByText(/inviti chiusi/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /approvazioni chiuse per team golden/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /approvazioni chiuse per italia/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /revoca brasile/i }));

    await waitFor(() => expect(firestoreMocks.updateDoc).toHaveBeenCalledTimes(1));
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(expect.anything(), {
      status: "revoked",
      reviewedAt: "server-time",
      reviewedBy: "admin-1",
    });
  });
});
