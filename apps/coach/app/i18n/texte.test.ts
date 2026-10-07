import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { VolumeChange } from "@ptfive/coach-engine";
import { de } from "./de";
import { en } from "./en";

/** Alle Zeichenketten eines Wörterbuchs, Funktionen ausgenommen. */
function blaetter(o: unknown, pfad = ""): [string, string][] {
  if (typeof o === "string") return [[pfad, o]];
  if (Array.isArray(o)) return o.flatMap((x, i) => blaetter(x, `${pfad}[${i}]`));
  if (o && typeof o === "object") {
    return Object.entries(o).flatMap(([k, v]) => blaetter(v, pfad ? `${pfad}.${k}` : k));
  }
  return [];
}

describe("Wörterbücher", () => {
  it("Englisch enthält keine deutschen Sonderzeichen", () => {
    // Fängt den häufigsten Fehler beim Anlegen: den deutschen Text in
    // beide Dateien kopiert und die englische nie übersetzt.
    const deutsch = blaetter(en).filter(([, v]) => /[äöüÄÖÜß]/.test(v));
    // „Deutsch" in der Sprachwahl ist Absicht — jede Sprache in ihrer
    // eigenen Schreibweise.
    const echt = deutsch.filter(([k]) => k !== "language.de");
    assert.deepEqual(echt, []);
  });

  it("kein leerer Text", () => {
    for (const d of [de, en]) {
      const leer = blaetter(d).filter(([, v]) => v.trim() === "");
      assert.deepEqual(leer, []);
    }
  });

  it("die Prüfung selbst sieht deutsche Texte", () => {
    // Ohne diese Zeile könnte `blaetter` still nichts finden, und der
    // erste Test wäre immer grün.
    assert.ok(blaetter(de).some(([, v]) => /[äöü]/.test(v)));
  });
});

const punkt = (volumeKg: number) => ({
  sessionId: "s",
  performedAt: "2026-09-08T10:00:00Z",
  title: "Tag A",
  volumeKg,
  bodyweightSets: 0,
  bodyweightReps: 0,
});
const change = (prev: number | null, cur: number): VolumeChange => {
  const previous = prev === null ? null : punkt(prev);
  const deltaKg = prev === null ? 0 : cur - prev;
  const percent =
    prev === null ? null : prev > 0 ? Math.round((deltaKg / prev) * 100) : null;
  return { current: punkt(cur), previous, deltaKg, percent } as VolumeChange;
};

describe("Volumenvergleich", () => {
  it("benennt die Steigerung nüchtern, ohne Lob", () => {
    assert.equal(de.engine.volumeChange(change(800, 1000)), "25 % mehr als letztes Mal (+200 kg)");
    assert.equal(en.engine.volumeChange(change(800, 1000)), "25 % more than last time (+200 kg)");
  });
  it("benennt den Rückgang genauso nüchtern", () => {
    for (const d of [de, en]) {
      const t = d.engine.volumeChange(change(1000, 500));
      assert.ok(t.startsWith("50 %"), t);
      assert.ok(!/schlecht|schwach|leider|bad|weak|unfortunately|!/i.test(t), t);
    }
  });
  it("sagt beim ersten Mal, dass es das erste Mal ist", () => {
    assert.ok(de.engine.volumeChange(change(null, 800)).includes("Erstes Mal"));
    assert.ok(en.engine.volumeChange(change(null, 800)).includes("First time"));
  });
  it("erkennt Gleichstand", () => {
    assert.equal(de.engine.volumeChange(change(1000, 1000)), "Genauso viel wie letztes Mal.");
  });
  it("Zahlen je Sprache", () => {
    assert.equal(de.engine.volume(12400), "12.400 kg");
    assert.equal(en.engine.volume(12400), "12,400 kg");
    assert.equal(de.engine.volume(950.4), "950 kg");
  });
});

describe("Bestleistung", () => {
  it("der Text bewertet nicht", () => {
    for (const d of [de, en]) {
      for (const text of [
        d.engine.best({ deltaScore: 12, percent: 10, isFirst: false }),
        d.engine.best({ deltaScore: 80, percent: null, isFirst: true }),
      ]) {
        assert.ok(!text.includes("!"), text);
        for (const wort of ["super", "stark", "geil", "wahnsinn", "great", "amazing", "awesome"]) {
          assert.ok(!text.toLowerCase().includes(wort), text);
        }
      }
    }
  });
});
