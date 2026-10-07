import { createServerSupabase } from "@/lib/supabase-server";
import { Nav } from "@/app/nav";
import { getT } from "@/app/i18n/server";
import { Sprachwahl } from "@/app/i18n/sprachwahl";
import { Abmelden } from "./abmelden";
import { FeedbackForm } from "@/app/feedback";

export const dynamic = "force-dynamic";

/**
 * Profil und Einstellungen des Trainers.
 *
 * Der fünfte Punkt der Leiste. Hier liegt, was man selten braucht und
 * trotzdem finden muss: Sprache und Abmelden. Beides stand vorher oben
 * in der Kopfzeile und war dort auf dem Handy kaum zu treffen.
 *
 * Name und Adresse nur zum Lesen: Ein Trainerkonto entsteht von Hand
 * über `promote_to_coach()` (siehe PROJEKTSTAND.md, Abschnitt 6). Ein
 * Feld zum Ändern bräuchte erst eine Regel in der Datenbank, wer
 * `profiles.full_name` schreiben darf.
 */
export default async function CoachProfilePage() {
  const t = getT();
  const P = t.coach.profile;
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  const { data: profile } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .maybeSingle();

  const name = profile?.full_name ?? "Coach";

  return (
    <>
      <Nav coachName={name} />
      <main className="pt-shell" style={{ maxWidth: 560 }}>
        <p className="pt-label" style={{ margin: 0 }}>
          {P.kicker}
        </p>
        <h1 style={{ margin: "2px 0 20px", fontSize: "var(--pt-fs-3xl)", fontWeight: 600 }}>
          {P.title}
        </h1>

        <div className="pt-card" style={{ display: "grid", gap: 12, marginBottom: 12 }}>
          <p className="pt-label" style={{ margin: 0 }}>
            {P.account}
          </p>
          <div>
            <p style={{ margin: 0, fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
              {P.name}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "var(--pt-fs-md)", fontWeight: 500 }}>
              {name}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
              {P.email}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "var(--pt-fs-md)" }}>{user?.email}</p>
          </div>
        </div>

        <div className="pt-card" style={{ marginBottom: 12 }}>
          <p className="pt-label" style={{ margin: "0 0 10px" }}>
            {t.language.label}
          </p>
          <Sprachwahl />
          <p
            style={{
              margin: "10px 0 0",
              fontSize: "var(--pt-fs-sm)",
              color: "var(--pt-text-dim)",
              lineHeight: 1.5,
            }}
          >
            {P.languageHint}
          </p>
        </div>

        <div style={{ marginBottom: 12 }}>
          <FeedbackForm variante="coach" />
        </div>

        <div className="pt-card">
          <p style={{ margin: "0 0 10px", fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
            {P.signOutHint}
          </p>
          <Abmelden />
        </div>
      </main>
    </>
  );
}
