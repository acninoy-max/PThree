"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { ExperienceLevel, Plan } from "@ptfive/types";
import { IconChevronRight, IconPlus, IconX } from "@/app/icons";
import { createPlanAction } from "@/app/coach/plans/actions";
import { dayISO, parseDay, sinceLabel } from "@/app/plan-week";
import { dateMedium } from "@/app/format";

/**
 * Startvorlagen — ein Klick füllt die Tagesliste, die danach frei
 * bearbeitbar bleibt. Ein leeres Formular ist die häufigste Ursache
 * dafür, dass ein Plan nie entsteht; eine feste Auswahl wäre aber
 * genauso falsch, weil jeder Trainer seinen eigenen Split fährt.
 */
const PRESETS: { label: string; hint: string; days: string[] }[] = [
  {
    label: "Ganzkörper 2×",
    hint: "Einstieg, zwei Einheiten pro Woche",
    days: ["Tag A — Ganzkörper", "Tag B — Ganzkörper"],
  },
  {
    label: "Ober / Unter",
    hint: "Klassisch, drei bis vier Einheiten",
    days: ["Tag A — Oberkörper", "Tag B — Unterkörper"],
  },
  {
    label: "Push / Pull",
    hint: "Zwei Tage, drücken und ziehen getrennt",
    days: ["Tag A — Drücken", "Tag B — Ziehen"],
  },
  {
    label: "Push / Pull / Beine",
    hint: "Fortgeschritten, drei bis sechs Einheiten",
    days: ["Tag A — Drücken", "Tag B — Ziehen", "Tag C — Beine"],
  },
  {
    label: "Arnold-Split",
    hint: "Brust und Rücken, Schulter und Arme, Beine",
    days: [
      "Tag A — Brust & Rücken",
      "Tag B — Schultern & Arme",
      "Tag C — Beine",
    ],
  },
  {
    label: "5er-Split",
    hint: "Eine Muskelgruppe pro Tag, hohes Volumen",
    days: [
      "Tag A — Brust",
      "Tag B — Rücken",
      "Tag C — Beine",
      "Tag D — Schultern",
      "Tag E — Arme",
    ],
  },
  {
    label: "Leer",
    hint: "Eigenen Split von Grund auf bauen",
    days: ["Tag A"],
  },
];

const LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "beginner", label: "Einsteiger" },
  { value: "intermediate", label: "Fortgeschritten" },
  { value: "pro", label: "Profi" },
];

/**
 * Vorbelegung des Startdatums: heute, nach der Uhr des Trainers.
 *
 * NewPlan wird erst beim Klick gemountet, also läuft das im Browser und
 * nicht beim Rendern auf dem Server — sonst stünde hier die Zeitzone des
 * Servers statt der des Trainers.
 */
function todayISO(): string {
  return dayISO(new Date());
}

