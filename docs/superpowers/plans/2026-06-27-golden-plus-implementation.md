# Schedinone Golden Plus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Schedinone Golden Plus 2026 as a second, access-controlled game without changing the current behavior of `schedinone-2026`.

**Architecture:** Keep the classic game and Golden Plus as separate Firestore game documents. Route `/` continues to load `schedinone-2026`; `/golden-plus` loads `schedinone-golden-plus-2026` only after an approved access grant. Golden Plus reuses player/match/points infrastructure where safe, and adds explicit game-mode branches for qualifier brackets.

**Tech Stack:** React 19, Vite, Firebase Auth, Firestore, Cloud Functions v2, Vitest, Firebase rules unit tests.

## Global Constraints

- Do not delete, migrate, or mix data from `games/schedinone-2026`.
- Do not reset or overwrite unrelated dirty worktree changes.
- Golden Plus game id is `schedinone-golden-plus-2026`.
- Classic route `/` keeps current behavior.
- Golden route is `/golden-plus`.
- Golden Plus access is grant-based, not a public link or shared password.
- Golden Plus participants are only docs under `games/schedinone-golden-plus-2026/players`.
- Approved access alone does not create a Golden Plus player.
- Golden Plus predictions are qualifier picks: only `"1"` or `"2"`, never `"X"`.
- Golden Plus has no `topScorerPick` or `winnerPick` requirement.
- Final verification must run `npm test`, `npm run build`, and `npm run test:rules`.

---

## File Structure

- Modify `src/lib/types.ts`: add `sedicesimi`, game mode fields, bracket metadata, and Golden access types.
- Modify `functions/src/joinGame.ts`: add Golden access guard and effective name handling before code validation.
- Modify `functions/src/saveSchedule.ts`: make prediction/special-pick validation mode-aware.
- Modify `functions/src/calcPoints.ts`: keep generic `prediction === result` scoring, add tests for qualifier mode.
- Modify `firestore.rules`: add Golden access rules, allow bracket match metadata, document immutable game-mode fields.
- Modify `src/rules/firestore.rules.test.ts`: prove access writes and Golden match constraints.
- Create `src/hooks/useGoldenAccess.ts`: one listener for `access/{uid}`.
- Create `src/lib/games.ts`: central constants and route/game config.
- Create `src/lib/bracket.ts`: pure bracket advancement and dependency cleanup.
- Create `src/lib/__tests__/bracket.test.ts`: bracket behavior.
- Modify `src/App.tsx`: route classic and Golden separately, pass `goldenAccess` down, use `user.uid` for Golden player lookup.
- Modify `src/components/Layout.tsx`: show Golden link only when access is approved.
- Create `src/pages/golden/GoldenPlusAccessGate.tsx`: request/access/join gate.
- Create `src/pages/golden/GoldenBracketPage.tsx`: shared Golden schedina page.
- Create `src/pages/golden/BracketDesktop.tsx`: tennis-style bracket.
- Create `src/pages/golden/BracketMobileWizard.tsx`: mobile guided flow.
- Create `src/pages/admin/GoldenPlusAdminPanel.tsx`: approvals/revocations/participants.
- Modify `src/pages/admin/AdminPage.tsx`: link to Golden Plus admin section.
- Add focused tests around new components and hooks where mocks already exist.

---

### Task 1: Types And Game Constants

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/games.ts`
- Test: `src/lib/__tests__/types.test.ts`

**Interfaces:**
- Produces `CLASSIC_GAME_ID`, `GOLDEN_GAME_ID`, `GameMode`, `PredictionMode`, `GoldenAccess`.
- Later tasks consume `game.mode`, `game.predictionMode`, and `game.specialPicksEnabled`.

- [ ] **Step 1: Extend shared types**

Add these exact type extensions in `src/lib/types.ts`:

```ts
export type Sign = "1" | "X" | "2";
export type QualifierSign = "1" | "2";

export type GameMode = "classic" | "golden-plus";
export type PredictionMode = "result" | "qualifier";

