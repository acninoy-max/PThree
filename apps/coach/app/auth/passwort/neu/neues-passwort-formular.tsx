"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

const MINDESTLAENGE = 8;

export function NeuesPasswortFormular() {
  const [passwort, setPasswort] = useState("");
  const [wiederholung, setWiederholung] = useState("");
  const [zeigen, setZeigen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zuKurz = passwort.length > 0 && passwort.length < MINDESTLAENGE;
  const ungleich = wiederholung.length > 0 && wiederholung !== passwort;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (zuKurz || ungleich || passwort.length < MINDESTLAENGE) return;

    setBusy(true);
    setError(null);

    const db = createClient();
    const { error: fehlerVomDienst } = await db.auth.updateUser({
      password: passwort,
    });

    if (fehlerVomDienst) {
      // Die eine Meldung, die jeder zweite bekommt, der sein altes
      // Passwort nochmal eintippt — auf Deutsch und ohne Fachbegriff.
      setError(
        /different from the old password/i.test(fehlerVomDienst.message)
          ? "Das ist dein bisheriges Passwort. Waehle ein anderes."
          : fehlerVomDienst.message,
      );
      setBusy(false);
      return;
    }

    /*
      Harter Seitenwechsel statt `router.push`.

      Die Rollenweiche sitzt in der Middleware und auf `/`. Ein Wechsel
      im Browser ohne neue Anfrage laeuft daran vorbei, und der Athlet
      landet auf der Trainerseite. Dieselbe Entscheidung wie im
      Anmeldeformular.
    */
    window.location.assign("/");
  }

  return (
    <form onSubmit={submit} className="pt-card" style={{ display: "grid", gap: 14 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span className="pt-label">Neues Passwort</span>
        <input
          type={zeigen ? "text" : "password"}
          required
          minLength={MINDESTLAENGE}
          value={passwort}
          onChange={(e) => setPasswort(e.target.value)}
          placeholder={`mindestens ${MINDESTLAENGE} Zeichen`}
          autoComplete="new-password"
          autoFocus
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span className="pt-label">Nochmal zur Sicherheit</span>
        <input
          type={zeigen ? "text" : "password"}
          required
          value={wiederholung}
          onChange={(e) => setWiederholung(e.target.value)}
          autoComplete="new-password"
        />
      </label>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: "var(--pt-fs-base)",
          color: "var(--pt-text-dim)",
        }}
      >
        <input
          type="checkbox"
          checked={zeigen}
          onChange={(e) => setZeigen(e.target.checked)}
          style={{ width: "auto", margin: 0 }}
        />
        Passwort anzeigen
      </label>

      {/*
        Der Hinweis steht da, sobald er stimmt — nicht erst nach dem
        Absenden. Wer erst beim Klick erfaehrt, dass die Wiederholung
        nicht passt, tippt beide Felder neu.
      */}
      {(zuKurz || ungleich || error) && (
        <p
          style={{
            margin: 0,
            color: "var(--pt-action)",
            fontSize: "var(--pt-fs-base)",
            lineHeight: 1.5,
          }}
        >
          {error ??
            (zuKurz
              ? `Noch ${MINDESTLAENGE - passwort.length} Zeichen.`
              : "Die beiden Eingaben sind nicht gleich.")}
        </p>
      )}

      <button
        type="submit"
        className="pt-btn"
        disabled={busy || passwort.length < MINDESTLAENGE || ungleich}
      >
        {busy ? "Moment …" : "Passwort speichern"}
      </button>
    </form>
  );
}
