import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bereichFaellig } from "./rhythmus";

const hat = (c: { gewicht: number | null }) => c.gewicht !== null;

describe("Rhythmus je Check-in-Bereich", () => {
  const verlauf = [
    { weekOf: "2026-10-05", gewicht: 80 },
    { weekOf: "2026-10-12", gewicht: null },
  ];
  it("jede Woche: immer dran", () => {
    assert.equal(bereichFaellig(verlauf, "2026-10-19", 1, hat), true);
  });
  it("alle 2 Wochen ab der letzten ausgefüllten Woche", () => {
    // zuletzt 05.10. → am 12.10. nicht, am 19.10. wieder
    assert.equal(bereichFaellig(verlauf, "2026-10-12", 2, hat), false);
    assert.equal(bereichFaellig(verlauf, "2026-10-19", 2, hat), true);
  });
  it("verpasst: beim nächsten Mal fragen, nicht neu warten", () => {
    assert.equal(bereichFaellig(verlauf, "2026-10-26", 2, hat), true);
  });
  it("noch nie ausgefüllt: sofort; diese Woche schon: bleibt sichtbar", () => {
    assert.equal(bereichFaellig([], "2026-10-26", 4, hat), true);
    assert.equal(bereichFaellig([{ weekOf: "2026-10-26", gewicht: 79 }], "2026-10-26", 4, hat), true);
  });
  it("über die Zeitumstellung (25.10.) zählt die Woche richtig", () => {
    assert.equal(bereichFaellig([{ weekOf: "2026-10-19", gewicht: 80 }], "2026-10-26", 2, hat), false);
  });
});
