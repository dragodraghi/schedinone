import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GoldenPlusAccessGate from "../GoldenPlusAccessGate";
import type { GoldenAccess, Player } from "../../../lib/types";

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn((...parts: string[]) => ({ path: parts.join("/") })),
  serverTimestamp: vi.fn(() => "server-time"),
  setDoc: vi.fn(() => Promise.resolve()),
}));

const functionMocks = vi.hoisted(() => ({
  getFunctions: vi.fn(() => "functions"),
  httpsCallable: vi.fn(),
}));

vi.mock("firebase/firestore", () => firestoreMocks);

vi.mock("firebase/functions", () => functionMocks);

vi.mock("../../../lib/firebase", () => ({
  app: {},
  db: {},
}));

const approvedAccess: GoldenAccess = {
  id: "player-1",
  status: "approved",
  type: "classic-player",
  displayName: "Italia",
};

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

function renderGate({
  access = null,
  accessLoading = false,
  goldenPlayer = null,
  userUid = "player-1",
}: {
  access?: GoldenAccess | null;
  accessLoading?: boolean;
  goldenPlayer?: Player | null;
  userUid?: string;
} = {}) {
  return render(
    <GoldenPlusAccessGate
      gameId="schedinone-golden-plus-2026"
      access={access}
      accessLoading={accessLoading}
      userUid={userUid}
      player={goldenPlayer}
    >
      <div>Golden ready</div>
    </GoldenPlusAccessGate>
  );
}

describe("GoldenPlusAccessGate", () => {
  beforeEach(() => {
    firestoreMocks.doc.mockClear();
    firestoreMocks.serverTimestamp.mockClear();
    firestoreMocks.setDoc.mockClear();
    functionMocks.getFunctions.mockClear();
    functionMocks.httpsCallable.mockReset();
    functionMocks.httpsCallable.mockReturnValue(vi.fn(() => Promise.resolve({ data: { ok: true } })));
  });

  it("lets a new user create a pending access request", async () => {
    renderGate();

    fireEvent.change(screen.getByLabelText(/nome squadra/i), { target: { value: "Team Golden" } });
    fireEvent.change(screen.getByLabelText(/contatto/i), { target: { value: "team@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: /richiedi iscrizione/i }));

    await waitFor(() => expect(firestoreMocks.setDoc).toHaveBeenCalledTimes(1));
    expect(firestoreMocks.doc).toHaveBeenCalledWith(
      {},
      "games",
      "schedinone-golden-plus-2026",
      "access",
      "player-1"
    );
    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(expect.anything(), {
      status: "pending",
      type: "new-request",
      displayName: "Team Golden",
      contact: "team@example.test",
      createdAt: "server-time",
    });
  });

  it("shows waiting and blocked states without joining", () => {
    const { rerender } = renderGate({
      access: {
        id: "player-1",
        status: "pending",
        type: "new-request",
        displayName: "Team Golden",
      },
    });

    expect(screen.getByText(/richiesta in attesa/i)).toBeInTheDocument();
    expect(functionMocks.httpsCallable).not.toHaveBeenCalled();

    rerender(
      <GoldenPlusAccessGate
        gameId="schedinone-golden-plus-2026"
        access={{
          id: "player-1",
          status: "revoked",
          type: "new-request",
          displayName: "Team Golden",
        }}
        accessLoading={false}
        userUid="player-1"
        player={null}
      >
        <div>Golden ready</div>
      </GoldenPlusAccessGate>
    );

    expect(screen.getByText(/accesso golden plus non attivo/i)).toBeInTheDocument();
  });

  it("renders children when access is approved and player exists", () => {
    renderGate({ access: approvedAccess, goldenPlayer: player });

    expect(screen.getByText("Golden ready")).toBeInTheDocument();
    expect(functionMocks.httpsCallable).not.toHaveBeenCalled();
  });

  it("creates the Golden player once when access is approved but player is missing", async () => {
    const joinGame = vi.fn(() => Promise.resolve({ data: { ok: true } }));
    functionMocks.httpsCallable.mockReturnValue(joinGame);

    renderGate({ access: approvedAccess, goldenPlayer: null });

    await waitFor(() => expect(joinGame).toHaveBeenCalledTimes(1));
    expect(functionMocks.httpsCallable).toHaveBeenCalledWith("functions", "joinGame");
    expect(joinGame).toHaveBeenCalledWith({
      gameId: "schedinone-golden-plus-2026",
      name: "Italia",
      code: "",
    });
    expect(screen.getByText(/preparazione golden plus/i)).toBeInTheDocument();
  });

  it("does not allow new requests after the Golden Plus deadline", () => {
    render(
      <GoldenPlusAccessGate
        gameId="schedinone-golden-plus-2026"
        access={null}
        accessLoading={false}
        userUid="player-1"
        player={null}
        accessClosesAt={new Date("2026-06-28T18:00:00Z")}
        now={new Date("2026-06-28T18:00:00Z")}
      >
        <div>Golden ready</div>
      </GoldenPlusAccessGate>
    );

    expect(screen.getByText(/richieste golden plus chiuse/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /richiedi iscrizione/i })).not.toBeInTheDocument();
    expect(firestoreMocks.setDoc).not.toHaveBeenCalled();
  });

  it("keeps the request button disabled until an auth uid is available", () => {
    renderGate({ userUid: "" });

    fireEvent.change(screen.getByLabelText(/nome squadra/i), { target: { value: "Team Golden" } });
    expect(screen.getByRole("button", { name: /richiedi iscrizione/i })).toBeDisabled();
  });
});
