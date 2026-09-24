import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { LoggedSet, Session, SessionSlot } from "@ptfive/types";
import {
  comparableExercisePoints,
  defaultExerciseSelection,
  exerciseChange,
  exerciseHistory,
  exerciseTrend,
  exerciseValue,
  loggedExercises,
} from "./exercise-history";

let n = 0;

function set(
  weightKg: number,
  reps: number,
  bodyLoadKg: number | null = null,
): LoggedSet {
  n += 1;
  return {
    id: `set-${n}`,
    sessionSlotId: "slot",
    setNumber: n,
    weightKg,
    bodyLoadKg,
    reps,
    isBodyweight: weightKg === 0 && bodyLoadKg !== null,
    rir: null,
  };
}

function slot(exerciseId: string, sets: LoggedSet[]): SessionSlot {
  n += 1;
  return {
    id: `slot-${n}`,
    sessionId: "s",
    planSlotId: null,
    pattern: "push",
    muscleGroup: "chest",
    block: "compound",
    exerciseId,
    position: 1,
    sets,
  };
}

function session(id: string, on: string, slots: SessionSlot[]): Session {
  return {
    id,
    clientId: "c",
    coachId: "co",
    planId: null,
    planDayId: null,
    title: "Einheit",
    performedAt: on,
    isSelfDirected: false,
    // null = der Athlet selbst hat eingetragen.
    recordedBy: null,
    durationSeconds: null,
    isComplete: true,
    notes: null,
    slots,
  };
}

describe("loggedExercises", () => {
  const sessions = [
    session("a", "2026-08-01T10:00:00Z", [
      slot("bank", [set(100, 8), set(100, 8)]),
      slot("kniebeuge", [set(120, 5)]),
    ]),
    session("b", "2026-09-01T10:00:00Z", [
      slot("bank", [set(105, 8)]),
      slot("curl", [set(20, 12)]),
    ]),
  ];

  it("zaehlt Saetze und Einheiten je Uebung", () => {
    const liste = loggedExercises(sessions);
    const bank = liste.find((e) => e.exerciseId === "bank")!;
    assert.equal(bank.sets, 3);
    assert.equal(bank.sessions, 2);
    assert.equal(bank.lastPerformedAt, "2026-09-01T10:00:00Z");
  });

  it("nimmt auch die Uebung, die nur einmal vorkam", () => {
    const ids = loggedExercises(sessions).map((e) => e.exerciseId);
    assert.ok(ids.includes("curl"), "jede je getrackte Uebung muss dabei sein");
    assert.equal(ids.length, 3);
  });

  it("sortiert nach Haeufigkeit", () => {
    assert.equal(loggedExercises(sessions)[0]!.exerciseId, "bank");
  });

  it("ignoriert Saetze ohne Wiederholungen", () => {
    const s = [session("x", "2026-09-01T10:00:00Z", [slot("leer", [set(50, 0)])])];
    assert.deepEqual(loggedExercises(s), []);
  });

  it("zaehlt dieselbe Uebung zweimal in einer Einheit als eine Einheit", () => {
    const s = [
      session("x", "2026-09-01T10:00:00Z", [
        slot("bank", [set(100, 8)]),
        slot("bank", [set(90, 10)]),
      ]),
    ];
    const bank = loggedExercises(s)[0]!;
    assert.equal(bank.sets, 2);
    assert.equal(bank.sessions, 1, "eine Einheit, auch bei zwei Slots");
  });
});

describe("exerciseHistory", () => {
  const sessions = [
    session("b", "2026-09-01T10:00:00Z", [slot("bank", [set(105, 8)])]),
    session("a", "2026-08-01T10:00:00Z", [
      slot("bank", [set(100, 8), set(80, 12)]),
    ]),
    session("c", "2026-09-08T10:00:00Z", [slot("kniebeuge", [set(120, 5)])]),
  ];

  it("nimmt nur die gefragte Uebung", () => {
    const h = exerciseHistory(sessions, "bank");
    assert.deepEqual(
      h.map((p) => p.sessionId),
      ["a", "b"],
    );
  });

  it("sortiert aelteste zuerst", () => {
    const h = exerciseHistory(sessions, "bank");
    assert.ok(h[0]!.performedAt < h[1]!.performedAt);
  });

  it("nimmt den besten Satz, nicht den Durchschnitt", () => {
    const h = exerciseHistory(sessions, "bank");
    // 100x8 schlaegt 80x12 im geschaetzten 1RM.
    assert.equal(h[0]!.bestWeightKg, 100);
    assert.equal(h[0]!.bestReps, 8);
  });

  it("rechnet das Volumen ueber alle Saetze der Einheit", () => {
    const h = exerciseHistory(sessions, "bank");
    assert.equal(h[0]!.volumeKg, 100 * 8 + 80 * 12);
    assert.equal(h[0]!.sets, 2);
  });

  it("nutzt die wirksame Last, Klimmzuege bekommen eine echte Kurve", () => {
    const s = [
      session("k", "2026-09-01T10:00:00Z", [
        slot("klimmzug", [set(0, 8, 85), set(0, 6, 85)]),
      ]),
    ];
    const h = exerciseHistory(s, "klimmzug");
    assert.equal(h[0]!.isRepsOnly, false);
    assert.equal(Math.round(h[0]!.score), 108);
    assert.equal(h[0]!.volumeKg, 85 * 8 + 85 * 6);
  });

  it("bleibt ohne bekanntes Koerpergewicht auf der Wiederholungsskala", () => {
    const s = [
      session("k", "2026-09-01T10:00:00Z", [slot("plank", [set(0, 60)])]),
    ];
    const h = exerciseHistory(s, "plank");
    assert.equal(h[0]!.isRepsOnly, true);
    assert.equal(h[0]!.score, 60);
  });
});

