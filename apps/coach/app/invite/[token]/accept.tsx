"use client";

import Link from "next/link";
import { useState } from "react";
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const db = createClient();
    const adresse = email.trim().toLowerCase();

    /*
      Erst anlegen, bei Misserfolg anmelden.

      Die Reihenfolge ist Absicht und nicht umzudrehen: Ein Anmeldeversuch
      mit falschem Passwort zählt bei Supabase gegen die Sperre, ein
      Registrierungsversuch auf eine vorhandene Adresse nicht.
    */
    const signUp = await db.auth.signUp({
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
          placeholder={
            bereitsVerknuepft ? undefined : "mindestens 8 Zeichen"
          }
          autoComplete={bereitsVerknuepft ? "current-password" : "new-password"}
        />
      </label>

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
        {busy ? "Moment …" : bereitsVerknuepft ? "Anmelden" : "Konto anlegen"}
      </button>
    </form>
  );
}
