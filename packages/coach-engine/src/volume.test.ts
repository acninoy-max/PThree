import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { LoggedSet, Session } from "@ptfive/types";
import {
  compareToPrevious,
  dayVolumeHistory,
  deltaLabel,
  sessionVolume,
  volumeByDay,
  volumeChangeLabel,
  volumeLabel,
} from "./volume";
import {
  beatsBest,
  bestLabel,
  effectiveLoad,
  estimateOneRepMax,
  hasLoad,
} from "./metrics";

let n = 0;

function set(
  weightKg: number,
  reps: number,
  bodyweight = false,
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
    isBodyweight: bodyweight,
    rir: null,
  };
}

function session(
  id: string,
  performedAt: string,
  planDayId: string | null,
  sets: LoggedSet[],
): Session {
  return {
    id,
    clientId: "c",
    coachId: "co",
    planId: planDayId ? "p" : null,
    planDayId,
    title: "Einheit",
    performedAt,
    isSelfDirected: false,
    // null = der Athlet selbst hat eingetragen.
    recordedBy: null,
    durationSeconds: null,
    isComplete: true,
    notes: null,
    slots: [
      {
        id: `${id}-slot`,
        sessionId: id,
        planSlotId: null,
        pattern: "push",
        muscleGroup: "chest",
        block: "compound",
        exerciseId: "e",
        position: 1,
        sets,
      },
    ],
  };
}

describe("sessionVolume", () => {
  it("rechnet Last mal Wiederholungen", () => {
    const s = session("s1", "2026-09-01T10:00:00Z", "d1", [
      set(100, 5),
      set(90, 8),
    ]);
    const v = sessionVolume(s);
    assert.equal(v.volumeKg, 100 * 5 + 90 * 8);
    assert.equal(v.workingSets, 2);
  });

  it("zaehlt Koerpergewichtssaetze getrennt, nicht als null Kilo", () => {
    const s = session("s2", "2026-09-01T10:00:00Z", "d1", [
      set(100, 5),
      set(0, 12, true),
      set(0, 10, true),
    ]);
    const v = sessionVolume(s);
    assert.equal(v.volumeKg, 500, "Klimmzuege verwaessern das Volumen nicht");
    assert.equal(v.workingSets, 1);
    assert.equal(v.bodyweightSets, 2);
    assert.equal(v.bodyweightReps, 22);
  });

  it("ignoriert Saetze ohne Wiederholungen", () => {
    const s = session("s3", "2026-09-01T10:00:00Z", "d1", [
      set(100, 5),
      set(100, 0),
    ]);
    assert.equal(sessionVolume(s).workingSets, 1);
  });

  it("behandelt Gewicht 0 ohne bekannten Koerperanteil als lastlos", () => {
    const s = session("s4", "2026-09-01T10:00:00Z", "d1", [set(0, 15)]);
    const v = sessionVolume(s);
    assert.equal(v.volumeKg, 0);
    assert.equal(v.bodyweightSets, 1);
  });

  it("zaehlt Klimmzuege mit bekanntem Koerpergewicht voll mit", () => {
    // 85 kg Athlet, Faktor 1,0 -> body_load_kg = 85
    const s = session("s5", "2026-09-01T10:00:00Z", "d1", [
      set(0, 8, true, 85),
      set(0, 8, true, 85),
      set(0, 8, true, 85),
    ]);
    const v = sessionVolume(s);
    assert.equal(v.volumeKg, 85 * 8 * 3, "3 x 8 Klimmzuege sind 2040 kg");
    assert.equal(v.workingSets, 3);
    assert.equal(v.bodyweightSets, 0, "nicht mehr die Sonderkategorie");
  });

  it("addiert Zusatzgewicht zum Koerperanteil", () => {
    const s = session("s6", "2026-09-01T10:00:00Z", "d1", [set(20, 8, false, 85)]);
    assert.equal(sessionVolume(s).volumeKg, 105 * 8);
  });

  it("laesst Liegestuetze mit Faktor kleiner eins entsprechend weniger zaehlen", () => {
    // 85 kg, Faktor 0,64 -> 54,4
    const s = session("s7", "2026-09-01T10:00:00Z", "d1", [set(0, 20, true, 54.4)]);
    assert.equal(Math.round(sessionVolume(s).volumeKg), 1088);
  });
});

