"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/app/i18n/client";
import { holeSpeicher, ladeEntwurf } from "@/app/training-entwurf";

/**
 * Hinweis auf „Heute", solange ein Training nicht beendet ist.
 *
 * Wer mitten im Training auf „Heute" tippt, soll nicht glauben, die
 * Sätze seien weg. Erst nach dem Laden sichtbar (Effekt) — der Server
 * kennt den Zwischenspeicher nicht.
 */
export function EntwurfHinweis({ entwurfKey }: { entwurfKey: string }) {
  const t = useT();
  const [da, setDa] = useState(false);

  useEffect(() => {
    setDa(ladeEntwurf(holeSpeicher(), entwurfKey, Date.now()) !== null);
  }, [entwurfKey]);

  if (!da) return null;
  return (
    <Link
      href="/athlete/log"
      className="gym-card"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 12,
        borderColor: "var(--g-accent)",
      }}
    >
      <span style={{ fontSize: "var(--pt-fs-md)", fontWeight: 700 }}>{t.draft.banner}</span>
      <span style={{ fontSize: "var(--pt-fs-md)", fontWeight: 700, color: "var(--g-accent)", whiteSpace: "nowrap" }}>
        {t.draft.continue}
      </span>
    </Link>
  );
}
