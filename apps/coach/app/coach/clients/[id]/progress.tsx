"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deltaLabel, exerciseChange } from "@ptfive/coach-engine";
import { IconCheck, IconPlus, IconX } from "@/app/icons";
import { Spinner } from "@/app/spinner";
import { toast } from "@/app/toast";
import { MetricChart } from "@/app/metric-chart";
import { setCoachProgressSelectionAction } from "@/app/coach/plans/actions";
import { dateMedium } from "@/app/format";
import {
  METRICS,
  exerciseSeries,
  metricHint,
  type ExerciseMetric,
} from "@/app/exercise-series";

/**
 * Farben der Kurven — dieselben wie beim Athleten, damit Trainer und
 * Klient über dasselbe Bild reden. Alle gegen Sand und Weiß auf
 * mindestens 3:1 gerechnet.
 */
const COLORS = [
  "#c42d1a",
  "#1d4ed8",
  "#3b6d11",
  "#8a5a00",
  "#6b21a8",
  "#0f766e",
  "#9d174d",
  "#3f3f46",
];

const MAX = 8;

export interface CoachCurve {
  id: string;
  name: string;
  points: {
    performedAt: string;
    score: number;
    volumeKg: number;
    reps: number;
    isRepsOnly: boolean;
  }[];
  verworfen: number;
}

export interface CoachPickerExercise {
  id: string;
  name: string;
  muscleLabel: string;
  sets: number;
  lastPerformedAt: string;
}

/**
 * Fortschritt pro Übung in der Klientenakte.
 *
 * Eigene Auswahl des Trainers, nicht die des Athleten. Der Athlet schaut
 * auf seine Entwicklung, der Trainer auf die Stellen, an denen er
 * nachsteuern will — dieselbe Liste für beide wäre ein Übergriff in
 * beide Richtungen.
 */
