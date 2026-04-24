# ⚙️ SCHEDINONE — Guida del Comitato

Questa guida è per i membri del Comitato che gestiscono il gioco SCHEDINONE.

---

## 👥 Ruolo del Comitato

Il Comitato gestisce il gioco SCHEDINONE. Potete essere più admin contemporaneamente.

---

## 🔑 Come Accedere come Admin

1. Apri SCHEDINONE (stesso link dei giocatori)
2. Inserisci il tuo **nome**
3. Usa il codice admin: **`COMITATO2026`** (NON il codice giocatori!)
4. Vedrai un tab extra **"⚙️ Comitato"** nella barra in basso

---

## 📢 Come Condividere il Gioco con i Giocatori

1. Invia ai giocatori:
   - Il **link** dell'app (l'URL del sito)
   - Il **codice gioco**: `GIOCA2026`
   - Il file **GUIDA_GIOCATORE.md** (o spiega a voce le istruzioni)
2. Puoi mandare tutto via WhatsApp, email, o come preferisci

---

## 📬 Gestione Schedine (Schedine Ricevute)

1. Vai su **⚙️ Comitato → Schedine Ricevute**
2. Qui vedi le schedine inviate dai giocatori
3. Per ogni schedina puoi:
   - ✅ **Accettare** — la schedina diventa definitiva e visibile nel Griglione
   - ❌ **Rifiutare** — il giocatore potrà modificarla e reinviarla
4. Accetta tutte le schedine **PRIMA dell'inizio della prima partita!**

---

## 🔄 Gestione Risultati (Gestisci Risultati)

- I risultati si aggiornano **automaticamente** durante le partite
- Se un risultato è sbagliato o mancante, puoi correggerlo manualmente:
  1. Vai su **⚙️ Comitato → Gestisci Risultati**
  2. Clicca su una partita
  3. Inserisci il punteggio e il segno (1, X, o 2)

---

## 👥 Gestione Giocatori (Gestisci Giocatori)

- Qui vedi tutti i giocatori iscritti
- Puoi segnare chi ha **pagato** la quota (toggle Pagato / Non pagato)
- Puoi **rimuovere** un giocatore se necessario

---

## 📊 Riepilogo Schedine (Riepilogo)

- Una griglia con **TUTTI** i pronostici di tutti i giocatori
- Utile per avere il quadro completo e verificare che tutto sia in ordine

---

## 🔁 Avanzamento Fase

Quando i gironi finiscono e si conoscono gli accoppiamenti degli ottavi:

1. Vai nella console Firebase: [console.firebase.google.com](https://console.firebase.google.com)
2. Apri **Firestore → games → schedinone-2026**
3. Cambia il campo `currentPhase` da `"gironi"` a `"ottavi"`
4. Aggiungi le partite degli ottavi nella collezione `matches`

> ℹ️ In futuro questo potrà essere fatto direttamente dall'app.

---

## 🗝️ Codici Importanti

| Cosa | Codice |
|---|---|
| Codice giocatori | `GIOCA2026` |
| Codice admin | `COMITATO2026` |
| Link app | *(inserire l'URL dopo il deploy)* |

---

*Per qualsiasi problema tecnico, contattate chi ha sviluppato l'app. Buon Mondiale! ⚽*

## Annunci e messaggi

- **Annunci** (Admin → 📢 Annunci): scrivi bozze, pubblicale a tutti i giocatori o a un sottoinsieme, modificale o eliminale in qualsiasi momento. Alla pubblicazione parte automaticamente una notifica push ai destinatari.
- **Messaggi** (Admin → 💬 Messaggi): vedi la lista di tutte le conversazioni con i singoli giocatori. Puoi rispondere o iniziare una nuova conversazione con "Nuova conversazione". Ogni nuovo messaggio notifica il destinatario.
