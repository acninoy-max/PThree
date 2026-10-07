"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { CheckInFields } from "@ptfive/db";
import { activeMeasures, type MeasureKey } from "./measurements";
import { IconCheck } from "@/app/icons";
import { saveCheckInAction } from "../actions";
import { useT } from "@/app/i18n/client";

export interface ExistingCheckIn {
  weightKg: number | null;
  energy: number | null;
  sleep: number | null;
  stress: number | null;
  clientNote: string;
  submittedAt: string | null;
  coachReply: string | null;
  /** Bereits gemeldete Maße, je Schlüssel als Text zum Weiterbearbeiten. */
  measures: Partial<Record<MeasureKey, string>>;
}

/** Endpunkte der Skalen stehen im Wörterbuch. Ohne Worte wäre "3"
 *  nicht interpretierbar. */
type ScaleKey = "energy" | "sleep" | "stress";

function Scale({
  name,
  value,
  onChange,
}: {
  name: ScaleKey;
  value: number | null;
  onChange: (v: number) => void;
}) {
  const t = useT();
  const s = t.athlete.checkin.scales[name];
  return (
    <fieldset style={{ border: "none", padding: 0, margin: "0 0 18px" }}>
      <legend
        style={{
          padding: 0,
          fontSize: "var(--pt-fs-lg)",
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        {s.label}
      </legend>
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className="gym-scale"
            data-active={value === n}
            aria-pressed={value === n}
            aria-label={t.athlete.checkin.scaleAria(s.label, n)}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          fontSize: "var(--pt-fs-sm)",
          color: "var(--g-dim)",
        }}
      >
        <span>1 — {s.low}</span>
        <span>5 — {s.high}</span>
      </div>
    </fieldset>
  );
}

/**
 * Bestätigung nach dem Speichern.
 *
 * Bewusst ein Modal und kein kleiner Hinweis am Rand: Das Check-in ist der
 * eine Moment in der Woche, in dem der Athlet etwas abgibt. Eine klare
 * Quittung ist hier mehr wert als Dezenz.
 */