function NewPlan({
  clientId,
  level,
  onClose,
}: {
  clientId: string;
  level: ExperienceLevel;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [preset, setPreset] = useState(1);
  // Die Vorlage füllt diese Liste nur — danach gehört sie dem Trainer.
  const [days, setDays] = useState<string[]>(PRESETS[1]!.days);
  const [name, setName] = useState("");
  const [startsOn, setStartsOn] = useState(todayISO());
  const [planLevel, setPlanLevel] = useState<ExperienceLevel>(level);
  const [error, setError] = useState<string | null>(null);

  function applyPreset(i: number) {
    setPreset(i);
    setDays(PRESETS[i]!.days);
  }

  function setDay(i: number, value: string) {
    setDays((prev) => prev.map((d, j) => (j === i ? value : d)));
  }

  function addDay() {
    // Nächster freier Buchstabe als Vorschlag: Tag A, Tag B, …
    const letter = String.fromCharCode(65 + days.length);
    setDays((prev) => [...prev, `Tag ${letter}`]);
  }

  function removeDay(i: number) {
    setDays((prev) => prev.filter((_, j) => j !== i));
  }

  const filled = days.filter((d) => d.trim() !== "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (filled.length === 0) {
      setError("Mindestens ein Trainingstag ist nötig.");
      return;
    }
    startTransition(async () => {
      const result = await createPlanAction({
        clientId,
        name: name.trim() === "" ? PRESETS[preset]!.label : name,
        level: planLevel,
        startsOn,
        dayTitles: filled,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/coach/plans/${result.id}`);
    });
  }

  return (
    <div
      className="pt-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Trainingsplan anlegen"
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
            marginBottom: 18,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "var(--pt-fs-xl)", fontWeight: 600 }}>
            Trainingsplan anlegen
          </h2>
          <button
            type="button"
            className="pt-iconbtn"
            onClick={onClose}
            aria-label="Schließen"
          >
            <IconX size={17} />
          </button>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <span
              className="pt-label"
              style={{ display: "block", marginBottom: 7 }}
            >
              Vorlage
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  type="button"
                  className="pt-toggle"
                  data-active={preset === i}
                  onClick={() => applyPreset(i)}
                  title={p.hint}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "var(--pt-fs-sm)",
                color: "var(--pt-text-dim)",
                lineHeight: 1.45,
              }}
            >
              {PRESETS[preset]!.hint}. Füllt nur die Liste unten — die kannst du
              danach frei ändern.
            </p>
          </div>

          <div>
            <span
              className="pt-label"
              style={{ display: "block", marginBottom: 7 }}
            >
              Trainingstage
            </span>
            <div style={{ display: "grid", gap: 6 }}>
              {days.map((d, i) => (
                <div key={i} style={{ display: "flex", gap: 6 }}>
                  <input
                    value={d}
                    onChange={(e) => setDay(i, e.target.value)}
                    placeholder={`Tag ${String.fromCharCode(65 + i)}`}
                  />
                  <button
                    type="button"
                    className="pt-iconbtn"
                    onClick={() => removeDay(i)}
                    disabled={days.length === 1}
                    aria-label={`Tag ${i + 1} entfernen`}
                    title="Tag entfernen"
                    style={{ flex: "none" }}
                  >
                    <IconX size={15} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addDay}
              style={{
                marginTop: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "none",
                border: "none",
                padding: 0,
                fontSize: "var(--pt-fs-base)",
                fontWeight: 600,
                color: "var(--pt-action)",
              }}
            >
              <IconPlus size={14} />
              Tag hinzufügen
            </button>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "var(--pt-fs-sm)",
                color: "var(--pt-text-dim)",
                lineHeight: 1.45,
              }}
            >
              Die Übungen füllst du danach im Editor. Tage lassen sich dort
              jederzeit ergänzen und umbenennen.
            </p>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="pt-label">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={PRESETS[preset]!.label}
            />
          </label>

          <div className="pt-cols">
            <label style={{ display: "grid", gap: 6 }}>
              <span className="pt-label">Start</span>
              <input
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
                required
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="pt-label">Niveau</span>
              <select
                value={planLevel}
                onChange={(e) =>
                  setPlanLevel(e.target.value as ExperienceLevel)
                }
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-action)" }}>
              {error}
            </p>
          )}

          <button type="submit" className="pt-btn" disabled={pending}>
            {pending ? "Wird angelegt …" : "Anlegen und Slots füllen"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ClientPlan({
  clientId,
  level,
  active,
  older,
}: {
  clientId: string;
  level: ExperienceLevel;
  active: Plan | null;
  older: Plan[];
}) {
  const [creating, setCreating] = useState(false);

  /**
   * „Heute" erst nach dem Mounten — der Server rendert diese Karte mit
   * seiner Uhr vor, und ein Datum, das sich beim Hydrieren ändert, wäre
   * ein Hydration-Mismatch. Bis dahin fehlt schlicht die Spanne, das
   * Datum selbst steht sofort da.
   */
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);

  const slotCount = active?.days.reduce((n, d) => n + d.slots.length, 0) ?? 0;

  // createdAt ist ein Zeitstempel — für den Vergleich zählt der lokale Tag.
  const createdDay = active ? dayISO(new Date(active.createdAt)) : null;

  return (
    <>
      <div className="pt-card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <p className="pt-label" style={{ margin: 0 }}>
            Trainingsplan
          </p>
          {active && (
            <button
              type="button"
              className="pt-iconbtn"
              title="Neuen Plan anlegen"
              aria-label="Neuen Plan anlegen"
              onClick={() => setCreating(true)}
            >
              <IconPlus size={16} />
            </button>
          )}
        </div>

        {active ? (
          <>
            <Link
              href={`/coach/plans/${active.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                color: "var(--pt-text)",
              }}
            >
              <span style={{ fontSize: "var(--pt-fs-lg)", fontWeight: 600 }}>
                {active.name}
              </span>
              <span style={{ color: "var(--pt-text-dim)", display: "flex" }}>
                <IconChevronRight size={16} />
              </span>
            </Link>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: "var(--pt-fs-sm)",
                color: "var(--pt-text-dim)",
              }}
            >
              ab {dateMedium(parseDay(active.startsOn))}
              {today && ` · ${sinceLabel(active.startsOn, today)}`} ·{" "}
              {active.days.length}{" "}
              {active.days.length === 1 ? "Trainingstag" : "Trainingstage"} ·{" "}
              {slotCount} Slots
            </p>

            {/*
              Startdatum und Anlagedatum sind zwei verschiedene Dinge. Meist
              fallen sie zusammen und dann schweigt die Zeile. Weichen sie ab
              — bewusst, weil der Plan erst nächste Woche greift, oder aus
              Versehen — dann ist genau das die Information, die fehlt.
            */}
            {createdDay && createdDay !== active.startsOn && (
              <p
                style={{
                  margin: "3px 0 0",
                  fontSize: "var(--pt-fs-sm)",
                  color: "var(--pt-text-dim)",
                  opacity: 0.85,
                }}
              >
                Angelegt am {dateMedium(parseDay(createdDay))} — Startdatum im
                Plan änderbar.
              </p>
            )}

            {slotCount === 0 && (
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "var(--pt-fs-sm)",
                  color: "var(--pt-action)",
                  lineHeight: 1.45,
                }}
              >
                Noch keine Slots — der Plan erscheint dem Athleten erst, wenn
                mindestens einer gefüllt ist.
              </p>
            )}

            {older.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: "1px solid var(--pt-border)",
                }}
              >
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: "var(--pt-fs-xs)",
                    fontWeight: 600,
                    color: "var(--pt-text-dim)",
                  }}
                >
                  Frühere Pläne
                </p>
                {older.map((p) => (
                  <Link
                    key={p.id}
                    href={`/coach/plans/${p.id}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      fontSize: "var(--pt-fs-base)",
                      padding: "3px 0",
                      color: "var(--pt-text-dim)",
                    }}
                  >
                    <span>{p.name}</span>
                    <span style={{ whiteSpace: "nowrap" }}>
                      {dateMedium(parseDay(p.startsOn))}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: "var(--pt-fs-base)",
                color: "var(--pt-text-dim)",
                lineHeight: 1.5,
              }}
            >
              Noch kein Plan. Ohne Plan trainiert der Athlet frei — die
              Musterhistorie läuft trotzdem.
            </p>
            <button
              type="button"
              className="pt-btn"
              onClick={() => setCreating(true)}
              style={{ justifyContent: "center" }}
            >
              <IconPlus size={16} />
              Plan anlegen
            </button>
          </>
        )}
      </div>

      {creating && (
        <NewPlan
          clientId={clientId}
          level={level}
          onClose={() => setCreating(false)}
        />
      )}
    </>
  );
}
