export type TuskCategoriaId =
  | "ultimate"
  | "advanced"
  | "challenge"
  | "essential"
  | "performance"
  | "intermediate";

export interface TuskIscrizioneData {
  nome: string;
  categoriaId: TuskCategoriaId;
  box: string;
  contatto: string;
  note: string;
}

export class TuskIscrizioneInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TuskIscrizioneInputError";
  }
}

export const TUSK_CATEGORIE: ReadonlyArray<{ id: TuskCategoriaId; nome: string }> = [
  { id: "ultimate", nome: "Ultimate (M)" },
  { id: "advanced", nome: "Advanced (M)" },
  { id: "challenge", nome: "Challenge (M)" },
  { id: "essential", nome: "Essential (M)" },
  { id: "performance", nome: "Performance (F)" },
  { id: "intermediate", nome: "Intermediate (F)" },
];

const VALID_CATEGORIE = new Set<TuskCategoriaId>(TUSK_CATEGORIE.map((cat) => cat.id));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_RE = /^[+()\d\s.-]+$/;

function normalizeText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isValidContact(value: string): boolean {
  if (EMAIL_RE.test(value)) return true;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && PHONE_RE.test(value);
}

function assertStringField(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new TuskIscrizioneInputError(`${label} non valido.`);
  }
  return normalizeText(value);
}

export function sanitizeTuskIscrizioneInput(value: unknown): TuskIscrizioneData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TuskIscrizioneInputError("Dati iscrizione non validi.");
  }

  const raw = value as Record<string, unknown>;
  const nome = assertStringField(raw.nome, "Nome");
  const categoriaId = assertStringField(raw.categoriaId, "Categoria");
  const box = assertStringField(raw.box, "Box");
  const contatto = assertStringField(raw.contatto, "Contatto");
  const note = assertStringField(raw.note ?? "", "Note");

  if (nome.length < 2 || nome.split(" ").filter(Boolean).length < 2 || nome.length > 80) {
    throw new TuskIscrizioneInputError("Nome e cognome non validi.");
  }
  if (!VALID_CATEGORIE.has(categoriaId as TuskCategoriaId)) {
    throw new TuskIscrizioneInputError("Categoria non valida.");
  }
  if (box.length < 2 || box.length > 80) {
    throw new TuskIscrizioneInputError("Box non valido.");
  }
  if (contatto.length < 5 || contatto.length > 80 || !isValidContact(contatto)) {
    throw new TuskIscrizioneInputError("Contatto non valido.");
  }
  if (note.length > 300) {
    throw new TuskIscrizioneInputError("Note troppo lunghe.");
  }

  return {
    nome,
    categoriaId: categoriaId as TuskCategoriaId,
    box,
    contatto,
    note,
  };
}
