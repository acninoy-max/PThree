"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

/**
 * Registrierung über Einladung.
 *
 * Wichtig: Die Rolle wird auf "athlete" gesetzt, damit der Trigger keinen
 * Coach-Eintrag anlegt. Danach verknüpft accept_client_invite das Profil mit
 * dem Klientendatensatz — das kann der Nutzer nicht selbst, weil ihm der
 * Datensatz per RLS noch nicht gehört.
 */
export function AcceptInvite({
  token,
  clientName,
}: {
  token: string;
  clientName: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const db = createClient();

    // Bestehendes Konto? Dann anmelden statt neu registrieren.
    const signUp = await db.auth.signUp({
      email,
      password,
      options: { data: { role: "athlete", full_name: clientName } },
    });

    if (signUp.error) {
      const signIn = await db.auth.signInWithPassword({ email, password });
      if (signIn.error) {
        setError(signUp.error.message);
        setBusy(false);
        return;
      }
    }

    const { error: linkError } = await db.rpc("accept_client_invite", {
      invite_token: token,
    });

    if (linkError) {
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
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span className="pt-label">Passwort wählen</span>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="mindestens 8 Zeichen"
          autoComplete="new-password"
        />
      </label>

      {error && (
        <p style={{ margin: 0, color: "var(--pt-action)", fontSize: "var(--pt-fs-base)" }}>
          {error}
        </p>
      )}

      <button type="submit" className="pt-btn" disabled={busy}>
        {busy ? "Moment …" : "Konto anlegen"}
      </button>
    </form>
  );
}
