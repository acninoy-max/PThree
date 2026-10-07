"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useT } from "@/app/i18n/client";

const MINDESTLAENGE = 8;

export function NeuesPasswortFormular() {
  const t = useT();
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
      // Passwort nochmal eintippt — in seiner Sprache, ohne Fachbegriff.
      setError(
        /different from the old password/i.test(fehlerVomDienst.message)
          ? t.auth.newPassword.sameAsOld
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
        <span className="pt-label">{t.auth.newPassword.label}</span>
        <input
          type={zeigen ? "text" : "password"}
          required
          minLength={MINDESTLAENGE}
          value={passwort}
          onChange={(e) => setPasswort(e.target.value)}
          placeholder={t.auth.newPassword.placeholder(MINDESTLAENGE)}
          autoComplete="new-password"
          autoFocus
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span className="pt-label">{t.auth.newPassword.repeat}</span>
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
        {t.auth.newPassword.show}
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
              ? t.auth.newPassword.missing(MINDESTLAENGE - passwort.length)
              : t.auth.newPassword.mismatch)}
        </p>
      )}

      <button
        type="submit"
        className="pt-btn"
        disabled={busy || passwort.length < MINDESTLAENGE || ungleich}
      >
        {busy ? t.auth.login.busy : t.auth.newPassword.submit}
      </button>
    </form>
  );
}
