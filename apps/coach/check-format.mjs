#!/usr/bin/env node
/**
 * Wächter gegen wiederkehrende Hydration-Fehler.
 *
 * Anlass war dieser Absturz auf dem iPhone:
 *
 *   Text content did not match.
 *   Server: " · abgeschickt Mi., 13:45"
 *   Client: " · abgeschickt Mi. 13:45"
 *
 * `Intl.DateTimeFormat` und `toLocaleDateString` greifen auf die
 * ICU-Bibliothek der jeweiligen Laufzeit zu. Node setzt zwischen
 * Wochentag und Uhrzeit ein Komma, Safari auf dem iPhone nicht. Der
 * Server erzeugt das HTML, der Browser rendert es beim Hydrieren noch
 * einmal — und der Text weicht ab.
 *
 * Der Fehler ist nicht am Mac zu sehen: Dort laufen Server und Browser
 * auf derselben Maschine mit derselben ICU-Fassung. Genau deshalb
 * braucht es eine Prüfung, die ihn im Code findet statt im Studio.
 *
 * Alle Formate stehen in app/format.ts und sind selbst gebaut.
 *
 *     node apps/coach/check-format.mjs
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const HIER = dirname(fileURLToPath(import.meta.url));
const APP = join(HIER, "app");

/** Die eine Datei, in der gebietsabhängige Formate stehen dürfen. */
const ERLAUBT = new Set([join(APP, "format.ts")]);

const MUSTER = [
  {
    regex: /new Intl\.DateTimeFormat\b/g,
    hinweis: "Nimm eine Funktion aus app/format.ts",
  },
  {
    regex: /\.toLocaleDateString\(/g,
    hinweis: "Nimm dateMedium() oder dayMonthShort() aus app/format.ts",
  },
  {
    regex: /\.toLocaleTimeString\(/g,
    hinweis: "Nimm time() aus app/format.ts",
  },
  {
    regex: /new Intl\.RelativeTimeFormat\b/g,
    hinweis: "Relative Zeitangaben laufen ebenfalls über die ICU der Laufzeit",
  },
];

/**
 * `toLocaleString` auf Zahlen ist unkritisch: Die Regeln für
 * Tausendertrennzeichen sind zwischen den ICU-Fassungen stabil, und die
 * Ausgabe hängt nicht von Abkürzungen ab. Datumsangaben tun das sehr
 * wohl.
 */

function dateien(pfad) {
  const out = [];
  for (const name of readdirSync(pfad)) {
    const voll = join(pfad, name);
    if (statSync(voll).isDirectory()) {
      out.push(...dateien(voll));
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(voll);
    }
  }
  return out;
}

const funde = [];

for (const datei of dateien(APP)) {
  if (ERLAUBT.has(datei)) continue;
  const text = readFileSync(datei, "utf8");
  const zeilen = text.split("\n");

  for (const { regex, hinweis } of MUSTER) {
    zeilen.forEach((zeile, i) => {
      // Kommentare zählen nicht — dort steht oft die Erklärung.
      const roh = zeile.trim();
      if (roh.startsWith("//") || roh.startsWith("*")) return;
      regex.lastIndex = 0;
      if (regex.test(zeile)) {
        funde.push({
          datei: relative(HIER, datei),
          zeile: i + 1,
          text: roh.slice(0, 78),
          hinweis,
        });
      }
    });
  }
}

if (funde.length === 0) {
  const anzahl = dateien(APP).length;
  console.log(`  OK — ${anzahl} Dateien geprueft, keine gebietsabhaengigen`);
  console.log("       Datumsformate ausserhalb von app/format.ts.");
  process.exit(0);
}

console.log(`  ${funde.length} Stelle(n), die auf dem Handy brechen koennen:\n`);
for (const f of funde) {
  console.log(`   ${f.datei}:${f.zeile}`);
  console.log(`     ${f.text}`);
  console.log(`     -> ${f.hinweis}\n`);
}
process.exit(1);