export type Phase = "gironi" | "sedicesimi" | "ottavi" | "quarti" | "semifinali" | "finale";

export interface Game {
  id: string;
  name: string;
  entryFee: number;
  admins: string[];
  adminPlayerUids?: Record<string, string>;
  playerDeviceAliases?: Record<string, string>;
  accessCode: string;
  adminCode?: string;
  adminCodeHash?: string;
  lockLeadHours?: number;
  phaseLockLeadHours?: Partial<Record<Phase, number>>;
  phases: Phase[];
  currentPhase: Phase;
  topScorer: string | null;
  winner: string | null;
  mode?: GameMode;
  predictionMode?: PredictionMode;
  specialPicksEnabled?: boolean;
  sourceGameId?: string;
}

export interface Match {
  id: string;
  phase: Phase;
  group: string | null;
  homeTeam: string;
  awayTeam: string;
  kickoff: Date;
  kickoffSource?: KickoffSource;
  result: Sign | null;
  score: string | null;
  locked: boolean;
  bracketSlot?: string;
  feedsInto?: string | null;
  feedsIntoSide?: "home" | "away" | null;
}

export type GoldenAccessStatus = "pending" | "approved" | "rejected" | "revoked";
export type GoldenAccessType = "classic-player" | "new-request";

export interface GoldenAccess {
  id: string;
  status: GoldenAccessStatus;
  type: GoldenAccessType;
  displayName: string;
  contact?: string;
  classicPlayerUid?: string;
  authUids?: string[];
}
```

- [ ] **Step 2: Add game constants**

Create `src/lib/games.ts`:

```ts
export const CLASSIC_GAME_ID = import.meta.env.VITE_GAME_ID || "schedinone-2026";
export const GOLDEN_GAME_ID = "schedinone-golden-plus-2026";

export function isGoldenGameId(gameId: string): boolean {
  return gameId === GOLDEN_GAME_ID;
}
```

- [ ] **Step 3: Update type parsing**

Modify `src/hooks/useGame.ts`:
- accept `sedicesimi` in `asPhase`;
- parse `mode`, `predictionMode`, `specialPicksEnabled`, and `sourceGameId`;
- default missing mode fields to classic-safe values:

```ts
mode: data.mode === "golden-plus" ? "golden-plus" : "classic",
predictionMode: data.predictionMode === "qualifier" ? "qualifier" : "result",
specialPicksEnabled: data.specialPicksEnabled === false ? false : true,
sourceGameId: typeof data.sourceGameId === "string" ? data.sourceGameId : undefined,
```

- [ ] **Step 4: Run focused tests**

Run: `npm test -- src/lib/__tests__/types.test.ts`

Expected: PASS, with no changes to classic assumptions.

---

### Task 2: Backend Golden Access In `joinGame`

**Files:**
- Modify: `functions/src/joinGame.ts`
- Test: `functions/src/__tests__/joinGameAccess.test.ts` or create `functions/src/__tests__/joinGameGolden.test.ts`

**Interfaces:**
- Consumes `games/{gameId}.mode`.
- Consumes `games/{goldenGameId}/access/{uid}` with `status: "approved"`.
- Produces idempotent Golden player creation at `games/{goldenGameId}/players/{uid}`.

- [ ] **Step 1: Write failing tests**

Add tests covering:

```ts
it("rejects golden-plus join without approved access", async () => {
  // game mode golden-plus, no access doc
  // call joinGame as anonymous uid "uid-1" with code ""
  // expect permission-denied
});

it("joins golden-plus with approved access and skips code check", async () => {
  // game mode golden-plus
  // access/uid-1 status approved displayName "Team Golden"
  // no private/config hash needed
  // call joinGame with name "" and code ""
  // expect players/uid-1.name === "Team Golden"
});

it("classic join still requires code", async () => {
  // existing classic setup
  // call joinGame with code ""
  // expect invalid-argument or permission-denied before player creation
});
```

- [ ] **Step 2: Patch validation order**

In `functions/src/joinGame.ts`, do not require `code.trim()` in the initial validation. Validate only `gameId` and provider first:

```ts
const { gameId, name, code } = (request.data ?? {}) as {
  gameId?: unknown;
  name?: unknown;
  code?: unknown;
};

