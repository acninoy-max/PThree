"use client";

import { useState } from "react";
import { exerciseChange } from "@ptfive/coach-engine";
import { IconPlus } from "@/app/icons";
import { MetricChart } from "@/app/metric-chart";
import { ExercisePicker, type PickerExercise } from "./exercise-picker";
import { useT } from "@/app/i18n/client";
import {
  METRICS,
  exerciseSeries,
  type ExerciseMetric,
} from "@/app/exercise-series";

/**
 * Farben der Übungskurven.
 *
 * Alle gegen Sand und Weiß auf mindestens 3:1 gerechnet — Linien fallen
 * unter den Nicht-Text-Kontrast nach WCAG 1.4.11. Jede Reihe trägt
 * zusätzlich ihren Namen; Farbe allein trägt keine Information.
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

export interface Curve {
  id: string;
  name: string;
  points: {
    performedAt: string;
    score: number;
    volumeKg: number;
    reps: number;
    isRepsOnly: boolean;
  }[];
  /** Punkte, die auf der alten Skala liegen und aus dem Vergleich fallen. */
  verworfen: number;
}

export function ProgressExercises({
  curves,
  all,
  selected,
  hasSessions,
}: {
  curves: Curve[];
  all: PickerExercise[];
  selected: string[];
  hasSessions: boolean;
}) {
  const t = useT();
  const p = t.athlete.progress;
  const [picking, setPicking] = useState(false);
  const [metric, setMetric] = useState<ExerciseMetric>("best");

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <p className="gym-label" style={{ margin: 0 }}>
          {p.yourExercises}
        </p>
        {all.length > 0 && (
          <button
            type="button"
            className="gym-btn gym-btn--ghost"
            onClick={() => setPicking(true)}
            style={{
              width: "auto",
              minHeight: 38,
              padding: "0 12px",
              fontSize: "var(--pt-fs-base)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <IconPlus size={14} />
            {p.choose}
          </button>
        )}
      </div>

      {!hasSessions ? (
        <div className="gym-card">
          <p style={{ margin: 0, fontSize: "var(--pt-fs-lg)", fontWeight: 600 }}>
            {p.nothingYet}
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: "var(--pt-fs-md)",
              color: "var(--g-dim)",
              lineHeight: 1.55,
            }}
          >
            {p.nothingYetBody}
          </p>
        </div>
      ) : curves.length === 0 ? (
        <div className="gym-card">
          <p style={{ margin: 0, fontSize: "var(--pt-fs-lg)", fontWeight: 600 }}>
            {p.noneChosen}
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: "var(--pt-fs-md)",
              color: "var(--g-dim)",
              lineHeight: 1.55,
            }}
          >
            {p.noneChosenBody}
          </p>
        </div>
      ) : (
        <div className="gym-card" style={{ marginBottom: 12 }}>
          {/* Zwei Fragen, zwei Kurven: „wie stark bin ich geworden" und
              „wie viel Arbeit habe ich gemacht". Nie beide zugleich —
              das Volumen liegt um zwei Größenordnungen höher. */}
          <div
            style={{ display: "flex", gap: 6, marginBottom: 12 }}
            role="group"
            aria-label={p.curveShows}
          >
            {METRICS.map((m) => (
              <button
                key={m}
                type="button"
                className="mc-range"
                data-active={metric === m}
                aria-pressed={metric === m}
                onClick={() => setMetric(m)}
              >
                {t.chart.metrics[m]}
              </button>
            ))}
          </div>

          <MetricChart
            series={exerciseSeries(t, curves, metric, COLORS)}
            emptyHint={p.noSessionsForThese}
          />

          <p
            style={{
              margin: "10px 0 0",
              fontSize: "var(--pt-fs-sm)",
              color: "var(--g-dim)",
              lineHeight: 1.45,
            }}
          >
            {t.chart.metricHint[metric]}
          </p>

          <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
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
                    {/* Die Zahl zuerst, das Prozent dahinter: „+17,5 kg"
                        ist die Antwort, „+14 %" die Einordnung. */}
                    {change && change.percent !== null && (
                      <span
                        style={{
                          fontSize: "var(--pt-fs-lg)",
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t.fmt.signed(change.delta)} {t.engine.units[change.unit]}
                        <span
                          style={{ fontWeight: 500, color: "var(--g-dim)" }}
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
                      color: "var(--g-dim)",
                      lineHeight: 1.45,
                    }}
                  >
                    {p.curveMeta(
                      c.points.length,
                      t.fmt.dateMedium(new Date(letzter.performedAt)),
                    )}
                    {letzter.isRepsOnly && p.countedInReps}
                    {/*
                      Ehrlich benannt statt versteckt: Wer erst ab einem
                      bestimmten Tag sein Gewicht meldet, bekommt für seine
                      Klimmzüge rückwirkend eine Last. Die Punkte davor sind
                      Wiederholungen und gehören nicht in dieselbe Linie.
                    */}
                    {c.verworfen > 0 && p.otherScale(c.verworfen)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {picking && (
        <ExercisePicker
          exercises={all}
          selected={selected}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  );
}
