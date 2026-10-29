import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { koerperfettYmca } from "./koerperfett";

describe("Körperfett nach YMCA", () => {
  it("Mann, 90 cm Taille, 85 kg: 17,7 %", () => {
    // Taille 35,433 in, 187,393 lb:
    // (−98,42 + 147,047 − 15,366) / 187,393 × 100 = 17,749 → 17,7
    assert.equal(koerperfettYmca(90, 85, "male"), 17.7);
  });
  it("Frau, 75 cm Taille, 62 kg: rund 25 %", () => {
    // 29,53 in, 136,69 lb: (−76,76 + 122,54 − 11,21) / 136,69 × 100 = 25,29
    assert.equal(koerperfettYmca(75, 62, "female"), 25.3);
  });
  it("mehr Taille bei gleichem Gewicht heißt mehr Körperfett", () => {
    assert.ok(koerperfettYmca(100, 85, "male")! > koerperfettYmca(90, 85, "male")!);
  });
  it("ohne Taille, Gewicht oder Geschlecht kein Wert", () => {
    assert.equal(koerperfettYmca(null, 85, "male"), null);
    assert.equal(koerperfettYmca(90, null, "male"), null);
    assert.equal(koerperfettYmca(90, 85, null), null);
  });
  it("Unplausibles (Tippfehler) wird null statt einer falschen Zahl", () => {
    assert.equal(koerperfettYmca(40, 120, "male"), null); // negativ
    assert.equal(koerperfettYmca(250, 50, "female"), null); // weit über 60 %
  });
});
