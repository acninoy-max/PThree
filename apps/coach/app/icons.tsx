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
 * Zahnrad — Einstellungen dieser Ansicht.
 *
 * Die erste Fassung zeichnete acht Striche, die vom Kreis nach aussen
 * zeigten. Aaron hat sie im Studio für eine Sonne gehalten, und er hatte
 * recht: Kreis plus Strahlen IST eine Sonne. Ein Zahnrad braucht Zähne,
 * die am Körper kleben und zwischen sich Lücken lassen.
 *
 * Also eine geschlossene Kontur: acht Zähne von je 22,5°, dazwischen
 * Lücken derselben Breite, aussen 9,4 und innen 7,1 als Radius. Die
 * Zahl der Zähne ist bewusst klein — bei 19px würden zwölf zu einem
 * gezackten Ring verschwimmen.
 */
export function IconGear({ size = 18, strokeWidth = 1.8 }: IconProps) {
  const ZAEHNE = 8;
  const AUSSEN = 9.4;
  const INNEN = 7.1;
  const schritt = 360 / ZAEHNE;
  const halb = schritt / 4; // Zahn und Luecke gleich breit

  const punkt = (grad: number, r: number) => {
    const b = ((grad - 90) * Math.PI) / 180;
    return `${(12 + Math.cos(b) * r).toFixed(2)} ${(12 + Math.sin(b) * r).toFixed(2)}`;
  };

  const kontur: string[] = [];
  for (let i = 0; i < ZAEHNE; i += 1) {
    const mitte = i * schritt;
    kontur.push(
      `${i === 0 ? "M" : "L"}${punkt(mitte - halb, AUSSEN)}`,
      `L${punkt(mitte + halb, AUSSEN)}`,
      `L${punkt(mitte + halb, INNEN)}`,
      `L${punkt(mitte + schritt - halb, INNEN)}`,
    );
  }

  return (
    <svg {...base(size, strokeWidth)}>
      <path d={`${kontur.join(" ")} Z`} strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3.1" />
    </svg>
  );
}

/** Pfeil nach oben — einen Abschnitt nach vorn schieben. */
export function IconArrowUp({ size = 18, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M12 19V5" />
      <path d="M6 11l6-6 6 6" />
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

/** Pfeil nach unten — einen Abschnitt nach hinten schieben. */
export function IconArrowDown({ size = 18, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M12 5v14" />
      <path d="M6 13l6 6 6-6" />
    </svg>
  );
}
