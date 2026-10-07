"use client";

import { useEffect } from "react";
import { Fehlerkarte } from "./fehlerkarte";
import { useT } from "./i18n/client";

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
  const t = useT();
  useEffect(() => {
    // Landet in den Vercel-Protokollen unter derselben Kennung.
    console.error("Unbehandelter Fehler:", error);
  }, [error]);

  return (
    <Fehlerkarte
      titel={t.fehler.crash.title}
      text={
        <>
          {t.fehler.crash.body}
          <br />
          <br />
          {t.fehler.crash.bodyMore}
        </>
      }
    >
      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <button type="button" className="pt-btn" onClick={reset}>
          {t.fehler.crash.retry}
        </button>
        <a
          href="/"
          className="pt-btn pt-btn--ghost"
          style={{ textDecoration: "none" }}
        >
          {t.fehler.crash.home}
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
          {t.fehler.crash.digest}: {error.digest}
        </p>
      )}
    </Fehlerkarte>
  );
}
