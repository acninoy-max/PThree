"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { IconX } from "@/app/icons";
import { useT } from "@/app/i18n/client";
import { dayISO } from "@/app/plan-week";
import { assignProgramAction } from "../../actions";

export interface ClientPick {
  id: string;
  name: string;
}

/**
 * Programm einem Klienten zuweisen.
 *
 * Kopiert über `assign_template` (0028) — der Klient bekommt einen
 * eigenen Plan, den man danach für ihn anpassen kann, ohne das Programm
 * zu ändern. Danach geht es in die Akte des Klienten, wo der neue Plan
 * steht.
 */
export function AssignDialog({
  programId,
  programName,
  clients,
  onClose,
}: {
  programId: string;
  programName: string;
  clients: ClientPick[];
  onClose: () => void;
}) {
  const t = useT();
  const P = t.coach.programs;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  // Startdatum nach der Uhr des Trainers — der Dialog wird erst beim
  // Klick gemountet, läuft also im Browser.
  const [startsOn, setStartsOn] = useState(dayISO(new Date()));
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await assignProgramAction({ programId, clientId, startsOn });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/coach/clients/${clientId}`);
    });
  }

  return (
    <div
      className="pt-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={P.assignTitle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form onSubmit={submit} className="pt-sheet">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "var(--pt-fs-xl)", fontWeight: 600 }}>
            {P.assignTitle}
          </h2>
          <button type="button" className="pt-iconbtn" onClick={onClose} aria-label={t.common.close}>
            <IconX size={17} />
          </button>
        </div>
        <p
          style={{
            margin: "0 0 16px",
            fontSize: "var(--pt-fs-base)",
            color: "var(--pt-text-dim)",
            lineHeight: 1.5,
          }}
        >
          {P.assignIntro(programName)}
        </p>

        {clients.length === 0 ? (
          <p style={{ margin: 0, fontSize: "var(--pt-fs-md)", color: "var(--pt-text-dim)" }}>
            {P.noClients}
          </p>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="pt-label">{P.client}</span>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: 6, justifyItems: "start" }}>
              <span className="pt-label">{P.startsOn}</span>
              <input
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
                required
              />
            </label>
            {error && (
              <p style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-action)" }}>
                {error}
              </p>
            )}
            <button type="submit" className="pt-btn" disabled={pending || clientId === ""}>
              {pending ? P.assigning : P.assignConfirm}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