if (
  typeof gameId !== "string" ||
  !gameId.trim() ||
  (name !== undefined && typeof name !== "string") ||
  (code !== undefined && typeof code !== "string") ||
  (typeof name === "string" && name.length > MAX_NAME_LEN) ||
  (typeof code === "string" && code.length > MAX_CODE_LEN)
) {
  throw new HttpsError("invalid-argument", "Parametri mancanti o non validi.");
}
```

- [ ] **Step 3: Add effective name and skip code**

Immediately after `gameData` is loaded:

```ts
const gameMode = typeof gameData.mode === "string" ? gameData.mode : "classic";
let effectiveName = typeof name === "string" ? name.trim() : "";
let skipCodeCheck = false;

if (gameMode === "golden-plus") {
  const accessSnap = await db.doc(`games/${gameId}/access/${uid}`).get();
  const accessData = accessSnap.exists ? accessSnap.data() ?? {} : {};
  if (accessData.status !== "approved") {
    throw new HttpsError("permission-denied", "Accesso Golden Plus non autorizzato.");
  }
  if (typeof accessData.displayName !== "string" || !accessData.displayName.trim()) {
    throw new HttpsError("failed-precondition", "Accesso Golden Plus incompleto.");
  }
  effectiveName = accessData.displayName.trim();
  skipCodeCheck = true;
} else if (!effectiveName || typeof code !== "string" || !code.trim()) {
  throw new HttpsError("invalid-argument", "Parametri mancanti o non validi.");
}
```

- [ ] **Step 4: Move private config fetch inside classic branch**

Replace the unconditional private config fetch with:

```ts
if (!skipCodeCheck) {
  const privateRef = gameRef.collection("private").doc("config");
  const privateSnap = await privateRef.get();
  const hash = privateSnap.exists
    ? ((privateSnap.data() ?? {}).accessCodeHash as string | undefined)
    : undefined;
  const codeOk = await verifyAccessCode(code as string, hash, gameData.accessCode);
  if (!codeOk) {
    throw new HttpsError("permission-denied", "Password non valida.");
  }
}
```

- [ ] **Step 5: Replace downstream name usage**

Use:

```ts
const requestedName = effectiveName.trim();
```

Then leave existing `requestedName`, `normalized`, `canonicalName`, player creation, and duplicate-name logic unchanged.

- [ ] **Step 6: Run tests**

Run: `npm test -- functions/src/__tests__/joinGameAccess.test.ts`

Expected: PASS. Existing classic access tests must still pass.

---

### Task 3: Mode-Aware Schedule Saving

**Files:**
- Modify: `functions/src/saveSchedule.ts`
- Test: create or extend `functions/src/__tests__/saveScheduleAuth.test.ts`

**Interfaces:**
- Consumes `gameData.predictionMode`.
- Produces Golden save behavior with no special-pick requirement.

- [ ] **Step 1: Write failing tests**

Add tests:

```ts
it("rejects X predictions for qualifier games", async () => {
  // game predictionMode qualifier
  // player bozza
  // predictions { "r32-01": "X" }
  // expect invalid-argument
});

it("does not require special picks for qualifier submit", async () => {
  // game predictionMode qualifier currentPhase sedicesimi
  // match r32-01 phase sedicesimi
  // predictions { "r32-01": "1" }
  // submit true with topScorerPick "" and winnerPick ""
  // expect ok
});

it("classic submit still requires special picks", async () => {
  // game predictionMode result
  // submit true without special picks
  // expect invalid-argument
});
```

- [ ] **Step 2: Make sign validation mode-aware**

In `functions/src/saveSchedule.ts`:

```ts
type Sign = "1" | "X" | "2";
type PredictionMode = "result" | "qualifier";

