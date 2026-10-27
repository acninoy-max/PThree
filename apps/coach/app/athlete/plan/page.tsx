import Link from "next/link";
import { Fragment } from "react";
import { fetchExercises, fetchPlans, fetchSessions } from "@ptfive/db";
import { createServerSupabase } from "@/lib/supabase-server";
import { muscleLabel, restLabel, supersetCodes } from "@/app/components";
import { IconCheck, IconClock } from "@/app/icons";
import { buildWeek, estimateMinutes, flexibleDays } from "@/app/plan-week";
import { getLocale, getT } from "@/app/i18n/server";
import type { Dict } from "@/app/i18n";
import { TrainingsHistorie } from "./history";

export const dynamic = "force-dynamic";

/**
 * Zwei Reiter: die Woche nach Plan und der Verlauf. Über die Adresse
 * (?v=history), damit „Zurück" funktioniert und der Server rendert.
 */
function Reiter({ t, aktiv }: { t: Dict; aktiv: "week" | "history" }) {
  const p = t.athlete.plan;
  return (
    <nav className="gym-seg" aria-label={p.tabsAria}>
      <Link href="/athlete/plan" data-active={aktiv === "week"}>
        {p.tabWeek}
      </Link>
      <Link href="/athlete/plan?v=history" data-active={aktiv === "history"}>
        {p.tabHistory}
      </Link>
    </nav>
  );
}

