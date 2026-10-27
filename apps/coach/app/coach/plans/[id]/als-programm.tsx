"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { IconX } from "@/app/icons";
import { useT } from "@/app/i18n/client";
import { planToProgramAction } from "@/app/coach/training/actions";

/**
 * „Save as program": den Plan eines Klienten als Programm speichern.
 *
 * Wunsch aus dem Test (20.10.): Ein Trainer baut einen Plan für einen
 * Klienten, merkt, dass er gut ist, und will ihn für die nächsten
 * wiederverwenden — ohne alles neu einzutippen.
 *
 * Der Vorschlag nimmt den Vornamen vorn weg: Aus „Aaron Full Body 2×"
 * (so benennt das Zuweisen) wird wieder „Full Body 2×".
 */
export function AlsProgrammSpeichern({
  planId,
  planName,
  clientName,
  onClose,
}: {
  planId: string;
  planName: string;
  clientName: string;
  onClose: () => void;
}) {
  const t = useT();
  const E = t.coach.editor;
  const router = useRouter();
  const [pending, start] = useTransition();
  const vorname = clientName.trim().split(/\s+/)[0] ?? "";
  const [name, setName] = useState(
    // Ohne Groß/Klein-Unterschied: „lisa Fullbody" ist derselbe Vorname.
    vorname && planName.toLowerCase().startsWith(`${vorname.toLowerCase()} `)
      ? planName.slice(vorname.length + 1)
      : planName,
  );
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await planToProgramAction(planId, name);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/coach/training/programs/${res.id}`);
    });
  }

  return (
    <div
      className="pt-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={E.saveAsProgram}
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
            {E.saveAsProgram}
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
          {E.saveAsProgramIntro}
        </p>
        <div style={{ display: "grid", gap: 14 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span className="pt-label">{E.programName}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required autoFocus />
          </label>
          {error && (
            <p style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-action)" }}>
              {error}
            </p>
          )}
          <button type="submit" className="pt-btn" disabled={pending || name.trim() === ""}>
            {pending ? E.savingAsProgram : E.saveAsProgram}
          </button>
        </div>
      </form>
    </div>
  );
}