describe("Uebergang Koerpergewicht -> Zusatzgewicht", () => {
  it("bricht das Volumen nicht, wenn der Guertel dazukommt", () => {
    // Genau der Fall, der vorher die Kurve zerrissen hat.
    const ohne = session("o", "2026-09-01T10:00:00Z", "d1", [
      set(0, 8, true, 85),
      set(0, 8, true, 85),
      set(0, 8, true, 85),
    ]);
    const mit = session("m", "2026-09-08T10:00:00Z", "d1", [
      set(5, 8, false, 85),
      set(5, 8, false, 85),
      set(5, 8, false, 85),
    ]);
    const c = compareToPrevious([ohne, mit], "m")!;
    assert.equal(c.previous!.sessionId, "o");
    assert.equal(c.previous!.volumeKg, 2040);
    assert.equal(c.current.volumeKg, 2160);
    assert.equal(c.percent, 6, "kleine Steigerung, kein Sprung von null");
  });

  it("haette vor der Umstellung einen Sprung aus dem Nichts ergeben", () => {
    // Gegenprobe ohne bekannten Koerperanteil: genau das alte Verhalten.
    const ohne = session("o", "2026-09-01T10:00:00Z", "d1", [set(0, 8, true)]);
    const mit = session("m", "2026-09-08T10:00:00Z", "d1", [set(5, 8, false)]);
    const c = compareToPrevious([ohne, mit], "m")!;
    assert.equal(c.previous!.volumeKg, 0);
    assert.equal(c.percent, null, "von 0 auf 40 kg ist keine Prozentzahl");
  });
});

describe("dayVolumeHistory", () => {
  const sessions = [
    session("b", "2026-09-08T10:00:00Z", "d1", [set(100, 10)]), // 1000
    session("a", "2026-09-01T10:00:00Z", "d1", [set(100, 8)]), //   800
    session("c", "2026-09-03T10:00:00Z", "d2", [set(50, 10)]), //  anderer Tag
    session("d", "2026-09-04T10:00:00Z", null, [set(60, 10)]), //  frei
  ];

  it("nimmt nur denselben Trainingstag", () => {
    const h = dayVolumeHistory(sessions, "d1");
    assert.deepEqual(
      h.map((p) => p.sessionId),
      ["a", "b"],
    );
  });

  it("sortiert aelteste zuerst, unabhaengig von der Eingabe", () => {
    const h = dayVolumeHistory(sessions, "d1");
    assert.ok(h[0]!.performedAt < h[1]!.performedAt);
  });

  it("laesst freies Training draussen", () => {
    const alle = volumeByDay(sessions);
    const ids = [...alle.values()].flat().map((p) => p.sessionId);
    assert.ok(!ids.includes("d"), "freies Training hat keinen Plantag");
    assert.deepEqual([...alle.keys()].sort(), ["d1", "d2"]);
  });
});

describe("compareToPrevious", () => {
  const sessions = [
    session("a", "2026-09-01T10:00:00Z", "d1", [set(100, 8)]), // 800
    session("b", "2026-09-08T10:00:00Z", "d1", [set(100, 10)]), // 1000
    session("c", "2026-09-15T10:00:00Z", "d1", [set(90, 8)]), //  720
  ];

  it("vergleicht mit der vorherigen Einheit desselben Tags", () => {
    const c = compareToPrevious(sessions, "b")!;
    assert.equal(c.previous!.sessionId, "a");
    assert.equal(c.deltaKg, 200);
    assert.equal(c.percent, 25);
  });

  it("erkennt einen Rueckgang", () => {
    const c = compareToPrevious(sessions, "c")!;
    assert.equal(c.previous!.sessionId, "b");
    assert.equal(c.deltaKg, -280);
    assert.equal(c.percent, -28);
  });

  it("hat beim ersten Mal nichts zu vergleichen", () => {
    const c = compareToPrevious(sessions, "a")!;
    assert.equal(c.previous, null);
    assert.equal(c.percent, null);
  });

  it("nennt keine Prozent, wenn vorher kein Gewicht bewegt wurde", () => {
    const s = [
      session("x", "2026-09-01T10:00:00Z", "d9", [set(0, 12, true)]),
      session("y", "2026-09-08T10:00:00Z", "d9", [set(50, 10)]),
    ];
    const c = compareToPrevious(s, "y")!;
    assert.equal(c.previous!.volumeKg, 0);
    assert.equal(c.percent, null, "von 0 auf irgendwas ist keine Prozentzahl");
  });

  it("vergleicht freies Training mit nichts", () => {
    const s = [session("f", "2026-09-01T10:00:00Z", null, [set(50, 10)])];
    const c = compareToPrevious(s, "f")!;
    assert.equal(c.previous, null);
  });

  it("gibt null zurueck, wenn es die Einheit nicht gibt", () => {
    assert.equal(compareToPrevious(sessions, "gibtsnicht"), null);
  });
});

