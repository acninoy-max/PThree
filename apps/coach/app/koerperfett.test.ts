import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { koerperfettNavy, koerperfettVerlaeufe, koerperfettYmca, schaetzeKoerperfett } from "./koerperfett";

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

describe("Körperfett nach Navy und Auswahl der Methode", () => {
  it("Mann: Taille 90, Hals 38, 180 cm", () => {
    // 495 / (1,0324 − 0,19077·log10(52) + 0,15456·log10(180)) − 450 = 19,812
    assert.equal(koerperfettNavy(90, 38, null, 180, "male"), 19.8);
  });
  it("Frau: Taille 75, Hüfte 98, Hals 32, 168 cm", () => {
    // 495 / (1,29579 − 0,35004·log10(141) + 0,221·log10(168)) − 450 = 28,136
    assert.equal(koerperfettNavy(75, 32, 98, 168, "female"), 28.1);
  });
  it("Frau ohne Hüfte: keine Navy-Rechnung", () => {
    assert.equal(koerperfettNavy(75, 32, null, 168, "female"), null);
  });
  it("alles da: Navy", () => {
    const s = schaetzeKoerperfett({ tailleCm: 90, halsCm: 38, huefteCm: null, gewichtKg: 85, groesseCm: 180, geschlecht: "male" });
    assert.deepEqual(s, { wert: 19.8, methode: "navy" });
  });
  it("ohne Hals oder ohne Größe: Rückfall auf YMCA", () => {
    const ohneHals = schaetzeKoerperfett({ tailleCm: 90, halsCm: null, huefteCm: null, gewichtKg: 85, groesseCm: 180, geschlecht: "male" });
    assert.deepEqual(ohneHals, { wert: 17.7, methode: "ymca" });
    const ohneGroesse = schaetzeKoerperfett({ tailleCm: 90, halsCm: 38, huefteCm: null, gewichtKg: 85, groesseCm: null, geschlecht: "male" });
    assert.equal(ohneGroesse!.methode, "ymca");
  });
  it("ohne Taille oder Geschlecht: gar nichts", () => {
    assert.equal(schaetzeKoerperfett({ tailleCm: null, halsCm: 38, huefteCm: null, gewichtKg: 85, groesseCm: 180, geschlecht: "male" }), null);
    assert.equal(schaetzeKoerperfett({ tailleCm: 90, halsCm: 38, huefteCm: null, gewichtKg: 85, groesseCm: 180, geschlecht: null }), null);
  });
});

describe("Körperfett-Verläufe ohne Methodenmischung", () => {
  const mann = (taille: number, kg: number, hals: number | null) => ({
    tailleCm: taille, halsCm: hals, huefteCm: null, gewichtKg: kg, groesseCm: 180, geschlecht: "male" as const,
  });
  it("eine Navy-Woche allein: nur YMCA, über alle Wochen", () => {
    const v = koerperfettVerlaeufe([
      { on: "2026-10-19", werte: mann(90, 85, null) },
      { on: "2026-10-26", werte: mann(89, 84, 38) },
    ]);
    assert.equal(v.navy.length, 0);
    assert.deepEqual(v.ymca.map((p) => p.on), ["2026-10-19", "2026-10-26"]);
    // Gewicht und Taille sinken — YMCA sinkt mit, kein Scheinanstieg
    assert.ok(v.ymca[1]!.value < v.ymca[0]!.value);
  });
  it("ab zwei Navy-Wochen: Navy ab Start, YMCA nur davor", () => {
    const v = koerperfettVerlaeufe([
      { on: "2026-10-12", werte: mann(91, 86, null) },
      { on: "2026-10-19", werte: mann(90, 85, null) },
      { on: "2026-10-26", werte: mann(89, 84, 38) },
      { on: "2026-11-02", werte: mann(88, 83, 38) },
    ]);
    assert.deepEqual(v.navy.map((p) => p.on), ["2026-10-26", "2026-11-02"]);
    assert.deepEqual(v.ymca.map((p) => p.on), ["2026-10-12", "2026-10-19"]);
  });
  it("Reihenfolge der Eingabe egal", () => {
    const v = koerperfettVerlaeufe([
      { on: "2026-11-02", werte: mann(88, 83, 38) },
      { on: "2026-10-26", werte: mann(89, 84, 38) },
    ]);
    assert.deepEqual(v.navy.map((p) => p.on), ["2026-10-26", "2026-11-02"]);
  });
});
