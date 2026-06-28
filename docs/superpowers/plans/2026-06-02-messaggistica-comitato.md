# Messaggistica Comitato Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migliorare la chat 1:1 lato Comitato con ricerca, filtro non lette, risposte rapide e invio piu' sicuro.

**Architecture:** Nessuna modifica allo schema Firestore. La logica di presentazione resta in `AdminMessaggiPage`, con piccoli helper locali per ordinamento e filtro. I test mockano `src/lib/chat.ts` e verificano comportamento UI senza connettersi a Firebase.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Firebase client esistente.

---

### Task 1: Test di comportamento Comitato

**Files:**
- Create: `src/pages/admin/__tests__/AdminMessaggiPage.test.tsx`
- Modify: nessun file di produzione in questo task.

- [ ] **Step 1: Write the failing test**

Creare `src/pages/admin/__tests__/AdminMessaggiPage.test.tsx` con test che:
- mockano `subscribeAllThreads`, `subscribeMessages`, `sendMessage`, `markThreadRead`;
- verificano che le non lette siano in cima;
- filtrano `Non lette`;
- cercano una squadra;
- cliccano una risposta rapida;
- verificano invio bloccato durante submit;
- verificano che un errore non svuoti il testo.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/admin/__tests__/AdminMessaggiPage.test.tsx --run`

Expected: FAIL per assenza di controlli UI nuovi (`Non lette`, ricerca, risposte rapide).

### Task 2: Implementazione UI Comitato

**Files:**
- Modify: `src/pages/admin/AdminMessaggiPage.tsx`

- [ ] **Step 1: Add local state**

Aggiungere:
- `filter: "all" | "unread"`;
- `search`;
- `sending`;
- `lastError`;

- [ ] **Step 2: Add derived lists**

Calcolare:
- conversazioni ordinate con non lette prima;
- conversazioni filtrate da tab e ricerca;
- giocatori senza thread filtrati dalla ricerca.

- [ ] **Step 3: Add quick replies**

Aggiungere bottoni che impostano `text`:
- `Pagamento ricevuto, grazie.`
- `La schedina risulta ancora incompleta: controlla tutti i pronostici e le scelte speciali.`
- `Abbiamo ricevuto il messaggio, ti rispondiamo appena possibile.`
- `Per recupero accesso o cambio dispositivo scrivici qui il nome squadra.`

- [ ] **Step 4: Harden send flow**

Durante `sendMessage`:
- se `sending` e' true, uscire;
- impostare `sending=true`;
- disabilitare bottone;
- cancellare testo solo se l'invio riesce;
- mostrare errore per 5 secondi se fallisce.

- [ ] **Step 5: Run targeted test**

Run: `npm test -- src/pages/admin/__tests__/AdminMessaggiPage.test.tsx --run`

Expected: PASS.

### Task 3: Verifica Finale

**Files:**
- nessuna nuova modifica richiesta.

- [ ] **Step 1: Full tests**

Run: `npm test -- --run`

Expected: all test files pass; skipped tests unchanged.

- [ ] **Step 2: Lint**

Run: `npm run lint`

Expected: exit code 0.

- [ ] **Step 3: Frontend build**

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 4: Firestore rules**

Run: `npm run test:rules`

Expected: 6 rules tests pass.

- [ ] **Step 5: Functions build**

Run: `npm run build` in `functions`

Expected: TypeScript build passes.