describe("Beschriftung", () => {
  const sessions = [
    session("a", "2026-09-01T10:00:00Z", "d1", [set(100, 8)]),
    session("b", "2026-09-08T10:00:00Z", "d1", [set(100, 10)]),
  ];

  it("benennt die Steigerung nuechtern, ohne Lob", () => {
    const t = volumeChangeLabel(compareToPrevious(sessions, "b")!);
    assert.equal(t, "25 % mehr als letztes Mal (+200 kg)");
  });

  it("benennt den Rueckgang genauso nuechtern", () => {
    const s = [
      ...sessions,
      session("c", "2026-09-15T10:00:00Z", "d1", [set(50, 10)]),
    ];
    const t = volumeChangeLabel(compareToPrevious(s, "c")!);
    assert.ok(t.startsWith("50 % weniger"), t);
    assert.ok(!/schlecht|schwach|leider/i.test(t), "keine Bewertung");
  });

  it("sagt beim ersten Mal, dass es das erste Mal ist", () => {
    const t = volumeChangeLabel(compareToPrevious(sessions, "a")!);
    assert.ok(t.includes("Erstes Mal"), t);
  });

  it("erkennt Gleichstand", () => {
    const s = [
      session("p", "2026-09-01T10:00:00Z", "d5", [set(100, 10)]),
      session("q", "2026-09-08T10:00:00Z", "d5", [set(100, 10)]),
    ];
    assert.equal(
      volumeChangeLabel(compareToPrevious(s, "q")!),
      "Genauso viel wie letztes Mal.",
    );
  });

  it("schreibt Zahlen deutsch", () => {
    assert.equal(volumeLabel(12400), "12.400 kg");
    assert.equal(volumeLabel(950.4), "950 kg");
  });
});

describe("wirksame Last", () => {
  it("Klimmzug: Koerpergewicht ist die Last", () => {
    assert.equal(effectiveLoad(set(0, 8, true, 85)), 85);
  });

  it("Klimmzug mit Guertel: Koerper plus Zusatz", () => {
    assert.equal(effectiveLoad(set(20, 8, false, 85)), 105);
  });

  it("Hantel: nur das Gewicht", () => {
    assert.equal(effectiveLoad(set(100, 5)), 100);
  });

  it("Plank ohne Koerperanteil: keine Last", () => {
    assert.equal(effectiveLoad(set(0, 60, true)), 0);
    assert.equal(hasLoad(set(0, 60, true)), false);
  });

  it("1RM waechst stetig ueber den Uebergang hinweg", () => {
    // 85 kg Athlet, 8 Wiederholungen, wachsendes Zusatzgewicht.
    const werte = [0, 5, 10, 20].map((zusatz) =>
      estimateOneRepMax(set(zusatz, 8, zusatz === 0, 85)),
    );
    for (let i = 1; i < werte.length; i += 1) {
      assert.ok(
        werte[i]! > werte[i - 1]!,
        `Wert ${i} (${werte[i]}) muss ueber ${werte[i - 1]} liegen`,
      );
    }
    assert.equal(Math.round(werte[0]!), 108);
    assert.equal(Math.round(werte[3]!), 133);
  });

  it("negatives Zusatzgewicht zieht die Last nicht herunter", () => {
    // Falscheingabe soll nicht zu einer Last unter dem Koerpergewicht fuehren.
    assert.equal(effectiveLoad(set(-10, 8, true, 85)), 85);
  });
});

describe("deltaLabel", () => {
  it("der Fall aus dem Meeting", () => {
    assert.equal(deltaLabel(-15, "kg"), "−15 kg");
  });

  it("Zunahme bekommt ein Plus", () => {
    assert.equal(deltaLabel(2.5, "kg"), "+2,5 kg");
  });

  it("das Minus ist U+2212, nicht der Bindestrich", () => {
    // Der Unterschied ist auf dem Bildschirm klein und in der Zeile
    // gross: Der Bindestrich sitzt zu hoch und liest sich als Trennung.
    assert.equal(deltaLabel(-3, "cm").charCodeAt(0), 0x2212);
    assert.ok(!deltaLabel(-3, "cm").includes("-"));
  });

  it("keine leere Nachkommastelle", () => {
    assert.equal(deltaLabel(2.0, "kg"), "+2 kg");
    assert.equal(deltaLabel(-4.0, "cm"), "−4 cm");
  });

  it("eine Nachkommastelle, wo sie etwas sagt", () => {
    assert.equal(deltaLabel(-1.5, "kg"), "−1,5 kg");
    assert.equal(deltaLabel(0.7, "kg"), "+0,7 kg");
  });

  it("ab 100 ohne Nachkomma, mit Tausenderpunkt", () => {
    assert.equal(deltaLabel(2440.6, "kg"), "+2.441 kg");
    assert.equal(deltaLabel(-1200, "kg"), "−1.200 kg");
  });

  it("Rundung auf null heisst null — kein negatives Nichts", () => {
    // Haette man vor dem Runden geprueft, stuende hier "−0 kg".
    assert.equal(deltaLabel(-0.04, "kg"), "±0 kg");
    assert.equal(deltaLabel(0, "kg"), "±0 kg");
    assert.equal(deltaLabel(0.04, "kg"), "±0 kg");
  });

  it("bewertet nicht", () => {
    // Dieselbe Zahl, zwei Bedeutungen: auf der Waage ein Erfolg, beim
    // Bankdruecken das Gegenteil. Der Text darf das nicht entscheiden.
    const waage = deltaLabel(-15, "kg");
    const bank = deltaLabel(-15, "kg");
    assert.equal(waage, bank);
    for (const wort of ["gut", "besser", "schlechter", "super", "!"]) {
      assert.ok(!waage.includes(wort));
    }
  });

  it("Wiederholungen als Einheit", () => {
    assert.equal(deltaLabel(3, "Wdh."), "+3 Wdh.");
  });
});

