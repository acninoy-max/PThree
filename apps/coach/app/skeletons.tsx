/**
 * Platzhalter für Ladezustände.
 *
 * Sie bilden die Form des echten Inhalts nach, damit beim Eintreffen der
 * Daten nichts springt. Next.js zeigt sie automatisch über die
 * loading.tsx-Dateien an, solange die Server-Komponente lädt.
 */

export function Bar({
  w = "100%",
  h = 14,
  mt = 0,
}: {
  w?: string | number;
  h?: number;
  mt?: number;
}) {
  return (
    <div className="pt-skel" style={{ width: w, height: h, marginTop: mt }} />
  );
}

export function Circle({ size = 30 }: { size?: number }) {
  return (
    <div
      className="pt-skel"
      style={{ width: size, height: size, borderRadius: "50%", flex: "none" }}
    />
  );
}

export function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="pt-card" style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Circle size={30} />
        <Bar w={130} h={13} />
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Bar
          key={i}
          w={i === lines - 1 ? "62%" : "88%"}
          h={11}
          mt={i === 0 ? 12 : 7}
        />
      ))}
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="pt-card pt-card--stat">
      <Bar w={82} h={10} />
      <Bar w={44} h={24} mt={8} />
    </div>
  );
}

/** Kopfbereich mit Kicker und Überschrift. */
export function HeaderSkeleton() {
  return (
    <div style={{ marginBottom: 20 }}>
      <Bar w={96} h={10} />
      <Bar w={210} h={26} mt={8} />
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
      role="status"
      aria-live="polite"
    >
      <span className="pt-spinner" aria-hidden="true" />
      {label && <span>{label}</span>}
    </span>
  );
}
