# Griglione PDF — Design

**Data**: 2026-05-03
**Autore**: Alberto Pileri
**Stato**: approvato (pronto per implementation plan)

## Contesto

Lo Schedinone ha tradizionalmente prodotto, ad ogni torneo (es. Euro 2024 — "Griglione giusto.pdf"), un poster/PDF singolo con tutte le partite della fase a gironi sulle righe e tutti i partecipanti sulle colonne. Le celle contengono il pronostico (1/X/2) di ogni partecipante per ogni partita. In fondo, due righe speciali: Vincitrice e Capocannoniere.

L'app web attuale (`RiepilogoPage.tsx`) ha un griglione interattivo dark-theme raggruppato per girone e una funzione "📄 PDF" che rasterizza la tabella web così com'è. Il risultato è un PDF dark, raggruppato per girone, ordinato per punteggio: non corrisponde allo stile storico voluto.

## Obiettivo

Sostituire la stampa PDF di `RiepilogoPage` con un nuovo componente `GriglionePrintable` che produce un PDF a foglio singolo (formato custom, ~A2 paesaggio) graficamente coerente con il "Griglione giusto" 2024 e tematicamente aggiornato ai Mondiali 2026 USA · Messico · Canada.

## Decisioni chiave

| Decisione | Scelta |
|-----------|--------|
| Cosa va in alto | I partecipanti dello Schedinone (le "squadre" inventate) |
| Cosa va a sinistra | Le partite della fase gironi, ordinate per kickoff ascendente |
| Raggruppamento | Nessuno — lista continua delle partite (come 2024) |
| Quali partecipanti | Solo `scheduleStatus === "accettata"` |
| Quali partite | Solo `phase === "gironi"` |
| Pronostici speciali | Sì — righe "Vincitrice" e "Capocannoniere" in fondo (come 2024) |
| Risultati partite | Non mostrati — è un griglione delle scommesse, pre-partite |
| Ordine partecipanti | `joinedAt` ascendente (ordine di iscrizione) |
| Formato pagina | Custom, foglio singolo dimensionato dinamicamente; fallback A2 multi-pagina se >1500mm |
| Stampa attuale | Sostituita (non affiancata) |

## Architettura

### Nuovo file: `src/components/GriglionePrintable.tsx`

Componente React `forwardRef<HTMLDivElement, Props>` (stesso pattern di `SchedinaPrintable.tsx`).

```ts
interface Props {
  game: Game;
  players: Player[];
  matches: Match[];
}
```

Renderizza un blocco DOM bianco/light, con `width` calcolata dinamicamente in base al numero di partecipanti. Si aspetta di ricevere `players` già filtrati e ordinati e `matches` già filtrati alla fase gironi (la responsabilità del filtro è del chiamante, in `RiepilogoPage`).

### Modifiche a `src/pages/admin/RiepilogoPage.tsx`

- Il pulsante "📄 PDF" rimane invariato nell'UI.
- L'handler `handleExportPdf` viene riscritto:
  1. Filtra `players` con `scheduleStatus === "accettata"`, ordinati per `joinedAt` ascendente.
  2. Filtra `matches` con `phase === "gironi"`, ordinati per `kickoff` ascendente (null in coda, tie-break su `id`).
  3. Se `players.length === 0` → toast "Nessuna schedina accettata da stampare", stop.
  4. Se `matches.length === 0` → toast "Nessuna partita disponibile", stop.
  5. Calcola dimensione foglio (vedi formule sotto).
  6. Monta `<GriglionePrintable>` off-screen via portal o div nascosto (`position: absolute; left: -99999px; top: 0`).
  7. Aspetta `document.fonts.ready` (timeout 3s) per garantire che il font gotico sia caricato.
  8. Chiama `exportElementAsPdf` con `format` custom.
  9. Smonta il nodo off-screen (cleanup garantito anche su errore via `try/finally`).
  10. Toast "Griglione scaricato!".

### Modifiche a `src/lib/pdfExport.ts`

Estendere `PdfOptions`:

```ts
interface PdfOptions {
  filename: string;
  orientation?: "portrait" | "landscape";
  margin?: number;
  background?: string;
  /** Custom format in mm: [width, height]. Default "a4". */
  format?: [number, number] | "a4";
}
```

Quando `format` è una tupla, passarla a `jsPDF` come `format: [w, h]` (jsPDF accetta dimensioni custom in `unit: "mm"`). Se la dimensione richiesta supera 1500mm su un asse, fallback automatico ad A2 paesaggio multi-pagina con la logica di slicing già esistente.

## Layout visivo

### Header (in alto)

