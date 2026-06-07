import { render, screen } from "@testing-library/react";
import type { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import { ChatMessageBubble } from "../ChatMessageBubble";
import type { ChatMessage } from "../../lib/types";

const ts = {
  toDate: () => new Date("2026-06-04T15:00:00.000Z"),
} as unknown as Timestamp;

describe("ChatMessageBubble", () => {
  it("keeps long private messages readable on narrow screens", () => {
    const message: ChatMessage = {
      id: "m1",
      text: "Messaggio molto lungo con indicazioni importanti per la schedina e per il pagamento da leggere senza ruotare il telefono.",
      from: "committee",
      senderUid: "committee-1",
      createdAt: ts,
    };

    render(<ChatMessageBubble m={message} currentUid="player-1" />);

    const text = screen.getByText(message.text);
    expect(text).toHaveClass("break-words");
    expect(text.closest("div")).toHaveClass("max-w-[min(86vw,34rem)]");
  });
});
