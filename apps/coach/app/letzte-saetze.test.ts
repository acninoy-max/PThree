import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { letzteSaetze, vorherFuer } from "./letzte-saetze";

const s = (w: number, r: number) => ({ weightKg: w, reps: r, isBodyweight: false });

describe("Letztes Mal je Satz", () => {
  const sessions = [
    { performedAt: "2026-10-20T08:00:00Z", slots: [{ exerciseId: "bank", sets: [s(70, 8), s(70, 8)] }] },
    // Ramp-up: 40, 60, 80 — genau Joëls Fall
    { performedAt: "2026-10-24T08:00:00Z", slots: [{ exerciseId: "bank", sets: [s(40, 10), s(60, 8), s(80, 6)] }] },
  ];

  it("nimmt die jüngste Einheit, Satz für Satz in Reihenfolge", () => {
    const l = letzteSaetze(sessions).bank!;
    assert.equal(l.on, "2026-10-24T08:00:00Z");
    assert.deepEqual(l.sets.map((x) => x.weightKg), [40, 60, 80]);
  });

  it("verlässt sich nicht auf die Reihenfolge der Abfrage", () => {
    const l = letzteSaetze([...sessions].reverse()).bank!;
    assert.deepEqual(l.sets.map((x) => x.weightKg), [40, 60, 80]);
  });

  it("Satz i bekommt Satz i, zusätzliche Sätze den letzten", () => {
    const l = letzteSaetze(sessions).bank;
    assert.equal(vorherFuer(l, 0)!.weightKg, 40);
    assert.equal(vorherFuer(l, 2)!.weightKg, 80);
    assert.equal(vorherFuer(l, 4)!.weightKg, 80);
    assert.equal(vorherFuer(undefined, 0), null);
  });

  it("leere Sätze zählen nicht, eine Einheit ohne Sätze überschreibt nichts", () => {
    const l = letzteSaetze([
      ...sessions,
      { performedAt: "2026-10-26T08:00:00Z", slots: [{ exerciseId: "bank", sets: [s(50, 0)] }] },
    ]).bank!;
    assert.equal(l.on, "2026-10-24T08:00:00Z");
  });

  it("zwei Slots derselben Übung in einer Einheit hängen hintereinander", () => {
    const l = letzteSaetze([
      { performedAt: "2026-10-27T08:00:00Z", slots: [
        { exerciseId: "bank", sets: [s(60, 8)] },
        { exerciseId: "bank", sets: [s(50, 12)] },
      ] },
    ]).bank!;
    assert.deepEqual(l.sets.map((x) => x.weightKg), [60, 50]);
  });
});
