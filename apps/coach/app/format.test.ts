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
  it("num: nur so viele Stellen wie nötig", () => {
    assert.equal(f.num(80), "80");
    assert.equal(f.num(82.5), "82,5");
    assert.equal(f.num(1.25), "1,25");
    assert.equal(f.num(1234.5), "1.234,5");
  });
});

describe("signed — Veränderung mit Vorzeichen", () => {
  const de = formats("de");
  const en = formats("en");
  it("der Fall aus dem Meeting", () => {
    assert.equal(de.signed(-15), "\u221215");
  });
  it("Zunahme bekommt ein Plus, Dezimal je Sprache", () => {
    assert.equal(de.signed(2.5), "+2,5");
    assert.equal(en.signed(2.5), "+2.5");
  });
  it("das Minus ist U+2212, nicht der Bindestrich", () => {
    assert.equal(de.signed(-3).charCodeAt(0), 0x2212);
    assert.ok(!de.signed(-3).includes("-"));
  });
  it("keine leere Nachkommastelle", () => {
    assert.equal(de.signed(2.0), "+2");
    assert.equal(de.signed(-4.0), "\u22124");
  });
  it("eine Nachkommastelle, wo sie etwas sagt", () => {
    assert.equal(de.signed(-1.5), "\u22121,5");
    assert.equal(de.signed(0.7), "+0,7");
  });
  it("ab 100 ohne Nachkomma, mit Tausendertrenner je Sprache", () => {
    assert.equal(de.signed(2440.6), "+2.441");
    assert.equal(en.signed(2440.6), "+2,441");
    assert.equal(de.signed(-1200), "\u22121.200");
  });
  it("Rundung auf null heisst null — kein negatives Nichts", () => {
    assert.equal(de.signed(-0.04), "±0");
    assert.equal(de.signed(0), "±0");
    assert.equal(de.signed(0.04), "±0");
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
