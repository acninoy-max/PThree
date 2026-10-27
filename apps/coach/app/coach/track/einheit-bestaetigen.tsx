"use client";

import { useState, useTransition } from "react";
import { IconCheck } from "@/app/icons";
import { useT } from "@/app/i18n/client";
import { confirmSessionAction } from "./actions";

/**
 * Knopf „Einheit bestätigen" bzw. das Häkchen danach (0033).
 *
 * Zwei Tipps, weil Bestätigen nicht rückgängig zu machen ist: Danach ist
 * die Einheit gesperrt und gilt als Grundlage einer Rechnung.
 */
export function EinheitBestaetigen({
  sessionId,
  clientId,
  confirmedAt,
}: {
  sessionId: string;
  clientId: string;
  confirmedAt: string | null;
}) {
  const t = useT();
  const R = t.coach.track;
  const [bestaetigt, setBestaetigt] = useState<string | null>(confirmedAt);
  const [sicher, setSicher] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (bestaetigt) {
    return (
      <span className="pt-bestaetigt">
        <IconCheck size={13} strokeWidth={2.6} />
        {R.confirmedOn(t.fmt.dateMedium(new Date(bestaetigt)))}
      </span>
    );
  }

  function klick() {
    if (!sicher) {
      setSicher(true);
      return;
    }
    setError(null);
    start(async () => {
      const res = await confirmSessionAction(sessionId, clientId);
      if (!res.ok) {
        setError(res.error);
        setSicher(false);
        return;
      }
      setBestaetigt(res.confirmedAt);
    });
  }

  return (
    <span style={{ display: "inline-grid", gap: 4 }}>
      <button type="button" className="pt-chipbtn" onClick={klick} disabled={pending}>
        {pending ? t.common.savingShort : sicher ? R.confirmSure : R.confirm}
      </button>
      {error && (
        <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-action)" }}>{error}</span>
      )}
    </span>
  );
}
