import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { montagVon, plusTage, tagISO, wand, zeitpunkt } from "./zone";

describe("Zeitzone Amsterdam", () => {
  it("06:00 im Sommer ist 04:00 UTC — der Fehler vom 27.10.", () => {
    assert.equal(zeitpunkt("2026-10-20", "06:00").toISOString(), "2026-10-20T04:00:00.000Z");
  });
  it("06:00 im Winter ist 05:00 UTC", () => {
    assert.equal(zeitpunkt("2026-10-27", "06:00").toISOString(), "2026-10-27T05:00:00.000Z");
  });
  it("am Tag der Umstellung: vor und nach 03:00", () => {
    // 25.10.2026: 03:00 Sommerzeit wird 02:00 Winterzeit.
    assert.equal(zeitpunkt("2026-10-25", "01:00").toISOString(), "2026-10-24T23:00:00.000Z");
    assert.equal(zeitpunkt("2026-10-25", "06:00").toISOString(), "2026-10-25T05:00:00.000Z");
    // 29.03.2026: 02:00 wird 03:00.
    assert.equal(zeitpunkt("2026-03-29", "06:00").toISOString(), "2026-03-29T04:00:00.000Z");
  });
  it("Wanduhr liest zurück, was eingegeben wurde", () => {
    for (const [tag, zeit] of [["2026-07-01", "06:00"], ["2026-12-31", "23:30"], ["2026-01-01", "00:15"]] as const) {
      const w = wand(zeitpunkt(tag, zeit));
      assert.equal(`${String(w.stunde).padStart(2, "0")}:${String(w.minute).padStart(2, "0")}`, zeit);
      assert.equal(tagISO(zeitpunkt(tag, zeit)), tag);
    }
  });
  it("kurz nach Mitternacht in Amsterdam ist schon der nächste Tag", () => {
    // 23:30 UTC am 27.10. = 00:30 am 28.10. in Amsterdam
    assert.equal(tagISO(new Date("2026-10-27T23:30:00Z")), "2026-10-28");
    assert.equal(wand(new Date("2026-10-27T23:30:00Z")).wochentag, 3);
  });
  it("Kalenderrechnung ohne Uhrzeit", () => {
    assert.equal(plusTage("2026-10-30", 3), "2026-11-02");
    assert.equal(montagVon("2026-10-27"), "2026-10-26");
    assert.equal(montagVon("2026-11-01"), "2026-10-26");
    assert.equal(montagVon("2026-10-26"), "2026-10-26");
  });
  it("ungültige Eingabe gibt ein ungültiges Datum", () => {
    assert.ok(Number.isNaN(zeitpunkt("27.10.2026", "06:00").getTime()));
  });
});
