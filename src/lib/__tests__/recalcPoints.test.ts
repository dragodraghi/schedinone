import { beforeEach, describe, expect, it, vi } from "vitest";
import { recalcPointsClient } from "../recalcPoints";

const httpsCallableMock = vi.hoisted(() => vi.fn());

vi.mock("firebase/functions", () => ({
  httpsCallable: httpsCallableMock,
}));

vi.mock("../firebase", () => ({
  functions: {},
}));

describe("recalcPointsClient", () => {
  beforeEach(() => {
    httpsCallableMock.mockReset();
  });

  it("delegates point recalculation to the server callable", async () => {
    const callable = vi.fn().mockResolvedValue({
      data: { ok: true, playersUpdated: 2, matchesCounted: 5 },
    });
    httpsCallableMock.mockReturnValue(callable);

    await expect(recalcPointsClient("game-1")).resolves.toEqual({
      playersUpdated: 2,
      matchesCounted: 5,
    });
    expect(httpsCallableMock).toHaveBeenCalledWith({}, "recalculatePointsNow");
    expect(callable).toHaveBeenCalledWith({ gameId: "game-1" });
  });
});
