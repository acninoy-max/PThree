"use client";

import { useMemo, useState } from "react";
import { deltaLabel } from "@ptfive/coach-engine";
import { dayMonthNumeric } from "@/app/format";

export interface SeriesPoint {
  /** YYYY-MM-DD. */
  on: string;
  value: number;
}

export interface Series {
  key: string;
  label: string;
  unit: string;
  color: string;
  points: SeriesPoint[];
}

export type RangeKey = "1m" | "3m" | "all";

const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "1m", label: "1 Monat", days: 31 },
  { key: "3m", label: "3 Monate", days: 92 },
  { key: "all", label: "Alles", days: null },
];

const W = 320;
const H = 130;
const PAD = { top: 10, right: 6, bottom: 18, left: 6 };

/**
 * Beschriftungen am rechten Rand auseinanderschieben.
 *
 * Zwei Reihen können im sichtbaren Zeitraum auf fast derselben Höhe
 * enden — dann läge eine Zahl auf der anderen und beide wären unlesbar.
 * Von oben nach unten durchgehen und jede, die zu dicht sitzt, nach
 * unten drücken. Die Zuordnung zur Linie bleibt erhalten, weil die
 * Beschriftung die Farbe ihrer Reihe trägt.
 */
function entzerren(
  labels: { key: string; y: number; text: string; color: string }[],
  min: number,
  unten: number,
): typeof labels {
  const sortiert = [...labels].sort((a, b) => a.y - b.y);
  for (let i = 1; i < sortiert.length; i++) {
    const vor = sortiert[i - 1]!;
    const jetzt = sortiert[i]!;
    if (jetzt.y - vor.y < min) jetzt.y = vor.y + min;
  }

  // Unten angekommen: den Stapel wieder nach oben schieben, sonst
  // rutscht die letzte Zahl aus dem Bild.
  const ueberstand = (sortiert[sortiert.length - 1]?.y ?? 0) - unten;
  if (ueberstand > 0) for (const l of sortiert) l.y -= ueberstand;

  return sortiert;
}

/**
 * Mehrreihiges Liniendiagramm als reines SVG.
 *
 * Keine Diagramm-Bibliothek: Es sind Linien und Punkte, und jede
 * Bibliothek dafür wöge mehr als der ganze Rest der Athleten-App.
 *
 * Jede Reihe wird auf ihre EIGENE Spanne skaliert. Gewicht in
 * Kilogramm und Taille in Zentimetern liegen sonst so weit
 * auseinander, dass eine der beiden Kurven eine flache Linie wäre.
 * Die Achse trägt deshalb bewusst keine Zahlen — die stehen in der
 * Liste darunter.
 */
