/**
 * WCAG-2.1-Kontrastberechnung.
 *
 * Liegt bewusst im Token-Paket: Damit lässt sich jede neue Farbkombination
 * im Test prüfen, statt sie im Design-Tool zu schätzen.
 */

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : h;
  if (full.length !== 6) throw new Error(`Ungültiger Hex-Wert: ${hex}`);
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

/** Relative Luminanz nach WCAG 2.1. */
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Kontrastverhältnis zweier Farben, 1 bis 21. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

export type ContrastUse =
  | "body" // normaler Text — 4,5:1
  | "large" // ab 18pt bzw. 14pt fett — 3:1
  | "ui" // Bedienelemente und Grafiken — 3:1 (WCAG 1.4.11)
  | "decorative"; // Trennlinien ohne Bedeutung — keine Anforderung

const THRESHOLD: Record<ContrastUse, number> = {
  body: 4.5,
  large: 3,
  ui: 3,
  decorative: 0,
};

/** Prüft, ob eine Kombination für den gedachten Zweck zulässig ist. */
export function passes(fg: string, bg: string, use: ContrastUse): boolean {
  return contrastRatio(fg, bg) >= THRESHOLD[use];
}

/** Auf zwei Nachkommastellen gerundet — für Reports und Testausgaben. */
export function ratio(fg: string, bg: string): number {
  return Math.round(contrastRatio(fg, bg) * 100) / 100;
}