export default async function AthletePlanPage({
  searchParams,
}: {
  searchParams: { v?: string };
}) {
  const t = getT();
  const p = t.athlete.plan;
  const db = createServerSupabase();
  const verlauf = searchParams.v === "history";
  const [plans, sessions, exercises] = await Promise.all([
    fetchPlans(db),
    // Für den Verlauf ein Jahr, für die Woche reicht ein Monat.
    fetchSessions(db, { sinceDays: verlauf ? 365 : 30 }),
    fetchExercises(db, getLocale()),
  ]);

  const aktive = plans.filter((pl) => pl.isActive);
  const archiv = plans.filter((pl) => !pl.isActive).slice(0, 5);
  const planNamen = aktive.length > 0 ? aktive.map((pl) => pl.name).join(", ") : null;

  if (verlauf) {
    const names = new Map([...exercises.values()].map((e) => [e.id, e.name]));
    return (
      <main className="gym-shell" style={{ paddingTop: 26 }}>
        <p className="gym-label">{planNamen ?? p.yourPlan}</p>
        <h1 style={{ margin: "3px 0 14px", fontSize: "var(--pt-fs-3xl)", fontWeight: 700 }}>
          {p.historyTitle}
        </h1>
        <Reiter t={t} aktiv="history" />
        <TrainingsHistorie t={t} sessions={sessions} names={names} />
      </main>
    );
  }

  // Alle aktiven Pläne zusammen (Meeting 27.10.: mehrere erlaubt). Die
  // Woche zählt Einheiten aus allen, die Liste zeigt Tag für Tag.
  const days = aktive.flatMap((pl) => pl.days.filter((d) => d.slots.length > 0));
  const mehrerePlaene = aktive.filter((pl) => pl.days.some((d) => d.slots.length > 0)).length > 1;
  const planName = new Map(aktive.map((pl) => [pl.id, pl.name]));
  const week = buildWeek(days, sessions);
  const flexible = flexibleDays(days);

  if (days.length === 0) {
    return (
      <main className="gym-shell" style={{ paddingTop: 26 }}>
        <p className="gym-label">{p.yourPlan}</p>
        <h1 style={{ margin: "3px 0 14px", fontSize: "var(--pt-fs-3xl)", fontWeight: 700 }}>
          {p.noPlan}
        </h1>
        <Reiter t={t} aktiv="week" />
        <div className="gym-card">
          <p style={{ margin: 0, fontSize: "var(--pt-fs-md)", lineHeight: 1.6 }}>
            {p.noPlanBody}
          </p>
          <Link
            href="/athlete/log"
            className="gym-btn gym-btn--ghost"
            style={{ marginTop: 14 }}
          >
            {p.freeTraining}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="gym-shell" style={{ paddingTop: 26 }}>
      <p className="gym-label">{planNamen}</p>
      <h1 style={{ margin: "3px 0 14px", fontSize: "var(--pt-fs-3xl)", fontWeight: 700 }}>
        {p.yourWeek}
      </h1>
      <Reiter t={t} aktiv="week" />

      {/* Wochenleiste. Erledigt zählt nach Wochentag, nicht nach Plantag —
          wer Tag B am Dienstag macht, war trotzdem im Studio. */}
      <div className="gym-week" style={{ marginBottom: 8 }}>
        {week.map((slot, i) => {
          const done = slot.doneDayIds.length > 0 || slot.freeSessions > 0;
          const planned = slot.days.length > 0;
          return (
            <div
              key={slot.weekday}
              className="gym-weekday"
              data-today={slot.isToday}
              data-planned={planned}
              data-done={done}
            >
              <span className="gym-weekday__name">{t.time.weekdayShort[i]}</span>
              <span className="gym-weekday__mark" aria-hidden>
                {done ? (
                  <IconCheck size={15} strokeWidth={2.6} />
                ) : planned ? (
                  "•"
                ) : (
                  ""
                )}
              </span>
            </div>
          );
        })}
      </div>

      <p
        style={{
          margin: "0 0 24px",
          fontSize: "var(--pt-fs-sm)",
          color: "var(--g-dim)",
          lineHeight: 1.5,
        }}
      >
        {p.sessionsThisWeek(
          week.filter((s) => s.doneDayIds.length > 0 || s.freeSessions > 0)
            .length,
          week.filter((s) => s.days.length > 0).length || days.length,
        )}
      </p>

      {/* Alle Trainingstage als lesbare Liste. */}
      <div style={{ display: "grid", gap: 12 }}>
        {days.map((day, i) => {
          const codes = supersetCodes(day.slots);
          const neuerPlan = mehrerePlaene && days[i - 1]?.planId !== day.planId;
          const minutes = estimateMinutes(day.slots);
          const doneThisWeek = week.some((s) => s.doneDayIds.includes(day.id));

          return (
            <Fragment key={day.id}>
            {neuerPlan && (
              <p className="gym-label" style={{ margin: i === 0 ? 0 : "6px 0 0" }}>
                {planName.get(day.planId)}
              </p>
            )}
            <div className="gym-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <p style={{ margin: 0, fontSize: "var(--pt-fs-input)", fontWeight: 700 }}>
                  {day.title}
                </p>
                {doneThisWeek && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: "var(--pt-fs-sm)",
                      fontWeight: 700,
                      color: "#2f5a0e",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <IconCheck size={13} strokeWidth={2.6} />
                    {p.thisWeek}
                  </span>
                )}
              </div>

              <p
                style={{
                  margin: "4px 0 12px",
                  fontSize: "var(--pt-fs-sm)",
                  color: "var(--g-dim)",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "2px 8px",
                }}
              >
                <span>
                  {day.weekdays.length === 0
                    ? t.common.noFixedDay
                    : day.weekdays.map((w) => t.time.weekdayShort[w - 1]).join(" + ")}
                </span>
                <span>·</span>
                <span>{day.isGuided ? t.common.guided : t.common.alone}</span>
                <span>·</span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <IconClock size={13} />
                  {t.time.duration(minutes)}
                </span>
              </p>

              <div style={{ display: "grid", gap: 7 }}>
                {day.slots.map((slot) => {
                  const code = codes.get(slot.id);
                  const exercise = slot.defaultExerciseId
                    ? exercises.get(slot.defaultExerciseId)
                    : undefined;
                  return (
                    <div
                      key={slot.id}
                      style={{
                        display: "flex",
                        gap: 9,
                        paddingTop: 7,
                        borderTop: "1px solid var(--g-border)",
                      }}
                    >
                      {code && <span className="gym-code">{code}</span>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{ margin: 0, fontSize: "var(--pt-fs-md)", fontWeight: 600 }}
                        >
                          {exercise?.name ?? slot.label}
                        </p>
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: "var(--pt-fs-sm)",
                            color: "var(--g-dim)",
                            lineHeight: 1.45,
                          }}
                        >
                          {muscleLabel(t, slot.muscleGroup)}
                          {slot.tempo ? ` · ${t.common.tempo} ${slot.tempo}` : ""}
                          {slot.restSeconds !== null
                            ? ` · ${t.common.rest} ${restLabel(slot.restSeconds)}`
                            : ""}
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: "var(--pt-fs-base)",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {slot.targetSets} × {slot.targetRepsMin}
                        {slot.targetRepsMin !== slot.targetRepsMax &&
                          `–${slot.targetRepsMax}`}
                      </span>
                    </div>
                  );
                })}
              </div>

              <Link
                href={`/athlete/log?day=${day.id}`}
                className="gym-btn"
                style={{ marginTop: 14, textDecoration: "none" }}
              >
                {t.athlete.home.startDay(day.title)}
              </Link>
            </div>
            </Fragment>
          );
        })}
      </div>

      {/* Archiv: stillgelegte Pläne, weiter einsehbar und startbar
          (Meeting 27.10.). Starten führt in die Trainingsmaske. */}
      {archiv.length > 0 && (
        <details className="gym-card gym-verlauf" style={{ marginTop: 16 }}>
          <summary className="gym-label">{p.archive}</summary>
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {archiv.map((pl) => (
              <div key={pl.id}>
                <p style={{ margin: 0, fontSize: "var(--pt-fs-md)", fontWeight: 600 }}>{pl.name}</p>
                <div style={{ display: "grid", gap: 4, marginTop: 4 }}>
                  {pl.days
                    .filter((d) => d.slots.length > 0)
                    .map((d) => (
                      <Link
                        key={d.id}
                        href={`/athlete/log?day=${d.id}`}
                        style={{ fontSize: "var(--pt-fs-md)", color: "var(--g-accent)" }}
                      >
                        {d.title}
                      </Link>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {flexible.length > 0 && flexible.length < days.length && (
        <p
          style={{
            margin: "16px 0 0",
            fontSize: "var(--pt-fs-sm)",
            color: "var(--g-dim)",
            lineHeight: 1.5,
          }}
        >
          {p.flexibleHint}
        </p>
      )}
    </main>
  );
}
