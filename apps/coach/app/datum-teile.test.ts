import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { jahre, setzeDatum, tageImMonat, zerlegeDatum } from "./datum-teile";

describe("Geburtsdatum aus drei Feldern", () => {
  it("zerlegt und setzt wieder zusammen", () => {
    const teile = zerlegeDatum("1988-03-07");
    assert.deepEqual(teile, { tag: "7", monat: "3", jahr: "1988" });
    assert.equal(setzeDatum(teile), "1988-03-07");
  });
  it("leer bleibt leer, Unsinn wird leer", () => {
    assert.equal(setzeDatum(zerlegeDatum(null)), "");
    assert.equal(setzeDatum(zerlegeDatum("07.03.1988")), "");
  });
  it("halb ausgefüllt ist kein Datum", () => {
    assert.equal(setzeDatum({ tag: "7", monat: "", jahr: "1988" }), null);
    assert.equal(setzeDatum({ tag: "", monat: "3", jahr: "" }), null);
  });
  it("unmögliche Tage werden nicht still verschoben", () => {
    assert.equal(setzeDatum({ tag: "31", monat: "4", jahr: "1990" }), null);
    assert.equal(setzeDatum({ tag: "29", monat: "2", jahr: "1990" }), null);
    assert.equal(setzeDatum({ tag: "29", monat: "2", jahr: "1992" }), "1992-02-29");
  });
  it("Monatslängen und Jahresliste", () => {
    assert.equal(tageImMonat(2024, 2), 29);
    assert.equal(tageImMonat(2026, 12), 31);
    const j = jahre(2026);
    assert.equal(j[0], 2026);
    assert.equal(j.length, 101);
  });
});
