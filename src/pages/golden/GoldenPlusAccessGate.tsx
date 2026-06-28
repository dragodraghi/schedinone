import { useEffect, useRef, useState, type ReactNode } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app, db } from "../../lib/firebase";
import { formatGoldenAccessClosesAt, isGoldenAccessOpen } from "../../lib/goldenAccessWindow";
import type { GoldenAccess, Player } from "../../lib/types";

type Props = {
  gameId: string;
  access: GoldenAccess | null;
  accessLoading: boolean;
  userUid: string;
  player: Player | null;
  accessClosesAt?: Date | null;
  now?: Date;
  children: ReactNode;
};

export default function GoldenPlusAccessGate({
  gameId,
  access,
  accessLoading,
  userUid,
  player,
  accessClosesAt = null,
  now = new Date(),
  children,
}: Props) {
  const [displayName, setDisplayName] = useState("");
  const [contact, setContact] = useState("");
  const [requestError, setRequestError] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [joinError, setJoinError] = useState("");
  const joiningRef = useRef(false);
  const accessOpen = isGoldenAccessOpen(accessClosesAt, now);
  const canSubmitRequest = !!userUid && accessOpen;

  useEffect(() => {
    if (access?.status !== "approved" || player || joiningRef.current || joinError || !userUid) {
      return;
    }
    joiningRef.current = true;
    const functions = getFunctions(app, "europe-west1");
    const joinGame = httpsCallable(functions, "joinGame");
    joinGame({
      gameId,
      name: access.displayName,
      code: "",
    })
      .catch((err) => {
        const message =
          err && typeof err === "object" && "message" in err && typeof err.message === "string"
            ? err.message
            : "Accesso Golden Plus non riuscito.";
        setJoinError(message);
      })
      .finally(() => {
        joiningRef.current = false;
      });
  }, [access, gameId, joinError, player, userUid]);

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = displayName.trim();
    const contactValue = contact.trim();
    if (!name || !canSubmitRequest) return;

    setRequestError("");
    try {
      await setDoc(doc(db, "games", gameId, "access", userUid), {
        status: "pending",
        type: "new-request",
        displayName: name,
        contact: contactValue,
        createdAt: serverTimestamp(),
      });
      setRequestSent(true);
    } catch (err) {
      console.error("Golden Plus request error:", err);
      setRequestError("Richiesta non inviata. Riprova.");
    }
  };

  if (access?.status === "rejected" || access?.status === "revoked") {
    return (
      <div className="surface-panel p-4">
        <p className="text-sm font-black text-[var(--wrong)]">Accesso Golden Plus non attivo</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Contatta il Comitato per chiarimenti.</p>
      </div>
    );
  }

  if (player) {
    return <>{children}</>;
  }

  if (accessLoading) {
    return <div className="surface-panel p-4 text-sm text-[var(--text-muted)]">Caricamento Golden Plus...</div>;
  }

  if (access?.status === "approved") {
    return (
      <div className="surface-panel p-4 text-sm text-[var(--text-muted)]">
        {joinError ? (
          <p className="font-bold text-[var(--wrong)]">{joinError}</p>
        ) : (
          <p>Preparazione Golden Plus...</p>
        )}
      </div>
    );
  }

  if (access?.status === "pending" || requestSent) {
    return (
      <div className="surface-panel p-4">
        <p className="text-sm font-black text-[var(--gold)]">Richiesta in attesa</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          La richiesta e' stata inviata al Comitato. Dopo l'approvazione entrerai nello Schedinone Golden Plus.
        </p>
      </div>
    );
  }

  if (!accessOpen) {
    return (
      <div className="surface-panel p-4">
        <p className="text-sm font-black text-[var(--wrong)]">Richieste Golden Plus chiuse</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Le iscrizioni si sono chiuse il {formatGoldenAccessClosesAt(accessClosesAt)}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleRequest} className="surface-panel space-y-4 p-4">
      <div>
        <p className="page-kicker">Golden Plus</p>
        <h1 className="mt-1 text-2xl font-black">Richiedi iscrizione</h1>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Il Comitato approvera' le richieste prima dell'ingresso nel gioco.
        </p>
        <p className="mt-2 text-xs font-bold text-[var(--gold)]">
          Richieste aperte fino a {formatGoldenAccessClosesAt(accessClosesAt)}.
        </p>
      </div>

      <label className="block">
        <span className="micro-label mb-2 block">Nome squadra</span>
        <input
          className="app-field w-full"
          value={displayName}
          maxLength={30}
          onChange={(event) => setDisplayName(event.target.value)}
        />
      </label>

      <label className="block">
        <span className="micro-label mb-2 block">Contatto</span>
        <input
          className="app-field w-full"
          value={contact}
          maxLength={120}
          onChange={(event) => setContact(event.target.value)}
        />
      </label>

      {requestError && <p className="text-sm font-bold text-[var(--wrong)]">{requestError}</p>}

      <button type="submit" disabled={!displayName.trim() || !canSubmitRequest} className="primary-action w-full">
        Richiedi iscrizione
      </button>
      {!userUid && (
        <p className="text-xs text-[var(--text-muted)]">Attendo la connessione dell'account prima di inviare la richiesta.</p>
      )}
    </form>
  );
}