function SuccessModal({
  correction,
  onClose,
}: {
  correction: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const c = t.athlete.checkin;
  const primary = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    primary.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    // Hintergrund nicht mitscrollen lassen, solange das Modal offen ist.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="gym-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-done-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="gym-modal">
        <div className="gym-modal__mark" aria-hidden>
          <IconCheck size={34} strokeWidth={2.6} />
        </div>

        <h2
          id="checkin-done-title"
          style={{ margin: "18px 0 6px", fontSize: "var(--pt-fs-xl)", fontWeight: 700 }}
        >
          {correction ? c.savedTitle : c.sentTitle}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: "var(--pt-fs-md)",
            color: "var(--g-dim)",
            lineHeight: 1.55,
          }}
        >
          {correction ? c.savedBody : c.sentBody}
        </p>

        <div style={{ display: "grid", gap: 8, marginTop: 22 }}>
          <Link
            ref={primary}
            href="/athlete"
            className="gym-btn"
            style={{ textDecoration: "none" }}
          >
            {c.toHome}
          </Link>
          <button
            type="button"
            className="gym-btn gym-btn--ghost"
            onClick={onClose}
          >
            {c.stayHere}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CheckInForm({
  weekOf,
  fields,
  existing,
  measureWeek,
}: {
  weekOf: string;
  fields: CheckInFields;
  existing: ExistingCheckIn | null | undefined;
  /** Ob diese Woche das Maßband herauskommt. */
  measureWeek: boolean;
}) {
  const t = useT();
  const c = t.athlete.checkin;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"sent" | "updated" | null>(null);

  const [weight, setWeight] = useState(
    existing?.weightKg === null || existing?.weightKg === undefined
      ? ""
      : String(existing.weightKg),
  );
  const [energy, setEnergy] = useState<number | null>(existing?.energy ?? null);
  const [sleep, setSleep] = useState<number | null>(existing?.sleep ?? null);
  const [stress, setStress] = useState<number | null>(existing?.stress ?? null);
  const [note, setNote] = useState(existing?.clientNote ?? "");
  const [measures, setMeasures] = useState<Record<string, string>>(() => ({
    ...(existing?.measures ?? {}),
  }));

  const wanted = activeMeasures(fields);

  const alreadySent = Boolean(existing?.submittedAt);

  function submit() {
    setError(null);
    // Vor dem Speichern merken: danach ist es in jedem Fall abgeschickt.
    const wasCorrection = alreadySent;
    startTransition(async () => {
      const asNumber = (key: MeasureKey) => {
        const raw = (measures[key] ?? "").trim();
        return raw === "" ? null : Number(raw.replace(",", "."));
      };
      const result = await saveCheckInAction({
        weekOf,
        weightKg:
          weight.trim() === "" ? null : Number(weight.replace(",", ".")),
        energy,
        sleep,
        stress,
        clientNote: note,
        shouldersCm: asNumber("shoulders"),
        chestCm: asNumber("chest"),
        waistCm: asNumber("waist"),
        armCm: asNumber("arm"),
        thighCm: asNumber("thigh"),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(wasCorrection ? "updated" : "sent");
      router.refresh();
    });
  }

  return (
    <>
      {/* Antwort des Coaches auf genau diese Woche — steht ganz oben,
          weil sie das Wichtigste auf dieser Seite ist. */}
      {existing?.coachReply && (
        <div
          className="gym-card"
          style={{
            marginBottom: 14,
            borderLeft: "3px solid var(--g-accent)",
            borderRadius: "0 14px 14px 0",
          }}
        >
          <p className="gym-label">{c.coachReply}</p>
          <p style={{ margin: "8px 0 0", fontSize: "var(--pt-fs-lg)", lineHeight: 1.55 }}>
            {existing.coachReply}
          </p>
        </div>
      )}

      <div className="gym-card">
        {alreadySent && (
          <p
            style={{
              margin: "0 0 16px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "var(--pt-fs-base)",
              color: "var(--g-dim)",
            }}
          >
            <IconCheck size={15} />
            {c.alreadySent}
          </p>
        )}

        {fields.askWeight && (
          <label style={{ display: "block", marginBottom: 18 }}>
            <span
              style={{
                display: "block",
                fontSize: "var(--pt-fs-lg)",
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              {t.labels.weight}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="text"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={c.weightPlaceholder}
                style={{ maxWidth: 140 }}
              />
              <span style={{ fontSize: "var(--pt-fs-lg)", color: "var(--g-dim)" }}>kg</span>
            </span>
            <span
              style={{
                display: "block",
                marginTop: 6,
                fontSize: "var(--pt-fs-sm)",
                color: "var(--g-dim)",
              }}
            >
              {c.optional}
            </span>
          </label>
        )}

        {fields.askEnergy && (
          <Scale name="energy" value={energy} onChange={setEnergy} />
        )}
        {fields.askSleep && (
          <Scale name="sleep" value={sleep} onChange={setSleep} />
        )}
        {fields.askStress && (
          <Scale name="stress" value={stress} onChange={setStress} />
        )}

        {/* Maßband — nur in der Messwoche, sonst wäre es jede Woche
            derselbe Aufwand für Werte, die sich kaum ändern. */}
        {measureWeek && wanted.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <p style={{ margin: "0 0 4px", fontSize: "var(--pt-fs-lg)", fontWeight: 600 }}>
              {c.tape}
            </p>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: "var(--pt-fs-sm)",
                color: "var(--g-dim)",
                lineHeight: 1.5,
              }}
            >
              {c.tapeHint(fields.measureEveryWeeks)}
            </p>

            <div style={{ display: "grid", gap: 14 }}>
              {wanted.map((key) => (
                <label key={key} style={{ display: "block" }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: "var(--pt-fs-md)",
                      fontWeight: 600,
                      marginBottom: 2,
                    }}
                  >
                    {t.labels.measure[key].label}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: "var(--pt-fs-sm)",
                      color: "var(--g-dim)",
                      marginBottom: 7,
                      lineHeight: 1.45,
                    }}
                  >
                    {t.labels.measure[key].how}
                  </span>
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      value={measures[key] ?? ""}
                      onChange={(e) =>
                        setMeasures((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      placeholder={c.cmPlaceholder}
                      style={{ maxWidth: 140 }}
                    />
                    <span style={{ fontSize: "var(--pt-fs-lg)", color: "var(--g-dim)" }}>
                      cm
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {fields.askFreeText && (
          <label style={{ display: "block", marginBottom: 18 }}>
            <span
              style={{
                display: "block",
                fontSize: "var(--pt-fs-lg)",
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              {c.noteLabel}
            </span>
            <textarea
              className="gym-textarea"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              placeholder={c.notePlaceholder}
            />
          </label>
        )}

        {error && (
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "var(--pt-fs-md)",
              color: "var(--g-accent)",
            }}
          >
            {error}
          </p>
        )}

        <button
          type="button"
          className="gym-btn"
          onClick={submit}
          disabled={pending}
        >
          {pending
            ? t.common.saving
            : alreadySent
              ? c.saveChange
              : c.send}
        </button>
      </div>

      {done && (
        <SuccessModal
          correction={done === "updated"}
          onClose={() => setDone(null)}
        />
      )}
    </>
  );
}