describe("comparableExercisePoints", () => {
  it("mischt Kilogramm und Wiederholungen nicht in einer Linie", () => {
    // Athlet meldet ab September sein Gewicht: davor Wiederholungen,
    // danach Kilogramm. Beides in einer Kurve waere ein Fantasiesprung.
    const s = [
      session("a", "2026-07-01T10:00:00Z", [slot("klimmzug", [set(0, 6)])]),
      session("b", "2026-08-01T10:00:00Z", [slot("klimmzug", [set(0, 7)])]),
      session("c", "2026-09-01T10:00:00Z", [slot("klimmzug", [set(0, 8, 85)])]),
    ];
    const alle = exerciseHistory(s, "klimmzug");
    assert.equal(alle.length, 3);
    const rein = comparableExercisePoints(alle);
    assert.equal(rein.length, 1, "nur die Punkte der aktuellen Skala");
    assert.equal(rein[0]!.sessionId, "c");
  });

  it("laesst alles stehen, solange die Skala gleich bleibt", () => {
    const s = [
      session("a", "2026-07-01T10:00:00Z", [slot("bank", [set(90, 8)])]),
      session("b", "2026-08-01T10:00:00Z", [slot("bank", [set(100, 8)])]),
    ];
    assert.equal(comparableExercisePoints(exerciseHistory(s, "bank")).length, 2);
  });

  it("kommt mit einer leeren Liste zurecht", () => {
    assert.deepEqual(comparableExercisePoints([]), []);
  });
});

describe("Voreinstellung und Trend", () => {
  const sessions = [
    session("a", "2026-08-01T10:00:00Z", [
      slot("bank", [set(100, 8), set(100, 8), set(100, 8)]),
      slot("kniebeuge", [set(120, 5), set(120, 5)]),
      slot("curl", [set(20, 12)]),
      slot("wade", [set(60, 15)]),
      slot("seitheben", [set(10, 15)]),
    ]),
  ];

  it("schlaegt die haeufigsten Uebungen vor", () => {
    assert.deepEqual(defaultExerciseSelection(sessions, 3), [
      "bank",
      "kniebeuge",
      "curl",
    ]);
  });

  it("liefert nie mehr als gewuenscht", () => {
    assert.equal(defaultExerciseSelection(sessions, 2).length, 2);
  });

  it("kommt ohne Einheiten mit einer leeren Liste zurueck", () => {
    assert.deepEqual(defaultExerciseSelection([], 4), []);
  });

  it("rechnet den Trend ueber den vergleichbaren Teil", () => {
    const s = [
      session("a", "2026-07-01T10:00:00Z", [slot("bank", [set(100, 5)])]),
      session("b", "2026-09-01T10:00:00Z", [slot("bank", [set(120, 5)])]),
    ];
    assert.equal(exerciseTrend(exerciseHistory(s, "bank")), 20);
  });

  it("nennt keinen Trend bei einem einzigen Punkt", () => {
    const s = [session("a", "2026-07-01T10:00:00Z", [slot("bank", [set(100, 5)])])];
    assert.equal(exerciseTrend(exerciseHistory(s, "bank")), null);
  });
});

