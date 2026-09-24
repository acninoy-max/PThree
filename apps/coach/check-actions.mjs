#!/usr/bin/env node
/**
 * Waechter fuer "use server"-Dateien.
 *
 * Next.js laesst aus einer Datei mit `"use server"` nur EINES heraus:
 * asynchrone Funktionen. Alles andere — eine Konstante, eine Klasse,
 * eine gewoehnliche Funktion — bricht beim Bauen mit einer Meldung, die
 * auf die Datei zeigt und nicht auf die Zeile.
 *
 * Die Falle daran: `tsc --noEmit` findet es NICHT. Es ist kein
 * Typfehler, sondern eine Regel des Frameworks. Am Mac faellt es erst
 * bei `next build` auf, also kurz vor dem Ausrollen.
 *
 * Genau das ist mir beim Fotoblock passiert: `export const
 * CONSENT_VERSION = "v1"` in actions.ts, durch jede Typpruefung
 * gerutscht.
 *
 * Typ-Exporte sind erlaubt — die verschwinden beim Uebersetzen.
 *
 * ZWEITE PRUEFUNG: Funktionen ueber die Server-Grenze.
 *
 * Dieselbe Klasse, anderer Fall. Eine Server-Komponente darf einer
 * Client-Komponente keine Funktion als Prop mitgeben — alles, was
 * hinueber geht, muss sich als Text darstellen lassen. Next bricht mit
 * "Functions cannot be passed directly to Client Components" ab.
 *
 * Auch das sieht `tsc` nicht: Typseitig ist `(n: number) => string` ein
 * voellig korrekter Prop. Es ist keine Typfrage, sondern eine Regel des
 * Frameworks — und sie faellt erst auf, wenn jemand die Seite oeffnet.
 *
 * Passiert beim Hochzaehlen der Zahlen: `<CountUp format={(n) => ...}>`
 * in einer Server-Komponente. Seitdem nimmt CountUp einen Namen statt
 * einer Funktion.
 *
 *     node apps/coach/check-actions.mjs
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HIER = dirname(fileURLToPath(import.meta.url));
const APP = join(HIER, "app");

function dateien(pfad) {
  const out = [];
  for (const name of readdirSync(pfad)) {
    const voll = join(pfad, name);
    if (statSync(voll).isDirectory()) out.push(...dateien(voll));
    else if (/\.tsx?$/.test(name)) out.push(voll);
  }
  return out;
}

const funde = [];
let geprueft = 0;

for (const datei of dateien(APP)) {
  const text = readFileSync(datei, "utf8");
  // Die Anweisung muss ganz oben stehen, vor allem ausser Kommentaren.
  if (!/^\s*(\/\*[\s\S]*?\*\/\s*|\/\/.*\n\s*)*["']use server["']/.test(text)) {
    continue;
  }
  geprueft += 1;

  text.split("\n").forEach((zeile, i) => {
    const roh = zeile.trim();
    if (!roh.startsWith("export")) return;
    // Erlaubt: async-Funktionen und reine Typen.
    if (/^export\s+async\s+function\s/.test(roh)) return;
    if (/^export\s+(type|interface)\s/.test(roh)) return;
    if (/^export\s*\{\s*type\s/.test(roh)) return;

    funde.push({
      datei: relative(HIER, datei),
      zeile: i + 1,
      text: roh.slice(0, 72),
    });
  });
}

// ---------- B) Funktionen ueber die Server-Grenze ----------

const alleDateien = dateien(APP);

/** Module mit "use client" — deren Komponenten laufen im Browser. */
const clientModule = new Set(
  alleDateien.filter((d) =>
    /^\s*(\/\*[\s\S]*?\*\/\s*|\/\/.*\n\s*)*["']use client["']/.test(
      readFileSync(d, "utf8"),
    ),
  ),
);

