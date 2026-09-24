#!/usr/bin/env node
/**
 * Wächter gegen Layouts, die auf dem Handy nicht umbrechen können.
 *
 * Zweimal derselbe Fehler, beide Male erst auf Aarons iPhone gesehen:
 *
 *   1. Die Kopfnavigation hatte `style={{ display: "flex" }}`. Die Regel
 *      `display: none` aus `@media (max-width: 640px)` kam nie an — die
 *      Leiste blieb auf dem Handy stehen.
 *   2. Der Coach-Feed hatte
 *      `style={{ gridTemplateColumns: "minmax(0,2fr) minmax(240px,1fr)" }}`.
 *      Auf einem iPhone blieben zwei Spalten stehen, die linke etwa
 *      120px breit. Die Hinweiskarte brach Wort für Wort um, der
 *      Klientenname war abgeschnitten.
 *
 * Der Grund ist derselbe und lässt sich nicht wegdiskutieren: Ein
 * `style`-Attribut steht in der Kaskade über JEDER Regel aus einem
 * Stylesheet, auch über der aus `@media`.
 *
 * Am Laptop fällt das nie auf — dort ist das Layout ja richtig.
 *
 * ZWEI PRÜFUNGEN
 *
 * A) **Inline gegen Media-Query.** Der Prüfer liest `globals.css` und
 *    `athlete/gym.css` und merkt sich, welche Klasse welche Eigenschaft
 *    innerhalb eines `@media`-Blocks setzt. Trägt ein Element eine
 *    solche Klasse UND dieselbe Eigenschaft inline, ist die Media-Query
 *    tot. Das ist keine Faustregel, sondern aus den Dateien abgeleitet —
 *    deshalb keine Fehlalarme für das harmlose
 *    `<label className="pt-label" style={{ display: "grid" }}>`.
 *
 * B) **Feste Spaltenbreiten inline.** Ein Raster mit einer
 *    Mindestbreite in Pixeln (`minmax(240px, 1fr)`) kann nicht
 *    schrumpfen. Inline ist es auf jeder Bildschirmbreite dasselbe.
 *    `repeat(auto-fit, …)` bricht selbst um und ist erlaubt.
 *
 * Was stattdessen zu tun ist: `.pt-split`, `.pt-cols`, `.pt-cols--3`
 * oder eine neue Klasse in globals.css.
 *
 *     node apps/coach/check-layout.mjs
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HIER = dirname(fileURLToPath(import.meta.url));
const APP = join(HIER, "app");

const STYLESHEETS = [
  join(APP, "globals.css"),
  join(APP, "athlete", "gym.css"),
];

/** camelCase aus JSX zu CSS-Schreibweise: gridTemplateColumns → grid-template-columns. */
const zuCss = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/**
 * Welche Klasse setzt welche Eigenschaft innerhalb einer Media-Query?
 *
 * Bewusst ein grober Parser und kein CSS-Baum: Er muss nur Klassennamen
 * und Eigenschaftsnamen finden. Eine Zeile zu viel im Ergebnis wäre ein
 * Fehlalarm, eine zu wenig ein verpasster Fehler — deshalb steht unten
 * eine Selbstprüfung, die die beiden bekannten Fälle nachweist.
 */
