#!/usr/bin/env node
/**
 * Wächter für das Schriftraster.
 *
 * Die App hatte zwanzig verschiedene Schriftgrößen: 10,5 · 11 · 11,5 ·
 * 12 · 12,5 · 13 · 13,5 · 14 · 14,5 · 15 · 15,5 · 16 · 17 · 18 · 19 ·
 * 20 · 21 · 22 · 24 · 26. Keine davon war falsch, jede war frei
 * gewählt.
 *
 * Das ist der häufigste Grund, warum eine Oberfläche selbstgebaut
 * wirkt. Man sieht es nie an einer einzelnen Stelle — der Unterschied
 * zwischen 13 und 13,5 ist unsichtbar. Man spürt nur im Ganzen, dass
 * nichts zusammengehört.
 *
 * Jetzt stehen alle Größen als Token in `:root`. Dieser Prüfer meldet
 * jede Zahl, die daran vorbeigeht — denn genau so kommt die
 * einundzwanzigste Größe wieder herein: nicht als Entscheidung,
 * sondern weil in dem Moment 13,5 besser aussah.
 *
 * Er prüft auch, dass jedes Token wirklich benutzt wird. Ein Raster mit
 * toten Stufen ist kein Raster, sondern eine Liste.
 *
 *     node apps/coach/check-scale.mjs
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HIER = dirname(fileURLToPath(import.meta.url));
const APP = join(HIER, "app");
const GLOBALS = join(APP, "globals.css");

function dateien(pfad, endungen) {
  const out = [];
  for (const name of readdirSync(pfad)) {
    const voll = join(pfad, name);
    if (statSync(voll).isDirectory()) out.push(...dateien(voll, endungen));
    else if (endungen.some((e) => name.endsWith(e))) out.push(voll);
  }
  return out;
}

// ---------- Die Tokens aus :root lesen ----------
const css = readFileSync(GLOBALS, "utf8");
const wurzel = css.slice(css.indexOf(":root"), css.indexOf("}", css.indexOf(":root")));
const TOKENS = [...wurzel.matchAll(/--pt-fs-([a-z0-9]+)\s*:/g)].map((m) => m[1]);

// Selbstprüfung: Findet der Parser die Tokens nicht mehr, meldet er
// sonst fröhlich Entwarnung, obwohl er gar nichts geprüft hat.
if (TOKENS.length < 5) {
  console.error(
    "  FEHLER im Pruefer: keine --pt-fs-Tokens in globals.css gefunden.\n" +
      "  Ohne diese Meldung wuerde er faelschlich Entwarnung geben.",
  );
  process.exit(2);
}

/*
  Die eine erlaubte Ausnahme.

  `app/global-error.tsx` greift, wenn das Grundgeruest selbst
  weggebrochen ist — Layout, Splash, Toaster. In dem Moment ist die
  Annahme, das Stylesheet sei geladen, genau eine Annahme zu viel: Eine
  Notfallseite, die ihrerseits von etwas abhaengt, ist keine. Deshalb
  steht dort jede Groesse als Zahl im Markup.

  Bewusst eine feste Liste und kein Kommentarschalter im Code: Ein
  Schalter, den man an jede Datei schreiben kann, wandert mit dem ersten
  Termindruck durch die halbe App. Diese Liste muss man hier aendern,
  und dabei faellt einem auf, was man tut.
*/
const AUSNAHMEN = ["app/global-error.tsx"];

// Selbstpruefung fuer die Ausnahmen: Verschwindet eine Datei oder wird
// sie umbenannt, steht hier sonst stillschweigend eine Regel, die nichts
// mehr abdeckt — und beim naechsten Anlegen greift sie versehentlich.
for (const pfad of AUSNAHMEN) {
  if (!existsSync(join(HIER, pfad))) {
    console.error(
      `  FEHLER im Pruefer: Ausnahme "${pfad}" gibt es nicht mehr.\n` +
        "  Entweder die Datei wurde umbenannt oder die Liste ist veraltet.",
    );
    process.exit(2);
  }
}

const funde = [];
const benutzt = new Set();

// ---------- TSX: fontSize: 13.5 ----------
for (const datei of dateien(APP, [".ts", ".tsx"])) {
  if (AUSNAHMEN.includes(relative(HIER, datei))) continue;
  readFileSync(datei, "utf8")
    .split("\n")
    .forEach((zeile, i) => {
      for (const m of zeile.matchAll(/--pt-fs-([a-z0-9]+)/g)) benutzt.add(m[1]);

      const roh = zeile.trim();
      if (roh.startsWith("//") || roh.startsWith("*")) return;
      const treffer = roh.match(/fontSize:\s*([0-9]+(?:\.[0-9]+)?)/);
      if (!treffer) return;
      funde.push({
        datei: relative(HIER, datei),
        zeile: i + 1,
        text: `fontSize: ${treffer[1]}`,
      });
    });
}

// ---------- CSS: font-size: 13.5px ----------
for (const datei of dateien(APP, [".css"])) {
  const inhalt = readFileSync(datei, "utf8");
  for (const m of inhalt.matchAll(/--pt-fs-([a-z0-9]+)\s*\)/g)) benutzt.add(m[1]);

  // Die Definitionen in :root sind die einzigen erlaubten Zahlen.
  const ohneWurzel =
    datei === GLOBALS
      ? inhalt.slice(inhalt.indexOf("}", inhalt.indexOf(":root")))
      : inhalt;

  ohneWurzel.split("\n").forEach((zeile, i) => {
    const treffer = zeile.match(/font-size:\s*([0-9]+(?:\.[0-9]+)?)px/);
    if (!treffer) return;
    funde.push({
      datei: relative(HIER, datei),
      zeile: i + 1,
      text: `font-size: ${treffer[1]}px`,
    });
  });
}

const tot = TOKENS.filter((t) => !benutzt.has(t));

if (funde.length === 0 && tot.length === 0) {
  console.log(`  OK — ${TOKENS.length} Stufen, alle benutzt, keine freien`);
  console.log("       Schriftgroessen im Markup.");
  process.exit(0);
}

if (funde.length > 0) {
  console.log(`  ${funde.length} freie Schriftgroesse(n):\n`);
  for (const f of funde) {
    console.log(`   ${f.datei}:${f.zeile}`);
    console.log(`     ${f.text}`);
  }
  console.log(
    `\n   -> Eine der Stufen nehmen: ${TOKENS.map((t) => `--pt-fs-${t}`).join(", ")}`,
  );
  console.log(
    "      Passt keine, gehoert die neue Stufe nach :root in globals.css —",
  );
  console.log("      mit einem Satz dazu, wofuer sie da ist.\n");
}

if (tot.length > 0) {
  console.log(`  ${tot.length} Stufe(n) ohne Verwendung: ${tot.join(", ")}`);
  console.log("   -> Ein Raster mit toten Stufen ist eine Liste. Raus damit.\n");
}

process.exit(1);