function isSign(value: unknown, predictionMode: PredictionMode): value is Sign {
  if (predictionMode === "qualifier") return value === "1" || value === "2";
  return value === "1" || value === "X" || value === "2";
}

function sanitizePredictions(value: unknown, predictionMode: PredictionMode): Record<string, Sign> {
  // existing object and count checks
  // replace !isSign(sign) with !isSign(sign, predictionMode)
}
```

- [ ] **Step 3: Fetch game before sanitizing predictions**

Move:

```ts
const db = admin.firestore();
const gameRef = db.doc(`games/${gameId}`);
const gameSnap = await gameRef.get();
```

before:

```ts
const predictions = sanitizePredictions(...);
```

Then derive:

```ts
const gameData = gameSnap.data() ?? {};
const predictionMode: PredictionMode =
  gameData.predictionMode === "qualifier" ? "qualifier" : "result";
const specialPicksEnabled = gameData.specialPicksEnabled !== false;

const predictions = sanitizePredictions(data.predictions, predictionMode);
const topScorerPick = specialPicksEnabled ? sanitizePick(data.topScorerPick, submit) : "";
const winnerPick = specialPicksEnabled ? sanitizePick(data.winnerPick, submit) : "";
```

- [ ] **Step 4: Keep classic lock/status logic unchanged**

Do not alter:
- `resolveSchedulePlayerUid`
- status transitions
- match close checks
- phase completeness checks

- [ ] **Step 5: Run tests**

Run: `npm test -- functions/src/__tests__/saveScheduleAuth.test.ts`

Expected: PASS. Qualifier tests pass; classic special-pick requirement still fails when missing.

---

### Task 4: Firestore Rules For Golden Plus

**Files:**
- Modify: `firestore.rules`
- Test: `src/rules/firestore.rules.test.ts`

**Interfaces:**
- Allows users to create only their own `pending` Golden access request.
- Allows admins to approve/reject/revoke access.
- Allows bracket match metadata on admin match writes.

- [ ] **Step 1: Extend phase and match validation**

In `firestore.rules`:

```js
function isValidPhase(value) {
  return value in ['gironi', 'sedicesimi', 'ottavi', 'quarti', 'semifinali', 'finale'];
}
```

Add to `isValidMatchWriteData().keys().hasOnly([...])`:

```js
'bracketSlot',
'feedsInto',
'feedsIntoSide'
```

Add validation:

```js
&& (!request.resource.data.keys().hasAny(['bracketSlot']) || isValidNullableString(request.resource.data.bracketSlot, 40))
&& (!request.resource.data.keys().hasAny(['feedsInto']) || isValidNullableString(request.resource.data.feedsInto, 40))
&& (!request.resource.data.keys().hasAny(['feedsIntoSide']) || request.resource.data.feedsIntoSide == null || request.resource.data.feedsIntoSide in ['home', 'away'])
```

- [ ] **Step 2: Document immutable game-mode fields**

Keep `mode`, `predictionMode`, `specialPicksEnabled`, and `sourceGameId` out of `isValidSafeGameUpdate()`. Add a comment above the whitelist:

```js
// Game mode fields are intentionally immutable from the client. They are set
// during game seeding/Admin SDK setup so an admin UI action cannot accidentally
// switch the classic game into Golden Plus mode.
```

- [ ] **Step 3: Add access validation helpers**

Add:

```js
function isValidGoldenAccessStatus(value) {
  return value in ['pending', 'approved', 'rejected', 'revoked'];
}

function isValidGoldenAccessType(value) {
  return value in ['classic-player', 'new-request'];
}

function isValidGoldenAccessCreate() {
  return request.resource.data.keys().hasOnly(['status', 'type', 'displayName', 'contact', 'createdAt'])
    && request.resource.data.status == 'pending'
    && request.resource.data.type == 'new-request'
    && request.resource.data.displayName is string
    && request.resource.data.displayName.size() > 1
    && request.resource.data.displayName.size() <= 30
    && (!request.resource.data.keys().hasAny(['contact']) || (request.resource.data.contact is string && request.resource.data.contact.size() <= 120))
    && request.resource.data.createdAt == request.time;
}

