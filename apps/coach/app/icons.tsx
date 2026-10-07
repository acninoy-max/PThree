/**
 * Icon-Set.
 *
 * Bewusst handgeschriebene Inline-SVGs statt einer Bibliothek: Es sind
 * ein Dutzend Symbole, sie erben Farbe und Größe vom Elternelement, und es
 * kommt kein Paket ins Bundle, das 1000 Icons mitschleppt.
 *
 * Alle nutzen currentColor und eine Strichstärke von 1.8 — passt zur
 * Schriftstärke 500/600 im Rest der Oberfläche.
 */

type IconProps = {
  size?: number;
  strokeWidth?: number;
  filled?: boolean;
};

function base(size: number, strokeWidth: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
  };
}

export function IconFeed({ size = 22, strokeWidth = 1.8, filled }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M4 6h10" opacity={filled ? 1 : 0.9} />
      <path d="M4 12h16" />
      <path d="M4 18h7" opacity={filled ? 1 : 0.9} />
      <circle cx="18" cy="6" r="2.4" fill={filled ? "currentColor" : "none"} />
    </svg>
  );
}

export function IconClients({
  size = 22,
  strokeWidth = 1.8,
  filled,
}: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <circle cx="9" cy="8" r="3.4" fill={filled ? "currentColor" : "none"} />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M16.5 6.2a3.2 3.2 0 0 1 0 5.6" opacity="0.75" />
      <path d="M18 14.8c1.9.7 3 2.6 3 5.2" opacity="0.75" />
    </svg>
  );
}

/** Eine Person — das eigene Profil. Nicht IconClients: Zwei Nachbarn
 *  in derselben Leiste mit demselben Zeichen heben die Unterscheidung
 *  auf, für die Zeichen da sind. */
export function IconUser({ size = 22, strokeWidth = 1.8, filled }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <circle cx="12" cy="8" r="3.6" fill={filled ? "currentColor" : "none"} />
      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
    </svg>
  );
}

export function IconCalendar({
  size = 22,
  strokeWidth = 1.8,
  filled,
}: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18" />
      <path d="M8 3v4M16 3v4" />
      {filled && (
        <rect
          x="6.5"
          y="13"
          width="4"
          height="4"
          rx="1"
          fill="currentColor"
          stroke="none"
        />
      )}
    </svg>
  );
}

export function IconDumbbell({ size = 22, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M4 9v6M7 7v10M17 7v10M20 9v6" />
      <path d="M7 12h10" />
    </svg>
  );
}

export function IconTrend({ size = 22, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M3 17l5.5-5.5 3.5 3.5L21 6" />
      <path d="M15 6h6v6" />
    </svg>
  );
}

export function IconPlus({ size = 20, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconLogout({ size = 20, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l-5-5 5-5" />
      <path d="M5 12h11" />
    </svg>
  );
}

export function IconClock({ size = 18, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function IconPin({ size = 18, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

export function IconCheck({ size = 18, strokeWidth = 2.2 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

export function IconX({ size = 18, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconChevronRight({ size = 18, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function IconChevronLeft({ size = 18, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function IconAlert({ size = 18, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M12 3.5L21 19H3l9-15.5z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconSpark({ size = 18, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
    </svg>
  );
}

/** Check-in: Sprechblase mit Herzschlaglinie — Kontakt plus Befinden. */
export function IconCheckIn({
  size = 22,
  strokeWidth = 1.8,
  filled,
}: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      {/* Im aktiven Zustand liegt eine blasse Füllung hinter der Kontur —
          die Kontur selbst bleibt voll deckend, sonst verschwindet sie. */}
      {filled && (
        <path
          d="M20.5 11.6c0 4-3.8 7.2-8.5 7.2-1 0-2-.15-2.9-.42L4 20.5l1.5-3.6C4.05 15.5 3.5 13.65 3.5 11.6c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2Z"
          fill="currentColor"
          stroke="none"
          opacity={0.14}
        />
      )}
      <path d="M20.5 11.6c0 4-3.8 7.2-8.5 7.2-1 0-2-.15-2.9-.42L4 20.5l1.5-3.6C4.05 15.5 3.5 13.65 3.5 11.6c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2Z" />
      <path d="M7.4 11.6h2.1l1.2-2.4 1.9 4.5 1.2-2.1h2.8" />
    </svg>
  );
}

export function IconMoon({ size = 18, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    </svg>
  );
}

/**
 * Übungsbibliothek — gestapelte Karten.
 *
 * Gibt es, weil „Tracken" und „Übungen" in der Tab-Leiste dieselbe
 * Hantel trugen. Zwei Nachbarn mit demselben Symbol heben die
 * Unterscheidung auf, für die Symbole da sind: Man liest dann jedes
 * Mal die Beschriftung, und dann kann man sie auch weglassen.
 *
 * Die Hantel bleibt beim Tracken — dort wird trainiert. Hier wird
 * nachgeschlagen, also ein Stapel.
 */
export function IconLibrary({ size = 22, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <rect x="3.5" y="5" width="17" height="5" rx="1.6" />
      <rect x="3.5" y="14" width="17" height="5" rx="1.6" />
      <path d="M7 7.5h3" />
      <path d="M7 16.5h3" />
    </svg>
  );
}

