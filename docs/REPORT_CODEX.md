# Schedinone — Report di revisione completo (per Codex)

Data: 2026-06-11 · Branch analizzato: `master` (ed6ba1c)
Metodo: lettura integrale di `src/`, `functions/src/`, `firestore.rules`, config; build di produzione eseguita e misurata; ogni segnalazione è verificata sul codice con riferimento `file:riga`.

Numeri di partenza (build reale, `vite build`):

- JavaScript scaricato al primo avvio: **~1,28 MB minificato / ~390 kB gzip** (`index` 682 kB + `firebase` 349 kB + `html2canvas` 200 kB + chunk minori)
- Precache PWA (service worker): **2,19 MB**, di cui 656 kB è solo `og-image.png`
- `npm ci` **fallisce** out-of-the-box (conflitto peer dependency)

Le sezioni sono ordinate per priorità. Ogni voce è un intervento autonomo.

---

## 1. Igiene del repository (interventi sicuri, alto valore)

### 1.1 Rimuovere la sezione "TUSK" dalle firestore.rules ⚠️ PRIORITÀ MASSIMA
`firestore.rules:29-173` e `firestore.rules:287-361` contengono ~250 righe di regole di un **altro progetto** (TUSK Bad Boars: `tusk_categorie`, `tusk_eventi`, `tusk_atleti`, `tusk_iscrizioni_pending`, push subscription, audit…). Le Cloud Functions TUSK sono state revertate (commit 185e495 / 019766f) ma le rules sono rimaste, inclusa la funzione `isTuskAdmin()` con **email admin hardcoded** (`firestore.rules:33`: `admin@tusk-badboars.com`) e diverse collection con `allow read: if true`. Vanno eliminate: riducono superficie d'attacco, dimensione e confusione. Se TUSK condivide lo stesso progetto Firebase, spostarle nel repo TUSK e documentare il deploy.

### 1.2 Eliminare il codice morto (~900 righe + 60 kB di asset)
Verificato con grep su tutto `src/` (test inclusi): nessun import verso questi file.

- `src/components/Chatbot.tsx` (356 righe) + `src/lib/chatbotFaq.ts` (246 righe, usato solo dal Chatbot)
- `src/lib/syncFixtures.ts` + `src/lib/teamAliases.ts` (usato solo da syncFixtures; coerente col commento in `functions/src/index.ts:55-58` che dice che il fetch automatico da API-Football è stato rimosso)
- `src/hooks/usePullToRefresh.ts` + le classi CSS orfane `.ptr-indicator` / `.ptr-spinner` in `src/index.css`
- `src/lib/playerStats.ts`
- `src/assets/hero.png` (44 kB), `src/assets/react.svg`, `src/assets/vite.svg`

### 1.3 Riparare `npm ci`
`vite-plugin-pwa@1.2.0` dichiara peer `vite@^3…^7` ma il progetto usa Vite 8: l'installazione pulita fallisce e oggi funziona solo con `--legacy-peer-deps`. Aggiornare `vite-plugin-pwa` a una versione con supporto Vite 8 (o pin di Vite a 7). Da fare prima di qualunque CI.

### 1.4 README
`README.md` è ancora il template "React + TypeScript + Vite". Sostituire con: descrizione del progetto, setup `.env` (esiste `.env.example`), comandi (`dev`, `build`, `test`, `test:rules`), link a `GUIDA_COMITATO.md` / `GUIDA_GIOCATORE.md`.

---

## 2. Performance e peso (misurato sulla build)

### 2.1 Import dinamico di jspdf + html2canvas (−~350 kB all'avvio)
`src/lib/pdfExport.ts:1-2` importa staticamente entrambe le librerie; `SchedinaPage` (caricata subito) importa `pdfExport`, quindi `html2canvas` finisce nei `<link rel="modulepreload">` di `index.html` e si scarica al primo avvio anche se l'utente non esporta mai un PDF. Fix: dentro `exportElementAsPdf` usare
`const { default: html2canvas } = await import("html2canvas")` e `const { default: jsPDF } = await import("jspdf")`. Zero impatto funzionale.

### 2.2 Escludere `og-image.png` dal precache PWA (−656 kB per ogni installazione)
È quasi un terzo del precache, ma serve solo alle anteprime social che la leggono via URL. In `vite.config.ts`, blocco `workbox`, aggiungere `globIgnores: ["**/og-image.png"]`. Collegato: `index.html:32` usa og-image (1200×630) come `apple-touch-icon` — formato sbagliato; creare un'icona 180×180 dedicata.