export function ClientProgress({
  clientId,
  clientName,
  curves,
  all,
  selected,
}: {
  clientId: string;
  clientName: string;
  curves: CoachCurve[];
  all: CoachPickerExercise[];
  selected: string[];
}) {
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [pick, setPick] = useState<string[]>(selected);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [metric, setMetric] = useState<ExerciseMetric>("best");

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term === "") return all;
    return all.filter((e) => e.name.toLowerCase().includes(term));
  }, [all, search]);

  function toggle(id: string) {
    setError(null);
    setPick((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX) {
        setError(`Mehr als ${MAX} Kurven kann man nicht mehr lesen.`);
        return prev;
      }
      return [...prev, id];
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await setCoachProgressSelectionAction(clientId, pick);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast("Übungen übernommen");
      router.refresh();
      setPicking(false);
    });
  }

  return (
    <div style={{ marginTop: 26 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <p className="pt-label" style={{ margin: 0 }}>
          Fortschritt pro Übung
        </p>
        {all.length > 0 && (
          <button
            type="button"
            className="pt-btn pt-btn--ghost"
            onClick={() => {
              setPick(selected);
              setPicking(true);
            }}
            style={{
              width: "auto",
              minHeight: 34,
              padding: "0 11px",
              fontSize: "var(--pt-fs-sm)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <IconPlus size={13} />
            Übungen wählen
          </button>
        )}
      </div>

      {curves.length === 0 ? (
        <div className="pt-card">
          <p style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-text-dim)" }}>
            {all.length === 0
              ? `${clientName} hat noch nichts geloggt.`
              : "Keine Übung gewählt — tipp oben auf „Übungen wählen“."}
          </p>
        </div>
      ) : (
        <div className="pt-card">
          {/* Bestleistung oder Volumen — nie beides zugleich. Die zweite
              Zahl liegt um zwei Größenordnungen höher; nebeneinander
              wäre eine der Kurven eine flache Linie am Rand. */}
          <div
            style={{ display: "flex", gap: 6, marginBottom: 10 }}
            role="group"
            aria-label="Was die Kurve zeigt"
          >
            {METRICS.map((m) => (
              <button
                key={m.key}
                type="button"
                className="mc-range"
                data-active={metric === m.key}
                aria-pressed={metric === m.key}
                onClick={() => setMetric(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <MetricChart
            series={exerciseSeries(curves, metric, COLORS)}
            emptyHint="Noch keine Einheiten für diese Übungen."
          />

          <p
            style={{
              margin: "10px 0 0",
              fontSize: "var(--pt-fs-sm)",
              color: "var(--pt-text-dim)",
              lineHeight: 1.45,
            }}
          >
            {metricHint(metric)}
          </p>

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {curves.map((c) => {
              const letzter = c.points[c.points.length - 1]!;
              const change = exerciseChange(c.points, metric);
              return (
                <div key={c.id}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: "var(--pt-fs-md)", fontWeight: 600 }}>
                      {c.name}
                    </span>
                    {/* Absolute Veränderung zuerst, Prozent dahinter.
                        „+17,5 kg" beantwortet die Frage, „+14 %" ordnet
                        sie ein — umgekehrt muss man rechnen. */}
                    {change && change.percent !== null && (
                      <span
                        style={{
                          fontSize: "var(--pt-fs-md)",
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {deltaLabel(change.delta, change.unit)}
                        <span
                          style={{
                            fontWeight: 500,
                            color: "var(--pt-text-dim)",
                          }}
                        >
                          {" "}
                          ({change.percent >= 0 ? "+" : "−"}
                          {Math.abs(change.percent)} %)
                        </span>
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "var(--pt-fs-sm)",
                      color: "var(--pt-text-dim)",
                      lineHeight: 1.45,
                    }}
                  >
                    {c.points.length}{" "}
                    {c.points.length === 1 ? "Einheit" : "Einheiten"} · zuletzt{" "}
                    {dateMedium(new Date(letzter.performedAt))}
                    {letzter.isRepsOnly && " · in Wiederholungen"}
                    {c.verworfen > 0 &&
                      ` · ${c.verworfen} ältere auf anderer Skala`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {picking && (
        <div
          className="pt-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Übungen für den Fortschritt wählen"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPicking(false);
          }}
        >
          <div className="pt-sheet">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 6,
              }}
            >
              <h2 style={{ margin: 0, fontSize: "var(--pt-fs-xl)", fontWeight: 600 }}>
                Übungen von {clientName}
              </h2>
              <button
                type="button"
                className="pt-iconbtn"
                onClick={() => setPicking(false)}
                aria-label="Schließen"
              >
                <IconX size={17} />
              </button>
            </div>

            <p
              style={{
                margin: "0 0 12px",
                fontSize: "var(--pt-fs-sm)",
                color: "var(--pt-text-dim)",
                lineHeight: 1.5,
              }}
            >
              Alles, was {clientName} je getrackt hat. Deine Auswahl gilt nur
              für dich — die Fortschrittsseite deines Klienten bleibt, wie sie
              ist. {pick.length} von höchstens {MAX}.
            </p>

            {all.length > 8 && (
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Suchen"
                aria-label="Übung suchen"
                style={{ marginBottom: 10 }}
              />
            )}

            <div
              style={{
                display: "grid",
                gap: 5,
                maxHeight: "48vh",
                overflowY: "auto",
              }}
            >
              {shown.length === 0 && (
                <p
                  style={{
                    margin: "6px 0",
                    fontSize: "var(--pt-fs-base)",
                    color: "var(--pt-text-dim)",
                  }}
                >
                  Nichts gefunden.
                </p>
              )}
              {shown.map((e) => {
                const on = pick.includes(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    className="pt-pick"
                    data-active={on}
                    aria-pressed={on}
                    onClick={() => toggle(e.id)}
                  >
                    <span className="pt-pick__box" aria-hidden>
                      {on && <IconCheck size={12} strokeWidth={3} />}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 600 }}>
                        {e.name}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: "var(--pt-fs-sm)",
                          color: "var(--pt-text-dim)",
                          marginTop: 1,
                        }}
                      >
                        {e.muscleLabel} · {e.sets}{" "}
                        {e.sets === 1 ? "Satz" : "Sätze"} · zuletzt{" "}
                        {dateMedium(new Date(e.lastPerformedAt))}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {error && (
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: "var(--pt-fs-base)",
                  color: "var(--pt-action)",
                }}
              >
                {error}
              </p>
            )}

            <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
              <button
                type="button"
                className="pt-btn"
                onClick={save}
                disabled={pending}
              >
                {pending ? (
                  <Spinner size={14} label="Speichert" />
                ) : (
                  "Übernehmen"
                )}
              </button>
              <button
                type="button"
                className="pt-btn pt-btn--ghost"
                onClick={() => setPicking(false)}
                disabled={pending}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
