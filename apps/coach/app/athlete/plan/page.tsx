import Link from "next/link";
import { fetchActivePlan, fetchExercises, fetchSessions } from "@ptfive/db";
import { createServerSupabase } from "@/lib/supabase-server";
import { muscleLabel, restLabel, supersetCodes } from "@/app/components";
import { IconCheck, IconClock } from "@/app/icons";
import {
  WEEKDAY_SHORT,
  buildWeek,
  durationLabel,
  estimateMinutes,
  flexibleDays,
} from "@/app/plan-week";

export const dynamic = "force-dynamic";

export default async function AthletePlanPage() {
  const db = createServerSupabase();
  const [plan, sessions, exercises] = await Promise.all([
    fetchActivePlan(db),
    fetchSessions(db, { sinceDays: 30 }),
    fetchExercises(db),
  ]);

  const days = (plan?.days ?? []).filter((d) => d.slots.length > 0);
  const week = buildWeek(days, sessions);
  const flexible = flexibleDays(days);

  if (!plan || days.length === 0) {
    return (
      <main className="gym-shell" style={{ paddingTop: 26 }}>
        <p className="gym-label">Dein Plan</p>
        <h1 style={{ margin: "3px 0 20px", fontSize: "var(--pt-fs-3xl)", fontWeight: 700 }}>
          Noch kein Plan
        </h1>
        <div className="gym-card">
          <p style={{ margin: 0, fontSize: "var(--pt-fs-md)", lineHeight: 1.6 }}>
            Dein Coach hat noch keinen Trainingsplan hinterlegt. Bis dahin
            kannst du frei trainieren — deine Einheiten zählen trotzdem.
          </p>
          <Link
            href="/athlete/log"
            className="gym-btn gym-btn--ghost"
            style={{ marginTop: 14 }}
          >
            Freies Training
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="gym-shell" style={{ paddingTop: 26 }}>
      <p className="gym-label">{plan.name}</p>
      <h1 style={{ margin: "3px 0 18px", fontSize: "var(--pt-fs-3xl)", fontWeight: 700 }}>
        Deine Woche
      </h1>

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
              <span className="gym-weekday__name">{WEEKDAY_SHORT[i]}</span>
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
        {
          week.filter((s) => s.doneDayIds.length > 0 || s.freeSessions > 0)
            .length
        }{" "}
        von {week.filter((s) => s.days.length > 0).length || days.length}{" "}
        Einheiten diese Woche
      </p>

      {/* Alle Trainingstage als lesbare Liste. */}
      <div style={{ display: "grid", gap: 12 }}>
        {days.map((day) => {
          const codes = supersetCodes(day.slots);
          const minutes = estimateMinutes(day.slots);
          const doneThisWeek = week.some((s) => s.doneDayIds.includes(day.id));

          return (
            <div key={day.id} className="gym-card">
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
                    diese Woche
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
                    ? "ohne festen Tag"
                    : day.weekdays.map((w) => WEEKDAY_SHORT[w - 1]).join(" + ")}
                </span>
                <span>·</span>
                <span>{day.isGuided ? "mit Trainer" : "allein"}</span>
                <span>·</span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <IconClock size={13} />
                  {durationLabel(minutes)}
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
                          {muscleLabel(slot.muscleGroup)}
                          {slot.tempo ? ` · Tempo ${slot.tempo}` : ""}
                          {slot.restSeconds !== null
                            ? ` · Pause ${restLabel(slot.restSeconds)}`
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
                {day.title} starten
              </Link>
            </div>
          );
        })}
      </div>

      {flexible.length > 0 && flexible.length < days.length && (
        <p
          style={{
            margin: "16px 0 0",
            fontSize: "var(--pt-fs-sm)",
            color: "var(--g-dim)",
            lineHeight: 1.5,
          }}
        >
          Tage ohne festen Wochentag machst du, wann es passt — sie tauchen in
          der Leiste oben nicht auf.
        </p>
      )}
    </main>
  );
}
