import Link from "next/link";
import {
  fetchActivePlan,
  fetchExercises,
  fetchSessions,
  fetchUpcomingAppointments,
} from "@ptfive/db";
import { createServerSupabase } from "@/lib/supabase-server";
import { muscleLabel } from "@/app/components";
import { estimateMinutes } from "@/app/plan-week";
import { IconChevronRight } from "@/app/icons";
import { getT } from "@/app/i18n/server";

export const dynamic = "force-dynamic";

export default async function AthleteHome() {
  const t = getT();
  const h = t.athlete.home;
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();

  const [{ data: profile }, sessions, appointments, exercises, plan] =
    await Promise.all([
      db.from("profiles").select("full_name").eq("id", user!.id).maybeSingle(),
      fetchSessions(db, { sinceDays: 60 }),
      fetchUpcomingAppointments(db, 14),
      fetchExercises(db),
      fetchActivePlan(db),
    ]);

  // Welcher Plantag als Nächstes dran ist — derselbe Vorschlag wie auf
  // der Logseite, damit die Angabe hier nicht abweicht.
  const planDays = (plan?.days ?? []).filter((d) => d.slots.length > 0);
  let lastPlanDayId: string | null = null;
  for (const s of sessions) if (s.planDayId) lastPlanDayId = s.planDayId;
  const nextDay =
    planDays.length > 0
      ? planDays[
          (planDays.findIndex((d) => d.id === lastPlanDayId) + 1) %
            planDays.length
        ]
      : null;

  const firstName = (profile?.full_name ?? "").split(" ")[0] || h.fallbackName;
  const next = appointments[0];
  const last = sessions[sessions.length - 1];

  const today = new Date();
  const trainedToday =
    last && new Date(last.performedAt).toDateString() === today.toDateString();

  // Offenes Check-in dieser Woche (Montag als Wochenanfang).
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const { data: checkIn } = await db
    .from("check_ins")
    .select("id, submitted_at, coach_reply")
    .eq("week_of", monday.toISOString().slice(0, 10))
    .maybeSingle();

  return (
    <main className="gym-shell" style={{ paddingTop: 26 }}>
      <p className="gym-label">{h.greeting(today.getHours())}</p>
      <h1 style={{ margin: "3px 0 22px", fontSize: "var(--pt-fs-3xl)", fontWeight: 700 }}>
        {firstName}
      </h1>

      {/* Training — beantwortet zwei Fragen: Was war heute, und was kommt
          als Nächstes. Vorher fiel der Plan nach dem ersten Training aus
          der Karte heraus und wirkte, als wäre er verschwunden. */}
      <div className="gym-card" style={{ marginBottom: 12 }}>
        <p className="gym-label">{h.training}</p>

        {trainedToday ? (
          <>
            <p style={{ margin: "8px 0 0", fontSize: "var(--pt-fs-xl)", fontWeight: 700 }}>
              {h.doneToday}
            </p>
            <p
              style={{ margin: "4px 0 0", fontSize: "var(--pt-fs-md)", color: "var(--g-dim)" }}
            >
              {last!.title} · {h.exercises(last!.slots.length)} ·{" "}
              {h.sets(last!.slots.reduce((n, s) => n + s.sets.length, 0))}
            </p>
          </>
        ) : (
          <>
            <p style={{ margin: "8px 0 2px", fontSize: "var(--pt-fs-xl)", fontWeight: 700 }}>
              {nextDay ? nextDay.title : h.nothingYet}
            </p>
            <p style={{ margin: 0, fontSize: "var(--pt-fs-md)", color: "var(--g-dim)" }}>
              {nextDay
                ? `${h.exercises(nextDay.slots.length)} · ${t.time.approx} ${t.time.duration(
                    estimateMinutes(nextDay.slots),
                  )}`
                : h.justStart}
            </p>
          </>
        )}

        {/* Der Plan bleibt sichtbar, auch wenn heute schon trainiert wurde. */}
        {nextDay && trainedToday && (
          <p
            style={{
              margin: "10px 0 0",
              paddingTop: 10,
              borderTop: "1px solid var(--g-border)",
              fontSize: "var(--pt-fs-md)",
            }}
          >
            <span style={{ color: "var(--g-dim)" }}>{h.upNext}</span>
            <strong>{nextDay.title}</strong>
            <span style={{ color: "var(--g-dim)" }}>
              {" "}
              · {t.time.approx} {t.time.duration(estimateMinutes(nextDay.slots))}
            </span>
          </p>
        )}

        <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
          <Link
            href={nextDay ? `/athlete/log?day=${nextDay.id}` : "/athlete/log"}
            className={trainedToday ? "gym-btn gym-btn--ghost" : "gym-btn"}
            style={{ textDecoration: "none" }}
          >
            {trainedToday
              ? h.addMore
              : nextDay
                ? h.startDay(nextDay.title)
                : h.startTraining}
          </Link>
          {plan && (
            <Link
              href="/athlete/plan"
              className="gym-btn gym-btn--ghost"
              style={{ textDecoration: "none" }}
            >
              {h.viewPlan}
            </Link>
          )}
        </div>
      </div>

      {/* Termine — führt auf die volle Übersicht. */}
      <Link
        href="/athlete/schedule"
        className="gym-card gym-card--link"
        style={{ display: "block", marginBottom: 12 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p className="gym-label">
            {appointments.length > 1 ? h.nextAppointments : h.nextAppointment}
          </p>
          <span style={{ color: "var(--g-dim)", display: "flex" }}>
            <IconChevronRight size={16} />
          </span>
        </div>

        {next ? (
          <>
            <p style={{ margin: "8px 0 2px", fontSize: "var(--pt-fs-xl)", fontWeight: 700 }}>
              {t.fmt.weekdayTimeLong(new Date(next.startsAt))}
            </p>
            <p style={{ margin: 0, fontSize: "var(--pt-fs-md)", color: "var(--g-dim)" }}>
              {t.fmt.dateMedium(new Date(next.startsAt))} · {next.durationMinutes}{" "}
              {t.time.minutes} · {t.labels.location[next.location] ?? next.location}
              {next.locationNote ? ` · ${next.locationNote}` : ""}
            </p>

            {next.notes && (
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "var(--pt-fs-base)",
                  color: "var(--g-dim)",
                  lineHeight: 1.5,
                }}
              >
                {next.notes}
              </p>
            )}

            {appointments.length > 1 && (
              <div style={{ marginTop: 14 }}>
                {appointments.slice(1, 4).map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "8px 0",
                      borderTop: "1px solid var(--g-border)",
                      fontSize: "var(--pt-fs-md)",
                    }}
                  >
                    <span>{t.fmt.weekdayTimeLong(new Date(a.startsAt))}</span>
                    <span
                      style={{ color: "var(--g-dim)", whiteSpace: "nowrap" }}
                    >
                      {t.labels.location[a.location] ?? a.location}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p style={{ margin: "8px 0 0", fontSize: "var(--pt-fs-md)", color: "var(--g-dim)" }}>
            {h.noAppointment}
          </p>
        )}
      </Link>

      {/* Check-in — der wöchentliche Kontaktpunkt zum Coach. */}
      <Link
        href="/athlete/checkin"
        className="gym-card gym-card--link"
        style={{ display: "block", marginBottom: 12 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p className="gym-label">{h.checkinThisWeek}</p>
          <span style={{ color: "var(--g-dim)", display: "flex" }}>
            <IconChevronRight size={16} />
          </span>
        </div>

        {checkIn?.coach_reply ? (
          <>
            <p style={{ margin: "8px 0 4px", fontSize: "var(--pt-fs-input)", fontWeight: 700 }}>
              {h.coachReplied}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "var(--pt-fs-md)",
                color: "var(--g-dim)",
                lineHeight: 1.5,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {checkIn.coach_reply}
            </p>
          </>
        ) : checkIn?.submitted_at ? (
          <>
            <p style={{ margin: "8px 0 4px", fontSize: "var(--pt-fs-input)", fontWeight: 700 }}>
              {h.submitted}
            </p>
            <p style={{ margin: 0, fontSize: "var(--pt-fs-md)", color: "var(--g-dim)" }}>
              {h.coachWillLook}
            </p>
          </>
        ) : (
          <>
            <p style={{ margin: "8px 0 4px", fontSize: "var(--pt-fs-input)", fontWeight: 700 }}>
              {h.stillOpen}
            </p>
            <p style={{ margin: 0, fontSize: "var(--pt-fs-md)", color: "var(--g-dim)" }}>
              {h.twoMinutes}
            </p>
          </>
        )}
      </Link>

      {/* Letzte Einheit */}
      {last && !trainedToday && (
        <div className="gym-card">
          <p className="gym-label">{h.lastTrained}</p>
          <p
            style={{
              margin: "8px 0 10px",
              fontSize: "var(--pt-fs-md)",
              color: "var(--g-dim)",
            }}
          >
            {t.fmt.dateMedium(new Date(last.performedAt))}
            {/* Hat der Trainer die Einheit eingetragen, soll der Athlet
                das wissen — sonst wundert er sich über Sätze, die er
                nicht selbst getippt hat. */}
            {last.recordedBy && h.byCoach}
          </p>
          {last.slots.map((slot) => {
            const best = [...slot.sets].sort(
              (a, b) => b.weightKg * b.reps - a.weightKg * a.reps,
            )[0];
            return (
              <div
                key={slot.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "8px 0",
                  borderTop: "1px solid var(--g-border)",
                  fontSize: "var(--pt-fs-md)",
                }}
              >
                <span style={{ minWidth: 0 }}>
                  {exercises.get(slot.exerciseId)?.name ??
                    muscleLabel(t, slot.muscleGroup)}
                </span>
                <span style={{ color: "var(--g-dim)", whiteSpace: "nowrap" }}>
                  {best
                    ? best.isBodyweight || best.weightKg === 0
                      ? h.reps(best.reps)
                      : `${t.fmt.num(best.weightKg)} kg × ${best.reps}`
                    : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
