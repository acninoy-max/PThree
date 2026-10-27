import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { berechneSerie } from "./serie";
import { zeitpunkt } from "./zone";

// Einheit an einem Tag um 18:00 Amsterdam
const am = (tag: string, zeit = "18:00") => ({ performedAt: zeitpunkt(tag, zeit).toISOString() });
// KW: Mo 12.10., Mo 19.10., Mo 26.10.2026
const jetzt = zeitpunkt("2026-10-28", "12:00"); // Mittwoch

describe("Wochenziel und Serie", () => {
  it("zählt Wochen in Folge mit erreichtem Ziel", () => {
    const e = [am("2026-10-13"), am("2026-10-15"), am("2026-10-20"), am("2026-10-23"), am("2026-10-27")];
    const s = berechneSerie(e, 2, jetzt);
    assert.equal(s.dieseWoche, 1);
    assert.equal(s.geschafft, false);
    assert.equal(s.wochen, 2); // 12.10. und 19.10., laufende Woche bricht nicht
  });
  it("laufende Woche zählt mit, sobald geschafft", () => {
    const e = [am("2026-10-20"), am("2026-10-21"), am("2026-10-26"), am("2026-10-27")];
    const s = berechneSerie(e, 2, jetzt);
    assert.equal(s.geschafft, true);
    assert.equal(s.wochen, 2);
  });
  it("eine verfehlte Woche bricht die Serie", () => {
    const e = [am("2026-10-13"), am("2026-10-14"), am("2026-10-20"), am("2026-10-27"), am("2026-10-28")];
    assert.equal(berechneSerie(e, 2, jetzt).wochen, 1); // nur die laufende
  });
  it("zwei Einheiten am selben Tag sind ein Trainingstag", () => {
    const e = [am("2026-10-27", "08:00"), am("2026-10-27", "19:00")];
    assert.equal(berechneSerie(e, 2, jetzt).dieseWoche, 1);
  });
  it("00:30 in Amsterdam zählt zum neuen Tag, nicht zum Vortag (UTC)", () => {
    // Mo 26.10. 00:30 Amsterdam = So 25.10. 23:30 UTC
    const s = berechneSerie([am("2026-10-26", "00:30")], 1, jetzt);
    assert.equal(s.dieseWoche, 1);
  });
  it("knapp: jeder verbleibende Tag muss ein Trainingstag werden", () => {
    // Samstag, Ziel 3, erst 1 Tag, Serie aus der Vorwoche: Sa + So nötig
    const sa = zeitpunkt("2026-10-31", "09:00");
    const e = [am("2026-10-20"), am("2026-10-21"), am("2026-10-22"), am("2026-10-27")];
    const s = berechneSerie(e, 3, sa);
    assert.equal(s.tageUebrig, 2);
    assert.equal(s.knapp, true);
    assert.equal(berechneSerie(e, 3, zeitpunkt("2026-10-29", "09:00")).knapp, false);
  });
});
