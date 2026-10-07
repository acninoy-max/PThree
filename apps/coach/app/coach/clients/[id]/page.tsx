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
  fetchPhotoConsent,
  fetchProgressPhotos,
} from "@ptfive/db";
import {
  analyseClient,
  comparableExercisePoints,
  defaultExerciseSelection,
  exerciseHistory,
  loggedExercises,
  volumeByDay,
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
import { getT } from "@/app/i18n/server";
import { ClientPhotos } from "./photos";
import {
  CLIENT_TABS,
  SECTION_KEYS,
  SECTION_TAB,
  parseView,
  type ClientTab,
  type ClientView,
  type SectionKey,
} from "./sections";
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
  searchParams,
}: {
  params: { id: string };
  searchParams: { neu?: string; tab?: string };
}) {
  const t = getT();
  const A = t.coach.file;
  const view = parseView(searchParams.tab);
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
      name: ex?.name ?? t.athlete.progress.fallbackExercise,
      muscleLabel: ex ? muscleLabel(t, ex.muscleGroup) : "—",
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
        name: exercises.get(id)?.name ?? t.athlete.progress.fallbackExercise,
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
  const bodySeries = buildSeries(t, checkIns);

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
    .sort((a, b) => a.title.localeCompare(b.title, t.locale));

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
  const bloecke: Record<SectionKey, ReactNode> = {
    goal: client.goal ? (
      <div style={{ marginBottom: 22 }}>
        <p className="pt-label" style={{ marginBottom: 10 }}>
          {A.goals}
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
          {A.hints}
        </p>
        {insights.length === 0 ? (
          <div className="pt-card">
            <p
              style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-text-dim)" }}
            >
              {A.nothing}
            </p>
          </div>
        ) : (
          insights.map((i) => (
            <InsightCard key={i.id} t={t} insight={i} clientName={client.fullName} />
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
            {A.checkins}
            {openCheckIns.length > 0 && (
              <span style={{ color: "var(--pt-action)" }}>
                {A.open(openCheckIns.length)}
              </span>
            )}
          </p>
          <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
            <CheckInConfig clientId={client.id} fields={checkInFields} />
            <Link href="/coach/checkins" style={{ fontSize: "var(--pt-fs-base)" }}>
              {A.allCheckins}
            </Link>
          </div>
        </div>

        {checkInItems.length === 0 ? (
          <div className="pt-card">
            <p
              style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-text-dim)" }}
            >
              {client.profileId === null ? A.noAccessNoCheckin : A.noCheckin}
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
            {A.bodyValues}
          </p>
          <div className="pt-card">
            <MetricChart
              series={bodySeries}
              emptyHint={A.noValues}
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
            {A.volumePerDay}
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
                      {t.engine.volume(letzte.volumeKg)}
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
                          {t.fmt.signed(delta)} kg
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
                    {A.dayLine(prozent, d.points.length)}
                    {letzte.bodyweightSets > 0 &&
                      A.bodyweightSets(letzte.bodyweightSets)}
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
          {A.lastSessions}
        </p>
        {recent.length === 0 ? (
          <div className="pt-card">
            <p
              style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-text-dim)" }}
            >
              {A.nothingLogged}
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
                    {t.fmt.dateMedium(new Date(s.performedAt))}
                    {/* Zwei verschiedene Aussagen: OB nach Plan trainiert
                        wurde, und WER eingetragen hat. */}
                    {s.isSelfDirected ? A.withoutPlan : ""}
                    {s.recordedBy ? A.recordedByYou : ""}
                  </span>
                </div>
                {s.slots.map((slot) => (
                  // Klasse statt Inline-Layout: Am Handy bricht die Zeile
                  // um (siehe .pt-setline), und ein `style` würde die
                  // Media-Query überstimmen — Regel 6.
                  <div key={slot.id} className="pt-setline">
                    {/* Erst die Übung, dann die Einordnung — der Trainer
                        liest die Einheit nach und sucht Namen, keine
                        Kategorien. */}
                    <span className="pt-setline__name">
                      {exercises.get(slot.exerciseId)?.name ??
                        t.athlete.progress.fallbackExercise}
                    </span>
                    <span className="pt-setline__muscle">
                      {muscleLabel(t, slot.muscleGroup)}
                    </span>
                    <span className="pt-setline__sets">
                      {slot.sets
                        .map((set) =>
                          set.isBodyweight || set.weightKg === 0
                            ? `${set.reps}×${A.bwShort}`
                            : `${t.fmt.num(set.weightKg)}×${set.reps}`,
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

  /*
    Die Akte in drei Reitern (Joëls Punkt 13): Tracken, Check-ins,
    Progress. Vorher stand alles untereinander, und am Handy lag der
    Plan unter fünf Bildschirmhöhen Kurven. Jetzt sieht man, was zur
    Situation gehört — im Studio Tracken, am Sonntagabend Check-ins.

    Über die Adresse (?tab=) statt über einen Zustand im Browser: Ein
    Link aus dem Feed kann so direkt auf „Check-ins" zeigen, und
    Zurück im Browser führt zum vorigen Reiter.
  */
  const bloeckeIm = (tab: ClientTab) =>
    SECTION_KEYS.filter((k) => SECTION_TAB[k] === tab).map((k) => (
      <Fragment key={k}>{bloecke[k]}</Fragment>
    ));

  const tabHref = (v: ClientView) =>
    v === "track" ? `/coach/clients/${client.id}` : `/coach/clients/${client.id}?tab=${v}`;

  return (
    <>
      <Nav coachName={profile?.full_name ?? "Coach"} />
      <main className="pt-shell">
        <Link
          href="/coach/clients"
          style={{ fontSize: "var(--pt-fs-base)", color: "var(--pt-text-dim)" }}
        >
          {t.coach.clients.allClients}
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            margin: "14px 0 18px",
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
              {t.labels.level[client.level]} ·{" "}
              {A.since(t.fmt.dateMedium(parseDay(client.startedOn)))}
            </p>
          </div>
        </div>

        <nav className="pt-subtabs" aria-label={A.tabsAria}>
          {CLIENT_TABS.map((tab) => (
            <Link
              key={tab}
              href={tabHref(tab)}
              className="pt-subtab"
              data-active={view === tab}
              aria-current={view === tab ? "page" : undefined}
            >
              {A.tabs[tab]}
              {tab === "checkins" && openCheckIns.length > 0 && (
                <span className="pt-subtab__badge">{openCheckIns.length}</span>
              )}
            </Link>
          ))}
          {/* Selten gebraucht, deshalb kein gleichrangiger Reiter —
              aber in derselben Zeile, damit man es findet. */}
          <Link
            href={tabHref("manage")}
            className="pt-subtab pt-subtab--aside"
            data-active={view === "manage"}
            aria-current={view === "manage" ? "page" : undefined}
          >
            {A.manage}
          </Link>
        </nav>

        {view === "track" && (
          /*
            Plan und Termine stehen im Markup VOR den Abschnitten. Am
            Handy, wo die Spalten untereinander rutschen, kommt der Plan
            damit gleich nach „Training starten" — und nicht erst unter
            sechs Einheiten Verlauf. Genau das war Joëls Punkt 2: der
            Plan kommt zu spät. Am Rechner setzt .pt-split--aside-first
            die Spalte trotzdem nach rechts.
          */
          <div className="pt-split pt-split--aside-first" style={{ marginBottom: 28 }}>
            {/* Rechts, was man bedient: Start, Plan und Termine. */}
            <div style={{ display: "grid", gap: 12 }}>
              {/* Der eine Knopf, für den man im Studio diese Seite öffnet. */}
              {client.status === "active" && (
                <Link
                  href={`/coach/track/${client.id}`}
                  className="pt-btn"
                  style={{ textDecoration: "none" }}
                >
                  {A.startTraining}
                </Link>
              )}
              <ClientPlan
                clientId={client.id}
                level={client.level}
                active={activePlan}
                older={olderPlans}
                startWithPlan={searchParams.neu === "1" && !activePlan}
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
            </div>
            <section>{bloeckeIm("track")}</section>
          </div>
        )}

        {(view === "checkins" || view === "progress") && (
          <section style={{ maxWidth: 760, marginBottom: 28 }}>
            {bloeckeIm(view)}
          </section>
        )}

        {view === "manage" && (
          <section style={{ maxWidth: 560, marginBottom: 28 }}>
            <ManageClient
              client={client}
              hasAccount={client.profileId !== null}
            />
          </section>
        )}
      </main>
    </>
  );
}