function mediaRegeln() {
  const karte = new Map(); // Klasse -> Set von Eigenschaften

  for (const pfad of STYLESHEETS) {
    let css;
    try {
      css = readFileSync(pfad, "utf8");
    } catch {
      continue;
    }
    css = css.replace(/\/\*[\s\S]*?\*\//g, "");

    // Media-Blöcke ausschneiden: ab "@media … {" bis zur passenden "}".
    let i = 0;
    while (true) {
      const start = css.indexOf("@media", i);
      if (start === -1) break;
      const auf = css.indexOf("{", start);
      if (auf === -1) break;

      let tiefe = 1;
      let j = auf + 1;
      while (j < css.length && tiefe > 0) {
        if (css[j] === "{") tiefe += 1;
        else if (css[j] === "}") tiefe -= 1;
        j += 1;
      }
      const block = css.slice(auf + 1, j - 1);
      i = j;

      // Innerhalb des Blocks: Selektor { Deklarationen }
      for (const regel of block.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const klassen = [...regel[1].matchAll(/\.([a-zA-Z0-9_-]+)/g)].map(
          (m) => m[1],
        );
        const eigenschaften = [
          ...regel[2].matchAll(/([a-z-]+)\s*:/g),
        ].map((m) => m[1]);
        for (const k of klassen) {
          const vorhanden = karte.get(k) ?? new Set();
          for (const e of eigenschaften) vorhanden.add(e);
          karte.set(k, vorhanden);
        }
      }
    }
  }
  return karte;
}

function dateien(pfad) {
  const out = [];
  for (const name of readdirSync(pfad)) {
    const voll = join(pfad, name);
    if (statSync(voll).isDirectory()) out.push(...dateien(voll));
    else if (/\.tsx?$/.test(name)) out.push(voll);
  }
  return out;
}

const REGELN = mediaRegeln();

// ---------- Selbstprüfung ----------
//
// Ein Prüfer, der nichts findet, weil sein Parser nichts versteht, ist
// schlimmer als keiner: Er meldet Entwarnung. Deshalb muss er die
// beiden Regeln nachweisen können, die die echten Fehler verursacht
// haben.
const PFLICHT = [
  ["pt-headernav", "display"],
  ["pt-split", "grid-template-columns"],
];
for (const [klasse, eigenschaft] of PFLICHT) {
  if (!REGELN.get(klasse)?.has(eigenschaft)) {
    console.error(
      `  FEHLER im Pruefer: .${klasse} { ${eigenschaft} } in einer\n` +
        "  Media-Query nicht gefunden. Der Parser liest das Stylesheet\n" +
        "  nicht mehr richtig — ohne diese Meldung wuerde er faelschlich\n" +
        "  Entwarnung geben.",
    );
    process.exit(2);
  }
}

const funde = [];
const alle = dateien(APP);

for (const datei of alle) {
  const zeilen = readFileSync(datei, "utf8").split("\n");

  zeilen.forEach((zeile, i) => {
    const roh = zeile.trim();
    if (roh.startsWith("//") || roh.startsWith("*")) return;

    // --- A) Inline schlaegt Media-Query ---
    const klassen = [...zeile.matchAll(/className="([^"]+)"/g)].flatMap((m) =>
      m[1].split(/\s+/),
    );
    if (klassen.length > 0) {
      // Der Element-Kopf reicht ueber mehrere Zeilen.
      const fenster = zeilen.slice(i, i + 12).join("\n");
      const bisEnde = fenster.slice(0, fenster.indexOf(">") + 1 || undefined);
      const inline = [...bisEnde.matchAll(/([a-zA-Z]+):\s*[^,}]+/g)].map((m) =>
        zuCss(m[1]),
      );

      for (const k of klassen) {
        const gesetzt = REGELN.get(k);
        if (!gesetzt) continue;
        for (const e of inline) {
          if (gesetzt.has(e)) {
            funde.push({
              datei: relative(HIER, datei),
              zeile: i + 1,
              text: `style setzt "${e}" — .${k} regelt das in einer Media-Query`,
              rat: `Nimm "${e}" aus dem style-Attribut. Inline gewinnt immer, die Media-Query ist damit wirkungslos.`,
            });
          }
        }
      }
    }

    // --- B) Feste Spaltenbreite inline ---
    const treffer = roh.match(/gridTemplateColumns:\s*"([^"]+)"/);
    if (!treffer) return;
    const wert = treffer[1];
    if (/auto-fit|auto-fill/.test(wert)) return;
    if (!/\d+\s*px/.test(wert)) return;

    funde.push({
      datei: relative(HIER, datei),
      zeile: i + 1,
      text: `gridTemplateColumns: "${wert}"`,
      rat: "Eine Spalte mit Mindestbreite in Pixeln kann nicht schrumpfen, und inline gilt sie auf jeder Breite. Nimm .pt-split oder .pt-cols aus globals.css.",
    });
  });
}

if (funde.length === 0) {
  console.log(`  OK — ${alle.length} Dateien geprueft, kein Inline-Style,`);
  console.log("       der eine Media-Query aushebelt.");
  process.exit(0);
}

console.log(`  ${funde.length} Stelle(n), die auf dem Handy nicht umbrechen:\n`);
for (const f of funde) {
  console.log(`   ${f.datei}:${f.zeile}`);
  console.log(`     ${f.text}`);
  console.log(`     -> ${f.rat}\n`);
}
process.exit(1);
