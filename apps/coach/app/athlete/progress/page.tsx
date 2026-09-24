import {
  fetchActivePlan,
  fetchExercises,
  fetchMyCheckIns,
  fetchPhotoConsent,
  fetchProgressPhotos,
  fetchProgressSelection,
  fetchSessions,
} from "@ptfive/db";
import {
  comparableExercisePoints,
  defaultExerciseSelection,
  exerciseHistory,
  loggedExercises,
  volumeByDay,
  volumeLabel,
} from "@ptfive/coach-engine";
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";
import { IconChevronRight } from "@/app/icons";
import { muscleLabel } from "@/app/components";
import { MetricChart } from "@/app/metric-chart";
import { PhotoCompare } from "@/app/photo-compare";
import { ProgressExercises } from "./progress-exercises";
import { dateMedium } from "@/app/format";
import {
  MEASURE_INFO,
  MEASURE_KEYS,
  buildSeries,
} from "@/app/athlete/checkin/measurements";

export const dynamic = "force-dynamic";

/**
 * Farben der Trainingstage im Diagramm.
 *
 * Alle gegen den Sandhintergrund auf mindestens 3:1 gerechnet — es sind
 * Linien, also gilt der Nicht-Text-Kontrast nach WCAG 1.4.11. Die Reihen
 * tragen zusätzlich ihre Beschriftung, Farbe allein trägt nichts.
 */
const DAY_COLORS = ["#c42d1a", "#1d4ed8", "#3b6d11", "#8a5a00", "#6b21a8"];

