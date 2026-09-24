"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Appointment } from "@ptfive/types";
import {
  IconAlert,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconPin,
  IconPlus,
  IconX,
} from "@/app/icons";
import {
  deleteAppointmentAction,
  setAppointmentStatusAction,
} from "@/app/actions";
import { Avatar } from "@/app/components";
import { NewAppointment } from "./form";
import {
  dayMonthLong,
  dayMonthNumeric,
  monthYear,
  time,
  weekdayShort,
} from "@/app/format";

export interface ClientOption {
  id: string;
  name: string;
  status: "active" | "paused" | "archived";
}

export type ScheduleView = "week" | "month";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** Ortsdatum als YYYY-MM-DD — toISOString() würde in die UTC-Zone rutschen. */
function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const LOCATION: Record<Appointment["location"], string> = {
  gym: "Studio",
  park: "Park",
  home: "Zuhause",
  online: "Online",
};

const STATUS_STYLE: Record<
  Appointment["status"],
  { label: string; bg: string; fg: string; dim?: boolean }
> = {
  scheduled: { label: "Geplant", bg: "#f1efe9", fg: "#6e6a60" },
  completed: { label: "Stattgefunden", bg: "#eff3ec", fg: "#3b6d11" },
  rescheduled: { label: "Verschoben", bg: "#f1efe9", fg: "#6e6a60", dim: true },
  cancelled: { label: "Abgesagt", bg: "#f1efe9", fg: "#8c877a", dim: true },
  no_show: { label: "No-Show", bg: "#fbefea", fg: "#c42d1a" },
};