- **Titolo**: "Der Skedinonen-Lo Schedinone 2026" — font gotico `UnifrakturMaguntia` (Google Fonts, OFL license), peso 400, dimensione adattiva (~48-64pt in base alla larghezza foglio).
- **Sottotitolo**: "Il Griglione del Mondiale di calcio 2026 — USA · Messico · Canada" — stesso font, ~20pt.
- **Bandierine "host nations"**: a destra del titolo, in linea: 🇺🇸 🇲🇽 🇨🇦 (rese tramite `<Flag>` o emoji bandiere).
- **Riga decorativa**: sotto il titolo, banda orizzontale a 3 strisce sottili (blu navy USA, verde MEX, rosso CAN) — `height: 3mm`, full-width.

### Watermark di fondo

- Composizione centrata, opacità ~6%, dietro alla tabella:
  - Le 3 silhouette delle bandiere USA · MEX · CAN affiancate (CSS `<div>` con sfondo colorato o SVG inline)
  - Sotto, scritta "FIFA WORLD CUP 26" in font sans-serif bold
- Realizzato con `position: absolute; inset: 0; z-index: 0; pointer-events: none`.
- **Niente loghi ufficiali FIFA** (copyright). Solo elementi grafici generici tematici.

### Tabella principale

- **Header colonne** (riga top):
  - Cella 1: "Partite" — fondo `#0f172a`, testo bianco, font Outfit bold.
  - Celle 2..N+1: nomi dei partecipanti — stesso fondo scuro. Layout testo:
    - Orizzontale se `nome.length ≤ 8 && colWidth ≥ 14mm`
    - Verticale (rotato 90°) altrimenti, per consentire colonne strette con nomi lunghi.
- **Righe partite**: una per partita.
  - Sfondo righe alternate (zebra leggera): pari `#ffffff`, dispari `#f8fafc`.
  - Cella partita (colonna SX): testo `"HomeTeam-AwayTeam"` (es. "Italia-Albania"), font Outfit bold.
  - Celle pronostico: `1` / `X` / `2` centrato, font monospace bold, dimensione adattiva.
  - **Niente colorazione corretto/sbagliato** (il PDF è pre-partite, niente risultati).
- **Bordi**: `1px solid #0f172a` su tutte le celle.

### Sezione finale (sotto la tabella)

- **Riga "Vincitrice"**:
  - Cella SX: label "Vincitrice" su fondo `#0f172a`, testo bianco.
  - Per ogni partecipante: `<Flag>` della nazionale + sigla 3-lettere maiuscola (es. "ITA"). Se `winnerPick` vuoto → cella vuota.
- **Riga "Capocannoniere"**:
  - Cella SX: label "Capocannoniere".
  - Per ogni partecipante: `topScorerPick` come stringa (formato libero "Cognome (NAZ)"). Font small. Se vuoto → cella vuota.

### Footer

- Mini riga sotto la tabella: "schedinone-2026.web.app · Generato il [DD MMMM YYYY HH:mm]" + 3 bandierine mini USA · MEX · CAN allineate a destra.
- Colore `#94a3b8`, font 9-10pt.

### Palette

| Elemento | Colore |
|----------|--------|
| Sfondo pagina | `#ffffff` |
| Bordi e testo principale | `#0f172a` (slate-900) |
| Header colonne (fondo) | `#0f172a` |
| Header colonne (testo) | `#ffffff` |
| Zebra righe alternate | `#f8fafc` |
| Watermark | `#0f172a` opacità 0.06 |
| Banda host (USA) | `#002868` (navy) |
| Banda host (MEX) | `#006847` (verde) |
| Banda host (CAN) | `#d52b1e` (rosso) |
| Footer testo | `#94a3b8` |

## Calcolo dimensioni foglio

```ts
const colPartiteMm = 60;
const colPlayerMm = 14;
const colExtraMm = 20; // margini + bordi
const headerMm = 60;   // titolo + sottotitolo + banda
const rowMm = 6;
const footerMm = 30;

const widthMm = colPartiteMm + (colPlayerMm * N) + colExtraMm;
const heightMm = headerMm + (rowMm * (M + 3)) + footerMm;
// M = num partite gironi
// +3 = riga header + Vincitrice + Capocannoniere
```

Esempio (25 partecipanti, 72 partite):
- `widthMm = 60 + 14×25 + 20 = 430mm`
- `heightMm = 60 + 6×75 + 30 = 540mm`
- → formato simile A2 paesaggio (594×420mm).

Se `widthMm > 1500` o `heightMm > 1500`, fallback A2 paesaggio (594×420mm) multi-pagina con slicing.

## Flusso di esportazione PDF