### 2.3 Lazy-load delle pagine giocatore secondarie
Le rotte admin sono già lazy (`src/App.tsx:24-31`, ottimo pattern), ma `BachecaPage`, `MessaggiPage` e `ProfiloPage` sono import statici e gonfiano il bundle principale da 682 kB. Convertirle a `lazy(() => import(...))`: il fallback `<PageSkeleton />` nel `Suspense` esiste già.

### 2.4 Import dinamico di `firebase/messaging`
`src/App.tsx:21` importa staticamente `initPushForUser`, usato solo dopo il login (`App.tsx:74-78`). Spostare a `const { initPushForUser } = await import("./lib/messaging")` dentro l'effect.

### 2.5 Abilitare la cache offline di Firestore
`src/lib/firebase.ts` usa `getFirestore(app)` senza persistenza locale: a ogni avvio l'app riscarica game, matches e players, e da PWA installata offline non mostra nulla. Fix:
```ts
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
```
Meno letture fatturate, avvii successivi istantanei, dati visibili offline.

### 2.6 Font
`index.html:36` carica 5 pesi di Outfit + 3 di DM Sans da Google Fonts: il primo render dipende da un'origine esterna e la PWA offline resta senza font. Ridurre i pesi (es. Outfit 400/700/900, DM Sans 400/600) o self-hostare i due font così finiscono nel precache.

---

## 3. Bug e robustezza

### 3.1 Listener `onMessage` mai deregistrato → notifiche duplicate
`src/lib/messaging.ts:42-46` registra `onMessage` senza salvare/restituire l'unsubscribe; `src/App.tsx:74-78` richiama `initPushForUser` a ogni variazione di `[loggedIn, user]`. Gli handler si accumulano e ogni push in foreground può generare N notifiche. Fix: far restituire l'unsubscribe a `initPushForUser` e gestirlo nel cleanup dell'effect (registrarlo una sola volta).

### 3.2 Doppio ricalcolo punti client + server — scegliere una sola strada
`functions/src/index.ts:13-23` ha il trigger `onMatchResultUpdate` che ricalcola i punti quando cambia un risultato; ma `src/pages/admin/RisultatiPage.tsx:60-63` esegue ANCHE `recalcPointsClient` dopo il salvataggio (il commento dice "replaces what the Cloud Function would do on a Blaze plan", ma le callable `joinGame`/`saveSchedule` sono in uso, quindi le functions sono deployate). Risultato: ogni correzione di risultato ricalcola tutto due volte (scritture duplicate, possibile race tra i due ricalcoli). Decidere: o si tiene il trigger server (consigliato: rimuovere `recalcPointsClient` e fare affidamento sul trigger, mostrando un toast "Risultato salvato, punti in aggiornamento…"), o si rimuove il trigger.

### 3.3 Logica di lock duplicata client/server
`src/lib/scheduleRules.ts` e `functions/src/scheduleRules.ts` implementano la stessa regola (oggi matematicamente equivalente: `kickoff − lead ≤ now` ⟺ `kickoff ≤ now + lead`), ma in due copie da mantenere a mano. Qualsiasi modifica futura a una sola delle due crea divergenza client/server sul momento di chiusura dei pronostici. Minimo: test incrociati che verificano l'equivalenza con gli stessi input; meglio: estrarre un modulo condiviso.

### 3.4 Errori inghiottiti senza feedback all'utente
- `src/pages/MessaggiPage.tsx:29-39`: `onSend` ha `try/finally` senza `catch` → se la rule rate-limit (1 msg/5s, `firestore.rules:24-27`) respinge il messaggio, l'utente non vede nulla e il testo è perso (unhandled rejection). Aggiungere catch + messaggio "Attendi qualche secondo…" e non svuotare la textarea in errore.
- Hook `usePlayers`/`usePublicPlayers`/`useCurrentPlayer` (`src/hooks/usePlayers.ts:51-54, 78-81, 105-109`) e analoghi in `useGame`/`useMatches`: gli errori del listener finiscono in `console.debug` e `loading=false` → la UI mostra "vuoto" invece di "errore". Esporre `error` dagli hook e mostrarne uno stato.
- `src/pages/BachecaPage.tsx:20-22`: `updateDoc(...).catch(() => {})` — almeno loggare.

### 3.5 Cast non validati sui dati da Firestore
- `src/hooks/usePlayers.ts:22-25`: `predictions` castato `as Record<string, Sign>` senza validare i valori ("1"/"X"/"2").
- `src/lib/recalcPoints.ts:28`: `result as string` senza verificare che sia un `Sign` valido — un valore corrotto verrebbe confrontato silenziosamente.
Aggiungere una guard `asSign(value): Sign | null` riusata in entrambi i punti.

