/**
 * Rule-based FAQ for the SCHEDINONE chatbot. Keyword matching — no backend,
 * no AI API cost. Covers ~90% of real questions (install, rules, scoring,
 * troubleshooting). For anything unrecognized, falls back to a "ask the
 * Comitato in person" suggestion.
 */

export interface FaqEntry {
  id: string;
  /** Lowercase keywords that trigger this entry. Any match = fire. */
  keywords: string[];
  /** The quick-reply question label (shown as a button). */
  question: string;
  /** Bot answer (plain text, \n for line breaks). */
  answer: string;
  /** Optional follow-up question IDs to suggest after answering. */
  followups?: string[];
}

export const FAQ_LIST: FaqEntry[] = [
  {
    id: "install-android",
    keywords: ["install", "android", "chrome", "schermata", "home", "icona", "scaricare", "app"],
    question: "📱 Come installo l'app su Android?",
    answer:
      "Su Android con Chrome:\n\n" +
      "1. Tocca i 3 puntini ⋮ in alto a destra\n" +
      "2. Scegli 'Aggiungi a schermata Home' o 'Installa app'\n" +
      "3. Conferma\n\n" +
      "L'icona SCHEDINONE apparirà sul tuo telefono come un'app normale. Si apre senza la barra del browser.",
    followups: ["install-iphone", "come-entrare"],
  },
  {
    id: "install-iphone",
    keywords: ["iphone", "ios", "safari", "apple", "ipad"],
    question: "🍎 Come installo l'app su iPhone?",
    answer:
      "Su iPhone con Safari:\n\n" +
      "1. Tocca l'icona Condividi ↑ in basso al centro\n" +
      "2. Scorri e scegli 'Aggiungi a schermata Home'\n" +
      "3. Conferma 'Aggiungi'\n\n" +
      "⚠️ Deve essere Safari, non Chrome o Firefox su iPhone.",
    followups: ["install-android", "come-entrare"],
  },
  {
    id: "come-entrare",
    keywords: ["entrare", "login", "accesso", "codice", "non riesco", "entra"],
    question: "🔑 Come entro nel gioco?",
    answer:
      "1. Apri l'app\n" +
      "2. Scrivi il tuo NOME (quello che vedranno gli altri nella classifica)\n" +
      "3. Scrivi il CODICE GIOCO che ti ha dato il Comitato (di default GIOCA2026)\n" +
      "4. Tocca 'Entra in gioco'\n\n" +
      "Se non ricordi il codice, puoi cliccare 'Il tuo Codice' nella schermata di login.",
    followups: ["compilare", "nome-duplicato"],
  },
  {
    id: "nome-duplicato",
    keywords: ["nome", "occupato", "gia' usato", "duplicato", "preso"],
    question: "❗ Mi dice 'nome gia' usato'",
    answer:
      "Qualcuno ha già usato quel nome. Scegli un nome diverso — per esempio aggiungi la tua iniziale:\n\n" +
      "  'Marco' → 'Marco R.'\n" +
      "  'Giulia' → 'Giulia M.'\n\n" +
      "Se pensi di essere stato tu su un altro dispositivo, chiedi al Comitato di rimuovere il vecchio dalla lista giocatori.",
  },
  {
    id: "compilare",
    keywords: ["compilare", "compila", "pronostic", "schedina", "1 x 2", "come faccio"],
    question: "📝 Come compilo la schedina?",
    answer:
      "1. Tocca il tab 📋 Schedina in basso\n" +
      "2. Per ogni partita tocca UNO dei tre bottoni:\n" +
      "   • 1 = vince la squadra di casa\n" +
      "   • X = pareggio\n" +
      "   • 2 = vince la squadra in trasferta\n" +
      "3. Scegli anche il Capocannoniere e la Squadra Vincitrice del Mondiale\n" +
      "4. Tocca 'Salva e Invia al Comitato'\n\n" +
      "Mentre scegli, l'app salva in automatico: vedi 'Salvato ✓' in alto.",
    followups: ["punti", "scadenza", "modificare"],
  },
  {
    id: "punti",
    keywords: ["punti", "punteggio", "come si vince", "vincere", "score", "montepremi"],
    question: "🏆 Come si fanno i punti?",
    answer:
      "È semplice:\n\n" +
      "• +1 punto per ogni risultato azzeccato (1, X o 2)\n" +
      "• +1 punto extra se indovini il Capocannoniere del torneo\n" +
      "• +1 punto extra se indovini la Squadra Vincitrice\n\n" +
      "Chi totalizza più punti a fine torneo vince il montepremi.",
    followups: ["compilare", "classifica"],
  },
  {
    id: "modificare",
    keywords: ["modificare", "cambiare", "correggere", "cancellare", "annullare"],
    question: "✏️ Posso modificare la schedina dopo averla inviata?",
    answer:
      "Dopo aver inviato al Comitato la schedina diventa in SOLA LETTURA. Se vuoi modificarla:\n\n" +
      "• Chiedi al Comitato di RIFIUTARE la tua schedina\n" +
      "• Una volta rifiutata puoi modificarla e reinviarla\n\n" +
      "Una volta che il Comitato ACCETTA, non puoi più cambiare nulla.",
    followups: ["scadenza", "rifiutata"],
  },
  {
    id: "rifiutata",
    keywords: ["rifiutata", "rifiutato", "rossa", "respinta"],
    question: "❌ La mia schedina è rifiutata",
    answer:
      "Il Comitato l'ha rispedita indietro — probabilmente perché hai dimenticato qualcosa o c'è stato un errore.\n\n" +
      "Cosa fare:\n" +
      "1. Vai su 📋 Schedina\n" +
      "2. Correggi quello che serve\n" +
      "3. Tocca di nuovo 'Salva e Invia al Comitato'\n\n" +
      "Se non sai cosa non andava, chiedi a voce al Comitato.",
  },
  {
    id: "scadenza",
    keywords: ["scadenza", "chiude", "termine", "fine", "quando", "orario", "ora"],
    question: "⏰ Entro quando devo inviare la schedina?",
    answer:
      "La schedina si chiude automaticamente 24 ORE PRIMA della prima partita del Mondiale.\n\n" +
      "Dopo quel momento non puoi più modificare né inviare. La data esatta la vedi in fondo alla pagina Schedina.\n\n" +
      "Suggerimento: NON aspettare l'ultimo momento — a volte la connessione fa brutti scherzi.",
    followups: ["compilare", "modificare"],
  },
  {
    id: "classifica",
    keywords: ["classifica", "ranking", "posizione", "leader", "primo"],
    question: "🏅 Dove vedo la classifica?",
    answer:
      "Tocca il tab 🏆 Ranking in basso. Vedi tutti i giocatori ordinati per punti, con medaglie per i primi 3.\n\n" +
      "Sulla stessa pagina in basso trovi il montepremi totale aggiornato.",
    followups: ["griglione", "confronto"],
  },
  {
    id: "griglione",
    keywords: ["griglione", "tabellone", "tutti i pronostici", "vedere altri"],
    question: "📊 Cos'è il Griglione?",
    answer:
      "È la tabella con TUTTI i pronostici di tutti i giocatori, una colonna per persona.\n\n" +
      "Ci vedi:\n" +
      "• Verde = pronostico azzeccato\n" +
      "• Rosso = pronostico sbagliato\n" +
      "• Azzurro = pronostico inserito, partita non ancora giocata\n\n" +
      "Si aggiorna in diretta mano a mano che escono i risultati.",
    followups: ["confronto", "classifica"],
  },
  {
    id: "confronto",
    keywords: ["confronto", "sfida", "confrontare", "avversario"],
    question: "⚔️ Come faccio il confronto con altri giocatori?",
    answer:
      "Tocca il tab 👤 Profilo → sezione 'Confronto'.\n\n" +
      "Tocca i nomi degli avversari che vuoi includere (puoi sceglierne quanti vuoi). La tabella ti mostra:\n" +
      "• Punti per fase (gironi, ottavi, ecc.)\n" +
      "• Totale punti con 👑 per il leader\n" +
      "• Pronostici speciali di ognuno",
    followups: ["classifica", "griglione"],
  },
  {
    id: "quota",
    keywords: ["quota", "pagamento", "pagare", "costo", "soldi", "euro"],
    question: "💰 Come pago la quota d'iscrizione?",
    answer:
      "Il pagamento della quota avviene di persona / offline con il Comitato (Bonifico, contanti, Satispay, come preferite voi).\n\n" +
      "L'app NON gestisce pagamenti: il Comitato segna chi ha pagato cliccando 'Pagato' dal suo pannello.",
  },
  {
    id: "mondiale-inizio",
    keywords: ["inizia", "comincia", "data", "giorno", "prima partita", "inaugurale"],
    question: "⚽ Quando inizia il Mondiale 2026?",
    answer:
      "Il Mondiale FIFA 2026 inizia l'11 GIUGNO 2026 con la partita inaugurale Messico vs Sudafrica a Città del Messico (Estadio Azteca).\n\n" +
      "La finale è il 19 LUGLIO 2026. 48 squadre, 12 gironi (A–L), per un totale di 104 partite. Ospitato da USA, Messico e Canada.",
    followups: ["scadenza", "punti"],
  },
  {
    id: "problema-tecnico",
    keywords: ["non funziona", "bug", "errore", "crash", "lento", "si blocca", "non si apre"],
    question: "🔧 L'app non funziona / è lenta",
    answer:
      "Prova in ordine:\n\n" +
      "1. Chiudi COMPLETAMENTE il browser (non solo la scheda) e riapri\n" +
      "2. Prova a connetterti a un altro WiFi / spegni e riaccendi la connessione\n" +
      "3. Disinstalla l'icona SCHEDINONE dalla Home e reinstallala dal link\n" +
      "4. Svuota la cache del browser sul sito schedinone-2026.web.app\n\n" +
      "Se dopo questi passi ancora non va, parla al Comitato — ci vediamo il tuo problema insieme.",
  },
  {
    id: "privacy",
    keywords: ["privacy", "dati", "gdpr", "vedere", "visibili", "altri"],
    question: "🔒 Chi può vedere i miei pronostici?",
    answer:
      "Fino a quando NON invii al Comitato → solo tu.\n\n" +
      "Appena il Comitato ACCETTA la tua schedina → diventa visibile a tutti i giocatori nel Griglione (per trasparenza).\n\n" +
      "Il tuo nome è visibile in classifica. Nessun altro dato personale viene raccolto.",
  },
];

/**
 * Matches user input against FAQ keywords. Returns the best-matching entry
 * or null if nothing matches confidently.
 */
export function matchFaq(input: string): FaqEntry | null {
  const normalized = input
    .toLowerCase()
    .replace(/[.,!?;:'"()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length < 2) return null;

  const words = normalized.split(" ");
  let best: { entry: FaqEntry; score: number } | null = null;

  for (const entry of FAQ_LIST) {
    let score = 0;
    for (const kw of entry.keywords) {
      // Exact-word match scores 2, substring match scores 1
      if (words.includes(kw)) score += 2;
      else if (normalized.includes(kw)) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { entry, score };
    }
  }

  // Require a minimum confidence (score ≥ 2) to avoid false positives
  return best && best.score >= 2 ? best.entry : null;
}

export function findFaq(id: string): FaqEntry | null {
  return FAQ_LIST.find((f) => f.id === id) ?? null;
}
