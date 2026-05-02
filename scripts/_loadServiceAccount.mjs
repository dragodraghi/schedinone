import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function loadServiceAccount() {
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const fallbackPath = join(homedir(), ".config", "schedinone", "serviceAccount.json");
  const path = envPath || fallbackPath;

  if (!existsSync(path)) {
    console.error(
      `\nERRORE: serviceAccount non trovato.\n` +
        `Cercato in: ${path}\n\n` +
        `Imposta la variabile d'ambiente GOOGLE_APPLICATION_CREDENTIALS\n` +
        `oppure salva il file in: ${fallbackPath}\n`
    );
    process.exit(1);
  }

  return JSON.parse(readFileSync(path, "utf8"));
}
