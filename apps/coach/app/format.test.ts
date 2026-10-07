import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formats } from "./format";

// Mittwoch, 9. September 2026, 13:05 — lokale Zeit, wie im Browser.
const d = new Date(2026, 8, 9, 13, 5);

describe("formats — Deutsch", () => {
  const f = formats("de");
  it("Datum und Zeit wie bisher", () => {
    assert.equal(f.dateMedium(d), "9. Sept. 2026");
    assert.equal(f.dayMonthNumeric(d), "09.09.");
    assert.equal(f.weekdayTime(d), "Mi. 13:05");
    assert.equal(f.weekdayDateTime(d), "Mi. 9. Sept., 13:05");
    assert.equal(f.weekdayDayMonthLong(d), "Mittwoch, 09. September");
  });
  it("Zahlen mit Punkt als Tausender, Komma als Dezimal", () => {
    assert.equal(f.integer(12345), "12.345");
    assert.equal(f.decimal(82.5), "82,5");
    assert.equal(f.decimal(-1.25, 2), "-1,25");
  });
});

describe("formats — Englisch, europäisch", () => {
  const f = formats("en");
  it("Tag vor Monat, nie amerikanisch", () => {
    // "09/09" ist hier zweideutig — der 10. Oktober zeigt die Reihenfolge.
    assert.equal(f.dayMonthNumeric(new Date(2026, 9, 10)), "10/10");
    assert.equal(f.dayMonthNumeric(new Date(2026, 2, 7)), "07/03");
    assert.equal(f.dateMedium(d), "9 Sep 2026");
  });
  it("24-Stunden-Uhr, kein AM/PM", () => {
    assert.equal(f.time(d), "13:05");
    assert.equal(f.weekdayTime(d), "Wed 13:05");
  });
  it("Zahlen mit Komma als Tausender, Punkt als Dezimal", () => {
    assert.equal(f.integer(12345), "12,345");
    assert.equal(f.decimal(82.5), "82.5");
  });
  it("keine negative Null", () => {
    assert.equal(f.decimal(-0.01), "0.0");
  });
});