/** Importpfad zu einer Datei aufloesen. */
function aufloesen(vonDatei, spec) {
  let basis;
  if (spec.startsWith("@/app/")) basis = join(APP, spec.slice("@/app/".length));
  else if (spec.startsWith("./") || spec.startsWith("../"))
    basis = join(dirname(vonDatei), spec);
  else return null; // Paket, kein eigenes Modul

  for (const e of [".tsx", ".ts", "/index.tsx", "/index.ts"]) {
    const versuch = basis + e;
    if (clientModule.has(versuch) || alleDateien.includes(versuch)) {
      return versuch;
    }
  }
  return null;
}

const grenzfunde = [];

for (const datei of alleDateien) {
  const text = readFileSync(datei, "utf8");
  // Nur Server-Komponenten: In einer Client-Datei ist alles erlaubt.
  if (clientModule.has(datei)) continue;
  if (/^\s*["']use server["']/.test(text)) continue;

  // Welche Namen kommen aus Client-Modulen?
  const ausClient = new Set();
  for (const m of text.matchAll(
    /import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g,
  )) {
    const ziel = aufloesen(datei, m[2]);
    if (!ziel || !clientModule.has(ziel)) continue;
    for (const roh of m[1].split(",")) {
      const name = roh.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop();
      if (name) ausClient.add(name.trim());
    }
  }
  if (ausClient.size === 0) continue;

  // JSX-Verwendungen mit einer Funktion als Prop.
  const zeilen = text.split("\n");
  for (const name of ausClient) {
    const muster = new RegExp(`<${name}[\\s>]`, "g");
    for (const treffer of text.matchAll(muster)) {
      /*
        Element-Kopf lesen — mit Klammertiefe.

        `indexOf(">")` reicht NICHT: In `format={(n) => …}` steht ein
        `>` mitten im Pfeil. Der Kopf war damit genau vor der Stelle
        abgeschnitten, die geprueft werden soll — der Pruefer meldete
        fleissig Entwarnung und hat den Fehler, fuer den er gebaut
        wurde, nicht gesehen.

        Also mitzaehlen: Nur ein `>` ausserhalb jeder geschweiften
        Klammer beendet das Tag.
      */
      const ab = treffer.index ?? 0;
      let tiefe = 0;
      let j = ab;
      for (; j < text.length; j += 1) {
        const c = text[j];
        if (c === "{") tiefe += 1;
        else if (c === "}") tiefe -= 1;
        else if (c === ">" && tiefe === 0) break;
      }
      const kopf = text.slice(ab, j);
      const prop = kopf.match(/([a-zA-Z]+)=\{\s*(?:\([^)]*\)|[a-zA-Z_$]+)\s*=>/);
      if (!prop) continue;
      grenzfunde.push({
        datei: relative(HIER, datei),
        zeile: text.slice(0, ab).split("\n").length,
        text: `<${name} ${prop[1]}={(…) => …}>`,
      });
    }
  }
}

if (funde.length === 0 && grenzfunde.length === 0) {
  console.log(`  OK — ${geprueft} "use server"-Datei(en) sauber, und keine`);
  console.log("       Funktion geht von einer Server- in eine");
  console.log("       Client-Komponente.");
  process.exit(0);
}

if (grenzfunde.length > 0) {
  console.log(
    `  ${grenzfunde.length} Funktion(en) ueber die Server-Grenze:\n`,
  );
  for (const f of grenzfunde) {
    console.log(`   ${f.datei}:${f.zeile}`);
    console.log(`     ${f.text}`);
    console.log(
      "     -> Next lehnt das ab. Statt der Funktion einen Namen",
    );
    console.log(
      "        uebergeben und die Formatierung in die Client-Komponente",
    );
    console.log("        legen.\n");
  }
}

console.log(`  ${funde.length} Export(e), die "next build" ablehnen wird:\n`);
for (const f of funde) {
  console.log(`   ${f.datei}:${f.zeile}`);
  console.log(`     ${f.text}`);
  console.log("     -> In eine eigene Datei ohne \"use server\" verschieben.\n");
}
process.exit(1);