function isValidGoldenAccessAdminWrite() {
  return request.resource.data.keys().hasOnly([
      'status',
      'type',
      'displayName',
      'contact',
      'classicPlayerUid',
      'authUids',
      'createdAt',
      'reviewedAt',
      'reviewedBy'
    ])
    && isValidGoldenAccessStatus(request.resource.data.status)
    && isValidGoldenAccessType(request.resource.data.type)
    && request.resource.data.displayName is string
    && request.resource.data.displayName.size() > 1
    && request.resource.data.displayName.size() <= 30
    && (!request.resource.data.keys().hasAny(['contact']) || (request.resource.data.contact is string && request.resource.data.contact.size() <= 120))
    && (!request.resource.data.keys().hasAny(['classicPlayerUid']) || isValidNullableString(request.resource.data.classicPlayerUid, 80))
    && (!request.resource.data.keys().hasAny(['authUids']) || isValidStringList(request.resource.data.authUids, 10))
    && (!request.resource.data.keys().hasAny(['reviewedAt']) || request.resource.data.reviewedAt == request.time)
    && (!request.resource.data.keys().hasAny(['reviewedBy']) || request.resource.data.reviewedBy == request.auth.uid);
}
```

- [ ] **Step 4: Add access rules**

Inside `match /games/{gameId}`:

```js
match /access/{accessUid} {
  allow read: if isSignedIn() && (request.auth.uid == accessUid || isGameAdmin(gameId));
  allow create: if isSignedIn() && request.auth.uid == accessUid && isValidGoldenAccessCreate();
  allow create, update, delete: if isGameAdmin(gameId) && isValidGoldenAccessAdminWrite();
}
```

- [ ] **Step 5: Add rules tests**

Add tests:
- anonymous signed-in user can create own pending request;
- user cannot approve own request;
- admin can approve request;
- admin can create/update bracket match with `sedicesimi` and `bracketSlot`;
- non-admin cannot write match metadata.

- [ ] **Step 6: Run rules tests**

Run: `npm run test:rules`

Expected: PASS.

---

### Task 5: Bracket Utilities

**Files:**
- Create: `src/lib/bracket.ts`
- Test: `src/lib/__tests__/bracket.test.ts`

**Interfaces:**
- Consumes `Match[]` and `Record<string, "1" | "2">`.
- Produces derived teams per bracket slot and cleaned predictions.

- [ ] **Step 1: Write failing tests**

Tests:

```ts
it("advances selected teams into the next bracket slot", () => {
  // r32-01 Spagna/Corea feeds r16-01 home
  // prediction r32-01: "1"
  // expect r16-01.homeTeam === "Spagna"
});

it("clears dependent picks when an upstream pick changes", () => {
  // r32-01 feeds r16-01
  // existing predictions r32-01:"1", r16-01:"1"
  // changing r32-01 to "2" clears r16-01
});

it("does not clear unrelated branch picks", () => {
  // changing r32-01 does not clear r32-02
});
```

- [ ] **Step 2: Implement utilities**

Create `src/lib/bracket.ts`:

```ts
import type { Match, QualifierSign } from "./types";

export type QualifierPredictions = Record<string, QualifierSign>;

export function selectedTeam(match: Match, sign: QualifierSign): string {
  return sign === "1" ? match.homeTeam : match.awayTeam;
}

export function downstreamMatchIds(matches: Match[], matchId: string): Set<string> {
  const byId = new Map(matches.map((match) => [match.id, match]));
  const out = new Set<string>();
  let current = byId.get(matchId);
  while (current?.feedsInto) {
    out.add(current.feedsInto);
    current = byId.get(current.feedsInto);
  }
  return out;
}

