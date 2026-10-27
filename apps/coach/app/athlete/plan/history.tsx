import type { Session } from "@ptfive/types";
import type { Dict } from "@/app/i18n";

/**
 * Trainingshistorie für den Klienten (Meeting 27.10.2026).
 *
 * Der Trainer sah vergangene Einheiten in der Akte, der Klient nirgends.
 * Wer wissen will, was er letzten Dienstag gedrückt hat, soll nicht den
 * Trainer fragen müssen.
 *
 * Aufklappen über <details>: ohne JavaScript, auf dem Handy mit einem
 * Tipp, und die Liste bleibt kurz, bis man etwas sucht.
 */
export function TrainingsHistorie({
  t,
  sessions,
  names,
}: {
  t: Dict;
  /** Aufsteigend, wie fetchSessions sie liefert. */
  sessions: Session[];
  names: Map<string, string>;
}) {
  const p = t.athlete.plan;
  const neueste = [...sessions].sort((a, b) => b.performedAt.localeCompare(a.performedAt));

  if (neueste.length === 0) {
    return (
      <div className="gym-card">
        <p style={{ margin: 0, fontSize: "var(--pt-fs-md)", lineHeight: 1.6 }}>{p.historyEmpty}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {neueste.map((s) => {
        const saetze = s.slots.reduce((n, sl) => n + sl.sets.length, 0);
        const volumen = s.slots.reduce(
          (n, sl) => n + sl.sets.reduce((m, x) => m + x.weightKg * x.reps, 0),
          0,
        );
        const minuten = s.durationSeconds ? Math.round(s.durationSeconds / 60) : null;
        return (
          <details key={s.id} className="gym-card gym-verlauf">
            <summary>
              <span style={{ display: "block", fontSize: "var(--pt-fs-input)", fontWeight: 700 }}>
                {s.title}
              </span>
              <span
                style={{
                  display: "block",
                  marginTop: 4,
                  fontSize: "var(--pt-fs-sm)",
                  color: "var(--g-dim)",
                }}
              >
                {[
                  t.fmt.weekdayDate(new Date(s.performedAt)),
                  minuten !== null ? t.time.duration(minuten) : null,
                  t.athlete.home.sets(saetze),
                  volumen > 0 ? t.engine.volume(volumen) : null,
                  s.recordedBy ? p.withCoach : null,
                  s.isComplete ? null : p.incomplete,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </summary>
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {s.slots.map((sl) => (
                <div key={sl.id}>
                  <p style={{ margin: 0, fontSize: "var(--pt-fs-md)", fontWeight: 600 }}>
                    {names.get(sl.exerciseId) ?? p.unknownExercise}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: "var(--pt-fs-base)", color: "var(--g-dim)" }}>
                    {sl.sets
                      .map((x) =>
                        x.weightKg === 0
                          ? t.athlete.home.reps(x.reps)
                          : `${t.fmt.num(x.weightKg)} kg × ${x.reps}`,
                      )
                      .join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
