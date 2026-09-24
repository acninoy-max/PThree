"use client";

import { useState, useTransition } from "react";
import { createAppointmentAction } from "@/app/actions";
import { IconX } from "@/app/icons";
import type { ClientOption } from "./board";

const WEEKDAYS = [
  { n: 1, label: "Mo" },
  { n: 2, label: "Di" },
  { n: 3, label: "Mi" },
  { n: 4, label: "Do" },
  { n: 5, label: "Fr" },
  { n: 6, label: "Sa" },
  { n: 7, label: "So" },
];

const DURATIONS = [30, 45, 60, 75, 90];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function NewAppointment({
  clients,
  prefillDate,
  prefillClientId,
  onClose,
  onDone,
}: {
  clients: ClientOption[];
  prefillDate?: string | null;
  prefillClientId?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const selectable = clients.filter((c) => c.status !== "archived");

  const [clientId, setClientId] = useState(
    prefillClientId ?? selectable[0]?.id ?? "",
  );
  const [date, setDate] = useState(prefillDate ?? todayISO());
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState<"gym" | "park" | "home" | "online">(
    "gym",
  );
  const [locationNote, setLocationNote] = useState("");
  const [notes, setNotes] = useState("");
  const [repeat, setRepeat] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [weeks, setWeeks] = useState(8);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleWeekday(n: number) {
    setWeekdays((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort(),
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!clientId) {
      setError("Bitte einen Klienten wählen.");
      return;
    }
    if (repeat && weekdays.length === 0) {
      setError("Bitte mindestens einen Wochentag wählen.");
      return;
    }

    startTransition(async () => {
      const res = await createAppointmentAction({
        clientId,
        startsAtLocal: `${date}T${time}`,
        durationMinutes: duration,
        location,
        locationNote,
        notes,
        repeatWeekdays: repeat ? weekdays : [],
        repeatWeeks: weeks,
      });
      if (res.ok) onDone();
      else setError(res.error);
    });
  }

  const count = repeat ? weekdays.length * weeks : 1;

  return (
    <div
      className="pt-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Termin anlegen"
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
            Termin anlegen
          </h2>
          <button
            type="button"
            className="pt-iconbtn"
            onClick={onClose}
            aria-label="Schließen"
          >
            <IconX />
          </button>
        </div>

        {selectable.length === 0 ? (
          <p style={{ margin: 0, fontSize: "var(--pt-fs-md)", color: "var(--pt-text-dim)" }}>
            Du hast noch keine aktiven Klienten. Leg erst einen an.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="pt-label">Klient</span>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                {selectable.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.status === "paused" ? " (pausiert)" : ""}
                  </option>
                ))}
              </select>
            </label>

            {/* Datum und Uhrzeit nebeneinander, unter 380px
                untereinander — zwei Datumsfelder in halber
                Handybreite sind nicht bedienbar. */}
            <div className="pt-cols">
              <label style={{ display: "grid", gap: 6 }}>
                <span className="pt-label">Datum</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="pt-label">Uhrzeit</span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </label>
            </div>

            <div>
              <span
                className="pt-label"
                style={{ display: "block", marginBottom: 7 }}
              >
                Dauer
              </span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className="pt-toggle"
                    data-active={duration === d}
                    onClick={() => setDuration(d)}
                  >
                    {d} Min
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span
                className="pt-label"
                style={{ display: "block", marginBottom: 7 }}
              >
                Ort
              </span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(
                  [
                    ["gym", "Studio"],
                    ["park", "Park"],
                    ["home", "Zuhause"],
                    ["online", "Online"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className="pt-toggle"
                    data-active={location === value}
                    onClick={() => setLocation(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                value={locationNote}
                onChange={(e) => setLocationNote(e.target.value)}
                placeholder="Genauer Ort, optional — z. B. Trainmore Oost"
                style={{ marginTop: 8 }}
              />
            </div>

            {/* Serie */}
            <div
              style={{
                borderTop: "1px solid var(--pt-border)",
                paddingTop: 14,
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={repeat}
                  onChange={(e) => setRepeat(e.target.checked)}
                  style={{ width: 17, height: 17, minHeight: 0, padding: 0 }}
                />
                <span style={{ fontSize: "var(--pt-fs-md)", fontWeight: 500 }}>
                  Wöchentlich wiederholen
                </span>
              </label>

              {repeat && (
                <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {WEEKDAYS.map(({ n, label }) => (
                      <button
                        key={n}
                        type="button"
                        className="pt-toggle pt-toggle--day"
                        data-active={weekdays.includes(n)}
                        onClick={() => toggleWeekday(n)}
                        aria-pressed={weekdays.includes(n)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span className="pt-label">Über wie viele Wochen</span>
                    <select
                      value={weeks}
                      onChange={(e) => setWeeks(Number(e.target.value))}
                    >
                      {[4, 8, 12, 16, 26].map((w) => (
                        <option key={w} value={w}>
                          {w} Wochen
                        </option>
                      ))}
                    </select>
                  </label>

                  <p
                    style={{
                      margin: 0,
                      fontSize: "var(--pt-fs-sm)",
                      color: "var(--pt-text-dim)",
                      lineHeight: 1.5,
                    }}
                  >
                    Legt {count} einzelne Termine an. Jeder lässt sich später
                    getrennt verschieben oder absagen.
                  </p>
                </div>
              )}
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              <span className="pt-label">Notiz</span>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional — z. B. Fokus Rücken, Schulter schonen"
              />
            </label>

            {error && (
              <p style={{ margin: 0, color: "var(--pt-action)", fontSize: "var(--pt-fs-base)" }}>
                {error}
              </p>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="pt-btn" disabled={pending}>
                {pending
                  ? "Legt an …"
                  : count > 1
                    ? `${count} Termine anlegen`
                    : "Termin anlegen"}
              </button>
              <button
                type="button"
                className="pt-btn pt-btn--ghost"
                onClick={onClose}
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