describe("beatsBest — der Moment im Training", () => {
  const versuch = (kg: number, reps: number, bodyKg: number | null = null) => ({
    weightKg: kg,
    bodyLoadKg: bodyKg,
    reps,
    isBodyweight: kg === 0 && bodyKg !== null,
  });
  const marke = (score: number, bw = false) => ({
    score,
    weightKg: 100,
    reps: 8,
    isBodyweight: bw,
  });

  it("deutlich mehr Gewicht ist eine Bestleistung", () => {
    // 100 x 8 = 126,67 ; 110 x 8 = 139,33 -> +10 %
    const b = beatsBest(versuch(110, 8), marke(126.67))!;
    assert.equal(b.percent, 10);
    assert.equal(b.isFirst, false);
  });

  it("eine Wiederholung mehr zaehlt auch", () => {
    // 100 x 9 = 130 gegen 126,67 -> +2,6 %
    const b = beatsBest(versuch(100, 9), marke(126.67))!;
    assert.equal(b.percent, 3);
  });

  it("KEIN Jubel bei Messrauschen", () => {
    // Das ist die wichtigste Zeile. Epley reagiert auf jedes Gramm:
    // 100,1 x 8 liegt 0,08 % ueber 100 x 8. Ohne Schwelle waere jeder
    // zweite Satz eine "neue Bestleistung" — und nach dem dritten Mal
    // glaubt es niemand mehr.
    assert.equal(beatsBest(versuch(100.1, 8), marke(126.67)), null);
  });

  it("die Schwelle liegt bei einem Prozent", () => {
    assert.equal(beatsBest(versuch(101, 8), marke(126.67)), null); // +0,9 %
    assert.ok(beatsBest(versuch(101.5, 8), marke(126.67))); // +1,1 %
  });

  it("schlechter ist keine Bestleistung", () => {
    assert.equal(beatsBest(versuch(90, 8), marke(126.67)), null);
    assert.equal(beatsBest(versuch(100, 8), marke(126.67)), null);
  });

  it("ohne bisherige Marke: erste Leistung, kein Prozent", () => {
    const b = beatsBest(versuch(80, 5), null)!;
    assert.equal(b.isFirst, true);
    assert.equal(b.percent, null);
    assert.equal(bestLabel(b), "Erste Leistung in dieser Übung");
  });

  it("leerer Satz sagt nichts", () => {
    assert.equal(beatsBest(versuch(100, 0), marke(126.67)), null);
  });

  it("Skalen werden nicht vermischt", () => {
    // Frueher Klimmzuege ohne gemeldetes Gewicht (10 Wiederholungen),
    // jetzt mit Koerperanteil (85 kg). Gegeneinander gerechnet waere
    // der Umstieg selbst eine gewaltige "Bestleistung" — und zwar an
    // dem Tag, an dem der Athlet sein Gewicht eingetragen hat, nicht
    // an dem, an dem er staerker wurde.
    assert.equal(beatsBest(versuch(0, 8, 85), marke(10, true)), null);
    assert.equal(beatsBest(versuch(0, 12), marke(120, false)), null);
  });

  it("Koerpergewicht gegen Koerpergewicht geht", () => {
    const b = beatsBest(versuch(0, 12), marke(10, true))!;
    assert.equal(b.percent, 20);
  });

  it("der Text bewertet nicht", () => {
    const b = beatsBest(versuch(110, 8), marke(126.67))!;
    const text = bestLabel(b);
    assert.ok(!text.includes("!"));
    for (const wort of ["super", "stark", "geil", "Wahnsinn"]) {
      assert.ok(!text.toLowerCase().includes(wort.toLowerCase()));
    }
  });
});
