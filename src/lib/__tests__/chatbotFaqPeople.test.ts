import { describe, expect, it } from "vitest";
import { matchFaq } from "../chatbotFaq";

describe("chatbot people FAQ", () => {
  it("answers the requested question about people", () => {
    const entry = matchFaq("cosa è la gente?");

    expect(entry?.id).toBe("gente");
    expect(entry?.answer).toBe("la gente è merda");
  });
});
