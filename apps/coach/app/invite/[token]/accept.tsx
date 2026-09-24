"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

/**
 * Registrierung über Einladung.
 *
 * WARUM DIE ADRESSE NICHT MEHR EINGETIPPT WIRD (0024):
 * Sie kommt aus dem Klientendatensatz, den der Trainer angelegt hat.
 * Tippt der Klient sie selbst, kann sie abweichen — dann steht in
 * `clients.email` die eine und in `auth.users` die andere. Der Trainer
 * schreibt ins Leere, und keine Stelle im System bemerkt es.
 *
 * Fehlt im Datensatz eine Adresse (Klienten aus der Zeit davor), gibt es
 * das Feld weiterhin. Ein Formular, das gar nicht absendbar ist, wäre
 * die schlechtere Antwort auf fehlende Daten.
 *
 * Die Rolle wird auf "athlete" gesetzt, damit der Trigger keinen
 * Coach-Eintrag anlegt. Danach verknüpft accept_client_invite das Profil
 * mit dem Klientendatensatz — das kann der Nutzer nicht selbst, weil ihm
 * der Datensatz per RLS noch nicht gehört.
 */
export function AcceptInvite({
  token,
  clientName,
  vorgabeEmail,
  bereitsVerknuepft,
}: {
  token: string;
  clientName: string;
  vorgabeEmail: string | null;
  bereitsVerknuepft: boolean;
}) {
  const fest = (vorgabeEmail ?? "").trim() !== "";
  const [email, setEmail] = useState(vorgabeEmail ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  /*
    Ist hier schon jemand angemeldet — und wenn ja, unter welcher
    Adresse?

    Wer bereits unter der eingeladenen Adresse angemeldet ist, braucht
    sein Passwort nicht noch einmal. Dieser Fall entsteht nicht nur beim
    Testen: Ein Athlet, der seine Einladung schon halb angenommen hat
    oder den Link ein zweites Mal oeffnet, sitzt genau davor. Ihn nach
    einem Passwort zu fragen, das die App gerade nicht braucht, ist eine
    Huerde ohne Zweck — und er hat es womoeglich gerade erst gesetzt.
  */
  const [angemeldetAls, setAngemeldetAls] = useState<string | null>(null);

  useEffect(() => {
    let aktiv = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (aktiv) setAngemeldetAls(data.user?.email?.toLowerCase() ?? null);
      });
    return () => {
      aktiv = false;
    };
  }, []);

  const passt =
    angemeldetAls !== null &&
    angemeldetAls === (email.trim().toLowerCase() || null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const db = createClient();
    const adresse = email.trim().toLowerCase();

    /*
      Erst eine fremde Sitzung beenden.

      Der Fall aus dem Testlauf: Auf dem Handy liegt noch die Anmeldung
      von vorhin. Man oeffnet den Einladungslink, `signUp` scheitert
      still oder liefert die ALTE Sitzung zurueck — und die Einladung
      wird fuer das falsche Konto angenommen. Der Eingeladene landet in
      einer App ohne Daten, und der Link ist verbraucht.

      Deshalb: Wer hier ankommt und schon unter einer anderen Adresse
      angemeldet ist, wird abgemeldet. Wer unter DERSELBEN Adresse
      angemeldet ist, bleibt es — das ist der zweite Klick auf denselben
      Link und kein Grund, jemanden hinauszuwerfen.
    */
    const { data: bisher } = await db.auth.getUser();
    const schonDrin =
      bisher.user !== null &&
      (bisher.user.email ?? "").toLowerCase() === adresse;

    if (bisher.user && !schonDrin) await db.auth.signOut();

    /*
      Erst anlegen, bei Misserfolg anmelden.

      Die Reihenfolge ist Absicht und nicht umzudrehen: Ein Anmeldeversuch
      mit falschem Passwort zählt bei Supabase gegen die Sperre, ein
      Registrierungsversuch auf eine vorhandene Adresse nicht.
    */
    // Schon unter dieser Adresse angemeldet: nichts zu tun, direkt
    // verknüpfen. Ein Passwort abzufragen, das die App nicht braucht,
    // wäre eine Hürde ohne Zweck.
    const signUp = schonDrin
      ? { error: null }
      : await db.auth.signUp({
          email: adresse,
          password,
          options: { data: { role: "athlete", full_name: clientName } },
        });

    if (signUp.error) {
      const signIn = await db.auth.signInWithPassword({
        email: adresse,
        password,
      });
      if (signIn.error) {
        setError(
          /already registered|already exists/i.test(signUp.error.message)
            ? "Zu dieser Adresse gibt es schon ein Konto. Trag dein " +
              "bisheriges Passwort ein — oder setz es unter " +
              "„Passwort vergessen“ neu und komm dann hierher zurück."
            : /invalid login credentials/i.test(signIn.error.message)
              ? "E-Mail oder Passwort stimmt nicht."
              : signUp.error.message,
        );
        setBusy(false);
        return;
      }
    }

    const { error: linkError } = await db.rpc("accept_client_invite", {
      invite_token: token,
    });

    if (linkError) {
      /*
        Seit 0024 kommt hier ein Satz an, den man lesen kann — vorher
        lief dieser Fall ohne jeden Fehler durch und der Eingeladene
        stand in einer App ohne Daten. Die Meldung aus der Datenbank
        wird deshalb durchgereicht und nicht übersetzt: Sie ist bereits
        auf Deutsch und sagt, was zu tun ist.
      */
      setError(linkError.message);
      setBusy(false);
      return;
    }

    setDone(true);
    // Kurz bestätigen, dann direkt in den Trainingsbereich.
    setTimeout(() => window.location.assign("/athlete"), 1200);
  }

  if (done) {
    return (
      <div className="pt-card">
        <p style={{ margin: 0, fontWeight: 500 }}>Alles klar, {clientName}.</p>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: "var(--pt-fs-base)",
            color: "var(--pt-text-dim)",
            lineHeight: 1.5,
          }}
        >
          Dein Konto ist mit deinem Coach verknüpft. Wir bringen dich zu deinem
          Trainingsbereich …
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="pt-card"
      style={{ display: "grid", gap: 14 }}
    >
      <label style={{ display: "grid", gap: 6 }}>
        <span className="pt-label">E-Mail</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          readOnly={fest}
          /*
            `readOnly` statt `disabled`: Ein deaktiviertes Feld wird vom
            Browser nicht mitgeschickt und von manchen Vorlesehilfen
            übersprungen. Der Klient soll die Adresse sehen und
            vorgelesen bekommen — nur nicht ändern.
          */
          style={
            fest
              ? { background: "var(--pt-surface-2, #f1efec)", cursor: "default" }
              : undefined
          }
        />
      </label>

      {fest && (
        <p
          style={{
            margin: "-6px 0 0",
            fontSize: "var(--pt-fs-xs)",
            color: "var(--pt-text-dim)",
            lineHeight: 1.5,
          }}
        >
          Die Adresse hat dein Coach hinterlegt. Stimmt sie nicht, sag ihm
          Bescheid — er schickt dir dann eine neue Einladung.
        </p>
      )}

      {passt ? (
        <p
          style={{
            margin: 0,
            fontSize: "var(--pt-fs-base)",
            color: "var(--pt-text-dim)",
            lineHeight: 1.55,
          }}
        >
          Du bist bereits unter dieser Adresse angemeldet — kein Passwort
          nötig.
        </p>
      ) : (
        <label style={{ display: "grid", gap: 6 }}>
          <span className="pt-label">
            {bereitsVerknuepft ? "Dein Passwort" : "Passwort wählen"}
          </span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={bereitsVerknuepft ? undefined : "mindestens 8 Zeichen"}
            autoComplete={
              bereitsVerknuepft ? "current-password" : "new-password"
            }
          />
        </label>
      )}

      {error && (
        <div>
          <p
            style={{
              margin: 0,
              color: "var(--pt-action)",
              fontSize: "var(--pt-fs-base)",
              lineHeight: 1.5,
            }}
          >
            {error}
          </p>
          {/*
            Der Weg raus, nicht nur der Hinweis darauf. Wer sein altes
            Passwort nicht mehr weiß, müsste sonst die Einladung
            verlassen — und der Link ist dann im Zweifel weg.
          */}
          {error.includes("Passwort vergessen") && (
            <p style={{ margin: "8px 0 0", fontSize: "var(--pt-fs-base)" }}>
              <Link
                href="/auth/passwort"
                style={{ color: "var(--pt-action)", fontWeight: 500 }}
              >
                Passwort zurücksetzen
              </Link>
            </p>
          )}
        </div>
      )}

      <button type="submit" className="pt-btn" disabled={busy}>
        {busy
          ? "Moment …"
          : passt
            ? "Einladung annehmen"
            : bereitsVerknuepft
              ? "Anmelden"
              : "Konto anlegen"}
      </button>
    </form>
  );
}
