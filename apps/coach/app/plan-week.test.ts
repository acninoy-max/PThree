import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { naechsterTag } from "./plan-week";

const tage = [
  { id: "a1", planId: "coach" },
  { id: "a2", planId: "coach" },
  { id: "b1", planId: "solo" },
  { id: "b2", planId: "solo" },
  { id: "b3", planId: "solo" },
];

describe("Nächster Plantag bei mehreren Plänen", () => {
  it("bleibt im Plan des zuletzt gemachten Tages", () => {
    assert.equal(naechsterTag(tage, "a1")!.id, "a2");
    assert.equal(naechsterTag(tage, "b2")!.id, "b3");
  });
  it("nach dem letzten Tag wieder der erste desselben Plans", () => {
    assert.equal(naechsterTag(tage, "a2")!.id, "a1");
    assert.equal(naechsterTag(tage, "b3")!.id, "b1");
  });
  it("unbekannter oder kein letzter Tag: erster Tag überhaupt", () => {
    assert.equal(naechsterTag(tage, "alt")!.id, "a1");
    assert.equal(naechsterTag(tage, null)!.id, "a1");
    assert.equal(naechsterTag([], "a1"), null);
  });
});