### 3.6 Accessibilità funzionale
- `src/components/Toast.tsx:31-46`: manca `role="status"` / `aria-live="polite"` — gli screen reader non annunciano i toast.
- Modali (help in `LoginPage`, conferma invio in `SchedinaPage`, conferma eliminazione in `GiocatoriPage`): nessun focus trap, nessuna chiusura con Escape, focus non riportato al trigger.
- `src/components/Layout.tsx:55`: emoji delle tab senza `aria-hidden="true"`; idem medaglie in `PlayerRow`. `EmptyState.tsx` è già corretto (`role="status"` + `aria-hidden`) — usarlo come modello.
- `src/components/MatchCard.tsx:67`: bottoni 1/X/2 con `min-h-[40px]` — portarli a 44px (linee guida touch target).

---

## 4. Sicurezza (rules + functions)

### 4.1 Completare la migrazione dell'access code a hash ⚠️
`functions/src/joinGame.ts` verifica prima l'hash bcrypt in `private/config` poi fa fallback al confronto col campo legacy `gameData.accessCode` in chiaro. Il documento `games/{gameId}` è leggibile da **qualsiasi utente autenticato, anche anonimo** (`firestore.rules:176`) — e l'app fa auto-login anonimo al mount (`App.tsx:59-65`). Se il campo legacy esiste ancora sul documento, chiunque apra i DevTools può leggere il codice d'accesso. Azioni: verificare/eliminare il campo `accessCode` dal doc game, rimuovere il fallback plaintext da `joinGame.ts`, e in generale evitare confronti stringa non constant-time per i segreti.

### 4.2 Restringere la write rule sul documento game
`firestore.rules:178-179`: un admin può scrivere **qualsiasi campo** di `games/{gameId}`, incluso l'array `admins` (auto-promozione permanente di altri account) e i campi su cui si basano i lock (`lockLeadHours`, `phaseLockLeadHours`, `currentPhase`). Limitare i campi modificabili con `request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])` e gestire la modifica di `admins` separatamente (o solo via console/funzione dedicata).

### 4.3 Rate limiting sulle callable
`joinGame` non ha limite di tentativi: il codice d'accesso è brute-forzabile (bcrypt rallenta ma non blocca). Aggiungere un contatore tentativi per uid (es. doc `rateLimits` con finestra temporale) che dopo N errori risponde `resource-exhausted`. Lo stesso pattern può coprire `saveSchedule` e `markThreadRead`.

### 4.4 Validazioni mancanti nelle rules
- `firestore.rules:226`: `targetUids` degli annunci è solo `is list` — nessun limite di dimensione né validazione degli elementi. Aggiungere `size() <= 200` e tipo string.
- `firestore.rules:198`: l'update admin sui player non vincola i campi — un bug lato client admin può corrompere documenti. Valutare una whitelist di campi (`paid`, `scheduleStatus`, `points`, `predictions`, …).

### 4.5 Test delle rules
`src/rules/firestore.rules.test.ts` esiste (bene!) ma non copre: rate-limit chat (secondo messaggio entro 5s respinto), lettura annunci `draft`/`deleted` da non-admin, tentativi di escalation sull'array `admins`. Aggiungere questi casi.

---

## 5. Design / UX

### 5.1 Due schermate "fuori tema" (massimo impatto visivo) ⚠️
- `src/pages/MessaggiPage.tsx:51-66`: textarea con `background: '#ffffff'` e bottone `bg-blue-600` — light mode hardcoded dentro l'app dark; `text-gray-500` quasi invisibile su sfondo scuro.
- `src/components/AnnouncementCard.tsx:6-12`: card `bg-white border-gray-200 shadow-sm` — stesso problema in Bacheca; `src/pages/BachecaPage.tsx` non ha né header né stile coerente col resto.
Riallineare entrambe a `glass` + variabili del tema (`var(--border)`, `var(--text-primary)`, accento ciano), come Dashboard/Schedina. Sono le uniche due viste che sembrano di un'altra app.

### 5.2 Consolidare i design token
I token in `src/index.css:3-16` esistono ma non vengono usati sistematicamente: **172 occorrenze** di `fontFamily: 'Outfit…'` inline nei .tsx, 19 occorrenze di `#00d4ff` hardcoded più decine di `rgba(0,212,255,…)` / `rgba(255,51,102,…)` ripetute. Fix: utility `.font-display { font-family: Outfit… }` (o config `@theme` di Tailwind 4 per `font-display`/`font-body`) e variabili derivate (`--accent-bg`, `--correct-bg`, `--wrong-bg`, `--correct-border`, …). Cambio font o palette diventa un'operazione da un solo file.

