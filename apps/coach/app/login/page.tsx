"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

/**
 * Anmelden. Nur anmelden.
 *
 * WARUM HIER KEIN „KONTO ANLEGEN" MEHR STEHT: Bis Migration 0022 nahm
 * der Trigger in der Datenbank `coach` als Standardrolle — aus
 * Metadaten, die der Browser mitschickt. Wer die Adresse kannte, legte
 * sich ein Trainerkonto an. Fremde Daten haette er nicht gesehen, dafuer
 * sorgt die Zeilensicherheit; drin waere er gewesen.
 *
 * Seit 0022/0023 entsteht ein Trainerkonto nur ueber den
 * Dienstschluessel oder `promote_to_coach()` im SQL-Editor. Der Knopf
 * haette also weiter ein Konto angelegt — nur eben ein Athletenkonto
 * ohne Trainer, das nirgendwo hinfuehrt. Ein Knopf, der etwas anderes
 * tut als er verspricht, ist schlechter als keiner.
 *
 * Die beiden Wege ins Produkt sind jetzt:
 *   Athlet   — Einladungslink vom Trainer (/invite/[token])
 *   Trainer  — von Hand angelegt, dann promote_to_coach()
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const db = createClient();
    const { error: fehlerVomDienst } = await db.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (fehlerVomDienst) {
      /*
        Supabase antwortet mit „Invalid login credentials" — und zwar
        sowohl bei falschem Passwort als auch bei unbekannter Adresse.
        Das ist Absicht und soll so bleiben: Wer aus der Meldung lesen
        kann, welche Adressen ein Konto haben, hat die halbe Liste.

        Uebersetzt wird trotzdem. Die zweite Zeile sagt, was zu tun ist.
      */
      setError(
        /invalid login credentials/i.test(fehlerVomDienst.message)
          ? "E-Mail oder Passwort stimmt nicht."
          : /email not confirmed/i.test(fehlerVomDienst.message)
            ? "Diese Adresse ist noch nicht bestaetigt — schau in dein Postfach."
            : fehlerVomDienst.message,
      );
      setBusy(false);
      return;
    }

    // Harter Seitenwechsel: Die Rollenweiche sitzt in der Middleware und
    // auf `/`. Ein Wechsel ohne neue Anfrage laeuft daran vorbei.
    window.location.assign("/");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ marginBottom: 28 }}>
          <Image
            src="/pt3-wordmark.png"
            alt="PTHREE"
            width={252}
            height={160}
            priority
            style={{ height: 62, width: "auto" }}
          />
          <p
            style={{
              margin: "12px 0 0",
              color: "var(--pt-text-dim)",
              fontSize: "var(--pt-fs-md)",
              lineHeight: 1.5,
            }}
          >
            Anmelden — als Coach oder Athlet
          </p>
        </div>

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
              placeholder="joel@ptfive.app"
              autoComplete="email"
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="pt-label">Passwort</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
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
            {busy ? "Moment …" : "Anmelden"}
          </button>
        </form>

        <p
          style={{
            marginTop: 16,
            fontSize: "var(--pt-fs-base)",
            color: "var(--pt-text-dim)",
          }}
        >
          <Link
            href="/auth/passwort"
            style={{ color: "var(--pt-action)", fontWeight: 500 }}
          >
            Passwort vergessen?
          </Link>
        </p>

        <p
          style={{
            marginTop: 10,
            fontSize: "var(--pt-fs-base)",
            color: "var(--pt-text-dim)",
            lineHeight: 1.5,
          }}
        >
          Noch kein Zugang? Athleten bekommen einen Einladungslink von
          ihrem Coach.
        </p>
      </div>
    </main>
  );
}