describe("Volumen einer einzelnen Uebung", () => {
  it("zaehlt Wiederholungen je Einheit mit", () => {
    const s = [
      session("a", "2026-08-01T10:00:00Z", [
        slot("bank", [set(100, 8), set(100, 6), set(90, 10)]),
      ]),
    ];
    const punkt = exerciseHistory(s, "bank")[0]!;
    assert.equal(punkt.reps, 24);
    assert.equal(punkt.volumeKg, 100 * 8 + 100 * 6 + 90 * 10);
  });

  it("Koerpergewicht zaehlt ins Volumen", () => {
    // Klimmzug, 85 kg bewegter Koerperanteil, 3 x 8.
    const s = [
      session("a", "2026-08-01T10:00:00Z", [
        slot("klimmzug", [set(0, 8, 85), set(0, 8, 85), set(0, 8, 85)]),
      ]),
    ];
    const punkt = exerciseHistory(s, "klimmzug")[0]!;
    assert.equal(punkt.volumeKg, 2040);
    assert.equal(punkt.isRepsOnly, false);
  });

  it("ohne bezifferbare Last sind die Wiederholungen das Volumen", () => {
    // Liegestuetze ohne gemeldetes Koerpergewicht: volumeKg ist null.
    // Eine Kurve auf der Nulllinie wuerde behaupten, es sei nichts
    // passiert — deshalb greift exerciseValue dort auf reps zurueck.
    const s = [
      session("a", "2026-08-01T10:00:00Z", [
        slot("liegestuetz", [set(0, 20), set(0, 20), set(0, 20)]),
      ]),
    ];
    const punkt = exerciseHistory(s, "liegestuetz")[0]!;
    assert.equal(punkt.isRepsOnly, true);
    assert.equal(punkt.volumeKg, 0);
    assert.equal(exerciseValue(punkt, "volume"), 60);
  });
});

describe("exerciseChange", () => {
  const verlauf = [
    session("a", "2026-07-01T10:00:00Z", [
      slot("bank", [set(100, 8), set(100, 8)]),
    ]),
    session("b", "2026-08-01T10:00:00Z", [
      slot("bank", [set(110, 8), set(110, 8), set(110, 8)]),
    ]),
  ];

  it("Bestleistung: absolute Veraenderung und Prozent", () => {
    const c = exerciseChange(exerciseHistory(verlauf, "bank"), "best")!;
    // Epley ist last x (1 + Wdh./30):
    //   100 x 8 -> 126,67   110 x 8 -> 139,33
    // Die Last steigt um 10 %, das geschaetzte Maximum also auch — der
    // Faktor kuerzt sich heraus.
    assert.equal(Math.round(c.latest * 100) / 100, 139.33);
    assert.equal(Math.round(c.delta * 100) / 100, 12.67);
    assert.equal(c.percent, 10);
    assert.equal(c.unit, "kg");
  });

  it("Volumen: 1600 kg auf 2640 kg", () => {
    const c = exerciseChange(exerciseHistory(verlauf, "bank"), "volume")!;
    assert.equal(c.latest, 2640);
    assert.equal(c.delta, 1040);
    assert.equal(c.percent, 65);
  });

  it("ein einziger Punkt: kein Vergleich, aber ein aktueller Wert", () => {
    const s = [
      session("a", "2026-07-01T10:00:00Z", [slot("bank", [set(100, 5)])]),
    ];
    const c = exerciseChange(exerciseHistory(s, "bank"), "volume")!;
    assert.equal(c.percent, null);
    assert.equal(c.delta, 0);
    assert.equal(c.latest, 500);
  });

  it("ohne Punkte gar nichts", () => {
    assert.equal(exerciseChange([], "best"), null);
  });

  it("Punkte auf alter Skala fallen aus der Differenz", () => {
    // Erst ohne Koerpergewicht geloggt, dann mit. Die alten Punkte sind
    // Wiederholungen — sie duerfen nicht gegen Kilogramm gerechnet
    // werden, sonst stuende dort eine Steigerung um das Zehnfache.
    const s = [
      session("a", "2026-06-01T10:00:00Z", [
        slot("klimmzug", [set(0, 10)]),
      ]),
      session("b", "2026-07-01T10:00:00Z", [
        slot("klimmzug", [set(0, 8, 85)]),
      ]),
      session("c", "2026-08-01T10:00:00Z", [
        slot("klimmzug", [set(0, 10, 85)]),
      ]),
    ];
    const c = exerciseChange(exerciseHistory(s, "klimmzug"), "volume")!;
    assert.equal(c.latest, 850);
    assert.equal(c.delta, 850 - 680);
    assert.equal(c.unit, "kg");
  });

  it("von null auf irgendwas ist keine Prozentzahl", () => {
    const s = [
      session("a", "2026-06-01T10:00:00Z", [
        slot("plank", [set(0, 60)]),
      ]),
      session("b", "2026-07-01T10:00:00Z", [
        slot("plank", [set(0, 90)]),
      ]),
    ];
    // Plank ohne Last: volumeKg ist bei beiden null, aber reps traegt.
    const c = exerciseChange(exerciseHistory(s, "plank"), "volume")!;
    assert.equal(c.unit, "Wdh.");
    assert.equal(c.latest, 90);
    assert.equal(c.delta, 30);
    assert.equal(c.percent, 50);
  });
});
