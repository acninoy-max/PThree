"use client";

/**
 * Der letzte Rettungsanker.
 *
 * `error.tsx` faengt Fehler INNERHALB des Grundgerüsts. Bricht das
 * Grundgerüst selbst weg — `layout.tsx`, der Splash, der Toaster —,
 * greift es nicht mehr. Dann kommt diese Datei.
 *
 * Deshalb bringt sie `html` und `body` selbst mit: Sie ERSETZT das
 * Grundgerüst, sie steckt nicht darin.
 *
 * Und deshalb steht hier jede Farbe und jeder Abstand direkt im Markup.
 * Wenn schon das Grundgerüst nicht laedt, ist die Annahme, das
 * Stylesheet sei da, genau eine Annahme zu viel. Eine Notfallseite, die
 * ihrerseits von etwas abhaengt, ist keine.
 *
 * Wie oft das vorkommt: fast nie. Was es kostet, wenn es fehlt: der
 * Browser zeigt seine eigene, englische Absturzmeldung.
 *
 * ZWEISPRACHIG STATT ÜBERSETZT: Hier gibt es keinen LocaleProvider —
 * der steckt im Grundgerüst, das gerade weggebrochen ist. Die Sprache
 * aus Cookie oder Browser selbst zu raten, könnte anders ausfallen als
 * auf dem Server und wäre dann ein Hydration-Fehler auf der Seite, die
 * keinen mehr verträgt. Also stehen beide Sprachen da, Englisch zuerst.
 * Deshalb ist diese Datei auch von check-texte.mjs ausgenommen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#F4F2ED",
          color: "#1C1B19",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#7A736A",
            }}
          >
            PTHREE
          </p>

          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 12,
              padding: "18px 20px",
              marginTop: 14,
            }}
          >
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
              The app couldn&apos;t start
            </h1>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 15,
                lineHeight: 1.6,
                color: "#57514A",
              }}
            >
              This is our fault, not yours. Try again — if it keeps
              happening, pass the reference below on to your coach.
            </p>
            <p
              lang="de"
              style={{
                margin: "10px 0 0",
                fontSize: 15,
                lineHeight: 1.6,
                color: "#57514A",
              }}
            >
              Die App konnte nicht starten. Das ist ein Fehler bei uns,
              nicht bei dir. Versuch es noch einmal — bleibt es dabei, gib
              deinem Trainer die Kennung unten durch.
            </p>

            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 16,
                padding: "11px 18px",
                border: "none",
                borderRadius: 8,
                background: "#C62B18",
                color: "#fff",
                fontWeight: 500,
                fontSize: 15,
              }}
            >
              Try again · Nochmal versuchen
            </button>

            {error.digest && (
              <p
                style={{
                  margin: "14px 0 0",
                  fontSize: 12,
                  color: "#7A736A",
                  fontFamily: "ui-monospace, Menlo, monospace",
                  wordBreak: "break-all",
                }}
              >
                Reference · Kennung: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
