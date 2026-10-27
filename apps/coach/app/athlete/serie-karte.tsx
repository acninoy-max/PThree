"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useT } from "@/app/i18n/client";
import { setWeeklyGoalAction } from "./actions";
import type { Serie } from "@/app/serie";

/**
 * Wochenziel und Serie auf „Heute" (Meeting 27.10.2026, Duolingo-Muster).
 *
 * Ohne Ziel fragt die Karte danach — einmal, mit einem Tipp. Mit Ziel
 * zeigt sie die Woche als Punkte und die Serie. Die Zahlen rechnet der
 * Server (app/serie.ts); hier wird nur gezeigt und das Ziel gesetzt.
 */
export function SerieKarte({ serie }: { serie: Serie | null }) {
  const t = useT();
  const S = t.athlete.streak;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [aendern, setAendern] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setzen(ziel: number) {
    setError(null);
    start(async () => {
      const res = await setWeeklyGoalAction(ziel);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setAendern(false);
      router.refresh();
    });
  }

  if (!serie || aendern) {
    return (
      <div className="gym-card" style={{ marginBottom: 12 }}>
        <p className="gym-label">{S.label}</p>
        <p style={{ margin: "6px 0 4px", fontSize: "var(--pt-fs-xl)", fontWeight: 700 }}>
          {S.question}
        </p>
        <p style={{ margin: "0 0 12px", fontSize: "var(--pt-fs-md)", color: "var(--g-dim)", lineHeight: 1.5 }}>
          {S.questionHint}
        </p>
        <div className="gym-wochenwahl">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              type="button"
              className="gym-wochenwahl__knopf"
              data-active={serie?.ziel === n}
              disabled={pending}
              onClick={() => setzen(n)}
            >
              {n}×
            </button>
          ))}
        </div>
        {error && (
          <p style={{ margin: "10px 0 0", fontSize: "var(--pt-fs-sm)", color: "var(--g-accent)" }}>{error}</p>
        )}
      </div>
    );
  }

  const fehlen = Math.max(0, serie.ziel - serie.dieseWoche);
  return (
    <div className="gym-card" style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <p className="gym-label">{S.label}</p>
          <p style={{ margin: "6px 0 0", fontSize: "var(--pt-fs-xl)", fontWeight: 700 }}>
            {S.thisWeek(serie.dieseWoche, serie.ziel)}
          </p>
        </div>
        {serie.wochen > 0 && (
          <span className="gym-flamme" aria-label={S.streakAria(serie.wochen)}>
            🔥 {serie.wochen}
          </span>
        )}
      </div>

      {/* Ein Punkt je Trainingstag des Ziels — voll, wenn erledigt. */}
      <div className="gym-punkte" aria-hidden>
        {Array.from({ length: serie.ziel }, (_, i) => (
          <span key={i} data-voll={i < serie.dieseWoche} />
        ))}
      </div>

      <p style={{ margin: "10px 0 0", fontSize: "var(--pt-fs-md)", color: serie.knapp ? "var(--g-accent)" : "var(--g-dim)", lineHeight: 1.5 }}>
        {serie.geschafft
          ? S.reached(serie.wochen)
          : serie.knapp
            ? S.tight(fehlen)
            : serie.wochen > 0
              ? S.keepGoing(fehlen, serie.wochen)
              : S.start(fehlen)}
      </p>

      <button
        type="button"
        onClick={() => setAendern(true)}
        style={{
          marginTop: 8,
          background: "none",
          border: "none",
          padding: 0,
          fontSize: "var(--pt-fs-sm)",
          color: "var(--g-dim)",
          textDecoration: "underline",
        }}
      >
        {S.change}
      </button>
    </div>
  );
}
