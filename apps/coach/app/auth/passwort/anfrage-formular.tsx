"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

/**
 * Die Gruende, mit denen die Callback-Route zurueckschickt.
 *
 * Jeder Text sagt, was zu tun ist. „Ungueltiger Code" sagt das nicht —
 * und wer vor einer Meldung sitzt, die ihm nichts zu tun gibt, schreibt
 * seinem Trainer.
 */
const FEHLERTEXTE: Record<string, string> = {
  abgelaufen:
    "Der Link ist abgelaufen oder wurde schon benutzt. Fordere unten " +
    "einfach einen neuen an — das geht beliebig oft.",
  ungueltig:
    "Mit diesem Link stimmt etwas nicht. Fordere unten einen neuen an.",
  browser:
    "Der Link wurde in einem anderen Browser geoeffnet, als du ihn " +
    "angefordert hast. Fordere hier einen neuen an und oeffne die Mail " +
    "dann auf demselben Geraet.",
};

export function AnfrageFormular({ fehler }: { fehler: string | null }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [gesendet, setGesendet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const db = createClient();

    /*
      `window.location.origin` statt einer Variablen aus der Umgebung.

      Der Link muss dorthin zurueckfuehren, wo der Nutzer GERADE ist —
      also auf die Testadresse, wenn er lokal testet, und auf die
      Domain, wenn er draussen ist. Eine fest eingetragene Adresse ist
      genau dann falsch, wenn es darauf ankommt.

      Was trotzdem in Supabase stehen muss: dieselbe Adresse unter
      `Redirect URLs`. Steht sie dort nicht, ersetzt Supabase sie still
      durch die `Site URL` — und der Link landet auf der Startseite
      statt auf dem Formular.
    */
    const { error: fehlerVomDienst } = await db.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/passwort/neu`,
      },
    );

    /*
      Auch bei einem Fehler zeigen wir dieselbe Bestaetigung.

      Ein Formular, das bei unbekannten Adressen anders antwortet als
      bei bekannten, verraet, wer hier ein Konto hat. Die Ausnahme ist
      die Sperre von Supabase: Die betrifft den, der gerade davor
      sitzt, und der soll wissen, dass er warten muss statt nochmal zu
      klicken.
    */
    if (fehlerVomDienst && /rate|limit|seconds|security purposes/i.test(
      fehlerVomDienst.message,
    )) {
      setError(
        "Gerade wurde schon eine Mail an diese Adresse geschickt. " +
          "Warte eine Minute und versuch es dann noch einmal.",
      );
      setBusy(false);
      return;
    }

    setGesendet(true);
    setBusy(false);
  }

  if (gesendet) {
    return (
      <>
        <div className="pt-card">
          <p style={{ margin: 0, fontWeight: 500 }}>Mail ist unterwegs.</p>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: "var(--pt-fs-base)",
              color: "var(--pt-text-dim)",
              lineHeight: 1.55,
            }}
          >
            Falls ein Konto zu {email.trim() || "dieser Adresse"} gehoert,
            liegt gleich eine Mail im Postfach. Der Link darin gilt eine
            Stunde und funktioniert einmal.
          </p>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: "var(--pt-fs-base)",
              color: "var(--pt-text-dim)",
              lineHeight: 1.55,
            }}
          >
            Nichts da? Schau in den Spam-Ordner — und oeffne die Mail auf
            demselben Geraet, auf dem du gerade bist.
          </p>
        </div>
        <p
          style={{
            marginTop: 16,
            fontSize: "var(--pt-fs-base)",
            color: "var(--pt-text-dim)",
          }}
        >
          <Link href="/login" style={{ color: "var(--pt-action)", fontWeight: 500 }}>
            Zurueck zur Anmeldung
          </Link>
        </p>
      </>
    );
  }

  const hinweis = fehler ? FEHLERTEXTE[fehler] ?? FEHLERTEXTE.ungueltig : null;

  return (
    <>
      {hinweis && (
        <div
          className="pt-card"
          style={{ marginBottom: 14, borderColor: "var(--pt-action)" }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "var(--pt-fs-base)",
              lineHeight: 1.55,
            }}
          >
            {hinweis}
          </p>
        </div>
      )}

      <form onSubmit={submit} className="pt-card" style={{ display: "grid", gap: 14 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span className="pt-label">E-Mail</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="joel@ptfive.app"
            autoComplete="email"
            autoFocus
          />
        </label>

        {error && (
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
        )}

        <button type="submit" className="pt-btn" disabled={busy}>
          {busy ? "Moment …" : "Link schicken"}
        </button>
      </form>

      <p
        style={{
          marginTop: 16,
          fontSize: "var(--pt-fs-base)",
          color: "var(--pt-text-dim)",
        }}
      >
        Wieder eingefallen?{" "}
        <Link href="/login" style={{ color: "var(--pt-action)", fontWeight: 500 }}>
          Anmelden
        </Link>
      </p>
    </>
  );
}
