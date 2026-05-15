import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

function javaExeName() {
  return process.platform === "win32" ? "java.exe" : "java";
}

function findBundledJava() {
  const candidates = [];
  if (process.env.JAVA_HOME) {
    candidates.push(join(process.env.JAVA_HOME, "bin", javaExeName()));
  }

  const antigravityExtensions = join(homedir(), ".antigravity", "extensions");
  if (existsSync(antigravityExtensions)) {
    for (const ext of readdirSync(antigravityExtensions)) {
      if (!ext.startsWith("redhat.java-")) continue;
      const jreRoot = join(antigravityExtensions, ext, "jre");
      if (!existsSync(jreRoot)) continue;
      for (const jre of readdirSync(jreRoot)) {
        candidates.push(join(jreRoot, jre, "bin", javaExeName()));
      }
    }
  }

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

const env = { ...process.env };
const javaPath = findBundledJava();
if (javaPath) {
  const javaBin = dirname(javaPath);
  env.JAVA_HOME = dirname(javaBin);
  env.PATH = `${javaBin}${delimiter}${env.PATH ?? ""}`;
}

const result = spawnSync(
  'firebase emulators:exec --project demo-schedinone-rules --only firestore "vitest run src/rules/firestore.rules.test.ts --pool=forks --fileParallelism=false"',
  {
    env,
    shell: true,
    stdio: "inherit",
  }
);

process.exit(result.status ?? 1);
