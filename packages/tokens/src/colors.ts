/**
 * PTHREE — Farb-Tokens
 * Quelle: Brand Book v16.0 (brand/PT_FIVE_Brand_Book_v16.pdf)
 *
 * Alle Kontrastwerte sind nachgerechnet (WCAG 2.1). Die Regeln stehen nicht
 * zur Diskussion — wo ein Token stehen darf, entscheidet der Kontrast.
 */

export const palette = {
  /** Canvas der Coach-Web-App. */
  editorialSand: "#F4F2ED",
  /** Canvas der Athlete-App (Gym-Floor, blendfrei). */
  obsidianInk: "#0F172A",

  /** Logo, Favicon, große Display-Grafik. NIE Fließtext (3,74:1 auf Sand). */
  vermilionGraphic: "#E63B2B",
  /** CTAs, Buttons (weißer Text), Links auf Sand. 5,02:1 / 5,62:1 — AA. */
  vermilionAction: "#C42D1A",
  /** Zahlen, 1RM, Satz-Logging auf Obsidian. 6,38:1 — AA. NIE auf Sand. */
  vermilionGym: "#FF6B5B",

  /** Dekorative Grid-/Trennlinien im Light Theme. Nicht an Bedienelementen. */
  sandBorder: "#D6D3CB",
  /** Dekorative Trennlinien/Karten im Dark Theme. Nicht an Bedienelementen. */
  obsidianBorder: "#2A3A4F",

  /** Rand interaktiver Elemente im Light Theme. 3,20:1 — WCAG 1.4.11. */
  inputBorderLight: "#8C877A",
  /**
   * Rand interaktiver Elemente im Dark Theme. 3,75:1 — WCAG 1.4.11.
   * Ergänzung zu v16.0 (dort als offener Punkt vermerkt): obsidianBorder
   * erreicht nur 1,54:1 und ist rein dekorativ.
   */
  inputBorderDark: "#64748B",

  white: "#FFFFFF",
} as const;

export type PaletteToken = keyof typeof palette;

/** Semantische Zuordnung für das helle Coach-Theme. */
export const lightTheme = {
  canvas: palette.editorialSand,
  surface: palette.white,
  textPrimary: palette.obsidianInk,
  textSecondary: "#6E6A60",
  accent: palette.vermilionAction,
  accentOn: palette.white,
  display: palette.vermilionGraphic,
  border: palette.sandBorder,
  borderInteractive: palette.inputBorderLight,
} as const;

/** Semantische Zuordnung für das dunkle Athlete-Theme (Gym-Floor). */
export const darkTheme = {
  canvas: palette.obsidianInk,
  surface: "#16202F",
  textPrimary: palette.editorialSand,
  textSecondary: "#8C99AC",
  accent: palette.vermilionGym,
  accentOn: palette.obsidianInk,
  display: palette.vermilionGym,
  border: palette.obsidianBorder,
  borderInteractive: palette.inputBorderDark,
} as const;

export type Theme = typeof lightTheme;

/**
 * Verbotene Kombinationen — dienen als ausführbare Dokumentation und werden
 * im Test gegen die berechneten Kontrastwerte geprüft.
 */
export const forbidden = [
  {
    fg: palette.vermilionGym,
    bg: palette.editorialSand,
    reason: "vermilion-gym auf Sand ergibt 2,50:1 und fällt durch.",
  },
  {
    fg: palette.vermilionGraphic,
    bg: palette.editorialSand,
    reason:
      "vermilion-graphic erreicht auf Sand nur 3,74:1 — ausschließlich Logo und große Display-Grafik.",
    largeOnly: true,
  },
] as const;
