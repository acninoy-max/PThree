"use client";

import { useEffect } from "react";
import { Fehlerkarte } from "./fehlerkarte";

/**
 * Die Seite, die kommt, wenn etwas weggebrochen ist.
 *
 * Bis hierher gab es sie nicht — Next zeigt im Betrieb dann eine leere
 * weisse Seite. Die Rueckmeldung, die man darauf bekommt, lautet "die
 * App ist kaputt" und enthaelt nichts, womit man anfangen koennte.
 *
 * DREI ENTSCHEIDUNGEN:
 *
 * 1. `reset()` zuerst. Ein grosser Teil der Abstuerze sind
 *    Netzwerkaussetzer — im Studio, im Keller, im Aufzug. Die loesen
 *    sich durch einen zweiten Versuch, und der ist billiger als jede
 *    Fehlersuche.
 *
 * 2. Die `digest` steht da. Next ersetzt die echte Fehlermeldung im
 *    Betrieb durch eine Kennung, damit nichts Internes nach aussen
 *    dringt. Genau diese Kennung steht auch im Vercel-Protokoll —
 *    wer sie durchgibt, macht aus "geht nicht" einen findbaren Fall.
 *
 * 3. Kein "Es tut uns leid". Der Satz hilft niemandem und klingt nach
 *    Formular. Was hilft, ist zu wissen, was man jetzt tun kann.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Landet in den Vercel-Protokollen unter derselben Kennung.
    console.error("Unbehandelter Fehler:", error);
  }, [error]);

  return (
    <Fehlerkarte
      titel="Da ist etwas schiefgelaufen"
      text={
        <>
          Die Seite konnte nicht geladen werden. Meistens hilft ein zweiter
          Versuch — gerade wenn das Netz gerade schwach ist.
          <br />
          <br />
          Bleibt es dabei, schick deinem Trainer die Kennung unten. Damit
          lässt sich nachsehen, was genau passiert ist.
        </>
      }
    >
      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <button type="button" className="pt-btn" onClick={reset}>
          Nochmal versuchen
        </button>
        <a
          href="/"
          className="pt-btn pt-btn--ghost"
          style={{ textDecoration: "none" }}
        >
          Zur Startseite
        </a>
      </div>

      {error.digest && (
        <p
          style={{
            margin: "14px 0 0",
            fontSize: "var(--pt-fs-sm)",
            color: "var(--pt-text-dim)",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            wordBreak: "break-all",
          }}
        >
          Kennung: {error.digest}
        </p>
      )}
    </Fehlerkarte>
  );
}