export function ScheduleBoard({
  view,
  rangeStartISO,
  rangeEndISO,
  monthISO,
  offset,
  appointments,
  unresolved,
  clients,
}: {
  view: ScheduleView;
  /** Erster Tag des Rasters (Montag). */
  rangeStartISO: string;
  /** Erster Tag *nach* dem Raster. */
  rangeEndISO: string;
  /** Erster des angezeigten Monats — nur in der Monatsansicht. */
  monthISO?: string;
  offset: number;
  appointments: Appointment[];
  unresolved: Appointment[];
  clients: ClientOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [prefillDay, setPrefillDay] = useState<string | null>(null);

  const rangeStart = new Date(rangeStartISO);
  const rangeEnd = new Date(rangeEndISO);
  const anchorMonth = monthISO ? new Date(monthISO).getMonth() : -1;

  const byId = new Map(clients.map((c) => [c.id, c.name]));
  const today = new Date().toDateString();

  const dayCount = Math.round(
    (rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000,
  );
  const days = Array.from({ length: dayCount }, (_, i) => {
    const d = new Date(rangeStart);
    d.setDate(rangeStart.getDate() + i);
    return d;
  });

  const lastDay = days[days.length - 1] ?? rangeStart;
  const title =
    view === "month" && monthISO
      ? monthYear(new Date(monthISO))
      : `${dayMonthLong(rangeStart)} – ${dayMonthLong(lastDay)}`;

  const step = (delta: number) =>
    `/coach/schedule?v=${view}&o=${offset + delta}`;

  /** Termine eines Tages, aufsteigend nach Uhrzeit. */
  function apptsOn(day: Date): Appointment[] {
    const key = day.toDateString();
    return appointments
      .filter((a) => new Date(a.startsAt).toDateString() === key)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  function openCreate(iso: string | null) {
    setPrefillDay(iso);
    setCreating(true);
  }

  function setStatus(id: string, status: Appointment["status"]) {
    startTransition(async () => {
      await setAppointmentStatusAction(id, status);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteAppointmentAction(id);
      router.refresh();
    });
  }

  return (
    <main className="pt-shell">
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p className="pt-label" style={{ margin: 0 }}>
            Kalender
          </p>
          <h1
            style={{
              margin: "2px 0 0",
              fontSize: "var(--pt-fs-3xl)",
              fontWeight: 600,
              textTransform: view === "month" ? "capitalize" : "none",
            }}
          >
            {title}
          </h1>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {/* Woche oder Monat — die Ansicht bleibt in der Adresse,
              damit ein Lesezeichen dort landet, wo man aufgehört hat. */}
          <div style={{ display: "flex", gap: 4, marginRight: 4 }}>
            <Link
              href="/coach/schedule?v=week&o=0"
              className="pt-toggle"
              data-active={view === "week"}
            >
              Woche
            </Link>
            <Link
              href="/coach/schedule?v=month&o=0"
              className="pt-toggle"
              data-active={view === "month"}
            >
              Monat
            </Link>
          </div>

          <Link
            href={step(-1)}
            className="pt-iconbtn"
            aria-label={
              view === "month" ? "Vorheriger Monat" : "Vorherige Woche"
            }
          >
            <IconChevronLeft />
          </Link>
          {offset !== 0 && (
            <Link
              href={`/coach/schedule?v=${view}&o=0`}
              className="pt-btn pt-btn--ghost"
            >
              Heute
            </Link>
          )}
          <Link
            href={step(1)}
            className="pt-iconbtn"
            aria-label={view === "month" ? "Nächster Monat" : "Nächste Woche"}
          >
            <IconChevronRight />
          </Link>
          <button
            type="button"
            className="pt-btn"
            onClick={() => openCreate(null)}
          >
            <IconPlus size={17} />
            Termin
          </button>
        </div>
      </div>

      {/* Offene Vergangenheit — die No-Show-Daten sind später die Basis der
          Abrechnung, deshalb hier prominent statt versteckt. */}
      {unresolved.length > 0 && (
        <div
          className="pt-card"
          style={{
            marginBottom: 20,
            borderLeft: "3px solid var(--pt-action)",
            borderRadius: "0 12px 12px 0",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
              color: "var(--pt-action)",
            }}
          >
            <IconAlert size={17} />
            <span style={{ fontWeight: 500, fontSize: "var(--pt-fs-md)" }}>
              {unresolved.length} vergangene{" "}
              {unresolved.length === 1 ? "Termin" : "Termine"} ohne Status
            </span>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {unresolved.slice(0, 5).map((a) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <Avatar name={byId.get(a.clientId) ?? "?"} size={26} />
                <span style={{ fontSize: "var(--pt-fs-base)", fontWeight: 500 }}>
                  {byId.get(a.clientId) ?? "Unbekannt"}
                </span>
                <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
                  {dayMonthNumeric(new Date(a.startsAt))} ·{" "}
                  {time(new Date(a.startsAt))}
                </span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className="pt-chipbtn pt-chipbtn--good"
                    disabled={pending}
                    onClick={() => setStatus(a.id, "completed")}
                  >
                    <IconCheck size={14} /> Stattgefunden
                  </button>
                  <button
                    type="button"
                    className="pt-chipbtn pt-chipbtn--bad"
                    disabled={pending}
                    onClick={() => setStatus(a.id, "no_show")}
                  >
                    <IconX size={14} /> No-Show
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wochenraster */}
      {view === "week" && (
        <div className="pt-week">
          {days.map((day) => {
            const dayAppts = apptsOn(day);
            const isToday = day.toDateString() === today;
            const iso = localISO(day);

            return (
              <div key={iso} className="pt-daycol" data-today={isToday}>
                <div className="pt-daycol__head">
                  <span style={{ fontWeight: 600, fontSize: "var(--pt-fs-sm)" }}>
                    {weekdayShort(day)}
                  </span>
                  <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
                    {dayMonthNumeric(day)}
                  </span>
                </div>

                <div style={{ display: "grid", gap: 6, minHeight: 44 }}>
                  {dayAppts.map((a) => {
                    const s = STATUS_STYLE[a.status];
                    return (
                      <div
                        key={a.id}
                        className="pt-appt"
                        style={{ opacity: s.dim ? 0.55 : 1 }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            justifyContent: "space-between",
                            gap: 6,
                          }}
                        >
                          <strong style={{ fontSize: "var(--pt-fs-base)", fontWeight: 600 }}>
                            {time(new Date(a.startsAt))}
                          </strong>
                          <span
                            style={{
                              fontSize: "var(--pt-fs-xs)",
                              color: "var(--pt-text-dim)",
                            }}
                          >
                            {a.durationMinutes}′
                          </span>
                        </div>
                        <p
                          style={{
                            margin: "3px 0 0",
                            fontSize: "var(--pt-fs-sm)",
                            fontWeight: 500,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {byId.get(a.clientId) ?? "Unbekannt"}
                        </p>
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: "var(--pt-fs-xs)",
                            color: "var(--pt-text-dim)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <IconPin size={12} />
                          {LOCATION[a.location]}
                        </p>

                        {a.status !== "scheduled" && (
                          <span
                            style={{
                              display: "inline-block",
                              marginTop: 6,
                              background: s.bg,
                              color: s.fg,
                              fontSize: "var(--pt-fs-xs)",
                              fontWeight: 600,
                              padding: "2px 7px",
                              borderRadius: 999,
                            }}
                          >
                            {s.label}
                          </span>
                        )}

                        <div className="pt-appt__actions">
                          <button
                            type="button"
                            title="Stattgefunden"
                            aria-label="Als stattgefunden markieren"
                            disabled={pending}
                            onClick={() => setStatus(a.id, "completed")}
                          >
                            <IconCheck size={13} />
                          </button>
                          <button
                            type="button"
                            title="No-Show"
                            aria-label="Als No-Show markieren"
                            disabled={pending}
                            onClick={() => setStatus(a.id, "no_show")}
                          >
                            <IconAlert size={13} />
                          </button>
                          <button
                            type="button"
                            title="Löschen"
                            aria-label="Termin löschen"
                            disabled={pending}
                            onClick={() => remove(a.id)}
                          >
                            <IconX size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="pt-daycol__add"
                  onClick={() => openCreate(iso)}
                  aria-label={`Termin am ${dayMonthNumeric(day)} anlegen`}
                >
                  <IconPlus size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Monatsraster — Überblick statt Bearbeitung. Ein Klick auf einen Tag
          legt dort einen Termin an, ein Klick auf einen Termin führt zum
          Klienten. Status ändern bleibt der Wochenansicht vorbehalten. */}
      {view === "month" && (
        <div className="pt-month-scroll">
          <div className="pt-month">
            {WEEKDAYS.map((w) => (
              <div key={w} className="pt-month__head">
                {w}
              </div>
            ))}

            {days.map((day) => {
              const dayAppts = apptsOn(day);
              const isToday = day.toDateString() === today;
              const outside = day.getMonth() !== anchorMonth;
              const iso = localISO(day);
              const shown = dayAppts.slice(0, 3);

              return (
                <div
                  key={iso}
                  className="pt-monthcell"
                  data-today={isToday}
                  data-outside={outside}
                  style={{ opacity: outside ? 0.45 : 1 }}
                >
                  {/* Die Klickfläche liegt *hinter* dem Inhalt, damit die
                      Termin-Links normale Links bleiben. Ein Button um
                      Links herum wäre ungültiges HTML. */}
                  <button
                    type="button"
                    className="pt-monthcell__hit"
                    onClick={() => openCreate(iso)}
                    aria-label={`Termin am ${dayMonthNumeric(day)} anlegen`}
                  />

                  <span className="pt-monthcell__num">{day.getDate()}</span>

                  {shown.map((a) => {
                    const s = STATUS_STYLE[a.status];
                    return (
                      <Link
                        key={a.id}
                        href={`/coach/clients/${a.clientId}`}
                        className="pt-mchip"
                        style={{ opacity: s.dim ? 0.55 : 1 }}
                        title={`${time(new Date(a.startsAt))} · ${
                          byId.get(a.clientId) ?? "Unbekannt"
                        } · ${LOCATION[a.location]} · ${s.label}`}
                      >
                        <span
                          className="pt-mchip__dot"
                          style={{ background: s.fg }}
                          aria-hidden
                        />
                        <strong style={{ fontWeight: 600 }}>
                          {time(new Date(a.startsAt))}
                        </strong>
                        <span className="pt-mchip__name">
                          {byId.get(a.clientId) ?? "Unbekannt"}
                        </span>
                      </Link>
                    );
                  })}

                  {dayAppts.length > shown.length && (
                    <span className="pt-monthcell__more">
                      +{dayAppts.length - shown.length} weitere
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {appointments.length === 0 && (
        <p
          style={{
            margin: "18px 0 0",
            fontSize: "var(--pt-fs-base)",
            color: "var(--pt-text-dim)",
            textAlign: "center",
          }}
        >
          {view === "month"
            ? "In diesem Monat ist noch nichts geplant. Ein Klick auf einen Tag legt dort einen Termin an."
            : "Diese Woche ist noch nichts geplant. Über das Plus in einer Spalte legst du direkt für den Tag an."}
        </p>
      )}

      {creating && (
        <NewAppointment
          clients={clients}
          prefillDate={prefillDay}
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}
    </main>
  );
}
