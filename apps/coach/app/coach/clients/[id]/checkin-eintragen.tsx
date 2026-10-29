"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CheckInFields } from "@ptfive/db";
import { IconX } from "@/app/icons";
import { useT } from "@/app/i18n/client";
import { activeMeasures, type MeasureKey } from "@/app/athlete/checkin/measurements";
import { saveCoachCheckInAction, type CoachCheckInInput } from "@/app/actions";
import { montagVon, plusTage, tagISO, zeitpunkt } from "@/app/zone";

const SPALTE: Record<MeasureKey, keyof CoachCheckInInput["measures"]> = {
  shoulders: "shoulders_cm",
  chest: "chest_cm",
  waist: "waist_cm",
  arm: "arm_cm",
  thigh: "thigh_cm",
};

/**
 * Check-in dieser Woche durch den Trainer (0034, Meeting 27.10.).
 *
 * Für Personal-Training-Klienten der Normalfall: Gewicht und Maße nimmt
 * der Trainer im Studio. Was der Klient diese Woche schon selbst
 * angegeben hat, überschreibt das nicht — der Trainer ergänzt nur, was
 * fehlt (Regel im Trigger, hier nur erklärt).
 */
export function CheckInEintragen({
  clientId,
  fields,
}: {
  clientId: string;
  fields: CheckInFields;
}) {
  const t = useT();
  const E = t.coach.checkinEntry;
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [hinweis, setHinweis] = useState<string | null>(null);

  // Erst beim Öffnen gesetzt: „heute" nach der Uhr des Browsers würde
  // beim Server-Rendern anders lauten (Hydration).
  const [datum, setDatum] = useState("");
  const [gewicht, setGewicht] = useState("");
  const [skalen, setSkalen] = useState<{ energy: number | null; sleep: number | null; stress: number | null }>({
    energy: null,
    sleep: null,
    stress: null,
  });
  const masse = activeMeasures(fields).length > 0 ? activeMeasures(fields) : (["waist"] as MeasureKey[]);
  const [werte, setWerte] = useState<Partial<Record<MeasureKey, string>>>({});

  const zahl = (s: string) => {
    const n = Number(s.trim().replace(",", "."));
    return s.trim() === "" || !Number.isFinite(n) ? null : n;
  };

  function speichern() {
    setError(null);
    setHinweis(null);
    const measures: CoachCheckInInput["measures"] = {};
    for (const k of masse) {
      const n = zahl(werte[k] ?? "");
      if (n !== null) measures[SPALTE[k]] = Math.round(n * 10) / 10;
    }
    start(async () => {
      const res = await saveCoachCheckInAction(clientId, {
        datum,
        weightKg: zahl(gewicht),
        energy: skalen.energy,
        sleep: skalen.sleep,
        stress: skalen.stress,
        measures,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.kept > 0) {
        setHinweis(E.kept(res.kept));
        router.refresh();
        return;
      }
      setOffen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDatum(tagISO(new Date()));
          setOffen(true);
        }}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          fontSize: "var(--pt-fs-base)",
          color: "var(--pt-action)",
          fontWeight: 500,
        }}
      >
        {E.open}
      </button>

      {offen && (
        <div
          className="pt-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={E.title}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOffen(false);
          }}
        >
          <div className="pt-sheet">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: "var(--pt-fs-xl)", fontWeight: 600 }}>{E.title}</h2>
              <button type="button" className="pt-iconbtn" onClick={() => setOffen(false)} aria-label={t.common.close}>
                <IconX size={17} />
              </button>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: "var(--pt-fs-base)", color: "var(--pt-text-dim)", lineHeight: 1.5 }}>
              {E.intro}
            </p>

            <div style={{ display: "grid", gap: 16 }}>
              {/* Nachtragen (29.10.): Messtag wählen, eingetragen wird in
                  dessen Woche. Ein Eintrag je Woche, wie beim Klienten. */}
              <label style={{ display: "grid", gap: 6, justifyItems: "start" }}>
                <span className="pt-label">{E.date}</span>
                <input
                  type="date"
                  className="pt-datefield"
                  value={datum}
                  max={tagISO(new Date())}
                  onChange={(e) => setDatum(e.target.value)}
                  required
                />
                {datum && (
                  <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
                    {E.weekOf(
                      t.fmt.dayMonthLong(zeitpunkt(montagVon(datum), "12:00")),
                      t.fmt.dayMonthLong(zeitpunkt(plusTage(montagVon(datum), 6), "12:00")),
                    )}
                  </span>
                )}
              </label>

              <label style={{ display: "grid", gap: 6, justifyItems: "start" }}>
                <span className="pt-label">{E.weight}</span>
                <input
                  className="pt-datefield"
                  inputMode="decimal"
                  value={gewicht}
                  onChange={(e) => setGewicht(e.target.value)}
                  placeholder="80,5"
                />
              </label>

              {(["energy", "sleep", "stress"] as const).map((k) => (
                <div key={k}>
                  <span className="pt-label" style={{ display: "block", marginBottom: 6 }}>
                    {E.scale[k]}
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className="pt-toggle"
                        data-active={skalen[k] === n}
                        // Nochmal tippen hebt die Wahl auf.
                        onClick={() => setSkalen((s) => ({ ...s, [k]: s[k] === n ? null : n }))}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <span className="pt-label" style={{ display: "block", marginBottom: 6 }}>
                  {E.measures}
                </span>
                <div className="pt-cols">
                  {masse.map((k) => (
                    <label key={k} style={{ display: "grid", gap: 4 }}>
                      <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
                        {`${t.labels.measure[k].label} (cm)`}
                      </span>
                      <input
                        inputMode="decimal"
                        value={werte[k] ?? ""}
                        onChange={(e) => setWerte((w) => ({ ...w, [k]: e.target.value }))}
                      />
                    </label>
                  ))}
                </div>
              </div>

              {hinweis && (
                <p style={{ margin: 0, fontSize: "var(--pt-fs-base)", lineHeight: 1.45 }}>{hinweis}</p>
              )}
              {error && (
                <p style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-action)" }}>{error}</p>
              )}

              <button type="button" className="pt-btn" onClick={speichern} disabled={pending || !datum}>
                {pending ? t.common.saving : t.common.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
