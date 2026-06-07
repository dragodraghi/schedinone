import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Timestamp } from "firebase/firestore";
import MessaggiPage from "../MessaggiPage";
import type { ChatMessage, Thread } from "../../lib/types";

const chatMocks = vi.hoisted(() => ({
  subscribeMessages: vi.fn(),
  subscribeThread: vi.fn(),
  sendMessage: vi.fn(),
  markThreadRead: vi.fn(),
}));

vi.mock("../../lib/chat", () => chatMocks);

const ts = {
  toDate: () => new Date("2026-06-04T15:00:00.000Z"),
} as unknown as Timestamp;

const messages: ChatMessage[] = [
  {
    id: "m1",
    text: "Ciao Comitato, devo chiedere una cosa sulla mia schedina.",
    from: "player",
    senderUid: "player-1",
    createdAt: ts,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MessaggiPage", () => {
  it("uses a compact mobile chat layout with a stacked composer", () => {
    chatMocks.subscribeMessages.mockImplementation((_gameId: string, _uid: string, cb: (items: ChatMessage[]) => void) => {
      cb(messages);
      return vi.fn();
    });
    chatMocks.subscribeThread.mockReturnValue(vi.fn());
    chatMocks.markThreadRead.mockResolvedValue(undefined);

    render(<MessaggiPage gameId="schedinone-2026" playerUid="player-1" />);

    expect(screen.getByLabelText("Messaggi privati")).toHaveClass("mx-auto", "max-w-2xl");
    expect(screen.getByTestId("player-message-composer")).toHaveClass("flex-col", "sm:flex-row");
    expect(screen.getByRole("button", { name: /invia/i })).toHaveClass("w-full", "sm:w-24");
  });

  it("marks committee replies read when the open thread reports unread messages", () => {
    let threadCb: ((thread: Thread | null) => void) | null = null;
    chatMocks.subscribeMessages.mockImplementation((_gameId: string, _uid: string, cb: (items: ChatMessage[]) => void) => {
      cb(messages);
      return vi.fn();
    });
    chatMocks.subscribeThread.mockImplementation((_gameId: string, _uid: string, cb: (thread: Thread | null) => void) => {
      threadCb = cb;
      return vi.fn();
    });
    chatMocks.markThreadRead.mockResolvedValue(undefined);

    render(<MessaggiPage gameId="schedinone-2026" playerUid="player-1" />);

    expect(chatMocks.markThreadRead).not.toHaveBeenCalled();
    act(() => {
      threadCb?.({
        playerUid: "player-1",
        playerName: "Italia",
        lastMessageAt: ts,
        lastMessagePreview: "Pagamento ricevuto",
        lastMessageFrom: "committee",
        unreadByPlayer: 2,
        unreadByCommittee: 0,
      });
    });

    return waitFor(() => {
      expect(chatMocks.markThreadRead).toHaveBeenCalledWith("schedinone-2026", "player-1");
    });
  });

  it("sends player messages with the current auth uid for an extra device", async () => {
    chatMocks.subscribeMessages.mockImplementation((_gameId: string, _uid: string, cb: (items: ChatMessage[]) => void) => {
      cb([]);
      return vi.fn();
    });
    chatMocks.subscribeThread.mockReturnValue(vi.fn());
    chatMocks.sendMessage.mockResolvedValue(undefined);

    render(
      <MessaggiPage
        gameId="schedinone-2026"
        playerUid="player-1"
        currentAuthUid="player-1-device-2"
      />
    );

    fireEvent.change(screen.getByLabelText("Testo del messaggio"), {
      target: { value: "Ciao dal secondo dispositivo" },
    });
    fireEvent.click(screen.getByRole("button", { name: /invia/i }));

    await waitFor(() => {
      expect(chatMocks.sendMessage).toHaveBeenCalledWith(
        "schedinone-2026",
        "player-1",
        "player-1-device-2",
        "player",
        "Ciao dal secondo dispositivo"
      );
    });
  });
});
