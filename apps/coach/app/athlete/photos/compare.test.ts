import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  availablePoses,
  buildComparison,
  byPose,
  daysBetween,
  defaultComparison,
  nearestWeight,
  spanLabel,
  weeksBetween,
  type PhotoLike,
} from "./compare";

const foto = (id: string, takenOn: string, pose: PhotoLike["pose"]) => ({
  id,
  takenOn,
  pose,
});

describe("Zeitspannen", () => {
  it("zaehlt ganze Wochen, abgerundet", () => {
    assert.equal(weeksBetween("2026-01-01", "2026-01-22"), 3);
    // 20 Tage sind noch nicht drei Wochen.
    assert.equal(weeksBetween("2026-01-01", "2026-01-21"), 2);
  });

  it("zaehlt ueber Monatsgrenzen richtig", () => {
    assert.equal(daysBetween("2026-01-28", "2026-02-04"), 7);
  });

  it("rechnet ueber die Sommerzeit hinweg richtig", () => {
    // In Europa wird Ende Maerz umgestellt. Eine Rechnung in
    // Millisekunden auf UTC-Mitternacht verliert dabei eine Stunde und
    // rundet dann auf 6 Tage ab. Deshalb LOKALE Mitternacht.
    assert.equal(daysBetween("2026-03-25", "2026-04-01"), 7);
    assert.equal(spanLabel("2026-03-25", "2026-04-01"), "1 Woche");
  });

  it("unter einer Woche in Tagen", () => {
    assert.equal(spanLabel("2026-01-01", "2026-01-04"), "3 Tage");
    assert.equal(spanLabel("2026-01-01", "2026-01-02"), "1 Tag");
    assert.equal(spanLabel("2026-01-01", "2026-01-01"), "derselbe Tag");
  });

  it("Einzahl bei einer Woche", () => {
    assert.equal(spanLabel("2026-01-01", "2026-01-08"), "1 Woche");
    assert.equal(spanLabel("2026-01-01", "2026-01-15"), "2 Wochen");
  });
});

describe("nearestWeight", () => {
  const gewichte = [
    { on: "2026-01-04", kg: 88 },
    { on: "2026-02-01", kg: 85.5 },
    { on: "2026-03-01", kg: 83 },
  ];

  it("nimmt das naechstgelegene Check-in, nicht das gleiche Datum", () => {
    // Sonntag fotografiert, Montag gemeldet: exakte Treffer gibt es fast nie.
    assert.equal(nearestWeight(gewichte, "2026-01-31"), 85.5);
  });

  it("nimmt auch ein spaeteres Check-in, wenn es naeher liegt", () => {
    assert.equal(nearestWeight(gewichte, "2026-02-25"), 83);
  });

  it("zu weit weg zaehlt nicht", () => {
    // Ein halbes Jahr altes Gewicht neben ein heutiges Foto zu stellen
    // waere schlicht falsch.
    assert.equal(nearestWeight(gewichte, "2026-09-01"), null);
  });

  it("ohne Check-ins gibt es nichts", () => {
    assert.equal(nearestWeight([], "2026-01-01"), null);
  });
});

describe("defaultComparison", () => {
  const fotos = [
    foto("a", "2026-01-05", "front"),
    foto("b", "2026-02-05", "front"),
    foto("c", "2026-04-05", "front"),
    foto("d", "2026-02-05", "side"),
  ];
  const gewichte = [
    { on: "2026-01-04", kg: 88 },
    { on: "2026-04-05", kg: 81.5 },
  ];

  it("aeltestes gegen neuestes, nicht die letzten beiden", () => {
    // Zwei Aufnahmen im Abstand einer Woche unterscheiden sich nicht
    // sichtbar. Ein Vergleich, in dem man nichts sieht, entmutigt.
    const v = defaultComparison(fotos, "front", gewichte)!;
    assert.equal(v.before.id, "a");
    assert.equal(v.after.id, "c");
  });

  it("nennt die Spanne und die Gewichtsdifferenz", () => {
    const v = defaultComparison(fotos, "front", gewichte)!;
    assert.equal(v.span, "12 Wochen");
    assert.equal(v.weightDelta, -6.5);
  });

  it("ein einziges Bild ergibt keinen Vergleich", () => {
    assert.equal(defaultComparison(fotos, "side", gewichte), null);
  });

  it("gar kein Bild dieser Ansicht ergibt keinen Vergleich", () => {
    assert.equal(defaultComparison(fotos, "back", gewichte), null);
  });

  it("ohne Gewicht auf EINER Seite keine Differenz", () => {
    // Eine Differenz gegen eine fehlende Zahl ist keine Differenz —
    // und "-88 kg" waere eine beeindruckende Falschaussage.
    const nurEins = [{ on: "2026-01-04", kg: 88 }];
    const v = defaultComparison(fotos, "front", nurEins)!;
    assert.equal(v.weightDelta, null);
  });

  it("ohne Gewichte ueberhaupt bleibt der Vergleich nutzbar", () => {
    const v = defaultComparison(fotos, "front")!;
    assert.equal(v.span, "12 Wochen");
    assert.equal(v.weightDelta, null);
  });
});

describe("Sortierung und Auswahl", () => {
  const fotos = [
    foto("c", "2026-04-05", "front"),
    foto("a", "2026-01-05", "front"),
    foto("b", "2026-02-05", "front"),
  ];

  it("byPose liefert aelteste zuerst, egal wie es hereinkommt", () => {
    assert.deepEqual(
      byPose(fotos, "front").map((f) => f.id),
      ["a", "b", "c"],
    );
  });

  it("availablePoses nennt nur Ansichten mit Bildern", () => {
    assert.deepEqual(availablePoses(fotos), ["front"]);
    assert.deepEqual(
      availablePoses([...fotos, foto("d", "2026-01-01", "back")]),
      ["front", "back"],
    );
  });

  it("availablePoses haelt die feste Reihenfolge ein", () => {
    // Vorne, Seite, Hinten — nicht die Reihenfolge des Hochladens.
    const gemischt = [
      foto("x", "2026-01-01", "back"),
      foto("y", "2026-01-01", "front"),
      foto("z", "2026-01-01", "side"),
    ];
    assert.deepEqual(availablePoses(gemischt), ["front", "side", "back"]);
  });
});

describe("buildComparison", () => {
  it("funktioniert auch rueckwaerts gewaehlt", () => {
    // Der Athlet darf links das neuere Bild waehlen. Die Spanne ist
    // ein Betrag, kein Vorzeichen.
    const v = buildComparison(
      foto("neu", "2026-04-05", "front"),
      foto("alt", "2026-01-05", "front"),
    );
    assert.equal(v.span, "12 Wochen");
  });
});