export default async function ProgressPage() {
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  const { data: me } = await db
    .from("clients")
    .select("id")
    .eq("profile_id", user?.id ?? "")
    .maybeSingle();

  const [sessions, exercises, checkIns, plan, gewaehlt] = await Promise.all([
    fetchSessions(db, { sinceDays: 365 }),
    fetchExercises(db),
    // Ein Jahr reicht: Die Zeitraumwahl im Diagramm greift darauf zu.
    fetchMyCheckIns(db, 60),
    fetchActivePlan(db),
    // Die eigene Liste des Athleten — der Trainer hat für denselben
    // Klienten seine eigene.
    me && user
      ? fetchProgressSelection(db, me.id, user.id)
      : Promise.resolve([]),
  ]);

  /**
   * Alles, was je geloggt wurde — die Auswahlliste.
   *
   * Bewusst ohne Untergrenze: Auch die Übung, die vor einem halben Jahr
   * zweimal vorkam, muss anwählbar sein.
   */
  const alleUebungen = loggedExercises(sessions).map((e) => {
    const ex = exercises.get(e.exerciseId);
    return {
      id: e.exerciseId,
      name: ex?.name ?? "Übung",
      muscleLabel: ex ? muscleLabel(ex.muscleGroup) : "—",
      sets: e.sets,
      sessions: e.sessions,
      lastPerformedAt: e.lastPerformedAt,
    };
  });

  /**
   * Noch nie gewählt? Dann die häufigsten vorschlagen.
   *
   * Eine leere Seite erklärt sich nicht, und niemand baut sich seine
   * Auswahl zusammen, bevor er gesehen hat, wozu sie gut ist.
   */
  const auswahl =
    gewaehlt.length > 0 ? gewaehlt : defaultExerciseSelection(sessions, 4);

  const kurven = auswahl
    .map((id) => {
      const punkte = exerciseHistory(sessions, id);
      const rein = comparableExercisePoints(punkte);
      return {
        id,
        name: exercises.get(id)?.name ?? "Übung",
        points: rein,
        // Die Veränderung wird hier NICHT mehr vorgerechnet: Sie hängt
        // am Umschalter Bestleistung/Volumen, und den bedient der
        // Athlet im Browser. Eine auf dem Server festgelegte Zahl
        // stünde nach dem ersten Tipp neben der Kurve, die sie erklärt.
        //
        // Punkte der alten Skala, die aus dem Vergleich fallen:
        verworfen: punkte.length - rein.length,
      };
    })
    .filter((k) => k.points.length > 0);

  /**
   * Volumen je Trainingstag — „ist mein Oberkörpertag schwerer geworden".
   *
   * Nur Tage mit mindestens zwei Einheiten: Ein einzelner Punkt ist kein
   * Verlauf, und eine Kurve aus einem Wert wäre eine Behauptung.
   */
  const dayVolumes = [...volumeByDay(sessions)]
    .map(([dayId, points]) => ({
      dayId,
      title: plan?.days.find((d) => d.id === dayId)?.title ?? points[0]!.title,
      points,
    }))
    .filter((d) => d.points.length >= 2)
    .sort((a, b) => a.title.localeCompare(b.title, "de"));

  const series = buildSeries(checkIns);

  // Messwerte nach Datum, neueste zuerst — die Zahlen zum Diagramm.
  const measurementRows = [...checkIns]
    .filter(
      (c) =>
        c.weightKg !== null ||
        MEASURE_KEYS.some((k) => c[MEASURE_INFO[k].field] !== null),
    )
    .sort((a, b) => b.weekOf.localeCompare(a.weekOf))
    .slice(0, 8);

  const totalSets = sessions.reduce(
    (n, s) => n + s.slots.reduce((m, slot) => m + slot.sets.length, 0),
    0,
  );

  /**
   * Fotos für den Vergleich weiter oben.
   *
   * Ohne Einwilligung liefert schon die Zeilensicherheit nichts — die
   * Abfrage trotzdem zu stellen wäre eine Runde zur Datenbank für ein
   * garantiert leeres Ergebnis.
   */
  const photoConsent = me ? await fetchPhotoConsent(db, me.id) : null;
  const photos =
    me && photoConsent ? await fetchProgressPhotos(db, me.id) : [];

  /**
   * Gewicht zu den Aufnahmetagen — daraus wird „−6,5 kg in 12 Wochen".
   * Genommen wird das Check-in, das dem Aufnahmetag am nächsten liegt;
   * niemand fotografiert am Meldetag.
   */
  const photoWeights = checkIns
    .filter((c) => c.weightKg !== null)
    .map((c) => ({ on: c.weekOf, kg: c.weightKg as number }));

  return (
    <main className="gym-shell" style={{ paddingTop: 26 }}>
      <p className="gym-label">Dein Fortschritt</p>
      <h1 style={{ margin: "3px 0 6px", fontSize: "var(--pt-fs-3xl)", fontWeight: 700 }}>
        {sessions.length} Einheiten
      </h1>
      <p style={{ margin: "0 0 18px", fontSize: "var(--pt-fs-md)", color: "var(--g-dim)" }}>
        {totalSets} Sätze insgesamt
      </p>

      {/*
        Vorher — Nachher, direkt hier.

        Stand vorher hinter einem Klick auf eine Unterseite. Genau
        falsch: Der Vergleich IST der Grund, warum es die Fotos gibt.
        Wer ihn erst suchen muss, sieht ihn einmal und danach nie
        wieder — und Joels „boa, seh besser aus als vor nem Monat"
        passiert nicht beim Verwalten von Bildern, sondern beim
        Draufschauen.

        Die Unterseite bleibt für das, was sie kann: hochladen,
        löschen, Einwilligung zurücknehmen. Das sind Eingriffe, und die
        gehören nicht auf eine Seite, die man zum Schauen öffnet.

        Kein eigener Punkt in der Leiste unten — dort stehen vier Dinge,
        die man täglich braucht.
      */}
      {photoConsent && photos.length > 0 ? (
        <div className="gym-card" style={{ marginBottom: 22 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "var(--pt-fs-lg)",
                fontWeight: 600,
              }}
            >
              Vorher — Nachher
            </p>
            <Link href="/athlete/photos" style={{ fontSize: "var(--pt-fs-base)" }}>
              Alle Fotos
            </Link>
          </div>

          <PhotoCompare photos={photos} weights={photoWeights} gross />
        </div>
      ) : (
        /* Noch nichts da: die Einladung, statt einer leeren Karte. */
        <Link
          href="/athlete/photos"
          className="gym-card gym-card--link"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 22,
          }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: "block",
                fontSize: "var(--pt-fs-lg)",
                fontWeight: 600,
              }}
            >
              Fotos
            </span>
            <span
              style={{
                display: "block",
                fontSize: "var(--pt-fs-base)",
                color: "var(--g-dim)",
                marginTop: 2,
                lineHeight: 1.45,
              }}
            >
              {photoConsent
                ? "Lad dein erstes Bild hoch — ab dem zweiten siehst du hier den Vergleich."
                : "Vorher und Nachher nebeneinander. Nur du und dein Trainer sehen sie."}
            </span>
          </span>
          <IconChevronRight size={18} />
        </Link>
      )}

      {/* Körperwerte aus den Check-ins. Steht oben, weil das die Zahlen
          sind, nach denen der Athlet zuerst schaut. */}
      {/*
        Volumen je Trainingstag.

        Steht vor den Körperwerten, weil es die Frage beantwortet, die man
        nach dem Training stellt: „war das mehr als letztes Mal". Verglichen
        wird nur derselbe Trainingstag mit sich selbst — Oberkörper gegen
        Beine zu stellen ergäbe eine Zahl ohne Bedeutung.
      */}
      {dayVolumes.length > 0 && (
        <div className="gym-card" style={{ marginBottom: 22 }}>
          <p className="gym-label" style={{ marginBottom: 12 }}>
            Volumen je Trainingstag
          </p>

          <MetricChart
            series={dayVolumes.map((d, i) => ({
              key: d.dayId,
              label: d.title,
              unit: "kg",
              color: DAY_COLORS[i % DAY_COLORS.length]!,
              points: d.points.map((p) => ({
                on: p.performedAt.slice(0, 10),
                value: Math.round(p.volumeKg),
              })),
            }))}
            emptyHint="Noch kein Trainingstag zweimal gemacht."
          />

          <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
            {dayVolumes.map((d) => {
              const letzte = d.points[d.points.length - 1]!;
              const vorletzte = d.points[d.points.length - 2]!;
              const delta = letzte.volumeKg - vorletzte.volumeKg;
              const prozent =
                vorletzte.volumeKg > 0
                  ? Math.round((delta / vorletzte.volumeKg) * 100)
                  : null;

              return (
                <div key={d.dayId}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: "var(--pt-fs-md)", fontWeight: 600 }}>
                      {d.title}
                    </span>
                    <span
                      style={{
                        fontSize: "var(--pt-fs-lg)",
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {volumeLabel(letzte.volumeKg)}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "var(--pt-fs-sm)",
                      color: "var(--g-dim)",
                      lineHeight: 1.45,
                    }}
                  >
                    {prozent === null
                      ? `${d.points.length} Einheiten erfasst`
                      : prozent === 0
                        ? `Wie beim letzten Mal · ${d.points.length} Einheiten`
                        : `${Math.abs(prozent)} % ${
                            prozent > 0 ? "mehr" : "weniger"
                          } als beim letzten Mal · ${d.points.length} Einheiten`}
                    {/* Körpergewichtssätze zählen nicht ins Kilogramm-
                        Volumen. Das gehört dazugesagt, sonst wundert sich
                        der Athlet über eine Zahl, die zu niedrig wirkt. */}
                    {letzte.bodyweightSets > 0 &&
                      ` · dazu ${letzte.bodyweightSets} Sätze mit Körpergewicht (${letzte.bodyweightReps} Wdh.)`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {series.length > 0 && (
        <div className="gym-card" style={{ marginBottom: 22 }}>
          <p className="gym-label" style={{ marginBottom: 12 }}>
            Körperwerte
          </p>
          <MetricChart series={series} emptyHint="Noch keine Werte gemeldet." />

          <div style={{ marginTop: 18 }}>
            <p className="gym-label" style={{ marginBottom: 8 }}>
              Gemeldet
            </p>
            {measurementRows.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: "8px 0",
                  borderTop: "1px solid var(--g-border)",
                }}
              >
                <p
                  style={{
                    margin: "0 0 3px",
                    fontSize: "var(--pt-fs-sm)",
                    color: "var(--g-dim)",
                    fontWeight: 600,
                  }}
                >
                  {dateMedium(new Date(`${c.weekOf}T00:00:00`))}
                </p>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "2px 14px",
                    fontSize: "var(--pt-fs-base)",
                  }}
                >
                  {c.weightKg !== null && (
                    <span>
                      Gewicht{" "}
                      <strong>
                        {c.weightKg.toFixed(1).replace(".", ",")} kg
                      </strong>
                    </span>
                  )}
                  {MEASURE_KEYS.map((k) => {
                    const v = c[MEASURE_INFO[k].field] as number | null;
                    if (v === null) return null;
                    return (
                      <span key={k}>
                        {MEASURE_INFO[k].label}{" "}
                        <strong>{v.toFixed(1).replace(".", ",")} cm</strong>
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ProgressExercises
        curves={kurven}
        all={alleUebungen}
        selected={auswahl}
        hasSessions={sessions.length > 0}
      />
    </main>
  );
}