1. Click su "📄 PDF" → `setExportingPdf(true)`, `vibrate("tap")`.
2. Filtra players e matches.
3. Validazione (vedi error handling).
4. Calcola dimensioni foglio.
5. Mount off-screen di `<GriglionePrintable>` con `width = widthMm × 3.78` (px/mm) e `height = heightMm × 3.78`.
6. `await new Promise(r => requestAnimationFrame(r))` per stabilizzare layout.
7. `await Promise.race([document.fonts.ready, timeout(3000)])` per caricare font gotico.
8. `await exportElementAsPdf(element, { filename, format: [widthMm, heightMm], orientation: widthMm >= heightMm ? "landscape" : "portrait", margin: 0 })`.
9. `finally`: rimuove nodo off-screen, `setExportingPdf(false)`.
10. Successo → toast "Griglione scaricato!". Errore → toast "Errore nel download del PDF".

## Error handling e casi limite

| Caso | Comportamento |
|------|--------------|
| 0 giocatori `accettata` | Toast errore, PDF non generato |
| 0 partite gironi | Toast errore, PDF non generato |
| 1 solo giocatore accettato | PDF generato regolarmente (1 colonna) |
| Partita con `kickoff = null` | Spostata in coda, ordinata per `id` |
| `predictions[match.id]` mancante | Cella vuota |
| `winnerPick` vuoto | Cella Vincitrice vuota |
| `topScorerPick` vuoto | Cella Capocannoniere vuota |
| `<Flag>` non riconosce nazionale | Solo sigla 3-lettere |
| Font gotico non caricato in 3s | Fallback `serif`, console.warn |
| `html2canvas` fallisce (es. OOM mobile) | Catch → toast errore + cleanup nodo |
| Click PDF mentre già in corso | Pulsante `disabled` durante `exportingPdf` |
| `widthMm > 1500` o `heightMm > 1500` | Fallback A2 paesaggio multi-pagina |

## Test

**Approccio**: Vitest + Testing Library, coerente con i test esistenti.

### Nuovo file: `src/components/__tests__/GriglionePrintable.test.tsx`

1. **Render base** — 3 giocatori e 6 partite producono 1+3 colonne (partite + 3 partecipanti) e 6 righe partita + 2 righe speciali.
2. **Filtro accettata** — il chiamante è responsabile del filtro, ma il componente assume che riceva solo `accettata`. Test verifica che renderizzi tutti i `players` ricevuti senza filtrare ulteriormente.
3. **Ordinamento partite** — le partite ricevute sono renderizzate nell'ordine in cui arrivano (sort è responsabilità del chiamante).
4. **Pronostico mancante** — cella corrispondente è vuota (`textContent === ""`).
5. **Pronostici speciali** — riga Vincitrice mostra `winnerPick`, riga Capocannoniere mostra `topScorerPick`.
6. **Header titolo** — il titolo e il sottotitolo 2026 sono presenti nel DOM.
7. **Watermark** — l'elemento watermark esiste e ha opacità ~0.06.

### Estensione: `src/pages/admin/__tests__/RiepilogoPage.test.tsx` (creato se non esiste)

8. **Filtro chiamante** — `RiepilogoPage` passa al `GriglionePrintable` solo i giocatori `accettata` ordinati per `joinedAt`.
9. **Filtro partite gironi** — passa solo le partite `phase === "gironi"` ordinate per `kickoff`.
10. **Toast errore se 0 accettati** — click su PDF con 0 giocatori `accettata` → toast errore, `exportElementAsPdf` mock non chiamato.
11. **Toast errore se 0 partite** — analogo per `phase === "gironi"` vuoto.
12. **Cleanup nodo off-screen** — dopo export (anche su errore), `document.querySelector('[data-griglione-print]')` è null.

### Mock

- `exportElementAsPdf` mockato (no html2canvas/jspdf reali nei test).
- `document.fonts.ready` mockato a `Promise.resolve()`.

### Verifica manuale (acceptance)

Generare PDF reali in dev con:
- 5, 15, 25 partecipanti
- Tutte e 72 le partite della fase gironi presenti
- Confronto a colpo d'occhio con `Griglione giusto.pdf` 2024 per verificare coerenza grafica
- Verificare leggibilità del font gotico nel titolo
- Verificare presenza watermark con tema USA · MEX · CAN

## File toccati (riepilogo)

**Nuovi**:
- `src/components/GriglionePrintable.tsx`
- `src/components/__tests__/GriglionePrintable.test.tsx`
- `src/pages/admin/__tests__/RiepilogoPage.test.tsx` (se non esiste)

**Modificati**:
- `src/pages/admin/RiepilogoPage.tsx` (handler `handleExportPdf` riscritto, rimossa rasterizzazione di `tableContainerRef`)
- `src/lib/pdfExport.ts` (aggiunto support `format` custom in `PdfOptions`)

**Non toccati**:
- `src/lib/types.ts`, `src/lib/firebase.ts`, regole Firestore
- `src/lib/playerStats.ts`, `src/lib/recalcPoints.ts`
- Tutti gli altri componenti
