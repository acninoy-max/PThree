import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchAppointmentsBetween,
  fetchClient,
  fetchCheckInConfig,
  fetchClientCheckIns,
  fetchProgressSelection,
  fetchExercises,
  fetchPlans,
  fetchSessions,
  fetchUnresolvedAppointments,
  fetchViewSections,
  fetchPhotoConsent,
  fetchProgressPhotos,
} from "@ptfive/db";
import {
  analyseClient,
  comparableExercisePoints,
  defaultExerciseSelection,
  deltaLabel,
  exerciseHistory,
  loggedExercises,
  volumeByDay,
  volumeLabel,
} from "@ptfive/coach-engine";
import { createServerSupabase } from "@/lib/supabase-server";
import { Nav } from "@/app/nav";
import { ClientProgress } from "./progress";
import { parseDay } from "@/app/plan-week";
import { Avatar, InsightCard, muscleLabel } from "@/app/components";
import { CheckInCard } from "@/app/coach/checkins/inbox";
import { MetricChart } from "@/app/metric-chart";
import { buildSeries } from "@/app/athlete/checkin/measurements";
import { ManageClient } from "./manage";
import { ClientAppointments } from "./appointments";
import { ClientPlan } from "./plan";
import { CheckInConfig } from "./checkin-config";
import { dateMedium } from "@/app/format";
import { ViewSettings } from "./view-settings";
import { ClientPhotos } from "./photos";
import { resolveSections, type SectionKey } from "./sections";
import { Fragment, type ReactNode } from "react";

export const dynamic = "force-dynamic";