export function withBracketPick(
  matches: Match[],
  predictions: QualifierPredictions,
  matchId: string,
  sign: QualifierSign | null
): QualifierPredictions {
  const next = { ...predictions };
  for (const id of downstreamMatchIds(matches, matchId)) {
    delete next[id];
  }
  if (sign) next[matchId] = sign;
  else delete next[matchId];
  return next;
}
```

- [ ] **Step 3: Run focused tests**

Run: `npm test -- src/lib/__tests__/bracket.test.ts`

Expected: PASS.

---

### Task 6: Golden Access Hook And Request Gate

**Files:**
- Create: `src/hooks/useGoldenAccess.ts`
- Create: `src/pages/golden/GoldenPlusAccessGate.tsx`
- Test: `src/pages/golden/__tests__/GoldenPlusAccessGate.test.tsx`

**Interfaces:**
- Consumes `GOLDEN_GAME_ID`, `GoldenAccess`, `useCurrentPlayer`.
- Produces a gate that either requests access, waits, joins, or renders children.

- [ ] **Step 1: Create access hook**

```ts
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { GoldenAccess } from "../lib/types";

export function useGoldenAccess(gameId: string, uid: string | null, enabled = true) {
  const [access, setAccess] = useState<GoldenAccess | null>(null);
  const [loading, setLoading] = useState(enabled && !!uid);

  useEffect(() => {
    if (!enabled || !uid) {
      setAccess(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    return onSnapshot(doc(db, "games", gameId, "access", uid), (snap) => {
      const data = snap.exists() ? snap.data() : null;
      setAccess(data ? {
        id: snap.id,
        status: data.status,
        type: data.type,
        displayName: typeof data.displayName === "string" ? data.displayName : "",
        contact: typeof data.contact === "string" ? data.contact : undefined,
        classicPlayerUid: typeof data.classicPlayerUid === "string" ? data.classicPlayerUid : undefined,
        authUids: Array.isArray(data.authUids) ? data.authUids.filter((x): x is string => typeof x === "string") : undefined,
      } : null);
      setLoading(false);
    });
  }, [gameId, uid, enabled]);

  return { access, loading };
}
```

- [ ] **Step 2: Gate uses passed access prop**

`GoldenPlusAccessGate` receives `access` and `accessLoading` from `App.tsx`. Do not open a second listener inside the gate.

- [ ] **Step 3: Use `useRef` for join guard**

Inside the gate:

```ts
const joiningRef = useRef(false);
```

Trigger `joinGame` only when:
- `access.status === "approved"`;
- no Golden player exists;
- `joiningRef.current === false`;
- there is no join error.

- [ ] **Step 4: Request form creates pending access**

For new users, create:

```ts
{
  status: "pending",
  type: "new-request",
  displayName: name.trim(),
  contact: contact.trim(),
  createdAt: serverTimestamp()
}
```

at `games/${GOLDEN_GAME_ID}/access/${user.uid}`.

- [ ] **Step 5: Test gate states**

Tests:
- no access renders request form;
- pending renders waiting message;
- rejected/revoked renders blocked message;
- approved with existing player renders children;
- approved without player calls `joinGame` once.

Run: `npm test -- src/pages/golden/__tests__/GoldenPlusAccessGate.test.tsx`

Expected: PASS.

---

### Task 7: App Routing Isolation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Layout.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes `CLASSIC_GAME_ID`, `GOLDEN_GAME_ID`, `useGoldenAccess`.
- Produces separate classic and Golden data flows.

- [ ] **Step 1: Replace global constant import**

In `src/App.tsx`:

```ts
import { CLASSIC_GAME_ID, GOLDEN_GAME_ID } from "./lib/games";
```

Classic hooks continue to use `CLASSIC_GAME_ID`.

- [ ] **Step 2: Add Golden hooks without changing classic hooks**

Use direct auth uid for Golden:

```ts
const { access: goldenAccess, loading: goldenAccessLoading } = useGoldenAccess(
  GOLDEN_GAME_ID,
  user?.uid ?? null,
  authReady
);
const hasGoldenAccess = goldenAccess?.status === "approved";
const { game: goldenGame } = useGame(GOLDEN_GAME_ID, authReady && hasGoldenAccess);
const { matches: goldenMatches } = useMatches(GOLDEN_GAME_ID, authReady && hasGoldenAccess);
const { player: goldenPlayer } = useCurrentPlayer(
  GOLDEN_GAME_ID,
  user?.uid,
  authReady && hasGoldenAccess && !!user?.uid
);
```

Do not use `effectivePlayerUid` for Golden player lookup.

- [ ] **Step 3: Add route**

Add:

```tsx
<Route
  path="/golden-plus"
  element={
    <GoldenPlusAccessGate
      gameId={GOLDEN_GAME_ID}
      access={goldenAccess}
      accessLoading={goldenAccessLoading}
      userUid={user?.uid ?? ""}
      player={goldenPlayer}
    >
      {goldenGame ? (
        <GoldenBracketPage
          game={goldenGame}
          player={goldenPlayer ?? fallbackGoldenPlayer}
          matches={goldenMatches}
          gameId={GOLDEN_GAME_ID}
        />
      ) : (
        <PageSkeleton />
      )}
    </GoldenPlusAccessGate>
  }
/>
```

- [ ] **Step 4: Layout shows link only when approved**

Add prop:

```ts
hasGoldenAccess?: boolean;
```

Render a Golden tab only if `hasGoldenAccess === true`.

- [ ] **Step 5: Tests**

Update `src/App.test.tsx`:
- existing test still expects classic hooks with `schedinone-2026`;
- new test expects Golden current player lookup uses `user.uid`;
- new test expects Golden link hidden without approved access.

Run: `npm test -- src/App.test.tsx`

Expected: PASS.

---

### Task 8: Golden Bracket UI

**Files:**
- Create: `src/pages/golden/GoldenBracketPage.tsx`
- Create: `src/pages/golden/BracketDesktop.tsx`
- Create: `src/pages/golden/BracketMobileWizard.tsx`
- Test: `src/pages/golden/__tests__/GoldenBracketPage.test.tsx`

**Interfaces:**
- Consumes `withBracketPick` and `saveSchedule`.
- Produces mode-specific UI for qualifier predictions.

- [ ] **Step 1: Mobile state avoids first-render desktop flash**

In `GoldenBracketPage`:

```ts
const [isMobile, setIsMobile] = useState(
  () => typeof window !== "undefined" && window.innerWidth < 768
);
```

- [ ] **Step 2: Save without special picks**

Call:

```ts
await saveSchedule({
  gameId,
  predictions,
  topScorerPick: "",
  winnerPick: "",
  submit,
});
```

- [ ] **Step 3: Use tap-on-team interaction**

Desktop and mobile components receive:

```ts
matches: Match[];
predictions: Record<string, "1" | "2">;
onPick: (matchId: string, sign: "1" | "2" | null) => void;
disabled: boolean;
```

Buttons show team names, not `1`/`2`.

- [ ] **Step 4: Tests**

Tests:
- renders desktop bracket when viewport is wide;
- renders mobile wizard when viewport is narrow;
- clicking team calls `saveSchedule` with `"1"` or `"2"`;
- changing an upstream pick clears dependent downstream pick.

Run: `npm test -- src/pages/golden/__tests__/GoldenBracketPage.test.tsx`

Expected: PASS.

---

### Task 9: Golden Admin Panel

**Files:**
- Create: `src/pages/admin/GoldenPlusAdminPanel.tsx`
- Modify: `src/pages/admin/AdminPage.tsx`
- Modify: `src/App.tsx`
- Test: `src/pages/admin/__tests__/GoldenPlusAdminPanel.test.tsx`

**Interfaces:**
- Consumes classic players from `games/schedinone-2026/players`.
- Consumes and writes Golden `access`.
- Consumes Golden `players` for participant count.

- [ ] **Step 1: Admin view sections**

Create sections:
- `Richieste in attesa`
- `Giocatori classici`
- `Autorizzati Golden`
- `Partecipanti effettivi`

- [ ] **Step 2: Admin actions**

Use Firestore client writes allowed by rules:

Approve new request:

```ts
await updateDoc(accessRef, {
  status: "approved",
  reviewedAt: serverTimestamp(),
  reviewedBy: currentUid,
});
```

Authorize classic player:

```ts
await setDoc(doc(db, "games", GOLDEN_GAME_ID, "access", player.id), {
  status: "approved",
  type: "classic-player",
  displayName: player.name,
  classicPlayerUid: player.id,
  createdAt: serverTimestamp(),
  reviewedAt: serverTimestamp(),
  reviewedBy: currentUid,
}, { merge: true });
```

Revoke:

```ts
await updateDoc(accessRef, {
  status: "revoked",
  reviewedAt: serverTimestamp(),
  reviewedBy: currentUid,
});
```

- [ ] **Step 3: Add route and link**

Add route:

```tsx
<Route path="/admin/golden-plus" element={<GoldenPlusAdminPanel currentUid={user?.uid ?? ""} />} />
```

Add AdminPage action:

```ts
{ to: "/admin/golden-plus", label: "Golden Plus", mark: "GP" }
```

- [ ] **Step 4: Tests**

Tests:
- pending requests render;
- approve updates status;
- classic player authorization creates access doc;
- revoke updates status.

Run: `npm test -- src/pages/admin/__tests__/GoldenPlusAdminPanel.test.tsx`

Expected: PASS.

---

### Task 10: Seed Data Procedure

**Files:**
- Create: `scripts/seed-golden-plus-2026.mjs`
- Optional doc: `docs/golden-plus-setup.md`

**Interfaces:**
- Creates `games/schedinone-golden-plus-2026`.
- Creates `matches` with `bracketSlot`, `feedsInto`, and `feedsIntoSide`.

- [ ] **Step 1: Create seed script**

Script must write:

```js
{
  name: "Schedinone Golden Plus 2026",
  entryFee: 0,
  admins: [...classicAdmins],
  accessCode: "",
  mode: "golden-plus",
  predictionMode: "qualifier",
  specialPicksEnabled: false,
  sourceGameId: "schedinone-2026",
  phases: ["sedicesimi", "ottavi", "quarti", "semifinali", "finale"],
  currentPhase: "sedicesimi",
  topScorer: null,
  winner: null,
}
```

- [ ] **Step 2: Add bracket match data**

Use match ids like:
- `r32-01` through `r32-16`
- `r16-01` through `r16-08`
- `qf-01` through `qf-04`
- `sf-01` through `sf-02`
- `final`

For future unknown team names, use placeholders like `Vincente r32-01` only in seed data if real qualifiers are not known at deploy time.

- [ ] **Step 3: Do not run seed automatically**

The script is manual. Running it against production requires explicit user approval because it writes Firestore data.

---

### Task 11: Full Verification

**Files:**
- No new files.

**Interfaces:**
- Verifies classic still works and Golden is isolated.

- [ ] **Step 1: Run unit tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 2: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Run rules tests**

Run: `npm run test:rules`

Expected: PASS.

- [ ] **Step 4: Manual smoke checklist**

Check:
- `/` still loads classic login/dashboard.
- Classic login still requires password.
- Classic schedina still shows `1/X/2`, Capocannoniere, Vincitrice.
- Golden link hidden without approved access.
- `/golden-plus` without access shows request form.
- Approved user can enter Golden and gets a player doc only after entering.
- Golden schedina shows team names, not `1/X/2`.
- Golden save sends no special picks.
- Admin can approve/revoke Golden access.

---

## Self-Review

- Spec coverage: access grants, old/new player handling, route isolation, bracket UX, backend validation, rules, and tests are covered.
- Classic isolation: classic `GAME_ID` flow remains on `CLASSIC_GAME_ID`; Golden uses `GOLDEN_GAME_ID`; Golden player lookup uses `user.uid`.
- Known risk: the seed script needs real knockout participants when available. Until then it can use placeholders, but production opening should seed real pairings after group results are known.
- No placeholder tasks: each task has exact files, interfaces, and verification commands.
