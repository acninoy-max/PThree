"use client";

import { createClient } from "@/lib/supabase-browser";

/**
 * Der Zustand „angemeldet, aber zu diesem Zugang gehoert kein Klient".
 *
 * WARUM DAS EIN EIGENER BAUSTEIN IST: Bis hierher stand auf den
 * betroffenen Seiten nur ein Satz — „Melde dich bei deinem Trainer."
 * Und sonst nichts. Kein Weg zurueck, kein Abmelden, keine Angabe,
 * WELCHER Zugang das eigentlich ist.
 *
 * Genau dieser Zustand entsteht beim Testen staendig: Auf dem Handy
 * liegt noch die Sitzung von vorhin, man oeffnet einen Einladungslink,
 * und die Einladung wird fuer das ALTE Konto angenommen statt fuer das
 * neue. Ohne Abmeldeknopf kommt man da nur ueber „Websitedaten
 * loeschen" wieder raus — das weiss niemand, den man in eine Beta
 * einlaedt.
 *
 * Eine Sackgasse mit einem freundlichen Satz ist immer noch eine
 * Sackgasse.
 */
export function KeinKlientenkonto({
  loginEmail,
  bereich,
}: {
  loginEmail: string | null;
  bereich: string;
}) {
  async function abmelden() {
    await createClient().auth.signOut();
    window.location.assign("/login");
  }

  return (
    <main className="gym-shell" style={{ paddingTop: 26 }}>
      <p className="gym-label">{bereich}</p>
      <div className="gym-card" style={{ marginTop: 12 }}>
        <p style={{ margin: 0, fontSize: "var(--pt-fs-md)", lineHeight: 1.55 }}>
          Zu diesem Zugang gehört kein Klientenkonto.
        </p>

        {loginEmail && (
          <p
            style={{
              margin: "10px 0 0",
              fontSize: "var(--pt-fs-base)",
              color: "var(--g-dim)",
              lineHeight: 1.55,
            }}
          >
            Du bist angemeldet als <strong>{loginEmail}</strong>. Wenn dein
            Trainer dich unter einer anderen Adresse eingeladen hat, meld
            dich hier ab und öffne den Einladungslink noch einmal.
          </p>
        )}

        <button
          type="button"
          className="gym-btn"
          onClick={abmelden}
          style={{ marginTop: 14 }}
        >
          Abmelden
        </button>
      </div>
    </main>
  );
}
