#!/usr/bin/env node
/**
 * Wächter gegen Texte, die am Wörterbuch vorbei im Code stehen.
 *
 * Seit dem 07.10.2026 ist die Oberfläche zweisprachig (Englisch
 * Standard, Deutsch wählbar). Jeder Text gehört nach app/i18n/. Ein
 * deutscher Satz direkt im Markup kompiliert, läuft, sieht am Mac
 * richtig aus — und steht für jeden englischen Nutzer auf Deutsch da.
 * Genau die Art Fehler, die niemand meldet, weil sie nicht abstürzt.
 *
 * Gezählt wird je Datei:
 *   - JSX-Text mit Buchstaben            <p>Noch kein Plan.</p>
 *   - Zeichenketten, die deutsch aussehen   placeholder="Name eingeben"
 *     (Umlaut, ß oder ein typisch deutsches Wort)
 *   - Importe der alten Einzelformate aus app/format.ts
 *
 * Der Umbau läuft Bereich für Bereich. Deshalb gibt es eine Obergrenze
 * je Datei in texte-baseline.json, die nur sinken darf:
 *   - mehr als die Grenze, oder eine Datei ohne Eintrag mit Funden: Fehler
 *   - weniger: in Ordnung, und `--update` senkt die Grenze nach
 * `--update` hebt nie an und nimmt keine neue Datei auf. Wer einen Text
 * hinzufügt, muss ihn ins Wörterbuch schreiben — es gibt keinen
 * Schalter, der ihn durchwinkt.
 *
 * Code 2, wenn der Prüfer blind ist: TypeScript nicht ladbar, keine
 * Dateien gefunden, oder die Selbstprüfung erkennt die eingebauten
 * Beispiele nicht. Siehe PROJEKTSTAND.md, Abschnitt 7 (c).
 *
 *     node apps/coach/check-texte.mjs
 *     node apps/coach/check-texte.mjs --update
 */

import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, "..", "..");
const BASELINE = join(HIER, "texte-baseline.json");

let ts;
try {
  ts = createRequire(import.meta.url)("typescript");
} catch {
  console.error("check-texte: TypeScript nicht ladbar — erst 'pnpm install'.");
  process.exit(2);
}

/** Wo gesucht wird. Die Engine liefert ebenfalls Sätze für die Oberfläche. */
const ORTE = [join(HIER, "app"), join(WURZEL, "packages", "coach-engine", "src")];

/** Wo Texte hingehören — oder wo es keinen Provider gibt. */
function ausgenommen(datei) {
  const r = relative(WURZEL, datei);
  return (
    r.includes("/i18n/") ||
    /\.test\.tsx?$/.test(r) ||
    r.endsWith("app/format.ts")
  );
}

/** Steht in jeder Sprache gleich da. */
const NEUTRAL = /^(kg|cm|RIR|RPE|PTHREE|1RM|Check-ins?|Feed|E-Mail|OK|[x×·–—\-+%/:()\s\d.,]+)$/i;

const DEUTSCH = new RegExp(
  "[äöüÄÖÜß]|\\b(" +
    [
      "der", "die", "das", "und", "nicht", "mit", "für", "ist", "ein", "eine",
      "einen", "zu", "auf", "noch", "kein", "keine", "bitte", "wird", "werden",
      "oder", "nach", "bei", "von", "vom", "zum", "zur", "des", "dem", "sich",
      "dein", "deine", "du", "wir", "Klient", "Klienten", "Satz", "Sätze",
      "Gewicht", "Wiederholungen", "Wdh", "Einheit", "Termin", "Fehler",
      "angelegt", "gespeichert", "anlegen", "speichern", "Woche", "Tage?",
      "heute", "gestern", "morgen", "Ziel", "Ziele", "erste[snr]?",
      "neue[snr]?", "alle", "jetzt", "hier", "Monat", "Uhr", "Minuten?",
      "Sekunden?", "Tag", "Übung(en)?", "Trainingsplan", "Klientin",
    ].join("|") +
    ")\\b",
  "i",
);

const ALTE_FORMATE = /^@\/app\/format$|(^|\/)format$/;

