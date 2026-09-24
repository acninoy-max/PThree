"use client";

import { useEffect, useRef, useState } from "react";
import { volumeLabel } from "@ptfive/coach-engine";

/**
 * Eine Zahl, die beim Erscheinen hochläuft.
 *
 * Der billigste Trick der Branche, und er wirkt trotzdem: Eine Zahl,
 * die entsteht, liest sich als Ergebnis. Dieselbe Zahl, die einfach da
 * ist, liest sich als Angabe.
 *
 * VIER REGELN, DAMIT ES NICHT NERVT
 *
 * 1. **Nur beim ersten Erscheinen.** Ändert sich der Wert später, steht
 *    er sofort da. Eine Zahl, die bei jeder Änderung hochzählt, ist im
 *    Weg — und während des Trainings ändern sich Volumen und Sätze bei
 *    jedem Tastendruck.
 *
 * 2. **Kurz.** 550 ms. Darüber wartet man darauf, dass die App fertig
 *    wird, statt die Zahl zu lesen.
 *
 * 3. **Nicht bei kleinen Zahlen.** Von 0 auf 3 hochzuzählen sieht aus
 *    wie ein Fehler. Unter zehn steht der Wert sofort.
 *
 * 4. **Reduzierte Bewegung heisst keine Bewegung.** Dann steht die Zahl
 *    von Anfang an. Das ist keine halbe Umsetzung: Wer die Einstellung
 *    setzt, will genau das.
 *
 * Der Server zeichnet immer den Endwert. Nur so steht im HTML, was auch
 * ohne JavaScript gilt, und es gibt keinen Hydration-Unterschied.
 */
/**
 * Wie die Zahl aussieht.
 *
 * Ein Name und KEINE Funktion — das ist der Punkt, an dem ich schon
 * einmal danebenlag. Die Hälfte der Aufrufer sind Server-Komponenten,
 * und über die Grenze zwischen Server und Browser lässt sich nichts
 * schicken, was sich nicht als Text darstellen lässt. Eine Funktion
 * gehört dazu; Next bricht mit „Functions cannot be passed directly to
 * Client Components" ab.
 *
 * TypeScript sieht das nicht — es ist keine Typfrage, sondern eine
 * Regel des Frameworks.
 */
export type CountFormat = "integer" | "volume";

function formatieren(n: number, art: CountFormat): string {
  if (art === "volume") return volumeLabel(n);
  return String(Math.round(n));
}

export function CountUp({
  value,
  format = "integer",
  durationMs = 550,
}: {
  value: number;
  format?: CountFormat;
  durationMs?: number;
}) {
  // Startwert ist der Endwert: Auf dem Server und beim ersten Zeichnen
  // steht die fertige Zahl. Die Animation beginnt erst im Effekt.
  const [gezeigt, setGezeigt] = useState(value);
  const gelaufen = useRef(false);

  useEffect(() => {
    if (gelaufen.current) {
      setGezeigt(value);
      return;
    }
    gelaufen.current = true;

    if (typeof window === "undefined") return;
    const ruhig = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    if (ruhig || Math.abs(value) < 10) return;

    let id = 0;
    const start = performance.now();
    const tick = (jetzt: number) => {
      const p = Math.min(1, (jetzt - start) / durationMs);
      // Schnell los, sanft aus. Umgekehrt wirkt es zäh.
      const weich = 1 - Math.pow(1 - p, 3);
      setGezeigt(value * weich);
      if (p < 1) id = requestAnimationFrame(tick);
      else setGezeigt(value);
    };

    setGezeigt(0);
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [value, durationMs]);

  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      {formatieren(gezeigt, format)}
    </span>
  );
}
