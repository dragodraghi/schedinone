import { render, screen } from "@testing-library/react";
import type { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import { AnnouncementCard } from "../AnnouncementCard";
import type { Announcement } from "../../lib/types";

const ts = {
  toDate: () => new Date("2026-06-04T15:38:00.000Z"),
  toMillis: () => new Date("2026-06-04T15:38:00.000Z").getTime(),
} as unknown as Timestamp;

describe("AnnouncementCard", () => {
  it("uses high contrast black text on a white service communication card", () => {
    const announcement: Announcement = {
      id: "a1",
      title: "COMUNICAZIONE DI SERVIZIO",
      body: "Leggere con attenzione.",
      status: "published",
      authorUid: "admin-1",
      targetUids: null,
      createdAt: ts,
      publishedAt: ts,
      editedAt: null,
      deletedAt: null,
    };

    render(<AnnouncementCard a={announcement} />);

    expect(screen.getByText("COMUNICAZIONE DI SERVIZIO").closest("article")).toHaveClass("bg-white", "text-slate-950");
    expect(screen.getByText("Leggere con attenzione.")).toHaveClass("text-slate-900");
  });

  it("renders internal Golden Plus paths as clickable links", () => {
    const announcement: Announcement = {
      id: "a1",
      title: "GOLDEN PLUS",
      body: "Clicca qui: /golden-plus per partecipare.",
      status: "published",
      authorUid: "admin-1",
      targetUids: null,
      createdAt: ts,
      publishedAt: ts,
      editedAt: null,
      deletedAt: null,
    };

    render(<AnnouncementCard a={announcement} />);

    expect(screen.getByRole("link", { name: "/golden-plus" })).toHaveAttribute("href", "/golden-plus");
    expect(screen.getByRole("link", { name: /partecipa al golden plus/i })).toHaveAttribute("href", "/golden-plus");
    expect(screen.getByText(/clicca qui:/i)).toBeInTheDocument();
  });
});
