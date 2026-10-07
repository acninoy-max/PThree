"use client";

import { useState, useTransition } from "react";
import { createAppointmentAction } from "@/app/actions";
import { IconX } from "@/app/icons";
import type { ClientOption } from "./board";
import { useT } from "@/app/i18n/client";

/** ISO-Wochentage, Montag = 1. Beschriftet über t.time.weekdayShort. */
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
const LOCATIONS = ["gym", "park", "home", "online"] as const;

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
  const t = useT();
  const F = t.coach.apptForm;
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
      setError(F.pickClient);
      return;
    }
    if (repeat && weekdays.length === 0) {
      setError(F.pickWeekday);
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
      aria-label={F.title}
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
            {F.title}
          </h2>
          <button
            type="button"
            className="pt-iconbtn"
            onClick={onClose}
            aria-label={t.common.close}
          >
            <IconX />
          </button>
        </div>

        {selectable.length === 0 ? (
          <p style={{ margin: 0, fontSize: "var(--pt-fs-md)", color: "var(--pt-text-dim)" }}>
            {F.noClients}
          </p>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="pt-label">{F.client}</span>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                {selectable.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.status === "paused" ? F.paused : ""}
                  </option>
                ))}
              </select>
            </label>

            {/* Datum und Uhrzeit nebeneinander, unter 380px
                untereinander — zwei Datumsfelder in halber
                Handybreite sind nicht bedienbar. */}
            <div className="pt-cols">
              <label style={{ display: "grid", gap: 6 }}>
                <span className="pt-label">{F.date}</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="pt-label">{F.time}</span>
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
                {F.duration}
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
                    {F.minutes(d)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span
                className="pt-label"
                style={{ display: "block", marginBottom: 7 }}
              >
                {F.place}
              </span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {LOCATIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="pt-toggle"
                    data-active={location === value}
                    onClick={() => setLocation(value)}
                  >
                    {t.labels.location[value]}
                  </button>
                ))}
              </div>
              <input
                value={locationNote}
                onChange={(e) => setLocationNote(e.target.value)}
                placeholder={F.placePlaceholder}
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
                  {F.repeat}
                </span>
              </label>

              {repeat && (
                <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {WEEKDAYS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        className="pt-toggle pt-toggle--day"
                        data-active={weekdays.includes(n)}
                        onClick={() => toggleWeekday(n)}
                        aria-pressed={weekdays.includes(n)}
                      >
                        {t.time.weekdayShort[n - 1]}
                      </button>
                    ))}
                  </div>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span className="pt-label">{F.forWeeks}</span>
                    <select
                      value={weeks}
                      onChange={(e) => setWeeks(Number(e.target.value))}
                    >
                      {[4, 8, 12, 16, 26].map((w) => (
                        <option key={w} value={w}>
                          {F.weeks(w)}
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
                    {F.seriesHint(count)}
                  </p>
                </div>
              )}
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              <span className="pt-label">{F.note}</span>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={F.notePlaceholder}
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
                  ? F.creating
                  : count > 1
                    ? F.createMany(count)
                    : F.createOne}
              </button>
              <button
                type="button"
                className="pt-btn pt-btn--ghost"
                onClick={onClose}
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