function funde(quelle, name = "x.tsx") {
  const sf = ts.createSourceFile(name, quelle, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const liste = [];
  const zeile = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

  function besuche(n) {
    if (ts.isImportDeclaration(n)) {
      const von = n.moduleSpecifier.text;
      const namen = n.importClause?.namedBindings;
      // `formats`/`Locale` sind die neue Schnittstelle, alles andere die
      // alten deutschen Einzelfunktionen.
      if (ALTE_FORMATE.test(von) && namen && ts.isNamedImports(namen)) {
        for (const el of namen.elements) {
          if (!["formats", "Formats", "Locale"].includes(el.name.text)) {
            liste.push({ zeile: zeile(el), text: `import ${el.name.text} aus format.ts` });
          }
        }
      }
      return; // Modulpfade sind keine Texte.
    }
    if (ts.isJsxText(n)) {
      const t = n.text.replace(/\s+/g, " ").trim();
      if (/\p{L}{2}/u.test(t) && !NEUTRAL.test(t)) liste.push({ zeile: zeile(n), text: t });
    } else if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      if (DEUTSCH.test(n.text) && !NEUTRAL.test(n.text)) liste.push({ zeile: zeile(n), text: n.text });
    } else if (ts.isTemplateExpression(n)) {
      const teile = [n.head.text, ...n.templateSpans.map((s) => s.literal.text)].join(" ");
      if (DEUTSCH.test(teile)) liste.push({ zeile: zeile(n), text: teile });
    }
    ts.forEachChild(n, besuche);
  }
  besuche(sf);
  return liste;
}

// ---------- Selbstprüfung ----------
//
// Jede Art Fund einmal absichtlich eingebaut. Erkennt der Prüfer eine
// davon nicht, ist er blind — und ein blinder Prüfer meldet Entwarnung.
const PROBE = `
import { dateMedium } from "@/app/format";
export function A() {
  return <p title="Plan löschen">Noch kein Plan.</p>;
}
const b = \`\${n} Sätze\`;
const c = "Bitte einen Namen eingeben.";
const ok = "pt-btn";
`;
const probe = funde(PROBE);
const erwartet = ["import dateMedium", "Plan löschen", "Noch kein Plan.", "Sätze", "Bitte einen"];
for (const e of erwartet) {
  if (!probe.some((f) => f.text.includes(e))) {
    console.error(`check-texte: Selbstprüfung gescheitert — „${e}" nicht erkannt.`);
    process.exit(2);
  }
}
if (probe.some((f) => f.text === "pt-btn")) {
  console.error("check-texte: Selbstprüfung gescheitert — Klassenname als Text gezählt.");
  process.exit(2);
}

// ---------- Lauf ----------

function dateien(pfad) {
  const out = [];
  for (const name of readdirSync(pfad)) {
    if (name === "node_modules") continue;
    const voll = join(pfad, name);
    if (statSync(voll).isDirectory()) out.push(...dateien(voll));
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) out.push(voll);
  }
  return out;
}

const alle = ORTE.flatMap(dateien).filter((d) => !ausgenommen(d));
if (alle.length < 20) {
  console.error(`check-texte: nur ${alle.length} Dateien gefunden — Pfade prüfen.`);
  process.exit(2);
}

const ist = {};
const details = {};
for (const d of alle) {
  const f = funde(readFileSync(d, "utf8"), d);
  if (f.length > 0) {
    const r = relative(WURZEL, d);
    ist[r] = f.length;
    details[r] = f;
  }
}

const grenze = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : null;

if (process.argv.includes("--init")) {
  // Nur für den allerersten Lauf: schreibt den Ist-Stand als Grenze.
  if (grenze) {
    console.error("check-texte: Grenze existiert schon — --init nur einmal.");
    process.exit(1);
  }
  writeFileSync(BASELINE, JSON.stringify(sortiert(ist), null, 2) + "\n");
  console.log(`Grenze angelegt: ${summe(ist)} Texte in ${Object.keys(ist).length} Dateien.`);
  process.exit(0);
}

if (!grenze) {
  console.error("check-texte: texte-baseline.json fehlt.");
  process.exit(2);
}

const zuviel = [];
for (const [datei, n] of Object.entries(ist)) {
  const g = grenze[datei] ?? 0;
  if (n > g) zuviel.push({ datei, n, g });
}

if (process.argv.includes("--update")) {
  const neu = {};
  for (const [datei, g] of Object.entries(grenze)) {
    const n = Math.min(g, ist[datei] ?? 0);
    if (n > 0) neu[datei] = n;
  }
  writeFileSync(BASELINE, JSON.stringify(sortiert(neu), null, 2) + "\n");
  console.log(`Grenze: ${summe(grenze)} → ${summe(neu)}`);
}

if (zuviel.length > 0) {
  console.error("Texte am Wörterbuch vorbei (gehören nach app/i18n/):\n");
  for (const { datei, n, g } of zuviel) {
    console.error(`  ${datei}: ${n} statt höchstens ${g}`);
    for (const f of details[datei].slice(0, 12)) {
      console.error(`    :${f.zeile}  ${f.text.slice(0, 70)}`);
    }
  }
  process.exit(1);
}

const rest = summe(ist);
const offen = summe(grenze) - rest;
console.log(
  `OK — ${rest} Texte stehen noch im Code` +
    (offen > 0 ? ` (${offen} weniger als die Grenze; --update senkt sie).` : "."),
);

function summe(o) {
  return Object.values(o).reduce((a, b) => a + b, 0);
}
function sortiert(o) {
  return Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
}
