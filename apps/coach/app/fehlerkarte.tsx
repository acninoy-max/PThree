import Image from "next/image";

/**
 * Die gemeinsame Hülle für 404 und Fehlerseite.
 *
 * WARUM DIE BEIDEN GLEICH AUSSEHEN, ABER NICHT DASSELBE SAGEN:
 * Eine falsche Adresse ist ein Missgeschick des Nutzers, ein Absturz
 * unser Problem. Die Formulierung muss das trennen — sonst entschuldigt
 * sich die App für etwas, das der Nutzer getan hat, oder sie schiebt ihm
 * etwas zu, das wir verbockt haben.
 *
 * Bewusst ohne Navigation: Bricht etwas weg, kann auch die
 * Rollenermittlung weggebrochen sein. Eine Leiste, die dann auf den
 * falschen Bereich zeigt, ist schlechter als keine.
 */
export function Fehlerkarte({
  titel,
  text,
  children,
}: {
  titel: string;
  text: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <Image
          src="/pt3-wordmark.png"
          alt="PTHREE"
          width={252}
          height={160}
          priority
          style={{ height: 50, width: "auto" }}
        />

        <div className="pt-card" style={{ marginTop: 22 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "var(--pt-fs-xl)",
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            {titel}
          </h1>
          <div
            style={{
              margin: "10px 0 0",
              fontSize: "var(--pt-fs-base)",
              color: "var(--pt-text-dim)",
              lineHeight: 1.6,
            }}
          >
            {text}
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
