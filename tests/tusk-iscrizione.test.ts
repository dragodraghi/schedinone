import { describe, expect, it } from "vitest";
import {
  sanitizeTuskIscrizioneInput,
  TuskIscrizioneInputError,
} from "../functions/src/tuskIscrizioneData";

describe("sanitizeTuskIscrizioneInput", () => {
  it("normalizes a valid athlete registration", () => {
    const result = sanitizeTuskIscrizioneInput({
      nome: "  Mario   Rossi  ",
      categoriaId: "challenge",
      box: "  Bad   Boars  ",
      contatto: "  mario@example.com  ",
      note: "  Prima gara  ",
    });

    expect(result).toEqual({
      nome: "Mario Rossi",
      categoriaId: "challenge",
      box: "Bad Boars",
      contatto: "mario@example.com",
      note: "Prima gara",
    });
  });

  it("rejects an unknown category before writing to Firestore", () => {
    expect(() =>
      sanitizeTuskIscrizioneInput({
        nome: "Mario Rossi",
        categoriaId: "rx",
        box: "Bad Boars",
        contatto: "mario@example.com",
        note: "",
      })
    ).toThrow(TuskIscrizioneInputError);
  });

  it("rejects invalid contact data", () => {
    expect(() =>
      sanitizeTuskIscrizioneInput({
        nome: "Mario Rossi",
        categoriaId: "challenge",
        box: "Bad Boars",
        contatto: "abc",
        note: "",
      })
    ).toThrow("Contatto non valido.");
  });

  it("rejects notes longer than 300 characters", () => {
    expect(() =>
      sanitizeTuskIscrizioneInput({
        nome: "Mario Rossi",
        categoriaId: "challenge",
        box: "Bad Boars",
        contatto: "mario@example.com",
        note: "x".repeat(301),
      })
    ).toThrow("Note troppo lunghe.");
  });
});
