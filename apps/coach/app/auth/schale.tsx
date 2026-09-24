import Image from "next/image";

/**
 * Die Huelle um die Anmelde-Nebenseiten.
 *
 * Dieselbe Anmutung wie /login — Wortmarke, eine Karte, sonst nichts.
 * Wer hier landet, kommt entweder aus einer Mail oder von einem Link im
 * Anmeldeformular. In beiden Faellen soll er sofort sehen, dass er noch
 * bei PTHREE ist und nicht auf einer fremden Seite.
 */
export function AuthSchale({
  titel,
  unterzeile,
  children,
}: {
  titel: string;
  unterzeile?: string;
  children: React.ReactNode;
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
          <h1
            style={{
              margin: "14px 0 0",
              fontSize: "var(--pt-fs-xl)",
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            {titel}
          </h1>
          {unterzeile && (
            <p
              style={{
                margin: "6px 0 0",
                color: "var(--pt-text-dim)",
                fontSize: "var(--pt-fs-md)",
                lineHeight: 1.5,
              }}
            >
              {unterzeile}
            </p>
          )}
        </div>
        {children}
      </div>
    </main>
  );
}