export function MetricChart({
  series,
  emptyHint,
}: {
  series: Series[];
  emptyHint: string;
}) {
  const withData = useMemo(
    () => series.filter((s) => s.points.length > 0),
    [series],
  );

  const [range, setRange] = useState<RangeKey>("3m");
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const cutoff = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)?.days ?? null;
    if (days === null) return null;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }, [range]);

  const shown = useMemo(
    () =>
      withData
        .filter((s) => !hidden.has(s.key))
        .map((s) => ({
          ...s,
          points: cutoff ? s.points.filter((p) => p.on >= cutoff) : s.points,
        }))
        .filter((s) => s.points.length > 0),
    [withData, hidden, cutoff],
  );

  // Gemeinsame Zeitachse über alle sichtbaren Reihen.
  const times = shown.flatMap((s) => s.points.map((p) => Date.parse(p.on)));
  const tMin = times.length > 0 ? Math.min(...times) : 0;
  const tMax = times.length > 0 ? Math.max(...times) : 1;
  const tSpan = tMax - tMin || 1;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  /**
   * Die Veränderung je Reihe, bezogen auf den GEWÄHLTEN Zeitraum.
   *
   * Nicht auf die gesamte Historie: Wer „1 Monat" antippt und dann
   * „−15 kg" liest, meint damit den Monat. Eine Zahl, die etwas anderes
   * misst als das, was im Bild steht, ist schlimmer als keine Zahl.
   * Deshalb hängt sie an `shown` und ändert sich mit dem Umschalter.
   *
   * Höchstens drei Reihen bekommen eine Zahl. Bei vier oder mehr wird
   * der rechte Rand zur Liste, und das war der ausdrückliche Wunsch:
   * sauber, nicht verwirrend. Die Chips darunter tragen die Zahl
   * weiterhin für jede Reihe.
   */
  const deltas = useMemo(() => {
    if (shown.length === 0 || shown.length > 3) return [];

    const roh = shown.flatMap((s) => {
      if (s.points.length < 2) return [];
      const erster = s.points[0]!;
      const letzter = s.points[s.points.length - 1]!;
      const delta = letzter.value - erster.value;

      const values = s.points.map((p) => p.value);
      const vMin = Math.min(...values);
      const vMax = Math.max(...values);
      const vSpan = vMax - vMin || 1;
      const flat = vMax === vMin;
      const y = flat
        ? PAD.top + innerH / 2
        : PAD.top + innerH - ((letzter.value - vMin) / vSpan) * innerH;

      return [
        {
          key: s.key,
          // Knapp über dem letzten Punkt, nicht darauf.
          y: Math.min(Math.max(y - 7, PAD.top + 8), PAD.top + innerH),
          text: deltaLabel(delta, s.unit),
          color: s.color,
        },
      ];
    });

    return entzerren(roh, 11, PAD.top + innerH);
  }, [shown, innerH]);

  /** Dieselben Zahlen für die Chips — dort auch bei vielen Reihen. */
  const deltaJeReihe = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of shown) {
      if (s.points.length < 2) continue;
      const delta =
        s.points[s.points.length - 1]!.value - s.points[0]!.value;
      m.set(s.key, deltaLabel(delta, s.unit));
    }
    return m;
  }, [shown]);

  /** Erster Tag im Zeitraum — Bezug für die Zahl, ausgeschrieben. */
  const seit = times.length > 0 ? dayMonthNumeric(new Date(tMin)) : null;

  function toggle(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (withData.length === 0) {
    return (
      <p
        style={{
          margin: 0,
          fontSize: "var(--pt-fs-base)",
          color: "var(--g-dim, var(--pt-text-dim))",
          lineHeight: 1.55,
        }}
      >
        {emptyHint}
      </p>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            className="mc-range"
            data-active={range === r.key}
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label={`Verlauf von ${shown.map((s) => s.label).join(", ")}`}
      >
        {/* Zwei Hilfslinien, damit die Fläche nicht leer wirkt. */}
        {[0.25, 0.75].map((f) => (
          <line
            key={f}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + innerH * f}
            y2={PAD.top + innerH * f}
            stroke="currentColor"
            strokeWidth={1}
            opacity={0.1}
          />
        ))}

        {shown.map((s) => {
          const values = s.points.map((p) => p.value);
          const vMin = Math.min(...values);
          const vMax = Math.max(...values);
          // Eine einzelne Messung hätte keine Spanne — dann in die Mitte.
          const vSpan = vMax - vMin || 1;
          const flat = vMax === vMin;

          const coords = s.points.map((p) => {
            const x = PAD.left + ((Date.parse(p.on) - tMin) / tSpan) * innerW;
            const y = flat
              ? PAD.top + innerH / 2
              : PAD.top + innerH - ((p.value - vMin) / vSpan) * innerH;
            return { x, y };
          });

          const d = coords
            .map(
              (c, i) =>
                `${i === 0 ? "M" : "L"}${c.x.toFixed(1)} ${c.y.toFixed(1)}`,
            )
            .join(" ");

          return (
            <g key={s.key}>
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} />
              {coords.map((c, i) => (
                <circle key={i} cx={c.x} cy={c.y} r={2.6} fill={s.color} />
              ))}
              {/* Der erste Punkt im Zeitraum ist der Bezug der Zahl rechts.
                  Hohl gezeichnet, damit sichtbar ist, wo gemessen wird. */}
              {deltas.length > 0 && coords.length > 1 && coords[0] && (
                <circle
                  cx={coords[0].x}
                  cy={coords[0].y}
                  r={3.4}
                  fill="var(--g-surface, var(--pt-surface, #ffffff))"
                  stroke={s.color}
                  strokeWidth={1.6}
                />
              )}
            </g>
          );
        })}

        {/*
          Die Veränderung, klein an der Linie.
          ---------------------------------------------------------------
          Bewusst ohne Grün und Rot. −15 kg auf der Waage ist ein Erfolg,
          −15 kg beim Bankdrücken das Gegenteil, und beides steht auf
          derselben Seite. Eine Farbe, die einmal „gut" und einmal
          „schlecht" bedeutet, ist schlimmer als keine. Das Vorzeichen
          sagt, was passiert ist; ob das gut war, weiß der Mensch davor.

          Die Zahl trägt die Farbe ihrer Reihe — das ordnet sie zu, ohne
          zu bewerten.
        */}
        {deltas.map((l) => (
          <text
            key={l.key}
            x={W - PAD.right}
            y={l.y}
            fontSize={9.5}
            fontWeight={700}
            textAnchor="end"
            fill={l.color}
            /* Heller Saum, damit die Zahl auch dort lesbar bleibt, wo sie
               über einer Linie liegt. */
            stroke="var(--g-surface, var(--pt-surface, #ffffff))"
            strokeWidth={3}
            paintOrder="stroke"
            strokeLinejoin="round"
          >
            {l.text}
          </text>
        ))}

        {times.length > 0 && (
          <>
            <text
              x={PAD.left}
              y={H - 4}
              fontSize={9}
              fill="currentColor"
              opacity={0.55}
            >
              {dayMonthNumeric(new Date(tMin))}
            </text>
            <text
              x={W - PAD.right}
              y={H - 4}
              fontSize={9}
              textAnchor="end"
              fill="currentColor"
              opacity={0.55}
            >
              {dayMonthNumeric(new Date(tMax))}
            </text>
          </>
        )}
      </svg>

      {/* Kurven an- und abschalten. Jede Reihe hat ihre eigene Skala,
          deshalb steht der aktuelle Wert direkt am Chip — und dahinter,
          eine Spur leiser, die Veränderung im gewählten Zeitraum. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
        {withData.map((s) => {
          const off = hidden.has(s.key);
          const latest = s.points[s.points.length - 1];
          const delta = off ? undefined : deltaJeReihe.get(s.key);
          return (
            <button
              key={s.key}
              type="button"
              className="mc-chip"
              data-off={off}
              style={off ? undefined : { borderColor: s.color, color: s.color }}
              onClick={() => toggle(s.key)}
              aria-pressed={!off}
            >
              <span
                className="mc-chip__dot"
                style={{ background: off ? "currentColor" : s.color }}
                aria-hidden
              />
              {s.label}
              {latest && (
                <span style={{ fontWeight: 700 }}>
                  {" "}
                  {latest.value.toFixed(1).replace(".", ",")} {s.unit}
                </span>
              )}
              {delta && (
                <span className="mc-chip__delta">
                  {delta}
                  {seit && (
                    <span className="mc-chip__since"> seit {seit}</span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
