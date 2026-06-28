import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { collection, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { GOLDEN_GAME_ID } from "../../lib/games";
import { formatGoldenAccessClosesAt, isGoldenAccessOpen } from "../../lib/goldenAccessWindow";
import type { GoldenAccess, Player } from "../../lib/types";

type Props = {
  players: Player[];
  currentUid: string;
  accessClosesAt?: Date | null;
  now?: Date;
};

function toAccess(id: string, raw: Record<string, unknown>): GoldenAccess {
  const status =
    raw.status === "approved" || raw.status === "rejected" || raw.status === "revoked" ? raw.status : "pending";
  return {
    id,
    status,
    type: raw.type === "classic-player" ? "classic-player" : "new-request",
    displayName: typeof raw.displayName === "string" ? raw.displayName : "Giocatore",
    contact: typeof raw.contact === "string" ? raw.contact : undefined,
    classicPlayerUid: typeof raw.classicPlayerUid === "string" ? raw.classicPlayerUid : undefined,
    paid: raw.paid === true,
  };
}

export default function GoldenPlusAdminPanel({
  players,
  currentUid,
  accessClosesAt = null,
  now = new Date(),
}: Props) {
  const [accessItems, setAccessItems] = useState<GoldenAccess[]>([]);
  const accessOpen = isGoldenAccessOpen(accessClosesAt, now);

  useEffect(() => {
    return onSnapshot(collection(db, "games", GOLDEN_GAME_ID, "access"), (snap) => {
      setAccessItems(snap.docs.map((accessDoc) => toAccess(accessDoc.id, accessDoc.data())));
    });
  }, []);

  const approvedByClassicUid = useMemo(() => {
    const map = new Map<string, GoldenAccess>();
    for (const access of accessItems) {
      if (access.status === "approved" && access.classicPlayerUid) {
        map.set(access.classicPlayerUid, access);
      }
    }
    return map;
  }, [accessItems]);

  const pending = accessItems.filter((access) => access.status === "pending");
  const approved = accessItems.filter((access) => access.status === "approved");

  const approveAccess = async (access: GoldenAccess) => {
    await updateDoc(doc(db, "games", GOLDEN_GAME_ID, "access", access.id), {
      status: "approved",
      reviewedAt: serverTimestamp(),
      reviewedBy: currentUid,
    });
  };

  const revokeAccess = async (access: GoldenAccess) => {
    await updateDoc(doc(db, "games", GOLDEN_GAME_ID, "access", access.id), {
      status: "revoked",
      reviewedAt: serverTimestamp(),
      reviewedBy: currentUid,
    });
  };

  const setAccessPaid = async (access: GoldenAccess, paid: boolean) => {
    await updateDoc(doc(db, "games", GOLDEN_GAME_ID, "access", access.id), {
      paid,
      reviewedAt: serverTimestamp(),
      reviewedBy: currentUid,
    });
  };

  const authorizeClassicPlayer = async (player: Player) => {
    await setDoc(
      doc(db, "games", GOLDEN_GAME_ID, "access", player.id),
      {
        status: "approved",
        type: "classic-player",
        displayName: player.name,
        classicPlayerUid: player.id,
        paid: false,
        createdAt: serverTimestamp(),
        reviewedAt: serverTimestamp(),
        reviewedBy: currentUid,
      },
      { merge: true }
    );
  };

  return (
    <div className="space-y-5 animate-in">
      <header className="page-head">
        <div>
          <p className="page-kicker">Area Comitato</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Golden Plus</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Autorizzazioni e richieste di accesso.</p>
        </div>
      </header>

      <section
        className="status-panel px-4 py-3"
        style={{
          "--status-bg": accessOpen ? "rgba(0, 255, 136, 0.09)" : "rgba(255, 51, 102, 0.09)",
          "--status-border": accessOpen ? "rgba(0,255,136,0.35)" : "rgba(255,51,102,0.35)",
        } as CSSProperties}
      >
        <p className="text-sm font-black" style={{ color: accessOpen ? "var(--correct)" : "var(--wrong)" }}>
          {accessOpen ? "Inviti aperti" : "Inviti chiusi"}
        </p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          Chiusura approvazioni: {formatGoldenAccessClosesAt(accessClosesAt)}
        </p>
      </section>

      <section className="surface-panel p-4">
        <h2 className="text-lg font-black">Controllo gioco Golden</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link to="/admin/golden-schedine" className="admin-tile card-tap">
            <span className="admin-mark">GS</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-[var(--text-primary)]">Schedine Golden</span>
              <span className="micro-label mt-0.5 block">Controlla, accetta o rifiuta</span>
            </span>
          </Link>
          <Link to="/admin/golden-risultati" className="admin-tile card-tap">
            <span className="admin-mark">GR</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-[var(--text-primary)]">Risultati Golden</span>
              <span className="micro-label mt-0.5 block">Inserisci la qualificata</span>
            </span>
          </Link>
        </div>
      </section>

      <section className="surface-panel p-4">
        <h2 className="text-lg font-black">Richieste in attesa</h2>
        <div className="mt-3 space-y-2">
          {pending.length === 0 && <p className="text-sm text-[var(--text-muted)]">Nessuna richiesta in attesa.</p>}
          {pending.map((access) => (
            <div key={access.id} className="admin-tile">
              <span className="admin-mark">NEW</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-[var(--text-primary)]">{access.displayName}</span>
                {access.contact && <span className="micro-label mt-0.5 block">{access.contact}</span>}
              </span>
              <button
                type="button"
                className="primary-action px-3"
                disabled={!accessOpen}
                onClick={() => approveAccess(access)}
              >
                {accessOpen ? `Approva ${access.displayName}` : `Approvazioni chiuse per ${access.displayName}`}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-panel p-4">
        <h2 className="text-lg font-black">Giocatori classici</h2>
        <div className="mt-3 space-y-2">
          {players.map((player) => {
            const existing = approvedByClassicUid.get(player.id);
            return (
              <div key={player.id} className="admin-tile">
                <span className="admin-mark">OLD</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-[var(--text-primary)]">{player.name}</span>
                  <span className="micro-label mt-0.5 block">
                    {existing ? "Autorizzato Golden" : "Non autorizzato"}
                  </span>
                </span>
                {existing ? (
                  <button type="button" className="danger-action px-3" onClick={() => revokeAccess(existing)}>
                    Revoca {player.name}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="secondary-action px-3"
                    disabled={!accessOpen}
                    onClick={() => authorizeClassicPlayer(player)}
                  >
                    {accessOpen ? `Autorizza ${player.name}` : `Approvazioni chiuse per ${player.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="surface-panel p-4">
        <h2 className="text-lg font-black">Autorizzati Golden</h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">{approved.length} accessi approvati.</p>
        <div className="mt-3 space-y-2">
          {approved.map((access) => (
            <div
              key={access.id}
              data-testid={`approved-access-${access.id}`}
              className="admin-tile flex-wrap items-start sm:flex-nowrap sm:items-center"
            >
              <span className="admin-mark">GP</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-[var(--text-primary)]">{access.displayName}</span>
                <span className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                      access.paid
                        ? "border-[rgba(0,255,136,0.34)] bg-[rgba(0,255,136,0.09)] text-[var(--correct)]"
                        : "border-[rgba(255,215,0,0.3)] bg-[rgba(255,215,0,0.08)] text-[var(--gold)]"
                    }`}
                  >
                    {access.paid ? "Pagato" : "Da pagare"}
                  </span>
                  <span className="micro-label">{access.type}</span>
                </span>
              </span>
              <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className={access.paid ? "secondary-action px-3 text-xs" : "primary-action px-3"}
                  onClick={() => setAccessPaid(access, !access.paid)}
                >
                  {access.paid ? `Annulla pagamento ${access.displayName}` : `Segna pagato ${access.displayName}`}
                </button>
                <button type="button" className="danger-action px-3" onClick={() => revokeAccess(access)}>
                  Revoca {access.displayName}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