### 5.3 Contrasto del testo secondario
`--text-muted: #64748b` su `--bg-deep: #040810` ≈ **3,9:1**, sotto il minimo WCAG AA (4,5:1) — usato per label, countdown, descrizioni in quasi tutte le pagine. Alzarlo verso `#8b9bb0`/`#94a3b8` (≈5:1) o riservare il valore attuale a testo decorativo.

### 5.4 `prefers-reduced-motion` globale
Confetti e haptic la rispettano già (`Confetti.tsx:35`, `haptic.ts:16`), ma tutte le animazioni CSS (shimmer, pulse-ring, toast, fadeSlideUp, skeleton) no. Aggiungere in `index.css` la media query standard che azzera animazioni/transizioni con `prefers-reduced-motion: reduce`.

### 5.5 Manifest PWA da completare
`public/manifest.json` ha solo `favicon.svg` con `purpose: "any"`. Per un'installazione pulita su Android/iOS servono: icone PNG 192×192 e 512×512 con variante `purpose: "maskable"`, `apple-touch-icon` dedicata (vedi 2.2), e opzionalmente `screenshots` per la install prompt UI. `background_color`/`theme_color` (#0f172a) sono incoerenti con `--bg-deep` (#040810): uniformare.

### 5.6 Rifiniture minori
- Toast con durata fissa 3s anche per gli errori (`Toast.tsx:20`): differenziare (errori ≥5s o dismiss manuale).
- `SplashScreen.tsx:6-18`: 2,3s fissi a ogni login, non skippabile — renderlo cliccabile per saltare e/o mostrarlo solo al primo accesso.
- Stati di errore visivamente diversi tra LoginPage / SchedinaPage / MessaggiPage: estrarre un componente `ErrorBanner` unico.
- Feedback d'errore sul login: solo card rossa statica; una shake animation sull'input + `vibrate()` (già disponibile in `lib/haptic.ts`) migliora la percezione.

---

## 6. Manutenibilità

### 6.1 Spezzare i componenti monolitici
- `src/pages/admin/RiepilogoPage.tsx` (627 righe): estrarre `GridHeader`, `MatchRow`, `SpecialPicksRows`.
- `src/pages/SchedinaPage.tsx` (445): estrarre il modale di conferma e la sezione pick speciali.
- `src/pages/admin/AdminPage.tsx` (430): estrarre `PhaseSelector`, `SeedWorldCupCard`, `SpecialPicksForm`.

### 6.2 Deduplicare la mappa stato-schedina → stile
`statusLabel`/`statusColor`/`statusBg`/`statusBorder` sono duplicate tra `src/pages/ProfiloPage.tsx` e `src/pages/admin/SchedineRicevutePage.tsx`. Estrarre in `src/lib/scheduleStatusUi.ts`.

### 6.3 Colmare i buchi di test sulla logica core
Esistono test per types/chat/announcements/rules e 3 componenti, ma **zero test** per: `src/lib/recalcPoints.ts` (calcolo punti!), `src/lib/scheduleRules.ts` + `functions/src/scheduleRules.ts` (chiusura pronostici!), `src/lib/matchStatus.ts`, `functions/src/calcPoints.ts`. Sono pure function facilissime da testare ed è la logica da cui dipende la classifica: priorità alta.

---

## 7. Ordine d'attacco suggerito

| Fase | Interventi | Rischio |
|------|-----------|---------|
| 1 — Quick win (1 giorno) | 1.1 rules TUSK · 1.2 codice morto · 1.3 npm ci · 2.1 PDF dinamico · 2.2 og-image · 5.1 tema Messaggi/Bacheca | Quasi nullo |
| 2 — Robustezza | 3.1 onMessage · 3.2 doppio ricalcolo · 3.4 errori esposti · 4.1 access code legacy · 6.3 test core | Basso |
| 3 — Struttura | 2.3/2.4/2.5 lazy+cache · 4.2/4.3/4.4 hardening rules · 5.2 token · 6.1/6.2 refactor | Medio (serve regression test) |
| 4 — Polish | 5.3–5.6 contrasto, reduced-motion, manifest, micro-UX · 2.6 font | Basso |

Note per Codex: i numeri di bundle sono misurati con `npm ci --legacy-peer-deps && npm run build` su questo commit; rieseguire la build dopo le fasi 1–3 per quantificare i miglioramenti. Non introdurre librerie nuove: tutto quanto sopra si fa con le dipendenze esistenti.