/** Kleiner Balkenverlauf ohne Diagramm-Bibliothek. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  return (
    <div
      style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 42 }}
    >
      {values.map((v, i) => (
        <div
          key={i}
          title={String(Math.round(v))}
          style={{
            width: 14,
            height: 10 + ((v - min) / span) * 30,
            background: "var(--pt-action)",
            opacity: 0.35 + (i / values.length) * 0.65,
            borderRadius: 3,
          }}
        />
      ))}
    </div>
  );
}

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  const { data: profile } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .maybeSingle();

  const in90Days = new Date(Date.now() + 90 * 86_400_000);

  const [
    client,
    sessions,
    exercises,
    allUpcoming,
    allUnresolved,
    checkIns,
    checkInFields,
    gewaehlt,
    viewSections,
    photoConsent,
  ] = await Promise.all([
    fetchClient(db, params.id),
    fetchSessions(db, { clientId: params.id, sinceDays: 365 }),
    fetchExercises(db),
    fetchAppointmentsBetween(db, new Date(), in90Days),
    fetchUnresolvedAppointments(db, 14),
    fetchClientCheckIns(db, params.id, 12),
    fetchCheckInConfig(db, params.id),
    // Die Auswahl des TRAINERS, nicht die des Athleten. Beide haben
    // ihre eigene — der eine schaut auf seine Entwicklung, der andere
    // auf die Stellen, an denen er nachsteuern will.
    fetchProgressSelection(db, params.id, user!.id),
    // Wie dieser Trainer seine Akten liest — gilt für alle Klienten.
    fetchViewSections(db, user!.id),
    // Ohne Einwilligung liefert die Zeilensicherheit ohnehin nichts;
    // der Trainer muss aber wissen, WARUM nichts da ist.
    fetchPhotoConsent(db, params.id),
  ]);

  const photos = photoConsent ? await fetchProgressPhotos(db, params.id) : [];

  if (!client) notFound();

  /**
   * Alles, was dieser Klient je geloggt hat — die Auswahlliste.
   *
   * Ohne Untergrenze: Auch die Übung von vor einem halben Jahr muss
   * anwählbar sein, sonst fehlt genau die, nach der der Trainer sucht.
   */
  const alleUebungen = loggedExercises(sessions).map((e) => {
    const ex = exercises.get(e.exerciseId);
    return {
      id: e.exerciseId,
      name: ex?.name ?? "Übung",
      muscleLabel: ex ? muscleLabel(ex.muscleGroup) : "—",
      sets: e.sets,
      lastPerformedAt: e.lastPerformedAt,
    };
  });

  // Noch nie gewählt: die häufigsten vorschlagen, statt leer zu starten.
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
        // Trainer im Browser.
        verworfen: punkte.length - rein.length,
      };
    })
    .filter((k) => k.points.length > 0);

  const plans = await fetchPlans(db, params.id);
  const activePlan = plans.find((p) => p.isActive) ?? null;
  const olderPlans = plans.filter((p) => !p.isActive).slice(0, 3);

  // Check-ins kommen absteigend; für die Veränderung zur Vorwoche braucht
  // es den Nachbarn in der Zeit, nicht in der Liste.
  const olderFirst = [...checkIns].reverse();
  const checkInItems = checkIns.map((c) => {
    let deltaKg: number | null = null;
    if (c.weightKg !== null) {
      const i = olderFirst.findIndex((x) => x.id === c.id);
      const previous = olderFirst
        .slice(0, i)
        .reverse()
        .find((x) => x.weightKg !== null);
      if (previous?.weightKg != null) {
        deltaKg = Math.round((c.weightKg - previous.weightKg) * 10) / 10;
      }
    }
    return { ...c, clientName: client.fullName, deltaKg };
  });

  const openCheckIns = checkInItems.filter((c) => !c.coachReply);
  // Dieselben Reihen wie in der Athleten-App — eine Quelle, ein Bild.
  const bodySeries = buildSeries(checkIns);

  const upcoming = allUpcoming.filter(
    (a) => a.clientId === client.id && a.status === "scheduled",
  );
  const unresolved = allUnresolved.filter((a) => a.clientId === client.id);

  const insights = analyseClient(client, sessions);
  const recent = [...sessions].reverse().slice(0, 6);

  /**
   * Volumen je Trainingstag — vorgerechnet, damit der Block unten nur
   * noch gezeichnet wird. Nur Tage mit mindestens zwei Einheiten: Ein
   * einzelner Punkt ist kein Verlauf.
   */
  const volumenTage = [...volumeByDay(sessions)]
    .map(([dayId, points]) => ({
      dayId,
      title:
        plans.flatMap((p) => p.days).find((d) => d.id === dayId)?.title ??
        points[0]!.title,
      points,
    }))
    .filter((d) => d.points.length >= 2)
    .sort((a, b) => a.title.localeCompare(b.title, "de"));

  /**
   * Die Akte, in Blöcken.
   *
   * Vorher stand alles fest verdrahtet untereinander im JSX. Damit war
   * „Reihenfolge ändern" gleichbedeutend mit „Code ändern". Als Karte
   * aus Schlüssel auf Inhalt ist die Anordnung eine Liste von
   * Schlüsseln — und die kann der Trainer über das Zahnrad umstellen.
   *
   * Ein Block darf null sein (kein Ziel hinterlegt, noch kein Volumen).
   * Er verschwindet dann, ohne eine Lücke zu hinterlassen.
   */
  const anordnung = resolveSections(viewSections);
  const bloecke: Record<SectionKey, ReactNode> = {
    goal: client.goal ? (
      <div style={{ marginBottom: 22 }}>
        <p className="pt-label" style={{ marginBottom: 10 }}>
          Ziele & Notizen
        </p>
        <div className="pt-card">
          {/* Zeilenumbrüche erhalten — der Coach tippt hier Stichpunkte. */}
          <p
            style={{
              margin: 0,
              fontSize: "var(--pt-fs-md)",
              lineHeight: 1.65,
              whiteSpace: "pre-wrap",
            }}
          >
            {client.goal}
          </p>
        </div>
      </div>
    ) : null,

    insights: (
      <div style={{ marginBottom: 22 }}>
        <p className="pt-label" style={{ marginBottom: 10 }}>
          Coach-Hinweise
        </p>
        {insights.length === 0 ? (
          <div className="pt-card">
            <p
              style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-text-dim)" }}
            >
              Nichts zu melden — läuft.
            </p>
          </div>
        ) : (
          insights.map((i) => (
            <InsightCard key={i.id} insight={i} clientName={client.fullName} />
          ))
        )}
      </div>
    ),

    checkins: (
      <div style={{ marginBottom: 22 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <p className="pt-label" style={{ margin: 0 }}>
            Check-ins
            {openCheckIns.length > 0 && (
              <span style={{ color: "var(--pt-action)" }}>
                {" "}
                · {openCheckIns.length} offen
              </span>
            )}
          </p>
          <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
            <CheckInConfig clientId={client.id} fields={checkInFields} />
            <Link href="/coach/checkins" style={{ fontSize: "var(--pt-fs-base)" }}>
              Alle Check-ins
            </Link>
          </div>
        </div>

        {checkInItems.length === 0 ? (
          <div className="pt-card">
            <p
              style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-text-dim)" }}
            >
              {client.profileId === null
                ? "Noch kein Zugang eingerichtet — ohne App-Konto kann der Klient kein Check-in abschicken."
                : "Noch kein Check-in abgeschickt."}
            </p>
          </div>
        ) : (
          checkInItems
            .slice(0, 4)
            .map((item) => (
              <CheckInCard
                key={item.id}
                item={item}
                answered={Boolean(item.coachReply)}
                showName={false}
              />
            ))
        )}
      </div>
    ),

    progress: (
      <ClientProgress
        clientId={client.id}
        clientName={client.fullName}
        curves={kurven}
        all={alleUebungen}
        selected={auswahl}
      />
    ),

    /*
      Körperwerte standen früher in der rechten Spalte, zwischen Plan und
      Verwaltung. Dort sind sie falsch: Rechts steht, was man bedient,
      links, was man liest. Und nur links lassen sie sich anordnen.
    */
    body:
      bodySeries.length > 0 ? (
        <div style={{ marginBottom: 22 }}>
          <p className="pt-label" style={{ marginBottom: 10 }}>
            Körperwerte
          </p>
          <div className="pt-card">
            <MetricChart
              series={bodySeries}
              emptyHint="Noch keine Werte gemeldet."
            />
          </div>
        </div>
      ) : null,

    photos: (
      <ClientPhotos
        clientName={client.fullName}
        hasConsent={photoConsent !== null}
        photos={photos}
        weights={checkIns
          .filter((c) => c.weightKg !== null)
          .map((c) => ({ on: c.weekOf, kg: c.weightKg as number }))}
      />
    ),

    /*
      Volumen je Trainingstag — dieselbe Zahl, die der Athlet nach dem
      Training sieht. Für den Trainer die schnellste Antwort auf „läuft
      der Oberkörpertag oder tritt er auf der Stelle".
    */
    volume:
      volumenTage.length > 0 ? (
        <div style={{ marginBottom: 22 }}>
          <p className="pt-label" style={{ marginBottom: 10 }}>
            Volumen je Trainingstag
          </p>
          <div className="pt-card" style={{ display: "grid", gap: 12 }}>
            {volumenTage.map((d) => {
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
                        fontSize: "var(--pt-fs-md)",
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {volumeLabel(letzte.volumeKg)}
                      {/* Die Veränderung direkt an der Zahl, nicht erst in
                          der Zeile darunter — das war der Wunsch aus dem
                          Meeting. Ohne Farbe: mehr Volumen ist nicht
                          automatisch besser. */}
                      {delta !== 0 && (
                        <span
                          style={{
                            fontWeight: 500,
                            color: "var(--pt-text-dim)",
                          }}
                        >
                          {" "}
                          {deltaLabel(delta, "kg")}
                        </span>
                      )}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "var(--pt-fs-sm)",
                      color: "var(--pt-text-dim)",
                      lineHeight: 1.45,
                    }}
                  >
                    {prozent === null
                      ? `${d.points.length} Einheiten`
                      : prozent === 0
                        ? `unverändert · ${d.points.length} Einheiten`
                        : `${prozent > 0 ? "+" : "−"}${Math.abs(prozent)} % zur vorigen · ${d.points.length} Einheiten`}
                    {letzte.bodyweightSets > 0 &&
                      ` · ${letzte.bodyweightSets} Sätze Körpergewicht`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null,

    sessions: (
      <div style={{ marginBottom: 22 }}>
        <p className="pt-label" style={{ marginBottom: 10 }}>
          Letzte Einheiten
        </p>
        {recent.length === 0 ? (
          <div className="pt-card">
            <p
              style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-text-dim)" }}
            >
              Noch nichts geloggt.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {recent.map((s) => (
              <div key={s.id} className="pt-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{s.title}</span>
                  <span style={{ fontSize: "var(--pt-fs-base)", color: "var(--pt-text-dim)" }}>
                    {dateMedium(new Date(s.performedAt))}
                    {/* Zwei verschiedene Aussagen: OB nach Plan trainiert
                        wurde, und WER eingetragen hat. */}
                    {s.isSelfDirected ? " · ohne Plan" : ""}
                    {s.recordedBy ? " · von dir erfasst" : ""}
                  </span>
                </div>
                {s.slots.map((slot) => (
                  <div
                    key={slot.id}
                    style={{
                      display: "flex",
                      gap: 12,
                      fontSize: "var(--pt-fs-base)",
                      padding: "5px 0",
                      borderTop: "1px solid var(--pt-border)",
                    }}
                  >
                    {/* Erst die Übung, dann die Einordnung — der Trainer
                        liest die Einheit nach und sucht Namen, keine
                        Kategorien. */}
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 500 }}>
                      {exercises.get(slot.exerciseId)?.name ?? "Übung"}
                    </span>
                    <span
                      style={{
                        minWidth: 110,
                        color: "var(--pt-text-dim)",
                        textAlign: "right",
                      }}
                    >
                      {muscleLabel(slot.muscleGroup)}
                    </span>
                    <span style={{ color: "var(--pt-text-dim)" }}>
                      {slot.sets
                        .map((set) =>
                          set.isBodyweight || set.weightKg === 0
                            ? `${set.reps}×KG`
                            : `${set.weightKg}×${set.reps}`,
                        )
                        .join("  ·  ")}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    ),
  };

  return (
    <>
      <Nav coachName={profile?.full_name ?? "Coach"} />
      <main className="pt-shell">
        <Link
          href="/coach/clients"
          style={{ fontSize: "var(--pt-fs-base)", color: "var(--pt-text-dim)" }}
        >
          ‹ Alle Klienten
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            margin: "14px 0 26px",
          }}
        >
          <Avatar name={client.fullName} size={52} />
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: "var(--pt-fs-3xl)", fontWeight: 600 }}>
              {client.fullName}
            </h1>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: "var(--pt-fs-md)",
                color: "var(--pt-text-dim)",
              }}
            >
              {client.level} · dabei seit{" "}
              {dateMedium(parseDay(client.startedOn))}
            </p>
          </div>

          {/*
            Rechtsbündig und oben auf Höhe des Namens.

            `alignSelf: flex-start` statt der Ausrichtung des Containers:
            Avatar und Namensblock bleiben zueinander mittig, nur der
            Knopf geht nach oben. Ohne das säße er auf halber Höhe
            zwischen Name und Unterzeile — und mit einem Umbruch, wie
            ich ihn zwischendurch als Rückfall drin hatte, rutschte er
            ganz in die nächste Zeile.

            Die 2px gleichen die Zeilenhöhe der Überschrift aus: Deren
            Kasten ist höher als die Buchstaben, der Knopf nicht.
          */}
          <div
            style={{
              marginLeft: "auto",
              flex: "none",
              alignSelf: "flex-start",
              marginTop: 2,
            }}
          >
            <ViewSettings
              order={anordnung.map((s) => s.key)}
              hidden={anordnung.filter((s) => !s.isVisible).map((s) => s.key)}
            />
          </div>
        </div>

        <div className="pt-split" style={{ marginBottom: 28 }}>
          <section>
            {/*
              Die Blöcke in der Anordnung, die dieser Trainer eingestellt
              hat. Ausgeblendete fallen raus, leere (kein Ziel, noch kein
              Volumen) zeichnen sich selbst als null.
            */}
            {anordnung
              .filter((s) => s.isVisible)
              .map((s) => (
                <Fragment key={s.key}>{bloecke[s.key]}</Fragment>
              ))}
          </section>

          {/* Rechte Spalte: Stammdaten und Steuerung — nichts, woran man
              arbeitet, sondern was man nachschlägt. */}
          <div style={{ display: "grid", gap: 12 }}>
            <ClientPlan
              clientId={client.id}
              level={client.level}
              active={activePlan}
              older={olderPlans}
            />
            <ClientAppointments
              client={{
                id: client.id,
                name: client.fullName,
                status: client.status,
              }}
              upcoming={upcoming}
              unresolved={unresolved}
            />
            {/* Körperwerte standen hier. Sie sind jetzt links unter den
                anordenbaren Blöcken: Rechts steht, was man bedient,
                links, was man liest. */}
            <ManageClient
              client={client}
              hasAccount={client.profileId !== null}
            />
          </div>
        </div>
      </main>
    </>
  );
}
